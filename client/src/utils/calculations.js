// ============================================================
// Pure calculation utilities — independent of React so they
// can be unit tested. Money is always integer paise.
// ============================================================

import { addDaysISO, daysBetween, mean, median, todayISO, clamp } from "./finance.js";

// ---------------- invoice status derivation ----------------

export function salesInvoiceStatus(invoice, today = todayISO()) {
  if (invoice.isDraft) return "draft";
  if (invoice.paidPaise >= invoice.amountPaise) return "paid";
  if (invoice.dueDate < today) return invoice.paidPaise > 0 ? "overdue" : "overdue";
  if (invoice.paidPaise > 0) return "partial";
  return "upcoming";
}

export function purchaseInvoiceStatus(invoice, today = todayISO()) {
  if (invoice.paidPaise >= invoice.amountPaise) return "paid";
  if (invoice.dueDate < today) return "overdue";
  if (invoice.paidPaise > 0) return "partial";
  return "upcoming";
}

export function outstandingPaise(invoice) {
  if (!invoice) return 0;
  const amount = Number(invoice.amountPaise != null ? invoice.amountPaise : (Number(invoice.amount || 0) * 100));
  const paid = Number(invoice.paidPaise || 0);
  const validAmount = Number.isFinite(amount) ? amount : 0;
  const validPaid = Number.isFinite(paid) ? paid : 0;
  return Math.max(0, validAmount - validPaid);
}

// ---------------- customer payment intelligence ----------------

export function customerPaymentStats(customer) {
  if (!customer) {
    return {
      n: 0,
      avgDelay: null,
      medianDelay: null,
      onTimeRate: null,
      onTimeCount: 0,
      delayedCount: 0,
      label: "Not enough payment history",
      confidence: "none",
      source: "none",
      sourceLabel: "No payment history recorded",
    };
  }

  const verifiedHistory = customer.paymentHistory || [];
  const ownerHistory = customer.ownerHistory;

  if (verifiedHistory.length > 0) {
    const delays = verifiedHistory.map((h) => h.delayDays);
    const avgDelay = mean(delays);
    const onTime = delays.filter((d) => d <= 1).length;
    const onTimeRate = (onTime / delays.length) * 100;
    const n = verifiedHistory.length;
    let confidence = "none";
    let label = "Not enough payment history";
    if (n >= 6) { confidence = "high"; label = "Sufficient history"; }
    else if (n >= 3) { confidence = "medium"; label = "Limited history"; }
    return {
      n,
      avgDelay,
      medianDelay: median(delays),
      onTimeRate,
      onTimeCount: onTime,
      delayedCount: n - onTime,
      label,
      confidence,
      source: "verified",
      sourceLabel: "Verified from invoice records",
    };
  }

  // Fallback to owner-provided baseline counts if present
  if (ownerHistory && (ownerHistory.totalCount > 0 || (ownerHistory.onTimeCount + ownerHistory.delayedCount) > 0)) {
    const onTime = Number(ownerHistory.onTimeCount || 0);
    const delayed = Number(ownerHistory.delayedCount || 0);
    const n = onTime + delayed;
    const avgDelay = ownerHistory.avgDelayDays !== undefined ? Number(ownerHistory.avgDelayDays) : null;
    const onTimeRate = n > 0 ? (onTime / n) * 100 : null;
    return {
      n,
      avgDelay,
      medianDelay: avgDelay,
      onTimeRate,
      onTimeCount: onTime,
      delayedCount: delayed,
      label: n >= 3 ? "Owner-provided estimate" : "Not enough payment history",
      confidence: n >= 3 ? "low" : "none",
      source: "owner-provided",
      sourceLabel: "Owner-provided summary (unverified)",
    };
  }

  return {
    n: 0,
    avgDelay: null,
    medianDelay: null,
    onTimeRate: null,
    onTimeCount: 0,
    delayedCount: 0,
    label: "Not enough payment history",
    confidence: "none",
    source: "none",
    sourceLabel: "No payment history recorded",
  };
}

export function customerRiskLevel(customer) {
  if (!customer) return "unknown";
  const stats = customerPaymentStats(customer);
  // Do not invent risk score if not enough history
  if (stats.n < 3 || stats.confidence === "none") return "unknown";
  if (stats.avgDelay >= 8 || stats.onTimeRate < 20) return "high";
  if (stats.avgDelay >= 4 || stats.onTimeRate < 55) return "medium";
  return "low";
}

// Deterministic mock "prediction" for a single unpaid sales invoice.
// It is a heuristic over the customer's own history — not a trained model.
export function predictPayment(invoice, customer, today = todayISO()) {
  if (!customer) {
    return {
      available: false,
      expectedDate: invoice?.expectedPaymentDate || invoice?.dueDate || today,
      lateProbability: null,
      expectedDelayDays: null,
      confidence: "none",
      confidenceLabel: "Customer record unavailable",
      reasons: ["No customer record linked to this invoice."],
    };
  }
  const stats = customerPaymentStats(customer);
  const overdueBy = Math.max(0, daysBetween(invoice?.dueDate || today, today));
  if (stats.n === 0) {
    return {
      available: false,
      expectedDate: invoice?.expectedPaymentDate || invoice?.dueDate || today,
      lateProbability: null,
      expectedDelayDays: null,
      confidence: "none",
      confidenceLabel: "New customer — prediction unavailable",
      reasons: ["No payment history recorded for this customer yet."],
    };
  }
  const typical = Math.max(0, Math.round(stats.avgDelay));
  const expectedDate = invoice?.expectedPaymentDate || addDaysISO(invoice?.dueDate || today, typical);
  const expectedDelayDays = daysBetween(invoice?.dueDate || today, expectedDate);
  const lateProbability = clamp(0.15 + Math.max(0, stats.avgDelay) * 0.045 + (1 - stats.onTimeRate / 100) * 0.35 + (overdueBy > 0 ? 0.15 : 0), 0.05, 0.95);
  const reasons = [
    `Pays on average ${stats.avgDelay.toFixed(1)} days after the due date (${stats.n} past invoices).`,
    `On-time payment rate ${stats.onTimeRate.toFixed(0)}%.`,
  ];
  if (overdueBy > 0) reasons.push(`This invoice is already ${overdueBy} days overdue.`);
  if (stats.confidence === "low") reasons.push("Very few historical records — treat as a rough estimate.");
  return {
    available: true,
    expectedDate,
    lateProbability,
    expectedDelayDays,
    confidence: stats.confidence,
    confidenceLabel: stats.label,
    reasons,
  };
}

// ---------------- supplier reliability intelligence ----------------

export function supplierDeliveryStats(supplier) {
  if (!supplier) {
    return { n: 0, avgDelay: null, medianDelay: null, onTimeRate: null, label: "Delivery performance data unavailable", available: false };
  }
  const history = supplier.deliveryHistory || [];
  if (!history.length) {
    return { n: 0, avgDelay: null, medianDelay: null, onTimeRate: null, label: "Delivery performance data unavailable", available: false };
  }
  const onTime = history.filter((d) => d <= 1).length;
  return {
    n: history.length,
    avgDelay: mean(history),
    medianDelay: median(history),
    onTimeRate: (onTime / history.length) * 100,
    label: history.length >= 4 ? "Sufficient delivery history" : "Limited delivery history",
    available: true,
  };
}

export function supplierDeliveryRisk(supplier) {
  if (!supplier) return "unknown";
  const stats = supplierDeliveryStats(supplier);
  if (!stats.available) return "unknown";
  if (stats.avgDelay >= 5 || stats.onTimeRate < 40) return "high";
  if (stats.avgDelay >= 2.5 || stats.onTimeRate < 70) return "medium";
  return "low";
}

// ---------------- ageing buckets ----------------

export function ageingBuckets(items, today = todayISO()) {
  // items: {amountPaise, dueDate}
  const buckets = { current: 0, b1_15: 0, b16_30: 0, b30plus: 0 };
  items.forEach((item) => {
    const days = daysBetween(item.dueDate, today); // positive = overdue days
    if (days <= 0) buckets.current += item.amountPaise;
    else if (days <= 15) buckets.b1_15 += item.amountPaise;
    else if (days <= 30) buckets.b16_30 += item.amountPaise;
    else buckets.b30plus += item.amountPaise;
  });
  return buckets;
}

// ---------------- loan maths ----------------

export function loanEMI(principalPaise, annualRatePct, tenureMonths) {
  const r = annualRatePct / 12 / 100;
  if (r === 0) return Math.round(principalPaise / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  return Math.round((principalPaise * r * factor) / (factor - 1));
}

export function loanSchedule({ principalPaise, annualRatePct, feesPaise, tenureMonths, startISO }) {
  const emi = loanEMI(principalPaise, annualRatePct, tenureMonths);
  const repayments = [];
  for (let m = 0; m < tenureMonths; m += 1) {
    repayments.push({ date: addDaysISO(startISO, 30 * (m + 1)), amountPaise: emi });
  }
  const totalRepayment = emi * tenureMonths;
  const cashReceived = principalPaise - feesPaise;
  const totalCost = totalRepayment + feesPaise - principalPaise;
  return { emi, repayments, totalRepayment, cashReceived, totalCost };
}
