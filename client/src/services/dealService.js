// ============================================================
// Deal Impact Checker — estimates profitability AND cash timing
// of a prospective order before the owner commits. All results
// are labelled estimates, never guaranteed profit.
// ============================================================

import { addDaysISO, daysBetween, rupeesToPaise, todayISO } from "../utils/finance.js";
import { buildForecast } from "./forecastService.js";
import { customerRiskLevel, supplierDeliveryRisk } from "../utils/calculations.js";

export function evaluateDeal(inputs, dataset, settings, { horizonDays, today = todayISO() } = {}) {
  const horizon = horizonDays || settings.forecastHorizonDays || 30;
  const missing = [];
  if (!inputs.qty || inputs.qty <= 0) missing.push("quantity");
  if (!inputs.sellPrice || inputs.sellPrice <= 0) missing.push("selling price");
  if (inputs.unitCost === "" || inputs.unitCost === null || inputs.unitCost === undefined) missing.push("material cost");
  if (!inputs.customerPaymentDate) missing.push("expected customer payment date");

  if (missing.length) {
    return { verdict: "insufficient", missing, reasons: [`Provide: ${missing.join(", ")}. Without these the estimate would be a guess.`] };
  }

  const qty = Number(inputs.qty);
  const useInventory = Math.min(Number(inputs.existingInventory || 0), qty);
  const buyUnits = Math.max(0, Number(inputs.additionalInventory || 0) || qty - useInventory);

  const revenuePaise = rupeesToPaise(inputs.sellPrice) * qty;
  const materialPaise = rupeesToPaise(inputs.unitCost) * buyUnits;
  const shippingPaise = rupeesToPaise(inputs.shippingCost || 0);
  const otherPaise = rupeesToPaise(inputs.otherCosts || 0);
  const directCostPaise = materialPaise + shippingPaise + otherPaise;
  const grossPaise = revenuePaise - directCostPaise;
  const marginPct = revenuePaise > 0 ? (grossPaise / revenuePaise) * 100 : null;

  const productionDate = inputs.productionDate && inputs.productionDate >= today ? inputs.productionDate : addDaysISO(today, 3);
  const customerPayDate = inputs.customerPaymentDate >= today ? inputs.customerPaymentDate : addDaysISO(today, 5);
  const supplierPayDate = inputs.supplierPaymentDate && inputs.supplierPaymentDate >= today ? inputs.supplierPaymentDate : productionDate;
  const daysToPayment = daysBetween(today, customerPayDate);

  const events = [];
  if (materialPaise > 0) {
    events.push({ date: supplierPayDate <= customerPayDate ? supplierPayDate : productionDate, label: `Deal material cost (${buyUnits} units)`, direction: "out", amountPaise: materialPaise });
  }
  if (shippingPaise + otherPaise > 0) {
    events.push({ date: productionDate, label: "Deal shipping & other costs", direction: "out", amountPaise: shippingPaise + otherPaise });
  }
  events.push({ date: customerPayDate, label: `Deal receipt — ${inputs.dealName || "new order"}`, direction: "in", amountPaise: revenuePaise });

  const baseline = buildForecast(dataset, settings, { horizonDays: horizon, today });
  const withDeal = buildForecast(dataset, settings, { horizonDays: horizon, today, adjustments: [{ type: "customEvents", events }] });

  const cashOutBeforePayment = events.filter((e) => e.direction === "out" && e.date <= customerPayDate).reduce((s, e) => s + e.amountPaise, 0);
  const breach = withDeal.firstReserveBreach;
  const baselineBreach = baseline.firstReserveBreach;
  const newBreach = breach && (!baselineBreach || breach.date < baselineBreach.date || breach.close < baselineBreach.close);

  const customer = dataset.customers.find((c) => c.id === inputs.customerId);
  const supplier = dataset.suppliers.find((s) => s.id === inputs.supplierId);
  const custRisk = customer ? customerRiskLevel(customer) : "unknown";
  const supRisk = supplier ? supplierDeliveryRisk(supplier) : "unknown";

  const result = {
    dealName: inputs.dealName || "Untitled deal",
    revenuePaise,
    materialPaise,
    shippingPaise,
    otherPaise,
    directCostPaise,
    grossPaise,
    marginPct,
    buyUnits,
    useInventory,
    cashOutBeforePayment,
    daysToPayment,
    peakWorkingCapitalPaise: Math.max(0, settings.minReservePaise - withDeal.minPoint.close),
    minBalanceWithDeal: withDeal.minPoint,
    causesNewBreach: !!newBreach,
    breach,
    baselineBreach,
    withDeal,
    baseline,
    customerRisk: custRisk,
    supplierRisk: supRisk,
    assumptions: [
      `Material for ${buyUnits} units is purchased${useInventory > 0 ? `; ${useInventory} units come from existing inventory` : ""}.`,
      `Customer pays the full amount on ${customerPayDate}.`,
      supplierPayDate <= customerPayDate ? "Supplier is paid before the customer pays (cash tied up in between)." : "Supplier is paid after the customer pays.",
      "Estimates exclude GST, returns and price negotiation.",
    ],
  };

  // ---- verdict ----
  const reasons = [];
  if (marginPct < 5) {
    reasons.push(`Estimated margin is only ${marginPct.toFixed(1)}% — one cost overrun would erase the profit.`);
  }
  if (custRisk === "high") {
    reasons.push(`${customer ? customer.name : "Customer"} historically pays late — the receipt date is optimistic.`);
  }
  if (supRisk === "high") {
    reasons.push(`${supplier ? supplier.name : "Supplier"} has a poor delivery record — production may slip.`);
  }
  if (newBreach) {
    reasons.push(`The deal pushes projected cash below the ₹${(settings.minReservePaise / 100).toLocaleString("en-IN")} reserve${breach ? ` around ${breach.date}` : ""}.`);
  }

  if (marginPct < 0) {
    result.verdict = "cash-risk";
    result.reasons = [`Direct costs exceed revenue — the deal loses ~₹${Math.abs(grossPaise / 100).toLocaleString("en-IN")} before any overheads.`, ...reasons];
    return withAlternatives(result, inputs, dataset, settings, horizon, today);
  }
  if (!newBreach && marginPct >= 5) {
    result.verdict = "feasible";
    result.reasons = reasons.length ? reasons : ["Cash stays above the reserve and the estimated margin is healthy. Figures are estimates, not guaranteed profit."];
    return withAlternatives(result, inputs, dataset, settings, horizon, today);
  }
  if (newBreach) {
    result.verdict = "revised-terms";
    result.reasons = reasons;
    return withAlternatives(result, inputs, dataset, settings, horizon, today);
  }
  result.verdict = "feasible";
  result.reasons = reasons;
  return withAlternatives(result, inputs, dataset, settings, horizon, today);
}

function withAlternatives(result, inputs, dataset, settings, horizon, today) {
  const alternatives = [];
  const run = (label, patch, note) => {
    const patched = { ...inputs, ...patch };
    const qty = Number(patched.qty);
    const useInventory = Math.min(Number(patched.existingInventory || 0), qty);
    const buyUnits = Math.max(0, Number(patched.additionalInventory || 0) || qty - useInventory);
    const revenuePaise = rupeesToPaise(patched.sellPrice) * qty;
    const directCostPaise = rupeesToPaise(patched.unitCost) * buyUnits + rupeesToPaise(patched.shippingCost || 0) + rupeesToPaise(patched.otherCosts || 0);
    const grossPaise = revenuePaise - directCostPaise;
    const customerPayDate = patched.customerPaymentDate >= today ? patched.customerPaymentDate : addDaysISO(today, 5);
    const productionDate = patched.productionDate && patched.productionDate >= today ? patched.productionDate : addDaysISO(today, 3);
    const supplierPayDate = patched.supplierPaymentDate && patched.supplierPaymentDate >= today ? patched.supplierPaymentDate : productionDate;
    const events = [];
    if (directCostPaise > 0) events.push({ date: supplierPayDate <= customerPayDate ? supplierPayDate : productionDate, label: "Deal costs", direction: "out", amountPaise: directCostPaise });
    events.push({ date: customerPayDate, label: "Deal receipt", direction: "in", amountPaise: revenuePaise });
    const fc = buildForecast(dataset, settings, { horizonDays: horizon, today, adjustments: [{ type: "customEvents", events }] });
    alternatives.push({
      label,
      note,
      revenuePaise,
      grossPaise,
      marginPct: revenuePaise > 0 ? (grossPaise / revenuePaise) * 100 : 0,
      minBalancePaise: fc.minPoint.close,
      breachDate: fc.firstReserveBreach ? fc.firstReserveBreach.date : null,
      workingCapitalPaise: Math.max(0, settings.minReservePaise - fc.minPoint.close),
      deliveryFeasible: buyUnits <= Number(patched.existingInventory || 0) ? "No new purchase needed" : "Requires supplier delivery on time",
    });
  };

  run("As planned", {}, "Baseline deal structure.");
  if (Number(inputs.existingInventory || 0) > 0) {
    run("Use existing inventory", { additionalInventory: Math.max(0, Number(inputs.qty) - Number(inputs.existingInventory)), unitCost: Number(inputs.unitCost) }, "Fulfil from stock to cut upfront cash.");
  }
  run("50% customer advance", {}, "Receipt split: half now, half at delivery (modelled as earlier cash).");
  // advance model: shift half the receipt 10 days earlier (simple, transparent approximation)
  const advIdx = alternatives.length - 1;
  {
    const base = alternatives[advIdx];
    const half = Math.round(base.revenuePaise / 2);
    const adjEvents = [
      { date: addDaysISO(today, 2), label: "Advance received", direction: "in", amountPaise: half },
    ];
    const qty = Number(inputs.qty);
    const buyUnits = Math.max(0, Number(inputs.additionalInventory || 0) || qty - Math.min(Number(inputs.existingInventory || 0), qty));
    const directCostPaise = rupeesToPaise(inputs.unitCost) * buyUnits + rupeesToPaise(inputs.shippingCost || 0) + rupeesToPaise(inputs.otherCosts || 0);
    if (directCostPaise > 0) adjEvents.push({ date: addDaysISO(today, 3), label: "Deal costs", direction: "out", amountPaise: directCostPaise });
    adjEvents.push({ date: inputs.customerPaymentDate, label: "Final receipt", direction: "in", amountPaise: base.revenuePaise - half });
    const fc = buildForecast(dataset, settings, { horizonDays: horizon, today, adjustments: [{ type: "customEvents", events: adjEvents }] });
    base.minBalancePaise = fc.minPoint.close;
    base.breachDate = fc.firstReserveBreach ? fc.firstReserveBreach.date : null;
    base.workingCapitalPaise = Math.max(0, settings.minReservePaise - fc.minPoint.close);
    base.note = "Ask for 50% upfront — best lever for cash timing.";
  }
  if (inputs.supplierId) {
    run("Supplier credit +15 days", { supplierPaymentDate: addDaysISO(inputs.supplierPaymentDate || addDaysISO(today, 3), 15) }, "Negotiate longer supplier terms.");
  }
  run("Split order in half", { qty: Math.ceil(Number(inputs.qty) / 2), additionalInventory: Math.max(0, Math.ceil(Number(inputs.qty) / 2) - Number(inputs.existingInventory || 0)) }, "Deliver in two tranches; halves upfront cash.");
  run("Postpone 30 days", { customerPaymentDate: addDaysISO(inputs.customerPaymentDate, 30), productionDate: addDaysISO(inputs.productionDate || addDaysISO(today, 3), 30) }, "Only if the customer can wait.");

  result.alternatives = alternatives;
  const fixer = alternatives.slice(1).find((a) => !a.breachDate);
  if (result.verdict === "revised-terms" && fixer) {
    result.fixingAlternative = fixer.label;
    result.reasons = [...(result.reasons || []), `"${fixer.label}" removes the reserve breach in the model.`];
  }
  return result;
}

// Backend bridge for optional FastAPI ML analysis
const BASE = (import.meta.env && import.meta.env.VITE_ANALYSIS_URL) || "http://localhost:8000";

export function buildSnapshot(dataset, settings) {
  const invoices = (dataset.salesInvoices || dataset.invoices || []).map((i) => ({
    customerId: i.partyId || i.customerId,
    amountPaise: i.amountPaise,
    dueDate: i.dueDate,
    paidDate: i.actualPaymentDate || i.paidDate || (i.paidPaise && i.paidPaise >= i.amountPaise ? i.dueDate : null),
  }));
  const commitments = (dataset.purchaseInvoices || []).map((c) => ({
    id: c.id,
    name: c.number || c.name || c.label,
    type: "Commitment",
    amountPaise: c.amountPaise,
    dueDate: c.plannedPaymentDate || c.dueDate || c.date,
  }));
  return {
    openingBalancePaise: dataset.currentCashPaise ?? dataset.openingBalancePaise ?? 0,
    reservePaise: (settings && settings.minReservePaise) || 0,
    invoices,
    commitments,
  };
}

export async function analyzeDeal({ form, dataset, settings }) {
  const customer = dataset.customers.find((c) => c.id === form.customerId);
  const res = await fetch(`${BASE}/api/deal/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: form.customerId,
      customerName: customer ? customer.name : form.customerId,
      sellPricePaise: Math.round(Number(form.sellPrice || form.dealAmount) * 100),
      expectedPaymentDate: form.expectedPaymentDate,
      snapshot: buildSnapshot(dataset, settings),
    }),
  });
  if (!res.ok) throw new Error(`Analysis server error (${res.status})`);
  return res.json();
}