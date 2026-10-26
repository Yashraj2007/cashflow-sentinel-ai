// ============================================================
// Scenario evaluation + transparent heuristic recommendation
// engine. Scoring weights are explicit; hard constraints
// exclude infeasible options (e.g. delaying a critical
// supplier payment that feeds an open customer order).
// ============================================================

import { addDaysISO, daysBetween, todayISO } from "../utils/finance.js";
import { buildForecast } from "./forecastService.js";
import { outstandingPaise, customerRiskLevel, loanSchedule } from "../utils/calculations.js";

export function evaluateScenario(dataset, settings, adjustments, { horizonDays, today = todayISO() } = {}) {
  const baseline = buildForecast(dataset, settings, { horizonDays, today });
  const scenario = buildForecast(dataset, settings, { adjustments, horizonDays, today });
  const baseMin = baseline.minPoint.close;
  const scenMin = scenario.minPoint.close;
  const baseBreach = baseline.firstReserveBreach ? baseline.firstReserveBreach.date : null;
  const scenBreach = scenario.firstReserveBreach ? scenario.firstReserveBreach.date : null;

  const extraCosts = (adjustments || [])
    .filter((a) => a.type === "loan")
    .reduce((sum, a) => {
      const s = loanSchedule({
        principalPaise: a.principalPaise,
        annualRatePct: a.annualRatePct,
        feesPaise: a.feesPaise || 0,
        tenureMonths: a.tenureMonths,
        startISO: a.startISO || addDaysISO(today, 2),
      });
      return sum + s.totalCost;
    }, 0);

  return {
    baseline,
    scenario,
    adjustments,
    diff: {
      minBalanceDelta: scenMin - baseMin,
      baselineMin: baseMin,
      scenarioMin: scenMin,
      baselineBreachDate: baseBreach,
      scenarioBreachDate: scenBreach,
      breachShiftDays: baseBreach && scenBreach ? daysBetween(baseBreach, scenBreach) : scenBreach ? null : baseBreach ? Infinity : 0,
      baselineNeeded: baseline.cashNeededForReserve,
      scenarioNeeded: scenario.cashNeededForReserve,
      shortageResolved: !scenBreach && !!baseBreach,
      extraCostsPaise: extraCosts,
      peakWorkingCapitalPaise: Math.max(0, settings.minReservePaise - scenMin),
    },
  };
}

// ---------------- recommendation engine ----------------

const WEIGHTS = { coverage: 0.55, speed: 0.2, cost: 0.15, disruption: 0.1 };
const DISRUPTION = { chase: 0.15, advance: 0.25, extension: 0.2, postpone: 0.15, expense: 0.1, loan: 0.45 };

function scoreCandidate(candidate, context) {
  const { initialGap, horizon } = context;
  const coverage = Math.min(1, Math.max(0, candidate.gapResolvedPaise / initialGap));
  const speed = candidate.breachResolved ? 1 : Math.min(1, Math.max(0, (candidate.breachShiftDays || 0) / horizon));
  const costNorm = initialGap > 0 ? Math.min(1, candidate.costPaise / initialGap) : 0;
  const disruption = DISRUPTION[candidate.kind] ?? 0.3;
  const score =
    WEIGHTS.coverage * coverage + WEIGHTS.speed * speed - WEIGHTS.cost * costNorm - WEIGHTS.disruption * disruption;
  return { ...candidate, coverage, score: Math.round(score * 1000) / 1000 };
}

export function buildRecommendations(dataset, settings, { horizonDays, today = todayISO() } = {}) {
  const horizon = horizonDays || settings.forecastHorizonDays || 30;
  const baseline = buildForecast(dataset, settings, { horizonDays: horizon, today });

  if (!baseline.firstReserveBreach) {
    return { needed: false, baseline, candidates: [], message: "No reserve breach in the current forecast — no corrective action required right now." };
  }

  const initialGap = baseline.cashNeededForReserve;
  const breachDate = baseline.firstReserveBreach.date;
  const customers = Object.fromEntries(dataset.customers.map((c) => [c.id, c]));
  const suppliers = Object.fromEntries(dataset.suppliers.map((s) => [s.id, s]));
  const candidates = [];
  const ctx = { initialGap, horizon };

  const evaluate = (adjustment, kind, meta) => {
    const result = evaluateScenario(dataset, settings, [adjustment], { horizonDays: horizon, today });
    const d = result.diff;
    const gapResolvedPaise = Math.max(0, d.baselineNeeded - d.scenarioNeeded);
    const breachShiftDays = d.baselineBreachDate && d.scenarioBreachDate
      ? daysBetween(d.baselineBreachDate, d.scenarioBreachDate)
      : d.scenarioBreachDate
        ? 0
        : daysBetween(d.baselineBreachDate, addDaysISO(today, horizon));
    return scoreCandidate(
      {
        kind,
        adjustment,
        gapResolvedPaise,
        breachResolved: !d.scenarioBreachDate,
        breachShiftDays,
        costPaise: d.extraCostsPaise,
        scenarioMin: d.scenarioMin,
        ...meta,
      },
      ctx
    );
  };

  // A) Chase large receipts currently landing after the breach date
  dataset.salesInvoices
    .filter((inv) => !inv.isDraft && outstandingPaise(inv) > 0)
    .forEach((inv) => {
      const expected = inv.expectedPaymentDate >= today ? inv.expectedPaymentDate : addDaysISO(today, 1);
      if (expected <= breachDate) return;
      const remaining = outstandingPaise(inv);
      if (remaining < 2500000) return; // skip tiny invoices (< ₹25,000)
      const customer = customers[inv.partyId];
      const risk = customer ? customerRiskLevel(customer) : "unknown";
      const targetDays = Math.min(daysBetween(today, expected) - 1, daysBetween(today, breachDate) + 2);
      if (targetDays <= 0) return;
      const c = evaluate(
        { type: "delayInvoice", invoiceType: "sales", invoiceId: inv.id, days: -targetDays },
        "chase",
        {
          title: `Collect ${inv.number} early (${customer ? customer.name : "customer"})`,
          detail: `Move the ₹${(remaining / 100).toLocaleString("en-IN")} receipt ~${targetDays} days earlier through reminders or a phone call.`,
          riskNote: risk === "high" ? "Customer historically pays late — early collection is possible but not certain." : "Customer has a reasonable payment record.",
          feasible: true,
        }
      );
      if (c.coverage >= 0.03) candidates.push(c);
    });

  // B) Request an advance on the largest upcoming invoice
  const upcoming = dataset.salesInvoices
    .filter((inv) => !inv.isDraft && outstandingPaise(inv) > 0 && inv.dueDate >= today)
    .sort((a, b) => outstandingPaise(b) - outstandingPaise(a))[0];
  if (upcoming) {
    const customer = customers[upcoming.partyId];
    const c = evaluate(
      { type: "advance", invoiceId: upcoming.id, percent: 50, date: addDaysISO(today, 2), label: `50% advance — ${upcoming.number}` },
      "advance",
      {
        title: `Request 50% advance on ${upcoming.number}`,
        detail: `Ask ${customer ? customer.name : "the customer"} for a 50% advance (~₹${Math.round(outstandingPaise(upcoming) / 2 / 100).toLocaleString("en-IN")}) against the order.`,
        riskNote: "May need a small discount or goodwill to secure the advance.",
        feasible: true,
      }
    );
    if (c.coverage >= 0.03) candidates.push(c);
  }

  // C) Extend non-critical supplier payments (hard constraint: never critical)
  dataset.purchaseInvoices
    .filter((inv) => outstandingPaise(inv) > 0 && inv.plannedPaymentDate <= addDaysISO(breachDate, 7))
    .forEach((inv) => {
      const supplier = suppliers[inv.partyId];
      if (inv.priority === "critical") {
        candidates.push({
          kind: "extension",
          excluded: true,
          title: `Delay ${inv.number} (${supplier ? supplier.name : "supplier"}) — excluded`,
          detail: "Marked critical: this purchase feeds an open customer order, so delaying it risks the order itself.",
          score: -1,
          coverage: 0,
        });
        return;
      }
      const c = evaluate(
        { type: "supplierExtension", invoiceId: inv.id, days: 10 },
        "extension",
        {
          title: `Negotiate +10 days on ${inv.number}`,
          detail: `Ask ${supplier ? supplier.name : "the supplier"} to extend payment by 10 days (₹${(outstandingPaise(inv) / 100).toLocaleString("en-IN")}).`,
          riskNote: "Usually cost-free, but repeated extensions can strain the relationship.",
          feasible: true,
        }
      );
      if (c.coverage >= 0.03) candidates.push(c);
    });

  // D) Postpone optional purchases & expenses
  dataset.purchaseInvoices
    .filter((inv) => inv.priority === "low" && outstandingPaise(inv) > 0 && inv.plannedPaymentDate <= addDaysISO(breachDate, 10))
    .forEach((inv) => {
      const c = evaluate(
        { type: "postponePurchase", invoiceId: inv.id, days: 21 },
        "postpone",
        {
          title: `Postpone optional purchase ${inv.number} by 3 weeks`,
          detail: "Low-priority stock that is not needed for committed orders.",
          riskNote: "Stock buffer reduces temporarily.",
          feasible: true,
        }
      );
      if (c.coverage >= 0.03) candidates.push(c);
    });

  dataset.transactions
    .filter((t) => t.optional && t.direction === "out" && t.date > today && t.date <= addDaysISO(breachDate, 10))
    .forEach((t) => {
      const c = evaluate(
        { type: "postponeExpense", transactionId: t.id, days: 21 },
        "expense",
        {
          title: `Postpone "${t.label}" by 3 weeks`,
          detail: `Discretionary spend of ₹${(t.amountPaise / 100).toLocaleString("en-IN")} marked optional.`,
          riskNote: "Minor operational impact only.",
          feasible: true,
        }
      );
      if (c.coverage >= 0.03) candidates.push(c);
    });

  // E) Financing — only considered last, and never if the business runs a recurring deficit
  const futureIn60 = baseline.events.filter((e) => e.direction === "in" && e.date > today && e.date <= addDaysISO(today, 60)).reduce((s, e) => s + e.amountPaise, 0);
  const futureOut60 = baseline.events.filter((e) => e.direction === "out" && e.date > today && e.date <= addDaysISO(today, 60)).reduce((s, e) => s + e.amountPaise, 0);
  const recurringDeficit = futureOut60 - futureIn60 > settings.minReservePaise;

  const principal = Math.round(baseline.cashNeededForReserve * 1.15);
  const loanAdj = { type: "loan", principalPaise: principal, annualRatePct: 12.5, feesPaise: Math.round(principal * 0.02), tenureMonths: 6, startISO: addDaysISO(today, 2) };
  const loan = evaluate(loanAdj, "loan", {
    title: `Short-term working-capital loan (~₹${(principal / 100).toLocaleString("en-IN")})`,
    detail: `12.5% p.a., 2% processing fee, 6-month EMI of ~₹${Math.round(loanSchedule({ principalPaise: principal, annualRatePct: 12.5, feesPaise: Math.round(principal * 0.02), tenureMonths: 6, startISO: addDaysISO(today, 2) }).emi / 100).toLocaleString("en-IN")}.`,
    riskNote: recurringDeficit
      ? "Warning: outflows exceed inflows over the next 60 days — borrowing may increase future risk rather than fix the underlying deficit."
      : "Cash receipts in the next 60 days comfortably cover the EMI schedule.",
    feasible: true,
  });
  if (loan.coverage >= 0.03) candidates.push(loan);

  const viable = candidates.filter((c) => !c.excluded && c.coverage >= 0.05).sort((a, b) => b.score - a.score).slice(0, 4);
  const excluded = candidates.filter((c) => c.excluded);

  return {
    needed: true,
    baseline,
    initialGap,
    breachDate,
    candidates: viable,
    excluded,
    message: viable.length
      ? "Ranked by shortage coverage, speed, cost and disruption. Weights are transparent and shown with each option."
      : "No safe solution found in the current scenario. Consider combining a customer advance with a supplier extension, or review committed spend.",
  };
}
