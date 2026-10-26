# ============================================================
# Invoices Routes (Sales & Purchase)
# ============================================================

from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List
from app.core.database import db
import uuid
from datetime import date

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

# ── Sales Invoices ──────────────────────────────────────────

@router.get("/sales/{biz_id}")
async def list_sales_invoices(biz_id: str):
    data = db.get_dataset(biz_id)
    return data.get("salesInvoices", [])


@router.get("/sales/{biz_id}/{inv_id}")
async def get_sales_invoice(biz_id: str, inv_id: str):
    data = db.get_dataset(biz_id)
    for inv in data.get("salesInvoices", []):
        if inv.get("id") == inv_id:
            return inv
    raise HTTPException(status_code=404, detail="Invoice not found")


@router.post("/sales/{biz_id}")
async def create_sales_invoice(biz_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    if "id" not in payload or not payload["id"]:
        payload["id"] = f"si_{uuid.uuid4().hex[:6]}"
    if "paidPaise" not in payload:
        payload["paidPaise"] = 0
    if "notes" not in payload:
        payload["notes"] = []
    data.setdefault("salesInvoices", []).append(payload)
    return payload


@router.patch("/sales/{biz_id}/{inv_id}")
async def update_sales_invoice(biz_id: str, inv_id: str, patch: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    invoices = data.setdefault("salesInvoices", [])
    for inv in invoices:
        if inv.get("id") == inv_id:
            inv.update(patch)
            return inv
    raise HTTPException(status_code=404, detail="Invoice not found")


@router.delete("/sales/{biz_id}/{inv_id}")
async def delete_sales_invoice(biz_id: str, inv_id: str):
    data = db.get_dataset(biz_id)
    invoices = data.setdefault("salesInvoices", [])
    data["salesInvoices"] = [inv for inv in invoices if inv.get("id") != inv_id]
    return {"status": "deleted", "id": inv_id}


@router.post("/sales/{biz_id}/{inv_id}/payments")
async def record_sales_payment(biz_id: str, inv_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    invoices = data.setdefault("salesInvoices", [])
    amount = payload.get("amountPaise", 0)
    payment_date = payload.get("date") or date.today().isoformat()
    for inv in invoices:
        if inv.get("id") == inv_id:
            new_paid = min(inv.get("amountPaise", 0), inv.get("paidPaise", 0) + amount)
            inv["paidPaise"] = new_paid
            if new_paid >= inv.get("amountPaise", 0):
                inv["actualPaymentDate"] = payment_date
            notes = inv.setdefault("notes", [])
            notes.append({"date": payment_date, "text": f"Payment of ₹{amount/100:.2f} recorded."})
            # Also record in transactions
            tx = {
                "id": f"tx_pay_{uuid.uuid4().hex[:6]}",
                "date": payment_date,
                "label": f"Receipt — {inv.get('number', inv_id)}",
                "category": "invoice-receipt",
                "direction": "in",
                "amountPaise": amount,
                "status": "actual",
                "ref": {"kind": "sales-invoice", "id": inv_id},
            }
            data.setdefault("transactions", []).append(tx)
            # Update cash balance
            data["currentCashPaise"] = data.get("currentCashPaise", 0) + amount
            return {"status": "recorded", "invoice": inv}
    raise HTTPException(status_code=404, detail="Invoice not found")


@router.post("/sales/{biz_id}/import/bulk")
async def bulk_import_sales_invoices(biz_id: str, items: List[Dict[str, Any]] = Body(...)):
    data = db.get_dataset(biz_id)
    invoices = data.setdefault("salesInvoices", [])
    for item in items:
        if "id" not in item:
            item["id"] = f"si_{uuid.uuid4().hex[:6]}"
        invoices.append(item)
    return {"imported": len(items)}


# ── Purchase Invoices ───────────────────────────────────────

@router.get("/purchase/{biz_id}")
async def list_purchase_invoices(biz_id: str):
    data = db.get_dataset(biz_id)
    return data.get("purchaseInvoices", [])


@router.get("/purchase/{biz_id}/{inv_id}")
async def get_purchase_invoice(biz_id: str, inv_id: str):
    data = db.get_dataset(biz_id)
    for inv in data.get("purchaseInvoices", []):
        if inv.get("id") == inv_id:
            return inv
    raise HTTPException(status_code=404, detail="Invoice not found")


@router.post("/purchase/{biz_id}")
async def create_purchase_invoice(biz_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    if "id" not in payload or not payload["id"]:
        payload["id"] = f"pi_{uuid.uuid4().hex[:6]}"
    if "paidPaise" not in payload:
        payload["paidPaise"] = 0
    data.setdefault("purchaseInvoices", []).append(payload)
    return payload


@router.patch("/purchase/{biz_id}/{inv_id}")
async def update_purchase_invoice(biz_id: str, inv_id: str, patch: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    invoices = data.setdefault("purchaseInvoices", [])
    for inv in invoices:
        if inv.get("id") == inv_id:
            inv.update(patch)
            return inv
    raise HTTPException(status_code=404, detail="Invoice not found")


@router.delete("/purchase/{biz_id}/{inv_id}")
async def delete_purchase_invoice(biz_id: str, inv_id: str):
    data = db.get_dataset(biz_id)
    invoices = data.setdefault("purchaseInvoices", [])
    data["purchaseInvoices"] = [inv for inv in invoices if inv.get("id") != inv_id]
    return {"status": "deleted", "id": inv_id}


@router.post("/purchase/{biz_id}/{inv_id}/payments")
async def record_purchase_payment(biz_id: str, inv_id: str, payload: Dict[str, Any] = Body(...)):
    data = db.get_dataset(biz_id)
    invoices = data.setdefault("purchaseInvoices", [])
    amount = payload.get("amountPaise", 0)
    payment_date = payload.get("date") or date.today().isoformat()
    for inv in invoices:
        if inv.get("id") == inv_id:
            new_paid = min(inv.get("amountPaise", 0), inv.get("paidPaise", 0) + amount)
            inv["paidPaise"] = new_paid
            if new_paid >= inv.get("amountPaise", 0):
                inv["actualPaymentDate"] = payment_date
            tx = {
                "id": f"tx_pay_{uuid.uuid4().hex[:6]}",
                "date": payment_date,
                "label": f"Payment — {inv.get('number', inv_id)}",
                "category": "supplier-payment",
                "direction": "out",
                "amountPaise": amount,
                "status": "actual",
                "ref": {"kind": "purchase-invoice", "id": inv_id},
            }
            data.setdefault("transactions", []).append(tx)
            data["currentCashPaise"] = max(0, data.get("currentCashPaise", 0) - amount)
            return {"status": "recorded", "invoice": inv}
    raise HTTPException(status_code=404, detail="Invoice not found")


@router.post("/purchase/{biz_id}/import/bulk")
async def bulk_import_purchase_invoices(biz_id: str, items: List[Dict[str, Any]] = Body(...)):
    data = db.get_dataset(biz_id)
    invoices = data.setdefault("purchaseInvoices", [])
    for item in items:
        if "id" not in item:
            item["id"] = f"pi_{uuid.uuid4().hex[:6]}"
        invoices.append(item)
    return {"imported": len(items)}
