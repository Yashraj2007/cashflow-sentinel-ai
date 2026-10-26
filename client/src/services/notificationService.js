// ============================================================
// Alert derivation — turns forecast + invoice records + deal
// checks into the notification inbox. IDs are deterministic so
// read/resolved state survives re-derivation.
// ============================================================

import { addDaysISO, daysBetween, formatINR, formatDisplay, todayISO } from "../utils/finance.js";
import { outstandingPaise, customerRiskLevel, predictPayment, loanSchedule } from "../utils/calculations.js";

export function buildAlerts(dataset, settings, forecast, extras = {}) {
  const { lastDeal = null } = extras;
  const today = todayISO();
  const alerts = [];
  const customers = Object.fromEntries(dataset.customers.map((c) => [c.id, c]));
  const suppliers = Object.fromEntries(dataset.suppliers.map((s) => [s.id, s]));

  // 1) predicted shortage / reserve breach
  if (forecast.firstNegative) {
    alerts.push({
      id: `shortage-neg-${forecast.firstNegative.date}`,
      type: "cash-shortage",
      severity: "high",
      date: forecast.firstNegative.date,
      title: `Projected cash shortage: ${formatINR(-forecast.firstNegative.close)} on ${formatDisplay(forecast.firstNegative.date)}`,
      body: "Projected balance falls below zero before expected receipts arrive. Salary, supplier payments and rent are scheduled ahead of the big customer receipts.",
      link: "/forecast",
      actionLabel: "Open forecast",
    });
  } else if (forecast.firstReserveBreach) {
    alerts.push({
      id: `shortage-res-${forecast.firstReserveBreach.date}`,
      type: "reserve-breach",
      severity: "medium",
      date: forecast.firstReserveBreach.date,
      title: `Cash reserve breach on ${formatDisplay(forecast.firstReserveBreach.date)} — ${formatINR(forecast.firstReserveBreach.gap)} below reserve`,
      body: `Projected balance dips to ${formatINR(forecast.firstReserveBreach.close)}, below your ${formatINR(settings.minReservePaise)} minimum reserve.`,
      link: "/forecast",
      actionLabel: "See why",
    });
  }

  // 2) overdue customer invoices
  dataset.salesInvoices
    .filter((i) => !i.isDraft && i.dueDate < today && outstandingPaise(i) > 0)
    .forEach((inv) => {
      const days = daysBetween(inv.dueDate, today);
      const customer = customers[inv.partyId];
      alerts.push({
        id: `overdue-${inv.id}`,
        type: "overdue-invoice",
        severity: days > 15 ? "high" : "medium",
        date: inv.dueDate,
        title: `${inv.number} (${customer ? customer.name : "customer"}) is ${days} days overdue — ${formatINR(outstandingPaise(inv))}`,
        body: `Due on ${formatDisplay(inv.dueDate)}. Predicted payment ${formatDisplay(inv.expectedPaymentDate)}.`,
        link: "/sales-invoices",
        actionLabel: "Review invoice",
        related: { kind: "sales-invoice", id: inv.id },
      });
    });

  // 3) customers likely to pay late (big open amounts, risky customers)
  dataset.salesInvoices
    .filter((i) => !i.isDraft && outstandingPaise(i) > 0 && i.dueDate >= today)
    .forEach((inv) => {
      const customer = customers[inv.partyId];
      if (!customer || customerRiskLevel(customer) !== "high") return;
      if (outstandingPaise(inv) < 5000000) return; // ₹50,000+
      const prediction = predictPayment(inv, customer, today);
      alerts.push({
        id: `late-cust-${inv.id}`,
        type: "late-payment-risk",
        severity: "medium",
        date: inv.dueDate,
        title: `${customer.name} likely to pay ${inv.number} late (${formatINR(outstandingPaise(inv))})`,
        body: prediction.reasons.join(" "),
        link: `/customers/${customer.id}`,
        actionLabel: "Open customer",
      });
    });

  // 4) supplier payments due within 7 days
  dataset.purchaseInvoices
    .filter((i) => outstandingPaise(i) > 0 && i.plannedPaymentDate >= today && i.plannedPaymentDate <= addDaysISO(today, 7))
    .forEach((inv) => {
      const supplier = suppliers[inv.partyId];
      alerts.push({
        id: `sup-due-${inv.id}`,
        type: "supplier-payment",
        severity: inv.priority === "critical" ? "medium" : "low",
        date: inv.plannedPaymentDate,
        title: `Supplier payment due: ${inv.number} (${supplier ? supplier.name : ""}) — ${formatINR(outstandingPaise(inv))} on ${formatDisplay(inv.plannedPaymentDate)}`,
        body: inv.priority === "critical" ? "Critical supplier — this purchase feeds an open customer order." : "Scheduled in the forecast. Adjust the planned date in Scenario Lab if needed.",
        link: "/purchase-invoices",
        actionLabel: "View bills",
      });
    });

  // 5) supplier delivery delays
  dataset.purchaseInvoices
    .filter((i) => i.deliveryPromised && i.deliveryPromised < today && !i.deliveryActual && outstandingPaise(i) > 0)
    .forEach((inv) => {
      const supplier = suppliers[inv.partyId];
      const days = daysBetween(inv.deliveryPromised, today);
      alerts.push({
        id: `delivery-${inv.id}`,
        type: "delivery-delay",
        severity: days > 5 ? "medium" : "low",
        date: inv.deliveryPromised,
        title: `Delivery delayed: ${inv.number} (${supplier ? supplier.name : ""}) — ${days} days late`,
        body: `Promised on ${formatDisplay(inv.deliveryPromised)} and not yet received. Delivery delays can stall the customer orders this stock supports.`,
        link: `/suppliers/${inv.partyId}`,
        actionLabel: "Open supplier",
      });
    });

  // 6) deal impact checker flags
  if (lastDeal && (lastDeal.verdict === "cash-risk" || lastDeal.verdict === "revised-terms")) {
    alerts.push({
      id: `deal-${lastDeal.at}`,
      type: "deal-risk",
      severity: lastDeal.verdict === "cash-risk" ? "high" : "medium",
      date: today,
      title: `Deal “${lastDeal.name}” — ${lastDeal.verdict === "cash-risk" ? "cash-flow risk detected" : "feasible only with revised payment terms"}`,
      body: `Estimated margin ${lastDeal.marginPct !== null && lastDeal.marginPct !== undefined ? `${lastDeal.marginPct.toFixed(1)}%` : "—"} · cash out before customer pays ${formatINR(lastDeal.cashOutBeforePayment || 0)}${lastDeal.breachDate ? ` · reserve breach around ${formatDisplay(lastDeal.breachDate)}` : ""}. Compare the alternatives before committing.`,
      link: "/deal-checker",
      actionLabel: "Review deal",
    });
  }

  // 7) financing repayment risk — from accepted loan scenarios
  (dataset.savedScenarios || [])
    .filter((sc) => sc.status === "accepted")
    .forEach((sc) => {
      (sc.adjustments || [])
        .filter((a) => a.type === "loan")
        .forEach((a, i) => {
          const sched = loanSchedule(a);
          sched.repayments.forEach((r) => {
            const day = forecast.series.find((s) => s.date === r.date);
            if (day && day.close < r.amountPaise) {
              alerts.push({
                id: `fin-${sc.id}-${i}-${r.date}`,
                type: "financing-risk",
                severity: day.close < 0 ? "high" : "medium",
                date: r.date,
                title: `Loan repayment risk: EMI ${formatINR(r.amountPaise)} on ${formatDisplay(r.date)}`,
                body: `From accepted scenario “${sc.name}”. Projected balance that day is ${formatINR(day.close)}${day.close < 0 ? " — already negative before the EMI" : " — the EMI would overdraw the account"}.`,
                link: "/scenario-lab",
                actionLabel: "Open Scenario Lab",
              });
            }
          });
        });
    });

  const sevRank = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => (sevRank[a.severity] === sevRank[b.severity] ? (a.date < b.date ? 1 : -1) : sevRank[a.severity] - sevRank[b.severity]));
}
