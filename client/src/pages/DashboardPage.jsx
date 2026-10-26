
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import GlobalStyles from "@mui/material/GlobalStyles";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { useApp } from "../context/AppContext.jsx";
import {
  EmptyState,
  LoadingSkeleton,
  useFakeLoad,
  LatticeLoader,
} from "../components/common.jsx";
import { CashFlowChart } from "../components/charts.jsx";
import {
  buildForecast,
  explainShortage,
  summarizeDataset,
} from "../services/forecastService.js";
import { outstandingPaise } from "../utils/calculations.js";
import {
  formatINR,
  formatDisplay,
  formatShort,
  todayISO,
  daysBetween,
} from "../utils/finance.js";

const UI = {
  page: "#F4F7F4",
  surface: "rgba(255,255,255,0.91)",
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
  p: { xs: 2, sm: 2.5, lg: 2.7 },
  border: `1px solid ${UI.border}`,
  borderRadius: "17px",
  bgcolor: UI.surface,
  backdropFilter: "blur(18px) saturate(125%)",
  WebkitBackdropFilter: "blur(18px) saturate(125%)",
  boxShadow:
    "0 3px 8px rgba(22,39,31,0.025), 0 12px 30px rgba(22,39,31,0.035)",
  transition:
    "border-color 220ms ease, box-shadow 240ms ease, transform 240ms ease, filter 220ms ease, opacity 220ms ease",
  "&:hover": {
    borderColor: "rgba(23,107,82,0.23)",
    boxShadow: "0 15px 36px rgba(22,39,31,0.065)",
  },
};

const TITLE_SX = {
  fontSize: 14,
  fontWeight: 780,
  lineHeight: 1.4,
  letterSpacing: "-0.25px",
  color: UI.ink,
};

const SUBTITLE_SX = {
  mt: 0.45,
  fontSize: 12,
  lineHeight: 1.6,
  color: UI.muted,
};

const LINK_SX = {
  minWidth: 0,
  px: 0.9,
  py: 0.55,
  borderRadius: "8px",
  color: UI.accent,
  fontSize: 11.5,
  fontWeight: 750,
  textTransform: "none",
  whiteSpace: "nowrap",
  transition: "background-color 180ms ease, color 180ms ease",
  "&:hover": {
    bgcolor: UI.accentWash,
    color: UI.accentDeep,
  },
  "&:focus-visible": {
    outline: `2px solid ${UI.accent}`,
    outlineOffset: 2,
  },
};

/* Compact section headings with explanatory tooltips. */

function PanelHeading({ title, subtitle, action, mb = 1.8 }) {
  const showSummary =
    Boolean(subtitle) &&
    (/[0-9₹]/.test(subtitle) || /outstanding/i.test(subtitle));

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.25,
        mb,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            minWidth: 0,
          }}
        >
          <Typography sx={TITLE_SX}>{title}</Typography>

          {subtitle && !showSummary && (
            <Tooltip
              title={subtitle}
              placement="top-start"
              arrow
              enterDelay={180}
              slotProps={{
                tooltip: {
                  sx: {
                    maxWidth: 280,
                    px: 1.25,
                    py: 0.9,
                    bgcolor: UI.forest,
                    color: "#F4FBF6",
                    fontSize: 12,
                    lineHeight: 1.6,
                    boxShadow: "0 12px 30px rgba(10,35,25,0.2)",
                  },
                },
                arrow: {
                  sx: { color: UI.forest },
                },
              }}
            >
              <Box
                component="span"
                tabIndex={0}
                aria-label={`More about ${title}`}
                sx={{
                  width: 19,
                  height: 19,
                  flexShrink: 0,
                  display: "inline-grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  color: UI.subtle,
                  cursor: "help",
                  "&:hover, &:focus-visible": {
                    color: UI.accent,
                    bgcolor: UI.accentWash,
                    outline: "none",
                  },
                }}
              >
                <Info size={12} />
              </Box>
            </Tooltip>
          )}
        </Box>

        {subtitle && showSummary && (
          <Typography sx={SUBTITLE_SX}>{subtitle}</Typography>
        )}
      </Box>

      {action || null}
    </Box>
  );
}

/* Financial metrics.
   Detail previews expand inside the card rather than floating over other UI. */

function MetricCard({
  question,
  answer,
  note,
  tone = "neutral",
  icon: Icon,
  onClick,
  index = 0,
}) {
  const colors = {
    green: [UI.positive, UI.positiveWash],
    red: [UI.negative, UI.negativeWash],
    amber: [UI.warning, UI.warningWash],
    blue: [UI.accent, UI.accentWash],
    neutral: [UI.muted, "#F1F5F1"],
  };

  const [accent, wash] = colors[tone] || colors.neutral;

  return (
    <Box
      component={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="cfs-enter cfs-interactive cfs-metric-card drift-wall"
      style={{ animationDelay: `${index * 45}ms` }}
      sx={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        boxSizing: "border-box",
        zIndex: 1,
        width: "100%",
        minWidth: 0,
        minHeight: { xs: 76, sm: 82 },
        p: { xs: 1.1, sm: 1.25 },
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        textAlign: "left",
        font: "inherit",
        color: UI.ink,
        cursor: onClick ? "pointer" : "default",
        bgcolor: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${UI.border}`,
        borderRadius: "13px",
        boxShadow: "0 3px 8px rgba(22,39,31,0.025)",
        transition:
          "transform 220ms cubic-bezier(.2,.7,.2,1), border-color 220ms ease, box-shadow 220ms ease, background-color 220ms ease",

        "&::before": {
          content: '""',
          position: "absolute",
          zIndex: -1,
          top: -35,
          right: -25,
          width: 125,
          height: 110,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}24 0%, transparent 72%)`,
          filter: "blur(19px)",
          opacity: 0.48,
          pointerEvents: "none",
          transition: "opacity 220ms ease, transform 240ms ease",
        },

        "&:hover, &:focus-visible": {
          zIndex: 2,
          transform: "translateY(-2px)",
          borderColor: `${accent}70`,
          bgcolor: "rgba(255,255,255,0.99)",
          boxShadow: "0 12px 25px rgba(18,45,32,0.09)",

          "&::before": {
            opacity: 0.95,
            transform: "scale(1.16)",
          },

          "& .cfs-metric-preview": {
            maxHeight: 130,
            opacity: 1,
            visibility: "visible",
            mt: 1.1,
            borderWidth: 1,
            borderColor: "rgba(23,107,82,0.14)",
          },

          "& .cfs-metric-chevron": {
            opacity: 1,
            transform: "translateX(2px)",
          },
        },

        ...(onClick && {
          "&:active": {
            transform: "translateY(0) scale(0.995)",
          },
          "&:focus-visible": {
            outline: `2px solid ${UI.accent}`,
            outlineOffset: 3,
          },
        }),
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.7,
          mb: 0.55,
          position: "relative",
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
            border: `1px solid ${accent}16`,
          }}
        >
          {Icon && <Icon size={13} color={accent} strokeWidth={1.9} />}
        </Box>

        <Typography
          sx={{
            fontSize: 11.8,
            fontWeight: 760,
            lineHeight: 1.25,
            color: UI.muted,
          }}
        >
          {question}
        </Typography>
      </Box>

      <Typography
        sx={{
          position: "relative",
          fontSize: { xs: 15.5, sm: 17, xl: 18 },
          fontWeight: 800,
          letterSpacing: "-0.5px",
          lineHeight: 1.18,
          color: UI.ink,
          overflowWrap: "anywhere",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {answer}
      </Typography>

      {/* Inline expansion reserves layout space and prevents overlap. */}
      <Box
        className="cfs-metric-preview"
        sx={{
          flexShrink: 0,
          minWidth: 0,
          maxHeight: 0,
          mt: 0,
          p: 0,
          overflow: "hidden",
          opacity: 0,
          visibility: "hidden",
          border: "0 solid transparent",
          borderRadius: "11px",
          bgcolor: "rgba(248,252,249,0.98)",
          transition:
            "max-height 240ms ease, margin-top 220ms ease, opacity 180ms ease, border-color 180ms ease, visibility 180ms ease",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 0.85,
            p: 1.05,
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 24,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: "8px",
              bgcolor: wash,
              color: accent,
            }}
          >
            <Sparkles size={12} />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.5,
                color: UI.ink,
                overflowWrap: "anywhere",
              }}
            >
              {note || question}
            </Typography>

            <Typography
              sx={{
                mt: 0.25,
                fontSize: 11.5,
                color: UI.muted,
                lineHeight: 1.45,
              }}
            >
              {onClick
                ? "Open related workspace"
                : "Current recorded position"}
            </Typography>
          </Box>

          {onClick && (
            <ArrowRight
              size={13}
              color={UI.accent}
              style={{ flexShrink: 0, marginTop: 4 }}
            />
          )}
        </Box>
      </Box>

      {onClick && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mt: "auto",
            pt: 0.8,
          }}
        >
          <ChevronRight
            className="cfs-metric-chevron"
            size={14}
            color={UI.accent}
            style={{
              opacity: 0.42,
              transition: "opacity 180ms ease, transform 180ms ease",
            }}
          />
        </Box>
      )}
    </Box>
  );
}

/* Quick actions expand in normal document flow. */

function QuickAction({
  label,
  sub,
  icon: Icon,
  to,
  featured = false,
}) {
  const navigate = useNavigate();

  return (
    <Box
      component="button"
      type="button"
      onClick={() => navigate(to)}
      className="cfs-interactive cfs-quick-action"
      sx={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        boxSizing: "border-box",
        zIndex: 1,
        width: "100%",
        minWidth: 0,
        minHeight: 75,
        p: 0,
        display: "block",
        textAlign: "left",
        font: "inherit",
        border: `1px solid ${featured ? UI.forest : UI.border}`,
        borderRadius: "13px",
        bgcolor: featured ? UI.forest : "rgba(255,255,255,0.82)",
        color: featured ? "#FFFFFF" : UI.ink,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        cursor: "pointer",
        boxShadow: featured
          ? "0 8px 20px rgba(20,45,36,0.12)"
          : "0 3px 8px rgba(22,39,31,0.025)",
        transition:
          "transform 220ms cubic-bezier(.2,.7,.2,1), box-shadow 220ms ease, border-color 220ms ease, background-color 220ms ease",

        "&::before": {
          content: '""',
          position: "absolute",
          zIndex: -1,
          top: -48,
          right: -35,
          width: 125,
          height: 125,
          borderRadius: "50%",
          background: featured
            ? "radial-gradient(circle, rgba(181,231,204,.3), transparent 68%)"
            : "radial-gradient(circle, rgba(23,107,82,.17), transparent 68%)",
          filter: "blur(18px)",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 220ms ease, transform 220ms ease",
        },

        "&:hover, &:focus-visible": {
          zIndex: 2,
          transform: "translateY(-2px)",
          borderColor: featured
            ? "#47715E"
            : "rgba(23,107,82,0.36)",
          bgcolor: featured ? "#1D4535" : "rgba(255,255,255,0.98)",
          boxShadow: "0 12px 25px rgba(20,45,36,0.1)",
          outline: "none",

          "&::before": {
            opacity: 1,
            transform: "scale(1.12)",
          },

          "& .cfs-action-preview": {
            maxHeight: 115,
            opacity: 1,
            visibility: "visible",
            mt: 0.2,
            py: 1.05,
            borderColor: featured
              ? "rgba(181,231,204,0.25)"
              : "rgba(23,107,82,0.14)",
          },

          "& .cfs-action-chevron": {
            opacity: 1,
            transform: "translateX(2px)",
          },
        },

        "&:active": {
          transform: "translateY(0) scale(0.997)",
        },

        "&:focus-visible": {
          outline: `2px solid ${UI.accent}`,
          outlineOffset: 3,
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 1.15,
          px: 1.35,
          py: 1.2,
        }}
      >
        <Box
          sx={{
            width: 35,
            height: 35,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "10px",
            bgcolor: featured
              ? "rgba(255,255,255,0.11)"
              : UI.accentWash,
            border: featured
              ? "1px solid rgba(255,255,255,0.09)"
              : "1px solid rgba(23,107,82,0.07)",
          }}
        >
          <Icon
            size={16}
            color={featured ? "#FFFFFF" : UI.accent}
            strokeWidth={1.9}
          />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 12.1,
              fontWeight: 780,
              lineHeight: 1.5,
              color: "inherit",
            }}
          >
            {label}
          </Typography>
        </Box>

        <ChevronRight
          className="cfs-action-chevron"
          size={15}
          color={featured ? "rgba(255,255,255,0.85)" : UI.subtle}
          style={{
            opacity: 0.58,
            flexShrink: 0,
            transition: "transform 180ms ease, opacity 180ms ease",
          }}
        />
      </Box>

      {/* This section expands within the button instead of overlaying other cards. */}
      {sub && (
        <Box
          className="cfs-action-preview"
          sx={{
            maxHeight: 0,
            mt: 0,
            px: 1.3,
            py: 0,
            overflow: "hidden",
            opacity: 0,
            visibility: "hidden",
            borderTop: "1px solid transparent",
            transition:
              "max-height 240ms ease, margin-top 220ms ease, padding 220ms ease, opacity 180ms ease, border-color 180ms ease, visibility 180ms ease",
          }}
        >
          <Typography
            sx={{
              fontSize: 11.8,
              fontWeight: 800,
              color: featured ? "#B5E7CC" : UI.accent,
              lineHeight: 1.4,
            }}
          >
            {label}
          </Typography>

          <Typography
            sx={{
              mt: 0.3,
              fontSize: 11.6,
              lineHeight: 1.55,
              color: featured ? "rgba(255,255,255,0.78)" : UI.muted,
              overflowWrap: "anywhere",
            }}
          >
            {sub}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function AlertRow({ alert, onNavigate }) {
  const style = {
    high: {
      dot: UI.negative,
      bg: UI.negativeWash,
      label: "High",
    },
    medium: {
      dot: UI.warning,
      bg: UI.warningWash,
      label: "Medium",
    },
    low: {
      dot: UI.subtle,
      bg: "#F1F5F1",
      label: "Low",
    },
  }[alert.severity] || {
    dot: UI.subtle,
    bg: "#F1F5F1",
    label: "Normal",
  };

  return (
    <Box
      component="button"
      type="button"
      onClick={onNavigate}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.1,
        width: "100%",
        px: 0.7,
        py: 1.2,
        textAlign: "left",
        font: "inherit",
        bgcolor: "transparent",
        border: 0,
        borderBottom: `1px solid ${UI.border}`,
        borderRadius: "8px",
        cursor: "pointer",
        transition: "background-color 180ms ease, transform 180ms ease",
        "&:last-of-type": {
          borderBottom: 0,
        },
        "&:hover": {
          bgcolor: "rgba(233,245,239,0.78)",
          transform: "translateX(2px)",
        },
        "&:focus-visible": {
          outline: `2px solid ${UI.accent}`,
          outlineOffset: 2,
        },
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          mt: 0.7,
          flexShrink: 0,
          borderRadius: "50%",
          bgcolor: style.dot,
          boxShadow: `0 0 0 3px ${style.dot}16`,
        }}
      />

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: 12.2,
            fontWeight: 760,
            lineHeight: 1.5,
            color: UI.ink,
          }}
        >
          {alert.title}
        </Typography>

        <Typography
          sx={{
            mt: 0.2,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: UI.subtle,
          }}
        >
          {alert.actionLabel}
        </Typography>
      </Box>

      <Chip
        label={style.label}
        size="small"
        sx={{
          mt: 0.1,
          height: 22,
          borderRadius: "6px",
          bgcolor: style.bg,
          color: style.dot,
          fontSize: 11.5,
          fontWeight: 800,
          "& .MuiChip-label": {
            px: 0.85,
          },
        }}
      />
    </Box>
  );
}

function InvoiceTable({ invoices, partyMap, today, kind, navigate }) {
  const isSales = kind === "sales";

  if (!invoices.length) {
    return isSales ? (
      <EmptyState
        title="No overdue invoices"
        body="There are no overdue customer invoices with an outstanding balance."
      />
    ) : (
      <EmptyState
        title="No payments due soon"
        body="No outstanding supplier bills are due in the next 14 days."
      />
    );
  }

  const destination = isSales
    ? "/sales-invoices"
    : "/purchase-invoices";

  return (
    <Table
      size="small"
      aria-label={
        isSales
          ? "Overdue sales invoices"
          : "Upcoming supplier payments"
      }
      sx={{
        mt: 0.25,
        "& .MuiTableCell-root": {
          borderBottom: `1px solid ${UI.border}`,
          px: 0.65,
          py: 1.15,
          verticalAlign: "middle",
        },
        "& .MuiTableRow-root:last-child .MuiTableCell-root": {
          borderBottom: 0,
        },
        "& .MuiTableRow-root": {
          transition: "background-color 160ms ease",
        },
        "& .MuiTableRow-root:hover": {
          bgcolor: "rgba(233,245,239,0.62)",
        },
      }}
    >
      <TableBody>
        {invoices.map((inv) => {
          const date = isSales
            ? inv.dueDate
            : inv.plannedPaymentDate;

          const days = isSales
            ? daysBetween(date, today)
            : daysBetween(today, date);

          return (
            <TableRow
              key={inv.id}
              hover
              tabIndex={0}
              onClick={() => navigate(destination)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  navigate(destination);
                }
              }}
              sx={{
                cursor: "pointer",
                "&:focus-visible": {
                  outline: `2px solid ${UI.accent}`,
                  outlineOffset: -2,
                },
              }}
            >
              <TableCell sx={{ width: "62%" }}>
                <Typography
                  sx={{
                    fontSize: 11.8,
                    fontWeight: 780,
                    color: UI.ink,
                    lineHeight: 1.5,
                  }}
                >
                  {inv.number}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.2,
                    fontSize: 11.8,
                    lineHeight: 1.55,
                    color: UI.subtle,
                    overflowWrap: "anywhere",
                  }}
                >
                  {partyMap[inv.partyId]?.name || "—"} · due{" "}
                  {formatShort(date)}
                </Typography>
              </TableCell>

              <TableCell align="right">
                <Typography
                  sx={{
                    fontSize: 11.8,
                    fontWeight: 800,
                    color: isSales ? UI.negative : UI.ink,
                    lineHeight: 1.5,
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatINR(outstandingPaise(inv))}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.2,
                    fontSize: 11.8,
                    color: isSales ? UI.negative : UI.subtle,
                    lineHeight: 1.5,
                  }}
                >
                  {isSales
                    ? `${days}d late`
                    : days <= 0
                      ? "Due today"
                      : `In ${days}d`}
                </Typography>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function DashboardPage() {
  const {
    dataset,
    settings,
    business,
    forecast,
    alerts,
    state,
    dispatch,
    seedSampleData,
    loading: appLoading,
    businessId,
  } = useApp();

  const navigate = useNavigate();
  const today = todayISO();
  const loading = useFakeLoad(businessId);

  const [range, setRange] = useState(
    settings.forecastHorizonDays || 30,
  );
  const [horizonAnchor, setHorizonAnchor] = useState(null);

  const rangedForecast = useMemo(
    () =>
      range === (settings.forecastHorizonDays || 30)
        ? forecast
        : buildForecast(dataset, settings, {
          horizonDays: range,
        }),
    [dataset, settings, forecast, range],
  );

  const shortage = useMemo(
    () => explainShortage(rangedForecast, dataset),
    [rangedForecast, dataset],
  );

  const summary = useMemo(
    () => summarizeDataset(dataset),
    [dataset],
  );

  const breach =
    rangedForecast.firstNegative ||
    rangedForecast.firstReserveBreach;

  const urgentAlerts = useMemo(() => {
    const order = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return alerts
      .filter((alert) => {
        const meta = (dataset?.alertMeta || {})[alert.id];
        return !meta?.read && !meta?.resolved;
      })
      .sort(
        (a, b) =>
          (order[a.severity] ?? 3) -
          (order[b.severity] ?? 3),
      )
      .slice(0, 5);
  }, [alerts, dataset?.alertMeta]);

  const overdueInvoices = useMemo(
    () =>
      dataset.salesInvoices
        .filter(
          (invoice) =>
            !invoice.isDraft &&
            invoice.dueDate < today &&
            outstandingPaise(invoice) > 0,
        )
        .sort(
          (a, b) =>
            outstandingPaise(b) - outstandingPaise(a),
        )
        .slice(0, 3),
    [dataset.salesInvoices, today],
  );

  const upcomingPayments = useMemo(() => {
    const cutoff = new Date(`${today}T12:00:00`);
    cutoff.setDate(cutoff.getDate() + 14);

    const cutoffISO = cutoff.toISOString().slice(0, 10);

    return dataset.purchaseInvoices
      .filter(
        (invoice) =>
          outstandingPaise(invoice) > 0 &&
          invoice.plannedPaymentDate >= today &&
          invoice.plannedPaymentDate <= cutoffISO,
      )
      .sort((a, b) =>
        a.plannedPaymentDate.localeCompare(
          b.plannedPaymentDate,
        ),
      )
      .slice(0, 3);
  }, [dataset.purchaseInvoices, today]);

  const customersMap = Object.fromEntries(
    dataset.customers.map((customer) => [
      customer.id,
      customer,
    ]),
  );

  const suppliersMap = Object.fromEntries(
    dataset.suppliers.map((supplier) => [
      supplier.id,
      supplier,
    ]),
  );

  if (loading) {
    return (
      <Box
        className="page cfs-dashboard"
        sx={{
          minHeight: "75vh",
          display: "grid",
          placeItems: "center",
          bgcolor: UI.page,
          p: 3,
        }}
      >
        <LatticeLoader
          size={52}
          color="#10b981"
          message="Synthesizing Liquidity Vectors..."
          subtext="Calibrating working capital forecasts & financial telemetry"
        />
      </Box>
    );
  }

  const currentCash = formatINR(dataset.currentCashPaise);
  const currentCashNote = `Updated ${formatDisplay(today)}`;

  const currentCashTone =
    dataset.currentCashPaise < settings.minReservePaise
      ? "red"
      : "green";

  const expectedIn = formatINR(rangedForecast.expectedIn);
  const expectedOut = formatINR(rangedForecast.expectedOut);
  const lowestCash = formatINR(rangedForecast.minPoint.close);

  const lowestCashNote =
    `Lowest projected · ${formatDisplay(rangedForecast.minPoint.date)}`;

  const lowestCashTone =
    rangedForecast.minPoint.close < settings.minReservePaise
      ? "red"
      : "green";

  const breachAnswer = breach
    ? (daysBetween(today, breach.date) <= 0
        ? "Breached today"
        : `${daysBetween(today, breach.date)} days`)
    : formatINR(settings?.minReservePaise || 0);

  const breachNote = breach
    ? `${formatDisplay(breach.date)} · ${formatINR(
      rangedForecast.firstNegative
        ? -rangedForecast.firstNegative.close
        : rangedForecast.firstReserveBreach.gap,
    )} below threshold`
    : `Reserve remains above ${formatINR(
      settings?.minReservePaise || 0,
      { compact: true },
    )}`;

  return (
    <Box
      className="page cfs-dashboard"
      sx={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        minWidth: 0,
        pb: 3,
        color: UI.ink,
        bgcolor: UI.page,
        backgroundImage:
          "radial-gradient(ellipse at 12% 0%, rgba(86,157,119,0.15), transparent 32%), radial-gradient(ellipse at 100% 16%, rgba(151,197,163,0.18), transparent 30%), radial-gradient(ellipse at 56% 100%, rgba(210,232,215,0.48), transparent 42%), linear-gradient(180deg,#F8FBF8 0%,#F1F6F1 100%)",
        "& .cfs-card": PANEL_SX,
        "& .MuiButton-root": {
          fontFamily: "inherit",
        },
      }}
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

          ".cfs-dashboard button": {
            WebkitTapHighlightColor: "transparent",
          },

          ".cfs-dashboard::before": {
            content: '""',
            position: "absolute",
            zIndex: -1,
            inset: 0,
            pointerEvents: "none",
            opacity: 0.31,
            backgroundImage:
              "linear-gradient(rgba(23,107,82,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(23,107,82,0.035) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
            maskImage:
              "linear-gradient(to bottom, black 0%, transparent 78%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, transparent 78%)",
          },

          ".cfs-dashboard:has(.cfs-interactive:hover) .cfs-interactive:not(:hover), .cfs-dashboard:has(.cfs-interactive:focus-visible) .cfs-interactive:not(:focus-visible)":
          {
            filter: "blur(0.45px) saturate(0.9)",
            opacity: 0.72,
          },

          ".cfs-dashboard:has(.cfs-metric-card:hover) .cfs-card, .cfs-dashboard:has(.cfs-metric-card:hover) .cfs-quick-action":
          {
            filter: "blur(0.45px)",
            opacity: 0.76,
          },

          ".cfs-dashboard:has(.cfs-metric-card:hover) .cfs-metric-card:hover, .cfs-dashboard:has(.cfs-quick-action:hover) .cfs-quick-action:hover":
          {
            filter: "none",
            opacity: 1,
          },

          ".cfs-dashboard .cfs-card": {
            transition:
              "filter 240ms ease, opacity 240ms ease, transform 240ms ease, box-shadow 240ms ease",
          },

          "@media (prefers-reduced-motion: reduce)": {
            ".cfs-dashboard *, .cfs-dashboard *::before, .cfs-dashboard *::after":
            {
              animationDuration: "0.01ms !important",
              animationIterationCount: "1 !important",
              transitionDuration: "0.01ms !important",
              scrollBehavior: "auto !important",
            },
          },
        }}
      />

      {/* Soft, animated ambient light in the page background. */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          zIndex: -1,
          pointerEvents: "none",
          width: { xs: 240, md: 430 },
          height: { xs: 240, md: 430 },
          top: -170,
          right: { xs: -130, md: -90 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,158,122,0.18) 0%, rgba(74,158,122,0.035) 48%, transparent 72%)",
          filter: "blur(36px)",
          animation: "cfs-breathe 10s ease-in-out infinite",
        }}
      />

      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          zIndex: -1,
          pointerEvents: "none",
          width: { xs: 200, md: 330 },
          height: { xs: 200, md: 330 },
          top: 520,
          left: { xs: -140, md: -110 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(68,190,150,0.11), transparent 70%)",
          filter: "blur(42px)",
        }}
      />

      {/* Branded dashboard header */}
      <Box
        className="cfs-enter"
        sx={{
          position: "relative",
          mb: 2.3,
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
              <Activity size={13} color="#B5E7CC" />
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
              Financial overview
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
            {business?.name || "My Business"}
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
            Cash position and a {range}-day outlook, based on live
            invoices, bills and expenses stored in your Firestore database.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.3, flexWrap: "wrap" }}>

          <Box
            component="button"
            type="button"
            aria-label="Change forecast horizon"
            aria-haspopup="true"
            aria-expanded={Boolean(horizonAnchor)}
            onClick={(event) => setHorizonAnchor(event.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              flexShrink: 0,
              py: 1.05,
              px: 1.4,
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "13px",
              bgcolor: Boolean(horizonAnchor)
                ? "rgba(255,255,255,0.16)"
                : "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "inherit",
              cursor: "pointer",
              textAlign: "left",
              font: "inherit",
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
                width: 34,
                height: 34,
                display: "grid",
                placeItems: "center",
                borderRadius: "10px",
                bgcolor: "rgba(255,255,255,0.11)",
                flexShrink: 0,
              }}
            >
              <CalendarClock size={17} color="#B5E7CC" />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 850,
                    letterSpacing: "0.9px",
                    color: "rgba(239,248,242,0.68)",
                    textTransform: "uppercase",
                  }}
                >
                  Forecast horizon
                </Typography>
                <ChevronDown
                  size={12}
                  color="#B5E7CC"
                  style={{
                    transform: horizonAnchor ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 200ms ease",
                  }}
                />
              </Box>

              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: 13,
                  fontWeight: 780,
                  color: "#FFFFFF",
                }}
              >
                Next {range} days
              </Typography>
            </Box>
          </Box>
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
              border: `1px solid ${UI.border}`,
              bgcolor: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 14px 34px rgba(22,39,31,0.15)",
              "& .MuiMenuItem-root": {
                borderRadius: "9px",
                px: 1.3,
                py: 0.9,
                fontSize: 11.8,
                fontWeight: 700,
                color: UI.ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.2,
                transition: "background-color 150ms ease, color 150ms ease",
                "&:hover": {
                  bgcolor: UI.accentWash,
                  color: UI.accentDeep,
                },
                "&.is-active": {
                  bgcolor: "rgba(23,107,82,0.1)",
                  color: UI.accent,
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
          ].map((item) => (
            <MenuItem
              key={item.days}
              className={range === item.days ? "is-active" : ""}
              onClick={() => {
                setRange(item.days);
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
                <Typography sx={{ fontSize: 11.5, color: UI.muted }}>
                  {item.sub}
                </Typography>
              </Box>
              {range === item.days && (
                <Check size={14} color={UI.accent} strokeWidth={2.5} />
              )}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* Forecast risk warning: minimized, sleek, user-friendly space-saving bar */}
      {shortage && (
        <Box
          className="cfs-enter"
          sx={{
            mb: 1.3,
            px: { xs: 1.2, sm: 1.6 },
            py: { xs: 0.85, sm: 0.95 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: { xs: "wrap", md: "nowrap" },
            gap: 1.2,
            bgcolor: "rgba(255,240,238,0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid #ECD2CD",
            borderLeft: `4px solid ${UI.negative}`,
            borderRadius: "10px",
            animationDelay: "45ms",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                borderRadius: "7px",
                bgcolor: "#F9DAD6",
              }}
            >
              <AlertTriangle size={14} color={UI.negative} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="span"
                sx={{
                  fontSize: 12.8,
                  fontWeight: 830,
                  color: UI.negative,
                  mr: 0.7,
                  display: "inline",
                }}
              >
                Forecast risk: cash may fall below threshold —
              </Typography>

              <Typography
                component="span"
                sx={{
                  fontSize: 12.2,
                  lineHeight: 1.55,
                  color: "#7D3D36",
                  display: "inline",
                }}
              >
                Projected cash may fall{" "}
                <Box component="strong" sx={{ fontWeight: 850 }}>
                  {formatINR(
                    shortage.isNegative
                      ? -shortage.breach.close
                      : rangedForecast.reserve - shortage.breach.close,
                  )}
                </Box>{" "}
                below {shortage.isNegative ? "zero" : "reserve"} on{" "}
                <Box component="strong" sx={{ fontWeight: 850 }}>
                  {formatDisplay(shortage.breach.date)}
                </Box>{" "}
                (in {shortage.daysFromToday}d).
                {shortage.causes[0]
                  ? ` Main outflow: ${shortage.causes[0].label.replace(
                    " (due)",
                    "",
                  )} (${formatINR(shortage.causes[0].amountPaise, {
                    compact: true,
                  })}).`
                  : ""}
              </Typography>
            </Box>
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate("/scenario-lab")}
            endIcon={<ArrowRight size={13} />}
            sx={{
              flexShrink: 0,
              px: 1.25,
              py: 0.45,
              height: 30,
              borderColor: "#D9B8B0",
              color: UI.negative,
              borderRadius: "7px",
              fontSize: 11.8,
              fontWeight: 780,
              textTransform: "none",
              whiteSpace: "nowrap",
              ml: { xs: 0, md: "auto" },
              "&:hover": {
                bgcolor: "rgba(188,61,53,0.06)",
                borderColor: UI.negative,
              },
            }}
          >
            Review scenarios
          </Button>
        </Box>
      )}

      {/* Key metrics */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2,minmax(0,1fr))",
            sm: "repeat(3,minmax(0,1fr))",
            xl: "repeat(5,minmax(0,1fr))",
          },
          gap: 1,
          mb: 1.4,
        }}
      >
        <MetricCard
          index={0}
          question="Cash available now"
          answer={currentCash}
          note={currentCashNote}
          tone={currentCashTone}
          icon={Banknote}
        />

        <MetricCard
          index={1}
          question="Expected balance"
          answer={expectedIn}
          note={`Expected receipts over ${range} days`}
          tone="blue"
          icon={TrendingUp}
          onClick={() => navigate("/sales-invoices")}
        />

        <MetricCard
          index={2}
          question="Expected expense"
          answer={expectedOut}
          note={`Bills and expenses over ${range} days`}
          tone="amber"
          icon={TrendingDown}
          onClick={() => navigate("/purchase-invoices")}
        />

        <MetricCard
          index={3}
          question="Lowest projected cash"
          answer={lowestCash}
          note={lowestCashNote}
          tone={lowestCashTone}
          icon={Wallet}
          onClick={() => navigate("/forecast")}
        />

        <MetricCard
          index={4}
          question="Reserve threshold risk"
          answer={breachAnswer}
          note={breachNote}
          tone={breach ? "red" : "green"}
          icon={breach ? AlertTriangle : CheckCircle2}
          onClick={
            breach
              ? () => navigate("/scenario-lab")
              : undefined
          }
        />
      </Box>

      {/* Forecast chart and alert feed */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            xl: "minmax(0,1.7fr) minmax(300px,0.83fr)",
          },
          alignItems: "stretch",
          gap: 1.8,
          mb: 1.9,
        }}
      >
        <Box
          className="cfs-card drift-wall cfs-enter"
          sx={{ animationDelay: "90ms" }}
        >
          <PanelHeading
            title="Cash-flow forecast"
            subtitle="Recorded cash, estimated future balance and reserve threshold."
            action={
              <Button
                size="small"
                onClick={() => navigate("/forecast")}
                endIcon={<ChevronRight size={14} />}
                sx={LINK_SX}
              >
                Full forecast
              </Button>
            }
            mb={1.5}
          />

          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
              mb: 1.25,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: UI.accent,
                }}
              />

              <Typography
                sx={{
                  fontSize: 11.8,
                  fontWeight: 680,
                  color: UI.muted,
                }}
              >
                Forecast period
              </Typography>
            </Box>

            <Tooltip title="Choose how far ahead to estimate your cash position">
              <ToggleButtonGroup
                exclusive
                size="small"
                value={range}
                onChange={(event, value) => value && setRange(value)}
                aria-label="Forecast period"
                sx={{
                  bgcolor: "rgba(242,247,243,0.95)",
                  p: 0.35,
                  borderRadius: "9px",
                  border: `1px solid ${UI.border}`,
                  "& .MuiToggleButtonGroup-grouped": {
                    border: 0,
                    borderRadius: "7px !important",
                    mx: 0.12,
                  },
                  "& .MuiToggleButton-root": {
                    px: { xs: 0.9, sm: 1.2 },
                    py: 0.5,
                    color: UI.muted,
                    fontSize: 11.8,
                    fontWeight: 800,
                    textTransform: "none",
                    "&.Mui-selected": {
                      bgcolor: "#FFFFFF",
                      color: UI.accent,
                      boxShadow: "0 2px 6px rgba(22,39,31,0.08)",
                    },
                    "&.Mui-selected:hover": {
                      bgcolor: "#FFFFFF",
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${UI.accent}`,
                      outlineOffset: 2,
                    },
                  },
                }}
              >
                {[7, 30, 60, 90].map((days) => (
                  <ToggleButton key={days} value={days}>
                    {days}d
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Tooltip>
          </Box>

          <Box
            sx={{
              minWidth: 0,
              width: "100%",
              overflow: "hidden",
              borderRadius: "10px",
            }}
          >
            <CashFlowChart
              forecast={rangedForecast}
              showReserve
              height={290}
            />
          </Box>

          <Box
            sx={{
              mt: 1.1,
              pt: 1.5,
              borderTop: `1px solid ${UI.border}`,
              display: "flex",
              alignItems: { xs: "flex-start", md: "center" },
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1.2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              {[
                { color: UI.accent, label: "Recorded" },
                { color: "#607269", label: "Forecast estimate" },
                { color: UI.negative, label: "Below reserve" },
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

                  <Typography
                    sx={{ fontSize: 11.8, color: UI.muted }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography
              sx={{
                fontSize: 12,
                color: UI.muted,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Lowest point:{" "}
              <Box
                component="strong"
                sx={{
                  color:
                    rangedForecast.minPoint.close < settings.minReservePaise
                      ? UI.negative
                      : UI.ink,
                  fontWeight: 850,
                }}
              >
                {formatINR(rangedForecast.minPoint.close, {
                  compact: true,
                })}
              </Box>{" "}
              · {formatDisplay(rangedForecast.minPoint.date)}
            </Typography>
          </Box>
        </Box>

        {/* Alerts */}
        <Box
          className="cfs-card drift-wall cfs-enter"
          sx={{ animationDelay: "140ms", height: "100%" }}
        >
          <PanelHeading
            title="Needs your attention"
            subtitle={`${urgentAlerts.length} unread alert${urgentAlerts.length === 1 ? "" : "s"
              }, prioritised by severity`}
            action={
              <Button
                size="small"
                onClick={() => navigate("/alerts")}
                endIcon={<ChevronRight size={14} />}
                sx={LINK_SX}
              >
                All alerts
              </Button>
            }
            mb={1.1}
          />

          {urgentAlerts.length === 0 ? (
            <Box sx={{ py: 2 }}>
              <EmptyState
                title="No open alerts"
                body="There are no unread alerts at the moment. New issues will appear here when detected."
              />
            </Box>
          ) : (
            <Box>
              {urgentAlerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onNavigate={() => {
                    dispatch({
                      type: "ALERT_META",
                      alertId: alert.id,
                      read: true,
                      resolved: false,
                    });

                    navigate(alert.link);
                  }}
                />
              ))}
            </Box>
          )}

          <Box
            sx={{
              mt: 1.7,
              p: 1.25,
              display: "flex",
              alignItems: "flex-start",
              gap: 0.8,
              borderRadius: "10px",
              bgcolor: "rgba(233,245,239,0.82)",
              border: "1px solid rgba(23,107,82,0.11)",
            }}
          >
            <Sparkles
              size={13}
              color={UI.accent}
              style={{ flexShrink: 0, marginTop: 2 }}
            />

            <Typography
              sx={{
                fontSize: 11.8,
                lineHeight: 1.6,
                color: UI.muted,
              }}
            >
              Prioritise high-severity items, then compare next steps in the
              forecast.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Quick actions */}
      <Box
        className="cfs-card drift-wall cfs-enter"
        sx={{ mb: 1.9, animationDelay: "180ms" }}
      >
        <PanelHeading
          title="Quick actions"
          subtitle="Common tasks, organised in one place."
          mb={1.4}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0,1fr)",
              sm: "repeat(2,minmax(0,1fr))",
              xl: "repeat(4,minmax(0,1fr))",
            },
            gap: 1,
          }}
        >
          <QuickAction
            label="Check a new deal"
            sub="Review the effect on cash before committing"
            icon={Scale}
            to="/deal-checker"
            featured
          />

          <QuickAction
            label="Manage customers"
            sub="Customer records and payment history"
            icon={Users}
            to="/customers"
          />

          <QuickAction
            label="Import bank statement"
            sub="Upload a CSV to update transactions"
            icon={Banknote}
            to="/bank-invoices"
          />

          <QuickAction
            label="Manage invoices"
            sub="Review sales and purchase invoices"
            icon={FileText}
            to="/sales-invoices"
          />
        </Box>
      </Box>

      {/* Receivables and payables */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            lg: "minmax(0,1fr) minmax(0,1fr)",
          },
          gap: 1.8,
          mb: 1.9,
          alignItems: "stretch",
        }}
      >
        <Box
          className="cfs-card cfs-enter"
          sx={{ height: "100%", animationDelay: "215ms" }}
        >
          <PanelHeading
            title="Overdue invoices"
            subtitle={`${summary.overdueSalesCount} invoice${summary.overdueSalesCount === 1 ? "" : "s"
              } · ${formatINR(summary.overdueAmount, {
                compact: true,
              })} outstanding`}
            action={
              <Button
                size="small"
                onClick={() => navigate("/sales-invoices")}
                endIcon={<ChevronRight size={14} />}
                sx={LINK_SX}
              >
                View all
              </Button>
            }
          />

          <InvoiceTable
            invoices={overdueInvoices}
            partyMap={customersMap}
            today={today}
            kind="sales"
            navigate={navigate}
          />
        </Box>

        <Box
          className="cfs-card cfs-enter"
          sx={{ height: "100%", animationDelay: "255ms" }}
        >
          <PanelHeading
            title="Upcoming payments"
            subtitle="Outstanding supplier bills due within 14 days"
            action={
              <Button
                size="small"
                onClick={() => navigate("/purchase-invoices")}
                endIcon={<ChevronRight size={14} />}
                sx={LINK_SX}
              >
                View all
              </Button>
            }
          />

          <InvoiceTable
            invoices={upcomingPayments}
            partyMap={suppliersMap}
            today={today}
            kind="purchase"
            navigate={navigate}
          />
        </Box>
      </Box>

      {/* Recommended next step if the reserve threshold will be breached */}
      {breach && (
        <Box
          className="cfs-enter"
          sx={{
            mb: 1.9,
            p: { xs: 1.7, sm: 2.2 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
            bgcolor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: `1px solid ${UI.border}`,
            borderRadius: "14px",
            boxShadow: "0 4px 16px rgba(22,39,31,0.03)",
            animationDelay: "300ms",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.2,
              flex: 1,
              minWidth: 230,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                borderRadius: "10px",
                bgcolor: UI.warningWash,
              }}
            >
              <CalendarClock size={17} color={UI.warning} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 820,
                  color: UI.ink,
                }}
              >
                Recommended next step
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: UI.muted,
                }}
              >
                A cash threshold breach is forecast. Compare adjustments in
                Scenario Lab, such as requesting an advance, rescheduling a
                payment or reducing an expense.
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            onClick={() => navigate("/scenario-lab")}
            endIcon={<ArrowRight size={15} />}
            sx={{
              minHeight: 40,
              px: 1.7,
              bgcolor: UI.accent,
              color: "#FFFFFF",
              borderRadius: "9px",
              fontSize: 12,
              fontWeight: 780,
              textTransform: "none",
              boxShadow: "0 4px 10px rgba(23,107,82,0.16)",
              whiteSpace: "nowrap",
              transition:
                "transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease",
              "&:hover": {
                bgcolor: UI.accentDeep,
                transform: "translateY(-1px)",
                boxShadow: "0 7px 16px rgba(23,107,82,0.24)",
              },
              "&:focus-visible": {
                outline: `2px solid ${UI.accent}`,
                outlineOffset: 3,
              },
            }}
          >
            Open Scenario Lab
          </Button>
        </Box>
      )}

      {/* Transparent forecasting disclaimer */}
      <Box
        className="cfs-enter"
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          p: 1.5,
          bgcolor: "rgba(242,247,243,0.88)",
          border: `1px solid ${UI.border}`,
          borderRadius: "12px",
          animationDelay: "340ms",
        }}
      >
        <Info
          size={14}
          color={UI.subtle}
          style={{ marginTop: 2, flexShrink: 0 }}
        />

        <Typography
          sx={{
            fontSize: 11.8,
            color: UI.muted,
            lineHeight: 1.7,
          }}
        >
          <Box
            component="strong"
            sx={{ color: UI.ink, fontWeight: 850 }}
          >
            Demo data and methodology.{" "}
          </Box>
          Figures are computed from synthetic business data. Forecasts are
          estimates based on recorded invoices and expenses; they are not live
          bank balances or machine-learning predictions. Amounts are shown in
          Indian rupees (INR).
        </Typography>
      </Box>
    </Box>
  );
}
