// ============================================================
// Bank Statement Import Service
// Handles Indian SMB CSV bank statement parsing, column guessing,
// auto-categorization, duplicate detection, and validation.
// ============================================================

import { parseAnyDate, rupeesToPaise, paiseToRupees } from "../utils/finance.js";
import { downloadCSV } from "../utils/csv.js";

export const BANK_FIELD_DEFS = [
  { key: "date", label: "Transaction Date", required: true },
  { key: "description", label: "Description / Narration", required: true },
  { key: "debit", label: "Withdrawal / Debit (₹)", required: false },
  { key: "credit", label: "Deposit / Credit (₹)", required: false },
  { key: "balance", label: "Closing / Running Balance (₹)", required: false },
  { key: "category", label: "Category (optional)", required: false },
  { key: "reference", label: "Chq / Ref No. (optional)", required: false },
];

export function guessBankMapping(headers = []) {
  const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z]/g, "");
  const patterns = {
    date: ["txndate", "transactiondate", "date", "valuedate", "postingdate", "entrydate"],
    description: ["narration", "description", "particulars", "remarks", "details", "memo", "transdetails"],
    debit: ["debit", "withdrawal", "withdrawalamount", "dr", "debitamount", "paidout", "amountdr"],
    credit: ["credit", "deposit", "depositamount", "cr", "creditamount", "paidin", "amountcr"],
    balance: ["balance", "closingbalance", "runningbalance", "netbalance", "availablebalance"],
    category: ["category", "type", "tag"],
    reference: ["refno", "referenceno", "reference", "chqno", "chequeno", "utr", "txnref"],
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

/** Automatically guesses category from narration keywords */
export function autoCategorizeNarration(description = "", direction = "out") {
  const text = String(description || "").toLowerCase();
  if (direction === "in") {
    if (/counter|cash sale|pos|daily sales/.test(text)) return "cash-sales";
    if (/refund|interest|reversal/.test(text)) return "operating";
    return "invoice-receipt";
  }
  if (/salary|salaries|wages|payroll|staff/.test(text)) return "salary";
  if (/rent|lease|warehouse|godown/.test(text)) return "rent";
  if (/emi|loan|repayment|interest/.test(text)) return "loan-emi";
  if (/gst|tax|challan|tds|income tax/.test(text)) return "tax";
  if (/electric|power|mseb|bescom|water|utility|internet|telecom|airtel|jio/.test(text)) return "utilities";
  if (/material|hardware|cables|switchgear|steel|copper|stock|raw material/.test(text)) return "inventory";
  if (/marketing|google ads|meta|adwords|campaign|promotions/.test(text)) return "marketing";
  if (/courier|freight|transport|logistics|travel|fuel/.test(text)) return "operating";
  return "operating";
}

/** Sample statement formatted for Indian business accounts */
export function getSampleBankStatementCSV() {
  return [
    "Txn Date,Particulars / Narration,Debit,Credit,Balance,Reference",
    "2025-10-15,NEFT CR - Sharma Hardware Inv 1042,,124000,420000,NEFT88291",
    "2025-10-18,RTGS DR - Polar Cables Bill 501,182000,,238000,RTGS39102",
    "2025-10-20,NEFT CR - Om Distributors Inv 1048,,86000,324000,NEFT99120",
    "2025-10-24,IMPS DR - Godown Warehouse Rent,60000,,264000,IMPS40183",
    "2025-10-28,Staff Salaries Batch Transfer,185000,,79000,SAL-OCT25",
    "2025-11-01,Counter Cash Sales Deposit,,35000,114000,CSH-DEP-01",
    "2025-11-03,Working Capital Loan EMI Debit,42000,,72000,EMI-LOAN-99",
  ].join("\n");
}

/** Triggers download of bank statement CSV template */
export function downloadBankTemplate() {
  const content = getSampleBankStatementCSV();
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cashflow_sentinel_bank_statement_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates parsed bank statement records against mapping & existing transactions.
 * Returns valid rows, rejected/invalid rows, duplicate warnings, and the detected closing balance.
 */
export function validateBankRecords(records = [], mapping = {}, existingTransactions = []) {
  const valid = [];
  const invalid = [];
  let duplicateCount = 0;
  let closingBalancePaise = null;

  const get = (rec, field) => (mapping[field] ? rec[mapping[field]] : "");

  // Create a lookup set for existing transactions
  const existingSet = new Set(
    existingTransactions.map((t) => `${t.date}_${t.direction}_${t.amountPaise}`)
  );

  records.forEach((rec, idx) => {
    const rowNum = idx + 2; // 1-indexed accounting for header
    const dateRaw = get(rec, "date");
    const date = parseAnyDate(dateRaw);
    const description = String(get(rec, "description") || "").trim();

    const debitRaw = String(get(rec, "debit") || "").replace(/[₹,\s]/g, "");
    const creditRaw = String(get(rec, "credit") || "").replace(/[₹,\s]/g, "");
    const balanceRaw = String(get(rec, "balance") || "").replace(/[₹,\s]/g, "");
    const ref = String(get(rec, "reference") || "").trim();

    const debit = Number(debitRaw);
    const credit = Number(creditRaw);
    const balance = Number(balanceRaw);

    const errors = [];
    if (!date) errors.push("Invalid date (expected YYYY-MM-DD or DD/MM/YYYY)");
    if (!description) errors.push("Narration / Description is required");

    let direction = null;
    let amount = 0;

    const hasDebit = Number.isFinite(debit) && debit > 0;
    const hasCredit = Number.isFinite(credit) && credit > 0;

    if (hasDebit && hasCredit) {
      errors.push("Row contains both debit and credit amounts");
    } else if (hasDebit) {
      direction = "out";
      amount = debit;
    } else if (hasCredit) {
      direction = "in";
      amount = credit;
    } else {
      errors.push("Missing transaction amount (neither debit nor credit specified)");
    }

    if (Number.isFinite(balance) && balance >= 0) {
      // The last valid row with balance represents the statement closing balance
      closingBalancePaise = rupeesToPaise(balance);
    }

    if (errors.length > 0) {
      invalid.push({ rowNum, rec, errors, description });
    } else {
      const amountPaise = rupeesToPaise(amount);
      const key = `${date}_${direction}_${amountPaise}`;
      const isDuplicate = existingSet.has(key);
      if (isDuplicate) duplicateCount += 1;

      const userCategory = String(get(rec, "category") || "").trim();
      const category = userCategory || autoCategorizeNarration(description, direction);

      valid.push({
        id: `tx-bank-${Date.now()}-${idx}`,
        date,
        label: description,
        category,
        direction,
        amountPaise,
        status: "actual",
        ref: ref ? { kind: "bank-import", id: ref } : { kind: "bank-import" },
        isDuplicate,
        rawBalancePaise: Number.isFinite(balance) ? rupeesToPaise(balance) : null,
      });
    }
  });

  return {
    valid,
    invalid,
    duplicateCount,
    closingBalancePaise,
  };
}
