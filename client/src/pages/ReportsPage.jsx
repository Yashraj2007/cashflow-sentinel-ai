import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Chip from "@mui/material/Chip";
import { BarChart3, Calendar } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { PageHeader, CSVExportButton, EmptyState, StatusBadge } from "../components/common.jsx";
import { MiniBarChart } from "../components/charts.jsx";
import { outstandingPaise, customerPaymentStats, supplierDeliveryStats, ageingBuckets } from "../utils/calculations.js";
import { formatINR, formatDisplay, formatPct, daysBetween, todayISO, addDaysISO, monthLabel } from "../utils/finance.js";

export default function ReportsPage() {
  const { dataset, state } = useApp();
  const today = todayISO();
  const [from, setFrom] = useState(addDaysISO(today, -60));
  const [to, setTo] = useState(addDaysISO(today, 60));

  // historical monthly cash movement (actuals only)
  const monthly = useMemo(() => {
    const map = new Map();
    dataset.transactions.filter((t) => t.status === "actual" && t.date >= from && t.date <= to).forEach((t) => {
      const key = t.date.slice(0, 7);
      const entry = map.get(key) || { month: monthLabel(`${key}-01`), inflow: 0, outflow: 0 };
      if (t.direction === "in") entry.inflow += t.amountPaise; else entry.outflow += t.amountPaise;
      map.set(key, entry);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
  }, [dataset.transactions, from, to]);

  const receivablesAgeing = useMemo(() => ageingBuckets(dataset.salesInvoices.filter((i) => !i.isDraft && outstandingPaise(i) > 0).map((i) => ({ amountPaise: outstandingPaise(i), dueDate: i.dueDate }))), [dataset.salesInvoices]);
  const payablesAgeing = useMemo(() => ageingBuckets(dataset.purchaseInvoices.filter((i) => outstandingPaise(i) > 0).map((i) => ({ amountPaise: outstandingPaise(i), dueDate: i.dueDate }))), [dataset.purchaseInvoices]);

  const ageingChart = (buckets) => [
    { bucket: "Current", amount: buckets.current },
    { bucket: "1–15d", amount: buckets.b1_15 },
    { bucket: "16–30d", amount: buckets.b16_30 },
    { bucket: "30d+", amount: buckets.b30plus },
  ];
  const AGE_COLORS = ["#1e8e5a", "#c07f10", "#d9822b", "#cd3c3c"];

  const customerPerf = useMemo(() => dataset.customers.map((c) => {
    const stats = customerPaymentStats(c);
    const open = dataset.salesInvoices.filter((i) => i.partyId === c.id && outstandingPaise(i) > 0 && !i.isDraft);
    return { name: c.name, ...stats, outstanding: open.reduce((s, i) => s + outstandingPaise(i), 0) };
  }).sort((a, b) => b.outstanding - a.outstanding), [dataset]);

  const supplierPerf = useMemo(() => dataset.suppliers.map((s) => {
    const stats = supplierDeliveryStats(s);
    const open = dataset.purchaseInvoices.filter((i) => i.partyId === s.id && outstandingPaise(i) > 0);
    return { name: s.name, ...stats, payable: open.reduce((sum, i) => sum + outstandingPaise(i), 0) };
  }).sort((a, b) => b.payable - a.payable), [dataset]);

  // forecast accuracy: predicted expected date vs actual paid date for settled invoices
  const accuracy = useMemo(() => {
    const rows = [];
    dataset.salesInvoices.forEach((inv) => {
      if (!inv.actualPaymentDate || !inv.expectedPaymentDate) return;
      const err = daysBetween(inv.expectedPaymentDate, inv.actualPaymentDate);
      rows.push({ number: inv.number, expected: inv.expectedPaymentDate, actual: inv.actualPaymentDate, err });
    });
    const mae = rows.length ? rows.reduce((s, r) => s + Math.abs(r.err), 0) / rows.length : null;
    return { rows, mae };
  }, [dataset.salesInvoices]);

  const shortageEvents = [
    { period: "Two months ago", amountPaise: 6200000, cause: "Festive stock purchase landed before Sharma Hardware's payment cleared.", resolved: "Cleared by a 50% customer advance." },
    { period: "Last month", amountPaise: 3800000, cause: "Salary week overlapped two supplier bills; Krishna Traders paid 11 days late.", resolved: "Cleared when overdue receipt arrived; supplier extension used once." },
  ];

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="page"
      sx={{
        position: "relative",
        minWidth: 0,
        "& .cfs-card": {
          border: "1px solid #e0eae3",
          borderRadius: "17px",
          bgcolor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(18px) saturate(125%)",
          boxShadow: "0 3px 8px rgba(22,39,31,0.025), 0 12px 30px rgba(22,39,31,0.035)",
          transition: "border-color 220ms ease, box-shadow 240ms ease, transform 240ms ease, filter 220ms ease",
          "&:hover": {
            borderColor: "rgba(23,107,82,0.25)",
            boxShadow: "0 15px 36px rgba(22,39,31,0.075)",
            transform: "translateY(-2px)",
          },
        },
        "& .cfs-card--flush": {
          overflow: "hidden",
        },
      }}
    >
      <style>{`
        @keyframes cfs-breathe {
          0%, 100% { opacity: 0.42; transform: scale(0.97); }
          50% { opacity: 0.68; transform: scale(1.03); }
        }
      `}</style>

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

      {/* Branded hero header matching Dashboard & ScenarioLab */}
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
              <BarChart3 size={13} color="#B5E7CC" />
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
              Financial Intelligence
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
            Reports
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
            Historical cash movement, ageing, party performance and forecast accuracy — computed from live ledger records.
          </Typography>
        </Box>

        {/* Date Filter Action Box */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            flexWrap: "wrap",
            flexShrink: 0,
            p: 1.25,
            borderRadius: "15px",
            bgcolor: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "#B5E7CC", px: 0.5 }}>
            <Calendar size={14} />
            <Typography sx={{ fontSize: 12, fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.5px" }}>Date Range</Typography>
          </Box>
          <TextField
            size="small"
            type="date"
            label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true, sx: { color: "rgba(239,248,242,0.7)", "&.Mui-focused": { color: "#B5E7CC" } } } }}
            sx={{
              width: 140,
              "& .MuiOutlinedInput-root": {
                color: "#FFFFFF",
                fontSize: 12,
                borderRadius: "10px",
                bgcolor: "rgba(0,0,0,0.18)",
                "& fieldset": { borderColor: "rgba(255,255,255,0.18)" },
                "&:hover fieldset": { borderColor: "rgba(181,231,204,0.4)" },
                "&.Mui-focused fieldset": { borderColor: "#70D6B1" },
              },
              "& input::-webkit-calendar-picker-indicator": {
                filter: "invert(1)",
                opacity: 0.7,
                cursor: "pointer",
              },
            }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true, sx: { color: "rgba(239,248,242,0.7)", "&.Mui-focused": { color: "#B5E7CC" } } } }}
            sx={{
              width: 140,
              "& .MuiOutlinedInput-root": {
                color: "#FFFFFF",
                fontSize: 12,
                borderRadius: "10px",
                bgcolor: "rgba(0,0,0,0.18)",
                "& fieldset": { borderColor: "rgba(255,255,255,0.18)" },
                "&:hover fieldset": { borderColor: "rgba(181,231,204,0.4)" },
                "&.Mui-focused fieldset": { borderColor: "#70D6B1" },
              },
              "& input::-webkit-calendar-picker-indicator": {
                filter: "invert(1)",
                opacity: 0.7,
                cursor: "pointer",
              },
            }}
          />
        </Box>
      </Box>

      <Box className="grid-2" sx={{ mb: 2.5 }}>
        <Box className="cfs-card drift-wall">
          <div className="section-title">
            <h3>Historical cash movement (actuals)</h3>
            <CSVExportButton filename="cash-movement.csv" rows={monthly} columns={[{ key: "month" }, { key: "inflow", value: (r) => r.inflow / 100 }, { key: "outflow", value: (r) => r.outflow / 100 }]} />
          </div>
          {monthly.length === 0 ? <EmptyState title="No actuals in range" /> : (
            <MiniBarChart data={monthly} xKey="month" height={220} bars={[{ key: "inflow", name: "Money in", color: "#1e8e5a" }, { key: "outflow", name: "Money out", color: "#cd3c3c" }]} />
          )}
        </Box>

        <Box className="cfs-card drift-wall">
          <div className="section-title"><h3>Receivables vs payables ageing</h3></div>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "success.main" }}>RECEIVABLES — {formatINR(Object.values(receivablesAgeing).reduce((a, b) => a + b, 0), { compact: true })}</Typography>
          <MiniBarChart data={ageingChart(receivablesAgeing)} xKey="bucket" height={130} bars={[{ key: "amount", name: "Amount", color: "#12a5a0", cellColors: AGE_COLORS, data: ageingChart(receivablesAgeing) }]} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: "error.main", display: "block", mt: 1 }}>PAYABLES — {formatINR(Object.values(payablesAgeing).reduce((a, b) => a + b, 0), { compact: true })}</Typography>
          <MiniBarChart data={ageingChart(payablesAgeing)} xKey="bucket" height={130} bars={[{ key: "amount", name: "Amount", color: "#29517a", cellColors: AGE_COLORS, data: ageingChart(payablesAgeing) }]} />
        </Box>
      </Box>

      <Box className="grid-2" sx={{ mb: 2.5, alignItems: "start" }}>
        <Box className="cfs-card cfs-card--flush drift-wall">
          <Box sx={{ p: 2, pb: 0 }}><div className="section-title"><h3>Customer payment performance</h3></div></Box>
          <Table size="small">
            <TableHead><TableRow><TableCell>Customer</TableCell><TableCell align="right">Outstanding</TableCell><TableCell>Invoices</TableCell><TableCell>Avg delay</TableCell><TableCell>On-time</TableCell><TableCell>Confidence</TableCell></TableRow></TableHead>
            <TableBody>
              {customerPerf.map((c) => (
                <TableRow key={c.name} hover>
                  <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell align="right"><span className="amount-cell">{formatINR(c.outstanding, { compact: true })}</span></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{c.n}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{c.avgDelay === null ? "—" : `${c.avgDelay.toFixed(1)}d`}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{c.onTimeRate === null ? "—" : formatPct(c.onTimeRate)}</TableCell>
                  <TableCell><StatusBadge tone={c.confidence === "high" ? "green" : c.confidence === "medium" ? "amber" : "grey"} label={c.label} dot={false} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Box className="cfs-card cfs-card--flush drift-wall">
          <Box sx={{ p: 2, pb: 0 }}><div className="section-title"><h3>Supplier delivery performance</h3></div></Box>
          <Table size="small">
            <TableHead><TableRow><TableCell>Supplier</TableCell><TableCell align="right">Payable</TableCell><TableCell>Deliveries</TableCell><TableCell>Avg delay</TableCell><TableCell>On-time</TableCell></TableRow></TableHead>
            <TableBody>
              {supplierPerf.map((s) => (
                <TableRow key={s.name} hover>
                  <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{s.name}</TableCell>
                  <TableCell align="right"><span className="amount-cell">{formatINR(s.payable, { compact: true })}</span></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{s.n || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{s.available ? `${s.avgDelay.toFixed(1)}d` : <em className="text-faint">data unavailable</em>}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{s.available ? formatPct(s.onTimeRate) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>

      <Box className="cfs-card drift-wall" sx={{ mb: 2.5 }}>
        <div className="section-title"><h3>Deal profitability vs cash timing (last evaluated deal)</h3></div>
        {!state.lastDeal || !state.lastDeal.alternatives || state.lastDeal.alternatives.length === 0 ? (
          <EmptyState title="No deal evaluated yet" body="Run the Deal Impact Checker — its margin vs working-capital trade-off appears here for every alternative." />
        ) : (
          <Box>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              <strong>“{state.lastDeal.name}”</strong> — verdict: {String(state.lastDeal.verdict).replace("-", " ")}
              {state.lastDeal.marginPct !== null && state.lastDeal.marginPct !== undefined ? ` · margin ${state.lastDeal.marginPct.toFixed(1)}%` : ""} · cash out before payment {formatINR(state.lastDeal.cashOutBeforePayment || 0, { compact: true })}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Alternative</TableCell>
                  <TableCell sx={{ width: "26%" }}>Margin</TableCell>
                  <TableCell sx={{ width: "26%" }}>Working capital needed</TableCell>
                  <TableCell>Reserve breach</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.lastDeal.alternatives.map((a, i) => {
                  const maxMargin = Math.max(1, ...state.lastDeal.alternatives.map((x) => Math.max(0, x.marginPct)));
                  const maxWC = Math.max(1, ...state.lastDeal.alternatives.map((x) => x.workingCapitalPaise));
                  return (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{a.label}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box className="hbar" sx={{ flex: 1 }}><span style={{ width: `${Math.max(0, (a.marginPct / maxMargin) * 100)}%`, background: "#1e8e5a" }} /></Box>
                          <span className="amount-cell" style={{ fontSize: 11.5, minWidth: 48, textAlign: "right" }}>{a.marginPct.toFixed(1)}%</span>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box className="hbar" sx={{ flex: 1 }}><span style={{ width: `${(a.workingCapitalPaise / maxWC) * 100}%`, background: "#c07f10" }} /></Box>
                          <span className="amount-cell" style={{ fontSize: 11.5, minWidth: 56, textAlign: "right" }}>{formatINR(a.workingCapitalPaise, { compact: true })}</span>
                        </Box>
                      </TableCell>
                      <TableCell>{a.breachDate ? <Chip size="small" color="error" label={formatDisplay(a.breachDate)} sx={{ height: 19, fontSize: 11.8 }} /> : <Chip size="small" color="success" label="none" sx={{ height: 19, fontSize: 11.8 }} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Typography variant="caption" color="text.secondary">Profitable on paper ≠ safe in cash — the right pair of columns is why the Deal Impact Checker exists.</Typography>
          </Box>
        )}
      </Box>

      <Box className="grid-3" sx={{ alignItems: "start" }}>
        <Box className="cfs-card">
          <div className="section-title"><h3>Forecast accuracy</h3></div>
          {accuracy.rows.length === 0 ? <EmptyState title="No settled invoices with predictions" /> : (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Mean absolute error between predicted and actual payment dates: <strong className="mono">{accuracy.mae.toFixed(1)} days</strong> across {accuracy.rows.length} settled invoices.
              </Typography>
              {accuracy.rows.slice(0, 6).map((r) => (
                <div className="kv-row" key={r.number}>
                  <span className="kv-label">{r.number} · exp {formatDisplay(r.expected)} → act {formatDisplay(r.actual)}</span>
                  <span className={`kv-value ${Math.abs(r.err) <= 2 ? "text-pos" : "text-warn"}`}>{r.err === 0 ? "exact" : `${r.err > 0 ? "+" : ""}${r.err}d`}</span>
                </div>
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Computed from demo history — predictions are date heuristics, not an ML model.</Typography>
            </>
          )}
        </Box>

        <Box className="cfs-card">
          <div className="section-title"><h3>Historical shortage events</h3></div>
          <Chip size="small" label="demo data" sx={{ mb: 1, height: 18, fontSize: 11.8 }} />
          {shortageEvents.map((s, i) => (
            <Box key={i} sx={{ py: 1, borderBottom: "1px dashed #e3e8ee", "&:last-child": { borderBottom: "none" } }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{s.period} — {formatINR(s.amountPaise, { compact: true })}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>{s.cause}</Typography>
              <Typography variant="caption" color="success.main">{s.resolved}</Typography>
            </Box>
          ))}
        </Box>

        <Box className="cfs-card">
          <div className="section-title"><h3>Scenario & deal log</h3></div>
          {(dataset.savedScenarios || []).length === 0 ? <EmptyState title="No saved scenarios" body="Saved scenarios from the Scenario Lab will appear here with their outcomes." /> : (
            (dataset.savedScenarios || []).map((sc) => (
              <Box key={sc.id} sx={{ py: 1, borderBottom: "1px dashed #e3e8ee", "&:last-child": { borderBottom: "none" } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{sc.name}</Typography>
                  <StatusBadge tone={sc.status === "accepted" ? "green" : sc.status === "rejected" ? "red" : "grey"} label={sc.status} dot={false} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  min {sc.outcome && sc.outcome.minBalancePaise !== undefined ? formatINR(sc.outcome.minBalancePaise, { compact: true }) : "—"} · {formatDisplay(sc.createdAt)}
                </Typography>
              </Box>
            ))
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Deal profitability vs cash timing is summarised on the Deal Impact Checker — every deal shows margin and the working-capital gap side by side.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
