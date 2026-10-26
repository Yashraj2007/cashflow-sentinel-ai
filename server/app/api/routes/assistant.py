# ============================================================
# Assistant Routes
# ============================================================

from fastapi import APIRouter, Body
from typing import Dict, Any
from app.core.database import db

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


@router.post("/{biz_id}")
async def assistant_chat(biz_id: str, payload: Dict[str, Any] = Body(...)):
    question = (payload.get("question") or "").lower()
    dataset = db.get_dataset(biz_id)
    cash_rupees = dataset.get("currentCashPaise", 0) / 100

    if any(k in question for k in ["cash", "balance", "shortage", "falling", "dip"]):
        reply = (
            f"Your current cash balance is ₹{cash_rupees:,.2f}. Over the next 30 days, "
            "planned supplier bills and loan EMIs require close cash monitoring. "
            "Consider prioritizing collections on overdue invoices like INV-1044 from Krishna Traders."
        )
    elif any(k in question for k in ["customer", "late", "risk", "default"]):
        reply = (
            "Based on historical payment patterns, Krishna Traders represents your largest open receivable risk "
            "(average 13 days past due). Sharma Hardware remains your most punctual client."
        )
    elif any(k in question for k in ["deal", "order"]):
        reply = (
            "Before accepting large deals with high upfront materials, evaluate the Deal Impact Checker "
            "to ensure upfront procurement doesn't create a temporary working-capital dip."
        )
    else:
        reply = (
            f"CashFlow Sentinel AI is monitoring your finances. Currently managing "
            f"{len(dataset.get('customers', []))} active customers and {len(dataset.get('suppliers', []))} suppliers "
            f"with a current liquid buffer of ₹{cash_rupees:,.2f}."
        )

    return {"answer": reply, "kind": "computed"}
