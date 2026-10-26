/**
 * AppContext.jsx — Dynamic Data from Backend API
 *
 * Replaces all static demoData.js with live Firestore data fetched
 * through the FastAPI backend. All mutations call the API and then
 * update local state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { businessApi, customerApi, supplierApi, salesInvoiceApi, purchaseInvoiceApi, transactionApi, expenseApi, alertsApi, scenarioApi } from "../services/apiClient.js";
import { buildForecast } from "../services/forecastService.js";
import { buildAlerts } from "../services/notificationService.js";
import { todayISO, addDaysISO } from "../utils/finance.js";
import { getInitialRecurringExpenses } from "../services/expenseService.js";
import { generateDataset, BUSINESSES, BUSINESS_SETTINGS } from "../data/demoData.js";

const AppContext = createContext(null);

// ── Default settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  currency: "INR",
  forecastHorizonDays: 30,
  minReservePaise: 20000000,
  uncertainReceiptHaircutPct: 0,
  notifyShortage: true,
  notifyOverdue: true,
  notifySupplierDue: true,
  reminderDefaultDays: 3,
  emailSignature: "Accounts team",
};

// ── Empty dataset shape ───────────────────────────────────────────────────────
function emptyDataset() {
  const seed = generateDataset("navkar", todayISO());
  return {
    currentCashPaise: seed.currentCashPaise || 54000000,
    openingBalancePaise: seed.currentCashPaise || 54000000,
    customers: seed.customers || [],
    suppliers: seed.suppliers || [],
    salesInvoices: seed.salesInvoices || [],
    purchaseInvoices: seed.purchaseInvoices || [],
    transactions: seed.transactions || [],
    expenses: seed.expenses || getInitialRecurringExpenses(),
    recurringExpenses: seed.recurringExpenses || getInitialRecurringExpenses(),
    reminders: seed.reminders || [],
    savedScenarios: seed.savedScenarios || [],
    alertMeta: {},
  };
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case "SET_FULL_DATA":
      return {
        ...state,
        dataset: { ...emptyDataset(), ...action.data },
        settings: action.settings || state.settings,
        business: action.business || state.business,
        loading: false,
        error: null,
      };

    case "SET_LOADING":
      return { ...state, loading: action.loading };

    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };

    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "UPDATE_BUSINESS":
      return { ...state, business: { ...state.business, ...action.patch } };

    case "ADD_TOAST": {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return { ...state, toasts: [...state.toasts, { id, ...action.toast }] };
    }
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    // ── Dataset mutations (applied optimistically after API call) ────────────

    case "SET_CUSTOMERS":
      return { ...state, dataset: { ...state.dataset, customers: action.customers } };

    case "ADD_CUSTOMER":
      return { ...state, dataset: { ...state.dataset, customers: [action.customer, ...state.dataset.customers] } };

    case "UPDATE_CUSTOMER":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          customers: state.dataset.customers.map((c) =>
            c.id === action.id ? { ...c, ...action.patch } : c
          ),
        },
      };

    case "REMOVE_CUSTOMER":
      return { ...state, dataset: { ...state.dataset, customers: state.dataset.customers.filter((c) => c.id !== action.id) } };

    case "SET_SUPPLIERS":
      return { ...state, dataset: { ...state.dataset, suppliers: action.suppliers } };

    case "ADD_SUPPLIER":
      return { ...state, dataset: { ...state.dataset, suppliers: [action.supplier, ...state.dataset.suppliers] } };

    case "UPDATE_SUPPLIER":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          suppliers: state.dataset.suppliers.map((s) =>
            s.id === action.id ? { ...s, ...action.patch } : s
          ),
        },
      };

    case "REMOVE_SUPPLIER":
      return { ...state, dataset: { ...state.dataset, suppliers: state.dataset.suppliers.filter((s) => s.id !== action.id) } };

    case "ADD_SALES_INVOICE":
      return { ...state, dataset: { ...state.dataset, salesInvoices: [action.invoice, ...state.dataset.salesInvoices] } };

    case "UPDATE_SALES_INVOICE":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          salesInvoices: state.dataset.salesInvoices.map((i) =>
            i.id === action.id ? { ...i, ...action.patch } : i
          ),
        },
      };

    case "REMOVE_SALES_INVOICE":
      return { ...state, dataset: { ...state.dataset, salesInvoices: state.dataset.salesInvoices.filter((i) => i.id !== action.id) } };

    case "SET_SALES_INVOICES":
      return { ...state, dataset: { ...state.dataset, salesInvoices: action.invoices } };

    case "ADD_PURCHASE_INVOICE":
      return { ...state, dataset: { ...state.dataset, purchaseInvoices: [action.invoice, ...state.dataset.purchaseInvoices] } };

    case "UPDATE_PURCHASE_INVOICE":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          purchaseInvoices: state.dataset.purchaseInvoices.map((i) =>
            i.id === action.id ? { ...i, ...action.patch } : i
          ),
        },
      };

    case "REMOVE_PURCHASE_INVOICE":
      return { ...state, dataset: { ...state.dataset, purchaseInvoices: state.dataset.purchaseInvoices.filter((i) => i.id !== action.id) } };

    case "SET_PURCHASE_INVOICES":
      return { ...state, dataset: { ...state.dataset, purchaseInvoices: action.invoices } };

    case "ADD_TRANSACTION":
      return { ...state, dataset: { ...state.dataset, transactions: [action.transaction, ...state.dataset.transactions] } };

    case "SET_TRANSACTIONS":
      return { ...state, dataset: { ...state.dataset, transactions: action.transactions } };

    case "UPDATE_CASH_BALANCE":
      return { ...state, dataset: { ...state.dataset, currentCashPaise: action.amountPaise } };

    case "ADD_RECURRING_EXPENSE":
      return { ...state, dataset: { ...state.dataset, expenses: [action.expense, ...state.dataset.expenses] } };

    case "UPDATE_RECURRING_EXPENSE":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          expenses: state.dataset.expenses.map((e) =>
            e.id === action.id ? { ...e, ...action.patch } : e
          ),
        },
      };

    case "REMOVE_RECURRING_EXPENSE":
      return { ...state, dataset: { ...state.dataset, expenses: state.dataset.expenses.filter((e) => e.id !== action.id) } };

    case "TOGGLE_RECURRING_EXPENSE":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          expenses: state.dataset.expenses.map((e) =>
            e.id === action.id ? { ...e, active: !e.active } : e
          ),
        },
      };

    case "ADD_REMINDER":
      return { ...state, dataset: { ...state.dataset, reminders: [action.reminder, ...(state.dataset.reminders || [])] } };

    case "UPDATE_REMINDER":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          reminders: (state.dataset.reminders || []).map((r) =>
            r.id === action.id ? { ...r, ...action.patch } : r
          ),
        },
      };

    case "CANCEL_REMINDER":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          reminders: (state.dataset.reminders || []).map((r) =>
            r.id === action.id && r.status !== "cancelled"
              ? { ...r, status: "cancelled", history: [...(r.history || []), { date: todayISO(), event: "Reminder cancelled by user" }] }
              : r
          ),
        },
      };

    case "ALERT_META":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          alertMeta: {
            ...(state.dataset.alertMeta || {}),
            [action.alertId]: { read: action.read, resolved: action.resolved },
          },
        },
      };

    case "SAVE_SCENARIO":
      return { ...state, dataset: { ...state.dataset, savedScenarios: [action.scenario, ...(state.dataset.savedScenarios || [])] } };

    case "DELETE_SCENARIO":
      return { ...state, dataset: { ...state.dataset, savedScenarios: (state.dataset.savedScenarios || []).filter((s) => s.id !== action.id) } };

    case "UPDATE_SCENARIO_STATUS":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          savedScenarios: (state.dataset.savedScenarios || []).map((s) =>
            s.id === action.id ? { ...s, status: action.status } : s
          ),
        },
      };

    case "APPLY_SCENARIO": {
      let salesInvoices = [...state.dataset.salesInvoices];
      let purchaseInvoices = [...state.dataset.purchaseInvoices];
      (action.adjustments || []).forEach((adj) => {
        if (adj.type === "delayInvoice" && adj.invoiceType === "sales") {
          salesInvoices = salesInvoices.map((i) =>
            i.id === adj.invoiceId && i.paidPaise < i.amountPaise
              ? { ...i, expectedPaymentDate: addDaysISO(i.expectedPaymentDate, adj.days), notes: [...(i.notes || []), { date: todayISO(), text: `Expected payment moved by ${adj.days} days from Scenario Lab.` }] }
              : i
          );
        }
        if (adj.type === "supplierExtension" || adj.type === "postponePurchase") {
          purchaseInvoices = purchaseInvoices.map((i) =>
            i.id === adj.invoiceId && i.paidPaise < i.amountPaise
              ? { ...i, plannedPaymentDate: addDaysISO(i.plannedPaymentDate, adj.days), notes: [...(i.notes || []), { date: todayISO(), text: `Planned payment moved by ${adj.days} days from Scenario Lab.` }] }
              : i
          );
        }
      });
      return { ...state, dataset: { ...state.dataset, salesInvoices, purchaseInvoices } };
    }

    case "SET_LAST_DEAL":
      return { ...state, lastDeal: action.deal };

    case "SET_SCENARIO_DRAFT":
      return { ...state, scenarioDraft: action.draft };

    case "IMPORT_CUSTOMERS":
      return { ...state, dataset: { ...state.dataset, customers: [...action.customers, ...state.dataset.customers] } };

    case "IMPORT_SUPPLIERS":
      return { ...state, dataset: { ...state.dataset, suppliers: [...action.suppliers, ...state.dataset.suppliers] } };

    case "IMPORT_INVOICES":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          salesInvoices: action.invoiceType === "sales"
            ? [...action.invoices, ...state.dataset.salesInvoices]
            : state.dataset.salesInvoices,
          purchaseInvoices: action.invoiceType === "purchase"
            ? [...action.invoices, ...state.dataset.purchaseInvoices]
            : state.dataset.purchaseInvoices,
          customers: action.invoiceType === "sales" && action.newParties?.length
            ? [...state.dataset.customers, ...action.newParties]
            : state.dataset.customers,
          suppliers: action.invoiceType === "purchase" && action.newParties?.length
            ? [...state.dataset.suppliers, ...action.newParties]
            : state.dataset.suppliers,
        },
      };

    case "IMPORT_BANK_TRANSACTIONS":
      return {
        ...state,
        dataset: {
          ...state.dataset,
          currentCashPaise: action.newBalancePaise != null ? action.newBalancePaise : state.dataset.currentCashPaise,
          transactions: [...action.transactions, ...state.dataset.transactions],
        },
      };

    case "RECORD_PAYMENT": {
      const { invoiceType, invoiceId, amountPaise, dateISO, label } = action;
      const key = invoiceType === "sales" ? "salesInvoices" : "purchaseInvoices";
      const invoices = state.dataset[key].map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const newPaid = Math.min(inv.amountPaise, (inv.paidPaise || 0) + amountPaise);
        return {
          ...inv,
          paidPaise: newPaid,
          actualPaymentDate: newPaid >= inv.amountPaise ? dateISO : inv.actualPaymentDate,
          notes: [...(inv.notes || []), { date: dateISO, text: label || `Payment of ${amountPaise / 100} recorded.` }],
        };
      });
      const tx = {
        id: `tx-pay-${Date.now()}`,
        date: dateISO,
        label: label || (invoiceType === "sales" ? "Invoice receipt recorded" : "Supplier payment recorded"),
        category: invoiceType === "sales" ? "invoice-receipt" : "supplier-payment",
        direction: invoiceType === "sales" ? "in" : "out",
        amountPaise,
        status: "actual",
        ref: { kind: `${invoiceType}-invoice`, id: invoiceId },
      };
      return {
        ...state,
        dataset: {
          ...state.dataset,
          [key]: invoices,
          transactions: [tx, ...state.dataset.transactions],
        },
      };
    }

    case "RECORD_OWNER_WITHDRAWAL": {
      const tx = {
        id: `tx-draw-${Date.now()}`,
        date: action.date || todayISO(),
        label: action.label || "Owner Withdrawal",
        category: "owner-draw",
        direction: "out",
        amountPaise: action.amountPaise,
        status: action.status || "confirmed",
        isOwnerDraw: true,
        notes: action.notes || "Personal withdrawal",
      };
      return { ...state, dataset: { ...state.dataset, transactions: [tx, ...state.dataset.transactions] } };
    }

    case "RESET_DATA":
      return { ...state, dataset: emptyDataset(), loading: false };

    default:
      return state;
  }
}

// ── Initial state ─────────────────────────────────────────────────────────────
function initialState() {
  return {
    dataset: emptyDataset(),
    business: BUSINESSES[0],
    settings: DEFAULT_SETTINGS,
    loading: false,
    error: null,
    toasts: [],
    lastDeal: null,
    scenarioDraft: null,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [refreshTick, setRefreshTick] = useState(0);

  const businessId = user?.businessId;

  // ── Load full business data from API ─────────────────────────────────────
  useEffect(() => {
    if (!businessId) {
      dispatch({ type: "SET_LOADING", loading: false });
      return;
    }

    let cancelled = false;
    dispatch({ type: "SET_LOADING", loading: true });

    businessApi
      .getFullData(businessId)
      .then((data) => {
        if (cancelled) return;
        const settingsFromBiz = data?.business?.settings || {};
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          currency: settingsFromBiz.currency || "INR",
          forecastHorizonDays: settingsFromBiz.forecastHorizonDays || 30,
          minReservePaise: settingsFromBiz.minReservePaise || 20000000,
          emailSignature: settingsFromBiz.emailSignature || `Accounts — ${data?.business?.name || "Business"}`,
          notifyShortage: settingsFromBiz.notifyShortage !== false,
          notifyOverdue: settingsFromBiz.notifyOverdue !== false,
          notifySupplierDue: settingsFromBiz.notifySupplierDue !== false,
          reminderDefaultDays: settingsFromBiz.reminderDefaultDays || 3,
        };

        // Build alertMeta map from array
        const alertMetaArr = data.alertMeta || [];
        const alertMeta = {};
        alertMetaArr.forEach((a) => { if (a.id) alertMeta[a.id] = a; });

        dispatch({
          type: "SET_FULL_DATA",
          data: {
            currentCashPaise: data.currentCashPaise || 0,
            openingBalancePaise: data.openingBalancePaise || 0,
            customers: data.customers || [],
            suppliers: data.suppliers || [],
            salesInvoices: data.salesInvoices || [],
            purchaseInvoices: data.purchaseInvoices || [],
            transactions: data.transactions || [],
            expenses: data.expenses || [],
            recurringExpenses: (data.expenses || []).filter((e) => e.recurring),
            reminders: data.reminders || [],
            savedScenarios: data.savedScenarios || [],
            alertMeta,
          },
          settings: mergedSettings,
          business: data.business || null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const fallback = generateDataset(businessId || "navkar", todayISO());
        const biz = BUSINESSES.find((b) => b.id === businessId) || BUSINESSES[0];
        const bizSettings = BUSINESS_SETTINGS[businessId] || DEFAULT_SETTINGS;
        dispatch({
          type: "SET_FULL_DATA",
          data: {
            ...emptyDataset(),
            ...fallback,
          },
          settings: bizSettings,
          business: biz,
        });
      });

    return () => { cancelled = true; };
  }, [businessId, refreshTick]);

  // ── Refresh helper ────────────────────────────────────────────────────────
  const refreshData = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  // ── Seed realistic dynamic data helper ────────────────────────────────────
  const seedSampleData = useCallback(async () => {
    if (!businessId) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      await businessApi.seedSampleData(businessId);
      refreshData();
      toast("Generated realistic SME data into your database!", "success");
    } catch (err) {
      toast("Failed to seed sample data: " + err.message, "error");
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [businessId, refreshData]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const dataset = useMemo(() => {
    const recurringExpenses =
      state.dataset.recurringExpenses?.length > 0
        ? state.dataset.recurringExpenses
        : (state.dataset.expenses || []).filter((e) => e.active !== false && e.amountPaise > 0);
    return { ...state.dataset, recurringExpenses };
  }, [state.dataset]);

  const forecast = useMemo(
    () => buildForecast(dataset, state.settings, {}),
    [dataset, state.settings]
  );

  const alerts = useMemo(
    () => buildAlerts(dataset, state.settings, forecast, { lastDeal: state.lastDeal }),
    [dataset, state.settings, forecast, state.lastDeal]
  );

  const unreadCount = alerts.filter((a) => {
    const meta = dataset.alertMeta?.[a.id];
    return !(meta?.read) && !(meta?.resolved);
  }).length;

  const toast = (message, severity = "success") =>
    dispatch({ type: "ADD_TOAST", toast: { message, severity } });

  const value = {
    state,
    dispatch,
    dataset,
    settings: state.settings,
    business: state.business,
    businesses: state.business ? [state.business] : [],
    forecast,
    alerts,
    unreadCount,
    toast,
    loading: state.loading,
    error: state.error,
    refreshData,
    seedSampleData,
    businessId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
