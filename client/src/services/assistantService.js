// ============================================================
// Local mock assistant. Deterministic answers computed only
// from active demo data + the forecast engine. No LLM, and no
// invented numbers. Unsupported questions say so explicitly.
// ============================================================

import { addDaysISO, daysBetween, formatINR, formatDisplay, todayISO } from "../utils/finance.js";
import { buildForecast, explainShortage } from "./forecastService.js";
import { evaluateScenario } from "./scenarioService.js";
import { outstandingPaise, customerRiskLevel, customerPaymentStats, predictPayment, supplierDeliveryStats } from "../utils/calculations.js";

export const SUGGESTED_QUESTIONS = [
  "Why is my cash balance falling?",
  "Which customer payment is the biggest risk?",
  "What if Krishna Traders pays 10 days later?",
  "Will I have enough cash for the upcoming EMI?",
  "Compare my two biggest suppliers",
];

export function answerAssistant(question, { dataset, settings }) {
  const today = todayISO();
  const q = String(question || "").toLowerCase();
  const horizon = settings.forecastHorizonDays || 30;
  const forecast = buildForecast(dataset, settings, { horizonDays: horizon, today });
  const customers = Object.fromEntries(dataset.customers.map((c) => [c.id, c]));
  const suppliers = Object.fromEntries(dataset.suppliers.map((s) => [s.id, s]));

  // ---- shortage / negative balance ----
  if (/(why|negative|short|shortage|fall|low|dip|breach)/.test(q)) {
    const ex = explainShortage(forecast, dataset);
    if (!ex) {
      return { kind: "computed", text: `Good news — with the current records your cash stays above the ${formatINR(forecast.reserve)} reserve for the next ${horizon} days. Lowest projected balance is ${formatINR(forecast.minPoint.close)} on ${formatDisplay(forecast.minPoint.date)}.` };
    }
    const causes = ex.causes.slice(0, 3).map((c) => `${c.label} (${formatINR(c.amountPaise)} on ${formatDisplay(c.date)})`).join("; ");
    const late = ex.lateReceipts[0]
      ? ` Meanwhile ${ex.lateReceipts[0].label} (${formatINR(ex.lateReceipts[0].amountPaise)}) only arrives on ${formatDisplay(ex.lateReceipts[0].date)}.`
      : "";
    return {
      kind: "explanation",
      text: `The forecast drops to ${formatINR(ex.breach.close)} on ${formatDisplay(ex.breach.date)}${ex.isNegative ? " — below zero" : `, below your ${formatINR(forecast.reserve)} reserve`}. The main outflows before that date: ${causes}.${late} Open the Scenario Lab to test fixes like an early collection or a supplier extension.`,
    };
  }

  // ---- riskiest customer ----
  if (/(risk|risky|late|default).*(customer|client|party)|customer.*(risk|late)/.test(q)) {
    const open = dataset.salesInvoices.filter((i) => !i.isDraft && outstandingPaise(i) > 0);
    let worst = null;
    open.forEach((inv) => {
      const customer = customers[inv.partyId];
      const prediction = predictPayment(inv, customer, today);
      const exposure = outstandingPaise(inv) * (prediction.lateProbability ?? 0.3);
      if (!worst || exposure > worst.exposure) worst = { inv, customer, prediction, exposure };
    });
    if (!worst) return { kind: "computed", text: "There are no open customer invoices right now, so no receivable risk to report." };
    const stats = customerPaymentStats(worst.customer);
    return {
      kind: "computed",
      text: `${worst.customer.name} on ${worst.inv.number} is your biggest receivable risk: ${formatINR(outstandingPaise(worst.inv))} outstanding${stats.n ? `, average delay ${stats.avgDelay.toFixed(1)} days across ${stats.n} past invoices` : " (no payment history yet)"}. Predicted payment ${formatDisplay(worst.prediction.expectedDate)}${worst.prediction.lateProbability ? ` with ~${Math.round(worst.prediction.lateProbability * 100)}% late-payment likelihood` : ""}.`,
    };
  }

  // ---- "what if invoice X delayed N days" ----
  const delayMatch = q.match(/(\d+)\s*(day|days|din)/);
  if ((/delay|late|slip|postpone|later/.test(q) || delayMatch) && /(invoice|payment|receipt|customer|traders|hardware|electricals|distributors|stores|sons|fabrics|sarees|mart|cloth|boutiques)/.test(q)) {
    const days = delayMatch ? Number(delayMatch[1]) : 7;
    let target = null;
    const open = dataset.salesInvoices.filter((i) => !i.isDraft && outstandingPaise(i) > 0).sort((a, b) => outstandingPaise(b) - outstandingPaise(a));
    const named = open.find((i) => {
      const c = customers[i.partyId];
      return c && q.includes(c.name.toLowerCase().split(" ")[0]);
    });
    target = named || open[0];
    if (!target) return { kind: "unknown", text: "I could not find an open invoice to test. Try asking about a specific customer." };
    const result = evaluateScenario(dataset, settings, [{ type: "delayInvoice", invoiceType: "sales", invoiceId: target.id, days }], { horizonDays: horizon, today });
    const d = result.diff;
    const customer = customers[target.partyId];
    return {
      kind: "computed",
      text: `If ${customer ? customer.name : "the customer"} pays ${target.number} ${days} days later (${formatINR(outstandingPaise(target))}), the lowest projected balance becomes ${formatINR(d.scenarioMin)} (baseline ${formatINR(d.baselineMin)}). ${d.scenarioBreachDate ? `Reserve breach starts ${formatDisplay(d.scenarioBreachDate)}.` : "The reserve stays intact."} ${d.shortageResolved ? "" : d.scenarioNeeded > 0 ? `Extra funding needed: ${formatINR(d.scenarioNeeded)}.` : ""}`,
    };
  }

  // ---- EMI / salary / specific commitment ----
  if (/(emi|loan|salary|salaries|rent|gst|tax)/.test(q)) {
    const keyword = /(emi|loan)/.test(q) ? "loan-emi" : /(salar)/.test(q) ? "salary" : /(rent)/.test(q) ? "rent" : "tax";
    const next = dataset.transactions
      .filter((t) => t.category === keyword && t.direction === "out" && t.date >= today)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    if (!next) return { kind: "computed", text: "I don't see any upcoming transaction of that type in the demo records." };
    const day = forecast.series.find((s) => s.date === next.date);
    const affordable = day && day.close >= 0;
    return {
      kind: "computed",
      text: `Next ${next.label.toLowerCase()} is ${formatINR(next.amountPaise)} on ${formatDisplay(next.date)}. Projected closing cash that day: ${formatINR(day ? day.close : 0)} — ${affordable ? "enough to cover it" : "not enough to cover it comfortably"}.`,
    };
  }

  // ---- compare suppliers ----
  if (/compare.*(supplier|vendor)|supplier.*(compare|better|which)/.test(q)) {
    const payables = {};
    dataset.purchaseInvoices.forEach((i) => {
      payables[i.partyId] = (payables[i.partyId] || 0) + outstandingPaise(i);
    });
    const top = dataset.suppliers.slice().sort((a, b) => (payables[b.id] || 0) - (payables[a.id] || 0)).slice(0, 2);
    const line = (s) => {
      const st = supplierDeliveryStats(s);
      return `${s.name}: payable ${formatINR(payables[s.id] || 0)}; ${st.available ? `avg delivery delay ${st.avgDelay.toFixed(1)} days, on-time ${st.onTimeRate.toFixed(0)}% over ${st.n} deliveries` : "delivery performance data unavailable"}`;
    };
    return {
      kind: "explanation",
      text: `${line(top[0])}. ${line(top[1])}. Cheapest is not automatically best — weigh reliability against price on the Suppliers page comparison table.`,
    };
  }

  // ---- deal guidance ----
  if (/(deal|order|quote|contract|new business)/.test(q)) {
    const biggestLate = dataset.salesInvoices
      .filter((i) => !i.isDraft && outstandingPaise(i) > 0 && i.dueDate < today)
      .sort((a, b) => outstandingPaise(b) - outstandingPaise(a))[0];
    return {
      kind: "explanation",
      text: biggestLate
        ? `Before taking a new order, note that ${formatINR(outstandingPaise(biggestLate))} is already overdue (${biggestLate.number}). Use the Deal Impact Checker — it prices the order AND checks whether its cash timing breaks your ${formatINR(settings.minReservePaise)} reserve.`
        : `Use the Deal Impact Checker to price a new order and test its cash timing against your ${formatINR(settings.minReservePaise)} reserve before committing.`,
    };
  }

  return {
    kind: "unknown",
    text: "The demo assistant answers questions about your cash forecast, customer payment risk, supplier reliability, and 'what-if' invoice delays. I don't have enough data for this one — try one of the suggested questions.",
  };
}
