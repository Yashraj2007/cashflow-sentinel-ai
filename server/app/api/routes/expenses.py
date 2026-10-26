# ============================================================
# Expenses Routes
# ============================================================

from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List
from app.core.database import db
import uuid

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("/{biz_id}")
async def list_expenses(biz_id: str):
    data = db.get_dataset(biz_id)
    return data.get("expenses", [])


@router.post("/{biz_id}")
async def create_expense(biz_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    if "id" not in payload or not payload["id"]:
        payload["id"] = f"exp_{uuid.uuid4().hex[:6]}"
    data.setdefault("expenses", []).append(payload)
    return payload


@router.patch("/{biz_id}/{exp_id}")
async def update_expense(biz_id: str, exp_id: str, patch: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    expenses = data.setdefault("expenses", [])
    for e in expenses:
        if e.get("id") == exp_id:
            e.update(patch)
            return e
    raise HTTPException(status_code=404, detail="Expense not found")


@router.delete("/{biz_id}/{exp_id}")
async def delete_expense(biz_id: str, exp_id: str):
    data = db.get_dataset(biz_id)
    expenses = data.setdefault("expenses", [])
    data["expenses"] = [e for e in expenses if e.get("id") != exp_id]
    return {"status": "deleted", "id": exp_id}
