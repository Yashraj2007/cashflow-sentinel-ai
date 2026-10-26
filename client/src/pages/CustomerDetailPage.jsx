
import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import GlobalStyles from "@mui/material/GlobalStyles";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from "recharts";

import {
  Edit2,
  Scale,
  Receipt,
  ShieldCheck,
  Info,
  Wallet,
  Clock3,
  CircleCheck,
  AlertTriangle,
  CalendarClock,
  Mail,
  Phone,
  ArrowUpRight,
  BellRing,
  ChevronRight,
} from "lucide-react";

import { useApp } from "../context/AppContext.jsx";
import {
  PageHeader,
  InvoiceStatusBadge,
  RiskChip,
  ConfidenceChip,
  KV,
  EmptyState,
} from "../components/common.jsx";
import InvoiceDetailDrawer from "../components/invoices/InvoiceDetailDrawer.jsx";
import ReminderComposer from "../components/ReminderComposer.jsx";
import CustomerDialog from "../components/customers/CustomerDialog.jsx";
import {
  outstandingPaise,
  salesInvoiceStatus,
  customerPaymentStats,
  customerRiskLevel,
  predictPayment,
} from "../utils/calculations.js";
import {
  formatINR,
  formatDisplay,
  formatPct,
  todayISO,
} from "../utils/finance.js";

const EMPTY_ARRAY = Object.freeze([]);

const THEME = {
  ink: "#173329",
  muted: "#60756a",
  subtle: "#85978d",
  border: "#e0eae3",
  surface: "rgba(255,255,255,0.92)",
  canvas: "#f3f7f4",
  green: "#176b52",
  greenDeep: "#104c3b",
  greenSoft: "#e9f5ee",
  mint: "#75d7b4",
  amber: "#a66a0c",
  amberSoft: "#fff5df",
  red: "#bd403b",
  redSoft: "#fff0ee",
  blue: "#426b87",
  blueSoft: "#edf5fa",
};

const PANEL_SX = {
  minWidth: 0,
  border: `1px solid ${THEME.border}`,
  borderRadius: "20px",
  background: THEME.surface,
  boxShadow: "0 5px 24px rgba(23, 64, 44, 0.035)",
  backdropFilter: "blur(12px)",
  transition:
    "border-color .22s ease, box-shadow .22s ease, transform .22s ease",
  "&:hover": {
    borderColor: "#cbded1",
    boxShadow: "0 12px 30px rgba(23, 64, 44, 0.065)",
  },
};

const ACTION_BUTTON_SX = {
  textTransform: "none",
  fontWeight: 700,
  fontSize: 12.5,
  borderRadius: "11px",
  px: 1.45,
  py: 0.9,
  whiteSpace: "nowrap",
  borderColor: "#d4e3d9",
  color: THEME.greenDeep,
  transition:
    "transform .18s ease, box-shadow .18s ease, background .18s ease",
  "&:hover": {
    borderColor: "#9ac8ae",
    bgcolor: "#f0f8f3",
    transform: "translateY(-1px)",
  },
};

/* -------------------------------------------------------------------------- */
/* Reusable section heading                                                   */
/* -------------------------------------------------------------------------- */

function SectionTitle({ eyebrow, title, action }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        flexWrap: "wrap",
        mb: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography
            sx={{
              color: THEME.green,
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: ".15em",
              textTransform: "uppercase",
              mb: 0.55,
            }}
          >
            {eyebrow}
          </Typography>
        )}

        <Typography
          component="h2"
          sx={{
            color: THEME.ink,
            fontSize: 15.5,
            fontWeight: 800,
            letterSpacing: "-.025em",
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>
      </Box>

      {action}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Animated KPI card                                                          */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  icon: Icon,
  label,
  value,
  note,
  accent = "green",
  delay = 0,
}) {
  const accents = {
    green: { main: THEME.green, soft: THEME.greenSoft },
    blue: { main: THEME.blue, soft: THEME.blueSoft },
    amber: { main: THEME.amber, soft: THEME.amberSoft },
    red: { main: THEME.red, soft: THEME.redSoft },
    neutral: { main: THEME.muted, soft: "#f0f4f1" },
  };

  const color = accents[accent] || accents.green;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay }}
      style={{ height: "100%" }}
    >
      <Box
        sx={{
          ...PANEL_SX,
          height: "100%",
          overflow: "hidden",
          position: "relative",
          p: { xs: 1.65, sm: 2 },
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 3,
            background: `linear-gradient(90deg, ${color.main}, ${color.main}22)`,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
            mb: 1.8,
          }}
        >
          <Typography
            sx={{
              color: THEME.muted,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.35,
            }}
          >
            {label}
          </Typography>

          <Box
            sx={{
              width: 34,
              height: 34,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: "11px",
              bgcolor: color.soft,
              color: color.main,
            }}
          >
            <Icon size={17} strokeWidth={2.1} />
          </Box>
        </Box>

        <Box
          sx={{
            color: THEME.ink,
            fontSize: { xs: 20, sm: 23 },
            fontWeight: 800,
            letterSpacing: "-.045em",
            lineHeight: 1.15,
          }}
        >
          {value}
        </Box>

        <Typography
          sx={{
            mt: 1,
            color: THEME.subtle,
            fontSize: 11.8,
            lineHeight: 1.45,
          }}
        >
          {note}
        </Typography>
      </Box>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Evidence and warning notices                                               */
/* -------------------------------------------------------------------------- */

function RiskNotice({ severity = "info", title, children }) {
  const isWarning = severity === "warning";

  return (
    <Alert
      severity={severity}
      icon={isWarning ? <AlertTriangle size={17} /> : <Info size={17} />}
      sx={{
        mb: 1.5,
        borderRadius: "15px",
        alignItems: "flex-start",
        border: `1px solid ${
          isWarning ? "#f1dfb7" : "#d8e9ee"
        }`,
        bgcolor: isWarning
          ? "rgba(255,248,230,0.86)"
          : "rgba(239,248,250,0.9)",
        color: THEME.ink,
        "& .MuiAlert-icon": { pt: 0.3 },
        "& .MuiAlert-message": {
          width: "100%",
          minWidth: 0,
          py: 0.1,
        },
      }}
    >
      <Typography
        sx={{ fontSize: 12.3, fontWeight: 800, mb: 0.3 }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          fontSize: 11.5,
          color: THEME.muted,
          lineHeight: 1.6,
        }}
      >
        {children}
      </Typography>
    </Alert>
  );
}

/* -------------------------------------------------------------------------- */
/* Customer details page                                                      */
/* -------------------------------------------------------------------------- */

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dataset: activeDataset, dispatch } = useApp();
  const reduceMotion = useReducedMotion();
  const today = todayISO();

  const [detailId, setDetailId] = useState(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  /* Guard against an absent or incomplete dataset. */
  const customers = Array.isArray(activeDataset?.customers)
    ? activeDataset.customers
    : EMPTY_ARRAY;

  const salesInvoices = Array.isArray(activeDataset?.salesInvoices)
    ? activeDataset.salesInvoices
    : EMPTY_ARRAY;

  const reminderRecords = Array.isArray(activeDataset?.reminders)
    ? activeDataset.reminders
    : EMPTY_ARRAY;

  const customer = customers.find((item) => item.id === id);

  const invoices = useMemo(
    () =>
      salesInvoices
        .filter(
          (invoice) =>
            invoice.partyId === id && !invoice.isDraft,
        )
        .slice()
        .sort((a, b) =>
          String(b.issueDate || "").localeCompare(
            String(a.issueDate || ""),
          ),
        ),
    [salesInvoices, id],
  );

  const reminders = useMemo(() => {
    const invoiceIds = new Set(
      invoices.map((invoice) => invoice.id),
    );

    return reminderRecords.filter((reminder) =>
      invoiceIds.has(reminder.invoiceId),
    );
  }, [reminderRecords, invoices]);

  if (!customer) {
    return (
      <Box
        className="page"
        sx={{
          minHeight: "70vh",
          display: "grid",
          alignContent: "center",
          p: { xs: 2, sm: 3 },
          background:
            "radial-gradient(circle at 50% 0%, rgba(117,215,180,.1), transparent 44%)",
        }}
      >
        <Box sx={{ maxWidth: 640, width: "100%", mx: "auto" }}>
          <EmptyState
            title="Customer not found"
            body="This customer may belong to another demo business or has been removed. Return to the customer directory to choose another record."
            action={
              <Button
                component={RouterLink}
                to="/customers"
                variant="contained"
                sx={{
                  ...ACTION_BUTTON_SX,
                  bgcolor: THEME.green,
                  color: "#fff",
                  "&:hover": { bgcolor: THEME.greenDeep },
                }}
              >
                Back to customers
              </Button>
            }
          />
        </Box>
      </Box>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Derived customer and invoice data                                        */
  /* ------------------------------------------------------------------------ */

  const stats = customerPaymentStats(customer) || {};
  const risk = customerRiskLevel(customer);

  const openInvoices = invoices.filter(
    (invoice) => outstandingPaise(invoice) > 0,
  );

  const outstanding = openInvoices.reduce(
    (sum, invoice) => sum + outstandingPaise(invoice),
    0,
  );

  const overdueInvoices = openInvoices
    .filter(
      (invoice) => invoice.dueDate && invoice.dueDate < today,
    )
    .slice()
    .sort(
      (a, b) =>
        outstandingPaise(b) - outstandingPaise(a),
    );

  const largestOverdue = overdueInvoices[0] || null;

  const upcomingInvoices = openInvoices
    .filter(
      (invoice) => invoice.dueDate && invoice.dueDate >= today,
    )
    .slice()
    .sort((a, b) =>
      String(a.expectedPaymentDate || a.dueDate || "").localeCompare(
        String(b.expectedPaymentDate || b.dueDate || ""),
      ),
    );

  const nextInvoice = upcomingInvoices[0] || null;

  const prediction = nextInvoice
    ? predictPayment(nextInvoice, customer, today)
    : null;

  const paymentHistory = Array.isArray(customer.paymentHistory)
    ? customer.paymentHistory
    : EMPTY_ARRAY;

  const timelineData = paymentHistory
    .filter(
      (entry) =>
        entry &&
        entry.delayDays !== null &&
        entry.delayDays !== undefined &&
        Number.isFinite(Number(entry.delayDays)),
    )
    .map((entry, index) => ({
      name: `Inv ${index + 1}`,
      delay: Number(entry.delayDays),
      amount: Number(entry.amountPaise) || 0,
    }));

  const overdueTotal = overdueInvoices.reduce(
    (sum, invoice) => sum + outstandingPaise(invoice),
    0,
  );

  const relatedRisks = [];

  if (risk === "high") {
    relatedRisks.push(
      "Historically late payer — open receipts from this customer are treated as uncertain in the forecast.",
    );
  }

  if (overdueInvoices.length > 0) {
    relatedRisks.push(
      `${overdueInvoices.length} invoice${
        overdueInvoices.length === 1 ? " is" : "s are"
      } overdue, totalling ${formatINR(overdueTotal)}.`,
    );
  }

  const description = [
    customer.city || "India",
    customer.gstin ? `GSTIN: ${customer.gstin}` : null,
    `Terms: ${customer.termsDays || 15} days`,
    customer.contact || customer.name,
    customer.email || null,
  ]
    .filter(Boolean)
    .join(" · ");

  /* ------------------------------------------------------------------------ */
  /* Customer actions                                                         */
  /* ------------------------------------------------------------------------ */

  const handleSimulateDelay = () => {
    const target = [...openInvoices].sort(
      (a, b) => outstandingPaise(b) - outstandingPaise(a),
    )[0];

    if (!target) return;

    dispatch({
      type: "SET_SCENARIO_DRAFT",
      draft: {
        type: "delayInvoice",
        invoiceType: "sales",
        invoiceId: target.id,
        days: 10,
        label: `${target.number} (${customer.name}) pays 10 days later`,
      },
    });

    navigate("/scenario-lab");
  };

  const showInvoiceDetail = () => {
    const target =
      overdueInvoices[0] ||
      openInvoices[0] ||
      invoices[0];

    if (target) {
      setDetailId(target.id);
    }
  };

  return (
    <Box
      className="page"
      sx={{
        minWidth: 0,
        px: { xs: 1.5, sm: 2.5, lg: 3.25 },
        pt: { xs: 1.75, sm: 2.5 },
        pb: { xs: 4, md: 5 },
        color: THEME.ink,
        background:
          "radial-gradient(circle at 82% 0%, rgba(117,215,180,0.085), transparent 27%), transparent",
      }}
    >
      <motion.div
        initial={
          reduceMotion ? false : { opacity: 0, y: 9 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.3, ease: "easeOut" }
        }
      >
        {/* Breadcrumb navigation */}
        <Breadcrumbs
          separator={<ChevronRight size={13} />}
          aria-label="Breadcrumb"
          sx={{
            mb: 1.5,
            fontSize: 11.5,
            "& .MuiBreadcrumbs-separator": {
              mx: 0.5,
              color: "#91a298",
            },
          }}
        >
          <Link
            component={RouterLink}
            to="/customers"
            underline="hover"
            color="inherit"
            sx={{ color: THEME.muted, fontWeight: 600 }}
          >
            Customers
          </Link>

          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 750,
              color: THEME.ink,
            }}
          >
            {customer.name}
          </Typography>
        </Breadcrumbs>

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
                <ShieldCheck size={13} color="#B5E7CC" />
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
                Customer Intelligence
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
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
                {customer.name}
              </Typography>

              {/* Inline frosted risk badge */}
              <Box
                sx={{
                  px: 1.2,
                  py: 0.4,
                  borderRadius: "8px",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.6,
                  backdropFilter: "blur(8px)",
                  ...(risk === "high"
                    ? {
                        bgcolor: "rgba(239, 68, 68, 0.18)",
                        color: "#FCA5A5",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                      }
                    : risk === "medium"
                    ? {
                        bgcolor: "rgba(245, 158, 11, 0.18)",
                        color: "#FCD34D",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                      }
                    : risk === "low"
                    ? {
                        bgcolor: "rgba(112, 214, 177, 0.18)",
                        color: "#B5E7CC",
                        border: "1px solid rgba(112, 214, 177, 0.35)",
                      }
                    : {
                        bgcolor: "rgba(255, 255, 255, 0.1)",
                        color: "rgba(239, 248, 242, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                      }),
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: "currentColor",
                  }}
                />
                {risk === "high"
                  ? "High risk"
                  : risk === "medium"
                  ? "Medium risk"
                  : risk === "low"
                  ? "Low risk"
                  : "Unscored"}
              </Box>
            </Box>

            <Typography
              sx={{
                mt: 0.9,
                maxWidth: 720,
                fontSize: 12,
                lineHeight: 1.7,
                color: "rgba(239,248,242,0.77)",
              }}
            >
              {description}
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
              startIcon={<Edit2 size={14} color="#B5E7CC" />}
              onClick={() => setEditOpen(true)}
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
              Edit Details
            </Button>

            <Button
              variant="outlined"
              startIcon={<Scale size={14} color="#B5E7CC" />}
              onClick={() =>
                navigate(
                  `/deal-checker?customerId=${encodeURIComponent(
                    customer.id,
                  )}`,
                )
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
              }}
            >
              Analyse Deal
            </Button>

            <Button
              variant="outlined"
              startIcon={<CalendarClock size={14} color="#FCD34D" />}
              disabled={openInvoices.length === 0}
              onClick={handleSimulateDelay}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: 12.5,
                borderRadius: "13px",
                minHeight: 38,
                px: 1.6,
                border: "1px solid rgba(245, 158, 11, 0.35)",
                bgcolor: "rgba(245, 158, 11, 0.12)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                color: "#FDE68A",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                transition:
                  "transform 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                "&:hover": {
                  bgcolor: "rgba(245, 158, 11, 0.22)",
                  borderColor: "rgba(245, 158, 11, 0.6)",
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
              Simulate Delay
            </Button>

            <Button
              variant="contained"
              startIcon={<BellRing size={15} />}
              onClick={() => setReminderOpen(true)}
              disabled={openInvoices.length === 0}
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
                "&.Mui-disabled": {
                  color: "rgba(255,255,255,0.35)",
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
                  boxShadow: "none",
                },
              }}
            >
              Draft Reminder
            </Button>
          </Box>
        </Box>

        {/* Customer KPI overview */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 1.1, sm: 1.5 },
            mb: 2.5,
          }}
        >
          <SummaryCard
            icon={Wallet}
            label="Total outstanding"
            value={formatINR(outstanding)}
            note={`${openInvoices.length} open invoice${
              openInvoices.length === 1 ? "" : "s"
            }`}
            accent={outstanding > 0 ? "blue" : "green"}
            delay={0.02}
          />

          <SummaryCard
            icon={Clock3}
            label="Typical payment delay"
            value={
              stats.avgDelay === null ||
              stats.avgDelay === undefined
                ? "—"
                : `${Number(stats.avgDelay).toFixed(1)} days`
            }
            note={
              stats.n >= 3
                ? `Median ${
                    stats.medianDelay !== null &&
                    stats.medianDelay !== undefined
                      ? Number(stats.medianDelay).toFixed(0)
                      : "0"
                  } days across ${stats.n} payments`
                : "Not enough payment history"
            }
            accent={
              stats.avgDelay === null ||
              stats.avgDelay === undefined
                ? "neutral"
                : stats.avgDelay >= 8
                  ? "red"
                  : stats.avgDelay >= 4
                    ? "amber"
                    : "green"
            }
            delay={0.07}
          />

          <SummaryCard
            icon={CircleCheck}
            label="On-time payment rate"
            value={
              stats.onTimeRate === null ||
              stats.onTimeRate === undefined
                ? "—"
                : formatPct(stats.onTimeRate)
            }
            note={
              stats.n >= 3
                ? "Paid on or before the due date"
                : "Insufficient settlement data"
            }
            accent={
              stats.onTimeRate === null ||
              stats.onTimeRate === undefined
                ? "neutral"
                : stats.onTimeRate >= 70
                  ? "green"
                  : stats.onTimeRate >= 40
                    ? "amber"
                    : "red"
            }
            delay={0.12}
          />

          <SummaryCard
            icon={ShieldCheck}
            label="Payment reliability"
            value={
              <Box
                sx={{
                  mt: 0.35,
                  display: "flex",
                  alignItems: "center",
                  minHeight: 28,
                }}
              >
                <RiskChip risk={risk} />
              </Box>
            }
            note={
              stats.sourceLabel ||
              "Based on available payment records"
            }
            accent={
              risk === "high"
                ? "red"
                : risk === "medium"
                  ? "amber"
                  : "green"
            }
            delay={0.17}
          />
        </Box>

        {/* Evidence notices */}
        {stats.source === "owner-provided" && (
          <RiskNotice
            severity="info"
            title="Owner-provided baseline history"
          >
            Initial payment counts were entered manually during setup.
            As actual invoices and settlements are recorded, Sentinel
            can update delay statistics from the recorded transaction
            history.
          </RiskNotice>
        )}

        {stats.n < 3 && stats.source !== "owner-provided" && (
          <RiskNotice
            severity="info"
            title="Limited payment history"
          >
            At least 3 settled invoices are required before automated
            delay predictions and risk scores are considered reliable.
            This helps avoid over-penalising new customer relationships.
          </RiskNotice>
        )}

        {/* Timeline and profile */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(0, 1.15fr) minmax(330px, 0.85fr)",
            },
            gap: { xs: 1.5, lg: 2 },
            alignItems: "start",
            mb: 2.5,
          }}
        >
          {/* Payment behaviour chart */}
          <Box
            sx={{
              ...PANEL_SX,
              p: { xs: 1.65, sm: 2.25 },
              minHeight: 355,
            }}
          >
            <SectionTitle
              eyebrow="Historical behaviour"
              title="Payment behaviour timeline"
              action={
                <ConfidenceChip
                  label={stats.label || "Limited data"}
                />
              }
            />

            {timelineData.length === 0 ? (
              <Box sx={{ py: 2 }}>
                <EmptyState
                  title="Not enough payment history"
                  body="The timeline builds as settled invoices are recorded. Sentinel avoids drawing conclusions without supporting evidence."
                />
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: 220, sm: 250 },
                    mt: 0.25,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timelineData}
                      margin={{
                        top: 8,
                        right: 8,
                        bottom: 0,
                        left: -18,
                      }}
                    >
                      <CartesianGrid
                        stroke="#e4ede7"
                        strokeDasharray="3 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        tick={{
                          fontSize: 11.8,
                          fill: THEME.subtle,
                        }}
                        axisLine={{ stroke: "#d5e2da" }}
                        tickLine={false}
                      />

                      <YAxis
                        tick={{
                          fontSize: 11.8,
                          fill: THEME.subtle,
                        }}
                        axisLine={false}
                        tickLine={false}
                        unit="d"
                        width={40}
                      />

                      <RechartsTooltip
                        formatter={(value) => [
                          `${value} days`,
                          "Delay vs due date",
                        ]}
                        cursor={{
                          fill: "rgba(23,107,82,0.055)",
                        }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #dfeae3",
                          boxShadow:
                            "0 8px 24px rgba(23,64,44,.09)",
                          fontSize: 12,
                        }}
                      />

                      <ReferenceLine
                        y={0}
                        stroke="#9eafa5"
                        strokeDasharray="4 4"
                      />

                      <Bar
                        dataKey="delay"
                        radius={[5, 5, 2, 2]}
                        maxBarSize={38}
                      >
                        {timelineData.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={
                              entry.delay <= 1
                                ? "#26966a"
                                : entry.delay <= 5
                                  ? "#d49a32"
                                  : "#d15d56"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1.4,
                    mt: 0.7,
                  }}
                >
                  {[
                    { label: "On time", color: "#26966a" },
                    { label: "1–5 days late", color: "#d49a32" },
                    {
                      label: "Over 5 days late",
                      color: "#d15d56",
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.65,
                      }}
                    >
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          bgcolor: item.color,
                        }}
                      />

                      <Typography
                        sx={{
                          fontSize: 11.8,
                          color: THEME.muted,
                        }}
                      >
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {/* Expected receipt prediction */}
            {prediction && nextInvoice && (
              <Box
                sx={{
                  display: "flex",
                  gap: 1.2,
                  alignItems: "flex-start",
                  mt: 2.1,
                  p: 1.45,
                  borderRadius: "14px",
                  border: "1px solid #d6e9dc",
                  background:
                    "linear-gradient(110deg, #f1faf4, #f8fcf9)",
                }}
              >
                <Box
                  sx={{
                    width: 33,
                    height: 33,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "10px",
                    bgcolor: "#dff2e6",
                    color: THEME.green,
                  }}
                >
                  <CalendarClock size={17} />
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 11.8,
                      textTransform: "uppercase",
                      letterSpacing: ".12em",
                      fontWeight: 800,
                      color: THEME.green,
                      mb: 0.4,
                    }}
                  >
                    Next predicted receipt
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 12.5,
                      color: THEME.ink,
                      fontWeight: 750,
                      lineHeight: 1.5,
                    }}
                  >
                    {nextInvoice.number} ·{" "}
                    {prediction.expectedDate
                      ? formatDisplay(prediction.expectedDate)
                      : "Date unavailable"}
                  </Typography>

                  {prediction.lateProbability !== null &&
                    prediction.lateProbability !== undefined && (
                      <Typography
                        sx={{
                          mt: 0.35,
                          fontSize: 12,
                          color: THEME.muted,
                        }}
                      >
                        Estimated late probability:{" "}
                        {Math.round(
                          prediction.lateProbability * 100,
                        )}
                        %
                      </Typography>
                    )}

                  {prediction.reasons?.[0] && (
                    <Typography
                      sx={{
                        mt: 0.35,
                        fontSize: 12,
                        color: THEME.muted,
                        lineHeight: 1.5,
                      }}
                    >
                      {prediction.reasons[0]}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {/* Contact, exposure and risk signals */}
          <Box
            sx={{
              ...PANEL_SX,
              p: { xs: 1.65, sm: 2.25 },
            }}
          >
            <SectionTitle
              eyebrow="Account details"
              title="Profile & contact"
              action={
                <Tooltip title="Edit customer profile">
                  <Button
                    aria-label="Edit customer profile"
                    onClick={() => setEditOpen(true)}
                    sx={{
                      minWidth: 34,
                      width: 34,
                      height: 34,
                      p: 0,
                      borderRadius: "10px",
                      color: THEME.green,
                      bgcolor: THEME.greenSoft,
                      "&:hover": { bgcolor: "#d9eddf" },
                    }}
                  >
                    <Edit2 size={15} />
                  </Button>
                </Tooltip>
              }
            />

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.1,
              }}
            >
              <KV label="Primary contact">
                {customer.contact || customer.name}
              </KV>

              <KV label="Email">
                {customer.email ? (
                  <Box
                    sx={{
                      display: "inline-flex",
                      gap: 0.6,
                      alignItems: "center",
                      minWidth: 0,
                      overflowWrap: "anywhere",
                    }}
                  >
                    <Mail size={13} color={THEME.subtle} />
                    {customer.email}
                  </Box>
                ) : (
                  "—"
                )}
              </KV>

              <KV label="Phone">
                {customer.phone ? (
                  <Box
                    sx={{
                      display: "inline-flex",
                      gap: 0.6,
                      alignItems: "center",
                    }}
                  >
                    <Phone size={13} color={THEME.subtle} />
                    {customer.phone}
                  </Box>
                ) : (
                  "—"
                )}
              </KV>

              <KV label="Default credit terms">
                {customer.termsDays || 15} days
              </KV>

              <KV label="Largest overdue invoice">
                {largestOverdue
                  ? `${largestOverdue.number} — ${formatINR(
                      outstandingPaise(largestOverdue),
                    )}`
                  : "None"}
              </KV>

              <KV label="Historical records">
                {stats.n || 0}{" "}
                {stats.source === "verified"
                  ? "verified invoices"
                  : "recorded payments"}
              </KV>

              <KV label="Linked reminders">{reminders.length}</KV>
            </Box>

            <Divider
              sx={{ my: 1.9, borderColor: "#e7eee9" }}
            />

            <Typography
              sx={{
                fontSize: 11.8,
                fontWeight: 850,
                textTransform: "uppercase",
                letterSpacing: ".14em",
                color: THEME.muted,
                mb: 1,
              }}
            >
              Related cash-flow risks
            </Typography>

            {relatedRisks.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  p: 1.2,
                  borderRadius: "12px",
                  bgcolor: "#f0f8f2",
                  border: "1px solid #dbece0",
                }}
              >
                <ShieldCheck
                  size={16}
                  color={THEME.green}
                />

                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: THEME.greenDeep,
                    lineHeight: 1.55,
                  }}
                >
                  No elevated cash-flow risk is currently flagged
                  for this customer.
                </Typography>
              </Box>
            ) : (
              relatedRisks.map((riskText, index) => (
                <Box
                  key={`${index}-${riskText}`}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    p: 1.15,
                    mt: index ? 0.8 : 0,
                    borderRadius: "12px",
                    bgcolor: THEME.amberSoft,
                    border: "1px solid #f0dfbd",
                  }}
                >
                  <AlertTriangle
                    size={16}
                    color={THEME.amber}
                    style={{
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 11.5,
                      color: "#745019",
                      lineHeight: 1.55,
                    }}
                  >
                    {riskText}
                  </Typography>
                </Box>
              ))
            )}

            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                mt: 2,
              }}
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={<Receipt size={14} />}
                onClick={showInvoiceDetail}
                disabled={!invoices.length}
                sx={ACTION_BUTTON_SX}
              >
                View Invoices
              </Button>

              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowUpRight size={14} />}
                onClick={() => {
                  if (openInvoices[0]) {
                    setDetailId(openInvoices[0].id);
                  }
                }}
                disabled={!openInvoices.length}
                sx={ACTION_BUTTON_SX}
              >
                Record Payment
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Invoice history table */}
        <Box
          sx={{
            ...PANEL_SX,
            overflow: "hidden",
            mb: 2.5,
          }}
        >
          <Box
            sx={{
              p: { xs: 1.65, sm: 2.25 },
              pb: 1.7,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <SectionTitle
              eyebrow="Receivables register"
              title="Invoice history"
              action={
                <Chip
                  size="small"
                  label={`${invoices.length} invoice${
                    invoices.length === 1 ? "" : "s"
                  }`}
                  sx={{
                    bgcolor: THEME.greenSoft,
                    color: THEME.green,
                    fontWeight: 800,
                    borderRadius: "8px",
                    fontSize: 11.8,
                  }}
                />
              }
            />
          </Box>

          <TableContainer
            sx={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <Table
              size="small"
              aria-label="Customer invoice history"
              sx={{
                minWidth: 760,
                "& .MuiTableCell-root": {
                  borderColor: "#edf2ee",
                  py: 1.35,
                  px: 1.6,
                },
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      "linear-gradient(90deg, #f3f8f4, #f8fbf8)",
                    "& .MuiTableCell-root": {
                      color: THEME.muted,
                      fontWeight: 850,
                      fontSize: 11.8,
                      letterSpacing: ".075em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <TableCell>Invoice</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell>Due date</TableCell>
                  <TableCell>Expected / actual</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 4 }}>
                      <EmptyState
                        title="No invoices yet"
                        body="Create a sales invoice or deal for this customer to start tracking receivables."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const invoiceOutstanding =
                      outstandingPaise(invoice);

                    return (
                      <TableRow
                        key={invoice.id}
                        hover
                        tabIndex={0}
                        onClick={() => setDetailId(invoice.id)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            setDetailId(invoice.id);
                          }
                        }}
                        sx={{
                          cursor: "pointer",
                          transition: "background .15s ease",
                          "&:hover": {
                            bgcolor: "#f6fbf7 !important",
                          },
                          "&:focus-visible": {
                            outline: `2px solid ${THEME.mint}`,
                            outlineOffset: -2,
                          },
                        }}
                      >
                        <TableCell sx={{ minWidth: 145 }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: 12.2,
                              color: THEME.ink,
                            }}
                          >
                            {invoice.number || "Unnamed invoice"}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 11.8,
                              color: THEME.subtle,
                              mt: 0.25,
                            }}
                          >
                            {invoice.issueDate
                              ? formatDisplay(invoice.issueDate)
                              : "Issue date unavailable"}
                          </Typography>
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            fontSize: 12,
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatINR(
                            Number(invoice.amountPaise) || 0,
                          )}
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              display: "inline-block",
                              fontWeight: 850,
                              fontSize: 12,
                              color:
                                invoiceOutstanding > 0
                                  ? THEME.red
                                  : THEME.green,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatINR(invoiceOutstanding)}
                          </Typography>
                        </TableCell>

                        <TableCell
                          sx={{
                            fontSize: 11.5,
                            color: THEME.muted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {invoice.dueDate
                            ? formatDisplay(invoice.dueDate)
                            : "—"}
                        </TableCell>

                        <TableCell
                          sx={{
                            fontSize: 11.5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {invoice.actualPaymentDate ? (
                            <Box
                              sx={{
                                display: "inline-flex",
                                gap: 0.55,
                                alignItems: "center",
                                color: THEME.green,
                                fontWeight: 700,
                              }}
                            >
                              <CircleCheck size={13} />
                              Paid{" "}
                              {formatDisplay(
                                invoice.actualPaymentDate,
                              )}
                            </Box>
                          ) : invoice.expectedPaymentDate ? (
                            <Box
                              sx={{
                                display: "inline-flex",
                                gap: 0.55,
                                alignItems: "center",
                                color: THEME.muted,
                              }}
                            >
                              <CalendarClock size={13} />
                              {formatDisplay(
                                invoice.expectedPaymentDate,
                              )}
                            </Box>
                          ) : (
                            "Not scheduled"
                          )}
                        </TableCell>

                        <TableCell>
                          <InvoiceStatusBadge
                            status={salesInvoiceStatus(
                              invoice,
                              today,
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {invoices.length > 0 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
                borderTop: "1px solid #edf2ee",
                px: { xs: 1.65, sm: 2.25 },
                py: 1.25,
              }}
            >
              <Typography
                sx={{
                  fontSize: 11.8,
                  color: THEME.subtle,
                }}
              >
                Select an invoice row to view details or record a
                settlement.
              </Typography>

              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Typography
                  sx={{
                    fontSize: 11.8,
                    color: THEME.muted,
                  }}
                >
                  Open:{" "}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 800,
                      color: THEME.ink,
                    }}
                  >
                    {openInvoices.length}
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11.8,
                    color: THEME.muted,
                  }}
                >
                  Overdue:{" "}
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 800,
                      color: overdueInvoices.length
                        ? THEME.red
                        : THEME.green,
                    }}
                  >
                    {overdueInvoices.length}
                  </Box>
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </motion.div>

      {/* Invoice detail drawer */}
      {detailId && (
        <InvoiceDetailDrawer
          type="sales"
          invoiceId={detailId}
          open={Boolean(detailId)}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* Reminder composer */}
      {reminderOpen && (
        <ReminderComposer
          open={reminderOpen}
          onClose={() => setReminderOpen(false)}
          presetInvoiceId={
            openInvoices[0] ? openInvoices[0].id : null
          }
        />
      )}

      {/* Edit customer dialog */}
      {editOpen && (
        <CustomerDialog
          open={editOpen}
          customer={customer}
          onClose={() => setEditOpen(false)}
        />
      )}
    </Box>
  );
}
