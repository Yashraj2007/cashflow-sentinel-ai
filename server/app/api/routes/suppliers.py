# ============================================================
# Supplier Routes
# ============================================================

from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List
from app.core.database import db
import uuid

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.get("/{biz_id}")
async def list_suppliers(biz_id: str):
    data = db.get_dataset(biz_id)
    return data.get("suppliers", [])


@router.get("/{biz_id}/{sup_id}")
async def get_supplier(biz_id: str, sup_id: str):
    data = db.get_dataset(biz_id)
    for s in data.get("suppliers", []):
        if s.get("id") == sup_id:
            return s
    raise HTTPException(status_code=404, detail="Supplier not found")


@router.post("/{biz_id}")
async def create_supplier(biz_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    if "id" not in payload or not payload["id"]:
        payload["id"] = f"s_{uuid.uuid4().hex[:6]}"
    if "deliveryHistory" not in payload:
        payload["deliveryHistory"] = []
    data.setdefault("suppliers", []).append(payload)
    return payload


@router.patch("/{biz_id}/{sup_id}")
async def update_supplier(biz_id: str, sup_id: str, patch: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    suppliers = data.setdefault("suppliers", [])
    for s in suppliers:
        if s.get("id") == sup_id:
            s.update(patch)
            return s
    raise HTTPException(status_code=404, detail="Supplier not found")


@router.delete("/{biz_id}/{sup_id}")
async def delete_supplier(biz_id: str, sup_id: str):
    data = db.get_dataset(biz_id)
    suppliers = data.setdefault("suppliers", [])
    data["suppliers"] = [s for s in suppliers if s.get("id") != sup_id]
    return {"status": "deleted", "id": sup_id}


@router.post("/{biz_id}/import/bulk")
async def bulk_import_suppliers(biz_id: str, items: List[Dict[str, Any]] = Body(...)):
    data = db.get_dataset(biz_id)
    suppliers = data.setdefault("suppliers", [])
    for item in items:
        if "id" not in item:
            item["id"] = f"s_{uuid.uuid4().hex[:6]}"
        suppliers.append(item)
    return {"imported": len(items)}
