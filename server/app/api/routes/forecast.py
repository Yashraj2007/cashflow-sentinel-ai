# ============================================================
# Forecast Routes
# ============================================================

from fastapi import APIRouter, Query
from typing import Optional
from app.core.database import db

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("/{biz_id}")
async def get_forecast(biz_id: str, horizonDays: Optional[int] = Query(30)):
    dataset = db.get_dataset(biz_id)
    current_cash = dataset.get("currentCashPaise", 0)
    return {
        "businessId": biz_id,
        "horizonDays": horizonDays,
        "currentCashPaise": current_cash,
        "status": "ready",
    }
