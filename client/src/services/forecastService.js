// ============================================================
// Cash-flow forecast engine (pure functions, paise arithmetic).
//
// Event sources are deliberately kept separate so nothing is
// double-counted:
//   - transactions      : recorded cash movements + committed future expenses
//   - sales invoices    : expected receipts of the UNPAID balance only
//   - purchase invoices : expected payments of the UNPAID balance only
// Adjustments (scenarios/deals) mutate copies of these events.
// ============================================================

import { addDaysISO, daysBetween, isoRange, todayISO } from "../utils/finance.js";
import { customerRiskLevel, outstandingPaise, loanSchedule } from "../utils/calculations.js";

export function collectEvents(dataset, { adjustments = [], today = todayISO() } = {}) {
  const events = [];
  const customerById = Object.fromEntries(dataset.customers.map((c) => [c.id, c]));

  // 1) transactions (past actuals + future committed/expected)
  dataset.transactions.forEach((t) => {
    events.push({
      id: `ev-${t.id}`,
      date: t.date,
      label: t.label,
      category: t.category,
      direction: t.direction,
      amountPaise: t.amountPaise,
      status: t.status || (t.date <= today ? "actual" : "confirmed"),
      optional: !!t.optional,
      source: { kind: "transaction", id: t.id },
    });
  });

  // 2) unpaid sales invoice balances -> expected receipts
  dataset.salesInvoices.forEach((inv) => {
    if (inv.isDraft) return;
    const remaining = outstandingPaise(inv);
    if (remaining <= 0) return;
    const customer = customerById[inv.partyId];
    const risk = customer ? customerRiskLevel(customer) : "unknown";
    const date = inv.expectedPaymentDate >= today ? inv.expectedPaymentDate : addDaysISO(today, 1);
    events.push({
      id: `ev-${inv.id}-bal`,
      date,
      label: `Expected receipt — ${inv.number}${customer ? ` (${customer.name})` : ""}`,
      category: "invoice-receipt",
      direction: "in",
      amountPaise: remaining,
      status: risk === "high" ? "uncertain" : "expected",
      source: { kind: "sales-invoice", id: inv.id },
      partyId: inv.partyId,
    });
  });

  // 3) unpaid purchase invoice balances -> expected payments
  const supplierById = Object.fromEntries(dataset.suppliers.map((s) => [s.id, s]));
  dataset.purchaseInvoices.forEach((inv) => {
    const remaining = outstandingPaise(inv);
    if (remaining <= 0) return;
    const supplier = supplierById[inv.partyId];
    const date = inv.plannedPaymentDate >= today ? inv.plannedPaymentDate : addDaysISO(today, 1);
    events.push({
      id: `ev-${inv.id}-bal`,
      date,
      label: `Planned payment — ${inv.number}${supplier ? ` (${supplier.name})` : ""}`,
      category: "supplier-payment",
      direction: "out",
      amountPaise: remaining,
      status: "expected",
      critical: inv.priority === "critical",
      priority: inv.priority,
      source: { kind: "purchase-invoice", id: inv.id },
      partyId: inv.partyId,
    });
  });

  return applyAdjustments(events, adjustments, { dataset, today });
}

export function applyAdjustments(events, adjustments, { dataset, today }) {
  let out = events.map((e) => ({ ...e }));

  (adjustments || []).forEach((adj, idx) => {
    const sid = `sim-${idx}`;
    switch (adj.type) {
      case "delayInvoice": {
        out = out.map((e) =>
          e.source.kind === `${adj.invoiceType}-invoice` && e.source.id === adj.invoiceId && e.date >= today
            ? { ...e, date: addDaysISO(e.date, adj.days), status: "simulated", simId: sid }
            : e
        );
        break;
      }
      case "supplierExtension":
      case "postponePurchase": {
        out = out.map((e) =>
          e.source.kind === "purchase-invoice" && e.source.id === adj.invoiceId && e.date >= today
            ? { ...e, date: addDaysISO(e.date, adj.days), status: "simulated", simId: sid }
            : e
        );
        break;
      }
      case "partialPayment":
      case "advance": {
        const inv = dataset.salesInvoices.find((i) => i.id === adj.invoiceId);
        if (!inv) break;
        const remaining = outstandingPaise(inv);
        const amount = adj.type === "advance" ? Math.round((remaining * (adj.percent || 50)) / 100) : Math.min(adj.amountPaise || 0, remaining);
        if (amount <= 0) break;
        const advDate = adj.date && adj.date >= today ? adj.date : addDaysISO(today, 2);
        out = out.map((e) => {
          if (e.source.kind === "sales-invoice" && e.source.id === adj.invoiceId) {
            const newRemaining = e.amountPaise - amount;
            return newRemaining > 0 ? { ...e, amountPaise: newRemaining } : null;
          }
          return e;
        }).filter(Boolean);
        out.push({
          id: `${sid}-adv`, date: advDate, label: adj.label || `Advance against ${inv.number}`,
          category: "invoice-receipt", direction: "in", amountPaise: amount, status: "simulated", simId: sid,
          source: { kind: "simulation", id: sid },
        });
        break;
      }
      case "expense": {
        out.push({
          id: `${sid}-exp`, date: adj.date, label: adj.label || "Unexpected expense",
          category: "operating", direction: "out", amountPaise: adj.amountPaise, status: "simulated", simId: sid,
          source: { kind: "simulation", id: sid },
        });
        break;
      }
      case "salesDrop": {
        out = out.map((e) =>
          e.category === "cash-sales" && e.date >= today
            ? { ...e, amountPaise: Math.round(e.amountPaise * (1 - (adj.percent || 0) / 100)), status: "simulated", simId: sid }
            : e
        );
        break;
      }
      case "costIncrease": {
        out = out.map((e) =>
          e.source.kind === "purchase-invoice" && e.date >= today
            ? { ...e, amountPaise: Math.round(e.amountPaise * (1 + (adj.percent || 0) / 100)), status: "simulated", simId: sid }
            : e
        );
        break;
      }
      case "postponeExpense": {
        out = out.map((e) =>
          e.source.kind === "transaction" && e.source.id === adj.transactionId && e.date >= today
            ? { ...e, date: addDaysISO(e.date, adj.days), status: "simulated", simId: sid }
            : e
        );
        break;
      }
      case "loan": {
        const schedule = loanSchedule({
          principalPaise: adj.principalPaise,
          annualRatePct: adj.annualRatePct,
          feesPaise: adj.feesPaise || 0,
          tenureMonths: adj.tenureMonths,
          startISO: adj.startISO || addDaysISO(today, 2),
        });
        out.push({
          id: `${sid}-loan-in`, date: addDaysISO(today, 2), label: `Loan disbursed (net of fees)`,
          category: "financing", direction: "in", amountPaise: schedule.cashReceived, status: "simulated", simId: sid,
          source: { kind: "simulation", id: sid },
        });
        schedule.repayments.forEach((r, i) => {
          out.push({
            id: `${sid}-emi-${i}`, date: r.date, label: "Loan EMI repayment",
            category: "financing", direction: "out", amountPaise: r.amountPaise, status: "simulated", simId: sid,
            source: { kind: "simulation", id: sid },
          });
        });
        break;
      }
      case "reduceQuantity": {
        out = out.map((e) =>
          e.source.kind === "purchase-invoice" && e.source.id === adj.invoiceId && e.date >= today
            ? { ...e, amountPaise: Math.round(e.amountPaise * (1 - (adj.percent || 0) / 100)), status: "simulated", simId: sid }
            : e
        );
        break;
      }
      case "deliveryDelay": {
        // delivery timing only — no direct cash movement, tracked for stockout risk
        break;
      }
      case "customEvents": {
        (adj.events || []).forEach((cev, i) => {
          out.push({
            id: `${sid}-custom-${i}`, date: cev.date, label: cev.label,
            category: cev.category || "deal", direction: cev.direction, amountPaise: cev.amountPaise,
            status: "simulated", simId: sid, source: { kind: "simulation", id: sid },
          });
        });
        break;
      }
      default:
        break;
    }
  });

  return out;
}

export function buildForecast(dataset, settings, { adjustments = [], horizonDays, historyDays = 30, today = todayISO(), eventFilter = null } = {}) {
  const horizon = horizonDays || settings.forecastHorizonDays || 30;
  const reserve = settings.minReservePaise || 0;
  let events = collectEvents(dataset, { adjustments, today });
  if (eventFilter) events = events.filter(eventFilter);
  const haircut = settings.uncertainReceiptHaircutPct || 0;
  if (haircut > 0) {
    events = events.map((e) =>
      e.status === "uncertain" && e.direction === "in" && e.date > today
        ? { ...e, amountPaise: Math.round(e.amountPaise * (1 - haircut / 100)) }
        : e
    );
  }
  const start = addDaysISO(today, -historyDays);
  const end = addDaysISO(today, horizon);

  // opening balance at history start = today's cash walked backwards
  let windowNet = 0;
  events.forEach((e) => {
    if (e.date > start && e.date <= today && e.status === "actual") {
      windowNet += e.direction === "in" ? e.amountPaise : -e.amountPaise;
    }
  });
  let running = dataset.currentCashPaise - windowNet;

  const byDate = new Map();
  events.forEach((e) => {
    if (e.date < start || e.date > end) return;
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  });

  const series = isoRange(start, end).map((date) => {
    const dayEvents = byDate.get(date) || [];
    const inflow = dayEvents.filter((e) => e.direction === "in").reduce((s, e) => s + e.amountPaise, 0);
    const outflow = dayEvents.filter((e) => e.direction === "out").reduce((s, e) => s + e.amountPaise, 0);
    running += inflow - outflow;
    return {
      date,
      inflow,
      outflow,
      close: running,
      isActual: date <= today,
      belowReserve: date > today && running < reserve,
      events: dayEvents.map((e) => ({ label: e.label, amountPaise: e.amountPaise, direction: e.direction, status: e.status })),
    };
  });

  const future = series.filter((s) => s.date > today);
  let minPoint = null;
  future.forEach((s) => {
    if (!minPoint || s.close < minPoint.close) minPoint = { date: s.date, close: s.close };
  });
  const firstReserveBreach = future.find((s) => s.close < reserve) || null;
  const firstNegative = future.find((s) => s.close < 0) || null;
  const expectedIn = future.reduce((s, x) => s + x.inflow, 0);
  const expectedOut = future.reduce((s, x) => s + x.outflow, 0);

  return {
    series,
    today,
    horizon,
    reserve,
    currentCashPaise: dataset.currentCashPaise,
    minPoint: minPoint || { date: today, close: dataset.currentCashPaise },
    firstReserveBreach: firstReserveBreach ? { ...firstReserveBreach, gap: reserve - firstReserveBreach.close } : null,
    firstNegative: firstNegative ? { ...firstNegative, gap: -firstNegative.close } : null,
    cashNeededForReserve: minPoint ? Math.max(0, reserve - minPoint.close) : 0,
    expectedIn,
    expectedOut,
    events,
  };
}

export function explainShortage(forecast, dataset) {
  const breach = forecast.firstNegative || forecast.firstReserveBreach;
  if (!breach) return null;
  const target = breach.date;
  const futureOut = forecast.events
    .filter((e) => e.direction === "out" && e.date > forecast.today && e.date <= target)
    .sort((a, b) => b.amountPaise - a.amountPaise);
  const lateReceipts = forecast.events
    .filter((e) => e.direction === "in" && e.date > target && e.category === "invoice-receipt")
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .slice(0, 3);
  const uncertain = forecast.events.filter((e) => e.status === "uncertain" && e.date > forecast.today);
  const causes = futureOut.slice(0, 5).map((e) => ({ label: e.label, amountPaise: e.amountPaise, date: e.date }));
  return {
    breach,
    isNegative: !!forecast.firstNegative,
    causes,
    lateReceipts: lateReceipts.map((e) => ({ label: e.label, amountPaise: e.amountPaise, date: e.date })),
    uncertain: uncertain.map((e) => ({ label: e.label, amountPaise: e.amountPaise, date: e.date })),
    daysFromToday: daysBetween(forecast.today, target),
  };
}

export function summarizeDataset(dataset, today = todayISO()) {
  const receivables = dataset.salesInvoices.filter((i) => !i.isDraft).reduce((s, i) => s + outstandingPaise(i), 0);
  const payables = dataset.purchaseInvoices.reduce((s, i) => s + outstandingPaise(i), 0);
  const overdueSales = dataset.salesInvoices.filter((i) => !i.isDraft && i.dueDate < today && outstandingPaise(i) > 0);
  const overdueAmount = overdueSales.reduce((s, i) => s + outstandingPaise(i), 0);
  return { receivables, payables, overdueSalesCount: overdueSales.length, overdueAmount };
}
