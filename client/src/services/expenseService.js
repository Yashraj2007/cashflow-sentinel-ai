// ============================================================
// Expense & Owner Withdrawal Service
// Handles recurring fixed expenses, variable expenses, and
// planned owner personal drawings with cash reserve simulation.
// ============================================================

import { rupeesToPaise, paiseToRupees, todayISO, addDaysISO, parseISO, toISO } from "../utils/finance.js";

export const EXPENSE_CATEGORIES = [
  { key: "salary", label: "Staff Salaries & Payroll", isOwner: false, icon: "Users" },
  { key: "rent", label: "Warehouse & Office Rent", isOwner: false, icon: "Building" },
  { key: "utilities", label: "Electricity & Utilities", isOwner: false, icon: "Zap" },
  { key: "loan-emi", label: "Working Capital Loan EMI", isOwner: false, icon: "Landmark" },
  { key: "tax", label: "GST & Direct Tax Challans", isOwner: false, icon: "FileText" },
  { key: "inventory", label: "Emergency / Ad-hoc Stock", isOwner: false, icon: "Package" },
  { key: "marketing", label: "Marketing & Growth", isOwner: false, icon: "TrendingUp" },
  { key: "subscriptions", label: "Software & SaaS Subscriptions", isOwner: false, icon: "Laptop" },
  { key: "operating", label: "Transport, Logistics & Maintenance", isOwner: false, icon: "Truck" },
  { key: "owner-draw", label: "Owner Personal Withdrawal (Drawings)", isOwner: true, icon: "Wallet" },
];

export const RECURRENCE_OPTIONS = [
  { value: "monthly", label: "Monthly on day of month" },
  { value: "quarterly", label: "Quarterly" },
  { value: "one-time", label: "One-time commitment" },
];

/** Returns whether a category is an owner personal withdrawal */
export function isOwnerWithdrawal(category) {
  return category === "owner-draw";
}

/**
 * Seed recurring expenses if not already configured in dataset.
 */
export function getInitialRecurringExpenses(anchor = todayISO()) {
  const d = (days) => addDaysISO(anchor, days);
  return [
    {
      id: "rec-salary",
      label: "Staff Salaries (Batch transfer)",
      category: "salary",
      amountPaise: rupeesToPaise(185000),
      dayOfMonth: 5,
      frequency: "monthly",
      active: true,
      isOwner: false,
      nextDueDate: d(5),
      notes: "Monthly staff payroll due on 5th",
    },
    {
      id: "rec-rent",
      label: "Warehouse & Godown Rent",
      category: "rent",
      amountPaise: rupeesToPaise(60000),
      dayOfMonth: 8,
      frequency: "monthly",
      active: true,
      isOwner: false,
      nextDueDate: d(8),
      notes: "Main warehouse lease",
    },
    {
      id: "rec-utilities",
      label: "Electricity & Godown Utilities",
      category: "utilities",
      amountPaise: rupeesToPaise(12000),
      dayOfMonth: 9,
      frequency: "monthly",
      active: true,
      isOwner: false,
      nextDueDate: d(9),
      notes: "Power & water charges",
    },
    {
      id: "rec-gst",
      label: "Monthly GST Challan Payment",
      category: "tax",
      amountPaise: rupeesToPaise(45000),
      dayOfMonth: 12,
      frequency: "monthly",
      active: true,
      isOwner: false,
      nextDueDate: d(12),
      notes: "GSTR-3B tax payment",
    },
    {
      id: "rec-emi",
      label: "Working Capital Term Loan EMI",
      category: "loan-emi",
      amountPaise: rupeesToPaise(42000),
      dayOfMonth: 15,
      frequency: "monthly",
      active: true,
      isOwner: false,
      nextDueDate: d(15),
      notes: "Bank auto-debit on 15th",
    },
    {
      id: "rec-draw",
      label: "Planned Owner Monthly Draw",
      category: "owner-draw",
      amountPaise: rupeesToPaise(75000),
      dayOfMonth: 25,
      frequency: "monthly",
      active: true,
      isOwner: true,
      nextDueDate: d(25),
      notes: "Personal living expenses withdrawal — separate from business costs",
    },
  ];
}

/**
 * Simulates the cash-flow impact of a proposed owner personal withdrawal.
 * Returns whether it would cause a minimum reserve breach or negative cash balance.
 */
export function simulateWithdrawalImpact(forecast, amountPaise, dateISO) {
  if (!forecast || !forecast.series || !forecast.series.length) {
    return {
      wouldBreachReserve: false,
      wouldGoNegative: false,
      projectedBalance: null,
      gapToReserve: 0,
      upcomingCommitmentsNearDate: 0,
    };
  }

  const reserve = forecast.reserve || 0;
  // Find projected balance on the requested date
  const dayPoint = forecast.series.find((s) => s.date === dateISO) ||
    forecast.series[forecast.series.length - 1];

  const currentProjected = dayPoint.close;
  const balanceAfterWithdrawal = currentProjected - amountPaise;

  const wouldBreachReserve = balanceAfterWithdrawal < reserve;
  const wouldGoNegative = balanceAfterWithdrawal < 0;
  const gapToReserve = Math.max(0, reserve - balanceAfterWithdrawal);

  // Check upcoming obligations in the 7 days after the proposed withdrawal date
  const afterDate = addDaysISO(dateISO, 7);
  const upcomingEvents = forecast.events.filter(
    (e) => e.direction === "out" && e.date >= dateISO && e.date <= afterDate
  );
  const upcomingCommitmentsNearDate = upcomingEvents.reduce((s, e) => s + e.amountPaise, 0);

  return {
    wouldBreachReserve,
    wouldGoNegative,
    balanceBefore: currentProjected,
    balanceAfterWithdrawal,
    gapToReserve,
    upcomingCommitmentsNearDate,
    upcomingEventsCount: upcomingEvents.length,
  };
}
