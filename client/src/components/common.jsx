import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import InboxIcon from "@mui/icons-material/Inbox";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { formatINR } from "../utils/finance.js";
import { downloadCSV } from "../utils/csv.js";
import { useApp } from "../context/AppContext.jsx";

/* scroll-reveal wrapper — quiet rise-in, honours reduced motion */
export function Reveal({ children, delay = 0, className = "", as = "div" }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return undefined; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { setSeen(true); io.disconnect(); } }),
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as;
  return (
    <Tag ref={ref} className={`rv ${seen ? "rv-in" : ""} ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}

/* brief loading shimmer when switching business / dataset */
export function useFakeLoad(key, ms = 380) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return loading;
}

export function PageHeader({ title, description, actions, kicker }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 2, pb: 2.5, mb: 3, borderBottom: "1px solid #e4e8ed" }}>
      <Box sx={{ maxWidth: 760 }}>
        {kicker && (
          <Typography sx={{ fontSize: 11.8, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0f8a84", mb: 0.75 }}>
            {kicker}
          </Typography>
        )}
        <Typography variant="h4" sx={{ fontSize: { xs: 22, md: 25 }, fontWeight: 700, color: "#132433", letterSpacing: "-0.01em" }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ fontSize: 13, color: "#516170", mt: 0.75, maxWidth: 680, lineHeight: 1.6 }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center" }}>{actions}</Box>}
    </Box>
  );
}

const VALUE_COLOR = {
  green: "#177a53", red: "#c04343", amber: "#a2700e",
  teal: "#132433", navy: "#132433", grey: "#16232f",
};

export function MetricCard({ label, value, note, tone = "navy", icon, tooltip, sub, className = "" }) {
  return (
    <Box className={`metric-card drift-wall ${className}`.trim()}>
      <Box className="metric-label">
        {icon}
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </Box>
      <Box className="metric-value" sx={{ color: VALUE_COLOR[tone] || "#132433" }}>{value}</Box>
      {sub && <Box sx={{ fontSize: 11.5, fontWeight: 700, color: VALUE_COLOR[tone] || "#0f8a84" }}>{sub}</Box>}
      {note && <Box className="metric-note">{note}</Box>}
    </Box>
  );
}

export function LedgerCell({ label, value, note, tone = "navy", tooltip }) {
  return (
    <div className="ledger-cell">
      <div className="ledger-label">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </div>
      <div className="ledger-value" style={{ color: VALUE_COLOR[tone] || "#132433" }}>{value}</div>
      {note && <div className="ledger-note">{note}</div>}
    </div>
  );
}

export function InfoTip({ text }) {
  return (
    <Tooltip title={text} arrow>
      <HelpOutlineIcon sx={{ fontSize: 12.5, color: "#8b98a5", cursor: "help" }} />
    </Tooltip>
  );
}

const TONE_CLASS = { green: "chip--green", amber: "chip--amber", red: "chip--red", teal: "chip--teal", grey: "chip--grey", navy: "chip--navy" };

export function StatusBadge({ tone = "grey", label, dot = true }) {
  return (
    <span className={`chip ${TONE_CLASS[tone] || "chip--grey"}`}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />}
      {label}
    </span>
  );
}

export function InvoiceStatusBadge({ status }) {
  const map = {
    paid: ["green", "Paid"],
    partial: ["teal", "Partially paid"],
    upcoming: ["navy", "Upcoming"],
    overdue: ["red", "Overdue"],
    draft: ["grey", "Draft"],
    at_risk: ["amber", "At risk"],
  };
  const [tone, label] = map[status] || ["grey", status];
  return <StatusBadge tone={tone} label={label} />;
}

export function PriorityChip({ priority }) {
  const map = { critical: ["red", "Critical"], normal: ["navy", "Normal"], low: ["grey", "Optional"] };
  const [tone, label] = map[priority] || ["grey", priority];
  return <StatusBadge tone={tone} label={label} dot={false} />;
}

export function RiskChip({ risk }) {
  const map = { high: ["red", "High risk"], medium: ["amber", "Medium risk"], low: ["green", "Low risk"], unknown: ["grey", "Not enough payment history"] };
  const [tone, label] = map[risk] || ["grey", risk];
  return <StatusBadge tone={tone} label={label} dot={false} />;
}

export function ConfidenceChip({ label }) {
  const tone = /Sufficient/.test(label) ? "green" : /Limited/.test(label) ? "amber" : "grey";
  return <StatusBadge tone={tone} label={label} dot={false} />;
}

export function AmountText({ paise, colored = false, compact = false, sx }) {
  const cls = colored ? (paise >= 0 ? "text-pos" : "text-neg") : "";
  return (
    <span className={`amount-cell ${cls}`} style={sx}>
      {formatINR(paise, { compact, withSign: colored })}
    </span>
  );
}

export function EmptyState({ title, body, action, icon }) {
  return (
    <Box sx={{ textAlign: "center", py: 5, px: 3 }}>
      <Box sx={{ color: "#8b98a5", mb: 1, display: "flex", justifyContent: "center" }}>
        {icon || <InboxIcon sx={{ fontSize: 34, opacity: 0.55 }} />}
      </Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#132433" }}>{title}</Typography>
      {body && <Typography sx={{ fontSize: 12.5, color: "#516170", mt: 0.5, maxWidth: 420, mx: "auto", lineHeight: 1.55 }}>{body}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}

export function ErrorState({ title = "Something went wrong", body, onRetry }) {
  return (
    <Box sx={{ textAlign: "center", py: 5, px: 3 }}>
      <ErrorOutlineIcon sx={{ fontSize: 36, color: "#c04343" }} />
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, mt: 1 }}>{title}</Typography>
      {body && <Typography sx={{ fontSize: 12.5, color: "#516170", mt: 0.5 }}>{body}</Typography>}
      {onRetry && <Button size="small" sx={{ mt: 2 }} onClick={onRetry}>Try again</Button>}
    </Box>
  );
}

export function LoadingSkeleton({ rows = 5, height = 44 }) {
  return (
    <Box sx={{ p: 2 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-shimmer" style={{ height, borderRadius: 8, marginBottom: 8, opacity: 1 - i * 0.12 }} />
      ))}
    </Box>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel = "Confirm", tone = "primary", onConfirm, onCancel, BackdropProps }) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          boxShadow: "0 20px 48px rgba(15, 35, 25, 0.22)",
          border: "1px solid rgba(22, 39, 31, 0.12)",
        },
      }}
      BackdropProps={BackdropProps || {
        sx: {
          backgroundColor: "rgba(15, 23, 42, 0.18)",
          backdropFilter: "blur(2.5px)",
          WebkitBackdropFilter: "blur(2.5px)",
        },
      }}
    >
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: 13, lineHeight: 1.6 }}>{body}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} sx={{ color: "#516170" }}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color={tone}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}

export function CSVExportButton({ filename, rows, columns, label = "Export CSV", size = "small", variant = "outlined" }) {
  const disabled = !rows || rows.length === 0;
  return (
    <Button
      size={size}
      variant={variant}
      startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
      disabled={disabled}
      onClick={() => downloadCSV(filename, rows, columns)}
    >
      {label}
    </Button>
  );
}

export function ToastHost() {
  const { state, dispatch } = useApp();
  return (
    <Box>
      {state.toasts.map((t, i) => (
        <Snackbar
          key={t.id}
          open
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{ position: "fixed", bottom: 24 + i * 60, right: 24 }}
          onClose={() => dispatch({ type: "REMOVE_TOAST", id: t.id })}
        >
          <Alert severity={t.severity || "success"} variant="filled" onClose={() => dispatch({ type: "REMOVE_TOAST", id: t.id })} sx={{ boxShadow: "0 10px 30px rgba(19,36,47,.25)", fontSize: 13, borderRadius: 2 }}>
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
}

export function MoneyCount({ paise, compact = false, duration = 800, className = "", style }) {
  const [val, setVal] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      prevRef.current = paise;
      setVal(paise);
      return undefined;
    }
    const from = prevRef.current;
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (paise - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = paise;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paise, duration]);

  return (
    <span className={`amount-cell ${className}`} style={style}>
      {formatINR(val, { compact })}
    </span>
  );
}

export function KV({ label, children }) {
  return (
    <div className="kv-row">
      <span className="kv-label">{label}</span>
      <span className="kv-value">{children}</span>
    </div>
  );
}

export { default as LatticeLoader } from "./common/LatticeLoader.jsx";
export { default as HoldButton } from "./common/HoldButton.jsx";
export { default as StatusMark } from "./common/StatusMark.jsx";
export { default as TrueFocusText } from "./common/TrueFocusText.jsx";

