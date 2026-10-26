import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import { useApp } from "../context/AppContext.jsx";
import { outstandingPaise } from "../utils/calculations.js";
import { formatINR, formatDisplay, todayISO, addDaysISO } from "../utils/finance.js";

const TEMPLATES = {
  upcoming: {
    label: "Upcoming due date",
    subject: (inv) => `Payment due soon — ${inv.number}`,
    body: (inv, cust) => `Dear ${cust ? cust.contact : "team"},\n\nA friendly note that invoice ${inv.number} for ${formatINR(outstandingPaise(inv))} is due on ${formatDisplay(inv.dueDate)}. Kindly schedule the payment so we can keep your account current.\n\nThank you for your business.`,
  },
  "due-today": {
    label: "Payment due today",
    subject: (inv) => `Payment due today — ${inv.number}`,
    body: (inv, cust) => `Dear ${cust ? cust.contact : "team"},\n\nInvoice ${inv.number} for ${formatINR(outstandingPaise(inv))} is due today (${formatDisplay(inv.dueDate)}). We would appreciate confirmation of the payment release.\n\nThank you.`,
  },
  overdue: {
    label: "Overdue invoice",
    subject: (inv) => `Overdue payment request — ${inv.number}`,
    body: (inv, cust) => `Dear ${cust ? cust.contact : "team"},\n\nOur records show invoice ${inv.number} for ${formatINR(outstandingPaise(inv))} is past its due date of ${formatDisplay(inv.dueDate)}. If payment has already been made, please ignore this note; otherwise we request settlement at the earliest.\n\nRegards.`,
  },
  advance: {
    label: "Request for partial advance",
    subject: (inv) => `Advance request against ${inv.number}`,
    body: (inv, cust) => `Dear ${cust ? cust.contact : "team"},\n\nTo keep your order ${inv.poRef || inv.number} on schedule, we request a 50% advance of ${formatINR(Math.round(outstandingPaise(inv) / 2))} against invoice ${inv.number}. The balance remains due on ${formatDisplay(inv.dueDate)}.\n\nThank you for your support.`,
  },
  confirmation: {
    label: "Payment confirmation follow-up",
    subject: (inv) => `Payment confirmation — ${inv.number}`,
    body: (inv, cust) => `Dear ${cust ? cust.contact : "team"},\n\nThank you for scheduling payment towards ${inv.number}. Could you share the reference number / UTR so we can reconcile it against your account?\n\nRegards.`,
  },
};

export default function ReminderComposer({ open, onClose, presetInvoiceId = null }) {
  const { dataset, dispatch, toast } = useApp();
  const openSales = useMemo(
    () => dataset.salesInvoices.filter((i) => !i.isDraft && outstandingPaise(i) > 0),
    [dataset.salesInvoices]
  );

  const [invoiceId, setInvoiceId] = useState(presetInvoiceId || (openSales[0] ? openSales[0].id : ""));
  const [template, setTemplate] = useState("overdue");
  const [scheduledDate, setScheduledDate] = useState(addDaysISO(todayISO(), 1));
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [touched, setTouched] = useState(false);

  const invoice = dataset.salesInvoices.find((i) => i.id === invoiceId);
  const customer = invoice ? dataset.customers.find((c) => c.id === invoice.partyId) : null;

  // Keep the composed text in sync with the selection until user edits it
  const tpl = TEMPLATES[template];
  const effectiveSubject = touched && subject ? subject : invoice ? tpl.subject(invoice) : "";
  const effectiveBody = touched && body ? body : invoice ? tpl.body(invoice, customer) : "";

  const persist = (status) => {
    if (!invoice || !customer) return;
    const isDraft = status === "draft";
    const reminder = {
      id: `rem-${Date.now()}`,
      kind: "sales-invoice",
      invoiceId: invoice.id,
      channel: "email",
      template,
      recipient: customer.email,
      subject: effectiveSubject,
      body: effectiveBody,
      scheduledDate,
      scheduledTime,
      status,
      history: [{ date: todayISO(), event: isDraft ? "Saved as draft (demo mode)" : `Reminder scheduled for ${formatDisplay(scheduledDate)} ${scheduledTime} (demo mode — no email actually sent)` }],
    };
    dispatch({ type: "ADD_REMINDER", reminder });
    dispatch({ type: "UPDATE_SALES_INVOICE", id: invoice.id, patch: { reminders: [...(invoice.reminders || []), reminder.id] } });
    toast(isDraft ? "Reminder saved as draft" : "Reminder scheduled in demo mode — no email was actually sent", "info");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 17 }}>Draft payment reminder</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Demo mode: reminders are saved locally and labelled <strong>“scheduled (demo)”</strong>. No email, SMS or call is actually sent — that needs a connected provider.
        </Alert>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          <TextField
            select size="small" label="Invoice" value={invoiceId}
            onChange={(e) => { setInvoiceId(e.target.value); setTouched(false); setSubject(""); setBody(""); }}
          >
            {openSales.map((i) => (
              <MenuItem key={i.id} value={i.id}>
                {i.number} — {(dataset.customers.find((c) => c.id === i.partyId) || {}).name} ({formatINR(outstandingPaise(i), { compact: true })})
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Template" value={template} onChange={(e) => { setTemplate(e.target.value); setTouched(false); setSubject(""); setBody(""); }}>
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <MenuItem key={key} value={key}>{t.label}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="Recipient (from contact details)" value={customer ? `${customer.email}` : ""} disabled />
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <TextField
              size="small" type="date" label="Send on" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
              InputLabelProps={{ shrink: true }} inputProps={{ min: todayISO() }} fullWidth
            />
            <TextField
              size="small" type="time" label="At time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
              InputLabelProps={{ shrink: true }} fullWidth
            />
          </Box>
        </Box>
        <TextField
          fullWidth size="small" label="Subject" sx={{ mt: 1.5 }}
          value={effectiveSubject}
          onChange={(e) => { setTouched(true); setSubject(e.target.value); }}
        />
        <TextField
          fullWidth label="Message" multiline minRows={6} sx={{ mt: 1.5, "& .MuiInputBase-root": { fontFamily: '"IBM Plex Sans"', fontSize: 13 } }}
          value={effectiveBody}
          onChange={(e) => { setTouched(true); setBody(e.target.value); }}
        />
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 2 }}>
          <Button size="small" variant="text" onClick={() => setPreview((v) => !v)}>{preview ? "Hide preview" : "Preview email"}</Button>
          <Typography variant="caption" color="text.secondary">SMS / call — future integration (not available in demo)</Typography>
        </Box>
        {preview && (
          <Paper variant="outlined" sx={{ mt: 1.5, p: 2, background: "#f7f9fb", fontSize: 13 }}>
            <Typography variant="caption" color="text.secondary">To: {customer ? customer.email : "—"} · Scheduled: {formatDisplay(scheduledDate)}</Typography>
            <Typography sx={{ fontWeight: 600, my: 0.5 }}>{effectiveSubject}</Typography>
            <Typography sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}>{effectiveBody}</Typography>
          </Paper>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="outlined" disabled={!invoice} onClick={() => persist("draft")}>Save draft</Button>
        <Button variant="contained" disabled={!invoice} onClick={() => persist("demo-scheduled")}>Schedule reminder (demo)</Button>
      </DialogActions>
    </Dialog>
  );
}
