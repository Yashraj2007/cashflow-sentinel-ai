# ============================================================
# Transactions Routes
# ============================================================

from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List
from app.core.database import db
import uuid

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("/{biz_id}")
async def list_transactions(biz_id: str):
    data = db.get_dataset(biz_id)
    return data.get("transactions", [])


@router.post("/{biz_id}")
async def create_transaction(biz_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    if "id" not in payload or not payload["id"]:
        payload["id"] = f"tx_{uuid.uuid4().hex[:6]}"
    data.setdefault("transactions", []).append(payload)
    if payload.get("direction") == "in":
        data["currentCashPaise"] = data.get("currentCashPaise", 0) + payload.get("amountPaise", 0)
    elif payload.get("direction") == "out":
        data["currentCashPaise"] = max(0, data.get("currentCashPaise", 0) - payload.get("amountPaise", 0))
    return payload


@router.delete("/{biz_id}/{txn_id}")
async def delete_transaction(biz_id: str, txn_id: str):
    data = db.get_dataset(biz_id)
    txns = data.setdefault("transactions", [])
    data["transactions"] = [t for t in txns if t.get("id") != txn_id]
    return {"status": "deleted", "id": txn_id}


@router.post("/{biz_id}/import/bulk")
async def bulk_import_transactions(biz_id: str, items: List[Dict[str, Any]] = Body(...)):
    data = db.get_dataset(biz_id)
    txns = data.setdefault("transactions", [])
    for item in items:
        if "id" not in item:
            item["id"] = f"tx_{uuid.uuid4().hex[:6]}"
        txns.append(item)
    return {"imported": len(items)}
