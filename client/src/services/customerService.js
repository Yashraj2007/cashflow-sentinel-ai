// ============================================================
// Customer Management Service
// Handles customer CRUD validations, CSV import/export,
// duplicate detection, and payment history integrity.
// ============================================================

import { downloadCSV } from "../utils/csv.js";

export const CUSTOMER_FIELD_DEFS = [
  { key: "name", label: "Business / Customer Name", required: true },
  { key: "contact", label: "Contact Person Name", required: false },
  { key: "email", label: "Email Address", required: false },
  { key: "phone", label: "Phone Number", required: false },
  { key: "city", label: "City / Location", required: false },
  { key: "gstin", label: "GSTIN (optional)", required: false },
  { key: "termsDays", label: "Default Payment Terms (days)", required: false },
  { key: "notes", label: "Notes", required: false },
];

export function guessCustomerMapping(headers = []) {
  const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z]/g, "");
  const patterns = {
    name: ["name", "customername", "businessname", "company", "party", "partyname", "client"],
    contact: ["contact", "contactperson", "contactname", "person", "owner"],
    email: ["email", "emailaddress", "mail"],
    phone: ["phone", "phonenumber", "mobile", "contactno", "tel"],
    city: ["city", "location", "address", "state"],
    gstin: ["gstin", "gst", "gstno", "taxid"],
    termsDays: ["terms", "termsdays", "paymentterms", "creditperiod", "creditdays"],
    notes: ["notes", "remarks", "comments"],
  };

  const mapping = {};
  headers.forEach((header) => {
    const n = norm(header);
    Object.entries(patterns).forEach(([field, keys]) => {
      if (!mapping[field] && (keys.includes(n) || keys.some((k) => n.includes(k)))) {
        mapping[field] = header;
      }
    });
  });
  return mapping;
}

export function getSampleCustomerCSV() {
  return [
    "Customer Name,Contact Person,Email,Phone,City,GSTIN,Payment Terms Days,Notes",
    "Apex Switchboards,Rajesh Verma,rajesh@apexswitch.in,+91 98200 11223,Mumbai,27AABCA1234D1Z2,15,Key distributor for western region",
    "Pinnacle Electronics,Deepa Nair,deepa@pinnacle.co.in,+91 98450 33445,Bangalore,29AACCP5678M1Z4,30,Prompt payer on net-30 terms",
    "Vanguard Power Systems,Sanjay Roy,sanjay@vanguardpower.in,+91 98310 55667,Kolkata,19AAECV9012K1Z9,21,Monthly bulk cable orders",
  ].join("\n");
}

export function downloadCustomerTemplate() {
  const content = getSampleCustomerCSV();
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cashflow_sentinel_customers_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates parsed customer CSV records and checks for duplicates against existing customers.
 */
export function validateCustomerRecords(records = [], mapping = {}, existingCustomers = []) {
  const valid = [];
  const invalid = [];
  let duplicateCount = 0;

  const get = (rec, field) => (mapping[field] ? rec[mapping[field]] : "");

  const existingNames = new Set(
    existingCustomers.map((c) => String(c.name || "").trim().toLowerCase())
  );
  const seenInFile = new Set();

  records.forEach((rec, idx) => {
    const rowNum = idx + 2;
    const name = String(get(rec, "name") || "").trim();
    const contact = String(get(rec, "contact") || "").trim();
    const email = String(get(rec, "email") || "").trim();
    const phone = String(get(rec, "phone") || "").trim();
    const city = String(get(rec, "city") || "").trim();
    const gstin = String(get(rec, "gstin") || "").trim();
    const termsRaw = String(get(rec, "termsDays") || "").replace(/[^\d]/g, "");
    const termsDays = Number(termsRaw) > 0 ? Number(termsRaw) : 15;
    const notes = String(get(rec, "notes") || "").trim();

    const errors = [];
    if (!name) errors.push("Customer name is required");

    const nameKey = name.toLowerCase();
    const isDuplicate = existingNames.has(nameKey) || seenInFile.has(nameKey);
    seenInFile.add(nameKey);

    if (isDuplicate) duplicateCount += 1;

    if (errors.length) {
      invalid.push({ rowNum, errors, name });
    } else {
      valid.push({
        id: `c-imp-${Date.now()}-${idx}`,
        name,
        contact: contact || name,
        email: email || "",
        phone: phone || "",
        city: city || "India",
        gstin: gstin || "",
        termsDays,
        paymentHistory: [], // New imported customer starts with clean verified history
        notes: notes ? [{ date: new Date().toISOString().slice(0, 10), text: notes }] : [],
        isDuplicate,
      });
    }
  });

  return { valid, invalid, duplicateCount };
}
