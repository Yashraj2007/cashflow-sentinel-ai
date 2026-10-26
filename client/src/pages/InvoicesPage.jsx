import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import GlobalStyles from "@mui/material/GlobalStyles";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TablePagination from "@mui/material/TablePagination";
import TableSortLabel from "@mui/material/TableSortLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { Receipt, ClipboardList, Download, UploadCloud, Plus, ArrowUpRight, ArrowDownRight, Filter, X } from "lucide-react";

import { useApp } from "../context/AppContext.jsx";
import { InvoiceStatusBadge, RiskChip, PriorityChip, EmptyState } from "../components/common.jsx";
import { downloadCSV } from "../utils/csv.js";
import InvoiceImportWizard from "../components/invoices/InvoiceImportWizard.jsx";
import InvoiceDetailDrawer from "../components/invoices/InvoiceDetailDrawer.jsx";
import {
  outstandingPaise,
  salesInvoiceStatus,
  purchaseInvoiceStatus,
  predictPayment,
  customerRiskLevel,
  customerPaymentStats,
  supplierDeliveryStats,
} from "../utils/calculations.js";
import { formatINR, formatDisplay, todayISO, rupeesToPaise, addDaysISO, daysBetween } from "../utils/finance.js";

const SALES_STATUS_FILTERS = ["", "draft", "upcoming", "partial", "paid", "overdue", "at_risk"];
const PURCHASE_STATUS_FILTERS = ["", "upcoming", "partial", "paid", "overdue"];

export default function InvoicesPage({ initialTab = 0 }) {
  const { dataset, dispatch, toast } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = todayISO();

  // Tab: 0 = Sales Invoices (Receivables), 1 = Purchase Invoices (Payables)
  const [currentTab, setCurrentTab] = useState(() => {
    const typeParam = searchParams.get("type") || searchParams.get("tab");
    if (typeParam === "purchase" || typeParam === "bills" || initialTab === 1) return 1;
    return 0;
  });

  useEffect(() => {
    const typeParam = searchParams.get("type") || searchParams.get("tab");
    if (typeParam === "purchase" || typeParam === "bills") setCurrentTab(1);
    else if (typeParam === "sales") setCurrentTab(0);
  }, [searchParams]);

  const handleTabChange = (_, val) => {
    setCurrentTab(val);
    setSearchParams({ type: val === 1 ? "purchase" : "sales" });
    setSalesPage(0);
    setPurchasePage(0);
  };

  // --------------------------------------------------------------------------
  // Sales Invoices State
  // --------------------------------------------------------------------------
  const [salesSearch, setSalesSearch] = useState("");
  const [salesStatus, setSalesStatus] = useState("");
  const [salesCustomer, setSalesCustomer] = useState("");
  const [salesOrderBy, setSalesOrderBy] = useState("dueDate");
  const [salesOrder, setSalesOrder] = useState("asc");
  const [salesPage, setSalesPage] = useState(0);
  const [salesRowsPerPage, setSalesRowsPerPage] = useState(10);
  const [salesDlg, setSalesDlg] = useState({ open: false, mode: "add", id: null });
  const [salesForm, setSalesForm] = useState({
    number: "",
    partyId: "",
    amount: "",
    issueDate: today,
    dueDate: addDaysISO(today, 30),
    expectedPaymentDate: "",
    poRef: "",
  });

  // --------------------------------------------------------------------------
  // Purchase Invoices State
  // --------------------------------------------------------------------------
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState("");
  const [purchaseSupplier, setPurchaseSupplier] = useState("");
  const [purchasePriority, setPurchasePriority] = useState("");
  const [purchaseOrderBy, setPurchaseOrderBy] = useState("plannedPaymentDate");
  const [purchaseOrder, setPurchaseOrder] = useState("asc");
  const [purchasePage, setPurchasePage] = useState(0);
  const [purchaseRowsPerPage, setPurchaseRowsPerPage] = useState(10);
  const [purchaseDlg, setPurchaseDlg] = useState({ open: false, mode: "add", id: null });
  const [purchaseForm, setPurchaseForm] = useState({
    number: "",
    partyId: "",
    amount: "",
    plannedPaymentDate: addDaysISO(today, 21),
    actualPaymentDate: "",
    priority: "normal",
    poRef: "",
  });

  // Common Drawer & Wizard
  const [importOpen, setImportOpen] = useState(false);
  const [detailDrawer, setDetailDrawer] = useState({ open: false, type: "sales", id: null });

  const customers = useMemo(() => {
    const map = {};
    ((dataset && dataset.customers) || []).forEach((c) => { map[c.id] = c; });
    return map;
  }, [dataset?.customers]);

  const suppliers = useMemo(() => {
    const map = {};
    ((dataset && dataset.suppliers) || []).forEach((s) => { map[s.id] = s; });
    return map;
  }, [dataset?.suppliers]);

  // --------------------------------------------------------------------------
  // Sales Rows Memo
  // --------------------------------------------------------------------------
  const salesRows = useMemo(() => {
    const invoices = (dataset && dataset.salesInvoices) || [];
    let list = invoices.map((inv) => {
      const customer = customers[inv.partyId];
      const outstanding = outstandingPaise(inv);
      const status = salesInvoiceStatus(inv, today);
      const prediction = predictPayment(inv, customer, dataset?.transactions || [], today);
      const risk = customerRiskLevel(customer);
      const stats = customerPaymentStats(customer);
      return { inv, customer, outstanding, status, prediction, risk, stats };
    });

    if (salesSearch.trim()) {
      const q = salesSearch.toLowerCase();
      list = list.filter((r) => r.inv.number.toLowerCase().includes(q) || (r.customer && r.customer.name.toLowerCase().includes(q)));
    }
    if (salesStatus) list = list.filter((r) => r.status === salesStatus);
    if (salesCustomer) list = list.filter((r) => r.inv.partyId === salesCustomer);

    const dir = salesOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (salesOrderBy === "amount") return (a.inv.amountPaise - b.inv.amountPaise) * dir;
      if (salesOrderBy === "expected") return a.prediction.expectedDate.localeCompare(b.prediction.expectedDate) * dir;
      return a.inv.dueDate.localeCompare(b.inv.dueDate) * dir;
    });
    return list;
  }, [dataset?.salesInvoices, dataset?.transactions, customers, salesSearch, salesStatus, salesCustomer, salesOrderBy, salesOrder, today]);

  // --------------------------------------------------------------------------
  // Purchase Rows Memo
  // --------------------------------------------------------------------------
  const purchaseRows = useMemo(() => {
    const invoices = (dataset && dataset.purchaseInvoices) || [];
    let list = invoices.map((inv) => {
      const supplier = suppliers[inv.partyId];
      const outstanding = outstandingPaise(inv);
      const status = purchaseInvoiceStatus(inv, today);
      const stats = supplierDeliveryStats(supplier);
      return { inv, supplier, outstanding, status, stats };
    });

    if (purchaseSearch.trim()) {
      const q = purchaseSearch.toLowerCase();
      list = list.filter((r) => r.inv.number.toLowerCase().includes(q) || (r.supplier && r.supplier.name.toLowerCase().includes(q)));
    }
    if (purchaseStatus) list = list.filter((r) => r.status === purchaseStatus);
    if (purchaseSupplier) list = list.filter((r) => r.inv.partyId === purchaseSupplier);
    if (purchasePriority) list = list.filter((r) => r.inv.priority === purchasePriority);

    const dir = purchaseOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (purchaseOrderBy === "amount") return (a.inv.amountPaise - b.inv.amountPaise) * dir;
      if (purchaseOrderBy === "dueDate") return a.inv.dueDate.localeCompare(b.inv.dueDate) * dir;
      return (a.inv.plannedPaymentDate || a.inv.dueDate).localeCompare(b.inv.plannedPaymentDate || b.inv.dueDate) * dir;
    });
    return list;
  }, [dataset?.purchaseInvoices, suppliers, purchaseSearch, purchaseStatus, purchaseSupplier, purchasePriority, purchaseOrderBy, purchaseOrder, today]);

  // Paged
  const salesPaged = salesRows.slice(salesPage * salesRowsPerPage, salesPage * salesRowsPerPage + salesRowsPerPage);
  const purchasePaged = purchaseRows.slice(purchasePage * purchaseRowsPerPage, purchasePage * purchaseRowsPerPage + purchaseRowsPerPage);

  // Totals
  const totalSalesInvoiced = salesRows.reduce((s, r) => s + r.inv.amountPaise, 0);
  const totalSalesOutstanding = salesRows.reduce((s, r) => s + r.outstanding, 0);
  const totalSalesOverdue = salesRows.filter((r) => r.status === "overdue" || r.status === "at_risk").reduce((s, r) => s + r.outstanding, 0);

  const totalPurchaseInvoiced = purchaseRows.reduce((s, r) => s + r.inv.amountPaise, 0);
  const totalPurchaseOutstanding = purchaseRows.reduce((s, r) => s + r.outstanding, 0);
  const criticalBillsCount = purchaseRows.filter((r) => r.inv.priority === "critical" && r.outstanding > 0).length;

  // Exports
  const handleExport = () => {
    if (currentTab === 0) {
      const data = salesRows.map((r) => ({
        number: r.inv.number,
        customer: r.customer ? r.customer.name : "",
        amount: r.inv.amountPaise / 100,
        due_date: r.inv.dueDate,
        expected_date: r.prediction.expectedDate,
        confidence: `${r.prediction.confidence}%`,
        outstanding: r.outstanding / 100,
        status: r.status,
      }));
      downloadCSV("sales-invoices.csv", data, [
        { key: "number" }, { key: "customer" }, { key: "amount" }, { key: "due_date" }, { key: "expected_date" }, { key: "confidence" }, { key: "outstanding" }, { key: "status" }
      ]);
    } else {
      const data = purchaseRows.map((r) => ({
        number: r.inv.number,
        supplier: r.supplier ? r.supplier.name : "",
        amount: r.inv.amountPaise / 100,
        planned_payment_date: r.inv.plannedPaymentDate || r.inv.dueDate,
        actual_payment_date: r.inv.actualPaymentDate || "",
        outstanding: r.outstanding / 100,
        status: r.status,
        priority: r.inv.priority,
      }));
      downloadCSV("purchase-invoices.csv", data, [
        { key: "number" }, { key: "supplier" }, { key: "amount" }, { key: "planned_payment_date" }, { key: "actual_payment_date" }, { key: "outstanding" }, { key: "status" }, { key: "priority" }
      ]);
    }
  };

  // Add Sales Invoice
  const submitSalesAdd = () => {
    if (!salesForm.number.trim() || !salesForm.partyId || !(Number(salesForm.amount) > 0)) {
      toast("Number, customer and a positive amount are required", "error");
      return;
    }
    const amountPaise = rupeesToPaise(Number(salesForm.amount));
    if (salesDlg.mode === "edit") {
      dispatch({
        type: "UPDATE_SALES_INVOICE",
        id: salesDlg.id,
        patch: {
          number: salesForm.number.trim(),
          partyId: salesForm.partyId,
          amountPaise,
          issueDate: salesForm.issueDate,
          dueDate: salesForm.dueDate,
          expectedPaymentDate: salesForm.expectedPaymentDate || null,
          poRef: salesForm.poRef || null,
        },
      });
      toast(`Sales invoice ${salesForm.number} updated`);
    } else {
      dispatch({
        type: "ADD_SALES_INVOICE",
        invoice: {
          id: `si-u-${Date.now()}`,
          number: salesForm.number.trim(),
          partyId: salesForm.partyId,
          amountPaise,
          paidPaise: 0,
          issueDate: salesForm.issueDate,
          dueDate: salesForm.dueDate,
          expectedPaymentDate: salesForm.expectedPaymentDate || null,
          poRef: salesForm.poRef || null,
        },
      });
      toast(`Sales invoice ${salesForm.number} added`);
    }
    setSalesDlg({ open: false, mode: "add", id: null });
  };

  // Add Purchase Bill
  const submitPurchaseAdd = () => {
    if (!purchaseForm.number.trim() || !purchaseForm.partyId || !(Number(purchaseForm.amount) > 0)) {
      toast("Bill number, supplier and a positive amount are required", "error");
      return;
    }
    const amountPaise = rupeesToPaise(Number(purchaseForm.amount));
    const plannedDate = purchaseForm.plannedPaymentDate || addDaysISO(today, 21);
    const actualDate = purchaseForm.actualPaymentDate || null;
    const isPaid = Boolean(actualDate);

    if (purchaseDlg.mode === "edit") {
      dispatch({
        type: "UPDATE_PURCHASE_INVOICE",
        id: purchaseDlg.id,
        patch: {
          number: purchaseForm.number.trim(),
          partyId: purchaseForm.partyId,
          amountPaise,
          dueDate: plannedDate,
          plannedPaymentDate: plannedDate,
          actualPaymentDate: actualDate,
          paidPaise: isPaid ? amountPaise : 0,
          priority: purchaseForm.priority,
          poRef: purchaseForm.poRef || null,
        },
      });
      toast(`Bill ${purchaseForm.number} updated`);
    } else {
      dispatch({
        type: "ADD_PURCHASE_INVOICE",
        invoice: {
          id: `pi-u-${Date.now()}`,
          number: purchaseForm.number.trim(),
          partyId: purchaseForm.partyId,
          amountPaise,
          paidPaise: isPaid ? amountPaise : 0,
          issueDate: today,
          dueDate: plannedDate,
          plannedPaymentDate: plannedDate,
          actualPaymentDate: actualDate,
          priority: purchaseForm.priority,
          poRef: purchaseForm.poRef || null,
        },
      });
      toast(`Bill ${purchaseForm.number} added`);
    }
    setPurchaseDlg({ open: false, mode: "add", id: null });
  };

  return (
    <Box
      className="page"
      sx={{
        position: "relative",
        "& .cfs-card": {
          transition: "all 0.26s cubic-bezier(0.16, 1, 0.3, 1)",
          "&:hover": {
            borderColor: "rgba(16, 185, 129, 0.28)",
            boxShadow: "0 12px 28px -6px rgba(15, 23, 42, 0.09), 0 0 0 1px rgba(16, 185, 129, 0.14)",
            transform: "translateY(-3px)",
          },
        },
      }}
    >
      <GlobalStyles
        styles={{
          "@keyframes cfs-breathe": {
            "0%,100%": { opacity: 0.42, transform: "scale(0.97)" },
            "50%": { opacity: 0.68, transform: "scale(1.03)" },
          },
        }}
      />

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
          background: "radial-gradient(circle, rgba(74,158,122,0.18) 0%, rgba(74,158,122,0.035) 48%, transparent 72%)",
          filter: "blur(36px)",
          animation: "cfs-breathe 10s ease-in-out infinite",
        }}
      />

      {/* Branded Hero Header */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          mb: 2.5,
          p: { xs: 2.1, sm: 2.7, lg: 3.1 },
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "21px",
          background: "radial-gradient(circle at 88% 8%, rgba(150,218,184,0.18), transparent 31%), linear-gradient(118deg,#11281F 0%,#16382B 54%,#20513D 100%)",
          boxShadow: "0 18px 44px rgba(20,45,36,0.14), inset 0 1px 0 rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", md: "row" },
          gap: 2.3,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.9, mb: 1 }}>
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
              <Receipt size={13} color="#B5E7CC" />
            </Box>
            <Typography sx={{ color: "#B5E7CC", fontSize: 11.8, fontWeight: 850, letterSpacing: "1.6px", textTransform: "uppercase" }}>
              Invoice Management Center
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
            }}
          >
            Invoices
          </Typography>

          <Typography sx={{ mt: 0.9, maxWidth: 680, fontSize: 12, lineHeight: 1.7, color: "rgba(239,248,242,0.77)" }}>
            Unified register for customer sales invoices (money coming in) and supplier purchase bills (money going out). Monitor due dates and payment probabilities to keep cash-flow forecasts reliable.
          </Typography>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.1, flexWrap: "wrap", flexShrink: 0 }}>
          <Button
            variant="outlined"
            startIcon={<UploadCloud size={14} color="#B5E7CC" />}
            onClick={() => setImportOpen(true)}
            sx={{
              textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: "13px", minHeight: 38, px: 1.6,
              border: "1px solid rgba(255,255,255,0.2)", bgcolor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", color: "#FFFFFF",
              "&:hover": { bgcolor: "rgba(255,255,255,0.15)", borderColor: "rgba(181,231,204,0.55)", transform: "translateY(-1px)" },
            }}
          >
            Import CSV
          </Button>

          <Button
            variant="outlined"
            startIcon={<Download size={14} color="#B5E7CC" />}
            onClick={handleExport}
            sx={{
              textTransform: "none", fontWeight: 700, fontSize: 12.5, borderRadius: "13px", minHeight: 38, px: 1.6,
              border: "1px solid rgba(255,255,255,0.2)", bgcolor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", color: "#FFFFFF",
              "&:hover": { bgcolor: "rgba(255,255,255,0.15)", borderColor: "rgba(181,231,204,0.55)", transform: "translateY(-1px)" },
            }}
          >
            Export CSV
          </Button>

          <Button
            variant="contained"
            startIcon={<Plus size={15} />}
            onClick={() => (currentTab === 0 ? setSalesDlg({ open: true, mode: "add", id: null }) : setPurchaseDlg({ open: true, mode: "add", id: null }))}
            sx={{
              textTransform: "none", fontWeight: 800, fontSize: 12.5, borderRadius: "13px", minHeight: 38, px: 2,
              color: "#082115", background: "linear-gradient(135deg, #70D6B1 0%, #4EBA93 100%)", boxShadow: "0 8px 18px rgba(78, 186, 147, 0.35)",
              "&:hover": { background: "linear-gradient(135deg, #81E2BE 0%, #5BC9A1 100%)", boxShadow: "0 10px 22px rgba(78, 186, 147, 0.45)", transform: "translateY(-1px)" },
            }}
          >
            {currentTab === 0 ? "+ Add sales invoice" : "+ Add purchase bill"}
          </Button>
        </Box>
      </Box>

      {/* Segmented Tab Navigator with Top Hover Animations */}
      <Box
        sx={{
          mb: 2.5,
          p: 0.6,
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderRadius: "16px",
          border: "1px solid #E5E7EB",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          display: "inline-flex",
          width: { xs: "100%", sm: "auto" },
        }}
      >
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            minHeight: 44,
            "& .MuiTabs-indicator": {
              height: "100%",
              borderRadius: "12px",
              bgcolor: "#14382B",
              zIndex: 0,
            },
            "& .MuiTab-root": {
              zIndex: 1,
              minHeight: 44,
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: "12px",
              fontSize: 13,
              fontWeight: 780,
              textTransform: "none",
              color: "#5C6D63",
              transition: "all 0.2s ease",
              "&:hover": {
                color: "#14382B",
                transform: "translateY(-1px)",
              },
              "&.Mui-selected": {
                color: "#FFFFFF",
              },
            },
          }}
        >
          <Tab
            icon={<ArrowDownRight size={16} />}
            iconPosition="start"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Sales Invoices (Receivables)</span>
                <Chip
                  size="small"
                  label={salesRows.length}
                  sx={{
                    height: 19,
                    fontSize: 11.8,
                    fontWeight: 800,
                    bgcolor: currentTab === 0 ? "rgba(255,255,255,0.22)" : "rgba(16,185,129,0.12)",
                    color: currentTab === 0 ? "#FFFFFF" : "#059669",
                  }}
                />
              </Box>
            }
          />
          <Tab
            icon={<ArrowUpRight size={16} />}
            iconPosition="start"
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Purchase Invoices (Payables)</span>
                <Chip
                  size="small"
                  label={purchaseRows.length}
                  sx={{
                    height: 19,
                    fontSize: 11.8,
                    fontWeight: 800,
                    bgcolor: currentTab === 1 ? "rgba(255,255,255,0.22)" : "rgba(245,158,11,0.14)",
                    color: currentTab === 1 ? "#FFFFFF" : "#D97706",
                  }}
                />
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* ========================================================================= */}
      {/* TAB 0: SALES INVOICES (RECEIVABLES)                                       */}
      {/* ========================================================================= */}
      {currentTab === 0 && (
        <Box>
          {/* Top KPI Cards with Elevation Hover */}
          <Box className="grid-3" sx={{ mb: 2.5 }}>
            <Box className="cfs-card" sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                Total Sales Invoiced
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#111827", mt: 0.5 }}>
                {formatINR(totalSalesInvoiced)}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: "#059669", mt: 0.5, fontWeight: 600 }}>
                {salesRows.length} invoices across active clients
              </Typography>
            </Box>

            <Box className="cfs-card" sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                Outstanding Receivables
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#2563EB", mt: 0.5 }}>
                {formatINR(totalSalesOutstanding)}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: "#6B7280", mt: 0.5 }}>
                Cash awaiting collection into bank
              </Typography>
            </Box>

            <Box className="cfs-card" sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                Overdue / At Risk
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: totalSalesOverdue > 0 ? "#DC2626" : "#059669", mt: 0.5 }}>
                {formatINR(totalSalesOverdue)}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: totalSalesOverdue > 0 ? "#DC2626" : "#059669", mt: 0.5, fontWeight: 600 }}>
                {salesRows.filter((r) => r.status === "overdue" || r.status === "at_risk").length} delayed payments
              </Typography>
            </Box>
          </Box>

          {/* Filter Bar & Table */}
          <Box className="cfs-card cfs-card--flush">
            <Box sx={{ p: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="Search invoice # or customer…"
                value={salesSearch}
                onChange={(e) => { setSalesSearch(e.target.value); setSalesPage(0); }}
                sx={{ width: { xs: "100%", sm: 250 } }}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
              />
              <TextField
                select
                size="small"
                label="Status"
                value={salesStatus}
                onChange={(e) => { setSalesStatus(e.target.value); setSalesPage(0); }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">All statuses</MenuItem>
                {SALES_STATUS_FILTERS.filter(Boolean).map((s) => (
                  <MenuItem key={s} value={s}>{s.replace("_", " ")}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Customer"
                value={salesCustomer}
                onChange={(e) => { setSalesCustomer(e.target.value); setSalesPage(0); }}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="">All customers</MenuItem>
                {((dataset && dataset.customers) || []).map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">
                      <TableSortLabel active={salesOrderBy === "amount"} direction={salesOrder} onClick={() => { setSalesOrderBy("amount"); setSalesOrder((o) => (o === "asc" ? "desc" : "asc")); }}>
                        Amount
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel active={salesOrderBy === "dueDate"} direction={salesOrder} onClick={() => { setSalesOrderBy("dueDate"); setSalesOrder((o) => (o === "asc" ? "desc" : "asc")); }}>
                        Due date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel active={salesOrderBy === "expected"} direction={salesOrder} onClick={() => { setSalesOrderBy("expected"); setSalesOrder((o) => (o === "asc" ? "desc" : "asc")); }}>
                        AI Predicted Payment
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Outstanding</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesPaged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <EmptyState title="No sales invoices found" body="Adjust your filter or create a new sales invoice." />
                      </TableCell>
                    </TableRow>
                  )}
                  {salesPaged.map((row) => (
                    <TableRow key={row.inv.id} hover sx={{ transition: "background-color 0.18s ease" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>
                        {row.inv.number}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 650, color: "#1F2937" }}>
                          {row.customer ? row.customer.name : "—"}
                        </Typography>
                        {row.customer && <RiskChip level={row.risk} sx={{ mt: 0.3 }} />}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 750, fontSize: 13.5 }}>
                        {formatINR(row.inv.amountPaise)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
                        {formatDisplay(row.inv.dueDate)}
                      </TableCell>
                      <TableCell>
                        <Tooltip title={(row.prediction?.reasons || []).join(" ")} arrow>
                          <Chip
                            size="small"
                            label={`${formatDisplay(row.prediction.expectedDate)} (${row.prediction.confidence}%)`}
                            sx={{
                              height: 22,
                              fontSize: 12,
                              fontWeight: 750,
                              bgcolor: row.prediction.confidence >= 80 ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.14)",
                              color: row.prediction.confidence >= 80 ? "#065F46" : "#B45309",
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12.8, color: row.outstanding > 0 ? "#111827" : "#059669" }}>
                        {formatINR(row.outstanding)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View invoice drawer">
                          <IconButton size="small" onClick={() => setDetailDrawer({ open: true, type: "sales", id: row.inv.id })}>
                            <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Simulate 10-day delay in Scenario Lab">
                          <IconButton
                            size="small"
                            onClick={() => {
                              dispatch({
                                type: "SET_SCENARIO_DRAFT",
                                draft: { type: "delayInvoice", invoiceType: "sales", invoiceId: row.inv.id, days: 10, label: `${row.inv.number} pays 10 days later` },
                              });
                              navigate("/scenario-lab");
                            }}
                          >
                            <ScienceOutlinedIcon sx={{ fontSize: 18, color: "#0F766E" }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit invoice">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSalesForm({
                                number: row.inv.number,
                                partyId: row.inv.partyId,
                                amount: String(row.inv.amountPaise / 100),
                                issueDate: row.inv.issueDate,
                                dueDate: row.inv.dueDate,
                                expectedPaymentDate: row.inv.expectedPaymentDate || "",
                                poRef: row.inv.poRef || "",
                              });
                              setSalesDlg({ open: true, mode: "edit", id: row.inv.id });
                            }}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={salesRows.length}
              page={salesPage}
              onPageChange={(_, p) => setSalesPage(p)}
              rowsPerPage={salesRowsPerPage}
              onRowsPerPageChange={(e) => { setSalesRowsPerPage(parseInt(e.target.value, 10)); setSalesPage(0); }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Box>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PURCHASE INVOICES (PAYABLES)                                       */}
      {/* ========================================================================= */}
      {currentTab === 1 && (
        <Box>
          {/* Top KPI Cards with Elevation Hover */}
          <Box className="grid-3" sx={{ mb: 2.5 }}>
            <Box className="cfs-card" sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                Total Supplier Bills
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#111827", mt: 0.5 }}>
                {formatINR(totalPurchaseInvoiced)}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: "#6B7280", mt: 0.5, fontWeight: 600 }}>
                {purchaseRows.length} bills recorded
              </Typography>
            </Box>

            <Box className="cfs-card" sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                Outstanding Payables
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#D97706", mt: 0.5 }}>
                {formatINR(totalPurchaseOutstanding)}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: "#6B7280", mt: 0.5 }}>
                Committed outflows in cash forecast
              </Typography>
            </Box>

            <Box className="cfs-card" sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>
                Critical Delivery Payables
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: criticalBillsCount > 0 ? "#DC2626" : "#059669", mt: 0.5 }}>
                {criticalBillsCount}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: criticalBillsCount > 0 ? "#DC2626" : "#059669", mt: 0.5, fontWeight: 600 }}>
                {criticalBillsCount > 0 ? "Holds upcoming customer shipments" : "All delivery bills clear"}
              </Typography>
            </Box>
          </Box>

          {/* Filter Bar & Table */}
          <Box className="cfs-card cfs-card--flush">
            <Box sx={{ p: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="Search bill # or supplier…"
                value={purchaseSearch}
                onChange={(e) => { setPurchaseSearch(e.target.value); setPurchasePage(0); }}
                sx={{ width: { xs: "100%", sm: 250 } }}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
              />
              <TextField
                select
                size="small"
                label="Status"
                value={purchaseStatus}
                onChange={(e) => { setPurchaseStatus(e.target.value); setPurchasePage(0); }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">All statuses</MenuItem>
                {PURCHASE_STATUS_FILTERS.filter(Boolean).map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Supplier"
                value={purchaseSupplier}
                onChange={(e) => { setPurchaseSupplier(e.target.value); setPurchasePage(0); }}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="">All suppliers</MenuItem>
                {((dataset && dataset.suppliers) || []).map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Priority"
                value={purchasePriority}
                onChange={(e) => { setPurchasePriority(e.target.value); setPurchasePage(0); }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">All priorities</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </TextField>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bill #</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell align="right">
                      <TableSortLabel active={purchaseOrderBy === "amount"} direction={purchaseOrder} onClick={() => { setPurchaseOrderBy("amount"); setPurchaseOrder((o) => (o === "asc" ? "desc" : "asc")); }}>
                        Amount
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel active={purchaseOrderBy === "plannedPaymentDate"} direction={purchaseOrder} onClick={() => { setPurchaseOrderBy("plannedPaymentDate"); setPurchaseOrder((o) => (o === "asc" ? "desc" : "asc")); }}>
                        Planned date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Payment done date</TableCell>
                    <TableCell>Outstanding</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchasePaged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <EmptyState title="No purchase bills found" body="Adjust your filter or record a new supplier bill." />
                      </TableCell>
                    </TableRow>
                  )}
                  {purchasePaged.map((row) => (
                    <TableRow key={row.inv.id} hover sx={{ transition: "background-color 0.18s ease" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>
                        {row.inv.number}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 650, color: "#1F2937" }}>
                          {row.supplier ? row.supplier.name : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 750, fontSize: 13.5 }}>
                        {formatINR(row.inv.amountPaise)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, whiteSpace: "nowrap", fontWeight: 600 }}>
                        {formatDisplay(row.inv.plannedPaymentDate || row.inv.dueDate)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: row.inv.actualPaymentDate ? "#059669" : "#6B7280" }}>
                        {row.inv.actualPaymentDate ? formatDisplay(row.inv.actualPaymentDate) : "—"}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12.8, color: row.outstanding > 0 ? "#111827" : "#059669" }}>
                        {formatINR(row.outstanding)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityChip priority={row.inv.priority} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View bill drawer">
                          <IconButton size="small" onClick={() => setDetailDrawer({ open: true, type: "purchase", id: row.inv.id })}>
                            <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit bill">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setPurchaseForm({
                                number: row.inv.number,
                                partyId: row.inv.partyId,
                                amount: String(row.inv.amountPaise / 100),
                                plannedPaymentDate: row.inv.plannedPaymentDate || row.inv.dueDate,
                                actualPaymentDate: row.inv.actualPaymentDate || "",
                                priority: row.inv.priority || "normal",
                                poRef: row.inv.poRef || "",
                              });
                              setPurchaseDlg({ open: true, mode: "edit", id: row.inv.id });
                            }}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={purchaseRows.length}
              page={purchasePage}
              onPageChange={(_, p) => setPurchasePage(p)}
              rowsPerPage={purchaseRowsPerPage}
              onRowsPerPageChange={(e) => { setPurchaseRowsPerPage(parseInt(e.target.value, 10)); setPurchasePage(0); }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Box>
        </Box>
      )}

      {/* Shared Dialogs and Drawers */}
      {importOpen && (
        <InvoiceImportWizard
          open={importOpen}
          onClose={() => setImportOpen(false)}
          initialType={currentTab === 1 ? "purchase" : "sales"}
        />
      )}

      {detailDrawer.open && (
        <InvoiceDetailDrawer
          type={detailDrawer.type}
          invoiceId={detailDrawer.id}
          open={detailDrawer.open}
          onClose={() => setDetailDrawer({ open: false, type: "sales", id: null })}
        />
      )}

      {/* Add / Edit Sales Invoice Dialog */}
      <Dialog
        open={salesDlg.open}
        onClose={() => setSalesDlg({ open: false, mode: "add", id: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "22px",
            bgcolor: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(22px) saturate(170%)",
            WebkitBackdropFilter: "blur(22px) saturate(170%)",
            border: "1px solid rgba(23, 107, 82, 0.2)",
            boxShadow: "0 24px 65px rgba(18, 56, 38, 0.22)",
            overflow: "hidden",
            transition: "transform 240ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 240ms cubic-bezier(0.16, 1, 0.3, 1), border-color 240ms ease",
            "&:hover": {
              transform: "translateY(-3px)",
              boxShadow: "0 32px 80px rgba(18, 56, 38, 0.28)",
              borderColor: "rgba(23, 107, 82, 0.38)",
            },
          },
        }}
        BackdropProps={{
          sx: {
            backdropFilter: "blur(8px)",
            bgcolor: "rgba(15, 33, 24, 0.45)",
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 2.2,
            pb: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(23, 107, 82, 0.1)",
            bgcolor: "rgba(244, 250, 246, 0.75)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                bgcolor: "rgba(23, 107, 82, 0.12)",
                color: "#176B52",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Receipt size={19} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: "#14382B", lineHeight: 1.2 }}>
                {salesDlg.mode === "edit" ? "Edit Sales Invoice" : "Add Sales Invoice"}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#5C6D63", mt: 0.2 }}>
                Record new accounts receivable entry
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => setSalesDlg({ open: false, mode: "add", id: null })}
            sx={{
              color: "#6B7280",
              p: 0.5,
              borderRadius: "8px",
              "&:hover": { bgcolor: "rgba(23, 107, 82, 0.08)", color: "#14382B" },
            }}
          >
            <X size={17} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, pt: 2.2 }}>
          <Box sx={{ display: "grid", gap: 1.6 }}>
            <TextField
              size="small"
              label="Invoice number *"
              value={salesForm.number}
              onChange={(e) => setSalesForm({ ...salesForm, number: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
              }}
              fullWidth
            />

            <TextField
              select
              size="small"
              label="Customer *"
              value={salesForm.partyId}
              onChange={(e) => setSalesForm({ ...salesForm, partyId: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
              }}
              fullWidth
            >
              {((dataset && dataset.customers) || []).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Amount (₹) *"
              type="number"
              value={salesForm.amount}
              onChange={(e) => setSalesForm({ ...salesForm, amount: e.target.value })}
              inputProps={{ min: 0 }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
              }}
              fullWidth
            />

            {/* Invoice Date & Due Date side by side with non-overlapping shrink labels */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.4 }}>
              <TextField
                size="small"
                type="date"
                label="Invoice date"
                value={salesForm.issueDate}
                onChange={(e) => setSalesForm({ ...salesForm, issueDate: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    bgcolor: "rgba(255,255,255,0.96)",
                    px: 0.6,
                    borderRadius: "4px",
                    fontWeight: 700,
                    fontSize: "12px",
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
                  "& input[type='date']": { fontSize: "13px" },
                }}
                fullWidth
              />
              <TextField
                size="small"
                type="date"
                label="Due date"
                value={salesForm.dueDate}
                onChange={(e) => setSalesForm({ ...salesForm, dueDate: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    bgcolor: "rgba(255,255,255,0.96)",
                    px: 0.6,
                    borderRadius: "4px",
                    fontWeight: 700,
                    fontSize: "12px",
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
                  "& input[type='date']": { fontSize: "13px" },
                }}
                fullWidth
              />
            </Box>

            {/* Expected payment date: clean label without verbose text, moving explanation to helperText */}
            <TextField
              size="small"
              type="date"
              label="Expected payment date"
              value={salesForm.expectedPaymentDate}
              onChange={(e) => setSalesForm({ ...salesForm, expectedPaymentDate: e.target.value })}
              InputLabelProps={{
                shrink: true,
                sx: {
                  bgcolor: "rgba(255,255,255,0.96)",
                  px: 0.6,
                  borderRadius: "4px",
                  fontWeight: 700,
                  fontSize: "12px",
                },
              }}
              helperText="Leave empty to calculate automatically from customer payment history"
              FormHelperTextProps={{ sx: { fontSize: "10.5px", color: "#5C6D63", mt: 0.3 } }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
                "& input[type='date']": { fontSize: "13px" },
              }}
              fullWidth
            />

            <TextField
              size="small"
              label="Customer PO reference"
              value={salesForm.poRef}
              onChange={(e) => setSalesForm({ ...salesForm, poRef: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
              }}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            py: 1.8,
            borderTop: "1px solid rgba(23, 107, 82, 0.08)",
            bgcolor: "rgba(244, 250, 246, 0.4)",
          }}
        >
          <Button
            onClick={() => setSalesDlg({ open: false, mode: "add", id: null })}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12.5,
              borderRadius: "10px",
              color: "#5C6D63",
              "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitSalesAdd}
            sx={{
              textTransform: "none",
              fontWeight: 750,
              fontSize: 12.5,
              borderRadius: "10px",
              px: 2.2,
              bgcolor: "#176B52",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px rgba(23, 107, 82, 0.25)",
              "&:hover": {
                bgcolor: "#104B39",
                boxShadow: "0 6px 18px rgba(23, 107, 82, 0.35)",
              },
            }}
          >
            {salesDlg.mode === "edit" ? "Save changes" : "Add invoice"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Purchase Bill Dialog */}
      <Dialog
        open={purchaseDlg.open}
        onClose={() => setPurchaseDlg({ open: false, mode: "add", id: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "22px",
            bgcolor: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(22px) saturate(170%)",
            WebkitBackdropFilter: "blur(22px) saturate(170%)",
            border: "1px solid rgba(23, 107, 82, 0.2)",
            boxShadow: "0 24px 65px rgba(18, 56, 38, 0.22)",
            overflow: "hidden",
            transition: "transform 240ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 240ms cubic-bezier(0.16, 1, 0.3, 1), border-color 240ms ease",
            "&:hover": {
              transform: "translateY(-3px)",
              boxShadow: "0 32px 80px rgba(18, 56, 38, 0.28)",
              borderColor: "rgba(23, 107, 82, 0.38)",
            },
          },
        }}
        BackdropProps={{
          sx: {
            backdropFilter: "blur(8px)",
            bgcolor: "rgba(15, 33, 24, 0.45)",
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 2.2,
            pb: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(23, 107, 82, 0.1)",
            bgcolor: "rgba(244, 250, 246, 0.75)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                bgcolor: "rgba(217, 119, 6, 0.12)",
                color: "#D97706",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ClipboardList size={19} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: "#14382B", lineHeight: 1.2 }}>
                {purchaseDlg.mode === "edit" ? "Edit Purchase Bill" : "Add Purchase Bill"}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#5C6D63", mt: 0.2 }}>
                Record supplier payable obligation
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => setPurchaseDlg({ open: false, mode: "add", id: null })}
            sx={{
              color: "#6B7280",
              p: 0.5,
              borderRadius: "8px",
              "&:hover": { bgcolor: "rgba(23, 107, 82, 0.08)", color: "#14382B" },
            }}
          >
            <X size={17} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, pt: 2.2 }}>
          <Box sx={{ display: "grid", gap: 1.6 }}>
            <TextField
              size="small"
              label="Bill number *"
              value={purchaseForm.number}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, number: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
              }}
              fullWidth
            />

            <TextField
              select
              size="small"
              label="Supplier *"
              value={purchaseForm.partyId}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, partyId: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
              }}
              fullWidth
            >
              {((dataset && dataset.suppliers) || []).map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Amount (₹) *"
              type="number"
              value={purchaseForm.amount}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
              inputProps={{ min: 0 }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
              }}
              fullWidth
            />
            
            {/* The 2 dates */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.4 }}>
              <TextField
                size="small"
                type="date"
                label="Planned date *"
                value={purchaseForm.plannedPaymentDate}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, plannedPaymentDate: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    bgcolor: "rgba(255,255,255,0.96)",
                    px: 0.6,
                    borderRadius: "4px",
                    fontWeight: 700,
                    fontSize: "12px",
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
                  "& input[type='date']": { fontSize: "13px" },
                }}
                fullWidth
              />
              <TextField
                size="small"
                type="date"
                label="Payment done date"
                value={purchaseForm.actualPaymentDate}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, actualPaymentDate: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    bgcolor: "rgba(255,255,255,0.96)",
                    px: 0.6,
                    borderRadius: "4px",
                    fontWeight: 700,
                    fontSize: "12px",
                  },
                }}
                helperText="Leave blank if unpaid"
                FormHelperTextProps={{ sx: { fontSize: "10.5px", color: "#5C6D63", mt: 0.3 } }}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
                  "& input[type='date']": { fontSize: "13px" },
                }}
                fullWidth
              />
            </Box>

            <TextField
              select
              size="small"
              label="Priority"
              value={purchaseForm.priority}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, priority: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
              }}
              fullWidth
            >
              <MenuItem value="critical">Critical (feeds open orders)</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="low">Optional / postponable</MenuItem>
            </TextField>

            <TextField
              size="small"
              label="Purchase order reference"
              value={purchaseForm.poRef}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, poRef: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "#FFFFFF" },
              }}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            py: 1.8,
            borderTop: "1px solid rgba(23, 107, 82, 0.08)",
            bgcolor: "rgba(244, 250, 246, 0.4)",
          }}
        >
          <Button
            onClick={() => setPurchaseDlg({ open: false, mode: "add", id: null })}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12.5,
              borderRadius: "10px",
              color: "#5C6D63",
              "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitPurchaseAdd}
            sx={{
              textTransform: "none",
              fontWeight: 750,
              fontSize: 12.5,
              borderRadius: "10px",
              px: 2.2,
              bgcolor: "#176B52",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px rgba(23, 107, 82, 0.25)",
              "&:hover": {
                bgcolor: "#104B39",
                boxShadow: "0 6px 18px rgba(23, 107, 82, 0.35)",
              },
            }}
          >
            {purchaseDlg.mode === "edit" ? "Save changes" : "Add bill"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
