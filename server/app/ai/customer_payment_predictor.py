# ============================================================
# CashFlow Sentinel AI — Customer Payment Delay Predictor
# 
# Uses model_bundle.joblib (CashFlow Sentinel LSTM v1.2.0) if available.
# Falls back to a robust heuristic predictor using payment history statistics.
#
# Expected inputs:
#   customer_history: list of past cleared invoices with:
#     Cust_Num, Document_No, Doc_Date, Net_Due_Date, Clearing_date,
#     Days_Overdue_Delay, Amount, Payment_Term, Rank_of_order_by_customer,
#     Payment_Method_description, Region, City, Zipcode
#
#   invoice_details: new invoice dict with:
#     Cust_Num, Document_No, Doc_Date, Net_Due_Date, Amount,
#     Payment_Term, Rank_of_order_by_customer, Payment_Method_description,
#     Region, City, Zipcode
# ============================================================

from pathlib import Path
import subprocess
import sys
import json
import warnings
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

# Path to models directory
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_BUNDLE = MODELS_DIR / "model_bundle.joblib"

# Python 3.13 executable (has compatible sklearn 1.6.0)
_PY313 = r"C:\Users\Anuja\AppData\Local\Programs\Python\Python313\python.exe"

# Script for subprocess-based prediction using model_bundle.joblib
_BUNDLE_PREDICT_SCRIPT = r"""
import sys, json, warnings
warnings.filterwarnings("ignore")
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone

MODELS_DIR = Path(sys.argv[1])
customer_history_json = sys.argv[2]
invoice_details_json = sys.argv[3]

customer_history = json.loads(customer_history_json)
invoice_details = json.loads(invoice_details_json)

bundle = joblib.load(MODELS_DIR / "model_bundle.joblib")

preprocessor = bundle["preprocessor"]
summary_scaler = bundle["summary_scaler"]
target_scaler = bundle.get("target_scaler")
tabular_models = bundle.get("tabular_models", {})
classification_model = bundle.get("classification_model")
classification_calibrator = bundle.get("classification_calibrator")
threshold = bundle.get("late_payment_risk_threshold", 0.5) or 0.5
selected_model_name = bundle.get("selected_model_name", "GlobalMedian")
fallback_model_name = bundle.get("fallback_model_name", "GlobalMedian")
global_median = float(bundle.get("global_median", 0))
categorical_features = bundle.get("categorical_features", [
    "Payment_Method_description", "Region", "City", "Zipcode"
])
summary_columns = bundle.get("summary_columns", [
    "history_count_log", "history_delay_mean", "history_delay_median",
    "history_delay_std", "history_on_time_rate", "history_last_delay",
    "history_days_since_last_invoice_log"
])
base_feature_columns = bundle.get("base_feature_columns", [])


def make_base_features(frame):
    out = pd.DataFrame(index=frame.index)
    doc = pd.to_datetime(frame.get("Doc_Date", pd.Series(pd.NaT, index=frame.index)), errors="coerce")
    due = pd.to_datetime(frame.get("Net_Due_Date", pd.Series(pd.NaT, index=frame.index)), errors="coerce")
    amount = pd.to_numeric(frame.get("Amount", pd.Series(0.0, index=frame.index)), errors="coerce").fillna(0.0)
    if "Payment_Term" in frame:
        term = pd.to_numeric(frame["Payment_Term"], errors="coerce")
    else:
        term = (due - doc).dt.days.astype(float)
    term = term.where(term.notna(), (due - doc).dt.days.astype(float))
    if "Rank_of_order_by_customer" in frame:
        rank = pd.to_numeric(frame["Rank_of_order_by_customer"], errors="coerce")
    else:
        rank = pd.Series(np.arange(1, len(frame) + 1), index=frame.index, dtype=float)
    dm, um = doc.dt.month.astype(float), due.dt.month.astype(float)
    dw, uw = doc.dt.dayofweek.astype(float), due.dt.dayofweek.astype(float)
    out["amount_signed_log1p"] = np.sign(amount) * np.log1p(np.abs(amount))
    out["payment_term_days"] = term
    out["rank_log1p"] = np.log1p(rank.clip(lower=0))
    out["doc_year"] = doc.dt.year.astype(float)
    out["doc_month_sin"] = np.sin(2 * np.pi * dm / 12)
    out["doc_month_cos"] = np.cos(2 * np.pi * dm / 12)
    out["doc_weekday_sin"] = np.sin(2 * np.pi * dw / 7)
    out["doc_weekday_cos"] = np.cos(2 * np.pi * dw / 7)
    out["due_month_sin"] = np.sin(2 * np.pi * um / 12)
    out["due_month_cos"] = np.cos(2 * np.pi * um / 12)
    out["due_weekday_sin"] = np.sin(2 * np.pi * uw / 7)
    out["due_weekday_cos"] = np.cos(2 * np.pi * uw / 7)
    for col in categorical_features:
        out[col] = frame[col].astype("string").fillna("Unknown").astype(str) if col in frame.columns else "Unknown"
    if base_feature_columns:
        cols_present = [c for c in base_feature_columns if c in out.columns]
        out = out[cols_present]
    return out


def summary_from_history(hist, target_doc_date):
    if hist.empty:
        return np.zeros((1, len(summary_columns)), dtype=np.float32), np.array([])
    delays = pd.to_numeric(hist["Days_Overdue_Delay"], errors="coerce").dropna().to_numpy(dtype=float)
    if not len(delays):
        return np.zeros((1, len(summary_columns)), dtype=np.float32), delays
    ordered = hist.sort_values([c for c in ["Doc_Date", "Rank_of_order_by_customer", "Document_No"] if c in hist.columns], kind="mergesort") if len(hist) else hist
    last = ordered.iloc[-1]
    gap = max(0, int((target_doc_date - pd.to_datetime(last["Doc_Date"])).days))
    s = {
        "history_count_log": np.log1p(len(delays)),
        "history_delay_mean": np.mean(delays),
        "history_delay_median": np.median(delays),
        "history_delay_std": np.std(delays),
        "history_on_time_rate": np.mean(delays <= 0),
        "history_last_delay": float(pd.to_numeric(pd.Series([last["Days_Overdue_Delay"]]), errors="coerce").iloc[0]),
        "history_days_since_last_invoice_log": np.log1p(gap),
    }
    return np.asarray([[s.get(c, 0) for c in summary_columns]], dtype=np.float32), delays


current = dict(invoice_details)
for req in ["Doc_Date", "Net_Due_Date", "Amount"]:
    if req not in current:
        current[req] = datetime.now().date().isoformat() if "Date" in req else 0

current["Doc_Date"] = pd.to_datetime(current["Doc_Date"], errors="coerce")
current["Net_Due_Date"] = pd.to_datetime(current["Net_Due_Date"], errors="coerce")
if pd.isna(current.get("Payment_Term", float("nan"))):
    current["Payment_Term"] = int((current["Net_Due_Date"] - current["Doc_Date"]).days)

for col in categorical_features:
    current.setdefault(col, "Unknown")

hist = pd.DataFrame(customer_history) if customer_history else pd.DataFrame()
if not hist.empty and {"Doc_Date", "Clearing_date", "Days_Overdue_Delay"}.issubset(hist.columns):
    hist["Doc_Date"] = pd.to_datetime(hist["Doc_Date"], errors="coerce")
    hist["Clearing_date"] = pd.to_datetime(hist["Clearing_date"], errors="coerce")
    hist["Days_Overdue_Delay"] = pd.to_numeric(hist["Days_Overdue_Delay"], errors="coerce")
    hist = hist.loc[
        hist["Doc_Date"].notna() & hist["Clearing_date"].notna() & hist["Days_Overdue_Delay"].notna()
        & (hist["Doc_Date"] < current["Doc_Date"]) & (hist["Clearing_date"] <= current["Doc_Date"])
    ].copy()
    if "Cust_Num" in hist.columns and current.get("Cust_Num"):
        hist = hist.loc[hist["Cust_Num"].astype(str) == str(current["Cust_Num"])].copy()
else:
    hist = pd.DataFrame()

if "Net_Due_Date" not in hist: hist["Net_Due_Date"] = hist.get("Doc_Date", pd.Series(dtype="datetime64[ns]"))
if "Amount" not in hist: hist["Amount"] = 0.0
if "Payment_Term" not in hist: hist["Payment_Term"] = 30
if "Rank_of_order_by_customer" not in hist: hist["Rank_of_order_by_customer"] = np.arange(1, len(hist) + 1)
if "Document_No" not in hist: hist["Document_No"] = np.arange(len(hist)).astype(str)
for col in categorical_features:
    if col not in hist: hist[col] = "Unknown"
if len(hist):
    hist = hist.sort_values([c for c in ["Doc_Date", "Rank_of_order_by_customer", "Document_No"] if c in hist.columns], kind="mergesort").reset_index(drop=True)

combined = pd.concat([hist, pd.DataFrame([current])], ignore_index=True, sort=False)
base_feats = make_base_features(combined)
try:
    base = np.asarray(preprocessor.transform(base_feats), dtype=np.float32)
    hist_base, current_base = base[:-1], base[-1:]
    summary_raw, hist_delays = summary_from_history(hist, current["Doc_Date"])
    summary_scaled = summary_scaler.transform(summary_raw).astype(np.float32)
    current_x = np.concatenate([current_base, summary_scaled], axis=1).astype(np.float32)

    def tabular_prediction(name):
        if name == "GlobalMedian": return global_median
        if name == "CustomerHistoryMedian": return float(np.median(hist_delays)) if len(hist_delays) else global_median
        return float(tabular_models[name].predict(current_x)[0])

    if selected_model_name in tabular_models or selected_model_name in ("GlobalMedian", "CustomerHistoryMedian"):
        predicted_raw = tabular_prediction(selected_model_name)
        used_name = selected_model_name
        status = "estimated"
    else:
        predicted_raw = tabular_prediction(fallback_model_name) if fallback_model_name in tabular_models else global_median
        used_name = fallback_model_name
        status = "estimated_fallback"

    classifier = bundle.get("classification_model")
    calibrator = bundle.get("classification_calibrator")
    probability = None
    if calibrator is not None:
        try:
            probability = float(calibrator.predict_proba(current_x)[:, 1][0])
        except Exception:
            try:
                raw_prob = float(np.clip(classifier.predict_proba(current_x)[:, 1][0], 1e-6, 1 - 1e-6))
                logit = np.log(raw_prob / (1.0 - raw_prob)).reshape(1, 1)
                probability = float(calibrator.predict_proba(logit)[:, 1][0])
            except Exception:
                probability = None
    elif classifier is not None:
        probability = float(np.clip(classifier.predict_proba(current_x)[:, 1][0], 1e-6, 1 - 1e-6))

    rounded = int(np.rint(predicted_raw))
    due = pd.Timestamp(current["Net_Due_Date"]).normalize()
    invoice_date = pd.Timestamp(current["Doc_Date"]).normalize()
    raw_payment_date = due + pd.to_timedelta(rounded, unit="D")
    if raw_payment_date < invoice_date:
        payment_date_ts = invoice_date
        rule = "clamped_to_invoice_date"
    else:
        payment_date_ts = raw_payment_date
        rule = "due_date_plus_rounded_predicted_delay"

    risk = "high" if (probability or 0) >= 0.6 else ("medium" if (probability or 0) >= 0.3 else "low")

    result = {
        "source": "model_bundle_ml",
        "customer_id": str(current.get("Cust_Num", "UNKNOWN")),
        "invoice_id": str(current.get("Document_No", "UNKNOWN")),
        "doc_date": invoice_date.date().isoformat(),
        "due_date": due.date().isoformat(),
        "predicted_delay_days": round(float(predicted_raw), 4),
        "predicted_delay_days_for_calendar": rounded,
        "predicted_payment_date": payment_date_ts.date().isoformat(),
        "payment_date_rule": rule,
        "model_name": used_name,
        "prediction_status": status,
        "history_invoices_used": int(len(hist_delays)),
        "probability_delay_gt_zero": probability,
        "probability_score_calibrated": bool(calibrator is not None and probability is not None),
        "late_payment_risk_threshold": float(threshold),
        "predicted_late_payment": bool(probability >= threshold) if probability is not None else None,
        "risk_category": risk,
        "date_is_estimate_not_guarantee": True,
    }
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e), "source": "model_bundle_ml"}))
"""


def _heuristic_prediction(
    customer_history: List[Dict[str, Any]],
    invoice_details: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Robust heuristic prediction from payment history statistics.
    Used when model_bundle.joblib is unavailable.
    """
    delays = []
    amounts = []
    payment_terms = []

    for h in customer_history:
        d = h.get("Days_Overdue_Delay")
        if d is not None:
            try:
                delays.append(float(d))
            except (ValueError, TypeError):
                pass
        a = h.get("Amount")
        if a is not None:
            try:
                amounts.append(float(a))
            except (ValueError, TypeError):
                pass
        pt = h.get("Payment_Term")
        if pt is not None:
            try:
                payment_terms.append(float(pt))
            except (ValueError, TypeError):
                pass

    inv_amount = float(invoice_details.get("Amount") or 0)
    payment_term = float(invoice_details.get("Payment_Term") or 30)
    doc_date_str = invoice_details.get("Doc_Date") or date.today().isoformat()
    due_date_str = invoice_details.get("Net_Due_Date")

    try:
        doc_date = datetime.strptime(doc_date_str[:10], "%Y-%m-%d").date()
    except Exception:
        doc_date = date.today()

    if due_date_str:
        try:
            due_date = datetime.strptime(due_date_str[:10], "%Y-%m-%d").date()
        except Exception:
            due_date = doc_date + timedelta(days=int(payment_term))
    else:
        due_date = doc_date + timedelta(days=int(payment_term))

    if not delays:
        return {
            "source": "heuristic_no_history",
            "customer_id": str(invoice_details.get("Cust_Num", "UNKNOWN")),
            "invoice_id": str(invoice_details.get("Document_No", "UNKNOWN")),
            "doc_date": doc_date.isoformat(),
            "due_date": due_date.isoformat(),
            "predicted_delay_days": 0.0,
            "predicted_payment_date": due_date.isoformat(),
            "risk_category": "unknown",
            "history_invoices_used": 0,
            "warning": "No payment history available. Prediction is 0 delay (neutral).",
        }

    import statistics
    mean_delay = statistics.mean(delays)
    median_delay = statistics.median(delays)
    late_rate = sum(1 for d in delays if d > 0) / len(delays)
    stdev = statistics.stdev(delays) if len(delays) > 1 else 0

    # Amount-weighted adjustment: larger invoices tend to have slightly longer delays
    if amounts and inv_amount > 0:
        avg_amount = statistics.mean(amounts)
        size_factor = min(max(inv_amount / avg_amount, 0.5), 2.0)
        adjusted_delay = median_delay * (1 + 0.1 * (size_factor - 1))
    else:
        adjusted_delay = median_delay

    rounded = int(round(adjusted_delay))
    raw_payment = due_date + timedelta(days=rounded)
    if raw_payment < doc_date:
        payment_date = doc_date
        rule = "clamped_to_invoice_date"
    else:
        payment_date = raw_payment
        rule = "due_date_plus_rounded_predicted_delay"

    risk = "high" if late_rate >= 0.6 else ("medium" if late_rate >= 0.3 else "low")
    probability = late_rate  # Simple proxy for probability

    return {
        "source": "heuristic_history_stats",
        "customer_id": str(invoice_details.get("Cust_Num", "UNKNOWN")),
        "invoice_id": str(invoice_details.get("Document_No", "UNKNOWN")),
        "doc_date": doc_date.isoformat(),
        "due_date": due_date.isoformat(),
        "predicted_delay_days": round(adjusted_delay, 4),
        "predicted_delay_days_for_calendar": rounded,
        "predicted_payment_date": payment_date.isoformat(),
        "payment_date_rule": rule,
        "history_delay_mean": round(mean_delay, 2),
        "history_delay_median": round(median_delay, 2),
        "history_delay_std": round(stdev, 2),
        "history_late_payment_rate": round(late_rate, 4),
        "probability_delay_gt_zero": round(probability, 4),
        "predicted_late_payment": bool(late_rate >= 0.5),
        "risk_category": risk,
        "history_invoices_used": len(delays),
        "warning": "Heuristic estimate from payment history statistics. Generate model_bundle.joblib from the training notebook for ML-based prediction.",
    }


def predict_customer_payment_delay(
    customer_history: List[Dict[str, Any]],
    invoice_details: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Predict customer payment delay for a new invoice.

    If model_bundle.joblib exists, uses the trained CashFlow Sentinel ML model
    (via Python 3.13 subprocess). Otherwise uses heuristic history statistics.

    Args:
        customer_history: List of past cleared invoice records
        invoice_details: New invoice details dict

    Returns:
        Prediction dict with delay_days, payment_date, risk_category, etc.
    """
    # Try ML model first if bundle exists
    if MODEL_BUNDLE.exists():
        import tempfile, os
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
            f.write(_BUNDLE_PREDICT_SCRIPT)
            script_path = f.name
        try:
            result = subprocess.run(
                [
                    _PY313,
                    script_path,
                    str(MODELS_DIR),
                    json.dumps(customer_history, default=str),
                    json.dumps(invoice_details, default=str),
                ],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0 and result.stdout.strip():
                prediction = json.loads(result.stdout.strip())
                if "error" not in prediction:
                    return prediction
        except Exception:
            pass
        finally:
            try:
                os.unlink(script_path)
            except Exception:
                pass

    # Fall back to heuristic
    return _heuristic_prediction(customer_history, invoice_details)
