import { useState, useEffect, useMemo } from "react";
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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import InputAdornment from "@mui/material/InputAdornment";
import {
  Wallet, Building2, AlertTriangle, CheckCircle2,
  Calendar, ShieldCheck, DollarSign, Info
} from "lucide-react";
import { useApp } from "../../context/AppContext.jsx";
import {
  EXPENSE_CATEGORIES,
  RECURRENCE_OPTIONS,
  simulateWithdrawalImpact,
} from "../../services/expenseService.js";
import { rupeesToPaise, paiseToRupees, formatINR, todayISO, addDaysISO } from "../../utils/finance.js";

export default function ExpenseDialog({ open, onClose, initialMode = "recurring", expense = null }) {
  const { dataset, forecast, settings, dispatch, toast } = useApp();
  const isEdit = Boolean(expense?.id);
  const today = todayISO();

  const [mode, setMode] = useState(initialMode); // "recurring" | "one-time" | "withdrawal"
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("salary");
  const [amountRupees, setAmountRupees] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("5");
  const [date, setDate] = useState(addDaysISO(today, 7));
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (expense) {
      setLabel(expense.label || "");
      setCategory(expense.category || "operating");
      setAmountRupees(expense.amountPaise ? String(paiseToRupees(expense.amountPaise)) : "");
      setFrequency(expense.frequency || "monthly");
      setDayOfMonth(String(expense.dayOfMonth || 5));
      setDate(expense.nextDueDate || expense.date || addDaysISO(today, 7));
      setNotes(expense.notes || "");
      if (expense.isOwner || expense.category === "owner-draw") setMode("withdrawal");
      else if (expense.frequency) setMode("recurring");
      else setMode("one-time");
    } else {
      setMode(initialMode);
      if (initialMode === "withdrawal") {
        setLabel("Planned Owner Personal Draw");
        setCategory("owner-draw");
      } else {
        setLabel("");
        setCategory("salary");
      }
      setAmountRupees("");
      setFrequency("monthly");
      setDayOfMonth("5");
      setDate(addDaysISO(today, 7));
      setNotes("");
    }
    setErrors({});
  }, [expense, initialMode, open, today]);

  // Live simulation for owner personal drawings
  const withdrawalSimulation = useMemo(() => {
    if (mode !== "withdrawal") return null;
    const num = Number(amountRupees);
    if (!Number.isFinite(num) || num <= 0) return null;
    return simulateWithdrawalImpact(forecast, rupeesToPaise(num), date);
  }, [mode, amountRupees, date, forecast]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!label.trim()) newErrors.label = "Description / Label is required";
    const amt = Number(amountRupees);
    if (!Number.isFinite(amt) || amt <= 0) newErrors.amount = "Enter a valid positive amount";

    if (mode === "recurring") {
      const day = Number(dayOfMonth);
      if (!Number.isFinite(day) || day < 1 || day > 31) newErrors.dayOfMonth = "Day of month must be between 1 and 31";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const amountPaise = rupeesToPaise(amt);

    if (mode === "withdrawal") {
      dispatch({
        type: "RECORD_OWNER_WITHDRAWAL",
        label: label.trim(),
        amountPaise,
        date,
        notes: notes.trim(),
      });
      toast(`Planned owner withdrawal of ${formatINR(amountPaise)} recorded.`, "success");
    } else if (mode === "recurring") {
      if (isEdit) {
        dispatch({
          type: "UPDATE_RECURRING_EXPENSE",
          id: expense.id,
          patch: {
            label: label.trim(),
            category,
            amountPaise,
            frequency,
            dayOfMonth: Number(dayOfMonth),
            nextDueDate: date,
            notes: notes.trim(),
          },
        });
        toast(`Recurring expense "${label.trim()}" updated.`, "success");
      } else {
        const newExpense = {
          id: `rec-${Date.now()}`,
          label: label.trim(),
          category,
          amountPaise,
          frequency,
          dayOfMonth: Number(dayOfMonth),
          nextDueDate: date,
          active: true,
          isOwner: false,
          notes: notes.trim(),
        };
        dispatch({
          type: "ADD_RECURRING_EXPENSE",
          expense: newExpense,
        });
        toast(`Recurring commitment "${label.trim()}" added to cash forecast.`, "success");
      }
    } else {
      // One-time variable expense
      dispatch({
        type: "ADD_TRANSACTION",
        transaction: {
          id: `tx-exp-${Date.now()}`,
          date,
          label: label.trim(),
          category,
          direction: "out",
          amountPaise,
          status: date <= today ? "actual" : "confirmed",
          ref: { kind: "variable-expense" },
          notes: notes.trim(),
        },
      });
      toast(`One-time expense of ${formatINR(amountPaise)} scheduled on ${date}.`, "success");
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, background: mode === "withdrawal" ? "#faf1dc" : "#e4f2f1", display: "grid", placeItems: "center" }}>
            {mode === "withdrawal" ? <Wallet size={18} color="#a2700e" /> : <Building2 size={18} color="#0f8a84" />}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#16232f" }}>
              {isEdit ? "Edit Expense" : mode === "withdrawal" ? "Plan Owner Personal Withdrawal" : "Add Expense Commitment"}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>
              {mode === "withdrawal"
                ? "Simulate personal drawings without affecting business operating margins"
                : "Record fixed monthly overheads or one-time variable costs"}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          {/* Mode Selector */}
          {!isEdit && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(_, v) => {
                  if (v) {
                    setMode(v);
                    if (v === "withdrawal") {
                      setCategory("owner-draw");
                      setLabel("Planned Owner Personal Draw");
                    } else if (category === "owner-draw") {
                      setCategory("salary");
                      setLabel("");
                    }
                  }
                }}
                size="small"
                sx={{ background: "#f5f7fa" }}
              >
                <ToggleButton value="recurring" sx={{ px: 2, fontSize: 12, fontWeight: 700, textTransform: "none" }}>
                  Fixed Recurring
                </ToggleButton>
                <ToggleButton value="one-time" sx={{ px: 2, fontSize: 12, fontWeight: 700, textTransform: "none" }}>
                  Variable One-Time
                </ToggleButton>
                <ToggleButton value="withdrawal" sx={{ px: 2, fontSize: 12, fontWeight: 700, textTransform: "none" }}>
                  Owner Personal Draw
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Description / Purpose"
              required
              fullWidth
              size="small"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (errors.label) setErrors({ ...errors, label: null });
              }}
              error={Boolean(errors.label)}
              helperText={errors.label}
              placeholder={mode === "withdrawal" ? "e.g. Owner monthly personal draw" : "e.g. Warehouse Rent, Staff Salaries"}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Amount (₹)"
                required
                fullWidth
                size="small"
                type="number"
                value={amountRupees}
                onChange={(e) => {
                  setAmountRupees(e.target.value);
                  if (errors.amount) setErrors({ ...errors, amount: null });
                }}
                error={Boolean(errors.amount)}
                helperText={errors.amount}
                placeholder="e.g. 50000"
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  },
                }}
              />

              {mode === "withdrawal" ? (
                <TextField
                  label="Category"
                  fullWidth
                  size="small"
                  disabled
                  value="Owner Personal Withdrawal"
                />
              ) : (
                <TextField
                  select
                  label="Expense Category"
                  fullWidth
                  size="small"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.filter((c) => !c.isOwner).map((cat) => (
                    <MenuItem key={cat.key} value={cat.key}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>

            {mode === "recurring" && (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField
                  select
                  label="Recurrence Frequency"
                  fullWidth
                  size="small"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  {RECURRENCE_OPTIONS.map((rec) => (
                    <MenuItem key={rec.value} value={rec.value}>
                      {rec.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Due Day of Month"
                  type="number"
                  fullWidth
                  size="small"
                  value={dayOfMonth}
                  onChange={(e) => {
                    setDayOfMonth(e.target.value);
                    if (errors.dayOfMonth) setErrors({ ...errors, dayOfMonth: null });
                  }}
                  error={Boolean(errors.dayOfMonth)}
                  helperText={errors.dayOfMonth || "Day between 1 and 31"}
                />
              </Box>
            )}

            <TextField
              label={mode === "recurring" ? "Next Scheduled Date" : "Expense / Withdrawal Date"}
              type="date"
              fullWidth
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            {/* Owner personal withdrawal simulation warning */}
            {mode === "withdrawal" && withdrawalSimulation && (
              <Box>
                {withdrawalSimulation.wouldGoNegative ? (
                  <Alert severity="error" icon={<AlertTriangle size={18} />} sx={{ borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Critical Cash Shortage Risk</Typography>
                    <Typography sx={{ fontSize: 11.5 }}>
                      This withdrawal of <strong>{formatINR(rupeesToPaise(Number(amountRupees)))}</strong> on {date} would push your projected cash balance negative to <strong>{formatINR(withdrawalSimulation.balanceAfterWithdrawal)}</strong>.
                    </Typography>
                  </Alert>
                ) : withdrawalSimulation.wouldBreachReserve ? (
                  <Alert severity="warning" icon={<AlertTriangle size={18} />} sx={{ borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Minimum Cash Reserve Breach</Typography>
                    <Typography sx={{ fontSize: 11.5 }}>
                      This withdrawal leaves your projected cash at <strong>{formatINR(withdrawalSimulation.balanceAfterWithdrawal)}</strong>, which is <strong>{formatINR(withdrawalSimulation.gapToReserve)}</strong> below your business reserve target ({formatINR(settings.minReservePaise)}).
                    </Typography>
                    {withdrawalSimulation.upcomingCommitmentsNearDate > 0 && (
                      <Typography sx={{ fontSize: 12, mt: 0.5, color: "#8f2f2f" }}>
                        Note: You have {formatINR(withdrawalSimulation.upcomingCommitmentsNearDate)} in upcoming supplier/salary bills within 7 days of this date.
                      </Typography>
                    )}
                  </Alert>
                ) : (
                  <Alert severity="success" icon={<CheckCircle2 size={18} />} sx={{ borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Withdrawal appears safe</Typography>
                    <Typography sx={{ fontSize: 11.5 }}>
                      Projected cash after withdrawal remains at <strong>{formatINR(withdrawalSimulation.balanceAfterWithdrawal)}</strong> (well above your {formatINR(settings.minReservePaise)} reserve).
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}

            <TextField
              label="Notes"
              multiline
              rows={2}
              fullWidth
              size="small"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal reminders, contract reference, payment instructions..."
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button onClick={onClose} color="inherit" sx={{ textTransform: "none", fontSize: 13 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={{
              textTransform: "none",
              fontSize: 13,
              background: mode === "withdrawal" ? "#0f8a84" : "#132433",
              "&:hover": { background: mode === "withdrawal" ? "#0b6b66" : "#0d1b26" },
            }}
          >
            {isEdit
              ? "Save Changes"
              : mode === "withdrawal"
              ? "Confirm & Record Drawing"
              : "Save Expense"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
