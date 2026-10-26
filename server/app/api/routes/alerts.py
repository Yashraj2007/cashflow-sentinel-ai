# ============================================================
# Alerts Routes
# ============================================================

from fastapi import APIRouter, Body
from typing import Dict, Any
from app.core.database import db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/{biz_id}")
async def list_alerts(biz_id: str):
    data = db.get_dataset(biz_id)
    return list(data.get("alertMeta", {}).values())


@router.patch("/{biz_id}/{alert_id}")
async def update_alert(biz_id: str, alert_id: str, patch: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    meta = data.setdefault("alertMeta", {})
    item = meta.setdefault(alert_id, {"id": alert_id})
    item.update(patch)
    return item
