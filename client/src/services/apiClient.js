// ============================================================
// API Client — Axios instance wired to the FastAPI backend.
// Automatically injects the Firebase ID token as Bearer.
// ============================================================

import axios from "axios";
import { auth } from "./firebaseClient.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach Firebase Bearer token or stored JWT ──────────
apiClient.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      const stored = localStorage.getItem("cashflow-sentinel-token");
      if (stored) {
        config.headers.Authorization = `Bearer ${stored}`;
      }
    }
  } catch (err) {
    const stored = localStorage.getItem("cashflow-sentinel-token");
    if (stored) {
      config.headers.Authorization = `Bearer ${stored}`;
    } else {
      console.warn("Could not attach token:", err.message);
    }
  }
  return config;
});

// ── Response interceptor: normalize errors ────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";
    console.error("API Error:", msg, error.response?.status);
    return Promise.reject(new Error(msg));
  }
);

// ── Convenience wrappers ──────────────────────────────────────────────────────

export const api = {
  get: (url, config) => apiClient.get(url, config).then((r) => r.data),
  post: (url, data, config) => apiClient.post(url, data, config).then((r) => r.data),
  patch: (url, data, config) => apiClient.patch(url, data, config).then((r) => r.data),
  put: (url, data, config) => apiClient.put(url, data, config).then((r) => r.data),
  delete: (url, config) => apiClient.delete(url, config).then((r) => r.data),
};

// ── Auth endpoints ────────────────────────────────────────────────────────────
export const authApi = {
  /** Exchange Firebase ID token for backend session info */
  login: async (idToken, name) => {
    const res = await api.post("/api/auth/login", { idToken, name });
    if (res?.accessToken) {
      try { localStorage.setItem("cashflow-sentinel-token", res.accessToken); } catch {}
    }
    return res;
  },

  /** Create/update business owner profile + business in Firestore */
  ownerAuth: async (data) => {
    const res = await api.post("/api/auth/owner-auth", data);
    if (res?.accessToken) {
      try { localStorage.setItem("cashflow-sentinel-token", res.accessToken); } catch {}
    }
    return res;
  },

  /** Get current user profile */
  me: () => api.get("/api/auth/me"),

  /** Check server health */
  health: () => api.get("/api/health"),
};

// ── Business endpoints ────────────────────────────────────────────────────────
export const businessApi = {
  list: () => api.get("/api/businesses/"),
  get: (businessId) => api.get(`/api/businesses/${businessId}`),
  getFullData: (businessId) => api.get(`/api/businesses/${businessId}/full-data`),
  create: (data) => api.post("/api/businesses/", data),
  updateSettings: (businessId, patch) => api.patch(`/api/businesses/${businessId}/settings`, patch),
  clearData: (businessId) => api.post(`/api/businesses/${businessId}/clear-data`),
  seedSampleData: (businessId) => api.post(`/api/businesses/${businessId}/seed-sample-data`),
};

// ── Customer endpoints ────────────────────────────────────────────────────────
export const customerApi = {
  list: (bizId) => api.get(`/api/customers/${bizId}`),
  get: (bizId, custId) => api.get(`/api/customers/${bizId}/${custId}`),
  create: (bizId, data) => api.post(`/api/customers/${bizId}`, data),
  update: (bizId, custId, patch) => api.patch(`/api/customers/${bizId}/${custId}`, patch),
  delete: (bizId, custId) => api.delete(`/api/customers/${bizId}/${custId}`),
  bulkImport: (bizId, items) => api.post(`/api/customers/${bizId}/import/bulk`, items),
};

// ── Supplier endpoints ────────────────────────────────────────────────────────
export const supplierApi = {
  list: (bizId) => api.get(`/api/suppliers/${bizId}`),
  get: (bizId, supId) => api.get(`/api/suppliers/${bizId}/${supId}`),
  create: (bizId, data) => api.post(`/api/suppliers/${bizId}`, data),
  update: (bizId, supId, patch) => api.patch(`/api/suppliers/${bizId}/${supId}`, patch),
  delete: (bizId, supId) => api.delete(`/api/suppliers/${bizId}/${supId}`),
  bulkImport: (bizId, items) => api.post(`/api/suppliers/${bizId}/import/bulk`, items),
};

// ── Sales Invoice endpoints ───────────────────────────────────────────────────
export const salesInvoiceApi = {
  list: (bizId) => api.get(`/api/invoices/sales/${bizId}`),
  get: (bizId, invId) => api.get(`/api/invoices/sales/${bizId}/${invId}`),
  create: (bizId, data) => api.post(`/api/invoices/sales/${bizId}`, data),
  update: (bizId, invId, patch) => api.patch(`/api/invoices/sales/${bizId}/${invId}`, patch),
  delete: (bizId, invId) => api.delete(`/api/invoices/sales/${bizId}/${invId}`),
  recordPayment: (bizId, invId, data) => api.post(`/api/invoices/sales/${bizId}/${invId}/payments`, data),
  bulkImport: (bizId, items) => api.post(`/api/invoices/sales/${bizId}/import/bulk`, items),
};

// ── Purchase Invoice endpoints ────────────────────────────────────────────────
export const purchaseInvoiceApi = {
  list: (bizId) => api.get(`/api/invoices/purchase/${bizId}`),
  get: (bizId, invId) => api.get(`/api/invoices/purchase/${bizId}/${invId}`),
  create: (bizId, data) => api.post(`/api/invoices/purchase/${bizId}`, data),
  update: (bizId, invId, patch) => api.patch(`/api/invoices/purchase/${bizId}/${invId}`, patch),
  delete: (bizId, invId) => api.delete(`/api/invoices/purchase/${bizId}/${invId}`),
  recordPayment: (bizId, invId, data) => api.post(`/api/invoices/purchase/${bizId}/${invId}/payments`, data),
  bulkImport: (bizId, items) => api.post(`/api/invoices/purchase/${bizId}/import/bulk`, items),
};

// ── Transactions endpoints ────────────────────────────────────────────────────
export const transactionApi = {
  list: (bizId) => api.get(`/api/transactions/${bizId}`),
  create: (bizId, data) => api.post(`/api/transactions/${bizId}`, data),
  delete: (bizId, txnId) => api.delete(`/api/transactions/${bizId}/${txnId}`),
  bulkImport: (bizId, items) => api.post(`/api/transactions/${bizId}/import/bulk`, items),
};

// ── Expenses endpoints ────────────────────────────────────────────────────────
export const expenseApi = {
  list: (bizId) => api.get(`/api/expenses/${bizId}`),
  create: (bizId, data) => api.post(`/api/expenses/${bizId}`, data),
  update: (bizId, expId, patch) => api.patch(`/api/expenses/${bizId}/${expId}`, patch),
  delete: (bizId, expId) => api.delete(`/api/expenses/${bizId}/${expId}`),
};

// ── Forecast endpoints ────────────────────────────────────────────────────────
export const forecastApi = {
  get: (bizId, params) => api.get(`/api/forecast/${bizId}`, { params }),
};

// ── Alerts endpoints ──────────────────────────────────────────────────────────
export const alertsApi = {
  list: (bizId) => api.get(`/api/alerts/${bizId}`),
  update: (bizId, alertId, patch) => api.patch(`/api/alerts/${bizId}/${alertId}`, patch),
};

// ── Reports endpoints ─────────────────────────────────────────────────────────
export const reportsApi = {
  get: (bizId, type) => api.get(`/api/reports/${bizId}`, { params: { type } }),
};

// ── Scenarios endpoints ───────────────────────────────────────────────────────
export const scenarioApi = {
  list: (bizId) => api.get(`/api/scenarios/${bizId}`),
  create: (bizId, data) => api.post(`/api/scenarios/${bizId}`, data),
  update: (bizId, scenId, patch) => api.patch(`/api/scenarios/${bizId}/${scenId}`, patch),
  delete: (bizId, scenId) => api.delete(`/api/scenarios/${bizId}/${scenId}`),
  evaluate: (bizId, data) => api.post(`/api/scenarios/${bizId}/evaluate`, data),
};

// ── Deal Checker endpoints ────────────────────────────────────────────────────
export const dealApi = {
  check: (bizId, data) => api.post(`/api/deals/${bizId}/check`, data),
  evaluateIntelligence: (data, bizId) =>
    api.post(bizId ? `/api/deals/${bizId}/evaluate-intelligence` : "/api/deals/evaluate-intelligence", data),
};

// ── AI Assistant endpoints ────────────────────────────────────────────────────
export const assistantApi = {
  chat: (bizId, data) => api.post(`/api/assistant/${bizId}`, data),
};

// ── Settings endpoints ────────────────────────────────────────────────────────
export const settingsApi = {
  get: (bizId) => api.get(`/api/settings/${bizId}`),
  update: (bizId, patch) => api.patch(`/api/settings/${bizId}`, patch),
};

// ── Bank import endpoints ─────────────────────────────────────────────────────
export const bankApi = {
  importCSV: (bizId, data) => api.post(`/api/bank/${bizId}/import`, data),
};
