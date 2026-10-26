
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import GlobalStyles from "@mui/material/GlobalStyles";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowLeftRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Filter,
  Info,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { useApp } from "../context/AppContext.jsx";
import { EmptyState } from "../components/common.jsx";
import { CashFlowChart } from "../components/charts.jsx";
import {
  buildForecast,
  explainShortage,
} from "../services/forecastService.js";
import {
  formatINR,
  formatShort,
  formatDisplay,
  todayISO,
  addDaysISO,
} from "../utils/finance.js";

const CATEGORY_LABELS = {
  "invoice-receipt": "Customer invoice payments",
  "cash-sales": "Cash sales",
  "supplier-payment": "Supplier payments",
  salary: "Salaries",
  rent: "Rent & utilities",
  utilities: "Rent & utilities",
  "loan-emi": "Loan EMIs",
  tax: "Tax payments",
  inventory: "Inventory purchases",
  marketing: "Operating expenses",
  operating: "Operating expenses",
  financing: "Financing",
};

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
  position: "relative",
  minWidth: 0,
  overflow: "hidden",
  border: `1px solid ${C.border}`,
  borderRadius: "17px",
  bgcolor: C.surface,
  backdropFilter: "blur(16px) saturate(125%)",
  WebkitBackdropFilter: "blur(16px) saturate(125%)",
  boxShadow: "0 5px 18px rgba(22,39,31,0.035)",
  transition:
    "border-color 260ms ease, box-shadow 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
  "&:hover": {
    borderColor: "rgba(23,107,82,0.32)",
    transform: "translateY(-3px) scale(1.004)",
    boxShadow:
      "0 16px 36px -6px rgba(16,185,129,0.12), 0 8px 20px rgba(22,39,31,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
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

const FIELD_SX = {
  minWidth: 0,
  "& .MuiInputLabel-root": {
    fontSize: 11.8,
    color: C.muted,
  },
  "& .MuiOutlinedInput-root": {
    bgcolor: "rgba(255,255,255,0.9)",
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
  "& .MuiSelect-select, & input": {
    py: 1.15,
  },
};

function SectionHeading({
  title,
  subtitle,
  icon: Icon,
  action,
  mb = 1.5,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.2,
        mb,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.05,
          minWidth: 0,
          flex: 1,
        }}
      >
        {Icon && (
          <Box
            sx={{
              width: 35,
              height: 35,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: "11px",
              bgcolor: C.accentWash,
              border: "1px solid rgba(23,107,82,0.07)",
            }}
          >
            <Icon
              size={16}
              color={C.accent}
              strokeWidth={1.9}
            />
          </Box>
        )}

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 13.4,
              fontWeight: 800,
              letterSpacing: "-0.2px",
              lineHeight: 1.45,
              color: C.ink,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              sx={{
                mt: 0.2,
                fontSize: 12,
                color: C.muted,
                lineHeight: 1.55,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {action || null}
    </Box>
  );
}

/* Clickable metrics with inline expansion.
   Details remain inside the card instead of overlaying other content. */

function MetricTile({
  label,
  value,
  note,
  tone = "green",
  icon: Icon,
  expanded,
  onToggle,
  index,
}) {
  const tones = {
    green: [C.positive, C.positiveWash],
    teal: [C.accent, C.accentWash],
    amber: [C.warning, C.warningWash],
    red: [C.negative, C.negativeWash],
    navy: [C.forest, "#EAF0EC"],
  };

  const [accent, wash] = tones[tone] || tones.green;

  return (
    <Box
      component="button"
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={`cfs-forecast-metric drift-wall${
        expanded ? " is-expanded" : ""
      }`}
      style={{ animationDelay: `${index * 45}ms` }}
      sx={{
        position: "relative",
        isolation: "isolate",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        minWidth: 0,
        width: "100%",
        minHeight: { xs: 76, sm: 82 },
        p: { xs: 1.1, sm: 1.25 },
        overflow: "hidden",
        textAlign: "left",
        font: "inherit",
        color: C.ink,
        cursor: "pointer",
        border: `1px solid ${
          expanded ? `${accent}65` : C.border
        }`,
        borderRadius: "13px",
        bgcolor: "rgba(255,255,255,0.91)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: expanded
          ? "0 10px 26px rgba(22,39,31,0.075)"
          : "0 3px 8px rgba(22,39,31,0.025)",
        transition:
          "transform 220ms ease, border-color 200ms ease, box-shadow 220ms ease, background-color 200ms ease",

        "&::before": {
          content: '""',
          position: "absolute",
          zIndex: -1,
          width: 120,
          height: 105,
          top: -40,
          right: -32,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}23, transparent 72%)`,
          filter: "blur(18px)",
          opacity: 0.5,
          pointerEvents: "none",
          transition: "opacity 220ms ease, transform 220ms ease",
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

          "& .cfs-forecast-metric-detail": {
            maxHeight: 100,
            opacity: 1,
            visibility: "visible",
            mt: 0.9,
            pt: 0.8,
            borderTopColor: C.border,
          },

          "& .cfs-forecast-metric-chevron": {
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
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "7px",
            bgcolor: wash,
            border: `1px solid ${accent}15`,
          }}
        >
          <Icon
            size={13}
            color={accent}
            strokeWidth={1.9}
          />
        </Box>

        <Typography
          sx={{
            minWidth: 0,
            fontSize: 11.8,
            fontWeight: 760,
            color: C.muted,
            lineHeight: 1.25,
          }}
        >
          {label}
        </Typography>

        <ChevronDown
          className="cfs-forecast-metric-chevron"
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
          fontSize: { xs: 15, sm: 17, xl: 18 },
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
        className="cfs-forecast-metric-detail"
        sx={{
          flexShrink: 0,
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
            overflowWrap: "anywhere",
          }}
        >
          {note}
        </Typography>
      </Box>
    </Box>
  );
}

function KeyValueRow({
  label,
  value,
  tone = "neutral",
  note,
}) {
  const valueColor =
    tone === "positive"
      ? C.positive
      : tone === "negative"
        ? C.negative
        : tone === "warning"
          ? C.warning
          : C.ink;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 1.2,
        py: 1.05,
        borderBottom: `1px solid ${C.border}`,
        "&:last-of-type": {
          borderBottom: 0,
        },
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 650,
            color: C.ink,
            lineHeight: 1.55,
            overflowWrap: "anywhere",
          }}
        >
          {label}
        </Typography>

        {note && (
          <Typography
            sx={{
              mt: 0.2,
              fontSize: 11.5,
              color: C.subtle,
              lineHeight: 1.5,
            }}
          >
            {note}
          </Typography>
        )}
      </Box>

      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
          color: valueColor,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function FilterField(props) {
  return (
    <TextField
      size="small"
      fullWidth
      {...props}
      sx={{
        ...FIELD_SX,
        ...(props.sx || {}),
      }}
    />
  );
}

export default function ForecastPage() {
  const { dataset, settings } = useApp();
  const navigate = useNavigate();
  const today = todayISO();

  const [range, setRange] = useState(
    settings.forecastHorizonDays || 30,
  );

  const [showReserve, setShowReserve] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shortageExpanded, setShortageExpanded] = useState(true);
  const [inputsExpanded, setInputsExpanded] = useState(true);
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [horizonAnchor, setHorizonAnchor] = useState(null);

  const [filters, setFilters] = useState({
    customerId: "",
    supplierId: "",
    category: "",
    status: "",
    from: today,
    to: addDaysISO(today, range),
  });

  const baseForecast = useMemo(
    () =>
      buildForecast(dataset, settings, {
        horizonDays: range,
      }),
    [dataset, settings, range],
  );

  const filteredForecast = useMemo(() => {
    const hasEventFilter = Boolean(
      filters.customerId ||
        filters.supplierId ||
        filters.category ||
        filters.status,
    );

    if (!hasEventFilter) return baseForecast;

    return buildForecast(dataset, settings, {
      horizonDays: range,

      eventFilter: (event) => {
        // Keep history intact so opening and closing balances remain honest.
        if (event.date <= today) return true;

        if (
          filters.customerId &&
          !(
            event.partyId === filters.customerId &&
            event.source.kind === "sales-invoice"
          )
        ) {
          return false;
        }

        if (
          filters.supplierId &&
          !(
            event.partyId === filters.supplierId &&
            event.source.kind === "purchase-invoice"
          )
        ) {
          return false;
        }

        if (
          filters.category &&
          event.category !== filters.category
        ) {
          return false;
        }

        if (
          filters.status &&
          event.status !== filters.status
        ) {
          return false;
        }

        return true;
      },
    });
  }, [
    dataset,
    settings,
    range,
    filters,
    baseForecast,
    today,
  ]);

  const shortage = useMemo(
    () => explainShortage(baseForecast, dataset),
    [baseForecast, dataset],
  );

  const categorySummary = useMemo(() => {
    const map = new Map();

    baseForecast.events
      .filter(
        (event) =>
          event.date > today &&
          event.date <= addDaysISO(today, range),
      )
      .forEach((event) => {
        const key = `${event.direction}|${event.category}`;

        const entry = map.get(key) || {
          direction: event.direction,
          category: event.category,
          total: 0,
          statuses: new Set(),
        };

        entry.total += event.amountPaise;
        entry.statuses.add(event.status);
        map.set(key, entry);
      });

    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [baseForecast, today, range]);

  const dailyRows = useMemo(
    () =>
      filteredForecast.series.filter(
        (seriesItem) =>
          seriesItem.date > today &&
          seriesItem.date >= filters.from &&
          seriesItem.date <= filters.to,
      ),
    [
      filteredForecast,
      today,
      filters.from,
      filters.to,
    ],
  );

  const activeFilterCount = [
    filters.customerId,
    filters.supplierId,
    filters.category,
    filters.status,
    filters.from !== today ? filters.from : "",
    filters.to !== addDaysISO(today, range)
      ? filters.to
      : "",
  ].filter(Boolean).length;

  const setF = (patch) =>
    setFilters((current) => ({
      ...current,
      ...patch,
    }));

  const resetFilters = () => {
    setFilters({
      customerId: "",
      supplierId: "",
      category: "",
      status: "",
      from: today,
      to: addDaysISO(today, range),
    });
  };

  const setRangeValue = (nextRange) => {
    if (!nextRange) return;

    setRange(nextRange);

    setFilters((current) => ({
      ...current,
      to: addDaysISO(today, nextRange),
    }));
  };

  const cashBelowReserve =
    baseForecast.minPoint.close < settings.minReservePaise;

  const summaryMetrics = [
    {
      label: "Opening cash",
      value: formatINR(dataset.currentCashPaise),
      note: "Actual bank balance plus cash in hand recorded in the dataset.",
      tone: "teal",
      icon: Wallet,
    },
    {
      label: "Expected receipts",
      value: formatINR(baseForecast.expectedIn),
      note: `Expected inflows over the next ${range} days, including invoice receipts and cash sales.`,
      tone: "green",
      icon: TrendingUp,
    },
    {
      label: "Expected payments",
      value: formatINR(baseForecast.expectedOut),
      note: `Expected outflows over the next ${range} days, including bills, salaries, EMIs and tax.`,
      tone: "amber",
      icon: TrendingDown,
    },
    {
      label: "Lowest closing balance",
      value: formatINR(baseForecast.minPoint.close),
      note: `Projected for ${formatDisplay(baseForecast.minPoint.date)}.`,
      tone: cashBelowReserve ? "red" : "navy",
      icon: Activity,
    },
  ];

  const allCategories = [
    ...new Set(Object.keys(CATEGORY_LABELS)),
  ]
    .filter(
      (key) => key !== "utilities" && key !== "marketing",
    )
    .sort((a, b) =>
      (CATEGORY_LABELS[a] || a).localeCompare(
        CATEGORY_LABELS[b] || b,
      ),
    );

  const seriesByDate = useMemo(() => {
    const map = new Map();

    filteredForecast.series.forEach((item) =>
      map.set(item.date, item),
    );

    return map;
  }, [filteredForecast.series]);

  return (
    <Box
      className="page cfs-forecast-page"
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
        "& .cfs-forecast-panel": PANEL_SX,
      }}
    >
      <GlobalStyles
        styles={{
          "@keyframes cfs-forecast-enter": {
            "0%": {
              opacity: 0,
              transform: "translateY(9px)",
            },
            "100%": {
              opacity: 1,
              transform: "translateY(0)",
            },
          },

          "@keyframes cfs-forecast-glow": {
            "0%,100%": {
              opacity: 0.42,
              transform: "scale(0.98)",
            },
            "50%": {
              opacity: 0.7,
              transform: "scale(1.04)",
            },
          },

          "@keyframes cfs-forecast-filter-in": {
            "0%": {
              opacity: 0,
              transform: "translateY(-3px)",
            },
            "100%": {
              opacity: 1,
              transform: "translateY(0)",
            },
          },

          ".cfs-forecast-page .cfs-enter": {
            animation:
              "cfs-forecast-enter 480ms cubic-bezier(.2,.7,.2,1) both",
          },

          ".cfs-forecast-page button": {
            WebkitTapHighlightColor: "transparent",
          },

          "@media (prefers-reduced-motion: reduce)": {
            ".cfs-forecast-page *, .cfs-forecast-page *::before, .cfs-forecast-page *::after":
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
          top: -155,
          right: { xs: -130, md: -90 },
          width: { xs: 240, md: 425 },
          height: { xs: 240, md: 425 },
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(74,158,122,0.19), rgba(74,158,122,0.03) 48%, transparent 72%)",
          filter: "blur(37px)",
          animation: "cfs-forecast-glow 10s ease-in-out infinite",
        }}
      />

      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          zIndex: -1,
          top: 520,
          left: -140,
          width: 300,
          height: 300,
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(68,190,150,0.11), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Branded header */}
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
              <Activity size={14} color="#B5E7CC" />
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
              Cash intelligence
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
            }}
          >
            Cash-flow forecast
          </Typography>

          <Typography
            sx={{
              mt: 0.8,
              maxWidth: 660,
              fontSize: 11.7,
              lineHeight: 1.75,
              color: "rgba(239,248,242,0.76)",
            }}
          >
            Track projected daily balances, understand potential
            shortfalls and test what-if decisions before acting.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "stretch", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 0.9,
            width: { xs: "100%", md: "auto" },
            flexShrink: 0,
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label="Change forecast horizon"
            aria-haspopup="true"
            aria-expanded={Boolean(horizonAnchor)}
            onClick={(event) => setHorizonAnchor(event.currentTarget)}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              textAlign: "left",
              font: "inherit",
              px: 1.5,
              py: 0.85,
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "12px",
              bgcolor: Boolean(horizonAnchor)
                ? "rgba(255,255,255,0.16)"
                : "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              transition:
                "transform 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.15)",
                borderColor: "rgba(181,231,204,0.55)",
                transform: "translateY(-1px)",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              },
              "&:focus-visible": {
                outline: "2px solid #B5E7CC",
                outlineOffset: 2,
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                width: "100%",
              }}
            >
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 850,
                  letterSpacing: "0.85px",
                  color: "rgba(239,248,242,0.68)",
                  textTransform: "uppercase",
                }}
              >
                Current horizon
              </Typography>
              <ChevronDown
                size={13}
                color="#B5E7CC"
                style={{
                  marginLeft: 4,
                  transform: horizonAnchor ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 200ms ease",
                }}
              />
            </Box>

            <Typography
              sx={{
                mt: 0.2,
                fontSize: 12.8,
                fontWeight: 800,
                color: "#FFFFFF",
              }}
            >
              Next {range} days
            </Typography>
          </Box>

          <Menu
            anchorEl={horizonAnchor}
            open={Boolean(horizonAnchor)}
            onClose={() => setHorizonAnchor(null)}
            PaperProps={{
              sx: {
                minWidth: 195,
                mt: 0.9,
                p: 0.6,
                borderRadius: "14px",
                border: `1px solid ${C.border}`,
                bgcolor: "rgba(255,255,255,0.97)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 14px 34px rgba(22,39,31,0.15)",
                "& .MuiMenuItem-root": {
                  borderRadius: "9px",
                  px: 1.3,
                  py: 0.9,
                  fontSize: 11.8,
                  fontWeight: 700,
                  color: C.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.2,
                  transition: "background-color 150ms ease, color 150ms ease",
                  "&:hover": {
                    bgcolor: C.accentWash,
                    color: C.accentDeep,
                  },
                  "&.is-active": {
                    bgcolor: "rgba(23,107,82,0.1)",
                    color: C.accent,
                    fontWeight: 850,
                  },
                },
              },
            }}
          >
            {[
              { days: 7, label: "7 days", sub: "1-week outlook" },
              { days: 15, label: "15 days", sub: "Fortnight cycle" },
              { days: 30, label: "30 days", sub: "Standard month" },
              { days: 60, label: "60 days", sub: "2-month projection" },
              { days: 90, label: "90 days", sub: "Quarterly view" },
            ].map((item) => (
              <MenuItem
                key={item.days}
                className={range === item.days ? "is-active" : ""}
                onClick={() => {
                  setRangeValue(item.days);
                  setHorizonAnchor(null);
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 11.8,
                      fontWeight: range === item.days ? 850 : 700,
                      color: "inherit",
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: C.muted }}>
                    {item.sub}
                  </Typography>
                </Box>
                {range === item.days && (
                  <Check size={14} color={C.accent} strokeWidth={2.5} />
                )}
              </MenuItem>
            ))}
          </Menu>

          <Button
            variant="contained"
            endIcon={<ArrowRight size={14} />}
            onClick={() => navigate("/scenario-lab")}
            sx={{
              ...BUTTON_SX,
              minHeight: 42,
              px: 1.5,
              bgcolor: "#B5E7CC",
              color: C.forest,
              "&:hover": {
                bgcolor: "#D0F0DD",
                transform: "translateY(-1px)",
              },
            }}
          >
            Open Scenario Lab
          </Button>
        </Box>
      </Box>

      {/* KPI tiles: click to expand descriptions */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2,minmax(0,1fr))",
            sm: "repeat(2,minmax(0,1fr))",
            md: "repeat(4,minmax(0,1fr))",
          },
          gap: 1,
          mb: 1.4,
        }}
      >
        {summaryMetrics.map((metric, index) => (
          <MetricTile
            key={metric.label}
            {...metric}
            index={index}
            expanded={expandedMetric === index}
            onToggle={() =>
              setExpandedMetric((current) =>
                current === index ? null : index,
              )
            }
          />
        ))}
      </Box>

      {/* Forecast chart */}
      <Box
        className="cfs-forecast-panel drift-wall cfs-enter"
        sx={{
          p: { xs: 1.5, sm: 2, lg: 2.35 },
          mb: 1.8,
          animationDelay: "90ms",
        }}
      >
        <SectionHeading
          title={`Projected daily cash balance${
            activeFilterCount > 0 ? " · Filtered" : ""
          }`}
          subtitle="View expected cash movement against the minimum reserve."
          icon={Activity}
          action={
            <Tooltip title="Show or hide the minimum reserve line on the chart">
              <FormControlLabel
                sx={{
                  mr: 0,
                  ml: 0.5,
                  "& .MuiFormControlLabel-label": {
                    fontSize: 11.8,
                    color: C.muted,
                    whiteSpace: "nowrap",
                  },
                }}
                control={
                  <Switch
                    size="small"
                    checked={showReserve}
                    onChange={(event) =>
                      setShowReserve(event.target.checked)
                    }
                  />
                }
                label="Reserve line"
              />
            </Tooltip>
          }
          mb={1.3}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
            mb: 1.4,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.7 }}>
            <CalendarDays size={13} color={C.accent} />

            <Typography
              sx={{
                fontSize: 11.8,
                fontWeight: 750,
                color: C.muted,
              }}
            >
              Forecast horizon
            </Typography>
          </Box>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={range}
            onChange={(_, value) => setRangeValue(value)}
            aria-label="Forecast horizon"
            sx={{
              p: 0.3,
              bgcolor: "#F2F7F3",
              border: `1px solid ${C.border}`,
              borderRadius: "9px",
              "& .MuiToggleButtonGroup-grouped": {
                border: 0,
                borderRadius: "7px !important",
                mx: 0.12,
              },
              "& .MuiToggleButton-root": {
                px: { xs: 0.9, sm: 1.3 },
                py: 0.5,
                color: C.muted,
                fontSize: 11.8,
                fontWeight: 800,
                textTransform: "none",
                "&.Mui-selected": {
                  bgcolor: "#FFFFFF",
                  color: C.accent,
                  boxShadow: "0 2px 6px rgba(22,39,31,0.08)",
                },
                "&.Mui-selected:hover": {
                  bgcolor: "#FFFFFF",
                },
                "&:focus-visible": {
                  outline: `2px solid ${C.accent}`,
                  outlineOffset: 2,
                },
              },
            }}
          >
            {[7, 15, 30, 60, 90].map((days) => (
              <ToggleButton key={days} value={days}>
                {days}d
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box
          sx={{
            width: "100%",
            minWidth: 0,
            overflow: "hidden",
            borderRadius: "10px",
          }}
        >
          <CashFlowChart
            forecast={filteredForecast}
            showReserve={showReserve}
            height={330}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            flexWrap: "wrap",
            mt: 1.1,
            pt: 1.3,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {[
            { color: C.accent, label: "Actuals through today" },
            { color: "#718176", label: "Forecast estimate" },
            { color: C.negative, label: "Below reserve" },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.65,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "2px",
                  bgcolor: item.color,
                }}
              />

              <Typography sx={{ fontSize: 11.8, color: C.muted }}>
                {item.label}
              </Typography>
            </Box>
          ))}

          <Box sx={{ flex: 1 }} />

          <Typography sx={{ fontSize: 11.5, color: C.subtle }}>
            Based on current recorded assumptions
          </Typography>
        </Box>
      </Box>

      {/* Shortage explanation and forecast inputs */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            lg: "minmax(0,1fr) minmax(0,1fr)",
          },
          gap: 1.6,
          mb: 1.8,
          alignItems: "stretch",
        }}
      >
        <Box
          className="cfs-forecast-panel drift-wall cfs-enter"
          sx={{
            p: { xs: 1.5, sm: 1.9 },
            animationDelay: "170ms",
            display: "flex",
            flexDirection: "column",
            height: { xs: "auto", lg: 520 },
            maxHeight: { xs: "none", lg: 520 },
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <SectionHeading
              title="Why cash may fall"
              subtitle={
                shortage
                  ? `First shortage · ${formatDisplay(shortage.breach.date)}`
                  : "No reserve shortage predicted"
              }
              icon={AlertTriangle}
              action={
                <Tooltip
                  title={
                    shortageExpanded
                      ? "Collapse analysis"
                      : "Expand analysis"
                  }
                >
                  <Button
                    size="small"
                    aria-expanded={shortageExpanded}
                    onClick={() =>
                      setShortageExpanded((value) => !value)
                    }
                    sx={{
                      minWidth: 32,
                      width: 32,
                      height: 32,
                      p: 0,
                      color: C.muted,
                    }}
                  >
                    <ChevronDown
                      size={15}
                      style={{
                        transform: shortageExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 180ms ease",
                      }}
                    />
                  </Button>
                </Tooltip>
              }
              mb={1.2}
            />
          </Box>

          {!shortage ? (
            <EmptyState
              title="No shortage to explain"
              body="With current records, the balance stays above the minimum reserve across the selected forecast horizon."
            />
          ) : (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                  p: 1.2,
                  mb: 0.5,
                  borderRadius: "11px",
                  bgcolor: C.negativeWash,
                  border: "1px solid #F0D3CF",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle
                  size={16}
                  color={C.negative}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 12.2,
                      fontWeight: 820,
                      color: C.negative,
                      lineHeight: 1.5,
                    }}
                  >
                    {formatDisplay(shortage.breach.date)} ·{" "}
                    {formatINR(shortage.breach.close)} projected
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,
                      fontSize: 11.8,
                      color: "#7D3D36",
                      lineHeight: 1.6,
                    }}
                  >
                    {shortage.isNegative
                      ? "This balance is below zero"
                      : `This balance is below the ${formatINR(
                          baseForecast.reserve,
                        )} reserve`}{" "}
                    · {shortage.daysFromToday} days from today.
                  </Typography>
                </Box>
              </Box>

              {shortageExpanded && (
                <Box
                  sx={{
                    mt: 1,
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    pr: 0.8,
                    display: "flex",
                    flexDirection: "column",
                    "&::-webkit-scrollbar": { width: "6px" },
                    "&::-webkit-scrollbar-track": { background: "rgba(22, 39, 31, 0.03)", borderRadius: "8px" },
                    "&::-webkit-scrollbar-thumb": { background: "rgba(23, 107, 82, 0.22)", borderRadius: "8px" },
                    "&::-webkit-scrollbar-thumb:hover": { background: "rgba(23, 107, 82, 0.42)" },
                    animation:
                      "cfs-forecast-filter-in 180ms ease both",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 850,
                      color: C.subtle,
                      letterSpacing: "0.7px",
                      textTransform: "uppercase",
                      mb: 0.35,
                    }}
                  >
                    Outflows driving the shortage
                  </Typography>

                  {shortage.causes.length === 0 ? (
                    <Typography
                      sx={{
                        py: 0.8,
                        fontSize: 11.8,
                        color: C.muted,
                      }}
                    >
                      No specific outflow was returned by the
                      current explanation model.
                    </Typography>
                  ) : (
                    shortage.causes.map((cause, index) => (
                      <KeyValueRow
                        key={`${cause.label}-${cause.date}-${index}`}
                        label={cause.label}
                        note={formatDisplay(cause.date)}
                        value={`−${formatINR(cause.amountPaise)}`}
                        tone="negative"
                      />
                    ))
                  )}

                  <Typography
                    sx={{
                      mt: 1.35,
                      fontSize: 11.5,
                      fontWeight: 850,
                      color: C.subtle,
                      letterSpacing: "0.7px",
                      textTransform: "uppercase",
                    }}
                  >
                    Receipts arriving too late
                  </Typography>

                  {shortage.lateReceipts.length === 0 ? (
                    <Typography
                      sx={{
                        py: 0.8,
                        fontSize: 11.8,
                        color: C.muted,
                      }}
                    >
                      No large receipts after the shortage date.
                    </Typography>
                  ) : (
                    shortage.lateReceipts.map((receipt, index) => (
                      <KeyValueRow
                        key={`${receipt.label}-${receipt.date}-${index}`}
                        label={receipt.label}
                        note={`Arrives ${formatDisplay(receipt.date)}`}
                        value={`+${formatINR(receipt.amountPaise)}`}
                        tone="positive"
                      />
                    ))
                  )}

                  {shortage.uncertain.length > 0 && (
                    <>
                      <Typography
                        sx={{
                          mt: 1.35,
                          fontSize: 11.5,
                          fontWeight: 850,
                          color: C.subtle,
                          letterSpacing: "0.7px",
                          textTransform: "uppercase",
                        }}
                      >
                        Uncertain assumptions
                      </Typography>

                      {shortage.uncertain.map((item, index) => (
                        <KeyValueRow
                          key={`${item.label}-${index}`}
                          label={item.label}
                          value={`+${formatINR(item.amountPaise)}`}
                          tone="warning"
                        />
                      ))}
                    </>
                  )}

                  <Box
                    sx={{
                      mt: 1.25,
                      p: 1.15,
                      bgcolor: "#F5F9F5",
                      borderRadius: "10px",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11.8,
                        lineHeight: 1.65,
                        color: C.muted,
                      }}
                    >
                      Consider collecting overdue invoices earlier,
                      requesting an advance or rescheduling a
                      non-critical supplier payment. Test changes in
                      Scenario Lab; no action is executed automatically.
                    </Typography>

                    <Button
                      variant="contained"
                      onClick={() => navigate("/scenario-lab")}
                      endIcon={<ArrowRight size={13} />}
                      sx={{
                        ...BUTTON_SX,
                        mt: 1,
                        bgcolor: C.accent,
                        color: "#FFFFFF",
                        "&:hover": { bgcolor: C.accentDeep },
                      }}
                    >
                      Test a scenario
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* Category summary */}
        <Box
          className="cfs-forecast-panel drift-wall cfs-enter"
          sx={{
            p: { xs: 1.5, sm: 1.9 },
            animationDelay: "210ms",
            display: "flex",
            flexDirection: "column",
            height: { xs: "auto", lg: 520 },
            maxHeight: { xs: "none", lg: 520 },
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <SectionHeading
              title="Forecast input breakdown"
              subtitle={`Upcoming cash movements · next ${range} days`}
              icon={ArrowLeftRight}
              action={
                <Button
                  size="small"
                  aria-expanded={inputsExpanded}
                  onClick={() =>
                    setInputsExpanded((value) => !value)
                  }
                  sx={{
                    minWidth: 32,
                    width: 32,
                    height: 32,
                    p: 0,
                    color: C.muted,
                  }}
                >
                  <ChevronDown
                    size={15}
                    style={{
                      transform: inputsExpanded
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 180ms ease",
                    }}
                  />
                </Button>
              }
              mb={1.2}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              pr: 0.8,
              display: "flex",
              flexDirection: "column",
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-track": {
                background: "rgba(22, 39, 31, 0.03)",
                borderRadius: "8px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(23, 107, 82, 0.22)",
                borderRadius: "8px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "rgba(23, 107, 82, 0.42)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                p: 1.1,
                mb: 1,
                borderRadius: "10px",
                bgcolor: C.positiveWash,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 0.7 }}
              >
                <TrendingUp size={14} color={C.positive} />

                <Typography
                  sx={{
                    fontSize: 11.8,
                    fontWeight: 850,
                    color: C.positive,
                  }}
                >
                  Incoming cash
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 850,
                  color: C.positive,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatINR(baseForecast.expectedIn, { compact: true })}
              </Typography>
            </Box>

            {inputsExpanded && (
              <Box
                sx={{
                  animation:
                    "cfs-forecast-filter-in 180ms ease both",
                }}
              >
                {categorySummary.filter(
                  (item) => item.direction === "in",
                ).length === 0 ? (
                  <Typography
                    sx={{
                      py: 0.75,
                      fontSize: 11.8,
                      color: C.muted,
                    }}
                  >
                    No expected incoming cash in this horizon.
                  </Typography>
                ) : (
                  categorySummary
                    .filter((item) => item.direction === "in")
                    .map((item) => (
                      <KeyValueRow
                        key={`${item.direction}-${item.category}`}
                        label={
                          CATEGORY_LABELS[item.category] ||
                          item.category
                        }
                        note={[...item.statuses].join(" · ")}
                        value={`+${formatINR(item.total, {
                          compact: true,
                        })}`}
                        tone="positive"
                      />
                    ))
                )}
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                p: 1.1,
                mt: 1.25,
                mb: 1,
                borderRadius: "10px",
                bgcolor: C.negativeWash,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 0.7 }}
              >
                <TrendingDown size={14} color={C.negative} />

                <Typography
                  sx={{
                    fontSize: 11.8,
                    fontWeight: 850,
                    color: C.negative,
                  }}
                >
                  Outgoing cash
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 850,
                  color: C.negative,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatINR(baseForecast.expectedOut, { compact: true })}
              </Typography>
            </Box>

            {inputsExpanded && (
              <Box
                sx={{
                  animation:
                    "cfs-forecast-filter-in 180ms ease both",
                }}
              >
                {categorySummary.filter(
                  (item) => item.direction === "out",
                ).length === 0 ? (
                  <Typography
                    sx={{
                      py: 0.75,
                      fontSize: 11.8,
                      color: C.muted,
                    }}
                  >
                    No expected outgoing cash in this horizon.
                  </Typography>
                ) : (
                  categorySummary
                    .filter((item) => item.direction === "out")
                    .map((item) => (
                      <KeyValueRow
                        key={`${item.direction}-${item.category}`}
                        label={
                          CATEGORY_LABELS[item.category] ||
                          item.category
                        }
                        note={[...item.statuses].join(" · ")}
                        value={`−${formatINR(item.total, {
                          compact: true,
                        })}`}
                        tone="negative"
                      />
                    ))
                )}
              </Box>
            )}
          </Box>

          <Box
            sx={{
              mt: "auto",
              pt: 1.2,
              display: "flex",
              alignItems: "flex-start",
              gap: 0.7,
              flexShrink: 0,
              borderTop: "1px dashed rgba(22, 39, 31, 0.08)",
            }}
          >
            <Info
              size={12}
              color={C.subtle}
              style={{ flexShrink: 0, marginTop: 2 }}
            />

            <Typography
              sx={{
                fontSize: 11.5,
                lineHeight: 1.6,
                color: C.subtle,
              }}
            >
              Unpaid invoices are not counted as money in the bank;
              they enter the forecast on their expected payment dates.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Daily cash table */}
      <Box
        className="cfs-forecast-panel drift-wall cfs-enter"
        sx={{ animationDelay: "250ms" }}
      >
        <Box
          sx={{
            p: { xs: 1.5, sm: 1.9 },
            pb: 1.2,
          }}
        >
          <SectionHeading
            title="Daily cash table"
            subtitle={
              filters.from !== today ||
              filters.to !== addDaysISO(today, range)
                ? `${formatShort(filters.from)} → ${formatShort(filters.to)}`
                : `Daily balances over the next ${range} days`
            }
            icon={CalendarDays}
            action={
              <Chip
                size="small"
                label={`${dailyRows.length} days`}
                sx={{
                  height: 23,
                  bgcolor: C.accentWash,
                  color: C.accent,
                  fontSize: 11.5,
                  fontWeight: 850,
                }}
              />
            }
            mb={0}
          />
        </Box>

        <TableContainer
          sx={{
            maxHeight: 440,
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
            stickyHeader
            aria-label="Daily projected cash balances"
            sx={{
              minWidth: 760,

              "& .MuiTableCell-root": {
                borderBottom: `1px solid ${C.border}`,
                px: 1.25,
                py: 1.15,
                verticalAlign: "middle",
              },

              "& .MuiTableHead-root .MuiTableCell-root": {
                bgcolor: "#F5F9F5",
                color: C.subtle,
                fontSize: 11.5,
                fontWeight: 850,
                letterSpacing: "0.45px",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              },

              "& .MuiTableBody-root .MuiTableRow-root:hover": {
                bgcolor: "rgba(233,245,239,0.6)",
              },

              "& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root":
                {
                  borderBottom: 0,
                },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Key events</TableCell>
                <TableCell align="right">Opening</TableCell>
                <TableCell align="right">Inflows</TableCell>
                <TableCell align="right">Outflows</TableCell>
                <TableCell align="right">Closing cash</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {dailyRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ py: 4, textAlign: "center" }}
                  >
                    <EmptyState
                      title="No days in range"
                      body="Adjust the date filters above or select a longer forecast horizon."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                dailyRows.map((row) => {
                  const previousDate = addDaysISO(row.date, -1);
                  const previousRow = seriesByDate.get(previousDate);

                  const opening = previousRow
                    ? previousRow.close
                    : dataset.currentCashPaise;

                  const danger = row.close < 0;

                  const warning =
                    !danger && row.close < baseForecast.reserve;

                  const rowBackground = danger
                    ? "rgba(188,61,53,0.055)"
                    : warning
                      ? "rgba(147,103,19,0.045)"
                      : undefined;

                  const eventLabels = (row.events || [])
                    .map((event) => event.label)
                    .filter(Boolean);

                  return (
                    <TableRow
                      key={row.date}
                      sx={{ bgcolor: rowBackground }}
                    >
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          minWidth: 100,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 750,
                            color: C.ink,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatShort(row.date)}
                        </Typography>
                      </TableCell>

                      <TableCell
                        sx={{ maxWidth: 350, minWidth: 190 }}
                      >
                        {eventLabels.length > 0 ? (
                          <Tooltip
                            title={eventLabels.join(" · ")}
                            placement="top-start"
                          >
                            <Typography
                              sx={{
                                fontSize: 11.8,
                                color: C.muted,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {eventLabels.join(" · ")}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography
                            sx={{
                              fontSize: 11.8,
                              color: C.subtle,
                            }}
                          >
                            No scheduled events
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: C.muted,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatINR(opening)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: row.inflow ? C.positive : C.subtle,
                            fontWeight: row.inflow ? 750 : 500,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {row.inflow
                            ? `+${formatINR(row.inflow)}`
                            : "—"}
                        </Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: row.outflow ? C.negative : C.subtle,
                            fontWeight: row.outflow ? 750 : 500,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {row.outflow
                            ? `−${formatINR(row.outflow)}`
                            : "—"}
                        </Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 0.6,
                          }}
                        >
                          {danger ? (
                            <AlertTriangle size={12} color={C.negative} />
                          ) : warning ? (
                            <AlertTriangle size={12} color={C.warning} />
                          ) : null}

                          <Typography
                            sx={{
                              fontSize: 12.2,
                              fontWeight: 850,
                              color: danger
                                ? C.negative
                                : warning
                                  ? C.warning
                                  : C.ink,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatINR(row.close)}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Forecast disclaimer */}
      <Box
        className="cfs-enter"
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0.8,
          mt: 1.4,
          px: 0.35,
          animationDelay: "300ms",
        }}
      >
        <CircleHelp
          size={13}
          color={C.subtle}
          style={{ flexShrink: 0, marginTop: 2 }}
        />

        <Typography
          sx={{
            fontSize: 11.8,
            color: C.subtle,
            lineHeight: 1.65,
          }}
        >
          Forecast values are estimates based on recorded movements
          and assumptions. They do not represent live bank data, and
          no payment or financial action is executed automatically.
        </Typography>
      </Box>
    </Box>
  );
}
