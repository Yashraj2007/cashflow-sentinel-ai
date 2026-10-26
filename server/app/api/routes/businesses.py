# ============================================================
# Businesses Routes
# ============================================================

from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List
from app.core.database import db

router = APIRouter(prefix="/api/businesses", tags=["businesses"])


@router.get("/")
async def list_businesses():
    return list(db.businesses.values())


@router.get("/{business_id}")
async def get_business(business_id: str):
    biz = db.businesses.get(business_id)
    if not biz:
        return db.businesses.get("navkar")
    return biz


@router.get("/{business_id}/full-data")
async def get_full_data(business_id: str):
    dataset = db.get_dataset(business_id)
    return dataset


@router.post("/")
async def create_business(payload: Dict[str, Any] = Body(...)):
    biz_id = payload.get("id") or f"biz-{len(db.businesses) + 1}"
    payload["id"] = biz_id
    db.businesses[biz_id] = payload
    return payload


@router.patch("/{business_id}/settings")
async def update_settings(business_id: str, patch: Dict[str, Any] = Body(...)):
    dataset = db.get_dataset(business_id)
    biz = dataset.get("business", {})
    current_settings = biz.get("settings", {})
    current_settings.update(patch)
    biz["settings"] = current_settings
    dataset["business"] = biz
    return current_settings


@router.post("/{business_id}/clear-data")
async def clear_data(business_id: str):
    dataset = db.get_dataset(business_id)
    dataset["customers"] = []
    dataset["suppliers"] = []
    dataset["salesInvoices"] = []
    dataset["purchaseInvoices"] = []
    dataset["transactions"] = []
    dataset["expenses"] = []
    dataset["reminders"] = []
    dataset["savedScenarios"] = []
    return {"status": "cleared"}


@router.post("/{business_id}/seed-sample-data")
async def seed_data(business_id: str):
    dataset = db.reset_dataset(business_id)
    return dataset
