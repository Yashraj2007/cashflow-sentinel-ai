# ============================================================
# CashFlow Sentinel AI — Data Store & Seed State
# ============================================================

from datetime import date, timedelta
from typing import Dict, Any, List, Optional
import copy


def d_str(days_offset: int) -> str:
    target = date.today() + timedelta(days=days_offset)
    return target.isoformat()


def p_cents(rupees: float) -> int:
    return int(round(rupees * 100))


def get_default_business() -> Dict[str, Any]:
    return {
        "id": "navkar",
        "name": "Navkar Traders",
        "type": "Wholesale distributor — electrical goods",
        "owner": "Ramesh Navkar",
        "email": "accounts@navkartraders.in",
        "phone": "+91 98220 44121",
        "city": "Pune, MH",
        "gstin": "27AABCN4321F1Z5",
        "settings": {
            "currency": "INR",
            "forecastHorizonDays": 30,
            "minReservePaise": p_cents(200000),
            "uncertainReceiptHaircutPct": 0,
            "notifyShortage": True,
            "notifyOverdue": True,
            "notifySupplierDue": True,
            "reminderDefaultDays": 3,
            "emailSignature": "Accounts team — Navkar Traders",
        },
    }


def get_initial_seed_data() -> Dict[str, Any]:
    customers = [
        {"id": "c1", "name": "Sharma Hardware", "contact": "Anil Sharma", "email": "anil@sharmahardware.in", "phone": "+91 98110 22314", "city": "Pune", "gstin": "27AASCS1109H1Z2", "termsDays": 15, "paymentHistory": [{"amountPaise": p_cents(60000 + i * 8000), "delayDays": delay} for i, delay in enumerate([-2, 0, 1, 0, -1, 0, 0, 1, 0])]},
        {"id": "c2", "name": "Gupta Electricals", "contact": "Neha Gupta", "email": "neha@guptaelectricals.co.in", "phone": "+91 99604 51277", "city": "Mumbai", "gstin": "27AACCG6620P1Z8", "termsDays": 15, "paymentHistory": [{"amountPaise": p_cents(90000 + i * 6500), "delayDays": delay} for i, delay in enumerate([-1, 4, 6, 8, 5, 9, 7, 12])]},
        {"id": "c3", "name": "Krishna Traders", "contact": "S. Krishna", "email": "krishna.traders@rediffmail.com", "phone": "+91 93220 88450", "city": "Nashik", "gstin": "27AAKCK3345L1Z1", "termsDays": 30, "paymentHistory": [{"amountPaise": p_cents(140000 + i * 12000), "delayDays": delay} for i, delay in enumerate([9, 14, 11, 18, 12, 16, 10])]},
        {"id": "c4", "name": "NewLight Stores", "contact": "Farhan Shaikh", "email": "newlightstores@gmail.com", "phone": "+91 90040 15522", "city": "Pune", "gstin": "27AANLS2210Q1Z6", "termsDays": 15, "paymentHistory": []},
        {"id": "c5", "name": "Om Distributors", "contact": "Om Prakash", "email": "om@omdistributors.in", "phone": "+91 98903 60148", "city": "Satara", "gstin": "27AAODO5511R1Z4", "termsDays": 20, "paymentHistory": [{"amountPaise": p_cents(70000 + i * 9000), "delayDays": delay} for i, delay in enumerate([0, 2, 4, 1, 3, 5])]},
        {"id": "c6", "name": "Balaji & Sons", "contact": "Kiran Balaji", "email": "balajiandsons@yahoo.in", "phone": "+91 94220 31875", "city": "Kolhapur", "gstin": "27AABCS9987M1Z9", "termsDays": 15, "paymentHistory": [{"amountPaise": p_cents(40000 + i * 5000), "delayDays": delay} for i, delay in enumerate([6, 9, 4, 11, 8])]},
    ]

    suppliers = [
        {"id": "s1", "name": "Polar Cables Ltd", "contact": "Sales Desk", "email": "orders@polarcables.com", "phone": "+91 20 2712 4455", "city": "Pune", "gstin": "27AAACP7788F1Z3", "paymentTermsDays": 30, "deliveryHistory": [0, 1, 0, -1, 0, 1, 0, 0], "priceTrend": [100, 101, 103, 102, 104]},
        {"id": "s2", "name": "Surya Switchgear", "contact": "Vikram Rao", "email": "vikram@suryaswitchgear.in", "phone": "+91 22 4076 1122", "city": "Mumbai", "gstin": "27AASCS8811G1Z7", "paymentTermsDays": 30, "deliveryHistory": [2, 4, 1, 5, 3, 2], "priceTrend": [100, 100, 102, 105, 106]},
        {"id": "s3", "name": "Hind Rectifiers", "contact": "Accounts", "email": "sales@hindrectifiers.co.in", "phone": "+91 22 2570 8899", "city": "Mumbai", "gstin": "27AAHCR2233H1Z5", "paymentTermsDays": 21, "deliveryHistory": [7, 10, 6, 12, 9], "priceTrend": [100, 99, 101, 100, 103]},
        {"id": "s4", "name": "Kaveri Polymers", "contact": "Santosh Patil", "email": "kaveri.polymers@gmail.com", "phone": "+91 98811 40233", "city": "Satara", "gstin": "27AAKCP6677J1Z2", "paymentTermsDays": 15, "deliveryHistory": [3, 1], "priceTrend": [100, 102]},
        {"id": "s5", "name": "Everest Packaging", "contact": "Office", "email": "everestpkg@outlook.com", "phone": "+91 231 246 7788", "city": "Kolhapur", "gstin": "27AAECP1122K1Z8", "paymentTermsDays": 15, "deliveryHistory": [], "priceTrend": []},
        {"id": "s6", "name": "Mahavir Metals", "contact": "Rakesh Jain", "email": "rakesh@mahavirmetals.in", "phone": "+91 98230 90411", "city": "Pune", "gstin": "27AAMCM3344L1Z1", "paymentTermsDays": 21, "deliveryHistory": [1, 2, 0, 3, 1, 2], "priceTrend": [100, 103, 107, 106, 109]},
    ]

    sales_invoices = [
        {"id": "si1", "number": "INV-1042", "partyId": "c1", "amountPaise": p_cents(124000), "paidPaise": p_cents(124000), "issueDate": d_str(-38), "dueDate": d_str(-23), "expectedPaymentDate": d_str(-23), "actualPaymentDate": d_str(-24), "poRef": "PO-8790", "notes": []},
        {"id": "si2", "number": "INV-1048", "partyId": "c5", "amountPaise": p_cents(86000), "paidPaise": p_cents(86000), "issueDate": d_str(-33), "dueDate": d_str(-18), "expectedPaymentDate": d_str(-16), "actualPaymentDate": d_str(-16), "poRef": "PO-8801", "notes": []},
        {"id": "si3", "number": "INV-1051", "partyId": "c2", "amountPaise": p_cents(142000), "paidPaise": p_cents(142000), "issueDate": d_str(-30), "dueDate": d_str(-15), "expectedPaymentDate": d_str(-9), "actualPaymentDate": d_str(-9), "poRef": "PO-8812", "notes": []},
        {"id": "si4", "number": "INV-1055", "partyId": "c6", "amountPaise": p_cents(58000), "paidPaise": p_cents(58000), "issueDate": d_str(-27), "dueDate": d_str(-12), "expectedPaymentDate": d_str(-3), "actualPaymentDate": d_str(-3), "poRef": "PO-8820", "notes": []},
        {"id": "si5", "number": "INV-1058", "partyId": "c1", "amountPaise": p_cents(96000), "paidPaise": p_cents(96000), "issueDate": d_str(-20), "dueDate": d_str(-5), "expectedPaymentDate": d_str(-5), "actualPaymentDate": d_str(-5), "poRef": "PO-8833", "notes": []},
        {"id": "si6", "number": "INV-1061", "partyId": "c5", "amountPaise": p_cents(150000), "paidPaise": p_cents(60000), "issueDate": d_str(-16), "dueDate": d_str(-1), "expectedPaymentDate": d_str(4), "actualPaymentDate": None, "poRef": "PO-8841", "notes": [{"date": d_str(-2), "text": "Received ₹60,000 as agreed first instalment."}]},
        {"id": "si7", "number": "INV-1063", "partyId": "c2", "amountPaise": p_cents(110000), "paidPaise": p_cents(40000), "issueDate": d_str(-14), "dueDate": d_str(1), "expectedPaymentDate": d_str(7), "actualPaymentDate": None, "poRef": "PO-8849", "notes": []},
        {"id": "si8", "number": "INV-1044", "partyId": "c3", "amountPaise": p_cents(190000), "paidPaise": 0, "issueDate": d_str(-40), "dueDate": d_str(-18), "expectedPaymentDate": d_str(6), "actualPaymentDate": None, "poRef": "PO-8774", "notes": [{"date": d_str(-8), "text": "S. Krishna promised payment 'after Diwali sales'."}]},
        {"id": "si9", "number": "INV-1057", "partyId": "c2", "amountPaise": p_cents(85000), "paidPaise": 0, "issueDate": d_str(-26), "dueDate": d_str(-6), "expectedPaymentDate": d_str(3), "actualPaymentDate": None, "poRef": "PO-8828", "notes": []},
        {"id": "si10", "number": "INV-1060", "partyId": "c6", "amountPaise": p_cents(42000), "paidPaise": 0, "issueDate": d_str(-22), "dueDate": d_str(-3), "expectedPaymentDate": d_str(5), "actualPaymentDate": None, "poRef": "PO-8835", "notes": []},
        {"id": "si11", "number": "INV-1066", "partyId": "c1", "amountPaise": p_cents(120000), "paidPaise": 0, "issueDate": d_str(-6), "dueDate": d_str(9), "expectedPaymentDate": d_str(9), "actualPaymentDate": None, "poRef": "PO-8856", "notes": []},
        {"id": "si12", "number": "INV-1068", "partyId": "c3", "amountPaise": p_cents(260000), "paidPaise": 0, "issueDate": d_str(-4), "dueDate": d_str(11), "expectedPaymentDate": d_str(24), "actualPaymentDate": None, "poRef": "PO-8860", "notes": [{"date": d_str(-4), "text": "Large festive-season order."}]},
        {"id": "si13", "number": "INV-1070", "partyId": "c4", "amountPaise": p_cents(75000), "paidPaise": 0, "issueDate": d_str(-2), "dueDate": d_str(13), "expectedPaymentDate": d_str(13), "actualPaymentDate": None, "poRef": "PO-8867", "notes": []},
        {"id": "si14", "number": "INV-1072", "partyId": "c5", "amountPaise": p_cents(95000), "paidPaise": 0, "issueDate": d_str(-1), "dueDate": d_str(14), "expectedPaymentDate": d_str(17), "actualPaymentDate": None, "poRef": "PO-8870", "notes": []},
        {"id": "si15", "number": "INV-1073", "partyId": "c6", "amountPaise": p_cents(64000), "paidPaise": 0, "issueDate": d_str(2), "dueDate": d_str(17), "expectedPaymentDate": d_str(25), "actualPaymentDate": None, "isDraft": True, "poRef": "PO-8874", "notes": []},
    ]

    purchase_invoices = [
        {"id": "pi1", "number": "BILL-501", "partyId": "s1", "amountPaise": p_cents(182000), "paidPaise": p_cents(182000), "issueDate": d_str(-35), "dueDate": d_str(-5), "plannedPaymentDate": d_str(-6), "actualPaymentDate": d_str(-6), "priority": "normal", "poRef": "PO-3301"},
        {"id": "pi2", "number": "BILL-503", "partyId": "s6", "amountPaise": p_cents(64000), "paidPaise": p_cents(64000), "issueDate": d_str(-30), "dueDate": d_str(-8), "plannedPaymentDate": d_str(-8), "actualPaymentDate": d_str(-8), "priority": "normal", "poRef": "PO-3310"},
        {"id": "pi3", "number": "BILL-506", "partyId": "s2", "amountPaise": p_cents(96500), "paidPaise": p_cents(96500), "issueDate": d_str(-25), "dueDate": d_str(-3), "plannedPaymentDate": d_str(-3), "actualPaymentDate": d_str(-1), "priority": "normal", "poRef": "PO-3318"},
        {"id": "pi4", "number": "BILL-509", "partyId": "s3", "amountPaise": p_cents(74000), "paidPaise": p_cents(74000), "issueDate": d_str(-20), "dueDate": d_str(-2), "plannedPaymentDate": d_str(-2), "actualPaymentDate": d_str(-2), "priority": "normal", "poRef": "PO-3325"},
        {"id": "pi5", "number": "BILL-512", "partyId": "s1", "amountPaise": p_cents(140000), "paidPaise": p_cents(50000), "issueDate": d_str(-12), "dueDate": d_str(6), "plannedPaymentDate": d_str(6), "actualPaymentDate": None, "priority": "normal", "poRef": "PO-3345"},
        {"id": "pi6", "number": "BILL-514", "partyId": "s6", "amountPaise": p_cents(118000), "paidPaise": 0, "issueDate": d_str(-10), "dueDate": d_str(4), "plannedPaymentDate": d_str(4), "actualPaymentDate": None, "priority": "critical", "poRef": "PO-3352"},
        {"id": "pi7", "number": "BILL-516", "partyId": "s2", "amountPaise": p_cents(88000), "paidPaise": 0, "issueDate": d_str(-8), "dueDate": d_str(7), "plannedPaymentDate": d_str(7), "actualPaymentDate": None, "priority": "normal", "poRef": "PO-3358"},
        {"id": "pi8", "number": "BILL-518", "partyId": "s3", "amountPaise": p_cents(132000), "paidPaise": 0, "issueDate": d_str(-7), "dueDate": d_str(10), "plannedPaymentDate": d_str(10), "actualPaymentDate": None, "priority": "normal", "poRef": "PO-3361"},
        {"id": "pi9", "number": "BILL-520", "partyId": "s5", "amountPaise": p_cents(36000), "paidPaise": 0, "issueDate": d_str(-5), "dueDate": d_str(12), "plannedPaymentDate": d_str(12), "actualPaymentDate": None, "priority": "low", "poRef": "PO-3364"},
        {"id": "pi10", "number": "BILL-521", "partyId": "s4", "amountPaise": p_cents(54000), "paidPaise": 0, "issueDate": d_str(-4), "dueDate": d_str(14), "plannedPaymentDate": d_str(14), "actualPaymentDate": None, "priority": "low", "poRef": "PO-3366"},
        {"id": "pi11", "number": "BILL-523", "partyId": "s1", "amountPaise": p_cents(205000), "paidPaise": 0, "issueDate": d_str(-2), "dueDate": d_str(18), "plannedPaymentDate": d_str(18), "actualPaymentDate": None, "priority": "normal", "poRef": "PO-3370"},
        {"id": "pi12", "number": "BILL-525", "partyId": "s6", "amountPaise": p_cents(47000), "paidPaise": 0, "issueDate": d_str(-1), "dueDate": d_str(20), "plannedPaymentDate": d_str(20), "actualPaymentDate": None, "priority": "normal", "poRef": "PO-3373"},
    ]

    transactions = [
        {"id": "tx-1", "date": d_str(-24), "label": "Receipt — INV-1042 (Sharma Hardware)", "category": "invoice-receipt", "direction": "in", "amountPaise": p_cents(124000), "status": "actual"},
        {"id": "tx-2", "date": d_str(-16), "label": "Receipt — INV-1048 (Om Distributors)", "category": "invoice-receipt", "direction": "in", "amountPaise": p_cents(86000), "status": "actual"},
        {"id": "tx-3", "date": d_str(-9), "label": "Receipt — INV-1051 (Gupta Electricals)", "category": "invoice-receipt", "direction": "in", "amountPaise": p_cents(142000), "status": "actual"},
        {"id": "tx-4", "date": d_str(-6), "label": "Payment — BILL-501 (Polar Cables)", "category": "supplier-payment", "direction": "out", "amountPaise": p_cents(182000), "status": "actual"},
        {"id": "tx-5", "date": d_str(-8), "label": "Payment — BILL-503 (Mahavir Metals)", "category": "supplier-payment", "direction": "out", "amountPaise": p_cents(64000), "status": "actual"},
        {"id": "tx-6", "date": d_str(5), "label": "Staff salaries (due)", "category": "salary", "direction": "out", "amountPaise": p_cents(185000), "status": "confirmed"},
        {"id": "tx-7", "date": d_str(8), "label": "Warehouse rent (due)", "category": "rent", "direction": "out", "amountPaise": p_cents(60000), "status": "confirmed"},
        {"id": "tx-8", "date": d_str(12), "label": "GST payment (due)", "category": "tax", "direction": "out", "amountPaise": p_cents(45000), "status": "confirmed"},
        {"id": "tx-9", "date": d_str(15), "label": "Working-capital loan EMI (due)", "category": "loan-emi", "direction": "out", "amountPaise": p_cents(42000), "status": "confirmed"},
    ]

    expenses = [
        {"id": "exp-1", "name": "Office and Warehouse Rent", "category": "rent", "amountPaise": p_cents(60000), "frequency": "monthly", "dayOfMonth": 8, "active": True, "recurring": True},
        {"id": "exp-2", "name": "Staff Salaries (5 members)", "category": "salary", "amountPaise": p_cents(185000), "frequency": "monthly", "dayOfMonth": 5, "active": True, "recurring": True},
        {"id": "exp-3", "name": "Working Capital Loan EMI", "category": "loan-emi", "amountPaise": p_cents(42000), "frequency": "monthly", "dayOfMonth": 15, "active": True, "recurring": True},
        {"id": "exp-4", "name": "Electricity & Water Utilities", "category": "utilities", "amountPaise": p_cents(12000), "frequency": "monthly", "dayOfMonth": 9, "active": True, "recurring": True},
    ]

    reminders = [
        {"id": "rem1", "kind": "sales-invoice", "invoiceId": "si8", "channel": "email", "recipient": "krishna.traders@rediffmail.com", "subject": "Payment overdue — INV-1044", "status": "delivered", "scheduledDate": d_str(-6)},
        {"id": "rem2", "kind": "sales-invoice", "invoiceId": "si9", "channel": "call", "recipient": "+91 99604 51277 (Neha Gupta)", "subject": "AI Follow-up Call", "status": "call-completed", "scheduledDate": d_str(-2)},
    ]

    return {
        "business": get_default_business(),
        "currentCashPaise": p_cents(540000),
        "openingBalancePaise": p_cents(540000),
        "customers": customers,
        "suppliers": suppliers,
        "salesInvoices": sales_invoices,
        "purchaseInvoices": purchase_invoices,
        "transactions": transactions,
        "expenses": expenses,
        "recurringExpenses": [e for e in expenses if e.get("recurring")],
        "reminders": reminders,
        "savedScenarios": [],
        "alertMeta": {},
    }


class InMemoryDatabase:
    def __init__(self):
        self.businesses: Dict[str, Dict[str, Any]] = {"navkar": get_default_business()}
        self.datasets: Dict[str, Dict[str, Any]] = {"navkar": get_initial_seed_data()}
        self.users: Dict[str, Dict[str, Any]] = {
            "demo": {
                "uid": "usr_demo",
                "email": "demo@cashflow-sentinel.local",
                "name": "Ramesh Navkar",
                "businessId": "navkar",
                "avatarInitials": "RN",
            }
        }

    def get_dataset(self, biz_id: str) -> Dict[str, Any]:
        if biz_id not in self.datasets:
            data = get_initial_seed_data()
            biz = self.businesses.get(biz_id, get_default_business())
            data["business"] = biz
            self.datasets[biz_id] = data
        return self.datasets[biz_id]

    def reset_dataset(self, biz_id: str) -> Dict[str, Any]:
        self.datasets[biz_id] = get_initial_seed_data()
        return self.datasets[biz_id]


db = InMemoryDatabase()
