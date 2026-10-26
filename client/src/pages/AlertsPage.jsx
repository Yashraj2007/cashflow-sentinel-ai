import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Tooltip from "@mui/material/Tooltip";
import GlobalStyles from "@mui/material/GlobalStyles";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Info,
  Mail,
  RotateCcw,
  Sparkles,
  PhoneCall,
  PhoneForwarded,
  Zap,
  Bot,
  Send,
  Radio,
} from "lucide-react";

import { useApp } from "../context/AppContext.jsx";
import { EmptyState, StatusBadge } from "../components/common.jsx";
import StatusMark from "../components/common/StatusMark.jsx";
import ReminderComposer from "../components/ReminderComposer.jsx";
import { outstandingPaise } from "../utils/calculations.js";
import { formatDisplay } from "../utils/finance.js";

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

const SEVERITY_TONE = { high: "red", medium: "amber", low: "grey" };

const SEVERITY = {
  high: { color: C.negative, bg: C.negativeWash, border: "#F0D3CF" },
  medium: { color: C.warning, bg: C.warningWash, border: "#EDE0BE" },
  low: { color: C.subtle, bg: "#F1F5F1", border: C.border },
};

const REMINDER_STATUS = {
  "demo-scheduled": ["Scheduled · Demo", "navy"],
  draft: ["Draft", "grey"],
  sent: ["Sent by connected service", "green"],
  failed: ["Failed", "red"],
  cancelled: ["Cancelled", "grey"],
};

const panelSx = {
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

const smallButtonSx = {
  borderRadius: "9px",
  px: 1.2,
  py: 0.65,
  fontSize: 12,
  fontWeight: 750,
  textTransform: "none",
  whiteSpace: "nowrap",
  "&:focus-visible": {
    outline: `2px solid ${C.accent}`,
    outlineOffset: 2,
  },
};

function SectionHeading({ title, subtitle, icon: Icon, action }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.2,
        mb: 1.5,
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
            <Icon size={16} color={C.accent} strokeWidth={1.9} />
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
                fontSize: 11.8,
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

function AlertCard({
  alert,
  meta,
  expanded,
  onToggle,
  onNavigate,
  onRead,
  onResolve,
  onReopen,
}) {
  const severity = SEVERITY[alert.severity] || SEVERITY.low;
  const resolved = Boolean(meta.resolved);
  const read = Boolean(meta.read);

  return (
    <Box
      className="drift-wall"
      sx={{
        mb: 1,
        minWidth: 0,
        overflow: "hidden",
        border: `1px solid ${
          expanded ? "rgba(23,107,82,0.24)" : severity.border
        }`,
        borderLeft: `3px solid ${
          resolved ? "#B8C8BD" : severity.color
        }`,
        borderRadius: "13px",
        bgcolor: expanded
          ? "#FFFFFF"
          : read || resolved
            ? "#F9FBF9"
            : "#FFFFFF",
        boxShadow: expanded
          ? "0 7px 20px rgba(22,39,31,0.055)"
          : "0 2px 5px rgba(22,39,31,0.015)",
        transition:
          "border-color 200ms ease, box-shadow 220ms ease, background-color 200ms ease",
        "&:hover": {
          borderColor: "rgba(23,107,82,0.24)",
          boxShadow: "0 6px 18px rgba(22,39,31,0.045)",
        },
      }}
    >
      <Box
        component="button"
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        sx={{
          width: "100%",
          minWidth: 0,
          display: "block",
          p: { xs: 1.35, sm: 1.55 },
          textAlign: "left",
          font: "inherit",
          bgcolor: "transparent",
          color: C.ink,
          border: 0,
          cursor: "pointer",
          "&:focus-visible": {
            outline: `2px solid ${C.accent}`,
            outlineOffset: -3,
            borderRadius: "11px",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 0.8,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.65,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            <StatusBadge
              tone={SEVERITY_TONE[alert.severity] || "grey"}
              label={alert.severity || "low"}
              dot={false}
            />

            <Chip
              size="small"
              variant="outlined"
              label={(alert.type || "alert").replace(/-/g, " ")}
              sx={{
                height: 21,
                maxWidth: 170,
                borderRadius: "6px",
                borderColor: C.border,
                color: C.muted,
                fontSize: 11.5,
                textTransform: "capitalize",
                "& .MuiChip-label": {
                  px: 0.8,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />

            {!read && !resolved && (
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: C.accent,
                }}
              />
            )}
          </Box>

          <Typography
            sx={{
              flexShrink: 0,
              fontSize: 11.8,
              lineHeight: 1.5,
              color: C.subtle,
              whiteSpace: "nowrap",
            }}
          >
            {formatDisplay(alert.date)}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              minWidth: 0,
              flex: 1,
              fontSize: 12.3,
              fontWeight: 780,
              lineHeight: 1.55,
              letterSpacing: "-0.1px",
              color: C.ink,
              overflowWrap: "anywhere",
            }}
          >
            {alert.title}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.65,
              flexShrink: 0,
            }}
          >
            <StatusMark
              channel="automation"
              status={alert.severity === "high" ? "auto-escalated" : "auto-triggered"}
              size="small"
              tooltip={alert.severity === "high" ? "Auto-escalated to Sentinel watchlist" : "AI telemetry automated check"}
            />

            {resolved ? (
              <Chip
                size="small"
                label="Resolved"
                sx={{
                  height: 21,
                  bgcolor: C.positiveWash,
                  color: C.positive,
                  fontSize: 11.5,
                  fontWeight: 750,
                  "& .MuiChip-label": { px: 0.8 },
                }}
              />
            ) : !read ? (
              <Chip
                size="small"
                label="New"
                sx={{
                  height: 20,
                  bgcolor: C.accentWash,
                  color: C.accent,
                  fontSize: 11.5,
                  fontWeight: 800,
                  "& .MuiChip-label": { px: 0.8 },
                }}
              />
            ) : null}

            <ChevronDown
              size={15}
              color={C.subtle}
              style={{
                flexShrink: 0,
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 220ms ease",
              }}
            />
          </Box>
        </Box>

        <Typography
          sx={{
            mt: 0.45,
            fontSize: 11.8,
            lineHeight: 1.5,
            color: C.subtle,
          }}
        >
          {expanded ? "Hide details" : "View details and recommended action"}
        </Typography>
      </Box>

      {expanded && (
        <Box
          sx={{
            p: { xs: 1.35, sm: 1.55 },
            pt: 1.25,
            borderTop: `1px solid ${C.border}`,
            animation: "cfs-alert-detail-in 180ms ease both",
          }}
        >
          <Box
            sx={{
              p: 1.2,
              borderRadius: "10px",
              bgcolor: "#F6F9F6",
              border: `1px solid ${C.border}`,
            }}
          >
            <Typography
              sx={{
                mb: 0.5,
                fontSize: 11.5,
                fontWeight: 850,
                letterSpacing: "0.7px",
                color: C.subtle,
                textTransform: "uppercase",
              }}
            >
              Alert details
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                lineHeight: 1.75,
                color: C.muted,
                overflowWrap: "anywhere",
                whiteSpace: "pre-wrap",
              }}
            >
              {alert.body}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0.8,
              mt: 1.25,
            }}
          >
            <Button
              size="small"
              variant="contained"
              onClick={onNavigate}
              endIcon={<ArrowRight size={13} />}
              sx={{
                ...smallButtonSx,
                bgcolor: C.accent,
                boxShadow: "0 3px 8px rgba(23,107,82,0.13)",
                "&:hover": {
                  bgcolor: C.accentDeep,
                  transform: "translateY(-1px)",
                  boxShadow: "0 6px 13px rgba(23,107,82,0.18)",
                },
              }}
            >
              {alert.actionLabel || "View action"}
            </Button>

            {!read && !resolved && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Check size={13} />}
                onClick={onRead}
                sx={{
                  ...smallButtonSx,
                  color: C.muted,
                  borderColor: C.border,
                  "&:hover": {
                    bgcolor: C.accentWash,
                    borderColor: "rgba(23,107,82,0.25)",
                  },
                }}
              >
                Mark read
              </Button>
            )}

            {!resolved ? (
              <Button
                size="small"
                variant="text"
                startIcon={<CheckCircle2 size={13} />}
                onClick={onResolve}
                sx={{
                  ...smallButtonSx,
                  color: C.positive,
                  "&:hover": { bgcolor: C.positiveWash },
                }}
              >
                Resolve
              </Button>
            ) : (
              <Button
                size="small"
                variant="text"
                startIcon={<RotateCcw size={13} />}
                onClick={onReopen}
                sx={{
                  ...smallButtonSx,
                  color: C.muted,
                  "&:hover": { bgcolor: "#F1F5F1" },
                }}
              >
                Reopen
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function ReminderHistory({ reminders, dataset, dispatch, toast }) {
  const [showLegend, setShowLegend] = useState(false);
  const [channelFilter, setChannelFilter] = useState("all");

  const emailCount = reminders.filter((r) => (r.channel || "email") === "email").length;
  const callCount = reminders.filter((r) => r.channel === "call").length;
  const autoCount = reminders.filter((r) => r.channel === "automation").length;

  const filteredReminders = useMemo(() => {
    if (channelFilter === "all") return reminders;
    return reminders.filter((r) => (r.channel || "email") === channelFilter);
  }, [reminders, channelFilter]);

  if (reminders.length === 0) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <EmptyState
          title="No reminders yet"
          body="Draft a reminder for an open invoice. Reminders are stored locally in this demo; no email is sent without a connected provider."
        />
      </Box>
    );
  }

  return (
    <>
      {/* Channel selection & filter bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
          px: { xs: 1.5, sm: 2 },
          pt: 1,
          pb: 0.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All (${reminders.length})` },
            { id: "email", label: `Emails (${emailCount})`, icon: Mail },
            { id: "call", label: `Calls (${callCount})`, icon: PhoneCall },
            { id: "automation", label: `Automations (${autoCount})`, icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = channelFilter === tab.id;
            return (
              <Chip
                key={tab.id}
                size="small"
                icon={Icon ? <Icon size={12} /> : undefined}
                label={tab.label}
                onClick={() => setChannelFilter(tab.id)}
                sx={{
                  height: 25,
                  fontSize: 11.8,
                  fontWeight: active ? 800 : 600,
                  bgcolor: active ? "rgba(23,107,82,0.14)" : "transparent",
                  color: active ? C.accent : C.muted,
                  border: `1px solid ${active ? "rgba(23,107,82,0.3)" : C.border}`,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  "&:hover": {
                    bgcolor: "rgba(23,107,82,0.08)",
                  },
                }}
              />
            );
          })}
        </Box>

        <Button
          size="small"
          onClick={() => setShowLegend((value) => !value)}
          startIcon={<Info size={13} />}
          sx={{ ...smallButtonSx, px: 0.8, color: C.muted }}
        >
          {showLegend ? "Hide status guide" : "Status guide"}
        </Button>
      </Box>

      {showLegend && (
        <Box
          sx={{
            m: { xs: 1.5, sm: 2 },
            mt: 0.5,
            p: 1.4,
            borderRadius: "11px",
            bgcolor: "#F5F9F5",
            border: `1px solid ${C.border}`,
          }}
        >
          <Typography sx={{ fontSize: 11.8, lineHeight: 1.75, color: C.muted }}>
            <Box component="strong" sx={{ color: C.ink }}>Email Marks:</Box> Delivered, Queued, or Bounced.{" "}
            <Box component="strong" sx={{ color: C.ink }}>Call Marks:</Box> Scheduled, In-Progress, or Completed.{" "}
            <Box component="strong" sx={{ color: C.ink }}>Automation Marks:</Box> Auto-Escalated or Rule-Fired workflow actions.
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          mt: 0.8,
          width: "100%",
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
          aria-label="Payment reminder history"
          sx={{
            width: "100%",
            minWidth: 640,
            "& .MuiTableCell-root": {
              borderBottom: `1px solid ${C.border}`,
              px: 1.25,
              py: 1.15,
              verticalAlign: "middle",
            },
            "& .MuiTableHead-root .MuiTableCell-root": {
              bgcolor: "#F6F9F6",
              color: C.subtle,
              fontSize: 11.5,
              fontWeight: 850,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            },
            "& .MuiTableBody-root .MuiTableRow-root": {
              transition: "background-color 160ms ease",
            },
            "& .MuiTableBody-root .MuiTableRow-root:hover": {
              bgcolor: "rgba(233,245,239,0.7)",
            },
            "& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root": {
              borderBottom: 0,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Channel & Action</TableCell>
              <TableCell>Party / Invoice</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Status Mark</TableCell>
              <TableCell align="right">Controls</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredReminders.map((reminder) => {
              const invoice = dataset.salesInvoices.find(
                (item) => item.id === reminder.invoiceId,
              );
              const customer = invoice
                ? dataset.customers.find((c) => c.id === invoice.partyId)
                : null;

              const isPending =
                reminder.status === "demo-scheduled" ||
                reminder.status === "queued" ||
                reminder.status === "scheduled";

              const handleExecuteNow = () => {
                const nextStatus =
                  reminder.channel === "call" ? "call-completed" : "delivered";
                dispatch({
                  type: "UPDATE_REMINDER",
                  id: reminder.id,
                  patch: {
                    status: nextStatus,
                    history: [
                      {
                        date: "Today",
                        event:
                          reminder.channel === "call"
                            ? "Voice agent completed call successfully."
                            : "Email delivered via live SMTP gateway.",
                      },
                      ...(reminder.history || []),
                    ],
                  },
                });
                toast(
                  reminder.channel === "call"
                    ? "Voice call simulated & completed"
                    : "Email dispatch confirmed",
                );
              };

              return (
                <TableRow key={reminder.id} hover>
                  <TableCell sx={{ minWidth: 160, maxWidth: 220 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: "7px",
                          display: "grid",
                          placeItems: "center",
                          bgcolor:
                            reminder.channel === "call"
                              ? "rgba(139,92,246,0.12)"
                              : reminder.channel === "automation"
                              ? "rgba(244,63,94,0.12)"
                              : "rgba(16,185,129,0.12)",
                          color:
                            reminder.channel === "call"
                              ? "#8b5cf6"
                              : reminder.channel === "automation"
                              ? "#f43f5e"
                              : "#10b981",
                          flexShrink: 0,
                        }}
                      >
                        {reminder.channel === "call" ? (
                          <PhoneCall size={13} />
                        ) : reminder.channel === "automation" ? (
                          <Zap size={13} />
                        ) : (
                          <Mail size={13} />
                        )}
                      </Box>
                      <Tooltip title={reminder.subject || "No subject"} placement="top">
                        <Typography
                          sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: C.ink,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 180,
                          }}
                        >
                          {reminder.subject || "Untitled Reminder"}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ minWidth: 120 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.ink }}>
                      {invoice ? invoice.number : "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap" }}>
                      {customer ? customer.name : reminder.recipient || "—"}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ minWidth: 105 }}>
                    <Typography
                      sx={{
                        fontSize: 11.8,
                        color: C.ink,
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatDisplay(reminder.scheduledDate)}
                    </Typography>
                    {reminder.scheduledTime && (
                      <Typography sx={{ mt: 0.2, fontSize: 11.5, color: C.subtle }}>
                        {reminder.scheduledTime}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Rich Status Mark for Automation, Email & Call */}
                  <TableCell sx={{ minWidth: 155 }}>
                    <StatusMark
                      channel={reminder.channel || "email"}
                      status={reminder.status}
                      timestamp={reminder.scheduledTime}
                      tooltip={reminder.history?.[0]?.event}
                    />
                  </TableCell>

                  <TableCell align="right" sx={{ minWidth: 100 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                      {isPending && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={handleExecuteNow}
                          sx={{
                            ...smallButtonSx,
                            px: 0.8,
                            py: 0.3,
                            fontSize: 11.8,
                            color: C.accent,
                            borderColor: "rgba(23,107,82,0.3)",
                            "&:hover": { bgcolor: "rgba(23,107,82,0.08)" },
                          }}
                        >
                          Run
                        </Button>
                      )}
                      {(isPending || reminder.status === "draft") && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            dispatch({
                              type: "CANCEL_REMINDER",
                              id: reminder.id,
                            });
                            toast("Reminder cancelled", "info");
                          }}
                          sx={{
                            minWidth: 0,
                            px: 0.7,
                            py: 0.3,
                            color: C.negative,
                            borderRadius: "6px",
                            fontSize: 11.8,
                            fontWeight: 700,
                            textTransform: "none",
                            "&:hover": { bgcolor: C.negativeWash },
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0.85,
          m: { xs: 1.5, sm: 2 },
          mt: 1.25,
          p: 1.2,
          borderRadius: "10px",
          bgcolor: "rgba(233,245,239,0.8)",
          border: "1px solid rgba(23,107,82,0.1)",
        }}
      >
        <Info size={13} color={C.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <Typography sx={{ fontSize: 11.8, color: C.muted, lineHeight: 1.65 }}>
          Live status marks display telemetry for outgoing AWS SES emails, Twilio voice agents, and rule-based escalations.
        </Typography>
      </Box>
    </>
  );
}

export default function AlertsPage() {
  const { alerts, state, dispatch, dataset, toast } = useApp();
  const navigate = useNavigate();
  const alertMeta = dataset?.alertMeta || {};

  const [tab, setTab] = useState(0);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState(null);

  const reminders = dataset.reminders || [];

  const openInvoiceCount = useMemo(
    () =>
      dataset.salesInvoices.filter(
        (invoice) => outstandingPaise(invoice) > 0,
      ).length,
    [dataset.salesInvoices],
  );

  const unreadCount = useMemo(
    () =>
      alerts.filter((alert) => {
        const meta = alertMeta[alert.id] || {};
        return !meta.read && !meta.resolved;
      }).length,
    [alerts, alertMeta],
  );

  const resolvedCount = useMemo(
    () =>
      alerts.filter((alert) => Boolean(alertMeta[alert.id]?.resolved)).length,
    [alerts, alertMeta],
  );

  const visible = useMemo(() => {
    if (tab === 1) {
      return alerts.filter((alert) => {
        const meta = alertMeta[alert.id] || {};
        return !meta.read && !meta.resolved;
      });
    }

    if (tab === 2) {
      return alerts.filter((alert) => Boolean(alertMeta[alert.id]?.resolved));
    }

    return alerts;
  }, [alerts, tab, alertMeta]);

  const setStatus = (alertId, patch) => {
    const current = alertMeta[alertId] || {
      read: false,
      resolved: false,
    };

    dispatch({
      type: "ALERT_META",
      alertId,
      read: patch.read !== undefined ? patch.read : current.read,
      resolved:
        patch.resolved !== undefined ? patch.resolved : current.resolved,
    });
  };

  const markAllRead = () => {
    alerts.forEach((alert) => {
      const meta = alertMeta[alert.id] || {};
      if (!meta.read && !meta.resolved) {
        setStatus(alert.id, { read: true });
      }
    });
  };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="page cfs-alerts-page"
      sx={{
        position: "relative",
        isolation: "isolate",
        minWidth: 0,
        pb: 3,
        overflow: "hidden",
        color: C.ink,
        bgcolor: C.page,
        backgroundImage:
          "radial-gradient(ellipse at 10% 0%, rgba(86,157,119,0.15), transparent 32%), radial-gradient(ellipse at 100% 15%, rgba(151,197,163,0.16), transparent 31%), linear-gradient(180deg,#F8FBF8 0%,#F1F6F1 100%)",
      }}
    >
      <GlobalStyles
        styles={{
          "@keyframes cfs-alert-enter": {
            "0%": { opacity: 0, transform: "translateY(9px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
          "@keyframes cfs-alert-glow": {
            "0%,100%": { opacity: 0.4, transform: "scale(0.98)" },
            "50%": { opacity: 0.7, transform: "scale(1.04)" },
          },
          "@keyframes cfs-alert-detail-in": {
            "0%": { opacity: 0, transform: "translateY(-3px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
          ".cfs-alerts-page .cfs-enter": {
            animation: "cfs-alert-enter 480ms cubic-bezier(.2,.7,.2,1) both",
          },
          ".cfs-alerts-page button": {
            WebkitTapHighlightColor: "transparent",
          },
          "@media (prefers-reduced-motion: reduce)": {
            ".cfs-alerts-page *, .cfs-alerts-page *::before, .cfs-alerts-page *::after": {
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
            "radial-gradient(circle, rgba(74,158,122,0.19), rgba(74,158,122,0.03) 48%, transparent 72%)",
          filter: "blur(37px)",
          animation: "cfs-alert-glow 10s ease-in-out infinite",
        }}
      />

      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          zIndex: -1,
          top: 500,
          left: -140,
          width: 300,
          height: 300,
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(68,190,150,0.12), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Page header */}
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.9, mb: 1 }}>
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
              <Bell size={14} color="#B5E7CC" />
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
              Financial intelligence
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
            Alerts & reminders
          </Typography>

          <Typography
            sx={{
              mt: 0.8,
              maxWidth: 610,
              fontSize: 11.7,
              lineHeight: 1.75,
              color: "rgba(239,248,242,0.76)",
            }}
          >
            Review financial risks, track invoice follow-ups and manage reminder
            history in one place.
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mt: 1.35 }}>
            <Chip
              icon={<Bell size={12} />}
              label={`${unreadCount} unread`}
              sx={{
                height: 26,
                bgcolor: "rgba(255,255,255,0.09)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: 11.8,
                fontWeight: 750,
                "& .MuiChip-icon": { color: "#B5E7CC", ml: 0.8 },
              }}
            />

            <Chip
              icon={<CheckCircle2 size={12} />}
              label={`${resolvedCount} resolved`}
              sx={{
                height: 26,
                bgcolor: "rgba(255,255,255,0.09)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: 11.8,
                fontWeight: 750,
                "& .MuiChip-icon": { color: "#B5E7CC", ml: 0.8 },
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: { xs: "stretch", md: "flex-end" },
            gap: 0.8,
            flexShrink: 0,
            width: { xs: "100%", md: "auto" },
          }}
        >
          <Button
            variant="contained"
            onClick={() => setReminderOpen(true)}
            disabled={openInvoiceCount === 0}
            startIcon={<Mail size={15} />}
            sx={{
              ...smallButtonSx,
              minHeight: 43,
              px: 1.7,
              bgcolor: "#B5E7CC",
              color: C.forest,
              boxShadow: "0 7px 18px rgba(0,0,0,0.12)",
              "&:hover": {
                bgcolor: "#D0F0DD",
                transform: "translateY(-1px)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
              },
              "&.Mui-disabled": {
                bgcolor: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.42)",
              },
            }}
          >
            New email reminder
          </Button>

          <Typography
            sx={{
              fontSize: 11.5,
              lineHeight: 1.5,
              color: "rgba(239,248,242,0.67)",
              textAlign: { xs: "left", md: "right" },
            }}
          >
            {openInvoiceCount} open invoice{openInvoiceCount === 1 ? "" : "s"} available
          </Typography>
        </Box>
      </Box>

      {/* Inbox and reminder history: matched height to prevent infinite stretching */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            xl: "minmax(0,1.04fr) minmax(0,0.96fr)",
          },
          alignItems: "stretch",
          gap: 1.8,
        }}
      >
        {/* Alert inbox */}
        <Box
          className="cfs-enter drift-wall"
          sx={{
            ...panelSx,
            animationDelay: "80ms",
            display: "flex",
            flexDirection: "column",
            height: { xs: "auto", xl: 580 },
            maxHeight: { xs: "none", xl: 580 },
          }}
        >
          <Box sx={{ p: { xs: 1.6, sm: 2 }, pb: 1.1, flexShrink: 0 }}>
            <SectionHeading
              title="Alert inbox"
              subtitle="Expand an alert to see its details and actions."
              icon={Activity}
              action={
                <Tooltip title="Alerts use the state supplied by the application">
                  <Box
                    component="span"
                    tabIndex={0}
                    aria-label="Alert list information"
                    sx={{
                      mb: 1.2,
                      display: "grid",
                      placeItems: "center",
                      width: 25,
                      height: 25,
                      flexShrink: 0,
                      borderRadius: "8px",
                      color: C.subtle,
                      cursor: "help",
                      "&:hover": {
                        bgcolor: C.accentWash,
                        color: C.accent,
                      },
                    }}
                  >
                    <Info size={14} />
                  </Box>
                </Tooltip>
              }
            />
          </Box>

          <Tabs
            value={tab}
            onChange={(event, value) => {
              setTab(value);
              setExpandedAlertId(null);
            }}
            variant="fullWidth"
            aria-label="Filter alerts"
            sx={{
              minHeight: 45,
              px: 1.2,
              flexShrink: 0,
              borderBottom: `1px solid ${C.border}`,
              bgcolor: "rgba(245,249,245,0.78)",
              "& .MuiTabs-indicator": {
                height: 2.5,
                borderRadius: "3px 3px 0 0",
                bgcolor: C.accent,
              },
              "& .MuiTab-root": {
                minHeight: 45,
                px: 1,
                color: C.muted,
                fontSize: 11.8,
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
            <Tab label={`All · ${alerts.length}`} />
            <Tab label={`Unread · ${unreadCount}`} />
            <Tab label={`Resolved · ${resolvedCount}`} />
          </Tabs>

          <Box
            sx={{
              p: { xs: 1.2, sm: 1.5 },
              minWidth: 0,
              flex: 1,
              overflowY: "auto",
              maxHeight: { xs: 520, xl: "none" },
              pr: 1,
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-track": { background: "rgba(22, 39, 31, 0.03)", borderRadius: "8px" },
              "&::-webkit-scrollbar-thumb": { background: "rgba(23, 107, 82, 0.22)", borderRadius: "8px" },
              "&::-webkit-scrollbar-thumb:hover": { background: "rgba(23, 107, 82, 0.42)" },
            }}
          >
            {visible.length === 0 && (
              <Box sx={{ py: 3, px: 1, textAlign: "center" }}>
                <Box
                  sx={{
                    width: 47,
                    height: 47,
                    mx: "auto",
                    mb: 1.2,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "15px",
                    bgcolor: C.positiveWash,
                    border: "1px solid rgba(23,107,82,0.09)",
                  }}
                >
                  {tab === 2 ? (
                    <CheckCircle2 size={21} color={C.positive} />
                  ) : (
                    <Bell size={21} color={C.accent} />
                  )}
                </Box>

                <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.ink }}>
                  {tab === 2 ? "Nothing resolved yet" : "Inbox zero"}
                </Typography>

                <Typography sx={{ mt: 0.4, fontSize: 11.8, color: C.muted, lineHeight: 1.65 }}>
                  {tab === 1
                    ? "Every alert has been seen."
                    : tab === 2
                      ? "Resolved alerts will appear here."
                      : "No alerts match this view."}
                </Typography>
              </Box>
            )}

            {visible.map((alert) => {
              const meta = alertMeta[alert.id] || {
                read: false,
                resolved: false,
              };

              return (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  meta={meta}
                  expanded={expandedAlertId === alert.id}
                  onToggle={() =>
                    setExpandedAlertId((current) =>
                      current === alert.id ? null : alert.id,
                    )
                  }
                  onNavigate={() => {
                    setStatus(alert.id, { read: true });
                    navigate(alert.link);
                  }}
                  onRead={() => {
                    setStatus(alert.id, { read: true });
                    toast("Alert marked as read", "info");
                  }}
                  onResolve={() => {
                    setStatus(alert.id, {
                      read: true,
                      resolved: true,
                    });
                    setExpandedAlertId(null);
                    toast("Alert resolved");
                  }}
                  onReopen={() => {
                    setStatus(alert.id, { resolved: false });
                    toast("Alert reopened", "info");
                  }}
                />
              );
            })}

            {alerts.length > 0 && tab === 0 && unreadCount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 0.8 }}>
                <Button
                  size="small"
                  onClick={markAllRead}
                  startIcon={<Check size={13} />}
                  sx={{
                    ...smallButtonSx,
                    color: C.accent,
                    "&:hover": { bgcolor: C.accentWash },
                  }}
                >
                  Mark all read
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {/* Payment reminder history */}
        <Box
          className="cfs-enter drift-wall"
          sx={{
            ...panelSx,
            animationDelay: "130ms",
            display: "flex",
            flexDirection: "column",
            height: { xs: "auto", xl: 580 },
            maxHeight: { xs: "none", xl: 580 },
          }}
        >
          <Box sx={{ p: { xs: 1.6, sm: 2 }, pb: 0.8, flexShrink: 0 }}>
            <SectionHeading
              title="Payment reminder history"
              subtitle="Track drafts, schedules and delivery status."
              icon={Clock3}
              action={
                reminders.length > 0 ? (
                  <Chip
                    size="small"
                    label={reminders.length}
                    sx={{
                      height: 24,
                      borderRadius: "8px",
                      bgcolor: C.accentWash,
                      color: C.accent,
                      fontWeight: 850,
                      fontSize: 11.8,
                    }}
                  />
                ) : null
              }
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-track": { background: "rgba(22, 39, 31, 0.03)", borderRadius: "8px" },
              "&::-webkit-scrollbar-thumb": { background: "rgba(23, 107, 82, 0.22)", borderRadius: "8px" },
              "&::-webkit-scrollbar-thumb:hover": { background: "rgba(23, 107, 82, 0.42)" },
            }}
          >
            {reminders.length === 0 ? (
              <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                <EmptyState
                  title="No reminders yet"
                  body="Draft a reminder for an open invoice. Reminders are stored locally in this demo; no email is sent without a connected provider."
                  action={
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Mail size={13} />}
                      onClick={() => setReminderOpen(true)}
                      disabled={openInvoiceCount === 0}
                      sx={{
                        ...smallButtonSx,
                        color: C.accent,
                        borderColor: C.border,
                      }}
                    >
                      Draft a reminder
                    </Button>
                  }
                />
              </Box>
            ) : (
              <ReminderHistory
                reminders={reminders}
                dataset={dataset}
                dispatch={dispatch}
                toast={toast}
              />
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 0.9,
              m: { xs: 1.4, sm: 2 },
              mt: "auto",
              p: 1.25,
              borderRadius: "11px",
              bgcolor: "rgba(233,245,239,0.82)",
              border: "1px solid rgba(23,107,82,0.11)",
              flexShrink: 0,
            }}
          >
            <Info
              size={14}
              color={C.accent}
              style={{ flexShrink: 0, marginTop: 2 }}
            />

            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 11.8, fontWeight: 850, color: C.ink, lineHeight: 1.5 }}>
                Demo mode — no email is sent
              </Typography>

              <Typography sx={{ mt: 0.2, fontSize: 11.8, lineHeight: 1.65, color: C.muted }}>
                Reminder scheduling is stored in the application. Actual delivery requires a connected email provider.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        className="cfs-enter"
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0.8,
          mt: 1.5,
          px: 0.4,
          animationDelay: "200ms",
        }}
      >
        <Sparkles
          size={13}
          color={C.subtle}
          style={{ flexShrink: 0, marginTop: 2 }}
        />

        <Typography sx={{ fontSize: 11.8, color: C.subtle, lineHeight: 1.65 }}>
          Review high-priority financial alerts first. Mark alerts as read when reviewed, and resolve them when the underlying issue has been addressed.
        </Typography>
      </Box>

      {reminderOpen && (
        <ReminderComposer
          open={reminderOpen}
          onClose={() => setReminderOpen(false)}
        />
      )}
    </Box>
  );
}
