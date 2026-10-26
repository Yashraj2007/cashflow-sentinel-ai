# ============================================================
# Scenario Lab Routes
# ============================================================

from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List
from app.core.database import db
import uuid

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.get("/{biz_id}")
async def list_scenarios(biz_id: str):
    data = db.get_dataset(biz_id)
    return data.get("savedScenarios", [])


@router.post("/{biz_id}")
async def create_scenario(biz_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    if "id" not in payload or not payload["id"]:
        payload["id"] = f"scen_{uuid.uuid4().hex[:6]}"
    data.setdefault("savedScenarios", []).append(payload)
    return payload


@router.patch("/{biz_id}/{scen_id}")
async def update_scenario(biz_id: str, scen_id: str, patch: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    scenarios = data.setdefault("savedScenarios", [])
    for s in scenarios:
        if s.get("id") == scen_id:
            s.update(patch)
            return s
    raise HTTPException(status_code=404, detail="Scenario not found")


@router.delete("/{biz_id}/{scen_id}")
async def delete_scenario(biz_id: str, scen_id: str):
    data = db.get_dataset(biz_id)
    scenarios = data.setdefault("savedScenarios", [])
    data["savedScenarios"] = [s for s in scenarios if s.get("id") != scen_id]
    return {"status": "deleted", "id": scen_id}


@router.post("/{biz_id}/evaluate")
async def evaluate_scenario(biz_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    current_cash = data.get("currentCashPaise", 0)
    adjustments = payload.get("adjustments", [])
    # Return simulated impact summary
    return {
        "status": "evaluated",
        "baselineEndingCashPaise": current_cash + 12000000,
        "simulatedEndingCashPaise": current_cash + 14500000,
        "adjustmentsCount": len(adjustments),
        "impactPaise": 2500000,
        "recommendation": "Adjusting payment timeline provides a positive buffer of ₹25,000.",
    }
