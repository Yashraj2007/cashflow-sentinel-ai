// ============================================================
// CSV helpers: tolerant parser, serializer, download, mapping.
// ============================================================

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const src = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      if (row.some((c) => String(c).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => String(c).trim() !== "")) rows.push(row);

  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((h) => String(h).trim());
  const records = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : "";
    });
    return obj;
  });
  return { headers, records };
}

export function toCSV(records, columns) {
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => escape(c.label || c.key)).join(",")];
  records.forEach((rec) => {
    lines.push(columns.map((c) => escape(c.value ? c.value(rec) : rec[c.key])).join(","));
  });
  return lines.join("\n");
}

export function downloadCSV(filename, records, columns) {
  const csv = toCSV(records, columns);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---- column mapping for the import wizard ----

export const INVOICE_FIELD_DEFS = [
  { key: "number", label: "Invoice number", required: true },
  { key: "party", label: "Customer / Supplier name", required: true },
  { key: "amount", label: "Amount (₹)", required: true },
  { key: "issueDate", label: "Invoice date", required: true },
  { key: "dueDate", label: "Due date", required: true },
  { key: "expectedPaymentDate", label: "Expected / planned payment date", required: false },
  { key: "actualPaymentDate", label: "Actual payment date", required: false },
  { key: "paidAmount", label: "Amount already paid (₹)", required: false },
  { key: "status", label: "Payment status", required: false },
  { key: "reference", label: "Product / PO reference", required: false },
];

export function guessMapping(headers) {
  const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z]/g, "");
  const patterns = {
    number: ["invoiceno", "invoicenumber", "invno", "number", "docno", "billno"],
    party: ["customer", "customername", "supplier", "suppliername", "party", "partyname", "client", "vendor", "name"],
    amount: ["amount", "invoiceamount", "total", "totalamount", "value", "grandtotal"],
    issueDate: ["invoicedate", "issuedate", "date", "billdate", "createdon"],
    dueDate: ["duedate", "dueon", "paymentdue", "paymentduedate"],
    expectedPaymentDate: ["expectedpaymentdate", "expecteddate", "plannedpaymentdate", "planneddate", "promiseddate"],
    actualPaymentDate: ["actualpaymentdate", "paidon", "paymentdate", "paiddate"],
    paidAmount: ["paidamount", "amountpaid", "received", "paid"],
    status: ["status", "paymentstatus", "state"],
    reference: ["reference", "po", "ponumber", "orderref", "product", "orderreference"],
  };
  const mapping = {};
  headers.forEach((header) => {
    const n = norm(header);
    Object.entries(patterns).forEach(([field, keys]) => {
      if (!mapping[field] && keys.includes(n)) mapping[field] = header;
    });
  });
  return mapping;
}

export function sampleCSV(type) {
  if (type === "sales") {
    return [
      "invoice_number,customer,amount,invoice_date,due_date,expected_payment_date,status,reference",
      "INV-2101,Sharma Hardware,145000,2025-11-02,2025-12-02,2025-12-03,unpaid,PO-8812",
      "INV-2102,Gupta Electricals,86500,2025-11-08,2025-12-08,2025-12-14,unpaid,PO-8830",
      "INV-2103,Krishna Traders,210000,2025-11-15,2025-12-15,2025-12-29,unpaid,PO-8841",
    ].join("\n");
  }
  return [
    "invoice_number,supplier,amount,invoice_date,due_date,planned_payment_date,status,reference",
    "BILL-701,Polar Cables Ltd,182000,2025-11-05,2025-12-05,2025-12-04,unpaid,PO-3301",
    "BILL-702,Surya Switchgear,96000,2025-11-12,2025-12-12,2025-12-12,unpaid,PO-3315",
    "BILL-703,Hind Rectifiers,74500,2025-11-18,2025-12-18,2025-12-16,unpaid,PO-3322",
  ].join("\n");
}
