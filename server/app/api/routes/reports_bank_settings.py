# ============================================================
# Reports, Bank & Settings Routes
# ============================================================

from fastapi import APIRouter, Body, Query
from typing import Dict, Any, Optional, List
from app.core.database import db

# ── Reports ─────────────────────────────────────────────────
reports_router = APIRouter(prefix="/api/reports", tags=["reports"])

@reports_router.get("/{biz_id}")
async def get_report(biz_id: str, type: Optional[str] = Query("cash-flow")):
    data = db.get_dataset(biz_id)
    return {
        "reportType": type,
        "businessId": biz_id,
        "currentCashPaise": data.get("currentCashPaise", 0),
        "totalReceivablesPaise": sum(i.get("amountPaise", 0) - i.get("paidPaise", 0) for i in data.get("salesInvoices", [])),
        "totalPayablesPaise": sum(i.get("amountPaise", 0) - i.get("paidPaise", 0) for i in data.get("purchaseInvoices", [])),
    }


# ── Bank ────────────────────────────────────────────────────
bank_router = APIRouter(prefix="/api/bank", tags=["bank"])

@bank_router.post("/{biz_id}/import")
async def import_bank_statement(biz_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    txns = payload.get("transactions", [])
    data.setdefault("transactions", []).extend(txns)
    if "closingBalancePaise" in payload:
        data["currentCashPaise"] = payload["closingBalancePaise"]
    return {"status": "imported", "transactionsImported": len(txns)}


# ── Settings ────────────────────────────────────────────────
settings_router = APIRouter(prefix="/api/settings", tags=["settings"])

@settings_router.get("/{biz_id}")
async def get_settings(biz_id: str):
    data = db.get_dataset(biz_id)
    biz = data.get("business", {})
    return biz.get("settings", {})

@settings_router.patch("/{biz_id}")
async def patch_settings(biz_id: str, patch: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    biz = data.setdefault("business", {})
    st = biz.setdefault("settings", {})
    st.update(patch)
    return st
