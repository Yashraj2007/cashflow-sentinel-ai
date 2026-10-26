# ============================================================
# Customer Routes
# ============================================================

from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List
from app.core.database import db
import uuid

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("/{biz_id}")
async def list_customers(biz_id: str):
    data = db.get_dataset(biz_id)
    return data.get("customers", [])


@router.get("/{biz_id}/{cust_id}")
async def get_customer(biz_id: str, cust_id: str):
    data = db.get_dataset(biz_id)
    for c in data.get("customers", []):
        if c.get("id") == cust_id:
            return c
    raise HTTPException(status_code=404, detail="Customer not found")


@router.post("/{biz_id}")
async def create_customer(biz_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    if "id" not in payload or not payload["id"]:
        payload["id"] = f"c_{uuid.uuid4().hex[:6]}"
    if "paymentHistory" not in payload:
        payload["paymentHistory"] = []
    data.setdefault("customers", []).append(payload)
    return payload


@router.patch("/{biz_id}/{cust_id}")
async def update_customer(biz_id: str, cust_id: str, patch: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    customers = data.setdefault("customers", [])
    for c in customers:
        if c.get("id") == cust_id:
            c.update(patch)
            return c
    raise HTTPException(status_code=404, detail="Customer not found")


@router.delete("/{biz_id}/{cust_id}")
async def delete_customer(biz_id: str, cust_id: str):
    data = db.get_dataset(biz_id)
    customers = data.setdefault("customers", [])
    data["customers"] = [c for c in customers if c.get("id") != cust_id]
    return {"status": "deleted", "id": cust_id}


@router.post("/{biz_id}/import/bulk")
async def bulk_import_customers(biz_id: str, items: List[Dict[str, Any]] = Body(...)):
    data = db.get_dataset(biz_id)
    customers = data.setdefault("customers", [])
    for item in items:
        if "id" not in item:
            item["id"] = f"c_{uuid.uuid4().hex[:6]}"
        customers.append(item)
    return {"imported": len(items)}
