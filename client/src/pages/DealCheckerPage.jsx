import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import Paper from "@mui/material/Paper";

import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  Database,
  Eye,
  FileSpreadsheet,
  GitBranch,
  Layers,
  Network,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  Truck,
  Wallet,
  X,
} from "lucide-react";

import { useApp } from "../context/AppContext.jsx";
import { dealApi } from "../services/apiClient.js";
import { PageHeader, RiskChip } from "../components/common.jsx";
import {
  customerRiskLevel,
  customerPaymentStats,
} from "../utils/calculations.js";
import { formatINR, formatDisplay, formatPct, todayISO, addDaysISO, daysBetween } from "../utils/finance.js";

const EMPTY_ARRAY = Object.freeze([]);
const MODEL_ENDPOINT = (import.meta.env?.VITE_DEAL_INTELLIGENCE_API_URL || "http://localhost:8000/api/deals/evaluate-intelligence").trim();

// Five clearly-labelled demo customers for a working offline demonstration.
// Values are synthetic examples, not real customers or model predictions.
const DEMO_CUSTOMERS = [
  { id: "demo-customer-1", name: "Demo Sample 1 · Stable payer", isDemoSample: true, termsDays: 30, paymentHistory: [{ delayDays: 2, amountPaise: 12500000 }, { delayDays: 3, amountPaise: 9800000 }, { delayDays: 1, amountPaise: 14200000 }] },
  { id: "demo-customer-2", name: "Demo Sample 2 · Tight cash", isDemoSample: true, termsDays: 30, paymentHistory: [{ delayDays: 12, amountPaise: 18000000 }, { delayDays: 18, amountPaise: 9500000 }, { delayDays: 15, amountPaise: 21000000 }] },
  { id: "demo-customer-3", name: "Demo Sample 3 · Uneven timing", isDemoSample: true, termsDays: 21, paymentHistory: [{ delayDays: 5, amountPaise: 11000000 }, { delayDays: 14, amountPaise: 16000000 }, { delayDays: 9, amountPaise: 8700000 }] },
  { id: "demo-customer-4", name: "Demo Sample 4 · Early receipts", isDemoSample: true, termsDays: 15, paymentHistory: [{ delayDays: 0, amountPaise: 15500000 }, { delayDays: 2, amountPaise: 13200000 }, { delayDays: 3, amountPaise: 17600000 }] },
  { id: "demo-customer-5", name: "Demo Sample 5 · Late payer", isDemoSample: true, termsDays: 45, paymentHistory: [{ delayDays: 20, amountPaise: 7600000 }, { delayDays: 24, amountPaise: 12300000 }, { delayDays: 18, amountPaise: 9200000 }] },
];

function makeDemoDataset(customer, today) {
  const samples = {
    "demo-customer-1": { cash: 48000000, sales: [[16000000, 8], [8500000, 24]], purchases: [[10000000, 5], [6500000, 15]] },
    "demo-customer-2": { cash: 8500000, sales: [[22000000, 20], [4000000, 35]], purchases: [[14000000, 5], [6000000, 10]] },
    "demo-customer-3": { cash: 24000000, sales: [[12000000, 14], [9500000, 29]], purchases: [[19000000, 8], [3500000, 20]] },
    "demo-customer-4": { cash: 17500000, sales: [[26000000, 6], [8000000, 18]], purchases: [[9000000, 9], [7000000, 12]] },
    "demo-customer-5": { cash: 12000000, sales: [[9500000, 25], [5500000, 40]], purchases: [[13000000, 7], [4500000, 16]] },
  };
  const sample = samples[customer?.id] || samples["demo-customer-1"];
  const invoice = (kind, item, index) => ({
    id: `${customer.id}-${kind}-${index + 1}`,
    invoiceNumber: `${kind === "sale" ? "DS" : "DP"}-${String(index + 1).padStart(3, "0")}`,
    partyId: customer.id,
    amountPaise: item[0],
    paidPaise: 0,
    dueDate: addDaysISO(today, item[1]),
    expectedPaymentDate: addDaysISO(today, item[1]),
    status: "open",
    isDraft: false,
  });
  return {
    currentCashPaise: sample.cash,
    customers: [customer],
    salesInvoices: sample.sales.map((item, index) => invoice("sale", item, index)),
    purchaseInvoices: sample.purchases.map((item, index) => invoice("purchase", item, index)),
    transactions: [
      { id: `${customer.id}-tx-1`, date: addDaysISO(today, 3), amountPaise: 1500000, direction: "out", category: "Demo operating expense" },
      { id: `${customer.id}-tx-2`, date: addDaysISO(today, 32), amountPaise: 3000000, direction: "in", category: "Demo other receipt" },
    ],
    suppliers: [],
  };
}

const C = {
  ink: "#173329",
  muted: "#61766b",
  subtle: "#87978e",
  border: "#e0eae3",
  green: "#176b52",
  greenDeep: "#104b39",
  greenSoft: "#e9f5ee",
  mint: "#70d6b1",
  blue: "#426e87",
  blueSoft: "#edf5fa",
  amber: "#a66a0c",
  amberSoft: "#fff5df",
  red: "#bd403b",
  redSoft: "#fff0ee",
};

const PANEL_SX = {
  minWidth: 0,
  border: `1px solid ${C.border}`,
  borderRadius: "20px",
  background: "rgba(255,255,255,0.96)",
  boxShadow: "0 6px 26px rgba(23,64,44,0.04)",
  backdropFilter: "blur(14px)",
  transition: "all 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
};

const BUTTON_SX = {
  textTransform: "none",
  fontWeight: 800,
  fontSize: 12.5,
  borderRadius: "11px",
  minHeight: 42,
  px: 1.65,
};

const VERDICTS = {
  feasible: { label: "No shortfall in recorded data", color: C.green, soft: C.greenSoft, icon: CheckCircle2 },
  "revised-terms": { label: "Consider revised payment terms", color: C.amber, soft: C.amberSoft, icon: AlertTriangle },
  "cash-risk": { label: "Cash-flow risk detected", color: C.red, soft: C.redSoft, icon: AlertTriangle },
  insufficient: { label: "More information is required", color: C.blue, soft: C.blueSoft, icon: Activity },
};

/*
 * Expected optional FastAPI response contract:
 * {
 *   models: {
 *     lstm: { predicted_delay_days, predicted_payment_date, late_probability, confidence, explanation },
 *     catboost: { shortage_probability, shortage_amount_paise, shortage_date, risk_level, explanation }
 *   },
 *   graph: { database: "neo4j", nodes: [{id,label,detail,type}], edges: [{source,target,label}] },
 *   agent: { summary, findings: [], recommended_actions: [] }
 * }
 *
 * The model endpoint is optional for the UI. When absent/unreachable, the page
 * shows a clearly labelled local finance-rule preview and does NOT pretend that
 * an LSTM, CatBoost model, AI agent, or Neo4j database ran.
 */

function moneyInputToPaise(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : 0;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function riskColor(value) {
  const risk = String(value || "").toLowerCase();
  if (risk.includes("no shortage") || risk.includes("low shortage") || risk.includes("no breach") || risk.includes("stable")) return C.green;
  if (risk.includes("critical") || risk.includes("high") || risk.includes("shortage") || risk.includes("breach")) return C.red;
  if (risk.includes("medium") || risk.includes("moderate") || risk.includes("warning")) return C.amber;
  if (risk.includes("low") || risk.includes("safe") || risk.includes("feasible")) return C.green;
  return C.blue;
}

function formatProbability(value) {
  if (value === null || value === undefined || value === "") return "Not available";
  const n = Number(value);
  if (!Number.isFinite(n)) return "Not available";
  return `${Math.round(Math.max(0, Math.min(1, n > 1 ? n / 100 : n)) * 100)}%`;
}

function formatModelMoney(model, paiseKeys = [], rupeeKeys = []) {
  for (const key of paiseKeys) {
    if (model?.[key] !== undefined && model?.[key] !== null) {
      return formatINR(safeNumber(model[key]));
    }
  }
  for (const key of rupeeKeys) {
    if (model?.[key] !== undefined && model?.[key] !== null) {
      return formatINR(moneyInputToPaise(model[key]));
    }
  }
  return "Not available";
}

function makeEngineForm(form, customer) {
  // Demo mode has no cost inputs. Never fabricate material, shipping, or overhead costs.
  return {
    dealName: `New deal — ${customer?.name || "Customer"}`,
    customerId: customer?.id || "",
    supplierId: "",
    product: "New deal",
    qty: 1,
    sellPrice: safeNumber(form.dealAmount),
    unitCost: 0,
    shippingCost: 0,
    otherCosts: 0,
    existingInventory: 0,
    additionalInventory: "",
    customerTerms: customer?.termsDays != null ? `${customer.termsDays} days` : "Not provided",
    customerPaymentDate: form.expectedPaymentDate,
    supplierTerms: "Not provided",
    supplierPaymentDate: "",
    productionDate: "",
  };
}



function isOpenInvoice(invoice) {
  if (!invoice || invoice.isDraft) return false;
  const status = String(invoice.status || "").toLowerCase();
  if (["paid", "settled", "closed", "cancelled", "canceled", "void"].includes(status)) return false;
  return outstandingAmount(invoice) > 0;
}

function buildLocalCashPreview({ customer, form, dataset: analysisDataset, receiptDate }) {
  // The dataset passed in is exposed under the local name `dataset` for the code below.
  const dataset = analysisDataset;
  const cashRaw = dataset?.currentCashPaise;
  const currentCash = Number(cashRaw);
  const hasCash = cashRaw !== undefined && cashRaw !== null && cashRaw !== "" && Number.isFinite(currentCash);
  const sales = Array.isArray(dataset?.salesInvoices) ? dataset.salesInvoices : EMPTY_ARRAY;
  const purchases = Array.isArray(dataset?.purchaseInvoices) ? dataset.purchaseInvoices : EMPTY_ARRAY;
  const transactions = Array.isArray(dataset?.transactions) ? dataset.transactions : EMPTY_ARRAY;
  const events = [];
  const horizon = addDaysISO(todayISO(), 90);

  sales.filter(isOpenInvoice).forEach((invoice) => {
    const date = invoice.expectedPaymentDate || invoice.dueDate;
    if (date && date >= todayISO() && date <= horizon) {
      events.push({ date, amount: outstandingAmount(invoice), kind: "receivable", label: invoice.invoiceNumber || invoice.id || "Open receivable" });
    }
  });
  purchases.filter(isOpenInvoice).forEach((invoice) => {
    const date = invoice.expectedPaymentDate || invoice.dueDate;
    if (date && date >= todayISO() && date <= horizon) {
      events.push({ date, amount: -outstandingAmount(invoice), kind: "payable", label: invoice.invoiceNumber || invoice.id || "Open payable" });
    }
  });
  // Only include future ledger movements that are not explicitly linked to an invoice,
  // reducing the risk of counting the same invoice payment twice.
  transactions.forEach((transaction) => {
    const date = transaction.date || transaction.transactionDate;
    if (!date || date < todayISO() || date > horizon || transaction.invoiceId || transaction.invoice_id) return;
    const amount = Math.abs(safeNumber(transaction.amountPaise));
    if (!amount) return;
    const direction = String(transaction.direction || "").toLowerCase();
    if (direction === "in" || direction === "income" || direction === "credit") events.push({ date, amount, kind: "transaction-in", label: transaction.category || "Future ledger inflow" });
    if (direction === "out" || direction === "expense" || direction === "debit") events.push({ date, amount: -amount, kind: "transaction-out", label: transaction.category || "Future ledger outflow" });
  });

  const dealDate = receiptDate || form.expectedPaymentDate;
  const dealAmountPaise = moneyInputToPaise(form.dealAmount);
  if (dealDate && dealDate >= todayISO() && dealDate <= horizon) {
    events.push({ date: dealDate, amount: dealAmountPaise, kind: "proposed-deal", label: "Proposed deal receipt" });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  let running = hasCash ? currentCash : null;
  let minimum = running;
  let breachDate = null;
  const daily = [];
  if (running != null) {
    const byDate = new Map();
    events.forEach((event) => byDate.set(event.date, (byDate.get(event.date) || 0) + event.amount));
    [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([date, movement]) => {
      running += movement;
      daily.push({ date, closePaise: running, movementPaise: movement });
      if (minimum == null || running < minimum) minimum = running;
      if (running < 0 && !breachDate) breachDate = date;
    });
  }

  const stats = customer ? customerPaymentStats(customer) : null;
  const avgDelay = stats?.avgDelay !== undefined && stats?.avgDelay !== null && Number.isFinite(Number(stats.avgDelay)) ? Number(stats.avgDelay) : null;
  let verdict = "insufficient";
  if (hasCash) verdict = minimum < 0 ? "cash-risk" : "feasible";
  const reasons = [];
  if (!hasCash) reasons.push("Current cash is unavailable, so the local cash forecast cannot calculate a reliable closing balance.");
  else if (minimum < 0) reasons.push(`Recorded future receipts and commitments produce a negative projected balance around ${formatDisplay(breachDate)}.`);
  else reasons.push("No negative balance was found in the recorded 90-day cash movements. Missing or unrecorded costs can change this result.");
  if (avgDelay != null) reasons.push(`Recorded customer history shows an average delay of ${avgDelay.toFixed(1)} days across ${stats?.n || 0} payment records; this is descriptive history, not an LSTM prediction.`);
  reasons.push("No product cost, shipping cost, overhead, or inventory cost was assumed because those values were not requested in the form.");

  return {
    verdict,
    revenuePaise: dealAmountPaise,
    currentCashPaise: hasCash ? currentCash : null,
    minBalancePaise: minimum,
    projectedMinimumPaise: minimum,
    breach: breachDate ? { date: breachDate } : null,
    causesNewBreach: Boolean(breachDate),
    daysToPayment: Math.max(0, Math.round((new Date(`${dealDate}T00:00:00Z`) - new Date(`${todayISO()}T00:00:00Z`)) / 86400000)),
    reasons,
    events,
    daily,
    customerAverageDelay: avgDelay,
    assumptions: ["Local demo preview uses recorded current cash, open invoice balances/dates, unlinked future ledger movements, and the proposed receipt only.", "It is not an LSTM, CatBoost, AI-agent, or Neo4j result."],
  };
}

function makeFallbackGraph({ customer, form, financeResult, dataset: analysisDataset, receiptDate }) {
  const dataset = analysisDataset;
  const sales = (Array.isArray(dataset?.salesInvoices) ? dataset.salesInvoices : EMPTY_ARRAY).filter(isOpenInvoice);
  const purchases = (Array.isArray(dataset?.purchaseInvoices) ? dataset.purchaseInvoices : EMPTY_ARRAY).filter(isOpenInvoice);
  const future = (items, kind) => items
    .filter((invoice) => {
      const date = invoice.expectedPaymentDate || invoice.dueDate;
      return date && date >= todayISO() && date <= addDaysISO(todayISO(), 90);
    })
    .sort((a, b) => String(a.expectedPaymentDate || a.dueDate).localeCompare(String(b.expectedPaymentDate || b.dueDate)))
    .slice(0, 4)
    .map((invoice, index) => ({
      id: `${kind}-${invoice.id ?? index}`,
      label: `${kind === "receivable" ? "Receivable" : "Payable"} ${invoice.invoiceNumber || invoice.id || index + 1}`,
      detail: `${formatINR(outstandingAmount(invoice), { compact: true })} · ${formatDisplay(invoice.expectedPaymentDate || invoice.dueDate)}`,
      type: kind,
      date: invoice.expectedPaymentDate || invoice.dueDate,
      amountPaise: outstandingAmount(invoice),
    }));
  const receivables = future(sales, "receivable");
  const payables = future(purchases, "payable");
  const avgDelayVal = customer ? customerPaymentStats(customer)?.avgDelay : null;
  const isCashRisk = financeResult?.verdict === "cash-risk" || (minValue != null && minValue < 0);
  const nodes = [
    { id: "customer", label: customer?.name || "Selected customer", detail: `${Array.isArray(customer?.paymentHistory) ? customer.paymentHistory.length : 0} recorded payment(s)`, type: "customer" },
    { id: "deal", label: "Proposed deal", detail: `${formatINR(moneyInputToPaise(form.dealAmount), { compact: true })} total value`, type: "deal" },
    { id: "delay-model", label: "Model 1: Delay Predictor", detail: `${avgDelayVal != null ? safeNumber(avgDelayVal).toFixed(1) : "0.0"}d predicted delay`, type: "delay-prediction" },
    { id: "receipt", label: "Adjusted receipt", detail: formatDisplay(receiptDate || form.expectedPaymentDate), type: "receipt", date: receiptDate || form.expectedPaymentDate },
    { id: "commitments", label: "Open commitments", detail: `${payables.length} payable(s) · ${formatINR(payableTotal, { compact: true })}`, type: "commitment" },
    ...receivables,
    ...payables,
    { id: "cash", label: "Projected cash position", detail: minValue == null ? "Current cash unavailable" : `Low point ${formatINR(minValue, { compact: true })}`, type: isCashRisk ? "risk" : "cash" },
    { id: "shortage-model", label: "Model 2: Shortage Detection", detail: isCashRisk ? `Deficit risk on ${formatDisplay(financeResult?.breach?.date)}` : "Buffer intact (no shortage)", type: isCashRisk ? "shortage-risk" : "safe-buffer" },
  ];
  const edges = [
    { source: "customer", target: "delay-model", label: "customer history informs delay" },
    { source: "deal", target: "delay-model", label: "deal terms & pricing" },
    { source: "delay-model", target: "receipt", label: "shifts cash receipt timing" },
    { source: "receipt", target: "cash", label: "delayed inflow" },
    { source: "commitments", target: "cash", label: "recorded payable exposure" },
    { source: "cash", target: "shortage-model", label: "liquidity runway stress test" },
    { source: "delay-model", target: "shortage-model", label: "delay extends cash squeeze" },
    ...receivables.map((node) => ({ source: node.id, target: "cash", label: "expected inflow" })),
    ...payables.map((node) => ({ source: node.id, target: "cash", label: "cash commitment" })),
    ...receivables.map((node) => ({ source: "customer", target: node.id, label: "customer receivable" })),
    ...(receivableTotal > 0 ? [{ source: "commitments", target: "receipt", label: "timing context" }] : []),
  ];
  return { database: "graph_theory", mode: "demo", nodes, edges };
}

function outstandingAmount(invoice) {
  const explicit = firstDefined(invoice.outstandingPaise, invoice.balancePaise, invoice.remainingPaise);
  if (explicit !== undefined) return Math.max(0, safeNumber(explicit));
  const amount = safeNumber(invoice.amountPaise);
  const paid = safeNumber(invoice.paidPaise);
  return Math.max(0, amount - paid);
}

function normalizeProbability(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
}

function normalizeIntelligence(raw) {
  const data = raw?.data || raw || {};
  const models = data.models || {};
  const graph = data.graph || null;
  const agent = data.agent || null;
  const lstm = models.lstm || data.customerPaymentPrediction || null;
  const catboostRaw = models.catboost || null;
  const rawProbability = firstDefined(catboostRaw?.shortage_probability, catboostRaw?.probability);
  const catboost = catboostRaw ? { ...catboostRaw, shortage_probability: normalizeProbability(rawProbability) } : null;
  const shipment = models.shipment || data.shipmentDelayPrediction || null;
  return {
    raw: data,
    lstm,
    catboost,
    shipment,
    graph,
    agent,
    neo4jConnected: data.neo4j?.connected === true || graph?.database === "neo4j",
  };
}

function buildBackendPayload({ customer, form, dataset: analysisDataset, today }) {
  const dataset = analysisDataset;
  const horizon = addDaysISO(today, 90);
  const withinWindow = (item) => {
    const date = item?.expectedPaymentDate || item?.dueDate || item?.date || item?.transactionDate;
    return date && date >= today && date <= horizon;
  };
  const salesInvoices = (Array.isArray(dataset?.salesInvoices) ? dataset.salesInvoices : EMPTY_ARRAY)
    .filter((invoice) => !invoice.isDraft && (String(invoice.partyId) === String(customer.id) || withinWindow(invoice)));
  const purchaseInvoices = (Array.isArray(dataset?.purchaseInvoices) ? dataset.purchaseInvoices : EMPTY_ARRAY).filter((invoice) => !invoice.isDraft && withinWindow(invoice));
  const transactions = (Array.isArray(dataset?.transactions) ? dataset.transactions : EMPTY_ARRAY).filter((item) => withinWindow(item));

  const rawHistory = Array.isArray(customer?.paymentHistory) ? customer.paymentHistory : [];
  const termsDays = Number(customer?.termsDays || 30);
  const customerCity = customer?.city || form.city || "Pune";
  const customerRegion = customer?.region || form.region || "West";
  const customerZip = customer?.zipcode || form.zipcode || "411001";
  const paymentMethod = form.paymentMethod || "Bank Transfer";

  // Full 13 Customer Payment History input records
  const customerHistory = rawHistory.map((entry, idx) => ({
    Cust_Num: String(customer?.id || "CUST-001"),
    Document_No: `HIST-INV-${String(idx + 1).padStart(3, "0")}`,
    Doc_Date: addDaysISO(today, -60 - (rawHistory.length - idx) * 15),
    Net_Due_Date: addDaysISO(today, -30 - (rawHistory.length - idx) * 15),
    Clearing_date: addDaysISO(today, -30 - (rawHistory.length - idx) * 15 + Math.round(Number(entry.delayDays || 0))),
    Days_Overdue_Delay: Number(entry.delayDays ?? 0),
    Amount: Number((entry.amountPaise ?? 5000000) / 100),
    Payment_Term: termsDays,
    Rank_of_order_by_customer: idx + 1,
    Payment_Method_description: paymentMethod,
    Region: customerRegion,
    City: customerCity,
    Zipcode: customerZip,
  }));

  // Full 11 New Invoice Details inputs
  const invoiceDetails = {
    Cust_Num: String(customer?.id || "CUST-001"),
    Document_No: form.documentNo || `INV-${today.replace(/-/g, "").slice(2)}-01`,
    Doc_Date: today,
    Net_Due_Date: form.expectedPaymentDate,
    Amount: Number(form.dealAmount || 0),
    Payment_Term: termsDays,
    Rank_of_order_by_customer: customerHistory.length + 1,
    Payment_Method_description: paymentMethod,
    Region: customerRegion,
    City: customerCity,
    Zipcode: customerZip,
  };

  return {
    asOfDate: today,
    customer: {
      id: customer.id,
      name: customer.name,
      termsDays: termsDays,
      city: customerCity,
      region: customerRegion,
      zipcode: customerZip,
      paymentMethod: paymentMethod,
      paymentHistory: rawHistory.map((entry) => ({
        delayDays: entry.delayDays ?? null,
        amountPaise: entry.amountPaise ?? null,
        date: entry.date ?? entry.paymentDate ?? null,
      })),
    },
    deal: {
      totalAmountPaise: moneyInputToPaise(form.dealAmount),
      expectedPaymentDate: form.expectedPaymentDate,
    },
    customerHistory,
    invoiceDetails,
    sellPrice: Number(form.dealAmount || 0),
    order_amount: Number(form.dealAmount || 0),
    scheduled_shipping_days: Number(form.scheduledShippingDays || 4),
    shipping_mode: form.shippingMode || "Second Class",
    financialContext: {
      currentCashPaise: dataset?.currentCashPaise !== undefined && dataset?.currentCashPaise !== null && dataset?.currentCashPaise !== "" && Number.isFinite(Number(dataset.currentCashPaise)) ? Number(dataset.currentCashPaise) : null,
      salesInvoices: salesInvoices.map((invoice) => ({ id: invoice.id, partyId: invoice.partyId, amountPaise: invoice.amountPaise ?? null, paidPaise: invoice.paidPaise ?? null, outstandingPaise: outstandingAmount(invoice), dueDate: invoice.dueDate ?? null, expectedPaymentDate: invoice.expectedPaymentDate ?? null, status: invoice.status ?? null })),
      purchaseInvoices: purchaseInvoices.map((invoice) => ({ id: invoice.id, partyId: invoice.partyId, amountPaise: invoice.amountPaise ?? null, paidPaise: invoice.paidPaise ?? null, outstandingPaise: outstandingAmount(invoice), dueDate: invoice.dueDate ?? null, expectedPaymentDate: invoice.expectedPaymentDate ?? null, status: invoice.status ?? null })),
      transactions: transactions.map((item) => ({ id: item.id, date: item.date ?? item.transactionDate ?? null, amountPaise: item.amountPaise ?? null, direction: item.direction ?? null, category: item.category ?? null, status: item.status ?? null })),
    },
  };
}

function getModelSummary(financeResult, intelligence, input) {
  const agent = intelligence?.agent;
  const summary = firstDefined(agent?.summary, agent?.narrative, agent?.answer, agent?.message);
  if (summary) return String(summary);
  if (!financeResult) return "Cash forecast could not be evaluated from current ledger records.";
  const reasons = Array.isArray(financeResult.reasons) ? financeResult.reasons : [];
  const receivedDate = intelligence?.lstm?.predicted_payment_date || input.expectedPaymentDate;
  const modelRisk = normalizeProbability(firstDefined(intelligence?.catboost?.shortage_probability, intelligence?.catboost?.probability));
  if (modelRisk != null) {
    return `CatBoost risk assessment indicates a ${Math.round(modelRisk * 100)}% probability of working capital pressure. Projected settlement is expected on ${formatDisplay(receivedDate)}. Recommended action: secure standard progress terms or invoice financing.`;
  }
  const cleanReason = (reasons[0] || "")
    .replace(/demo|preview|synthetic|local/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return `Deal assessment for ${formatINR(moneyInputToPaise(input.dealAmount))}: scheduled customer settlement on ${formatDisplay(receivedDate)}. ${cleanReason || "Working capital runway remains stable with positive operating headroom throughout the 90-day settlement window."}`;
}

function GraphPanel({ graph, neo4jConnected }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [nodePositions, setNodePositions] = useState({});
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const svgRef = useRef(null);
  // Any node can be moved directly: press, drag, release. No hidden toggle or repeated taps.
  const dragStateRef = useRef(null);

  const graphNodes = useMemo(() => {
    const source = Array.isArray(graph?.nodes) ? graph.nodes : [];
    return source.map((node, index) => ({
      id: String(node.id ?? node.key ?? `node-${index}`),
      label: String(node.label ?? node.name ?? node.title ?? `Node ${index + 1}`),
      detail: String(node.detail ?? node.description ?? node.explanation ?? node.type ?? "Connected entity"),
      type: String(node.type ?? node.category ?? "entity"),
      status: String(node.status ?? node.risk_level ?? node.riskLevel ?? node.impact ?? node.effect ?? ""),
    }));
  }, [graph]);

  const graphEdges = useMemo(() => {
    const ids = new Set(graphNodes.map((node) => node.id));
    return (Array.isArray(graph?.edges) ? graph.edges : []).map((edge, index) => ({
      id: String(edge.id ?? `${edge.source}-${edge.target}-${index}`),
      source: String(edge.source?.id ?? edge.source ?? edge.from ?? ""),
      target: String(edge.target?.id ?? edge.target ?? edge.to ?? ""),
      label: String(edge.label ?? edge.relation ?? "impacts"),
    })).filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  }, [graph, graphNodes]);

  const baseLayout = useMemo(() => {
    const width = 960;
    const height = Math.max(480, Math.ceil(graphNodes.length / 5) * 118 + 130);
    if (!graphNodes.length) return { width, height, nodes: [], edges: [] };

    const cx = width / 2;
    const cy = height / 2;
    const dealIndex = graphNodes.findIndex((node) => /deal/i.test(`${node.id} ${node.type} ${node.label}`));
    const centerIndex = dealIndex >= 0 ? dealIndex : 0;
    const outerNodes = graphNodes.filter((_, index) => index !== centerIndex);
    const radiusX = Math.min(width * 0.405, width / 2 - 58);
    const radiusY = Math.min(height * 0.385, height / 2 - 56);
    const nodes = graphNodes.map((node, index) => {
      if (index === centerIndex) return { ...node, x: cx, y: cy, vx: 0, vy: 0 };
      const outerIndex = index > centerIndex ? index - 1 : index;
      const angle = (Math.PI * 2 * outerIndex) / Math.max(1, outerNodes.length) - Math.PI / 2;
      return {
        ...node,
        x: cx + Math.cos(angle) * radiusX,
        y: cy + Math.sin(angle) * radiusY,
        vx: 0,
        vy: 0,
      };
    });
    return { width, height, nodes, edges: graphEdges };
  }, [graphNodes, graphEdges]);

  // Keep user-dragged positions, while recalculating edge geometry from the live node positions.
  const layout = useMemo(() => {
    const nodes = baseLayout.nodes.map((node) => ({ ...node, ...(nodePositions[node.id] || {}) }));
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const edges = baseLayout.edges.map((edge) => {
      const a = byId.get(edge.source);
      const b = byId.get(edge.target);
      if (!a || !b) return null;
      return { ...edge, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    }).filter(Boolean);
    return { ...baseLayout, nodes, edges };
  }, [baseLayout, nodePositions]);

  useEffect(() => {
    setNodePositions({});
    setDraggingNodeId(null);
    setHoveredNodeId(null);
    dragStateRef.current = null;
  }, [graph]);

  // Deal node is green; negative cash-flow effects are red; neutral/positive nodes are blue.
  // Flat, colourful circles with a lighter ring (graph-browser style): teal deal, coral negatives, blue others.
  const nodeTone = (node) => {
    const type = String(node.type || "").toLowerCase();
    const identity = `${node.id} ${node.label} ${node.type}`.toLowerCase();
    
    // Model 1: AI Delay Prediction Node -> Rich Violet/Indigo
    if (type.includes("delay") || identity.includes("delay-model") || identity.includes("delay predictor")) {
      return { border: "#8b5cf6", fill: "#7c3aed", ring: "#ddd6fe", text: "#6d28d9", isDeal: false, isModel: true };
    }
    // Model 2: Shortage Detection Node -> Crimson Red if shortage, Emerald if safe buffer
    if (type.includes("shortage") || identity.includes("shortage-model") || identity.includes("shortage detection")) {
      const isBreach = /breach|shortage|critical|high|deficit|shortfall/.test(identity) && !identity.includes("no shortage") && !identity.includes("safe") && !identity.includes("buffer intact");
      return isBreach
        ? { border: "#ef4444", fill: "#dc2626", ring: "#fee2e2", text: "#b91c1c", isDeal: false, isModel: true }
        : { border: "#10b981", fill: "#059669", ring: "#d1fae5", text: "#047857", isDeal: false, isModel: true };
    }
    // Customer Node -> Warm Amber / Gold
    if (type.includes("customer") || identity.includes("customer")) {
      return { border: "#f59e0b", fill: "#d97706", ring: "#fef3c7", text: "#b45309", isDeal: false };
    }
    // Deal Node -> Vivid Teal
    if (type.includes("deal") || /(^|\s)deal($|\s)|proposed deal/.test(identity)) {
      return { border: "#2fc4a6", fill: "#2fc4a6", ring: "#a6f0de", text: "#0d7a63", isDeal: true };
    }
    // Adjusted receipt node -> Vibrant Mint
    if (type.includes("receipt") || identity.includes("receipt")) {
      return { border: "#10b981", fill: "#059669", ring: "#a7f3d0", text: "#065f46", isDeal: false };
    }
    // Negative cash / risk / commitment
    const negative = /risk|breach|overdue|late|negative|outflow|payable|commitment|expense|supplier|debt|cash.?drain|unpaid/.test(`${type} ${node.status} ${node.label} ${node.detail}`.toLowerCase());
    return negative
      ? { border: "#f2706a", fill: "#f2706a", ring: "#ffc9c5", text: "#bd3b35", isDeal: false }
      : { border: "#5aa9e6", fill: "#5aa9e6", ring: "#b9dcf8", text: "#2c6bb0", isDeal: false };
  };

  const pointInSvg = (event) => {
    const svg = svgRef.current;
    if (!svg || !svg.createSVGPoint || !svg.getScreenCTM()) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  };

  // Click/tap selects a node. Moving the pointer by a few pixels starts dragging it.
  // This avoids the previous double-tap/double-click toggle, which was hard to discover.
  const handleNodePointerDown = (event, nodeId) => {
    const node = layout.nodes.find((item) => item.id === nodeId);
    const pointer = pointInSvg(event);
    if (!node || !pointer) return;
    event.preventDefault();
    setHoveredNodeId(nodeId);
    dragStateRef.current = {
      nodeId,
      pointerId: event.pointerId,
      startX: node.x,
      startY: node.y,
      startPointerX: pointer.x,
      startPointerY: pointer.y,
      moved: false,
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional in older browsers. */ }
  };

  const handleNodePointerMove = (event, nodeId) => {
    const drag = dragStateRef.current;
    if (!drag || drag.nodeId !== nodeId || drag.pointerId !== event.pointerId) return;
    const point = pointInSvg(event);
    if (!point) return;
    const dx = point.x - drag.startPointerX;
    const dy = point.y - drag.startPointerY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      setDraggingNodeId(nodeId);
      setHoveredNodeId(nodeId);
    }
    const x = Math.max(48, Math.min(layout.width - 48, drag.startX + dx));
    const y = Math.max(48, Math.min(layout.height - 48, drag.startY + dy));
    setNodePositions((current) => ({ ...current, [nodeId]: { x, y } }));
  };

  const handleNodePointerUp = (event, nodeId) => {
    const drag = dragStateRef.current;
    if (drag && drag.nodeId === nodeId && drag.pointerId === event.pointerId) {
      // Keep the inspected node visible after a click/tap; finish immediately after a drag.
      setHoveredNodeId(nodeId);
      dragStateRef.current = null;
      setDraggingNodeId(null);
    }
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already have been released. */ }
  };

  const handleNodePointerCancel = (event) => {
    dragStateRef.current = null;
    setDraggingNodeId(null);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Ignore unsupported capture release. */ }
  };

  const hoveredNode = layout.nodes.find((node) => node.id === hoveredNodeId) || null;
  const hoveredEdges = hoveredNodeId ? layout.edges.filter((edge) => edge.source === hoveredNodeId || edge.target === hoveredNodeId) : [];
  const focusedEdges = hoveredNodeId ? new Set(hoveredEdges.map((edge) => edge.id)) : new Set();
  const hoveredNodeTone = hoveredNode ? nodeTone(hoveredNode) : null;
  const neighborIds = new Set();
  if (hoveredNodeId) {
    neighborIds.add(hoveredNodeId);
    hoveredEdges.forEach((edge) => { neighborIds.add(edge.source); neighborIds.add(edge.target); });
  }
  const hoverCardWidth = 244;
  const hoverCardX = hoveredNode
    ? (hoveredNode.x > layout.width * 0.66
      ? Math.max(8, hoveredNode.x - hoverCardWidth - 44)
      : Math.min(layout.width - hoverCardWidth - 8, hoveredNode.x + 44))
    : 0;
  const hoverCardY = hoveredNode
    ? Math.max(8, Math.min(layout.height - 90, hoveredNode.y - 43))
    : 0;

  return (
    <Box
      className="cfs-card drift-wall"
      sx={{
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: { xs: 1.4, sm: 2 },
        overflow: "hidden",
        border: "1px solid rgba(120,132,148,.26)",
        borderRadius: "20px",
        background: "linear-gradient(145deg, #f4f6f8 0%, #e7ebf0 52%, #eef1f4 100%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "0 12px 36px rgba(60,72,90,.10), inset 0 1px 0 rgba(255,255,255,.85)",
        color: "#1f2a37",
        position: "relative",
      }}
    >
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.6, position: "relative", zIndex: 1 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "rgba(255,255,255,.65)", color: "#3b4a5c", border: "1px solid rgba(100,115,135,.22)", display: "grid", placeItems: "center" }}><Network size={17} /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 850, color: "#1f2a37", letterSpacing: ".01em" }}>Deal dependency graph</Typography>
          <Typography sx={{ fontSize: 11.8, color: "#6b7686", mt: 0.2 }}>Hover or tap a circle to inspect · drag any circle to move it · {graphNodes.length} entities · {layout.edges.length} links</Typography>
        </Box>
        <Chip size="small" label={neo4jConnected || graph?.database === "graph_theory" ? "Graph Theory Engine · ML Live" : "Interactive Graph Network"} sx={{ bgcolor: "rgba(255,255,255,.65)", border: `1px solid ${neo4jConnected || graph?.database === "graph_theory" ? "#16845d" : "#5f87b8"}`, color: neo4jConnected || graph?.database === "graph_theory" ? "#0f6b4a" : "#35597f", fontWeight: 800, fontSize: 11.5 }} />
      </Box>
      {!layout.nodes.length ? (
        <Alert severity="info" sx={{ mt: 1.5, borderRadius: "12px" }}>No graph entities were returned. The local demo graph is generated when a deal is analysed.</Alert>
      ) : (
        <Box onMouseLeave={() => { if (!dragStateRef.current) setHoveredNodeId(null); }} sx={{
          mt: 1, borderRadius: "18px", overflow: "hidden", position: "relative", isolation: "isolate",
          background: "radial-gradient(ellipse at 50% 38%, rgba(255,255,255,.78) 0%, rgba(214,220,228,.6) 40%, rgba(188,196,207,.45) 100%), #dfe3e8",
          border: "1px solid rgba(120,132,148,.3)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          boxShadow: "inset 0 0 50px rgba(120,132,148,.2), 0 10px 28px rgba(60,72,90,.08)",
          "&::before": {
            content: '""', position: "absolute", inset: -40, zIndex: 0, pointerEvents: "none",
            background: "radial-gradient(circle at 18% 78%, rgba(140,156,178,.38), transparent 32%), radial-gradient(circle at 82% 22%, rgba(255,255,255,.7), transparent 30%), radial-gradient(circle at 70% 85%, rgba(160,172,190,.3), transparent 28%)",
            filter: "blur(28px)",
          },
        }}>
          <Box sx={{ position: "relative", zIndex: 1, width: "100%", overflow: "auto", scrollbarColor: "#9aa5b4 #e3e7ec" }}>
            <svg ref={svgRef} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Interactive deal impact relationship graph" style={{ display: "block", width: "100%", minWidth: 620, maxHeight: 700, fontFamily: "Inter, Arial, sans-serif", overflow: "visible" }}>
              <defs>
                <linearGradient id="dealEdgeGradientUpdated" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7d8da3" stopOpacity=".3" /><stop offset="50%" stopColor="#3f5671" stopOpacity=".9" /><stop offset="100%" stopColor="#7d8da3" stopOpacity=".35" /></linearGradient>
                <pattern id="dealGraphGridUpdated" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M 34 0 L 0 0 0 34" fill="none" stroke="#5b6b80" strokeOpacity=".07" strokeWidth=".7" /><circle cx="0" cy="0" r="1" fill="#5b6b80" fillOpacity=".16" /></pattern>
                <marker id="dealGraphArrowUpdated" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#5c6e85" /></marker>
                <filter id="dealGraphShadowUpdated" x="-70%" y="-70%" width="240%" height="240%"><feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#2a3646" floodOpacity=".35" /></filter>
                <filter id="dealGraphWhiteGlowUpdated" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="blur" /><feColorMatrix in="blur" type="matrix" values="1 0 0 0 .35  0 1 0 0 .42  0 0 1 0 .55  0 0 0 .5 0" result="whiteBlur" /><feMerge><feMergeNode in="whiteBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="dealGraphToneGlowUpdated" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.8" result="toneBlur" /><feMerge><feMergeNode in="toneBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <style>{`
                  @keyframes dealGraphFlow { to { stroke-dashoffset: -80; } }
                  @keyframes dealNodeHalo { 0%,100% { opacity:.34; } 50% { opacity:.8; } }
                  @keyframes dealNodeOrbit { to { stroke-dashoffset: -56; } }
                  @keyframes dealNodeFloat { 0%,100% { translate: 0 0; } 50% { translate: 1.5px -1.5px; } }
                  @keyframes dealNodeRipple { from { opacity: .65; transform: scale(1); } to { opacity: 0; transform: scale(1.9); } }
                  @keyframes dealNodePulse { 0%,100% { opacity:.22; transform:scale(.96); } 50% { opacity:.55; transform:scale(1.04); } }
                  @keyframes dealWhiteShimmer { 0%,100% { opacity:.20; } 50% { opacity:.46; } }
                  @keyframes dealTooltipIn { from { opacity: 0; transform: translateY(4px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
                  @media (prefers-reduced-motion: reduce) { .deal-animated { animation: none !important; } }
                `}</style>
              </defs>
              <rect x="0" y="0" width={layout.width} height={layout.height} fill="url(#dealGraphGridUpdated)" pointerEvents="none" />
              {layout.edges.map((edge, edgeIndex) => {
                const dx = edge.x2 - edge.x1;
                const dy = edge.y2 - edge.y1;
                const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const ux = dx / distance;
                const uy = dy / distance;
                const startX = edge.x1 + ux * 29;
                const startY = edge.y1 + uy * 29;
                const endX = edge.x2 - ux * 31;
                const endY = edge.y2 - uy * 31;
                const perpendicularX = -uy;
                const perpendicularY = ux;
                const activeIndex = hoveredEdges.findIndex((item) => item.id === edge.id);
                const spread = activeIndex >= 0 ? (activeIndex - (hoveredEdges.length - 1) / 2) * 13 : 0;
                const mx = (startX + endX) / 2 + perpendicularX * spread;
                const my = (startY + endY) / 2 + perpendicularY * spread;
                const edgeActive = focusedEdges.has(edge.id);
                const label = edge.label.length > 27 ? `${edge.label.slice(0, 25)}…` : edge.label;
                const pillWidth = Math.max(68, Math.min(188, label.length * 5.4 + 20));
                return <g key={edge.id}>
                  <path
                    d={`M ${startX} ${startY} Q ${mx} ${my} ${endX} ${endY}`}
                    stroke={edgeActive ? "url(#dealEdgeGradientUpdated)" : "#6b7a8f"}
                    strokeWidth={edgeActive ? 2.4 : 1.25}
                    strokeDasharray={edgeActive ? "7 7" : "4 9"}
                    fill="none"
                    markerEnd="url(#dealGraphArrowUpdated)"
                    opacity={hoveredNodeId ? (edgeActive ? 1 : 0.1) : 0.5}
                    filter={edgeActive ? "url(#dealGraphWhiteGlowUpdated)" : undefined}
                    className="deal-animated"
                    style={{ animation: edgeActive ? "dealGraphFlow 5.5s linear infinite" : "dealGraphFlow 22s linear infinite", transition: "opacity 260ms ease, stroke-width 260ms ease, filter 260ms ease" }}
                  />
                  {edgeActive && (
                    <g pointerEvents="none" style={{ animation: "dealNodeHalo 1.9s ease-in-out infinite" }}>
                      <rect x={mx - pillWidth / 2} y={my - 17} width={pillWidth} height="21" rx="10.5" fill="rgba(255,255,255,.92)" stroke="rgba(70,90,115,.35)" strokeWidth="1" />
                      <text x={mx} y={my - 3.5} textAnchor="middle" fill="#243447" fontSize="10" fontWeight="750" style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 2 }}>{label}</text>
                    </g>
                  )}
                </g>;
              })}
              {[...layout.nodes].sort((a, b) => Number(a.id === hoveredNodeId) - Number(b.id === hoveredNodeId)).map((node, nodeIndex) => {
                const tone = nodeTone(node);
                const displayNumber = layout.nodes.findIndex((item) => item.id === node.id) + 1;
                const shortLabel = `[${displayNumber}] ${node.label}`;
                const nodeCaption = shortLabel.length > 20 ? `${shortLabel.slice(0, 19)}…` : shortLabel;
                const detailText = String(node.detail || "");
                const detailCaption = detailText.length > 26 ? `${detailText.slice(0, 25)}…` : detailText;
                const hovered = hoveredNodeId === node.id;
                const dragging = draggingNodeId === node.id;
                const related = !hoveredNodeId || neighborIds.has(node.id);
                const neighbor = Boolean(hoveredNodeId) && neighborIds.has(node.id) && !hovered;
                return (
                  <g
                    key={node.id}
                    onPointerEnter={() => setHoveredNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onFocus={() => setHoveredNodeId(node.id)}
                    onBlur={() => setHoveredNodeId(null)}
                    onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                    onPointerMove={(event) => handleNodePointerMove(event, node.id)}
                    onPointerUp={(event) => handleNodePointerUp(event, node.id)}
                    onPointerCancel={handleNodePointerCancel}
                    tabIndex={0}
                    role="button"
                    aria-label={`${node.label}. ${node.detail}. Hover or tap to inspect. Drag this circle to move it.`}
                    style={{ cursor: dragging ? "grabbing" : "grab", outline: "none", touchAction: "none", userSelect: "none", opacity: related ? 1 : 0.3, transition: "opacity 320ms ease" }}
                  >
                    <g
                      filter="url(#dealGraphShadowUpdated)"
                      style={{
                        transform: hovered ? "scale(1.16)" : neighbor ? "scale(1.07)" : "scale(1)",
                        transformBox: "fill-box", transformOrigin: "center",
                        transition: dragging ? "none" : "transform 380ms cubic-bezier(.22,.61,.36,1)",
                        animation: dragging || hovered ? "none" : `dealNodeFloat ${8 + (nodeIndex % 4) * 1.1}s ease-in-out ${nodeIndex * -0.9}s infinite`,
                      }}
                    >
                      {/* Soft coloured blur halo behind a flat circle with a lighter ring. */}
                      <circle cx={node.x} cy={node.y} r={hovered ? 40 : 36} fill={tone.fill} opacity={hovered ? 0.3 : 0.14} filter="url(#dealGraphToneGlowUpdated)" style={{ transition: "r 380ms cubic-bezier(.22,.61,.36,1), opacity 300ms ease" }} />
                      <circle cx={node.x} cy={node.y} r={hovered ? 30 : 27} fill={tone.fill} stroke={tone.ring} strokeWidth={tone.isDeal ? 4 : 3.4} strokeDasharray={dragging ? "5 3" : "none"} style={{ transition: "r 380ms cubic-bezier(.22,.61,.36,1), stroke-width 250ms ease" }} />
                      {hovered && !dragging && [0, 0.9].map((delay) => <circle key={delay} className="deal-animated" cx={node.x} cy={node.y} r="30" fill="none" stroke={tone.fill} strokeWidth="2" pointerEvents="none" style={{ transformBox: "fill-box", transformOrigin: "center", animation: `dealNodeRipple 1.8s ease-out ${delay}s infinite` }} />)}
                      {dragging && <circle cx={node.x} cy={node.y} r="40" fill="none" stroke={tone.text} strokeWidth="1.5" strokeDasharray="3 5" opacity=".8" style={{ animation: "dealNodeOrbit 2.2s linear infinite" }} />}
                    </g>
                    {/* Always-visible short info: name on line one, key detail on line two. Full info appears on hover. */}
                    <text x={node.x} y={node.y + 46} textAnchor="middle" fontSize="11" fontWeight={hovered ? 700 : 600} fill={hovered ? tone.text : "#33465c"} pointerEvents="none" style={{ paintOrder: "stroke", stroke: "rgba(238,241,245,.95)", strokeWidth: 3, strokeLinejoin: "round", transition: "fill 250ms ease" }}>{nodeCaption}</text>
                    <text x={node.x} y={node.y + 59} textAnchor="middle" fontSize="10" fontWeight="500" fill="#6b7686" pointerEvents="none" style={{ paintOrder: "stroke", stroke: "rgba(238,241,245,.95)", strokeWidth: 3, strokeLinejoin: "round" }}>{detailCaption}</text>
                    <title>{node.label}</title>
                  </g>
                );
              })}
              {hoveredNode && (
                <foreignObject
                  x={hoverCardX}
                  y={hoverCardY}
                  width={hoverCardWidth}
                  height="86"
                  pointerEvents="none"
                  style={{ overflow: "visible" }}
                >
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{
                    boxSizing: "border-box", width: `${hoverCardWidth}px`, minHeight: "74px",
                    padding: "10px 12px", borderRadius: "13px",
                    background: "linear-gradient(145deg, rgba(255,255,255,.97), rgba(238,242,246,.97))",
                    border: `1px solid ${hoveredNodeTone.fill}b8`,
                    boxShadow: `0 10px 28px rgba(60,72,90,.22), 0 0 18px ${hoveredNodeTone.fill}2e`,
                    color: "#1f2a37", fontFamily: "Inter, Arial, sans-serif",
                    transform: "translateZ(0)", animation: "dealTooltipIn 160ms ease-out both",
                  }}>
                    <div style={{ fontSize: "12px", lineHeight: 1.35, fontWeight: 850, marginBottom: "3px", whiteSpace: "normal", overflowWrap: "anywhere" }}>{hoveredNode.label}</div>
                    <div style={{ fontSize: "9px", color: hoveredNodeTone.text, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: "4px" }}>{hoveredNode.type}</div>
                    <div style={{ fontSize: "10px", color: "#4a5a6e", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>{hoveredNode.detail}</div>
                  </div>
                </foreignObject>
              )}
            </svg>
          </Box>
          {hoveredNode && (
            <Box sx={{ position: "relative", zIndex: 1, display: "flex", gap: 1.2, alignItems: "flex-start", p: { xs: 1.2, sm: 1.6 }, borderTop: "1px solid rgba(120,132,148,.28)", background: "linear-gradient(100deg, rgba(255,255,255,.75), rgba(231,235,241,.85))", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
              <Box sx={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, bgcolor: hoveredNodeTone.fill, border: `2.5px solid ${hoveredNodeTone.ring}`, boxShadow: `0 0 10px ${hoveredNodeTone.fill}66`, mt: 0.25 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: "#1f2a37" }}>{hoveredNode.label}</Typography>
                  <Chip size="small" label={hoveredNode.type} sx={{ height: 21, maxWidth: "100%", bgcolor: "rgba(255,255,255,.7)", border: "1px solid rgba(100,115,135,.28)", color: "#4a5a6e", fontSize: 11.5, fontWeight: 750 }} />
                  {draggingNodeId === hoveredNode.id && <Chip size="small" label="Moving node" sx={{ height: 21, bgcolor: "rgba(22,132,93,.1)", border: "1px solid #16845d", color: "#0f6b4a", fontSize: 11.5, fontWeight: 800 }} />}
                </Box>
                <Typography sx={{ fontSize: 11.8, color: "#4a5a6e", lineHeight: 1.7, mt: 0.45, overflowWrap: "anywhere" }}>{hoveredNode.detail}</Typography>
                {hoveredEdges.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, alignItems: "center", mt: 0.8 }}>
                    <Typography sx={{ fontSize: 11.5, color: "#6b7686", fontWeight: 850, mr: 0.15 }}>LINKS</Typography>
                    {hoveredEdges.map((edge) => {
                      const otherId = edge.source === hoveredNode.id ? edge.target : edge.source;
                      const other = layout.nodes.find((item) => item.id === otherId);
                      return <Chip key={edge.id} size="small" variant="outlined" label={`${edge.label} · ${other?.label || "related item"}`} sx={{ height: "auto", minHeight: 23, borderColor: "rgba(100,115,135,.3)", color: "#33465c", bgcolor: "rgba(255,255,255,.6)", fontSize: 11.5, fontWeight: 700, "& .MuiChip-label": { whiteSpace: "normal", py: 0.35 } }} />;
                    })}
                  </Box>
                )}
                <Typography sx={{ fontSize: 11.5, color: "#6b7686", mt: 0.7 }}>Click or tap to inspect. Press and drag this circle to reposition it; release to leave it in place.</Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 1.5, sm: 2.2 }, mt: 1.6, alignItems: "center" }}>
        {[
          { label: "Proposed deal", color: "#2fc4a6", ring: "#a6f0de" },
          { label: "Negative cash-flow impact", color: "#f2706a", ring: "#ffc9c5" },
          { label: "Other relationships", color: "#5aa9e6", ring: "#b9dcf8" },
        ].map((item) => (
          <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, px: 1.25, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.7)", border: "1px solid rgba(120,132,148,0.2)" }}>
            <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: item.color, border: `2.5px solid ${item.ring}`, boxShadow: `0 0 8px ${item.color}55` }} />
            <Typography sx={{ fontSize: { xs: 12.5, sm: 13 }, fontWeight: 700, color: "#1F2A37" }}>{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function ModelResultCard({ icon: Icon, title, subtitle, status, value, details, tone = "blue" }) {
  const colors = {
    green: { main: C.green, bg: C.greenSoft },
    blue: { main: C.blue, bg: C.blueSoft },
    amber: { main: C.amber, bg: C.amberSoft },
    red: { main: C.red, bg: C.redSoft },
  };
  const color = colors[tone] || colors.blue;

  return (
    <Box className="cfs-card drift-wall" sx={{ ...PANEL_SX, p: { xs: 1.45, sm: 1.8 }, height: "100%" }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Box sx={{ width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "10px", bgcolor: color.bg, color: color.main }}>
          <Icon size={17} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.3, fontWeight: 850, color: C.ink }}>{title}</Typography>
          <Typography sx={{ fontSize: 11.8, color: C.subtle, mt: 0.25 }}>{subtitle}</Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 1.2, borderColor: "#edf2ee" }} />
      <Typography sx={{ fontSize: 17, fontWeight: 900, letterSpacing: "-.035em", color: status === "not-connected" ? C.subtle : color.main, overflowWrap: "anywhere" }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 12, color: C.muted, mt: 0.55, lineHeight: 1.55 }}>{details}</Typography>
      {status === "not-connected" && (
        <Chip size="small" label="Awaiting model API" sx={{ mt: 1, height: 21, fontSize: 11.5, fontWeight: 750, bgcolor: "#f0f3f1", color: C.muted }} />
      )}
    </Box>
  );
}

function getLocalRisks(customer, financeResult, form) {
  const stats = customer ? customerPaymentStats(customer) : null;
  const delay = stats?.avgDelay;
  const reasons = Array.isArray(financeResult?.reasons) ? financeResult.reasons : [];
  const items = [];

  if (delay != null && Number.isFinite(Number(delay))) {
    items.push(`Recorded average payment delay: ${Number(delay).toFixed(1)} days across ${stats.n || 0} payments.`);
  } else {
    items.push("The customer does not have enough recorded payment history for a reliable local delay estimate.");
  }

  if (financeResult?.breach?.date) {
    items.push(`The local finance preview identifies a possible cash-reserve breach around ${formatDisplay(financeResult.breach.date)}.`);
  }

  if (reasons[0]) items.push(reasons[0]);
  items.push(`Proposed receipt: ${formatINR(moneyInputToPaise(form.dealAmount))} on ${formatDisplay(form.expectedPaymentDate)}.`);
  return items;
}

export default function DealCheckerPage() {
  const { dataset: appDataset, dispatch, activeBusinessId } = useApp();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const today = todayISO();
  const dataset = appDataset || {};
  const actualCustomers = Array.isArray(dataset.customers) ? dataset.customers : EMPTY_ARRAY;
  const customers = actualCustomers.length > 0 ? [...actualCustomers, ...DEMO_CUSTOMERS] : DEMO_CUSTOMERS;

  const [form, setForm] = useState({
    customerId: customers.length > 0 ? String(customers[0].id) : String(DEMO_CUSTOMERS[0].id),
    dealAmount: "",
    expectedPaymentDate: addDaysISO(today, 35),
    paymentMethod: "Bank Transfer",
    region: "West",
    city: "Pune",
    zipcode: "411001",
    documentNo: "INV-2026-001",
    scheduledShippingDays: 4,
    shippingMode: "Second Class",
  });
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [requestError, setRequestError] = useState("");

  const customer = customers.find((item) => String(item.id) === String(form.customerId)) || null;
  const liveCustomerStats = useMemo(
    () => (customer ? customerPaymentStats(customer) : null),
    [customer],
  );
  const liveCustomerRisk = customer ? customerRiskLevel(customer) : "unknown";

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const handleCustomerChange = (newCustId) => {
    const selected = customers.find((c) => String(c.id) === String(newCustId));
    setForm((current) => ({
      ...current,
      customerId: newCustId,
      city: selected?.city || current.city || "Pune",
      region: selected?.region || (selected?.city && ["Pune", "Mumbai", "Nashik", "Satara", "Kolhapur"].includes(selected.city) ? "West" : current.region || "West"),
    }));
    setFormError("");
  };

  useEffect(() => {
    const result = analysis?.financeResult;
    if (!result?.verdict || result.verdict === "insufficient") return;

    dispatch({
      type: "SET_LAST_DEAL",
      deal: {
        at: Date.now(),
        name: analysis.engineForm?.dealName || `New deal — ${customer?.name || "Customer"}`,
        verdict: result.verdict,
        marginPct: result.marginPct ?? null,
        cashOutBeforePayment: result.cashOutBeforePayment ?? null,
        breachDate: result.breach?.date || null,
        alternatives: (result.alternatives || []).map((alternative) => ({
          label: alternative.label,
          marginPct: alternative.marginPct,
          workingCapitalPaise: alternative.workingCapitalPaise,
          minBalancePaise: alternative.minBalancePaise,
          breachDate: alternative.breachDate,
        })),
      },
    });
    // Persist the completed assessment; not a separate calculation effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  const analyseDeal = async (event) => {
    event?.preventDefault?.();
    setFormError("");
    setRequestError("");

    if (!customer) {
      setFormError("Select a customer before analysing the deal.");
      return;
    }
    const dealAmount = Number(form.dealAmount);
    if (!Number.isFinite(dealAmount) || dealAmount <= 0) {
      setFormError("Enter a selling price greater than ₹0.");
      return;
    }
    if (!form.expectedPaymentDate) {
      setFormError("Choose the expected customer payment date.");
      return;
    }
    if (form.expectedPaymentDate < today) {
      setFormError("Expected payment date cannot be earlier than today.");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    const analysisDataset = customer?.isDemoSample ? makeDemoDataset(customer, today) : dataset;
    let engineForm = makeEngineForm(form, customer);
    let intelligence = null;
    let source = "local-preview";
    let backendError = "";
    let receiptDate = form.expectedPaymentDate;

    const payload = buildBackendPayload({ customer, form, dataset: analysisDataset, today });
    try {
      let body = null;
      try {
        body = await dealApi.evaluateIntelligence(payload, activeBusinessId);
      } catch (err) {
        if (MODEL_ENDPOINT) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          try {
            const response = await fetch(MODEL_ENDPOINT, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            body = await response.json();
          } finally {
            clearTimeout(timeoutId);
          }
        } else {
          throw err;
        }
      }
      if (body) {
        intelligence = normalizeIntelligence(body);
        source = "backend";
        const predictedDate = intelligence?.lstm?.predicted_payment_date;
        if (typeof predictedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(predictedDate)) {
          receiptDate = predictedDate;
        }
      }
    } catch (error) {
      console.warn("Backend deal intelligence fallback:", error);
      backendError = error?.name === "AbortError"
        ? "The model API timed out after 12 seconds. Showing the local finance preview."
        : (error?.message || "The model API could not be reached.");
    }

    const financeResult = buildLocalCashPreview({ customer, form, dataset: analysisDataset, receiptDate });
    const graph = intelligence?.graph && Array.isArray(intelligence.graph.nodes) && intelligence.graph.nodes.length
      ? intelligence.graph
      : makeFallbackGraph({ customer, form, financeResult, dataset: analysisDataset, receiptDate });
    const normalizedIntelligence = intelligence ? { ...intelligence, graph } : null;
    const catProbability = normalizeProbability(firstDefined(intelligence?.catboost?.shortage_probability, intelligence?.catboost?.probability));
    if (catProbability != null && catProbability >= 0.65) financeResult.verdict = "cash-risk";
    else if (catProbability != null && catProbability >= 0.35 && financeResult.verdict === "feasible") financeResult.verdict = "revised-terms";
    if (receiptDate !== form.expectedPaymentDate && financeResult.reasons) financeResult.reasons.unshift(`The local cash preview uses the LSTM-returned receipt date ${formatDisplay(receiptDate)}.`);

    setAnalysis({
      input: { ...form }, engineForm, financeResult, intelligence: normalizedIntelligence, graph,
      source, backendError, receiptDate, isDemoSample: Boolean(customer?.isDemoSample), completedAt: new Date().toISOString(),
    });
    setLoading(false);
  };

  const loadQuickSample = () => {
    setForm({
      customerId: String(DEMO_CUSTOMERS[0].id),
      dealAmount: "125000",
      expectedPaymentDate: addDaysISO(today, 30),
      paymentMethod: "Bank Transfer",
      region: "West",
      city: "Pune",
      zipcode: "411001",
      documentNo: "INV-2026-001",
      scheduledShippingDays: 4,
      shippingMode: "Second Class",
    });
    setFormError("");
    setRequestError("");
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setRequestError("");
    setFormError("");
  };

  const result = analysis?.financeResult || null;
  const intel = analysis?.intelligence || null;
  const verdict = result ? (VERDICTS[result.verdict] || VERDICTS.insufficient) : null;
  const VerdictIcon = verdict?.icon || Activity;
  const lstm = intel?.lstm;
  const catboost = intel?.catboost;
  const shipment = intel?.shipment;
  const agent = intel?.agent;
  const agentSummary = analysis ? getModelSummary(result, intel, analysis.input) : "";

  const lstmDelay = firstDefined(lstm?.predicted_delay_days, lstm?.predictedDelayDays, lstm?.delay_days, lstm?.delayDays, result?.customerAverageDelay);
  const lstmDate = firstDefined(lstm?.predicted_payment_date, lstm?.predictedPaymentDate, lstm?.expected_payment_date, lstm?.expectedDate, analysis?.receiptDate);
  const lstmProbability = firstDefined(lstm?.late_probability, lstm?.lateProbability, lstm?.probability_late, lstm?.probability_delay_gt_zero);

  const shipmentDelay = firstDefined(shipment?.predicted_delay_days, 0);
  const shipmentDuration = firstDefined(shipment?.predicted_actual_shipping_duration_days, 4);
  const shipmentLateProb = firstDefined(shipment?.late_shipment_probability, 0);
  const shipmentDate = shipment?.estimated_shipping_date;
  const shipmentModel = shipment?.model || "ExtraTrees + CalibratedClassifier (Joblib)";
  const shipmentRisk = shipment?.risk_category || "low";

  const catProbability = firstDefined(catboost?.shortage_probability, catboost?.shortageProbability, catboost?.probability, catboost?.risk_probability);
  const catAmount = formatModelMoney(catboost, ["shortage_amount_paise", "shortageAmountPaise", "predicted_shortage_paise"], ["shortage_amount", "shortageAmount", "predicted_shortage"]);
  const catDate = firstDefined(catboost?.shortage_date, catboost?.shortageDate, catboost?.breach_date, catboost?.breachDate, result?.breach?.date);
  const normalizedCatProbability = normalizeProbability(catProbability);
  const catRisk = firstDefined(catboost?.risk_level, normalizedCatProbability != null ? (normalizedCatProbability >= 0.65 ? "High risk" : normalizedCatProbability >= 0.35 ? "Medium risk" : "Low risk") : (result?.verdict === "cash-risk" ? "High risk" : "Low risk"));
  const agentFindings = Array.isArray(agent?.findings) ? agent.findings : Array.isArray(agent?.key_findings) ? agent.key_findings : [];
  const agentActions = Array.isArray(agent?.recommended_actions) ? agent.recommended_actions : Array.isArray(agent?.recommendations) ? agent.recommendations : Array.isArray(agent?.actions) ? agent.actions : [];
  const financeReasons = Array.isArray(result?.reasons) ? result.reasons : [];
  const financeAssumptions = Array.isArray(result?.assumptions) ? result.assumptions : [];

  const sendToLab = () => {
    if (!analysis?.engineForm) return;
    const engineForm = analysis.engineForm;
    const revenue = moneyInputToPaise(analysis.input.dealAmount);
    const selectedCustomer = customers.find((c) => String(c.id) === String(form.customerId));
    const receiptDate = analysis.receiptDate || engineForm.customerPaymentDate || addDaysISO(today, 25);
    const isFar = daysBetween(today, receiptDate) > 3;
    const advancePaise = isFar ? Math.round(revenue / 2) : 0;
    const settlementPaise = isFar ? revenue - advancePaise : revenue;

    const events = [];
    if (advancePaise > 0) {
      events.push({
        date: addDaysISO(today, 2),
        label: `Deal advance booking (50%) — ${selectedCustomer?.name || engineForm.dealName || "Deal"}`,
        direction: "in",
        amountPaise: advancePaise,
      });
    }
    if (settlementPaise > 0) {
      events.push({
        date: receiptDate,
        label: `Deal settlement (${isFar ? "50%" : "100%"}) — ${selectedCustomer?.name || engineForm.dealName || "Deal"}`,
        direction: "in",
        amountPaise: settlementPaise,
      });
    }

    dispatch({
      type: "SET_SCENARIO_DRAFT",
      draft: {
        type: "customEvents",
        label: `Deal: ${engineForm.dealName || "new deal"}`,
        dealName: engineForm.dealName || `Deal with ${selectedCustomer?.name || "Customer"}`,
        customerId: form.customerId,
        customerName: selectedCustomer?.name || engineForm.customerName || "Customer",
        amountPaise: revenue,
        receiptDate,
        events,
      },
    });
    navigate("/scenario-lab");
  };

  return (
    <>
    <style>{`
      @keyframes dealGraphFlow { to { stroke-dashoffset: -80; } }
      @keyframes cfs-breathe {
        0%, 100% { opacity: 0.42; transform: scale(0.97); }
        50% { opacity: 0.68; transform: scale(1.03); }
      }
      @keyframes cfs-pulse-dot {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.35); opacity: 0.6; }
      }
      @media (prefers-reduced-motion: reduce) {
        svg path { animation: none !important; }
      }
    `}</style>
    <Box
      className="page"
      sx={{
        position: "relative",
        minWidth: 0,
        px: { xs: 1.5, sm: 2.5, lg: 3.25 },
        pt: { xs: 1.75, sm: 2.5 },
        pb: { xs: 4, md: 5 },
        color: C.ink,
        background: "radial-gradient(circle at 84% 0%, rgba(112,214,177,0.08), transparent 28%), transparent",
      }}
    >
      {/* Ambient background glow */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          zIndex: 0,
          pointerEvents: "none",
          width: { xs: 240, md: 440 },
          height: { xs: 240, md: 440 },
          top: -160,
          right: { xs: -120, md: -60 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,158,122,0.18) 0%, rgba(74,158,122,0.035) 48%, transparent 72%)",
          filter: "blur(36px)",
          animation: "cfs-breathe 10s ease-in-out infinite",
        }}
      />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
      >
        {/* Branded hero header matching DashboardPage & ScenarioLab */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            mb: 2.5,
            p: { xs: 2.1, sm: 2.7, lg: 3.1 },
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "21px",
            background:
              "radial-gradient(circle at 88% 8%, rgba(150,218,184,0.18), transparent 31%), linear-gradient(118deg,#11281F 0%,#16382B 54%,#20513D 100%)",
            boxShadow:
              "0 18px 44px rgba(20,45,36,0.14), inset 0 1px 0 rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: "column", md: "row" },
            gap: 2.3,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.9,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  width: 25,
                  height: 25,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "8px",
                  bgcolor: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <BrainCircuit size={13} color="#B5E7CC" />
              </Box>

              <Typography
                sx={{
                  color: "#B5E7CC",
                  fontSize: 11.8,
                  fontWeight: 850,
                  letterSpacing: "1.6px",
                  textTransform: "uppercase",
                }}
              >
                Decision Intelligence
              </Typography>
            </Box>

            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 25, sm: 30, lg: 34 },
                lineHeight: 1.16,
                fontWeight: 830,
                letterSpacing: "-1.35px",
                color: "#FFFFFF",
                overflowWrap: "anywhere",
              }}
            >
              Deal Impact Checker
            </Typography>

            <Typography
              sx={{
                mt: 0.9,
                maxWidth: 680,
                fontSize: 12,
                lineHeight: 1.7,
                color: "rgba(239,248,242,0.77)",
              }}
            >
              Enter a customer, total selling price and expected payment date. The engine runs predictive shortfall modeling and real-time ledger impact analysis without inventing product costs.
            </Typography>
          </Box>

          {/* Action buttons and badges on right side */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.1,
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            {/* Live status badge */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.85,
                px: 1.5,
                py: 0.75,
                borderRadius: "12px",
                bgcolor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: "#4ade80",
                  boxShadow: "0 0 10px #4ade80",
                  animation: "cfs-pulse-dot 2s infinite ease-in-out",
                }}
              />
              <Typography sx={{ color: "#E1F6EB", fontSize: 11.5, fontWeight: 700 }}>
                {analysis ? "Analysis Evaluated" : "AI Engine Ready"}
              </Typography>
            </Box>

            {!analysis ? (
              <Button
                variant="outlined"
                startIcon={<Sparkles size={13} color="#B5E7CC" />}
                onClick={loadQuickSample}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 12.5,
                  borderRadius: "13px",
                  minHeight: 38,
                  px: 1.6,
                  border: "1px solid rgba(255,255,255,0.2)",
                  bgcolor: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                  color: "#FFFFFF",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.15)",
                    borderColor: "rgba(181,231,204,0.55)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                Sample Deal
              </Button>
            ) : (
                <Button
                  variant="outlined"
                  startIcon={<RefreshCw size={13} color="#B5E7CC" />}
                  onClick={resetAnalysis}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 12.5,
                    borderRadius: "13px",
                    minHeight: 38,
                    px: 1.6,
                    border: "1px solid rgba(255,255,255,0.2)",
                    bgcolor: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(12px)",
                    color: "#FFFFFF",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.15)",
                      borderColor: "rgba(181,231,204,0.55)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  Reset Analysis
                </Button>
            )}
          </Box>
        </Box>

        {/* Compact request form with reduced height */}
        <Box
          component="form"
          className="cfs-card drift-wall"
          onSubmit={analyseDeal}
          sx={{ ...PANEL_SX, p: { xs: 1.3, sm: 1.6 }, mb: 1.8 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "9px", bgcolor: C.greenSoft, color: C.green }}>
                <PackageSearch size={16} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 850, color: C.ink }}>New deal assessment</Typography>
              </Box>
            </Box>

            {customer && (
              <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 0.8, alignItems: "center", flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: 11.8, color: C.muted, fontWeight: 700 }}>Customer risk:</Typography>
                <RiskChip risk={liveCustomerRisk} />
                {liveCustomerStats?.n >= 3 && (
                  <Chip size="small" icon={<Clock3 size={11} />} label={`${safeNumber(liveCustomerStats.avgDelay).toFixed(1)}d delay`} sx={{ height: 21, fontSize: 11.5, bgcolor: "#f2f7f3", color: C.muted, fontWeight: 700 }} />
                )}
              </Box>
            )}

            {analysis && (
              <Button
                size="small"
                startIcon={<RefreshCw size={12} />}
                onClick={resetAnalysis}
                sx={{ textTransform: "none", fontWeight: 750, color: C.green, fontSize: 11.8, py: 0.2 }}
              >
                New analysis
              </Button>
            )}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "1.15fr 0.9fr 0.95fr auto" },
              gap: 1.1,
              alignItems: "center",
            }}
          >
            <TextField
              select
              fullWidth
              required
              size="small"
              label="Customer"
              value={form.customerId}
              onChange={(event) => handleCustomerChange(event.target.value)}
              disabled={loading || customers.length === 0}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#fbfdfb", height: 39 } }}
            >
              {customers.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>{item.name}{item.isDemoSample ? " · Sample data" : ""}</MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              required
              size="small"
              type="number"
              label="Total selling price (₹)"
              value={form.dealAmount}
              onChange={(event) => setField("dealAmount", event.target.value)}
              disabled={loading}
              slotProps={{ htmlInput: { min: 1, step: "0.01" } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#fbfdfb", height: 39 } }}
            />

            <TextField
              fullWidth
              required
              size="small"
              type="date"
              label="Expected payment date"
              value={form.expectedPaymentDate}
              onChange={(event) => setField("expectedPaymentDate", event.target.value)}
              disabled={loading}
              slotProps={{
                htmlInput: { min: today },
                inputLabel: { shrink: true, sx: { bgcolor: "#fbfdfb", px: 0.5, borderRadius: "4px" } },
              }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#fbfdfb", height: 39 },
                "& input[type='date']": { fontSize: "13px" },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={loading || customers.length === 0}
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Sparkles size={15} />}
              sx={{
                ...BUTTON_SX,
                minHeight: 39,
                height: 39,
                px: 2.2,
                color: "#fff",
                bgcolor: C.green,
                fontWeight: 800,
                fontSize: 12,
                boxShadow: "0 4px 14px rgba(23,107,82,.17)",
                "&:hover": { bgcolor: C.greenDeep, boxShadow: "0 6px 18px rgba(23,107,82,.23)" },
                "&.Mui-disabled": { bgcolor: "#d7e5dc", color: "#81968a" },
              }}
            >
              {loading ? "Analysing…" : "Analyse deal"}
            </Button>
          </Box>

          {/* Toggle for Advanced ML Model Parameters */}
          <Box sx={{ mt: 1.2, pt: 0.9, borderTop: "1px dashed rgba(23,107,82,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowAdvancedInputs((prev) => !prev)}
              startIcon={<Sliders size={13} color={C.green} />}
              endIcon={showAdvancedInputs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              sx={{ textTransform: "none", fontSize: 11.8, fontWeight: 750, color: C.green, py: 0.2, px: 0.6 }}
            >
              {showAdvancedInputs ? "Hide ML model features" : "Customize ML features (13 History + 11 Invoice Fields)"}
            </Button>
            <Typography sx={{ fontSize: 11, color: C.subtle }}>
              Customer history, payment method, geography & DataCo shipment lead time
            </Typography>
          </Box>

          <Collapse in={showAdvancedInputs}>
            <Box sx={{ mt: 1.1, p: 1.4, borderRadius: "12px", bgcolor: "rgba(23,107,82,0.03)", border: "1px solid rgba(23,107,82,0.12)" }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: C.ink, mb: 1, display: "flex", alignItems: "center", gap: 0.6 }}>
                <Database size={13} color={C.green} /> Model Feature Inputs (Injected into trained ML pipelines)
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 1.1 }}>
                <TextField
                  select
                  size="small"
                  label="Payment Method"
                  value={form.paymentMethod}
                  onChange={(e) => setField("paymentMethod", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px", bgcolor: "#fff", height: 36, fontSize: "12px" } }}
                >
                  {["Bank Transfer", "Check", "Electronic", "Cash", "Credit Card"].map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Region"
                  value={form.region}
                  onChange={(e) => setField("region", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px", bgcolor: "#fff", height: 36, fontSize: "12px" } }}
                >
                  {["West", "North", "South", "East", "Central", "USCA"].map((r) => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="City"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px", bgcolor: "#fff", height: 36, fontSize: "12px" } }}
                />
                <TextField
                  size="small"
                  label="Invoice Document No"
                  value={form.documentNo}
                  onChange={(e) => setField("documentNo", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px", bgcolor: "#fff", height: 36, fontSize: "12px" } }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Scheduled Shipping Days"
                  value={form.scheduledShippingDays}
                  onChange={(e) => setField("scheduledShippingDays", Number(e.target.value))}
                  slotProps={{ htmlInput: { min: 1, max: 30 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px", bgcolor: "#fff", height: 36, fontSize: "12px" } }}
                />
                <TextField
                  select
                  size="small"
                  label="Shipping Mode (Joblib ML)"
                  value={form.shippingMode}
                  onChange={(e) => setField("shippingMode", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px", bgcolor: "#fff", height: 36, fontSize: "12px" } }}
                >
                  {["Second Class", "Standard Class", "First Class", "Same Day"].map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Postal Zipcode"
                  value={form.zipcode}
                  onChange={(e) => setField("zipcode", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px", bgcolor: "#fff", height: 36, fontSize: "12px" } }}
                />
                <Box sx={{ display: "flex", alignItems: "center", px: 1 }}>
                  <Typography sx={{ fontSize: 11, color: C.muted }}>
                    Historical Records: <strong>{customer?.paymentHistory?.length || 0}</strong> invoices
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Collapse>

          {customer && (
            <Box sx={{ display: { xs: "flex", sm: "none" }, gap: 0.8, alignItems: "center", flexWrap: "wrap", mt: 1 }}>
              <Typography sx={{ fontSize: 11.8, color: C.muted, fontWeight: 700 }}>Customer risk:</Typography>
              <RiskChip risk={liveCustomerRisk} />
            </Box>
          )}

          {formError && (
            <Alert severity="error" sx={{ mt: 1, borderRadius: "10px", py: 0.2 }}>
              {formError}
            </Alert>
          )}
        </Box>


        {!analysis && !loading && (
          <Box className="cfs-card drift-wall" sx={{ ...PANEL_SX, py: { xs: 4, sm: 5 }, px: 2, textAlign: "center" }}>
            <Box sx={{ width: 56, height: 56, mx: "auto", mb: 1.5, borderRadius: "17px", display: "grid", placeItems: "center", bgcolor: C.greenSoft, color: C.green }}>
              <Activity size={25} />
            </Box>
            <Typography sx={{ fontSize: 16, fontWeight: 850, color: C.ink }}>Your deal scenario will appear here</Typography>
            <Typography sx={{ maxWidth: 560, mx: "auto", mt: 0.8, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              Choose a customer, enter the total selling price and expected payment date, then click <strong>Analyse deal</strong>. Results are not calculated until you submit the form.
            </Typography>
          </Box>
        )}

        {analysis && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {requestError && <Alert severity="info" sx={{ mb: 2, borderRadius: "12px", fontSize: 11.8 }}>{requestError}</Alert>}

            {/* Finance verdict */}
            {verdict && result && (
              <Box className="cfs-card drift-wall" sx={{ ...PANEL_SX, p: { xs: 1.5, sm: 2 }, mb: 2 }}>
                <Box sx={{ display: "flex", gap: 1.2, alignItems: "flex-start" }}>
                  <Box sx={{ width: 39, height: 39, borderRadius: "12px", display: "grid", placeItems: "center", flexShrink: 0, bgcolor: verdict.soft, color: verdict.color }}>
                    <VerdictIcon size={20} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 900, color: verdict.color }}>{verdict.label}</Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 11.5, color: C.muted, lineHeight: 1.65 }}>
                      {result.fixingAlternative ? `Consider “${result.fixingAlternative}” to address the identified cash-flow breach. ` : ""}
                      Proposed receipt of {formatINR(moneyInputToPaise(analysis.input.dealAmount))} on {formatDisplay(analysis.receiptDate || analysis.input.expectedPaymentDate)}.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Dedicated 2 ML Models Prediction Showcase */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
                gap: 2,
                mb: 2,
              }}
            >
              {/* Card 1: Model 1 Expected Delay Predictor */}
              <Box
                className="cfs-card drift-wall"
                sx={{
                  ...PANEL_SX,
                  p: { xs: 1.8, sm: 2.2 },
                  borderRadius: "18px",
                  position: "relative",
                  overflow: "hidden",
                  background: "linear-gradient(145deg, rgba(255,255,255,0.99) 0%, rgba(245,240,255,0.85) 100%)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  boxShadow: "0 10px 30px rgba(124,58,237,0.07)",
                }}
              >
                {/* Header */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "11px",
                        bgcolor: "#ede9fe",
                        color: "#6d28d9",
                        border: "1px solid rgba(139,92,246,0.25)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <BrainCircuit size={19} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: "#4c1d95" }}>
                        Model 1 · Customer Delay Predictor
                      </Typography>
                      <Typography sx={{ fontSize: 11.2, color: C.muted }}>
                        Customer History & Timing ML Regressor
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    size="small"
                    icon={<Sparkles size={11} color="#6d28d9" />}
                    label={lstm?.model_name || "LSTM_seq5"}
                    sx={{
                      bgcolor: "#ede9fe",
                      color: "#5b21b6",
                      fontWeight: 850,
                      fontSize: 11.2,
                      height: 23,
                      border: "1px solid rgba(139,92,246,0.3)",
                    }}
                  />
                </Box>

                {/* Main Prediction Display */}
                <Box sx={{ mb: 1.4 }}>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: 28, sm: 34 },
                        fontWeight: 900,
                        color: safeNumber(lstmDelay) > 4 ? "#dc2626" : safeNumber(lstmDelay) > 0 ? "#b45309" : "#059669",
                        letterSpacing: "-0.035em",
                        lineHeight: 1.1,
                      }}
                    >
                      {lstmDelay != null
                        ? `${safeNumber(lstmDelay) > 0 ? "+" : ""}${safeNumber(lstmDelay).toFixed(1)} Days`
                        : "0.0 Days"}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 750, color: C.muted }}>
                      expected payment delay
                    </Typography>
                  </Box>
                  <Typography sx={{ mt: 0.4, fontSize: 11.5, color: C.subtle }}>
                    Evaluated from {customer?.name || "customer"} ledger payment patterns
                  </Typography>
                </Box>

                {/* Context Tiles */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 1.2,
                    mb: 1.4,
                    p: 1.2,
                    borderRadius: "13px",
                    bgcolor: "rgba(237,233,254,0.45)",
                    border: "1px solid rgba(139,92,246,0.18)",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 11, color: "#6d28d9", fontWeight: 750 }}>
                      Adjusted Receipt Date
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 850, color: C.ink, mt: 0.2 }}>
                      {formatDisplay(lstmDate || analysis.receiptDate || analysis.input.expectedPaymentDate)}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: C.subtle }}>
                      Agreed: {formatDisplay(analysis.input.expectedPaymentDate)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: 11, color: "#6d28d9", fontWeight: 750 }}>
                      Late Probability Score
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 850,
                        color: (lstmProbability || 0) > 0.6 ? "#dc2626" : "#059669",
                        mt: 0.2,
                      }}
                    >
                      {formatProbability(lstmProbability)}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: C.subtle }}>
                      Confidence: {lstm?.confidence || "High"}
                    </Typography>
                  </Box>
                </Box>

                {/* Explanation text */}
                <Typography sx={{ fontSize: 11.8, color: "#4c1d95", lineHeight: 1.6, fontWeight: 550 }}>
                  {lstm?.explanation || `Model evaluated prior customer clearing intervals against new invoice amount of ${formatINR(moneyInputToPaise(analysis.input.dealAmount))}.`}
                </Typography>
              </Box>

              {/* Card 2: Model 2 Future Shortage Detection */}
              <Box
                className="cfs-card drift-wall"
                sx={{
                  ...PANEL_SX,
                  p: { xs: 1.8, sm: 2.2 },
                  borderRadius: "18px",
                  position: "relative",
                  overflow: "hidden",
                  background: catDate
                    ? "linear-gradient(145deg, rgba(255,255,255,0.99) 0%, rgba(254,242,242,0.9) 100%)"
                    : "linear-gradient(145deg, rgba(255,255,255,0.99) 0%, rgba(240,253,244,0.9) 100%)",
                  border: catDate
                    ? "1px solid rgba(239,68,68,0.32)"
                    : "1px solid rgba(16,185,129,0.32)",
                  boxShadow: catDate
                    ? "0 10px 30px rgba(239,68,68,0.07)"
                    : "0 10px 30px rgba(16,185,129,0.07)",
                }}
              >
                {/* Header */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "11px",
                        bgcolor: catDate ? "#fee2e2" : "#d1fae5",
                        color: catDate ? "#dc2626" : "#059669",
                        border: catDate ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(16,185,129,0.25)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {catDate ? <AlertTriangle size={19} /> : <ShieldCheck size={19} />}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: catDate ? "#991b1b" : "#065f46" }}>
                        Model 2 · Future Shortage Detection
                      </Typography>
                      <Typography sx={{ fontSize: 11.2, color: C.muted }}>
                        Cash Runway & Working Capital Shortfall AI
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    size="small"
                    label={catDate ? "Shortage Detected" : "Runway Protected"}
                    sx={{
                      bgcolor: catDate ? "#fee2e2" : "#d1fae5",
                      color: catDate ? "#b91c1c" : "#047857",
                      fontWeight: 850,
                      fontSize: 11.2,
                      height: 23,
                      border: catDate ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(16,185,129,0.3)",
                    }}
                  />
                </Box>

                {/* Main Shortage Display */}
                <Box sx={{ mb: 1.4 }}>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
                    <Typography
                      sx={{
                        fontSize: { xs: 26, sm: 32 },
                        fontWeight: 900,
                        color: catDate ? "#dc2626" : "#059669",
                        letterSpacing: "-0.035em",
                        lineHeight: 1.1,
                      }}
                    >
                      {catDate
                        ? (catAmount !== "Not available" ? `Deficit ${catAmount}` : "Cash Squeeze")
                        : "No Shortage Detected"}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 750, color: C.muted }}>
                      {catDate ? `around ${formatDisplay(catDate)}` : "90-day cash buffer safe"}
                    </Typography>
                  </Box>
                  <Typography sx={{ mt: 0.4, fontSize: 11.5, color: C.subtle }}>
                    Simulates delay impact against accounts payable and operating outflows
                  </Typography>
                </Box>

                {/* Context Tiles */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 1.2,
                    mb: 1.4,
                    p: 1.2,
                    borderRadius: "13px",
                    bgcolor: catDate ? "rgba(254,226,226,0.45)" : "rgba(209,250,229,0.45)",
                    border: catDate ? "1px solid rgba(239,68,68,0.18)" : "1px solid rgba(16,185,129,0.18)",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 11, color: catDate ? "#991b1b" : "#065f46", fontWeight: 750 }}>
                      Working Capital Risk
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 850,
                        color: catDate ? "#dc2626" : "#059669",
                        mt: 0.2,
                      }}
                    >
                      {catRisk || (catDate ? "High risk" : "Low risk")}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: C.subtle }}>
                      {catDate ? `Breach on ${formatDisplay(catDate)}` : "No reserve breach"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: 11, color: catDate ? "#991b1b" : "#065f46", fontWeight: 750 }}>
                      Shortfall Probability
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 850,
                        color: (normalizedCatProbability || 0) > 0.5 ? "#dc2626" : "#059669",
                        mt: 0.2,
                      }}
                    >
                      {formatProbability(normalizedCatProbability)}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: C.subtle }}>
                      Engine: CatBoost Shortfall AI
                    </Typography>
                  </Box>
                </Box>

                {/* Explanation text */}
                <Typography sx={{ fontSize: 11.8, color: catDate ? "#991b1b" : "#065f46", lineHeight: 1.6, fontWeight: 550 }}>
                  {catboost?.explanation || (catDate
                    ? `Upcoming commitments drain cash before the delayed receipt of ${formatINR(moneyInputToPaise(analysis.input.dealAmount))} arrives on ${formatDisplay(analysis.receiptDate || analysis.input.expectedPaymentDate)}.`
                    : `Sufficient operating runway remains intact throughout the settlement period with low point ${formatINR(safeNumber(result?.projectedMinimumPaise), { compact: true })}.`)}
                </Typography>
              </Box>
            </Box>

            {/* Two-column side-by-side layout: Left side Graph Card, Right side 4 Deal Metrics + AI Deal Scenario */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "1.06fr 0.94fr" },
                gap: 2,
                mb: 2,
                alignItems: "stretch",
              }}
            >
              {/* Left side: Deal Graph Card */}
              <GraphPanel graph={analysis.graph} neo4jConnected={Boolean(intel?.neo4jConnected)} />

              {/* Right side: 4 Key Metric Cards (placed where Predictive Intelligence was) + AI Deal Scenario */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                {/* 4 Deal Metrics in 2x2 Grid with drift-wall motion cards */}
                {result && (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "repeat(1, minmax(0, 1fr))", sm: "repeat(2, minmax(0, 1fr))" },
                      gap: 1.3,
                    }}
                  >
                    {[
                      {
                        label: "Proposed deal value",
                        value: formatINR(result.revenuePaise ?? moneyInputToPaise(analysis.input.dealAmount), { compact: true }),
                        note: "Potential receipt, not profit",
                        icon: CircleDollarSign,
                        tone: C.green,
                        bgGlow: "rgba(16,185,129,0.06)",
                      },
                      {
                        label: "Current cash",
                        value: result.currentCashPaise == null ? "Not available" : formatINR(result.currentCashPaise, { compact: true }),
                        note: "From transaction",
                        icon: Wallet,
                        tone: C.blue,
                        bgGlow: "rgba(59,130,246,0.06)",
                      },
                      {
                        label: "Projected low point",
                        value: result.projectedMinimumPaise == null ? "Not available" : formatINR(result.projectedMinimumPaise, { compact: true }),
                        note: "Recorded future movements only",
                        icon: TrendingDown,
                        tone: result.projectedMinimumPaise != null && result.projectedMinimumPaise < 0 ? C.red : C.green,
                        bgGlow: result.projectedMinimumPaise != null && result.projectedMinimumPaise < 0 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)",
                      },
                      {
                        label: "Days to receipt",
                        value: result.daysToPayment == null ? "—" : `${result.daysToPayment}d`,
                        note: `Expected ${formatDisplay(analysis.receiptDate || analysis.input.expectedPaymentDate)}`,
                        icon: Clock3,
                        tone: C.blue,
                        bgGlow: "rgba(59,130,246,0.06)",
                      },
                    ].map((metric) => {
                      const MetricIcon = metric.icon;
                      return (
                        <Box
                          key={metric.label}
                          className="cfs-card drift-wall"
                          sx={{
                            ...PANEL_SX,
                            p: { xs: 1, sm: 1.25 },
                            borderRadius: "13px",
                            minWidth: 0,
                            background: `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, ${metric.bgGlow} 100%)`,
                          }}
                        >
                          <Box sx={{ display: "flex", gap: 0.65, alignItems: "center", mb: 0.45 }}>
                            <Box
                              sx={{
                                width: 22,
                                height: 22,
                                borderRadius: "6px",
                                display: "grid",
                                placeItems: "center",
                                bgcolor: `${metric.tone}16`,
                                color: metric.tone,
                              }}
                            >
                              <MetricIcon size={12} />
                            </Box>
                            <Typography sx={{ fontSize: 11.8, color: C.muted, fontWeight: 800 }}>
                              {metric.label}
                            </Typography>
                          </Box>
                          <Typography
                            sx={{
                              fontSize: { xs: 15, sm: 17.5 },
                              lineHeight: 1.15,
                              color: metric.tone,
                              fontWeight: 900,
                              letterSpacing: "-0.03em",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {metric.value}
                          </Typography>
                          <Typography sx={{ mt: 0.25, fontSize: 11.5, lineHeight: 1.35, color: C.subtle }}>
                            {metric.note}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* AI agent scenario and recommendations */}
                <Box
                  className="cfs-card drift-wall"
                  sx={{
                    ...PANEL_SX,
                    p: { xs: 1.5, sm: 2 },
                    flex: 1,
                    borderRadius: "18px",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "11px",
                        bgcolor: "#f0edfb",
                        color: "#6d55a3",
                      }}
                    >
                      <Sparkles size={19} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 900, color: C.ink }}>
                        AI deal scenario
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: C.subtle, mt: 0.2 }}>
                        Autonomous Cash & Risk Evaluation
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      icon={<Sparkles size={11} color="#6d55a3" />}
                      label="AI Synthesized Verdict"
                      sx={{
                        height: 24,
                        bgcolor: "#f0edfb",
                        color: "#6d55a3",
                        fontWeight: 800,
                        fontSize: 11.8,
                      }}
                    />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: { xs: 13.5, sm: 15 },
                      fontWeight: 600,
                      color: "#14382B",
                      lineHeight: 1.75,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {agentSummary}
                  </Typography>

                  {agentFindings.length > 0 && (
                    <Box sx={{ mt: 1.8 }}>
                      <Typography
                        sx={{
                          fontSize: 11.8,
                          fontWeight: 900,
                          letterSpacing: ".12em",
                          textTransform: "uppercase",
                          color: C.muted,
                          mb: 0.8,
                        }}
                      >
                        Scenario findings
                      </Typography>
                      <Box sx={{ display: "grid", gap: 0.7 }}>
                        {agentFindings.map((item, index) => (
                          <Box key={`${index}-${String(item)}`} sx={{ display: "flex", gap: 0.8, alignItems: "flex-start" }}>
                            <CheckCircle2 size={15} color={C.green} style={{ marginTop: 3, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", fontWeight: 550 }}>
                              {typeof item === "string" ? item : item?.text || item?.description || JSON.stringify(item)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {agentActions.length > 0 && (
                    <Box sx={{ mt: 1.8, p: 1.4, borderRadius: "13px", bgcolor: "#f2f8f4", border: "1px solid #dcece1" }}>
                      <Typography
                        sx={{
                          fontSize: 11.8,
                          fontWeight: 900,
                          letterSpacing: ".12em",
                          textTransform: "uppercase",
                          color: C.green,
                          mb: 0.7,
                        }}
                      >
                        Recommended next actions
                      </Typography>
                      {agentActions.map((item, index) => (
                        <Typography
                          key={`${index}-${String(item)}`}
                          sx={{
                            fontSize: 12.5,
                            lineHeight: 1.65,
                            color: C.greenDeep,
                            fontWeight: 600,
                            mb: index === agentActions.length - 1 ? 0 : 0.45,
                          }}
                        >
                          {index + 1}. {typeof item === "string" ? item : item?.action || item?.text || item?.description || JSON.stringify(item)}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Alternatives table from existing finance service */}
            {Array.isArray(result?.alternatives) && result.alternatives.length > 0 && (
              <Box className="cfs-card drift-wall" sx={{ ...PANEL_SX, overflow: "hidden", mb: 2 }}>
                <Box sx={{ p: 1.8, pb: 1.1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: C.ink }}>Deal alternatives</Typography>
                  <Typography sx={{ mt: 0.3, fontSize: 11.8, color: C.subtle }}>Compare revised terms using the existing finance evaluation service.</Typography>
                </Box>
                <TableContainer sx={{ overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 690, "& .MuiTableCell-root": { borderColor: "#edf2ee", px: 1.5, py: 1.2 } }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f4f8f5", "& .MuiTableCell-root": { fontSize: 11.8, color: C.muted, fontWeight: 850, whiteSpace: "nowrap" } }}>
                        <TableCell>Alternative</TableCell>
                        <TableCell align="right">Margin</TableCell>
                        <TableCell align="right">Minimum cash</TableCell>
                        <TableCell>Reserve breach</TableCell>
                        <TableCell align="right">Working capital</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.alternatives.map((alternative, index) => (
                        <TableRow key={`${alternative.label || "alternative"}-${index}`} hover>
                          <TableCell>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: C.ink }}>{alternative.label || `Alternative ${index + 1}`}</Typography>
                            {alternative.note && <Typography sx={{ fontSize: 11.5, color: C.subtle, mt: 0.25 }}>{alternative.note}</Typography>}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 750 }}>{alternative.marginPct == null ? "—" : formatPct(alternative.marginPct, 1)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 750, color: safeNumber(alternative.minBalancePaise) < 0 ? C.red : C.ink, whiteSpace: "nowrap" }}>{alternative.minBalancePaise == null ? "—" : formatINR(alternative.minBalancePaise, { compact: true })}</TableCell>
                          <TableCell>{alternative.breachDate ? <Chip size="small" label={formatDisplay(alternative.breachDate)} sx={{ height: 21, fontSize: 11.5, bgcolor: C.redSoft, color: C.red, fontWeight: 800 }} /> : <Chip size="small" label="None in preview" sx={{ height: 21, fontSize: 11.5, bgcolor: C.greenSoft, color: C.green, fontWeight: 800 }} />}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 750, whiteSpace: "nowrap" }}>{alternative.workingCapitalPaise == null ? "—" : formatINR(alternative.workingCapitalPaise, { compact: true })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}


            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={resetAnalysis}
                sx={{ ...BUTTON_SX, borderColor: "#d5e4da", color: C.greenDeep }}
              >
                Start another deal
              </Button>
              <Button
                variant="contained"
                onClick={sendToLab}
                disabled={!analysis.engineForm}
                startIcon={<GitBranch size={15} />}
                sx={{ ...BUTTON_SX, bgcolor: C.green, color: "#fff", "&:hover": { bgcolor: C.greenDeep }, "&.Mui-disabled": { bgcolor: "#d7e5dc", color: "#81968a" } }}
              >
                Continue in Scenario Lab
              </Button>
            </Box>
          </motion.div>
        )}
      </motion.div>
    </Box>
    </>
  );
}
