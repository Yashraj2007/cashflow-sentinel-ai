# ============================================================
# Auth Routes
# ============================================================

from fastapi import APIRouter, Request, Body
from typing import Dict, Any
from app.core.database import db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(payload: Dict[str, Any] = Body(...)):
    name = payload.get("name") or "Demo Owner"
    user_data = {
        "uid": "usr_demo",
        "email": payload.get("email") or "demo@cashflow-sentinel.local",
        "name": name,
        "businessId": "navkar",
        "accessToken": "demo_jwt_session_token_12345",
    }
    db.users["demo"] = user_data
    return user_data


@router.post("/owner-auth")
async def owner_auth(payload: Dict[str, Any] = Body(...)):
    biz_name = payload.get("businessName") or "My Business"
    owner_name = payload.get("ownerName") or "Owner"
    biz_id = "navkar"

    # Update navkar business info with user entered details
    biz = db.businesses.get(biz_id, {})
    biz["name"] = biz_name
    biz["owner"] = owner_name
    biz["type"] = payload.get("businessType") or biz.get("type", "")
    biz["city"] = payload.get("city") or biz.get("city", "")
    biz["email"] = payload.get("email") or biz.get("email", "")
    biz["phone"] = payload.get("phone") or biz.get("phone", "")

    user_data = {
        "uid": "usr_demo",
        "email": payload.get("email") or "demo@cashflow-sentinel.local",
        "name": owner_name,
        "businessId": biz_id,
        "accessToken": "demo_jwt_session_token_12345",
    }
    db.users["demo"] = user_data
    return user_data


@router.get("/me")
async def get_current_user():
    return db.users.get("demo", {
        "uid": "usr_demo",
        "email": "demo@cashflow-sentinel.local",
        "name": "Ramesh Navkar",
        "businessId": "navkar",
    })
