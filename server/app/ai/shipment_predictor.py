# ============================================================
# CashFlow Sentinel AI — Shipment Delay Predictor (DataCo Model)
# Uses the trained ExtraTreesRegressor + CalibratedClassifierCV
# from selected_regression_model.joblib and
# selected_late_shipment_classifier.joblib
# ============================================================

from pathlib import Path
import subprocess
import sys
import json
import warnings

# Path to the models directory
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# Python 3.13 executable (which has compatible sklearn 1.6.0)
_PY313 = r"C:\Users\Anuja\AppData\Local\Programs\Python\Python313\python.exe"

# Inline prediction script run in subprocess with Python 3.13
_PREDICT_SCRIPT = r"""
import sys, json, warnings
warnings.filterwarnings("ignore")
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone

MODELS_DIR = Path(sys.argv[1])
payload = json.loads(sys.argv[2])

REGRESSOR = joblib.load(MODELS_DIR / "selected_regression_model.joblib")
CLASSIFIER = joblib.load(MODELS_DIR / "selected_late_shipment_classifier.joblib")

NUMERIC_COLS = [
    "scheduled_shipping_days", "order_amount", "total_quantity", "item_count",
    "mean_item_price", "total_discount", "mean_discount_rate", "distinct_categories",
    "distinct_departments", "order_year", "order_month", "order_weekday", "order_dayofyear",
    "shipmode_history_n", "shipmode_past_late_rate", "shipmode_past_mean_delay",
    "shipmode_past_median_delay", "shipmode_past_gt1_rate", "shipmode_late_rate_30d",
    "shipmode_late_rate_90d", "shipmode_late_rate_180d", "shipmode_mean_delay_90d",
    "shipmode_days_since_last_outcome", "market_history_n", "market_past_late_rate",
    "market_past_mean_delay", "market_past_median_delay", "market_past_gt1_rate",
    "market_late_rate_30d", "market_late_rate_90d", "market_late_rate_180d",
    "market_mean_delay_90d", "market_days_since_last_outcome",
]
CAT_COLS = [
    "transaction_type", "customer_segment", "customer_country", "market",
    "order_country", "order_region", "shipping_mode", "category_name", "department_name",
]
ALL_COLS = NUMERIC_COLS + CAT_COLS

order_date = pd.to_datetime(payload.get("order_date", datetime.now().isoformat()), errors="coerce")
if pd.isna(order_date):
    order_date = pd.Timestamp.now()

row = {
    "scheduled_shipping_days": float(payload.get("scheduled_shipping_days", 4)),
    "order_amount": float(payload.get("order_amount", 0)),
    "total_quantity": float(payload.get("total_quantity", payload.get("qty", 1))),
    "item_count": float(payload.get("item_count", 1)),
    "mean_item_price": float(payload.get("mean_item_price", payload.get("unitCost", payload.get("order_amount", 0)))),
    "total_discount": float(payload.get("total_discount", 0)),
    "mean_discount_rate": float(payload.get("mean_discount_rate", 0)),
    "distinct_categories": float(payload.get("distinct_categories", 1)),
    "distinct_departments": float(payload.get("distinct_departments", 1)),
    "order_year": float(order_date.year),
    "order_month": float(order_date.month),
    "order_weekday": float(order_date.dayofweek),
    "order_dayofyear": float(order_date.dayofyear),
    # History features: use 0 / neutral defaults when no history is supplied
    "shipmode_history_n": float(payload.get("shipmode_history_n", 10)),
    "shipmode_past_late_rate": float(payload.get("shipmode_past_late_rate", 0.5)),
    "shipmode_past_mean_delay": float(payload.get("shipmode_past_mean_delay", 0)),
    "shipmode_past_median_delay": float(payload.get("shipmode_past_median_delay", 0)),
    "shipmode_past_gt1_rate": float(payload.get("shipmode_past_gt1_rate", 0.3)),
    "shipmode_late_rate_30d": float(payload.get("shipmode_late_rate_30d", 0.5)),
    "shipmode_late_rate_90d": float(payload.get("shipmode_late_rate_90d", 0.5)),
    "shipmode_late_rate_180d": float(payload.get("shipmode_late_rate_180d", 0.5)),
    "shipmode_mean_delay_90d": float(payload.get("shipmode_mean_delay_90d", 0)),
    "shipmode_days_since_last_outcome": float(payload.get("shipmode_days_since_last_outcome", 7)),
    "market_history_n": float(payload.get("market_history_n", 10)),
    "market_past_late_rate": float(payload.get("market_past_late_rate", 0.5)),
    "market_past_mean_delay": float(payload.get("market_past_mean_delay", 0)),
    "market_past_median_delay": float(payload.get("market_past_median_delay", 0)),
    "market_past_gt1_rate": float(payload.get("market_past_gt1_rate", 0.3)),
    "market_late_rate_30d": float(payload.get("market_late_rate_30d", 0.5)),
    "market_late_rate_90d": float(payload.get("market_late_rate_90d", 0.5)),
    "market_late_rate_180d": float(payload.get("market_late_rate_180d", 0.5)),
    "market_mean_delay_90d": float(payload.get("market_mean_delay_90d", 0)),
    "market_days_since_last_outcome": float(payload.get("market_days_since_last_outcome", 7)),
    # Categorical
    "transaction_type": str(payload.get("transaction_type", "DEBIT")),
    "customer_segment": str(payload.get("customer_segment", "Consumer")),
    "customer_country": str(payload.get("customer_country", "EE. UU.")),
    "market": str(payload.get("market", "USCA")),
    "order_country": str(payload.get("order_country", "EE. UU.")),
    "order_region": str(payload.get("order_region", "West of USA")),
    "shipping_mode": str(payload.get("shipping_mode", "Second Class")),
    "category_name": str(payload.get("category_name", "Cleats")),
    "department_name": str(payload.get("department_name", "Fan Shop")),
}

df = pd.DataFrame([row], columns=ALL_COLS)

delay_days = float(REGRESSOR.predict(df)[0])
scheduled = row["scheduled_shipping_days"]
actual_duration = max(0, int(round(scheduled + delay_days)))
shipping_date = (order_date + pd.Timedelta(days=actual_duration)).date().isoformat()

proba = CLASSIFIER.predict_proba(df)[0]
classes = list(CLASSIFIER.classes_)
prob_late = float(proba[classes.index(1)]) if 1 in classes else 0.0
threshold = 0.5

if prob_late < 0.25:
    risk = "low"
elif prob_late < 0.60:
    risk = "medium"
else:
    risk = "high"

result = {
    "predicted_delay_days": round(delay_days, 4),
    "predicted_actual_shipping_duration_days": actual_duration,
    "estimated_shipping_date": shipping_date,
    "late_shipment_probability": round(prob_late, 6),
    "predicted_late_shipment": bool(prob_late >= threshold),
    "risk_category": risk,
    "late_shipment_decision_threshold": threshold,
    "model": "ExtraTreesRegressor + CalibratedClassifierCV (DataCo shipment proxy)",
    "prediction_timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "warning": "DataCo shipment-timing proxy model; not supplier-specific."
}

print(json.dumps(result))
"""


def predict_shipment_delay(payload: dict) -> dict:
    """
    Run shipment delay prediction using the saved ExtraTrees + CalibratedClassifier models.
    Runs inference in a Python 3.13 subprocess because the models require sklearn 1.6.x.

    Args:
        payload: dict with order details. Required: order_amount.
                 Optional: scheduled_shipping_days, shipping_mode, market, etc.

    Returns:
        dict with predicted_delay_days, risk_category, late_shipment_probability, etc.
    """
    import tempfile, os

    # Write the script to a temp file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(_PREDICT_SCRIPT)
        script_path = f.name

    try:
        result = subprocess.run(
            [_PY313, script_path, str(MODELS_DIR), json.dumps(payload)],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Model subprocess failed: {result.stderr[-500:]}")
        return json.loads(result.stdout.strip())
    finally:
        try:
            os.unlink(script_path)
        except Exception:
            pass
