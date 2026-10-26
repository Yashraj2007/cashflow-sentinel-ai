
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";

import Typography from "@mui/material/Typography";

import GlobalStyles from "@mui/material/GlobalStyles";

import SearchIcon from "@mui/icons-material/Search";
import {
  UserPlus,
  UploadCloud,
  Users,
  AlertTriangle,
  ShieldCheck,
  Scale,
  Wallet,
  Clock3,
  CircleCheck,
  ArrowUpRight,
  SlidersHorizontal,
  RotateCcw,
  Download,
} from "lucide-react";

import { useApp } from "../context/AppContext.jsx";
import {
  PageHeader,
  RiskChip,
  CSVExportButton,
  EmptyState,
} from "../components/common.jsx";
import { downloadCSV } from "../utils/csv.js";
import CustomerDialog from "../components/customers/CustomerDialog.jsx";
import CustomerImportModal from "../components/customers/CustomerImportModal.jsx";
import {
  customerPaymentStats,
  customerRiskLevel,
  predictPayment,
  outstandingPaise,
} from "../utils/calculations.js";
import { formatINR, formatDisplay, todayISO } from "../utils/finance.js";

const EMPTY_ARRAY = Object.freeze([]);

const C = {
  ink: "#173329",
  muted: "#60756a",
  subtle: "#87978e",
  border: "#e0eae3",
  surface: "rgba(255,255,255,0.94)",
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
  background: C.surface,
  boxShadow: "0 5px 24px rgba(23, 64, 44, 0.035)",
  backdropFilter: "blur(12px)",
  transition: "border-color .2s ease, box-shadow .2s ease",
  "&:hover": {
    borderColor: "#cbded1",
    boxShadow: "0 10px 28px rgba(23,64,44,0.06)",
  },
};

const BUTTON_SX = {
  textTransform: "none",
  fontWeight: 750,
  fontSize: 12.5,
  borderRadius: "11px",
  minHeight: 38,
  px: 1.45,
  whiteSpace: "nowrap",
  transition:
    "transform .18s ease, box-shadow .18s ease, background .18s ease",
  "&:hover": { transform: "translateY(-1px)" },
};

/* -------------------------------------------------------------------------- */
/* KPI summary card                                                           */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "green",
  delay = 0,
}) {
  const tones = {
    green: { color: C.green, soft: C.greenSoft },
    blue: { color: C.blue, soft: C.blueSoft },
    amber: { color: C.amber, soft: C.amberSoft },
    red: { color: C.red, soft: C.redSoft },
  };

  const t = tones[tone] || tones.green;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{ height: "100%" }}
    >
      <Box className="cfs-card drift-wall" sx={{ ...PANEL_SX, height: "100%",
          position: "relative",
          overflow: "hidden",
          p: { xs: 1.1, sm: 1.25 },
          borderRadius: "13px",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: 3,
            background: `linear-gradient(90deg, ${t.color}, ${t.color}22)`,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0.8,
            mb: 0.55,
          }}
        >
          <Typography
            sx={{
              fontSize: 11.8,
              lineHeight: 1.25,
              fontWeight: 760,
              color: C.muted,
            }}
          >
            {label}
          </Typography>

          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: "7px",
              bgcolor: t.soft,
              color: t.color,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={14} strokeWidth={2.1} />
          </Box>
        </Box>

        <Typography
          sx={{
            color: C.ink,
            fontSize: { xs: 16, sm: 18.5 },
            lineHeight: 1.18,
            letterSpacing: "-.04em",
            fontWeight: 850,
            overflowWrap: "anywhere",
          }}
        >
          {value}
        </Typography>

        <Typography
          sx={{
            mt: 0.35,
            fontSize: 11.8,
            lineHeight: 1.35,
            color: C.subtle,
          }}
        >
          {note}
        </Typography>
      </Box>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter field label                                                         */
/* -------------------------------------------------------------------------- */

function FilterLabel({ icon: Icon, children }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.65,
        alignItems: "center",
        color: C.muted,
        fontSize: 11.8,
        fontWeight: 800,
        letterSpacing: ".09em",
        textTransform: "uppercase",
        mb: 0.6,
      }}
    >
      {Icon ? <Icon size={12} /> : null}
      {children}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment history cell                                                       */
/* -------------------------------------------------------------------------- */

function PaymentHistoryCell({ stats }) {
  const count = Number(stats?.n) || 0;
  const avgDelay = stats?.avgDelay;
  const onTimeRate = stats?.onTimeRate;

  if (count < 3 || avgDelay == null || onTimeRate == null) {
    return (
      <Box sx={{ minWidth: 140 }}>
        <Chip
          size="small"
          icon={<Clock3 size={12} />}
          label={`Limited history · ${count}`}
          sx={{
            height: 23,
            bgcolor: "#f1f4f2",
            color: C.muted,
            fontSize: 11.8,
            fontWeight: 750,
            "& .MuiChip-icon": {
              ml: 0.8,
              color: C.subtle,
            },
          }}
        />

        <Typography
          sx={{
            mt: 0.55,
            fontSize: 11.8,
            color: C.subtle,
          }}
        >
          Need at least 3 settled invoices
        </Typography>
      </Box>
    );
  }

  const rate = Math.max(0, Math.min(100, Number(onTimeRate) || 0));

  const delayColor =
    Number(avgDelay) >= 8
      ? C.red
      : Number(avgDelay) >= 4
        ? C.amber
        : C.green;

  return (
    <Box sx={{ minWidth: 172 }}>
      <Typography
        sx={{
          fontSize: 11.5,
          color: C.ink,
          fontWeight: 800,
          lineHeight: 1.45,
        }}
      >
        {Number(avgDelay).toFixed(1)}d average delay
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.8,
          mt: 0.55,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 45 }}>
          <LinearProgress
            variant="determinate"
            value={rate}
            sx={{
              height: 5,
              borderRadius: 5,
              bgcolor: "#eaf0eb",
              "& .MuiLinearProgress-bar": {
                borderRadius: 5,
                bgcolor:
                  rate >= 70
                    ? C.green
                    : rate >= 40
                      ? "#d39a35"
                      : C.red,
              },
            }}
          />
        </Box>

        <Typography
          sx={{
            minWidth: 43,
            textAlign: "right",
            fontSize: 11.8,
            color: C.ink,
            fontWeight: 800,
          }}
        >
          {rate.toFixed(0)}%
        </Typography>
      </Box>

      <Typography
        sx={{
          mt: 0.45,
          fontSize: 11.8,
          color: stats?.source === "verified" ? C.green : delayColor,
        }}
      >
        {stats?.sourceLabel || "Recorded history"} · {count} payments
      </Typography>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Customers page                                                             */
/* -------------------------------------------------------------------------- */

export default function CustomersPage() {
  const { dataset: appDataset } = useApp();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const today = todayISO();

  const customers = Array.isArray(appDataset?.customers)
    ? appDataset.customers
    : EMPTY_ARRAY;

  const salesInvoices = Array.isArray(appDataset?.salesInvoices)
    ? appDataset.salesInvoices
    : EMPTY_ARRAY;

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ------------------------------------------------------------------------ */
  /* Customer-level receivables and payment predictions                      */
  /* ------------------------------------------------------------------------ */

  const rows = useMemo(() => {
    let list = customers.map((customer) => {
      const customerInvoices = salesInvoices.filter(
        (invoice) =>
          invoice.partyId === customer.id && !invoice.isDraft,
      );

      const open = customerInvoices.filter(
        (invoice) => outstandingPaise(invoice) > 0,
      );

      const overdue = open.filter(
        (invoice) => invoice.dueDate && invoice.dueDate < today,
      );

      const stats = customerPaymentStats(customer) || {};
      const risk = customerRiskLevel(customer) || "unknown";

      const upcoming = open
        .filter(
          (invoice) => invoice.dueDate && invoice.dueDate >= today,
        )
        .slice()
        .sort((a, b) =>
          String(a.expectedPaymentDate || a.dueDate || "").localeCompare(
            String(b.expectedPaymentDate || b.dueDate || ""),
          ),
        );

      const nextInvoice = upcoming[0] || null;

      const prediction = nextInvoice
        ? predictPayment(nextInvoice, customer, today)
        : null;

      return {
        c: customer,
        stats,
        risk,
        outstanding: open.reduce(
          (sum, invoice) => sum + outstandingPaise(invoice),
          0,
        ),
        openCount: open.length,
        overdueAmount: overdue.reduce(
          (sum, invoice) => sum + outstandingPaise(invoice),
          0,
        ),
        next: nextInvoice,
        prediction,
      };
    });

    const query = search.trim().toLocaleLowerCase();

    if (query) {
      list = list.filter(({ c }) =>
        [
          c.name,
          c.contact,
          c.city,
          c.email,
          c.phone,
          c.gstin,
        ].some((value) =>
          String(value || "").toLocaleLowerCase().includes(query),
        ),
      );
    }

    if (riskFilter) {
      list = list.filter((row) => row.risk === riskFilter);
    }

    return list.sort((a, b) => b.outstanding - a.outstanding);
  }, [customers, salesInvoices, search, riskFilter, today]);

  /* ------------------------------------------------------------------------ */
  /* Summary metrics                                                          */
  /* ------------------------------------------------------------------------ */

  const totalOutstanding = useMemo(
    () => rows.reduce((sum, row) => sum + row.outstanding, 0),
    [rows],
  );

  const totalOverdue = useMemo(
    () => rows.reduce((sum, row) => sum + row.overdueAmount, 0),
    [rows],
  );

  const overdueCount = useMemo(
    () => rows.filter((row) => row.overdueAmount > 0).length,
    [rows],
  );

  const openCustomerCount = useMemo(
    () => rows.filter((row) => row.outstanding > 0).length,
    [rows],
  );

  const lowRiskCount = useMemo(
    () => rows.filter((row) => row.risk === "low").length,
    [rows],
  );

  /*
   * Clamp the selected page when filters or changing data reduce
   * the result count, preventing an empty page from remaining selected.
   */
  const maxPage = Math.max(
    0,
    Math.ceil(rows.length / rowsPerPage) - 1,
  );

  const safePage = Math.min(page, maxPage);

  const pagedRows = rows.slice(
    safePage * rowsPerPage,
    safePage * rowsPerPage + rowsPerPage,
  );

  /* ------------------------------------------------------------------------ */
  /* CSV export                                                               */
  /* ------------------------------------------------------------------------ */

  const exportRows = rows.map((row) => ({
    customer_name: row.c.name,
    contact: row.c.contact || "",
    city: row.c.city || "",
    terms_days: row.c.termsDays || 15,
    outstanding_rupees: row.outstanding / 100,
    open_invoices: row.openCount,
    overdue_rupees: row.overdueAmount / 100,
    avg_delay_days:
      row.stats.avgDelay == null
        ? ""
        : Number(row.stats.avgDelay).toFixed(1),
    on_time_rate_pct:
      row.stats.onTimeRate == null
        ? ""
        : Number(row.stats.onTimeRate).toFixed(0),
    risk_classification: row.risk,
  }));

  const resetFilters = () => {
    setSearch("");
    setRiskFilter("");
    setPage(0);
  };

  return (
    <Box
      className="page"
      sx={{
        minWidth: 0,
        px: { xs: 1.5, sm: 2.5, lg: 3.25 },
        pt: { xs: 1.75, sm: 2.5 },
        pb: { xs: 4, md: 5 },
        color: C.ink,
        background:
          "radial-gradient(circle at 82% 0%, rgba(112,214,177,0.08), transparent 28%), transparent",
      }}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.28, ease: "easeOut" }
        }
      >
        <GlobalStyles
          styles={{
            "@keyframes cfs-rise": {
              "0%": {
                opacity: 0,
                transform: "translateY(11px) scale(0.995)",
              },
              "100%": {
                opacity: 1,
                transform: "translateY(0) scale(1)",
              },
            },
            "@keyframes cfs-breathe": {
              "0%,100%": {
                opacity: 0.42,
                transform: "scale(0.97)",
              },
              "50%": {
                opacity: 0.68,
                transform: "scale(1.03)",
              },
            },
            ".cfs-enter": {
              animation: "cfs-rise 560ms cubic-bezier(.2,.7,.2,1) both",
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
            width: { xs: 240, md: 430 },
            height: { xs: 240, md: 430 },
            top: -160,
            right: { xs: -120, md: -80 },
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(74,158,122,0.18) 0%, rgba(74,158,122,0.035) 48%, transparent 72%)",
            filter: "blur(36px)",
            animation: "cfs-breathe 10s ease-in-out infinite",
          }}
        />

        {/* Branded hero header matching DashboardPage */}
        <Box
          className="cfs-enter"
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
                <Users size={13} color="#B5E7CC" />
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
                Customer Directory
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
              Manage Customers
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
              Monitor receivables, verified payment delays, and customer reliability. New customers remain unscored until enough payment history is available.
            </Typography>
          </Box>

          {/* Action buttons with frosted glass & emerald gradient */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.1,
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<Download size={14} color="#B5E7CC" />}
              disabled={exportRows.length === 0}
              onClick={() =>
                downloadCSV("customers_export.csv", exportRows, [
                  { key: "customer_name" },
                  { key: "contact" },
                  { key: "city" },
                  { key: "terms_days" },
                  { key: "outstanding_rupees" },
                  { key: "open_invoices" },
                  { key: "overdue_rupees" },
                  { key: "avg_delay_days" },
                  { key: "on_time_rate_pct" },
                  { key: "risk_classification" },
                ])
              }
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
                WebkitBackdropFilter: "blur(12px)",
                color: "#FFFFFF",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                transition:
                  "transform 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.15)",
                  borderColor: "rgba(181,231,204,0.55)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                },
                "&.Mui-disabled": {
                  color: "rgba(255,255,255,0.35)",
                  borderColor: "rgba(255,255,255,0.08)",
                  bgcolor: "rgba(255,255,255,0.03)",
                },
              }}
            >
              Export CSV
            </Button>

            <Button
              variant="outlined"
              startIcon={<UploadCloud size={14} color="#B5E7CC" />}
              onClick={() => setImportModalOpen(true)}
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
                WebkitBackdropFilter: "blur(12px)",
                color: "#FFFFFF",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                transition:
                  "transform 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.15)",
                  borderColor: "rgba(181,231,204,0.55)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                },
              }}
            >
              Import CSV
            </Button>

            <Button
              variant="contained"
              startIcon={<UserPlus size={15} />}
              onClick={() => setAddCustomerOpen(true)}
              sx={{
                textTransform: "none",
                fontWeight: 750,
                fontSize: 12.5,
                borderRadius: "13px",
                minHeight: 38,
                px: 1.8,
                color: "#FFFFFF",
                background: "linear-gradient(135deg, #248A63 0%, #176548 100%)",
                border: "1px solid rgba(181,231,204,0.4)",
                boxShadow: "0 8px 22px rgba(17,40,31,0.28)",
                transition:
                  "transform 180ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #2DB481 0%, #1D7A57 100%)",
                  borderColor: "rgba(181,231,204,0.7)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 10px 26px rgba(17,40,31,0.38)",
                },
              }}
            >
              Add Customer
            </Button>
          </Box>
        </Box>

        {/* Receivables overview */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(4, minmax(0, 1fr))",
            },
            gap: 1,
            mb: 1.4,
          }}
        >
          <SummaryCard
            icon={Wallet}
            label="Total receivables outstanding"
            value={formatINR(totalOutstanding)}
            note={`Across ${openCustomerCount} customer${
              openCustomerCount === 1 ? "" : "s"
            } with open balances`}
            tone="blue"
            delay={0.02}
          />

          <SummaryCard
            icon={AlertTriangle}
            label="Overdue amount"
            value={formatINR(totalOverdue)}
            note={`${overdueCount} customer${
              overdueCount === 1 ? "" : "s"
            } with overdue balances`}
            tone={totalOverdue > 0 ? "red" : "green"}
            delay={0.07}
          />

          <SummaryCard
            icon={Users}
            label="Registered customers"
            value={String(customers.length)}
            note={`${rows.length} currently match the selected filters`}
            tone="green"
            delay={0.12}
          />

          <SummaryCard
            icon={ShieldCheck}
            label="Low-risk payers"
            value={String(lowRiskCount)}
            note="Based on the available customer payment history"
            tone="amber"
            delay={0.17}
          />
        </Box>

        {/* Search and filters */}
        <Box sx={{ ...PANEL_SX, p: { xs: 1.5, sm: 2 }, mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              mb: 1.4,
            }}
          >
            <SlidersHorizontal size={15} color={C.green} />

            <Typography
              sx={{ fontSize: 12.5, fontWeight: 850, color: C.ink }}
            >
              Find a customer
            </Typography>

            <Box sx={{ flex: 1 }} />

            {(search || riskFilter) && (
              <Button
                size="small"
                startIcon={<RotateCcw size={13} />}
                onClick={resetFilters}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  color: C.green,
                  fontWeight: 750,
                }}
              >
                Clear filters
              </Button>
            )}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "minmax(220px, 1.25fr) minmax(220px, .75fr) auto",
              },
              gap: 1.25,
              alignItems: "end",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <FilterLabel icon={SearchIcon}>
                Search records
              </FilterLabel>

              <TextField
                fullWidth
                size="small"
                placeholder="Name, contact, city, email, phone or GSTIN…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                slotProps={{
                  htmlInput: { "aria-label": "Search customers" },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ fontSize: 18, color: C.subtle }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "11px",
                    bgcolor: "#fbfdfb",
                    fontSize: 12.5,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#dce7df",
                  },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#a8c8b5",
                    },
                  "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: `${C.green} !important`,
                  },
                }}
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <FilterLabel icon={ShieldCheck}>
                Payment history / risk
              </FilterLabel>

              <TextField
                select
                fullWidth
                size="small"
                value={riskFilter}
                onChange={(event) => {
                  setRiskFilter(event.target.value);
                  setPage(0);
                }}
                slotProps={{
                  htmlInput: { "aria-label": "Filter customers by risk" },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "11px",
                    bgcolor: "#fbfdfb",
                    fontSize: 12.5,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#dce7df",
                  },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#a8c8b5",
                    },
                }}
              >
                <MenuItem value="">All customers</MenuItem>
                <MenuItem value="low">Low risk · Reliable</MenuItem>
                <MenuItem value="medium">
                  Medium risk · Some delays
                </MenuItem>
                <MenuItem value="high">
                  High risk · Frequent delays
                </MenuItem>
                <MenuItem value="unknown">
                  Not enough history
                </MenuItem>
              </TextField>
            </Box>

            <Box sx={{ pb: 0.6, minWidth: 120 }}>
              <Typography
                sx={{
                  fontSize: 12,
                  color: C.muted,
                  fontWeight: 700,
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                {rows.length} matching customer
                {rows.length === 1 ? "" : "s"}
              </Typography>

              <Typography
                sx={{
                  fontSize: 11.8,
                  color: C.subtle,
                  mt: 0.25,
                  textAlign: { xs: "left", sm: "right" },
                }}
              >
                Sorted by outstanding
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Customer table */}
        <Box sx={{ ...PANEL_SX, overflow: "hidden" }}>
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              flexWrap: "wrap",
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "11px",
                bgcolor: C.greenSoft,
                color: C.green,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Users size={17} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontSize: 14, fontWeight: 850, color: C.ink }}
              >
                Customer register
              </Typography>

              <Typography
                sx={{ fontSize: 11.8, color: C.subtle, mt: 0.25 }}
              >
                Select a row to open its payment profile.
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            <Chip
              size="small"
              label={`${rows.length} result${rows.length === 1 ? "" : "s"}`}
              sx={{
                bgcolor: "#f0f6f1",
                color: C.green,
                fontWeight: 800,
                fontSize: 11.8,
                borderRadius: "8px",
              }}
            />
          </Box>

          <Divider sx={{ borderColor: "#eaf0eb" }} />

          <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
            <Table
              size="small"
              aria-label="Customers and receivables"
              sx={{
                minWidth: 1120,
                "& .MuiTableCell-root": {
                  borderColor: "#edf2ee",
                  px: 1.65,
                  py: 1.35,
                },
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      "linear-gradient(90deg, #f2f8f3, #f8fbf8)",
                    "& .MuiTableCell-root": {
                      color: C.muted,
                      fontWeight: 850,
                      fontSize: 11.5,
                      letterSpacing: ".07em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <TableCell>Customer / company</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell align="center">Open invoices</TableCell>
                  <TableCell align="right">Overdue</TableCell>
                  <TableCell>Payment track record</TableCell>
                  <TableCell>Expected / next payment</TableCell>
                  <TableCell>Risk level</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 4 }}>
                      <EmptyState
                        title="No customers found"
                        body="Try changing your search or risk filter, or add a customer to start tracking receivables."
                        action={
                          <Button
                            variant="outlined"
                            onClick={resetFilters}
                            sx={{
                              ...BUTTON_SX,
                              borderColor: "#cfe1d5",
                              color: C.green,
                            }}
                          >
                            Clear filters
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((row) => {
                    const customer = row.c;
                    const predictedDate =
                      row.prediction?.expectedDate ||
                      row.next?.expectedPaymentDate;

                    const lateProbability =
                      row.prediction?.lateProbability;

                    const hasProbability =
                      lateProbability !== null &&
                      lateProbability !== undefined &&
                      Number.isFinite(Number(lateProbability));

                    return (
                      <TableRow
                        key={customer.id}
                        hover
                        tabIndex={0}
                        onClick={() =>
                          navigate(`/customers/${customer.id}`)
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            navigate(`/customers/${customer.id}`);
                          }
                        }}
                        sx={{
                          cursor: "pointer",
                          transition: "background .15s ease",
                          "&:hover": {
                            bgcolor: "#f6fbf7 !important",
                          },
                          "&:focus-visible": {
                            outline: `2px solid ${C.mint}`,
                            outlineOffset: -2,
                          },
                        }}
                      >
                        <TableCell sx={{ minWidth: 205 }}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1.1,
                              alignItems: "center",
                            }}
                          >
                            <Box
                              sx={{
                                width: 35,
                                height: 35,
                                borderRadius: "11px",
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                                color: C.green,
                                bgcolor: "#eaf5ee",
                                border: "1px solid #dcece1",
                                fontSize: 11.5,
                                fontWeight: 900,
                              }}
                            >
                              {String(customer.name || "C")
                                .trim()
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((word) => word[0] || "")
                                .join("")
                                .toUpperCase()}
                            </Box>

                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontSize: 12.2,
                                  fontWeight: 850,
                                  color: C.ink,
                                  lineHeight: 1.35,
                                }}
                              >
                                {customer.name || "Unnamed customer"}
                              </Typography>

                              <Typography
                                sx={{
                                  mt: 0.3,
                                  fontSize: 11.8,
                                  color: C.subtle,
                                  lineHeight: 1.45,
                                }}
                              >
                                {[
                                  customer.contact,
                                  customer.city,
                                  `${customer.termsDays || 15}d terms`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            sx={{
                              fontSize: 12.3,
                              fontWeight: 850,
                              color:
                                row.outstanding > 0
                                  ? C.ink
                                  : C.subtle,
                              whiteSpace: "nowrap",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatINR(row.outstanding)}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Chip
                            size="small"
                            variant="outlined"
                            label={row.openCount}
                            sx={{
                              minWidth: 29,
                              height: 23,
                              borderRadius: "8px",
                              fontSize: 11.8,
                              fontWeight: 850,
                              color: row.openCount ? C.green : C.subtle,
                              borderColor: row.openCount
                                ? "#cde3d4"
                                : "#e2e9e4",
                              bgcolor: row.openCount
                                ? "#f2f9f4"
                                : "#fafcfb",
                            }}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 850,
                              color:
                                row.overdueAmount > 0
                                  ? C.red
                                  : C.subtle,
                              whiteSpace: "nowrap",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {row.overdueAmount > 0
                              ? formatINR(row.overdueAmount)
                              : "—"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <PaymentHistoryCell stats={row.stats} />
                        </TableCell>

                        <TableCell sx={{ minWidth: 165 }}>
                          {row.next && row.prediction ? (
                            <Box>
                              <Typography
                                sx={{
                                  fontSize: 11.8,
                                  fontWeight: 800,
                                  color: C.ink,
                                }}
                              >
                                {predictedDate
                                  ? formatDisplay(predictedDate)
                                  : "Date unavailable"}
                              </Typography>

                              {hasProbability && (
                                <Chip
                                  size="small"
                                  label={`${Math.round(
                                    Number(lateProbability) * 100,
                                  )}% late · ${String(
                                    row.prediction.confidenceLabel ||
                                      "estimated",
                                  ).toLowerCase()}`}
                                  sx={{
                                    mt: 0.55,
                                    height: 21,
                                    maxWidth: 195,
                                    bgcolor:
                                      Number(lateProbability) > 0.55
                                        ? C.amberSoft
                                        : C.greenSoft,
                                    color:
                                      Number(lateProbability) > 0.55
                                        ? C.amber
                                        : C.green,
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    "& .MuiChip-label": {
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    },
                                  }}
                                />
                              )}
                            </Box>
                          ) : row.next ? (
                            <Typography
                              sx={{
                                fontSize: 11.5,
                                color: C.muted,
                              }}
                            >
                              {row.next.expectedPaymentDate
                                ? formatDisplay(
                                    row.next.expectedPaymentDate,
                                  )
                                : "Date unavailable"}
                            </Typography>
                          ) : (
                            <Typography
                              sx={{
                                fontSize: 11.8,
                                color: C.subtle,
                              }}
                            >
                              No open balance
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <RiskChip risk={row.risk} />
                        </TableCell>

                        <TableCell
                          align="center"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Tooltip title="Analyse a new deal for this customer">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Scale size={13} />}
                              onClick={() =>
                                navigate(
                                  `/deal-checker?customerId=${encodeURIComponent(
                                    customer.id,
                                  )}`,
                                )
                              }
                              sx={{
                                textTransform: "none",
                                fontWeight: 800,
                                fontSize: 11.8,
                                borderRadius: "9px",
                                whiteSpace: "nowrap",
                                color: C.green,
                                borderColor: "#d2e4d8",
                                "&:hover": {
                                  borderColor: "#a5c9b3",
                                  bgcolor: "#f0f8f3",
                                },
                              }}
                            >
                              Check deal
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ borderColor: "#eaf0eb" }} />

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={rows.length}
            rowsPerPage={rowsPerPage}
            page={safePage}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);

              setRowsPerPage(
                Number.isFinite(parsed) && parsed > 0
                  ? parsed
                  : 10,
              );

              setPage(0);
            }}
            sx={{
              color: C.muted,
              "& .MuiTablePagination-toolbar": {
                minHeight: 56,
                px: { xs: 1, sm: 2 },
              },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                {
                  fontSize: 11.8,
                },
            }}
          />
        </Box>

        {/* Customer modals */}
        <CustomerDialog
          open={addCustomerOpen}
          onClose={() => setAddCustomerOpen(false)}
        />

        <CustomerImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
        />
      </motion.div>
    </Box>
  );
}
