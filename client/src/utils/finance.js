// ============================================================
// Money & date utilities.
// All monetary arithmetic is done in integer paise to avoid
// floating point drift; rupees are only used for display.
// ============================================================

export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function paiseToRupees(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
}

export function addPaise(...values) {
  return values.reduce((sum, v) => sum + Math.round(v || 0), 0);
}

export function formatINR(paise, { compact = false, withSign = false, decimals = 0 } = {}) {
  const rupees = paiseToRupees(paise);
  const sign = withSign && rupees > 0 ? "+" : "";
  if (compact) {
    const abs = Math.abs(rupees);
    if (abs >= 1e7) return `${sign}₹${(rupees / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${sign}₹${(rupees / 1e5).toFixed(1)} L`;
    if (abs >= 1e3) return `${sign}₹${(rupees / 1e3).toFixed(0)}k`;
    return `${sign}₹${Math.round(rupees)}`;
  }
  return (
    sign +
    rupees.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })
  );
}

export function formatPct(value, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

// ---------------- dates (local-time safe, ISO yyyy-mm-dd) ----

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISO(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO() {
  return toISO(new Date());
}

export function addDaysISO(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function daysBetween(fromISO, toISOStr) {
  return Math.round((parseISO(toISOStr) - parseISO(fromISO)) / 86400000);
}

export function isoRange(startISO, endISO) {
  const out = [];
  let cursor = startISO;
  let guard = 0;
  while (cursor <= endISO && guard < 800) {
    out.push(cursor);
    cursor = addDaysISO(cursor, 1);
    guard += 1;
  }
  return out;
}

export function formatDisplay(iso) {
  if (!iso) return "—";
  return parseISO(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatShort(iso) {
  if (!iso) return "—";
  return parseISO(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function formatWeekday(iso) {
  if (!iso) return "—";
  return parseISO(iso).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
}

export function monthLabel(iso) {
  return parseISO(iso).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function isValidISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  return !Number.isNaN(parseISO(value).getTime());
}

// Flexible date parsing for CSV imports (yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy)
export function parseAnyDate(value) {
  const s = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.slice(0, 10);
    return isValidISO(iso) ? iso : null;
  }
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) {
    const iso = `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
    return isValidISO(iso) ? iso : null;
  }
  return null;
}

// ---------------- lightweight stats ----------------

export function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
