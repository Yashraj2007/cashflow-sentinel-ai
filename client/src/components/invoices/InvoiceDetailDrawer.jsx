import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlineOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { useApp } from "../../context/AppContext.jsx";
import { KV, InvoiceStatusBadge, PriorityChip, RiskChip, ConfidenceChip } from "../common.jsx";
import ReminderComposer from "../ReminderComposer.jsx";
import {
  outstandingPaise, salesInvoiceStatus, purchaseInvoiceStatus,
  predictPayment, customerPaymentStats, supplierDeliveryStats,
} from "../../utils/calculations.js";
import { formatINR, formatDisplay, daysBetween, todayISO, rupeesToPaise, addDaysISO } from "../../utils/finance.js";

export default function InvoiceDetailDrawer({ type, invoiceId, open, onClose }) {
  const { dataset, dispatch, toast, forecast } = useApp();
  const navigate = useNavigate();
  const [payOpen, setPayOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [newDate, setNewDate] = useState("");
  const [noteText, setNoteText] = useState("");

  const isSales = type === "sales";
  const list = isSales ? dataset.salesInvoices : dataset.purchaseInvoices;
  const invoice = list.find((i) => i.id === invoiceId);
  const party = invoice
    ? (isSales ? dataset.customers : dataset.suppliers).find((p) => p.id === invoice.partyId)
    : null;

  const prediction = useMemo(
    () => (isSales && invoice && party ? predictPayment(invoice, party) : null),
    [isSales, invoice, party]
  );

  if (!invoice) return null;

  const status = isSales ? salesInvoiceStatus(invoice) : purchaseInvoiceStatus(invoice);
  const outstanding = outstandingPaise(invoice);
  const expectedDate = isSales ? invoice.expectedPaymentDate : invoice.plannedPaymentDate;
  const custStats = isSales && party ? customerPaymentStats(party) : null;
  const supStats = !isSales && party ? supplierDeliveryStats(party) : null;
  const relatedTx = dataset.transactions.filter((t) => t.ref && t.ref.kind === `${type}-invoice` && t.ref.id === invoice.id);
  const reminders = isSales ? (dataset.reminders || []).filter((r) => r.invoiceId === invoice.id) : [];

  const recordPayment = () => {
    const amount = rupeesToPaise(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast("Enter a valid amount", "error"); return; }
    if (amount > outstanding) { toast(`Amount exceeds outstanding ${formatINR(outstanding)}`, "error"); return; }
    dispatch({
      type: "RECORD_PAYMENT",
      invoiceType: type,
      invoiceId: invoice.id,
      amountPaise: amount,
      dateISO: payDate,
      label: `${isSales ? "Receipt" : "Payment"} — ${invoice.number} (${party ? party.name : ""})`,
    });
    toast(amount >= outstanding ? `${invoice.number} marked fully paid — forecast updated` : `Partial payment recorded — forecast updated`);
    setPayOpen(false);
    setPayAmount("");
  };

  const saveDate = () => {
    if (!newDate) return;
    const patch = isSales ? { expectedPaymentDate: newDate } : { plannedPaymentDate: newDate };
    dispatch({ type: isSales ? "UPDATE_SALES_INVOICE" : "UPDATE_PURCHASE_INVOICE", id: invoice.id, patch });
    toast(`${isSales ? "Expected" : "Planned"} payment date updated — forecast recalculated`);
    setDateOpen(false);
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const notes = [...(invoice.notes || []), { date: todayISO(), text: noteText.trim() }];
    dispatch({ type: isSales ? "UPDATE_SALES_INVOICE" : "UPDATE_PURCHASE_INVOICE", id: invoice.id, patch: { notes } });
    toast("Note added");
    setNoteOpen(false);
    setNoteText("");
  };

  const simulateDelay = () => {
    dispatch({
      type: "SET_SCENARIO_DRAFT",
      draft: isSales
        ? { kind: "delayInvoice", invoiceType: "sales", invoiceId: invoice.id, days: 10, label: `${invoice.number} pays 10 days later` }
        : { kind: "supplierExtension", invoiceId: invoice.id, days: 10, label: `Extend ${invoice.number} by 10 days` },
    });
    onClose();
    navigate("/scenario-lab");
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100vw", sm: 460 }, p: 0 } }}>
        <Box sx={{ p: 2.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#12263a", color: "#fff" }}>
          <Box>
            <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 12, letterSpacing: "0.12em", color: "#4fd1c5", textTransform: "uppercase" }}>
              {isSales ? "Sales invoice" : "Purchase invoice"}
            </Typography>
            <Typography variant="h6" sx={{ fontFamily: '"Space Grotesk"' }}>{invoice.number}</Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
              <InvoiceStatusBadge status={status} />
              {!isSales && <PriorityChip priority={invoice.priority} />}
            </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: "#fff" }} aria-label="Close details"><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
          <Box className="cfs-card" sx={{ mb: 2 }}>
            <KV label={isSales ? "Customer" : "Supplier"}>{party ? party.name : "—"}</KV>
            <KV label="Original amount"><span className="amount-cell">{formatINR(invoice.amountPaise)}</span></KV>
            <KV label="Paid so far"><span className="amount-cell text-pos">{formatINR(invoice.paidPaise || 0)}</span></KV>
            <KV label="Outstanding"><span className={`amount-cell ${outstanding > 0 ? "text-neg" : ""}`}>{formatINR(outstanding)}</span></KV>
            <KV label="Invoice date">{formatDisplay(invoice.issueDate)}</KV>
            <KV label={isSales ? "Contractual due date" : "Payment due date"}>{formatDisplay(invoice.dueDate)}</KV>
            <KV label={isSales ? "Expected payment" : "Planned payment"}>
              {formatDisplay(expectedDate)}
              {isSales && status !== "paid" && daysBetween(invoice.dueDate, expectedDate) > 0 && (
                <Chip size="small" color="warning" label={`~${daysBetween(invoice.dueDate, expectedDate)}d late`} sx={{ ml: 1, height: 18, fontSize: 11.8 }} />
              )}
            </KV>
            {invoice.actualPaymentDate && <KV label="Actual payment date">{formatDisplay(invoice.actualPaymentDate)}</KV>}
            {invoice.poRef && <KV label={isSales ? "Customer PO" : "Purchase order"}>{invoice.poRef}</KV>}
            {isSales && party && <KV label="Payment terms">{party.termsDays} days · {party.contact} ({party.email})</KV>}
            {!isSales && party && <KV label="Payment terms">{party.paymentTermsDays} days · {party.contact} ({party.email})</KV>}
            {!isSales && invoice.deliveryPromised && (
              <KV label="Delivery promised / actual">
                {formatDisplay(invoice.deliveryPromised)} / {invoice.deliveryActual ? formatDisplay(invoice.deliveryActual) : "pending"}
              </KV>
            )}
          </Box>

          {status !== "paid" && outstanding > 0 && (() => {
            const day = forecast.series.find((s) => s.date === expectedDate);
            if (!day) return null;
            const risky = day.close < forecast.reserve;
            return (
              <Box className={`callout ${risky ? "callout--amber" : "callout--teal"}`} sx={{ mb: 2 }}>
                <Box>
                  <strong>Forecast impact:</strong> {isSales ? "if this receipt lands" : "if this bill is paid"} on {formatDisplay(expectedDate)} as planned, projected closing cash that day is{" "}
                  <strong>{formatINR(day.close)}</strong>
                  {risky ? " — below your minimum reserve." : " — above your minimum reserve."}
                </Box>
              </Box>
            );
          })()}

          {isSales && prediction && (
            <Box className="cfs-card" sx={{ mb: 2, borderColor: "#dbe7f2", background: "#f4f8fc" }}>
              <div className="section-title">
                <h3>Payment prediction (heuristic)</h3>
                <ConfidenceChip label={prediction.confidenceLabel} />
              </div>
              <KV label="Expected payment date">{formatDisplay(prediction.expectedDate)}</KV>
              <KV label="Late-payment probability">
                {prediction.lateProbability !== null ? `~${Math.round(prediction.lateProbability * 100)}%` : "Unavailable — no history"}
              </KV>
              <KV label="Historical records">{prediction.available ? `${custStats.n} paid invoices` : "0 — new customer"}</KV>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Why:</Typography>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#46586c" }}>
                  {prediction.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </Box>
              {custStats && custStats.n > 0 && (
                <Box sx={{ mt: 1.5, display: "flex", gap: 1, alignItems: "center" }}>
                  <RiskChip risk={custStats.avgDelay >= 8 || custStats.onTimeRate < 20 ? "high" : custStats.avgDelay >= 4 || custStats.onTimeRate < 55 ? "medium" : "low"} />
                  <Typography variant="caption" color="text.secondary">avg delay {custStats.avgDelay.toFixed(1)}d · on-time {custStats.onTimeRate.toFixed(0)}%</Typography>
                </Box>
              )}
            </Box>
          )}

          {!isSales && supStats && (
            <Box className="cfs-card" sx={{ mb: 2 }}>
              <div className="section-title"><h3>Supplier delivery record</h3></div>
              {supStats.available ? (
                <>
                  <KV label="Avg delivery delay">{supStats.avgDelay.toFixed(1)} days</KV>
                  <KV label="On-time delivery rate">{supStats.onTimeRate.toFixed(0)}% over {supStats.n} deliveries</KV>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Delivery performance data unavailable for this supplier.</Typography>
              )}
            </Box>
          )}

          <Box className="cfs-card" sx={{ mb: 2 }}>
            <div className="section-title"><h3>Actions</h3></div>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <Button size="small" variant="contained" startIcon={<PaymentsOutlinedIcon sx={{ fontSize: 16 }} />} disabled={outstanding <= 0} onClick={() => { setPayDate(todayISO()); setPayOpen(true); }}>
                Record payment
              </Button>
              <Button size="small" variant="outlined" startIcon={<EventNoteOutlinedIcon sx={{ fontSize: 16 }} />} disabled={status === "paid"} onClick={() => { setNewDate(expectedDate); setDateOpen(true); }}>
                Edit {isSales ? "expected" : "planned"} date
              </Button>
              <Button size="small" variant="outlined" startIcon={<NoteAddOutlinedIcon sx={{ fontSize: 16 }} />} onClick={() => setNoteOpen(true)}>Add a note</Button>
              {isSales ? (
                <Button size="small" variant="outlined" startIcon={<MailOutlineIcon sx={{ fontSize: 16 }} />} disabled={outstanding <= 0} onClick={() => setReminderOpen(true)}>
                  Draft reminder
                </Button>
              ) : (
                <Button size="small" variant="outlined" startIcon={<AccountCircleOutlinedIcon sx={{ fontSize: 16 }} />} onClick={() => { onClose(); navigate(`/suppliers/${invoice.partyId}`); }}>
                  Open supplier
                </Button>
              )}
              {isSales && (
                <Button size="small" variant="outlined" startIcon={<AccountCircleOutlinedIcon sx={{ fontSize: 16 }} />} onClick={() => { onClose(); navigate(`/customers/${invoice.partyId}`); }}>
                  Open customer
                </Button>
              )}
              <Button size="small" variant="outlined" color="warning" startIcon={<ScienceOutlinedIcon sx={{ fontSize: 16 }} />} disabled={status === "paid"} onClick={simulateDelay}>
                {isSales ? "Simulate late payment" : "Simulate payment change"}
              </Button>
            </Box>
          </Box>

          {reminders.length > 0 && (
            <Box className="cfs-card" sx={{ mb: 2 }}>
              <div className="section-title"><h3>Reminder history</h3></div>
              {reminders.map((r) => (
                <Box key={r.id} sx={{ py: 1, borderBottom: "1px dashed #e3e8ee", "&:last-child": { borderBottom: "none" } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{r.subject}</Typography>
                    <Chip size="small" label={r.status === "demo-scheduled" ? "Scheduled (demo)" : r.status} color={r.status === "demo-scheduled" ? "info" : "default"} sx={{ height: 18, fontSize: 11.8 }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">to {r.recipient} · send on {formatDisplay(r.scheduledDate)} · not actually sent</Typography>
                </Box>
              ))}
            </Box>
          )}

          <Box className="cfs-card" sx={{ mb: 2 }}>
            <div className="section-title"><h3>Related transactions</h3></div>
            {relatedTx.length === 0 && <Typography variant="body2" color="text.secondary">No cash movements recorded against this invoice yet.</Typography>}
            {relatedTx.map((t) => (
              <div className="kv-row" key={t.id}>
                <span className="kv-label">{formatDisplay(t.date)} · {t.label}</span>
                <span className={`kv-value amount-cell ${t.direction === "in" ? "text-pos" : "text-neg"}`}>{formatINR(t.amountPaise, { withSign: true })}</span>
              </div>
            ))}
          </Box>

          <Box className="cfs-card">
            <div className="section-title"><h3>Notes & history</h3></div>
            {(invoice.notes || []).length === 0 && <Typography variant="body2" color="text.secondary">No notes yet.</Typography>}
            {(invoice.notes || []).map((n, i) => (
              <Box key={i} sx={{ py: 1, borderBottom: "1px dashed #e3e8ee", "&:last-child": { borderBottom: "none" } }}>
                <Typography variant="caption" color="text.secondary">{formatDisplay(n.date)}</Typography>
                <Typography sx={{ fontSize: 13 }}>{n.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Drawer>

      {/* record payment */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Record {isSales ? "receipt" : "payment"} — {invoice.number}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary">Outstanding: {formatINR(outstanding)}. Recording updates the cash forecast immediately.</Typography>
          <TextField fullWidth size="small" label="Amount (₹)" type="number" sx={{ mt: 1.5 }} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputProps={{ min: 0, max: outstanding / 100 }} />
          <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
            <Button size="small" variant="outlined" onClick={() => setPayAmount(String(outstanding / 100))}>Full ({formatINR(outstanding, { compact: true })})</Button>
            <Button size="small" variant="outlined" onClick={() => setPayAmount(String(Math.round(outstanding / 2 / 100)))}>50% partial</Button>
          </Box>
          <TextField fullWidth size="small" type="date" label={isSales ? "Received on" : "Paid on"} sx={{ mt: 1.5 }} value={payDate} onChange={(e) => setPayDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setPayOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={recordPayment}>Record</Button>
        </DialogActions>
      </Dialog>

      {/* edit date */}
      <Dialog open={dateOpen} onClose={() => setDateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Edit {isSales ? "expected" : "planned"} payment date</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary">
            The forecast uses this date for the remaining {formatINR(outstanding)}. Changes recalculate all projections.
          </Typography>
          <TextField fullWidth size="small" type="date" sx={{ mt: 1.5 }} value={newDate} onChange={(e) => setNewDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ min: todayISO() }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setDateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!newDate || newDate < addDaysISO(todayISO(), 0)} onClick={saveDate}>Save date</Button>
        </DialogActions>
      </Dialog>

      {/* add note */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Add note</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline minRows={3} size="small" placeholder="e.g. Called accounts team — payment promised next week" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setNoteOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!noteText.trim()} onClick={addNote}>Save note</Button>
        </DialogActions>
      </Dialog>

      {reminderOpen && (
        <ReminderComposer open={reminderOpen} onClose={() => setReminderOpen(false)} presetInvoiceId={invoice.id} />
      )}
    </>
  );
}
