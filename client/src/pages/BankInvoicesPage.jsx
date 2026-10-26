
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TablePagination from "@mui/material/TablePagination";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import GlobalStyles from "@mui/material/GlobalStyles";
import {
  ArrowRight,
  ArrowLeftRight,
  Banknote,
  ChevronDown,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Info,
  Receipt,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  Wallet,
  X,
  Users,
  Landmark,
  Zap,
  Building2,
  Repeat,
  Plus,
  Trash2,
  Edit3,
} from "lucide-react";

import { useApp } from "../context/AppContext.jsx";
import { EmptyState } from "../components/common.jsx";
import BankStatementImportWizard from "../components/bank/BankStatementImportWizard.jsx";
import InvoiceImportWizard from "../components/invoices/InvoiceImportWizard.jsx";
import ExpenseDialog from "../components/expenses/ExpenseDialog.jsx";
import { getInitialRecurringExpenses } from "../services/expenseService.js";
import { downloadBankTemplate } from "../services/bankImportService.js";
import { formatINR, formatDisplay, todayISO } from "../utils/finance.js";

const C = {
  page: "#F4F7F4",
  surface: "rgba(255,255,255,0.93)",
  ink: "#16271F",
  muted: "#5C6D63",
  subtle: "#87948B",
  border: "#E1E9E3",
  accent: "#176B52",
  accentDeep: "#0E523F",
  accentWash: "#E9F5EF",
  positive: "#16805D",
  positiveWash: "#E8F6EE",
  negative: "#BC3D35",
  negativeWash: "#FFF0EE",
  warning: "#936713",
  warningWash: "#FBF3E1",
  forest: "#142D24",
};

const PANEL_SX = {
  minWidth: 0,
  border: `1px solid ${C.border}`,
  borderRadius: "17px",
  bgcolor: C.surface,
  backdropFilter: "blur(16px) saturate(125%)",
  WebkitBackdropFilter: "blur(16px) saturate(125%)",
  boxShadow: "0 5px 18px rgba(22,39,31,0.035)",
  transition: "border-color 200ms ease, box-shadow 220ms ease",
  "&:hover": {
    borderColor: "rgba(23,107,82,0.22)",
    boxShadow: "0 12px 30px rgba(22,39,31,0.055)",
  },
};

const BUTTON_SX = {
  minWidth: 0,
  px: 1.25,
  py: 0.7,
  borderRadius: "9px",
  fontSize: 12,
  fontWeight: 760,
  textTransform: "none",
  whiteSpace: "nowrap",
  transition:
    "transform 180ms ease, background-color 180ms ease, box-shadow 180ms ease",
  "&:focus-visible": {
    outline: `2px solid ${C.accent}`,
    outlineOffset: 2,
  },
};

const TABLE_HEAD_SX = {
  bgcolor: "#F6F9F6",
  "& .MuiTableCell-root": {
    borderBottom: `1px solid ${C.border}`,
    color: C.subtle,
    fontSize: 11.5,
    fontWeight: 850,
    letterSpacing: "0.45px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    px: 1.25,
    py: 1.3,
  },
};

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "green",
  index,
  expanded,
  onToggle,
}) {
  const palettes = {
    green: [C.positive, C.positiveWash],
    teal: [C.accent, C.accentWash],
    neutral: [C.muted, "#F1F5F1"],
    red: [C.negative, C.negativeWash],
  };

  const [accent, wash] = palettes[tone] || palettes.green;

  return (
    <Box
      component="button"
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={`cfs-bank-stat drift-wall${expanded ? " is-expanded" : ""}`}
      style={{ animationDelay: `${index * 55}ms` }}
      sx={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        minWidth: 0,
        width: "100%",
        minHeight: { xs: 76, sm: 82 },
        p: { xs: 1.1, sm: 1.25 },
        textAlign: "left",
        font: "inherit",
        color: C.ink,
        cursor: "pointer",
        border: `1px solid ${
          expanded ? `${accent}65` : C.border
        }`,
        borderRadius: "13px",
        bgcolor: "rgba(255,255,255,0.91)",
        boxShadow: expanded
          ? "0 10px 26px rgba(22,39,31,0.075)"
          : "0 3px 8px rgba(22,39,31,0.025)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        transition:
          "transform 220ms ease, border-color 200ms ease, box-shadow 220ms ease, background-color 200ms ease",

        "&::before": {
          content: '""',
          position: "absolute",
          zIndex: -1,
          width: 130,
          height: 110,
          top: -40,
          right: -32,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}24, transparent 72%)`,
          filter: "blur(18px)",
          opacity: 0.5,
          transition:
            "opacity 220ms ease, transform 220ms ease",
          pointerEvents: "none",
        },

        "&:hover, &.is-expanded, &:focus-visible": {
          borderColor: `${accent}68`,
          bgcolor: "rgba(255,255,255,0.99)",
          boxShadow: "0 12px 28px rgba(22,39,31,0.075)",
          outline: "none",

          "&::before": {
            opacity: 0.95,
            transform: "scale(1.12)",
          },

          "& .cfs-bank-stat-detail": {
            maxHeight: 100,
            opacity: 1,
            visibility: "visible",
            mt: 1,
            borderTopColor: C.border,
            pt: 0.9,
          },

          "& .cfs-bank-stat-chevron": {
            transform: "rotate(180deg)",
            color: accent,
          },
        },

        "&:active": {
          transform: "scale(0.995)",
        },

        "&:focus-visible": {
          outline: `2px solid ${C.accent}`,
          outlineOffset: 3,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.7,
          mb: 0.55,
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            borderRadius: "7px",
            bgcolor: wash,
            border: `1px solid ${accent}15`,
          }}
        >
          <Icon size={13} color={accent} strokeWidth={1.9} />
        </Box>

        <Typography
          sx={{
            fontSize: 11.8,
            fontWeight: 760,
            color: C.muted,
            lineHeight: 1.25,
          }}
        >
          {label}
        </Typography>

        <ChevronDown
          className="cfs-bank-stat-chevron"
          size={12}
          color={C.subtle}
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            transition: "transform 180ms ease, color 180ms ease",
          }}
        />
      </Box>

      <Typography
        sx={{
          fontSize: { xs: 15.5, sm: 17.5, xl: 18.5 },
          fontWeight: 820,
          letterSpacing: "-0.5px",
          lineHeight: 1.18,
          color: C.ink,
          overflowWrap: "anywhere",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>

      <Box
        className="cfs-bank-stat-detail"
        sx={{
          maxHeight: 0,
          mt: 0,
          pt: 0,
          overflow: "hidden",
          opacity: 0,
          visibility: "hidden",
          borderTop: "1px solid transparent",
          transition:
            "max-height 220ms ease, opacity 180ms ease, margin-top 180ms ease, padding-top 180ms ease, border-color 180ms ease, visibility 180ms ease",
        }}
      >
        <Typography
          sx={{
            fontSize: 11.8,
            color: C.muted,
            lineHeight: 1.55,
          }}
        >
          {note}
        </Typography>
      </Box>
    </Box>
  );
}

function StatusPill({ label, actual }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 21,
        maxWidth: 130,
        borderRadius: "6px",
        bgcolor: actual ? C.positiveWash : C.warningWash,
        color: actual ? C.positive : C.warning,
        fontSize: 11.5,
        fontWeight: 800,
        textTransform: "capitalize",
        "& .MuiChip-label": {
          px: 0.8,
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }}
    />
  );
}

function SourcePill({ source }) {
  return (
    <Chip
      label={source || "manual"}
      size="small"
      sx={{
        height: 21,
        maxWidth: 130,
        bgcolor: "#F1F5F1",
        color: C.muted,
        border: `1px solid ${C.border}`,
        fontSize: 11.5,
        fontWeight: 700,
        textTransform: "capitalize",
        "& .MuiChip-label": {
          px: 0.8,
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }}
    />
  );
}

function InvoiceUploadCard({
  kind,
  title,
  subtitle,
  description,
  details,
  count,
  onImport,
  onView,
}) {
  const sales = kind === "sales";
  const Icon = sales ? Receipt : ClipboardList;
  const accent = sales ? C.positive : C.negative;
  const wash = sales ? C.positiveWash : C.negativeWash;
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      className={`cfs-bank-upload-card${expanded ? " is-expanded" : ""}`}
      sx={{
        ...PANEL_SX,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        p: { xs: 1.8, sm: 2.25 },
        minHeight: 220,

        "&:hover .cfs-upload-detail": {
          maxHeight: 140,
          opacity: 1,
          mt: 1.1,
        },

        "&.is-expanded .cfs-upload-detail": {
          maxHeight: 140,
          opacity: 1,
          mt: 1.1,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.2,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "12px",
            bgcolor: wash,
            border: `1px solid ${accent}12`,
          }}
        >
          <Icon size={19} color={accent} />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 13.3,
              fontWeight: 820,
              color: C.ink,
              lineHeight: 1.5,
            }}
          >
            {title}
          </Typography>

          <Typography
            sx={{
              mt: 0.25,
              fontSize: 11.8,
              color: C.muted,
              lineHeight: 1.55,
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        <Chip
          label={count}
          size="small"
          sx={{
            height: 23,
            flexShrink: 0,
            borderRadius: "7px",
            bgcolor: wash,
            color: accent,
            fontSize: 11.8,
            fontWeight: 850,
            "& .MuiChip-label": { px: 0.8 },
          }}
        />
      </Box>

      <Typography
        sx={{
          mt: 1.35,
          fontSize: 12,
          color: C.muted,
          lineHeight: 1.7,
        }}
      >
        {description}
      </Typography>

      <Box
        className="cfs-upload-detail"
        sx={{
          maxHeight: 0,
          opacity: 0,
          mt: 0,
          overflow: "hidden",
          transition:
            "max-height 220ms ease, opacity 180ms ease, margin-top 180ms ease",
        }}
      >
        <Alert
          severity="info"
          icon={<Info size={15} />}
          sx={{
            py: 0.3,
            px: 1,
            borderRadius: "9px",
            bgcolor: "#F1F7F3",
            color: C.muted,
            border: `1px solid ${C.border}`,
            "& .MuiAlert-icon": {
              color: C.accent,
              pt: 0.6,
              mr: 0.8,
            },
            "& .MuiAlert-message": {
              fontSize: 11.8,
              lineHeight: 1.6,
              py: 0.35,
            },
          }}
        >
          {details}
        </Alert>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 0.8,
          mt: "auto",
          pt: 1.6,
        }}
      >
        <Button
          variant="contained"
          size="small"
          onClick={onImport}
          startIcon={<UploadCloud size={14} />}
          sx={{
            ...BUTTON_SX,
            bgcolor: C.accent,
            color: "#FFFFFF",
            "&:hover": {
              bgcolor: C.accentDeep,
              transform: "translateY(-1px)",
            },
          }}
        >
          Import {sales ? "sales CSV" : "purchase CSV"}
        </Button>

        <Button
          variant="text"
          size="small"
          onClick={onView}
          endIcon={<ArrowRight size={13} />}
          sx={{
            ...BUTTON_SX,
            color: C.accent,
            px: 0.9,
            "&:hover": { bgcolor: C.accentWash },
          }}
        >
          View {sales ? "invoices" : "bills"}
        </Button>

        <Box sx={{ flex: 1 }} />

        <Tooltip
          title={expanded ? "Hide import details" : "Show CSV details"}
        >
          <Button
            size="small"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            sx={{
              minWidth: 30,
              width: 30,
              height: 30,
              p: 0,
              color: C.subtle,
              borderRadius: "8px",
              "&:hover": {
                bgcolor: C.accentWash,
                color: C.accent,
              },
            }}
          >
            <ChevronDown
              size={15}
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 180ms ease",
              }}
            />
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default function BankInvoicesPage() {
  const { dataset, dispatch, toast } = useApp();
  const navigate = useNavigate();
  const today = todayISO();

  const [tab, setTab] = useState(0);
  const [bankWizardOpen, setBankWizardOpen] = useState(false);
  const [expenseDlg, setExpenseDlg] = useState({ open: false, mode: "recurring", expense: null });
  const [invoiceWizard, setInvoiceWizard] = useState({
    open: false,
    type: "sales",
  });

  const recurringList = useMemo(() => {
    return (dataset.recurringExpenses && dataset.recurringExpenses.length > 0)
      ? dataset.recurringExpenses
      : getInitialRecurringExpenses(today);
  }, [dataset.recurringExpenses, today]);

  const activeFixedExpenses = useMemo(() => {
    return recurringList.filter((e) => e.active !== false);
  }, [recurringList]);

  const totalMonthlyFixedPaise = useMemo(() => {
    return activeFixedExpenses.reduce((sum, e) => sum + (e.amountPaise || 0), 0);
  }, [activeFixedExpenses]);

  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedMetric, setExpandedMetric] = useState(null);

  const allTransactions = dataset.transactions || [];

  const transactionCounts = useMemo(() => {
    let inCount = 0;
    let outCount = 0;

    for (const transaction of allTransactions) {
      if (transaction.direction === "in") inCount += 1;
      if (transaction.direction === "out") outCount += 1;
    }

    return { inCount, outCount };
  }, [allTransactions]);

  const totalIn = useMemo(
    () =>
      allTransactions
        .filter((transaction) => transaction.direction === "in")
        .reduce(
          (sum, transaction) =>
            sum + (Number(transaction.amountPaise) || 0),
          0,
        ),
    [allTransactions],
  );

  const totalOut = useMemo(
    () =>
      allTransactions
        .filter((transaction) => transaction.direction === "out")
        .reduce(
          (sum, transaction) =>
            sum + (Number(transaction.amountPaise) || 0),
          0,
        ),
    [allTransactions],
  );

  const transactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allTransactions
      .filter((transaction) => {
        if (query) {
          const label = (transaction.label || "").toLowerCase();
          const category = (transaction.category || "").toLowerCase();
          const source = (
            transaction.ref?.kind || "manual"
          ).toLowerCase();

          if (
            !label.includes(query) &&
            !category.includes(query) &&
            !source.includes(query)
          ) {
            return false;
          }
        }

        if (
          directionFilter &&
          transaction.direction !== directionFilter
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
      );
  }, [allTransactions, search, directionFilter]);

  const lastPage = Math.max(
    0,
    Math.ceil(transactions.length / rowsPerPage) - 1,
  );

  const safePage = Math.min(page, lastPage);

  const pagedTransactions = transactions.slice(
    safePage * rowsPerPage,
    safePage * rowsPerPage + rowsPerPage,
  );

  const resetFilters = () => {
    setSearch("");
    setDirectionFilter("");
    setPage(0);
  };

  return (
    <Box
      className="page cfs-bank-page"
      sx={{
        position: "relative",
        isolation: "isolate",
        minWidth: 0,
        pb: 3,
        overflow: "hidden",
        color: C.ink,
        bgcolor: C.page,
        backgroundImage:
          "radial-gradient(ellipse at 10% 0%, rgba(86,157,119,0.15), transparent 32%), radial-gradient(ellipse at 100% 16%, rgba(151,197,163,0.17), transparent 31%), linear-gradient(180deg,#F8FBF8 0%,#F1F6F1 100%)",
      }}
    >
      <GlobalStyles
        styles={{
          "@keyframes cfs-bank-enter": {
            "0%": {
              opacity: 0,
              transform: "translateY(9px)",
            },
            "100%": {
              opacity: 1,
              transform: "translateY(0)",
            },
          },

          "@keyframes cfs-bank-glow": {
            "0%,100%": {
              opacity: 0.42,
              transform: "scale(0.98)",
            },
            "50%": {
              opacity: 0.7,
              transform: "scale(1.04)",
            },
          },

          ".cfs-bank-page .cfs-enter": {
            animation:
              "cfs-bank-enter 480ms cubic-bezier(.2,.7,.2,1) both",
          },

          ".cfs-bank-page button": {
            WebkitTapHighlightColor: "transparent",
          },

          "@media (prefers-reduced-motion: reduce)": {
            ".cfs-bank-page *, .cfs-bank-page *::before, .cfs-bank-page *::after":
              {
                animationDuration: "0.01ms !important",
                animationIterationCount: "1 !important",
                transitionDuration: "0.01ms !important",
                scrollBehavior: "auto !important",
              },
          },
        }}
      />

      {/* Ambient background lighting */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          zIndex: -1,
          top: -150,
          right: { xs: -130, md: -85 },
          width: { xs: 240, md: 420 },
          height: { xs: 240, md: 420 },
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(74,158,122,0.18), rgba(74,158,122,0.03) 48%, transparent 72%)",
          filter: "blur(37px)",
          animation: "cfs-bank-glow 10s ease-in-out infinite",
        }}
      />

      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          zIndex: -1,
          top: 520,
          left: -135,
          width: 300,
          height: 300,
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(68,190,150,0.11), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Branded page header */}
      <Box
        className="cfs-enter"
        sx={{
          position: "relative",
          mb: 2.1,
          p: { xs: 2, sm: 2.6, lg: 3 },
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          overflow: "hidden",
          borderRadius: "21px",
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            "radial-gradient(circle at 88% 8%, rgba(150,218,184,0.18), transparent 31%), linear-gradient(118deg,#11281F 0%,#16382B 54%,#20513D 100%)",
          boxShadow:
            "0 17px 42px rgba(20,45,36,0.13), inset 0 1px 0 rgba(255,255,255,0.06)",
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
                width: 27,
                height: 27,
                display: "grid",
                placeItems: "center",
                borderRadius: "8px",
                bgcolor: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <ArrowLeftRight size={14} color="#B5E7CC" />
            </Box>

            <Typography
              sx={{
                fontSize: 11.8,
                fontWeight: 850,
                letterSpacing: "1.6px",
                color: "#B5E7CC",
                textTransform: "uppercase",
              }}
            >
              Treasury & Fixed Obligations
            </Typography>
          </Box>

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 26, sm: 30, lg: 33 },
              fontWeight: 830,
              letterSpacing: "-1.2px",
              lineHeight: 1.2,
              color: "#FFFFFF",
              overflowWrap: "anywhere",
            }}
          >
            Bank & Expense
          </Typography>

          <Typography
            sx={{
              mt: 0.8,
              maxWidth: 650,
              fontSize: 11.7,
              lineHeight: 1.75,
              color: "rgba(239,248,242,0.76)",
            }}
          >
            Reconcile live bank statements, inspect cash movements, and manage recurring fixed monthly expenses (salary, EMI, electricity/light bills, rent) feeding the forecast.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: {
              xs: "stretch",
              sm: "center",
            },
            flexDirection: {
              xs: "column",
              sm: "row",
            },
            gap: 0.9,
            flexShrink: 0,
            width: { xs: "100%", md: "auto" },
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Download size={14} />}
            onClick={downloadBankTemplate}
            sx={{
              ...BUTTON_SX,
              minHeight: 41,
              px: 1.4,
              color: "#FFFFFF",
              borderColor: "rgba(255,255,255,0.25)",
              bgcolor: "rgba(255,255,255,0.05)",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.12)",
                borderColor: "rgba(255,255,255,0.42)",
              },
            }}
          >
            CSV template
          </Button>

          <Button
            variant="contained"
            startIcon={<UploadCloud size={15} />}
            onClick={() => setBankWizardOpen(true)}
            sx={{
              ...BUTTON_SX,
              minHeight: 41,
              px: 1.45,
              bgcolor: "#B5E7CC",
              color: C.forest,
              "&:hover": {
                bgcolor: "#D0F0DD",
                transform: "translateY(-1px)",
              },
            }}
          >
            Import statement
          </Button>
        </Box>
      </Box>

      {/* Summary metrics */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            sm: "repeat(3,minmax(0,1fr))",
          },
          gap: 1,
          mb: 1.4,
        }}
      >
        <StatCard
          index={0}
          label="Available bank balance"
          value={formatINR(dataset.currentCashPaise)}
          note="Synced from the opening balance and reconciled imports."
          tone="teal"
          icon={Wallet}
          expanded={expandedMetric === 0}
          onToggle={() =>
            setExpandedMetric((current) => current === 0 ? null : 0)
          }
        />

        <StatCard
          index={1}
          label="Recorded receipts (Inflows)"
          value={formatINR(totalIn)}
          note={`${transactionCounts.inCount} recorded cash receipt${
            transactionCounts.inCount === 1 ? "" : "s"
          }.`}
          tone="green"
          icon={TrendingUp}
          expanded={expandedMetric === 1}
          onToggle={() =>
            setExpandedMetric((current) => current === 1 ? null : 1)
          }
        />

        <StatCard
          index={2}
          label="Recorded outflows"
          value={formatINR(totalOut)}
          note={`${transactionCounts.outCount} recorded expense${
            transactionCounts.outCount === 1 ? "" : "s"
          } and payment${transactionCounts.outCount === 1 ? "" : "s"}.`}
          tone="neutral"
          icon={TrendingDown}
          expanded={expandedMetric === 2}
          onToggle={() =>
            setExpandedMetric((current) => current === 2 ? null : 2)
          }
        />
      </Box>

      {/* Main content panel and tabs */}
      <Box sx={{ ...PANEL_SX, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Bank and invoice workspace sections"
          sx={{
            px: { xs: 1, sm: 1.6 },
            minHeight: 50,
            borderBottom: `1px solid ${C.border}`,
            bgcolor: "rgba(246,249,246,0.82)",
            "& .MuiTabs-indicator": {
              height: 2.5,
              bgcolor: C.accent,
              borderRadius: "3px 3px 0 0",
            },
            "& .MuiTab-root": {
              minHeight: 50,
              px: { xs: 1.2, sm: 1.8 },
              gap: 0.7,
              color: C.muted,
              fontSize: 12,
              fontWeight: 750,
              textTransform: "none",
            },
            "& .MuiTab-root.Mui-selected": {
              color: C.accent,
              fontWeight: 850,
            },
            "& .MuiTab-root:focus-visible": {
              outline: `2px solid ${C.accent}`,
              outlineOffset: -3,
            },
          }}
        >
          <Tab
            icon={<Banknote size={15} />}
            iconPosition="start"
            label="Bank statements & ledger"
          />
          <Tab
            icon={<Repeat size={15} />}
            iconPosition="start"
            label="Monthly Fixed Expenses"
          />
        </Tabs>

        {/* TAB 0: Bank statements and ledger */}
        {tab === 0 && (
          <Box sx={{ p: { xs: 1.3, sm: 2 } }}>
            <Box
              className="cfs-enter"
              sx={{
                position: "relative",
                display: "flex",
                alignItems: {
                  xs: "flex-start",
                  md: "center",
                },
                justifyContent: "space-between",
                gap: 1.5,
                flexWrap: "wrap",
                p: { xs: 1.5, sm: 1.9 },
                mb: 1.8,
                borderRadius: "14px",
                border: "1px solid rgba(23,107,82,0.16)",
                background:
                  "linear-gradient(120deg, rgba(233,245,239,0.96), rgba(246,251,247,0.96))",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: "12px",
                    bgcolor: C.accent,
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 5px 12px rgba(23,107,82,0.14)",
                  }}
                >
                  <Banknote size={19} color="#FFFFFF" />
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 820,
                      fontSize: 12.6,
                      color: C.ink,
                      lineHeight: 1.5,
                    }}
                  >
                    Import a bank statement
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,
                      fontSize: 11.8,
                      lineHeight: 1.6,
                      color: C.muted,
                    }}
                  >
                    Guided CSV import with column detection and duplicate checks.
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Download size={13} />}
                  onClick={downloadBankTemplate}
                  sx={{
                    ...BUTTON_SX,
                    color: C.accent,
                    borderColor: "rgba(23,107,82,0.25)",
                    bgcolor: "rgba(255,255,255,0.75)",
                    "&:hover": {
                      bgcolor: "#FFFFFF",
                      borderColor: C.accent,
                    },
                  }}
                >
                  Sample CSV
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  startIcon={<UploadCloud size={14} />}
                  onClick={() => setBankWizardOpen(true)}
                  sx={{
                    ...BUTTON_SX,
                    bgcolor: C.accent,
                    color: "#FFFFFF",
                    "&:hover": { bgcolor: C.accentDeep },
                  }}
                >
                  Start import
                </Button>
              </Box>
            </Box>

            {/* Ledger filters */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1.35,
                flexWrap: "wrap",
              }}
            >
              <TextField
                size="small"
                placeholder="Search labels, categories or source…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                slotProps={{
                  htmlInput: { "aria-label": "Search transactions" },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={15} color={C.subtle} />
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          aria-label="Clear search"
                          onClick={() => {
                            setSearch("");
                            setPage(0);
                          }}
                          sx={{
                            minWidth: 24,
                            width: 24,
                            height: 24,
                            p: 0,
                            color: C.subtle,
                          }}
                        >
                          <X size={13} />
                        </Button>
                      </InputAdornment>
                    ) : null,
                  },
                }}
                sx={{
                  flex: { xs: "1 1 100%", md: "1 1 260px" },
                  minWidth: { xs: 0, sm: 240 },
                  maxWidth: { md: 410 },
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "rgba(255,255,255,0.88)",
                    borderRadius: "10px",
                    fontSize: 12,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: C.border,
                  },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(23,107,82,0.35)",
                  },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: C.accent,
                  },
                  "& input": { py: 1.15 },
                }}
              />

              <TextField
                select
                size="small"
                value={directionFilter}
                onChange={(event) => {
                  setDirectionFilter(event.target.value);
                  setPage(0);
                }}
                slotProps={{ htmlInput: { "aria-label": "Filter by cash direction" } }}
                sx={{
                  flex: "0 0 auto",
                  minWidth: { xs: "100%", sm: 175 },
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "rgba(255,255,255,0.88)",
                    borderRadius: "10px",
                    fontSize: 12,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: C.border,
                  },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: C.accent,
                  },
                  "& .MuiSelect-select": { py: 1.15 },
                }}
              >
                <MenuItem value="">All directions</MenuItem>
                <MenuItem value="in">Inflows · Receipts</MenuItem>
                <MenuItem value="out">Outflows · Payments</MenuItem>
              </TextField>

              {(search || directionFilter) && (
                <Button
                  variant="text"
                  size="small"
                  onClick={resetFilters}
                  startIcon={<X size={13} />}
                  sx={{ ...BUTTON_SX, color: C.muted }}
                >
                  Clear filters
                </Button>
              )}

              <Box sx={{ flex: 1 }} />

              <Button
                variant="text"
                size="small"
                onClick={() => navigate("/transactions")}
                endIcon={<ArrowRight size={13} />}
                sx={{ ...BUTTON_SX, color: C.accent, ml: "auto" }}
              >
                Full ledger
              </Button>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
                mb: 0.8,
              }}
            >
              <Typography sx={{ fontSize: 11.8, color: C.muted }}>
                {transactions.length} transaction
                {transactions.length === 1 ? "" : "s"} found
              </Typography>

              <Tooltip title="Transactions are sorted newest first. Amounts are displayed in INR.">
                <Box
                  component="span"
                  tabIndex={0}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: C.subtle,
                    fontSize: 11.8,
                    cursor: "help",
                  }}
                >
                  <ShieldCheck size={12} />
                  Ledger overview
                </Box>
              </Tooltip>
            </Box>

            {/* Ledger table */}
            <TableContainer
              sx={{
                width: "100%",
                border: `1px solid ${C.border}`,
                borderRadius: "12px",
                bgcolor: "rgba(255,255,255,0.96)",
                overflowX: "auto",
                overscrollBehaviorX: "contain",
                scrollbarWidth: "thin",
                "&::-webkit-scrollbar": { height: 6 },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "#C9D8CE",
                  borderRadius: 10,
                },
              }}
            >
              <Table
                size="small"
                aria-label="Bank transaction ledger"
                sx={{
                  minWidth: 820,
                  "& .MuiTableCell-root": {
                    borderBottom: `1px solid ${C.border}`,
                    px: 1.25,
                    py: 1.15,
                    verticalAlign: "middle",
                  },
                  "& .MuiTableBody-root .MuiTableRow-root": {
                    transition: "background-color 150ms ease",
                  },
                  "& .MuiTableBody-root .MuiTableRow-root:hover": {
                    bgcolor: "rgba(233,245,239,0.62)",
                  },
                  "& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root": {
                    borderBottom: 0,
                  },
                }}
              >
                <TableHead sx={TABLE_HEAD_SX}>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Narration / label</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Inflow (Cr)</TableCell>
                    <TableCell align="right">Outflow (Dr)</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {pagedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 4, textAlign: "center" }}>
                        <EmptyState
                          title="No matching transactions"
                          body="Try adjusting your filters or import a bank statement."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedTransactions.map((transaction) => {
                      const actual =
                        transaction.status === "actual" ||
                        transaction.date <= today;

                      const statusLabel =
                        transaction.status ||
                        (actual ? "actual" : "committed");

                      return (
                        <TableRow key={transaction.id} hover>
                          <TableCell sx={{ minWidth: 105, whiteSpace: "nowrap" }}>
                            <Typography
                              sx={{
                                fontSize: 11.8,
                                color: C.muted,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatDisplay(transaction.date)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ maxWidth: 270, minWidth: 180 }}>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 760,
                                color: C.ink,
                                lineHeight: 1.5,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {transaction.label || "Unlabelled transaction"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ minWidth: 105 }}>
                            <Typography sx={{ fontSize: 11.8, color: C.muted }}>
                              {transaction.category || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ minWidth: 100 }}>
                            <SourcePill source={transaction.ref?.kind || "manual"} />
                          </TableCell>

                          <TableCell align="right" sx={{ minWidth: 125 }}>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 780,
                                color:
                                  transaction.direction === "in"
                                    ? C.positive
                                    : C.subtle,
                                whiteSpace: "nowrap",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {transaction.direction === "in"
                                ? formatINR(transaction.amountPaise)
                                : "—"}
                            </Typography>
                          </TableCell>

                          <TableCell align="right" sx={{ minWidth: 125 }}>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 780,
                                color:
                                  transaction.direction === "out"
                                    ? C.negative
                                    : C.subtle,
                                whiteSpace: "nowrap",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {transaction.direction === "out"
                                ? formatINR(transaction.amountPaise)
                                : "—"}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ minWidth: 110 }}>
                            <StatusPill label={statusLabel} actual={actual} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <TablePagination
                rowsPerPageOptions={[10, 20, 50]}
                component="div"
                count={transactions.length}
                rowsPerPage={rowsPerPage}
                page={safePage}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                onRowsPerPageChange={(event) => {
                  const nextRowsPerPage = Number.parseInt(
                    event.target.value,
                    10,
                  );
                  setRowsPerPage(
                    Number.isFinite(nextRowsPerPage)
                      ? nextRowsPerPage
                      : 10,
                  );
                  setPage(0);
                }}
                sx={{
                  borderTop: `1px solid ${C.border}`,
                  bgcolor: "#FBFCFB",
                  "& .MuiTablePagination-toolbar": {
                    minHeight: 46,
                    px: 1.2,
                  },
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                    fontSize: 11.8,
                    color: C.muted,
                  },
                  "& .MuiTablePagination-select": { fontSize: 11.8 },
                  "& .MuiIconButton-root": { color: C.accent, p: 0.65 },
                }}
              />
            </TableContainer>
          </Box>
        )}

        {/* TAB 1: Monthly Fixed Expenses */}
        {tab === 1 && (
          <Box sx={{ p: { xs: 1.3, sm: 2 } }}>
            {/* Top Fixed Expense KPI Metrics */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(3, 1fr)",
                },
                gap: 1.5,
                mb: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.8,
                  borderRadius: "14px",
                  border: `1px solid ${C.border}`,
                  bgcolor: "#FFFFFF",
                  boxShadow: "0 2px 7px rgba(22,39,31,0.03)",
                }}
              >
                <Typography sx={{ fontSize: 11.8, fontWeight: 750, color: C.muted, textTransform: "uppercase" }}>
                  Total Monthly Fixed Outflow
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 850, color: C.negative, mt: 0.4 }}>
                  {formatINR(totalMonthlyFixedPaise)}
                </Typography>
                <Typography sx={{ fontSize: 11.8, color: C.muted, mt: 0.3 }}>
                  Active regular monthly commitments
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.8,
                  borderRadius: "14px",
                  border: `1px solid ${C.border}`,
                  bgcolor: "#FFFFFF",
                  boxShadow: "0 2px 7px rgba(22,39,31,0.03)",
                }}
              >
                <Typography sx={{ fontSize: 11.8, fontWeight: 750, color: C.muted, textTransform: "uppercase" }}>
                  Active Fixed Commitments
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 850, color: C.accent, mt: 0.4 }}>
                  {activeFixedExpenses.length} regular expenses
                </Typography>
                <Typography sx={{ fontSize: 11.8, color: C.muted, mt: 0.3 }}>
                  Auto-projects into cash-flow forecast
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.8,
                  borderRadius: "14px",
                  border: `1px solid ${C.border}`,
                  bgcolor: "#FFFFFF",
                  boxShadow: "0 2px 7px rgba(22,39,31,0.03)",
                }}
              >
                <Typography sx={{ fontSize: 11.8, fontWeight: 750, color: C.muted, textTransform: "uppercase" }}>
                  Forecast Protection
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 850, color: C.positive, mt: 0.4 }}>
                  100% Protected
                </Typography>
                <Typography sx={{ fontSize: 11.8, color: C.muted, mt: 0.3 }}>
                  Deficit warnings account for EMIs & payroll
                </Typography>
              </Box>
            </Box>

            {/* Quick-Add Template Toolbar & Primary Action */}
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.2,
                p: 1.4,
                mb: 2,
                borderRadius: "14px",
                border: "1px solid rgba(23,107,82,0.18)",
                background: "linear-gradient(120deg, rgba(233,245,239,0.96), rgba(246,251,247,0.96))",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.2, fontWeight: 800, color: C.ink }}>
                  Quick Recurring Expense Shortcuts
                </Typography>
                <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap", mt: 0.8 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Users size={13} color="#0D9488" />}
                    onClick={() =>
                      setExpenseDlg({
                        open: true,
                        mode: "recurring",
                        expense: { label: "Staff Salaries & Payroll", category: "salary", amountPaise: 18500000, dayOfMonth: 5 },
                      })
                    }
                    sx={{ ...BUTTON_SX, bgcolor: "#FFFFFF", py: 0.45, fontSize: 11.8, borderRadius: "8px", borderColor: "rgba(23,107,82,0.2)" }}
                  >
                    + Salary
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Landmark size={13} color="#6366F1" />}
                    onClick={() =>
                      setExpenseDlg({
                        open: true,
                        mode: "recurring",
                        expense: { label: "Bank Term Loan EMI", category: "loan-emi", amountPaise: 4200000, dayOfMonth: 15 },
                      })
                    }
                    sx={{ ...BUTTON_SX, bgcolor: "#FFFFFF", py: 0.45, fontSize: 11.8, borderRadius: "8px", borderColor: "rgba(23,107,82,0.2)" }}
                  >
                    + Loan EMI
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Zap size={13} color="#F59E0B" />}
                    onClick={() =>
                      setExpenseDlg({
                        open: true,
                        mode: "recurring",
                        expense: { label: "Electricity & Light Bills", category: "utilities", amountPaise: 1200000, dayOfMonth: 9 },
                      })
                    }
                    sx={{ ...BUTTON_SX, bgcolor: "#FFFFFF", py: 0.45, fontSize: 11.8, borderRadius: "8px", borderColor: "rgba(23,107,82,0.2)" }}
                  >
                    + Light Bill
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Building2 size={13} color="#3B82F6" />}
                    onClick={() =>
                      setExpenseDlg({
                        open: true,
                        mode: "recurring",
                        expense: { label: "Warehouse & Office Rent", category: "rent", amountPaise: 6000000, dayOfMonth: 8 },
                      })
                    }
                    sx={{ ...BUTTON_SX, bgcolor: "#FFFFFF", py: 0.45, fontSize: 11.8, borderRadius: "8px", borderColor: "rgba(23,107,82,0.2)" }}
                  >
                    + Office Rent
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Receipt size={13} color="#EC4899" />}
                    onClick={() =>
                      setExpenseDlg({
                        open: true,
                        mode: "recurring",
                        expense: { label: "Monthly GST Challan", category: "tax", amountPaise: 4500000, dayOfMonth: 20 },
                      })
                    }
                    sx={{ ...BUTTON_SX, bgcolor: "#FFFFFF", py: 0.45, fontSize: 11.8, borderRadius: "8px", borderColor: "rgba(23,107,82,0.2)" }}
                  >
                    + GST Challan
                  </Button>
                </Box>
              </Box>

              <Button
                variant="contained"
                startIcon={<Plus size={15} />}
                onClick={() => setExpenseDlg({ open: true, mode: "recurring", expense: null })}
                sx={{
                  ...BUTTON_SX,
                  bgcolor: C.accent,
                  color: "#FFFFFF",
                  px: 1.8,
                  py: 0.9,
                  borderRadius: "10px",
                  fontSize: 12,
                  "&:hover": { bgcolor: C.accentDeep, transform: "translateY(-1px)" },
                }}
              >
                + Add fixed expense
              </Button>
            </Box>

            {/* Recurring Fixed Expenses Table */}
            <TableContainer sx={{ borderRadius: "12px", border: `1px solid ${C.border}`, bgcolor: "#FFFFFF" }}>
              <Table size="small">
                <TableHead sx={TABLE_HEAD_SX}>
                  <TableRow>
                    <TableCell>Expense title</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Schedule</TableCell>
                    <TableCell>Next due date</TableCell>
                    <TableCell align="right">Monthly amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recurringList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState
                          title="No recurring fixed expenses"
                          body="Add your staff salary, bank loan EMIs, rent, and utility bills to keep your cash forecast accurate."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    recurringList.map((exp) => {
                      const isActive = exp.active !== false;
                      return (
                        <TableRow key={exp.id} hover sx={{ transition: "background-color 0.18s ease" }}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "7px",
                                  display: "grid",
                                  placeItems: "center",
                                  bgcolor: "rgba(23,107,82,0.08)",
                                  flexShrink: 0,
                                }}
                              >
                                {exp.category === "salary" ? (
                                  <Users size={14} color="#0D9488" />
                                ) : exp.category === "loan-emi" ? (
                                  <Landmark size={14} color="#6366F1" />
                                ) : exp.category === "utilities" ? (
                                  <Zap size={14} color="#F59E0B" />
                                ) : exp.category === "rent" ? (
                                  <Building2 size={14} color="#3B82F6" />
                                ) : (
                                  <Receipt size={14} color="#10B981" />
                                )}
                              </Box>
                              <Box>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 750, color: C.ink }}>
                                  {exp.label}
                                </Typography>
                                {exp.notes && (
                                  <Typography sx={{ fontSize: 11.8, color: C.muted }}>
                                    {exp.notes}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={exp.category.replace("-", " ")}
                              sx={{
                                height: 20,
                                fontSize: 11.8,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                bgcolor: "rgba(22,39,31,0.06)",
                                color: C.ink,
                              }}
                            />
                          </TableCell>

                          <TableCell sx={{ fontSize: 12, color: C.ink }}>
                            Monthly on the {exp.dayOfMonth}th
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={exp.nextDueDate ? formatDisplay(exp.nextDueDate) : `Day ${exp.dayOfMonth}`}
                              sx={{
                                height: 21,
                                fontSize: 11.8,
                                fontWeight: 700,
                                bgcolor: "rgba(23,107,82,0.1)",
                                color: C.accent,
                              }}
                            />
                          </TableCell>

                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 13, color: C.negative }}>
                            {formatINR(exp.amountPaise)}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={isActive ? "Active" : "Paused"}
                              onClick={() => {
                                dispatch({ type: "TOGGLE_RECURRING_EXPENSE", id: exp.id });
                                toast(`${exp.label} is now ${isActive ? "paused" : "active"} in forecast`);
                              }}
                              sx={{
                                height: 21,
                                fontSize: 11.8,
                                fontWeight: 750,
                                cursor: "pointer",
                                bgcolor: isActive ? "rgba(16,185,129,0.14)" : "rgba(107,114,128,0.14)",
                                color: isActive ? "#065F46" : "#4B5563",
                                "&:hover": {
                                  bgcolor: isActive ? "rgba(16,185,129,0.25)" : "rgba(107,114,128,0.25)",
                                },
                              }}
                            />
                          </TableCell>

                          <TableCell align="right">
                            <Tooltip title="Edit commitment">
                              <Button
                                size="small"
                                onClick={() => setExpenseDlg({ open: true, mode: "recurring", expense: exp })}
                                sx={{ minWidth: 28, p: 0.5, color: C.accent }}
                              >
                                <Edit3 size={15} />
                              </Button>
                            </Tooltip>
                            <Tooltip title="Delete commitment">
                              <Button
                                size="small"
                                onClick={() => {
                                  dispatch({ type: "DELETE_RECURRING_EXPENSE", id: exp.id });
                                  toast(`Removed ${exp.label} from monthly commitments`);
                                }}
                                sx={{ minWidth: 28, p: 0.5, color: C.negative }}
                              >
                                <Trash2 size={15} />
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

            <Box sx={{ mt: 1.5, p: 1.2, borderRadius: "10px", bgcolor: "rgba(23,107,82,0.05)", border: "1px solid rgba(23,107,82,0.1)", display: "flex", alignItems: "center", gap: 1 }}>
              <ShieldCheck size={15} color={C.accent} style={{ flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11.8, color: C.muted }}>
                Every active fixed monthly expense here automatically generates scheduled transactions and protects your cash reserve in Cash Forecast.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Operational note */}
      <Box
        className="cfs-enter"
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0.8,
          mt: 1.4,
          px: 0.35,
        }}
      >
        <ShieldCheck
          size={13}
          color={C.subtle}
          style={{ flexShrink: 0, marginTop: 2 }}
        />

        <Typography sx={{ fontSize: 11.8, color: C.subtle, lineHeight: 1.65 }}>
          Use the CSV template to align your column names before importing bank statements.
          Fixed expenses will project automatically into future forecast days.
        </Typography>
      </Box>

      <BankStatementImportWizard
        open={bankWizardOpen}
        onClose={() => setBankWizardOpen(false)}
      />

      <InvoiceImportWizard
        open={invoiceWizard.open}
        initialType={invoiceWizard.type}
        onClose={() =>
          setInvoiceWizard({ open: false, type: "sales" })
        }
      />

      {expenseDlg.open && (
        <ExpenseDialog
          open={expenseDlg.open}
          initialMode={expenseDlg.mode}
          expense={expenseDlg.expense}
          onClose={() => setExpenseDlg({ open: false, mode: "recurring", expense: null })}
        />
      )}
    </Box>
  );
}
