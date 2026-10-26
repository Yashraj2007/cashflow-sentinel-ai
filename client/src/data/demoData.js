// ============================================================
// Synthetic demo data, anchored to "today" so forecasts,
// overdue markers and alerts are always live and internally
// consistent. All money values are stored as integer paise.
// ============================================================

import { addDaysISO, todayISO } from "../utils/finance.js";

const P = (rupees) => Math.round(rupees * 100); // rupees -> paise
let uid = 0;
const nextId = (prefix) => `${prefix}-${(uid += 1)}`;

export const BUSINESSES = [
  {
    id: "navkar",
    name: "Navkar Traders",
    type: "Wholesale distributor — electrical goods",
    owner: "Ramesh Navkar",
    email: "accounts@navkartraders.in",
    phone: "+91 98220 44121",
    city: "Pune, MH",
    gstin: "27AABCN4321F1Z5",
  },
  {
    id: "meera",
    name: "Meera Textiles",
    type: "Manufacturer — cotton fabrics",
    owner: "Meera Kulkarni",
    email: "finance@meeratextiles.in",
    phone: "+91 98500 77812",
    city: "Ichalkaranji, MH",
    gstin: "27AABCM8765K1Z3",
  },
];

export const DEFAULT_SETTINGS = {
  currency: "INR",
  forecastHorizonDays: 30,
  minReservePaise: P(200000),
  uncertainReceiptHaircutPct: 0,
  notifyShortage: true,
  notifyOverdue: true,
  notifySupplierDue: true,
  reminderDefaultDays: 3,
  emailSignature: "Accounts team",
};

function buildNavkar(anchor) {
  const d = (n) => addDaysISO(anchor, n);
  uid = 0;

  const customers = [
    { id: "c1", name: "Sharma Hardware", contact: "Anil Sharma", email: "anil@sharmahardware.in", phone: "+91 98110 22314", city: "Pune", gstin: "27AASCS1109H1Z2", termsDays: 15, paymentHistory: [-2, 0, 1, 0, -1, 0, 0, 1, 0].map((delay, i) => ({ amountPaise: P(60000 + i * 8000), delayDays: delay })) },
    { id: "c2", name: "Gupta Electricals", contact: "Neha Gupta", email: "neha@guptaelectricals.co.in", phone: "+91 99604 51277", city: "Mumbai", gstin: "27AACCG6620P1Z8", termsDays: 15, paymentHistory: [-1, 4, 6, 8, 5, 9, 7, 12].map((delay, i) => ({ amountPaise: P(90000 + i * 6500), delayDays: delay })) },
    { id: "c3", name: "Krishna Traders", contact: "S. Krishna", email: "krishna.traders@rediffmail.com", phone: "+91 93220 88450", city: "Nashik", gstin: "27AAKCK3345L1Z1", termsDays: 30, paymentHistory: [9, 14, 11, 18, 12, 16, 10].map((delay, i) => ({ amountPaise: P(140000 + i * 12000), delayDays: delay })) },
    { id: "c4", name: "NewLight Stores", contact: "Farhan Shaikh", email: "newlightstores@gmail.com", phone: "+91 90040 15522", city: "Pune", gstin: "27AANLS2210Q1Z6", termsDays: 15, paymentHistory: [] },
    { id: "c5", name: "Om Distributors", contact: "Om Prakash", email: "om@omdistributors.in", phone: "+91 98903 60148", city: "Satara", gstin: "27AAODO5511R1Z4", termsDays: 20, paymentHistory: [0, 2, 4, 1, 3, 5].map((delay, i) => ({ amountPaise: P(70000 + i * 9000), delayDays: delay })) },
    { id: "c6", name: "Balaji & Sons", contact: "Kiran Balaji", email: "balajiandsons@yahoo.in", phone: "+91 94220 31875", city: "Kolhapur", gstin: "27AABCS9987M1Z9", termsDays: 15, paymentHistory: [6, 9, 4, 11, 8].map((delay, i) => ({ amountPaise: P(40000 + i * 5000), delayDays: delay })) },
  ];

  const suppliers = [
    { id: "s1", name: "Polar Cables Ltd", contact: "Sales Desk", email: "orders@polarcables.com", phone: "+91 20 2712 4455", city: "Pune", gstin: "27AAACP7788F1Z3", paymentTermsDays: 30, deliveryHistory: [0, 1, 0, -1, 0, 1, 0, 0], priceTrend: [100, 101, 103, 102, 104] },
    { id: "s2", name: "Surya Switchgear", contact: "Vikram Rao", email: "vikram@suryaswitchgear.in", phone: "+91 22 4076 1122", city: "Mumbai", gstin: "27AASCS8811G1Z7", paymentTermsDays: 30, deliveryHistory: [2, 4, 1, 5, 3, 2], priceTrend: [100, 100, 102, 105, 106] },
    { id: "s3", name: "Hind Rectifiers", contact: "Accounts", email: "sales@hindrectifiers.co.in", phone: "+91 22 2570 8899", city: "Mumbai", gstin: "27AAHCR2233H1Z5", paymentTermsDays: 21, deliveryHistory: [7, 10, 6, 12, 9], priceTrend: [100, 99, 101, 100, 103] },
    { id: "s4", name: "Kaveri Polymers", contact: "Santosh Patil", email: "kaveri.polymers@gmail.com", phone: "+91 98811 40233", city: "Satara", gstin: "27AAKCP6677J1Z2", paymentTermsDays: 15, deliveryHistory: [3, 1], priceTrend: [100, 102] },
    { id: "s5", name: "Everest Packaging", contact: "Office", email: "everestpkg@outlook.com", phone: "+91 231 246 7788", city: "Kolhapur", gstin: "27AAECP1122K1Z8", paymentTermsDays: 15, deliveryHistory: [], priceTrend: [] },
    { id: "s6", name: "Mahavir Metals", contact: "Rakesh Jain", email: "rakesh@mahavirmetals.in", phone: "+91 98230 90411", city: "Pune", gstin: "27AAMCM3344L1Z1", paymentTermsDays: 21, deliveryHistory: [1, 2, 0, 3, 1, 2], priceTrend: [100, 103, 107, 106, 109] },
  ];

  const salesInvoices = [
    { id: "si1", number: "INV-1042", partyId: "c1", amountPaise: P(124000), paidPaise: P(124000), issueDate: d(-38), dueDate: d(-23), expectedPaymentDate: d(-23), actualPaymentDate: d(-24), poRef: "PO-8790", notes: [] },
    { id: "si2", number: "INV-1048", partyId: "c5", amountPaise: P(86000), paidPaise: P(86000), issueDate: d(-33), dueDate: d(-18), expectedPaymentDate: d(-16), actualPaymentDate: d(-16), poRef: "PO-8801", notes: [] },
    { id: "si3", number: "INV-1051", partyId: "c2", amountPaise: P(142000), paidPaise: P(142000), issueDate: d(-30), dueDate: d(-15), expectedPaymentDate: d(-9), actualPaymentDate: d(-9), poRef: "PO-8812", notes: [] },
    { id: "si4", number: "INV-1055", partyId: "c6", amountPaise: P(58000), paidPaise: P(58000), issueDate: d(-27), dueDate: d(-12), expectedPaymentDate: d(-3), actualPaymentDate: d(-3), poRef: "PO-8820", notes: [] },
    { id: "si5", number: "INV-1058", partyId: "c1", amountPaise: P(96000), paidPaise: P(96000), issueDate: d(-20), dueDate: d(-5), expectedPaymentDate: d(-5), actualPaymentDate: d(-5), poRef: "PO-8833", notes: [] },
    { id: "si6", number: "INV-1061", partyId: "c5", amountPaise: P(150000), paidPaise: P(60000), issueDate: d(-16), dueDate: d(-1), expectedPaymentDate: d(4), actualPaymentDate: null, poRef: "PO-8841", notes: [{ date: d(-2), text: "Received ₹60,000 as agreed first instalment." }] },
    { id: "si7", number: "INV-1063", partyId: "c2", amountPaise: P(110000), paidPaise: P(40000), issueDate: d(-14), dueDate: d(1), expectedPaymentDate: d(7), actualPaymentDate: null, poRef: "PO-8849", notes: [] },
    { id: "si8", number: "INV-1044", partyId: "c3", amountPaise: P(190000), paidPaise: 0, issueDate: d(-40), dueDate: d(-18), expectedPaymentDate: d(6), actualPaymentDate: null, poRef: "PO-8774", notes: [{ date: d(-8), text: "S. Krishna promised payment 'after Diwali sales'. Follow up again." }] },
    { id: "si9", number: "INV-1057", partyId: "c2", amountPaise: P(85000), paidPaise: 0, issueDate: d(-26), dueDate: d(-6), expectedPaymentDate: d(3), actualPaymentDate: null, poRef: "PO-8828", notes: [] },
    { id: "si10", number: "INV-1060", partyId: "c6", amountPaise: P(42000), paidPaise: 0, issueDate: d(-22), dueDate: d(-3), expectedPaymentDate: d(5), actualPaymentDate: null, poRef: "PO-8835", notes: [] },
    { id: "si11", number: "INV-1066", partyId: "c1", amountPaise: P(120000), paidPaise: 0, issueDate: d(-6), dueDate: d(9), expectedPaymentDate: d(9), actualPaymentDate: null, poRef: "PO-8856", notes: [] },
    { id: "si12", number: "INV-1068", partyId: "c3", amountPaise: P(260000), paidPaise: 0, issueDate: d(-4), dueDate: d(11), expectedPaymentDate: d(24), actualPaymentDate: null, poRef: "PO-8860", notes: [{ date: d(-4), text: "Large festive-season order. Krishna Traders historically pays ~13 days late." }] },
    { id: "si13", number: "INV-1070", partyId: "c4", amountPaise: P(75000), paidPaise: 0, issueDate: d(-2), dueDate: d(13), expectedPaymentDate: d(13), actualPaymentDate: null, poRef: "PO-8867", notes: [] },
    { id: "si14", number: "INV-1072", partyId: "c5", amountPaise: P(95000), paidPaise: 0, issueDate: d(-1), dueDate: d(14), expectedPaymentDate: d(17), actualPaymentDate: null, poRef: "PO-8870", notes: [] },
    { id: "si15", number: "INV-1073", partyId: "c6", amountPaise: P(64000), paidPaise: 0, issueDate: d(2), dueDate: d(17), expectedPaymentDate: d(25), actualPaymentDate: null, isDraft: true, poRef: "PO-8874", notes: [] },
  ];

  const purchaseInvoices = [
    { id: "pi1", number: "BILL-501", partyId: "s1", amountPaise: P(182000), paidPaise: P(182000), issueDate: d(-35), dueDate: d(-5), plannedPaymentDate: d(-6), actualPaymentDate: d(-6), priority: "normal", poRef: "PO-3301", deliveryPromised: d(-12), deliveryActual: d(-12), notes: [] },
    { id: "pi2", number: "BILL-503", partyId: "s6", amountPaise: P(64000), paidPaise: P(64000), issueDate: d(-30), dueDate: d(-8), plannedPaymentDate: d(-8), actualPaymentDate: d(-8), priority: "normal", poRef: "PO-3310", deliveryPromised: d(-15), deliveryActual: d(-14), notes: [] },
    { id: "pi3", number: "BILL-506", partyId: "s2", amountPaise: P(96500), paidPaise: P(96500), issueDate: d(-25), dueDate: d(-3), plannedPaymentDate: d(-3), actualPaymentDate: d(-1), priority: "normal", poRef: "PO-3318", deliveryPromised: d(-9), deliveryActual: d(-6), notes: [] },
    { id: "pi4", number: "BILL-509", partyId: "s3", amountPaise: P(74000), paidPaise: P(74000), issueDate: d(-20), dueDate: d(-2), plannedPaymentDate: d(-2), actualPaymentDate: d(-2), priority: "normal", poRef: "PO-3325", deliveryPromised: d(-4), deliveryActual: d(3), notes: [{ date: d(3), text: "Delivery 7 days late — stalled the MCB restock." }] },
    { id: "pi5", number: "BILL-512", partyId: "s1", amountPaise: P(140000), paidPaise: P(50000), issueDate: d(-12), dueDate: d(6), plannedPaymentDate: d(6), actualPaymentDate: null, priority: "normal", poRef: "PO-3345", deliveryPromised: d(2), deliveryActual: null, notes: [] },
    { id: "pi6", number: "BILL-514", partyId: "s6", amountPaise: P(118000), paidPaise: 0, issueDate: d(-10), dueDate: d(4), plannedPaymentDate: d(4), actualPaymentDate: null, priority: "critical", poRef: "PO-3352", deliveryPromised: d(1), deliveryActual: null, notes: [{ date: d(-9), text: "Copper busbars needed for the Krishna Traders festive order." }] },
    { id: "pi7", number: "BILL-516", partyId: "s2", amountPaise: P(88000), paidPaise: 0, issueDate: d(-8), dueDate: d(7), plannedPaymentDate: d(7), actualPaymentDate: null, priority: "normal", poRef: "PO-3358", deliveryPromised: d(5), deliveryActual: null, notes: [] },
    { id: "pi8", number: "BILL-518", partyId: "s3", amountPaise: P(132000), paidPaise: 0, issueDate: d(-7), dueDate: d(10), plannedPaymentDate: d(10), actualPaymentDate: null, priority: "normal", poRef: "PO-3361", deliveryPromised: d(0), deliveryActual: null, notes: [] },
    { id: "pi9", number: "BILL-520", partyId: "s5", amountPaise: P(36000), paidPaise: 0, issueDate: d(-5), dueDate: d(12), plannedPaymentDate: d(12), actualPaymentDate: null, priority: "low", poRef: "PO-3364", deliveryPromised: d(9), deliveryActual: null, notes: [{ date: d(-5), text: "Optional packaging stock — can be postponed if cash is tight." }] },
    { id: "pi10", number: "BILL-521", partyId: "s4", amountPaise: P(54000), paidPaise: 0, issueDate: d(-4), dueDate: d(14), plannedPaymentDate: d(14), actualPaymentDate: null, priority: "low", poRef: "PO-3366", deliveryPromised: d(11), deliveryActual: null, notes: [{ date: d(-4), text: "Optional insulation sleeve restock." }] },
    { id: "pi11", number: "BILL-523", partyId: "s1", amountPaise: P(205000), paidPaise: 0, issueDate: d(-2), dueDate: d(18), plannedPaymentDate: d(18), actualPaymentDate: null, priority: "normal", poRef: "PO-3370", deliveryPromised: d(15), deliveryActual: null, notes: [] },
    { id: "pi12", number: "BILL-525", partyId: "s6", amountPaise: P(47000), paidPaise: 0, issueDate: d(-1), dueDate: d(20), plannedPaymentDate: d(20), actualPaymentDate: null, priority: "normal", poRef: "PO-3373", deliveryPromised: d(17), deliveryActual: null, notes: [] },
  ];

  const T = [];
  const tx = (offset, label, category, direction, rupees, extra = {}) => {
    T.push({ id: nextId("tx"), date: d(offset), label, category, direction, amountPaise: P(rupees), ...extra });
  };

  // ---- past actuals: receipts ----
  [[-44, 18000], [-41, 22500], [-37, 15000], [-34, 26000], [-30, 19500], [-27, 31000], [-24, 17500], [-21, 24000], [-18, 20500], [-15, 28000], [-12, 16500], [-9, 33000], [-6, 21000], [-3, 25500]].forEach(([o, amt]) => tx(o, "Counter / cash sales deposit", "cash-sales", "in", amt, { status: "actual" }));
  tx(-24, "Receipt — INV-1042 (Sharma Hardware)", "invoice-receipt", "in", 124000, { status: "actual", ref: { kind: "sales-invoice", id: "si1" } });
  tx(-16, "Receipt — INV-1048 (Om Distributors)", "invoice-receipt", "in", 86000, { status: "actual", ref: { kind: "sales-invoice", id: "si2" } });
  tx(-9, "Receipt — INV-1051 (Gupta Electricals)", "invoice-receipt", "in", 142000, { status: "actual", ref: { kind: "sales-invoice", id: "si3" } });
  tx(-3, "Receipt — INV-1055 (Balaji & Sons)", "invoice-receipt", "in", 58000, { status: "actual", ref: { kind: "sales-invoice", id: "si4" } });
  tx(-5, "Receipt — INV-1058 (Sharma Hardware)", "invoice-receipt", "in", 96000, { status: "actual", ref: { kind: "sales-invoice", id: "si5" } });
  tx(-2, "Partial receipt — INV-1061 (Om Distributors)", "invoice-receipt", "in", 60000, { status: "actual", ref: { kind: "sales-invoice", id: "si6" } });
  tx(-3, "Partial receipt — INV-1063 (Gupta Electricals)", "invoice-receipt", "in", 40000, { status: "actual", ref: { kind: "sales-invoice", id: "si7" } });

  // ---- past actuals: payments & expenses ----
  tx(-6, "Payment — BILL-501 (Polar Cables)", "supplier-payment", "out", 182000, { status: "actual", ref: { kind: "purchase-invoice", id: "pi1" } });
  tx(-8, "Payment — BILL-503 (Mahavir Metals)", "supplier-payment", "out", 64000, { status: "actual", ref: { kind: "purchase-invoice", id: "pi2" } });
  tx(-1, "Payment — BILL-506 (Surya Switchgear)", "supplier-payment", "out", 96500, { status: "actual", ref: { kind: "purchase-invoice", id: "pi3" } });
  tx(-2, "Payment — BILL-509 (Hind Rectifiers)", "supplier-payment", "out", 74000, { status: "actual", ref: { kind: "purchase-invoice", id: "pi4" } });
  tx(-1, "Partial payment — BILL-512 (Polar Cables)", "supplier-payment", "out", 50000, { status: "actual", ref: { kind: "purchase-invoice", id: "pi5" } });
  tx(-25, "Staff salaries", "salary", "out", 185000, { status: "actual" });
  tx(-22, "Warehouse rent", "rent", "out", 60000, { status: "actual" });
  tx(-15, "Working-capital loan EMI", "loan-emi", "out", 42000, { status: "actual" });
  tx(-28, "GST payment", "tax", "out", 45000, { status: "actual" });
  tx(-19, "Electricity & utilities", "utilities", "out", 12000, { status: "actual" });
  tx(-36, "Transport & freight", "operating", "out", 8500, { status: "actual" });
  tx(-14, "Godown maintenance", "operating", "out", 6200, { status: "actual" });
  tx(-7, "Staff travel & misc", "operating", "out", 9800, { status: "actual" });

  // ---- future committed outflows ----
  tx(5, "Staff salaries (due)", "salary", "out", 185000, { status: "confirmed" });
  tx(6, "Festive marketing campaign", "marketing", "out", 25000, { status: "confirmed", optional: true });
  tx(8, "Warehouse rent (due)", "rent", "out", 60000, { status: "confirmed" });
  tx(9, "Electricity & utilities (due)", "utilities", "out", 12000, { status: "confirmed" });
  tx(11, "Advance for optional festive stock", "inventory", "out", 80000, { status: "confirmed", optional: true });
  tx(12, "GST payment (due)", "tax", "out", 45000, { status: "confirmed" });
  tx(15, "Working-capital loan EMI (due)", "loan-emi", "out", 42000, { status: "confirmed" });
  tx(35, "Staff salaries (due)", "salary", "out", 185000, { status: "confirmed" });
  tx(38, "Warehouse rent (due)", "rent", "out", 60000, { status: "confirmed" });
  tx(45, "Working-capital loan EMI (due)", "loan-emi", "out", 42000, { status: "confirmed" });
  tx(65, "Staff salaries (due)", "salary", "out", 185000, { status: "confirmed" });
  tx(68, "Warehouse rent (due)", "rent", "out", 60000, { status: "confirmed" });
  tx(75, "Working-capital loan EMI (due)", "loan-emi", "out", 42000, { status: "confirmed" });

  // ---- expected cash sales ----
  [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84].forEach((o) => tx(o, "Expected counter / cash sales", "cash-sales", "in", 22000, { status: "expected" }));

  const reminders = [
    {
      id: "rem1",
      kind: "sales-invoice",
      invoiceId: "si8",
      channel: "email",
      template: "overdue",
      recipient: "krishna.traders@rediffmail.com",
      subject: "Payment overdue — INV-1044 (₹1,90,000)",
      scheduledDate: d(-6),
      scheduledTime: "10:30 AM",
      status: "delivered",
      history: [{ date: d(-6), event: "Email delivered via AWS SES gateway" }],
    },
    {
      id: "rem2",
      kind: "sales-invoice",
      invoiceId: "si9",
      channel: "call",
      template: "overdue",
      recipient: "+91 99604 51277 (Neha Gupta)",
      subject: "AI Follow-up Call — INV-1057 (₹85,000)",
      scheduledDate: d(-2),
      scheduledTime: "02:15 PM",
      status: "call-completed",
      history: [{ date: d(-2), event: "AI Voice agent completed call with Neha Gupta. Promised settlement by Friday." }],
    },
    {
      id: "rem3",
      kind: "sales-invoice",
      invoiceId: "si7",
      channel: "automation",
      template: "escalation",
      recipient: "Director Escalation Queue",
      subject: "Auto-Escalation: 15-day Overdue Cap Breach (INV-1039)",
      scheduledDate: d(0),
      scheduledTime: "09:00 AM",
      status: "auto-escalated",
      history: [{ date: d(0), event: "Automation rule fired: Overdue threshold exceeded, flagged for director review." }],
    },
    {
      id: "rem4",
      kind: "sales-invoice",
      invoiceId: "si6",
      channel: "email",
      template: "due-today",
      recipient: "farhan@newlightstores.com",
      subject: "Reminder: INV-1035 Due Today",
      scheduledDate: d(1),
      scheduledTime: "11:00 AM",
      status: "queued",
      history: [{ date: d(0), event: "Scheduled in email dispatch pipeline" }],
    },
    {
      id: "rem5",
      kind: "sales-invoice",
      invoiceId: "si5",
      channel: "call",
      template: "upcoming",
      recipient: "+91 98903 60148 (Om Prakash)",
      subject: "Scheduled AI Call — INV-1030 Courtesy Check",
      scheduledDate: d(2),
      scheduledTime: "04:00 PM",
      status: "scheduled",
      history: [{ date: d(0), event: "AI voice call queued for pre-due date confirmation" }],
    },
  ];

  return {
    currentCashPaise: P(420000),
    customers,
    suppliers,
    salesInvoices,
    purchaseInvoices,
    transactions: T,
    reminders,
    savedScenarios: [
      {
        id: "sc-seed",
        name: "Krishna's overdue ₹1.9L slips 10 more days",
        createdAt: d(-1),
        adjustments: [{ type: "delayInvoice", invoiceType: "sales", invoiceId: "si8", days: 10 }],
        outcome: { minBalancePaise: P(-250000), breachDate: addDaysISO(anchor, 15), shortageResolved: false },
        status: "rejected",
        note: "Rejected — pushes cash to −₹2.5L before salary week. Chase INV-1044 or request an advance instead.",
      },
    ],
  };
}

function buildMeera(anchor) {
  const d = (n) => addDaysISO(anchor, n);
  uid = 1000;

  const customers = [
    { id: "mc1", name: "Anand Sarees", contact: "Anand Verma", email: "anand@anandsarees.in", phone: "+91 98220 10203", city: "Mumbai", gstin: "27AAANS1234A1Z1", termsDays: 20, paymentHistory: [0, 1, -1, 0, 2, 0, 1].map((delay, i) => ({ amountPaise: P(150000 + i * 10000), delayDays: delay })) },
    { id: "mc2", name: "Royal Fabrics", contact: "Imran Qureshi", email: "royalfabrics@gmail.com", phone: "+91 90909 40404", city: "Surat", gstin: "24AARF5678B1Z2", termsDays: 30, paymentHistory: [4, 7, 5, 9, 6].map((delay, i) => ({ amountPaise: P(180000 + i * 8000), delayDays: delay })) },
    { id: "mc3", name: "Kirti Textile Mart", contact: "Kirti Shah", email: "kirti@ktmart.in", phone: "+91 98765 22110", city: "Ahmedabad", gstin: "24AAKTM9012C1Z3", termsDays: 15, paymentHistory: [0, 0, 1, 0, -2, 0].map((delay, i) => ({ amountPaise: P(120000 + i * 7000), delayDays: delay })) },
    { id: "mc4", name: "Deepak Cloth Store", contact: "Deepak Agrawal", email: "deepakcloth@yahoo.com", phone: "+91 94040 55667", city: "Nagpur", gstin: "27AADCS3456D1Z4", termsDays: 20, paymentHistory: [8, 12, 10].map((delay, i) => ({ amountPaise: P(90000 + i * 5000), delayDays: delay })) },
    { id: "mc5", name: "Sunrise Boutiques", contact: "Ritika Menon", email: "ritika@sunriseboutiques.in", phone: "+91 98450 90812", city: "Bengaluru", gstin: "29AASB7890E1Z5", termsDays: 15, paymentHistory: [] },
  ];

  const suppliers = [
    { id: "ms1", name: "Shankar Yarns", contact: "Prakash Shetty", email: "orders@shankaryarns.com", phone: "+91 230 242 1100", city: "Ichalkaranji", gstin: "27AASHY2345F1Z6", paymentTermsDays: 21, deliveryHistory: [0, 1, 1, 0, 2], priceTrend: [100, 102, 104, 105, 107] },
    { id: "ms2", name: "Vidarbha Dyes", contact: "Sales", email: "vidarbhadyes@outlook.com", phone: "+91 712 228 4455", city: "Nagpur", gstin: "27AAVDY6789G1Z7", paymentTermsDays: 15, deliveryHistory: [3, 5, 2, 6], priceTrend: [100, 101, 100, 102] },
    { id: "ms3", name: "National Chemicals", contact: "Accounts", email: "accounts@natchem.in", phone: "+91 22 2411 8899", city: "Mumbai", gstin: "27AANAC0123H1Z8", paymentTermsDays: 30, deliveryHistory: [1, 0, 2, 1], priceTrend: [100, 103, 105, 104] },
    { id: "ms4", name: "Shree Packaging Co", contact: "Office", email: "shreepkg@gmail.com", phone: "+91 231 240 6677", city: "Kolhapur", gstin: "27AASPC4567J1Z9", paymentTermsDays: 15, deliveryHistory: [], priceTrend: [] },
    { id: "ms5", name: "Deccan Looms Spares", contact: "Sachin More", email: "deccanloomspares@rediffmail.com", phone: "+91 98600 33221", city: "Pune", gstin: "27AADLS8901K1Z0", paymentTermsDays: 21, deliveryHistory: [2, 3, 1], priceTrend: [100, 100, 101] },
  ];

  const salesInvoices = [
    { id: "msi1", number: "MT-301", partyId: "mc1", amountPaise: P(240000), paidPaise: P(240000), issueDate: d(-34), dueDate: d(-14), expectedPaymentDate: d(-14), actualPaymentDate: d(-14), poRef: "PO-1101", notes: [] },
    { id: "msi2", number: "MT-304", partyId: "mc3", amountPaise: P(180000), paidPaise: P(180000), issueDate: d(-28), dueDate: d(-13), expectedPaymentDate: d(-13), actualPaymentDate: d(-12), poRef: "PO-1108", notes: [] },
    { id: "msi3", number: "MT-306", partyId: "mc2", amountPaise: P(320000), paidPaise: P(320000), issueDate: d(-40), dueDate: d(-10), expectedPaymentDate: d(-4), actualPaymentDate: d(-4), poRef: "PO-1095", notes: [] },
    { id: "msi4", number: "MT-308", partyId: "mc4", amountPaise: P(140000), paidPaise: 0, issueDate: d(-25), dueDate: d(-5), expectedPaymentDate: d(5), actualPaymentDate: null, poRef: "PO-1112", notes: [] },
    { id: "msi5", number: "MT-310", partyId: "mc2", amountPaise: P(280000), paidPaise: P(100000), issueDate: d(-18), dueDate: d(2), expectedPaymentDate: d(9), actualPaymentDate: null, poRef: "PO-1120", notes: [] },
    { id: "msi6", number: "MT-312", partyId: "mc1", amountPaise: P(260000), paidPaise: 0, issueDate: d(-10), dueDate: d(10), expectedPaymentDate: d(11), actualPaymentDate: null, poRef: "PO-1126", notes: [] },
    { id: "msi7", number: "MT-314", partyId: "mc3", amountPaise: P(190000), paidPaise: 0, issueDate: d(-6), dueDate: d(9), expectedPaymentDate: d(9), actualPaymentDate: null, poRef: "PO-1130", notes: [] },
    { id: "msi8", number: "MT-316", partyId: "mc5", amountPaise: P(120000), paidPaise: 0, issueDate: d(-3), dueDate: d(12), expectedPaymentDate: d(12), actualPaymentDate: null, poRef: "PO-1135", notes: [] },
    { id: "msi9", number: "MT-318", partyId: "mc4", amountPaise: P(95000), paidPaise: 0, issueDate: d(-2), dueDate: d(18), expectedPaymentDate: d(28), actualPaymentDate: null, poRef: "PO-1138", notes: [] },
    { id: "msi10", number: "MT-320", partyId: "mc2", amountPaise: P(350000), paidPaise: 0, issueDate: d(-1), dueDate: d(29), expectedPaymentDate: d(35), actualPaymentDate: null, poRef: "PO-1141", notes: [] },
  ];

  const purchaseInvoices = [
    { id: "mpi1", number: "YRN-801", partyId: "ms1", amountPaise: P(210000), paidPaise: P(210000), issueDate: d(-32), dueDate: d(-11), plannedPaymentDate: d(-11), actualPaymentDate: d(-11), priority: "normal", poRef: "PO-2201", deliveryPromised: d(-18), deliveryActual: d(-17), notes: [] },
    { id: "mpi2", number: "DYE-802", partyId: "ms2", amountPaise: P(86000), paidPaise: P(86000), issueDate: d(-26), dueDate: d(-11), plannedPaymentDate: d(-11), actualPaymentDate: d(-11), priority: "normal", poRef: "PO-2205", deliveryPromised: d(-15), deliveryActual: d(-10), notes: [] },
    { id: "mpi3", number: "CHM-803", partyId: "ms3", amountPaise: P(120000), paidPaise: 0, issueDate: d(-15), dueDate: d(8), plannedPaymentDate: d(8), actualPaymentDate: null, priority: "normal", poRef: "PO-2210", deliveryPromised: d(2), deliveryActual: null, notes: [] },
    { id: "mpi4", number: "YRN-804", partyId: "ms1", amountPaise: P(240000), paidPaise: 0, issueDate: d(-9), dueDate: d(12), plannedPaymentDate: d(12), actualPaymentDate: null, priority: "critical", poRef: "PO-2214", deliveryPromised: d(6), deliveryActual: null, notes: [] },
    { id: "mpi5", number: "PKG-805", partyId: "ms4", amountPaise: P(28000), paidPaise: 0, issueDate: d(-6), dueDate: d(9), plannedPaymentDate: d(9), actualPaymentDate: null, priority: "low", poRef: "PO-2216", deliveryPromised: d(5), deliveryActual: null, notes: [] },
    { id: "mpi6", number: "SPR-806", partyId: "ms5", amountPaise: P(42000), paidPaise: 0, issueDate: d(-5), dueDate: d(16), plannedPaymentDate: d(16), actualPaymentDate: null, priority: "low", poRef: "PO-2218", deliveryPromised: d(12), deliveryActual: null, notes: [] },
    { id: "mpi7", number: "DYE-807", partyId: "ms2", amountPaise: P(94000), paidPaise: 0, issueDate: d(-4), dueDate: d(11), plannedPaymentDate: d(11), actualPaymentDate: null, priority: "normal", poRef: "PO-2220", deliveryPromised: d(8), deliveryActual: null, notes: [] },
    { id: "mpi8", number: "YRN-808", partyId: "ms1", amountPaise: P(180000), paidPaise: 0, issueDate: d(-2), dueDate: d(19), plannedPaymentDate: d(19), actualPaymentDate: null, priority: "normal", poRef: "PO-2224", deliveryPromised: d(15), deliveryActual: null, notes: [] },
    { id: "mpi9", number: "CHM-809", partyId: "ms3", amountPaise: P(66000), paidPaise: 0, issueDate: d(-1), dueDate: d(25), plannedPaymentDate: d(25), actualPaymentDate: null, priority: "normal", poRef: "PO-2226", deliveryPromised: d(20), deliveryActual: null, notes: [] },
    { id: "mpi10", number: "PKG-810", partyId: "ms4", amountPaise: P(24000), paidPaise: P(24000), issueDate: d(-22), dueDate: d(-7), plannedPaymentDate: d(-7), actualPaymentDate: d(-7), priority: "low", poRef: "PO-2198", deliveryPromised: d(-12), deliveryActual: d(-12), notes: [] },
  ];

  const T = [];
  const tx = (offset, label, category, direction, rupees, extra = {}) => {
    T.push({ id: nextId("mtx"), date: d(offset), label, category, direction, amountPaise: P(rupees), ...extra });
  };

  [[-42, 55000], [-35, 48000], [-28, 62000], [-21, 51000], [-14, 58000], [-7, 64000]].forEach(([o, amt]) => tx(o, "Retail fabric sales deposit", "cash-sales", "in", amt, { status: "actual" }));
  tx(-14, "Receipt — MT-301 (Anand Sarees)", "invoice-receipt", "in", 240000, { status: "actual" });
  tx(-12, "Receipt — MT-304 (Kirti Textile Mart)", "invoice-receipt", "in", 180000, { status: "actual" });
  tx(-4, "Receipt — MT-306 (Royal Fabrics)", "invoice-receipt", "in", 320000, { status: "actual" });
  tx(-11, "Payment — YRN-801 (Shankar Yarns)", "supplier-payment", "out", 210000, { status: "actual" });
  tx(-11, "Payment — DYE-802 (Vidarbha Dyes)", "supplier-payment", "out", 86000, { status: "actual" });
  tx(-7, "Payment — PKG-810 (Shree Packaging)", "supplier-payment", "out", 24000, { status: "actual" });
  tx(-20, "Staff salaries", "salary", "out", 140000, { status: "actual" });
  tx(-18, "Factory rent", "rent", "out", 45000, { status: "actual" });
  tx(-12, "Power & utilities", "utilities", "out", 28000, { status: "actual" });
  tx(-8, "Loom maintenance", "operating", "out", 15000, { status: "actual" });

  tx(10, "Staff salaries (due)", "salary", "out", 140000, { status: "confirmed" });
  tx(12, "Factory rent (due)", "rent", "out", 45000, { status: "confirmed" });
  tx(16, "Power & utilities (due)", "utilities", "out", 28000, { status: "confirmed" });
  tx(40, "Staff salaries (due)", "salary", "out", 140000, { status: "confirmed" });
  tx(42, "Factory rent (due)", "rent", "out", 45000, { status: "confirmed" });
  tx(70, "Staff salaries (due)", "salary", "out", 140000, { status: "confirmed" });
  tx(72, "Factory rent (due)", "rent", "out", 45000, { status: "confirmed" });
  [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84].forEach((o) => tx(o, "Expected retail fabric sales", "cash-sales", "in", 57000, { status: "expected" }));

  return {
    currentCashPaise: P(950000),
    customers,
    suppliers,
    salesInvoices,
    purchaseInvoices,
    transactions: T,
    reminders: [],
    savedScenarios: [],
  };
}

export function generateDataset(businessId, anchor = todayISO()) {
  return businessId === "meera" ? buildMeera(anchor) : buildNavkar(anchor);
}

export const BUSINESS_SETTINGS = {
  navkar: { ...DEFAULT_SETTINGS, minReservePaise: P(200000), forecastHorizonDays: 30 },
  meera: { ...DEFAULT_SETTINGS, minReservePaise: P(300000), forecastHorizonDays: 30 },
};
