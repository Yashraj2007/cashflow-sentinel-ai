// ============================================================
// Supplier Management Service
// Handles supplier CRUD validations, CSV import/export,
// duplicate detection, and delivery performance integrity.
// ============================================================

export const SUPPLIER_CATEGORIES = [
  "Raw Material",
  "Electrical & Switchgear",
  "Cables & Wires",
  "Metals & Copper",
  "Packaging",
  "Logistics & Freight",
  "Maintenance & Utilities",
  "General Vendor",
];

export const SUPPLIER_FIELD_DEFS = [
  { key: "name", label: "Supplier / Business Name", required: true },
  { key: "contact", label: "Primary Contact Person", required: false },
  { key: "email", label: "Email Address", required: false },
  { key: "phone", label: "Phone Number", required: false },
  { key: "city", label: "City / Location", required: false },
  { key: "gstin", label: "GSTIN (optional)", required: false },
  { key: "paymentTermsDays", label: "Payment Terms (days)", required: false },
  { key: "category", label: "Supplier Category", required: false },
  { key: "notes", label: "Notes", required: false },
];

export function guessSupplierMapping(headers = []) {
  const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z]/g, "");
  const patterns = {
    name: ["suppliername", "supplier", "vendor", "vendorname", "company", "party", "partyname"],
    contact: ["contact", "contactperson", "contactname", "person", "representative"],
    email: ["email", "emailaddress", "mail"],
    phone: ["phone", "phonenumber", "mobile", "contactno", "tel"],
    city: ["city", "location", "address", "state"],
    gstin: ["gstin", "gst", "gstno", "taxid"],
    paymentTermsDays: ["terms", "paymentterms", "creditperiod", "creditdays", "termsdays"],
    category: ["category", "suppliertype", "vendortype", "materialtype", "goods"],
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

export function getSampleSupplierCSV() {
  return [
    "Supplier Name,Contact Person,Email,Phone,City,GSTIN,Payment Terms Days,Category,Notes",
    "Delta Transformers Ltd,Vikas Joshi,vikas@deltatransformers.in,+91 22 2890 1234,Mumbai,27AABCD1122E1Z5,30,Electrical & Switchgear,Primary transformer partner",
    "Zenith Polymers,Pooja Shah,orders@zenithpolymers.com,+91 98250 88990,Ahmedabad,24AABCZ4455P1Z8,21,Raw Material,Insulation sleeves supplier",
    "Metro Freight Carriers,Harish Nair,ops@metrofreight.co.in,+91 20 2744 5566,Pune,27AABCM6677K1Z1,15,Logistics & Freight,Intercity transport vendor",
  ].join("\n");
}

export function downloadSupplierTemplate() {
  const content = getSampleSupplierCSV();
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cashflow_sentinel_suppliers_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates parsed supplier CSV records and flags duplicates.
 */
export function validateSupplierRecords(records = [], mapping = {}, existingSuppliers = []) {
  const valid = [];
  const invalid = [];
  let duplicateCount = 0;

  const get = (rec, field) => (mapping[field] ? rec[mapping[field]] : "");

  const existingNames = new Set(
    existingSuppliers.map((s) => String(s.name || "").trim().toLowerCase())
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
    const termsRaw = String(get(rec, "paymentTermsDays") || "").replace(/[^\d]/g, "");
    const paymentTermsDays = Number(termsRaw) > 0 ? Number(termsRaw) : 30;
    const category = String(get(rec, "category") || "").trim() || "General Vendor";
    const notes = String(get(rec, "notes") || "").trim();

    const errors = [];
    if (!name) errors.push("Supplier name is required");

    const nameKey = name.toLowerCase();
    const isDuplicate = existingNames.has(nameKey) || seenInFile.has(nameKey);
    seenInFile.add(nameKey);

    if (isDuplicate) duplicateCount += 1;

    if (errors.length) {
      invalid.push({ rowNum, errors, name });
    } else {
      valid.push({
        id: `s-imp-${Date.now()}-${idx}`,
        name,
        contact: contact || name,
        email: email || "",
        phone: phone || "",
        city: city || "India",
        gstin: gstin || "",
        paymentTermsDays,
        category,
        deliveryHistory: [], // Starts with clean delivery history; scores build as deliveries arrive
        notes: notes ? [{ date: new Date().toISOString().slice(0, 10), text: notes }] : [],
        isDuplicate,
      });
    }
  });

  return { valid, invalid, duplicateCount };
}
