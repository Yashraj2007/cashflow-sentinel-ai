import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  Wallet, Building2, Zap, Landmark, FileText,
  TrendingUp, Laptop, Truck, Plus, Edit2, Trash2,
  AlertTriangle, CheckCircle2, ShieldCheck, ArrowRight, DollarSign
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { PageHeader, MetricCard, EmptyState, ConfirmDialog } from "../components/common.jsx";
import ExpenseDialog from "../components/expenses/ExpenseDialog.jsx";
import { formatINR, formatDisplay, todayISO, addDaysISO, rupeesToPaise } from "../utils/finance.js";
import { simulateWithdrawalImpact } from "../services/expenseService.js";

export default function ExpensesPage() {
  const { dataset, forecast, settings, dispatch, toast } = useApp();
  const today = todayISO();

  const [tab, setTab] = useState(0);
  const [expenseDialog, setExpenseDialog] = useState({ open: false, mode: "recurring", expense: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, label: "" });

  const recurringList = useMemo(() => dataset.recurringExpenses || [], [dataset.recurringExpenses]);

  // Monthly fixed operating burn (excluding owner personal drawings)
  const monthlyFixedBurn = useMemo(
    () =>
      recurringList
        .filter((e) => e.active && !e.isOwner && e.category !== "owner-draw")
        .reduce((sum, e) => sum + e.amountPaise, 0),
    [recurringList]
  );

  // Planned owner drawings in the next 30 days
  const ownerDrawings = useMemo(() => {
    return (dataset.transactions || [])
      .filter((t) => t.category === "owner-draw" || t.isOwnerDraw)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [dataset.transactions]);

  const upcomingDraws = useMemo(
    () => ownerDrawings.filter((d) => d.date >= today && d.date <= addDaysISO(today, 30)),
    [ownerDrawings, today]
  );
  const totalUpcomingDraws = useMemo(
    () => upcomingDraws.reduce((s, d) => s + d.amountPaise, 0),
    [upcomingDraws]
  );

  // Variable one-time expenses in transactions
  const variableExpenses = useMemo(() => {
    return (dataset.transactions || [])
      .filter(
        (t) =>
          t.direction === "out" &&
          t.category !== "owner-draw" &&
          t.category !== "invoice-receipt" &&
          t.category !== "supplier-payment" &&
          t.ref?.kind !== "purchase-invoice"
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [dataset.transactions]);

  const upcoming30DayOutflows = useMemo(
    () =>
      (dataset.transactions || [])
        .filter((t) => t.direction === "out" && t.date >= today && t.date <= addDaysISO(today, 30))
        .reduce((sum, t) => sum + t.amountPaise, 0),
    [dataset.transactions, today]
  );

  const reserveBuffer = Math.max(0, dataset.currentCashPaise - settings.minReservePaise);

  const handleToggleActive = (id, label, active) => {
    dispatch({ type: "TOGGLE_RECURRING_EXPENSE", id });
    toast(`${label} ${active ? "paused (omitted from forecast)" : "resumed"}`, "info");
  };

  const handleDeleteExpense = () => {
    if (!deleteConfirm.id) return;
    dispatch({ type: "DELETE_RECURRING_EXPENSE", id: deleteConfirm.id });
    toast(`Expense "${deleteConfirm.label}" removed from recurring schedule.`, "success");
    setDeleteConfirm({ open: false, id: null, label: "" });
  };

  return (
    <div className="page">
      <PageHeader
        kicker="Cash Outflows & Overheads"
        title="Expenses & Owner Withdrawals"
        description="Manage fixed monthly commitments (salaries, rent, loan EMIs), variable operational spend, and planned owner personal drawings with cash reserve breach protection."
        actions={
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<Wallet size={15} />}
              onClick={() => setExpenseDialog({ open: true, mode: "withdrawal", expense: null })}
              sx={{ textTransform: "none", fontSize: 13 }}
            >
              Plan Owner Draw
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setExpenseDialog({ open: true, mode: "recurring", expense: null })}
              sx={{ textTransform: "none", fontSize: 13, background: "#0f8a84", "&:hover": { background: "#0b6b66" } }}
            >
              Add Expense
            </Button>
          </Box>
        }
      />

      {/* KPI Cards */}
      <Box className="grid-4" sx={{ mb: 1.4 }}>
        <MetricCard
          label="Monthly Fixed Burn"
          value={formatINR(monthlyFixedBurn)}
          tone="navy"
          note="Salaries, rent, EMIs & utilities overheads"
        />
        <MetricCard
          label="Upcoming 30-Day Outflows"
          value={formatINR(upcoming30DayOutflows)}
          tone="amber"
          note="All scheduled payments & supplier bills"
        />
        <MetricCard
          label="Planned Owner Drawings"
          value={formatINR(totalUpcomingDraws)}
          tone="teal"
          note={`${upcomingDraws.length} personal draw(s) scheduled in 30d`}
        />
        <MetricCard
          label="Cash Reserve Buffer"
          value={formatINR(reserveBuffer)}
          tone={reserveBuffer > 0 ? "green" : "red"}
          note={`Buffer above ${formatINR(settings.minReservePaise)} safety reserve`}
        />
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: 13.5 } }}
        >
          <Tab label="Fixed Recurring Overheads" icon={<Building2 size={16} />} iconPosition="start" />
          <Tab label="Owner Personal Withdrawals" icon={<Wallet size={16} />} iconPosition="start" />
          <Tab label="Variable & One-Time Spend" icon={<DollarSign size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* TAB 0: Fixed Recurring Overheads */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 15, color: "#16232f" }}>
                Recurring Monthly Commitments
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>
                Active recurring expenses automatically appear in future cash-flow projections on their scheduled dates.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Plus size={14} />}
              onClick={() => setExpenseDialog({ open: true, mode: "recurring", expense: null })}
              sx={{ textTransform: "none", fontSize: 12.5 }}
            >
              Add Commitment
            </Button>
          </Box>

          <TableContainer sx={{ border: "1px solid #e4e8ed", borderRadius: 2.5, background: "#fff" }}>
            <Table size="small">
              <TableHead sx={{ background: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Expense Purpose</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Recurrence</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Next Due Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Monthly Amount</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Forecast Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recurringList.filter((e) => !e.isOwner && e.category !== "owner-draw").length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 4 }}>
                      <EmptyState
                        title="No recurring expenses configured"
                        body="Add fixed overheads such as rent, salaries, or EMIs to build your baseline forecast."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  recurringList
                    .filter((e) => !e.isOwner && e.category !== "owner-draw")
                    .map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontSize: 13, fontWeight: 700, color: "#16232f" }}>
                          {item.label}
                          {item.notes && (
                            <Box sx={{ fontSize: 12, color: "#6e7f8d", fontWeight: 400 }}>{item.notes}</Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.category}
                            size="small"
                            sx={{ height: 20, fontSize: 11.8, textTransform: "capitalize" }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {item.frequency || "Monthly"} · Day {item.dayOfMonth || 1}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {formatDisplay(item.nextDueDate || today)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700, color: "#8f2f2f" }}>
                          {formatINR(item.amountPaise)}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={item.active ? "Pause this recurring expense" : "Resume this expense in forecast"}>
                            <Switch
                              size="small"
                              checked={Boolean(item.active)}
                              onChange={() => handleToggleActive(item.id, item.label, item.active)}
                              color="success"
                            />
                          </Tooltip>
                          <Typography sx={{ fontSize: 11.8, color: item.active ? "#115c3e" : "#8b98a5", fontWeight: 600 }}>
                            {item.active ? "Active" : "Paused"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit expense details">
                            <IconButton
                              size="small"
                              onClick={() => setExpenseDialog({ open: true, mode: "recurring", expense: item })}
                            >
                              <Edit2 size={15} color="#516170" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete expense">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteConfirm({ open: true, id: item.id, label: item.label })}
                              sx={{ color: "#c04343" }}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: Owner Personal Withdrawals */}
      {tab === 1 && (
        <Box>
          {/* Transparent guidance banner */}
          <Alert severity="info" icon={<ShieldCheck size={18} />} sx={{ mb: 3, borderRadius: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              Business vs Personal Financial Separation
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#475467" }}>
              A personal withdrawal reduces available business cash, but CashFlow Sentinel does <strong>not</strong> treat it as an operational expense for business margin calculations. This lets you plan your drawings safely while keeping commercial profit figures accurate.
            </Typography>
          </Alert>

          <Box className="grid-2" sx={{ mb: 3, alignItems: "start" }}>
            {/* Quick Draw Planner Card */}
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid #b4dcda",
                background: "linear-gradient(135deg, #f0fdfc 0%, #e6f7f5 100%)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, background: "#0f8a84", display: "grid", placeItems: "center" }}>
                  <Wallet size={20} color="#fff" />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#16232f" }}>
                    Schedule Personal Withdrawal
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#516170" }}>
                    Simulate drawing money for personal use
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontSize: 12.5, color: "#516170", mb: 2.5, lineHeight: 1.5 }}>
                Enter the amount you wish to take out. Sentinel simulates whether taking this draw leaves enough cash buffer for supplier bills and staff salaries over the next 14–30 days.
              </Typography>

              <Button
                variant="contained"
                startIcon={<Wallet size={15} />}
                onClick={() => setExpenseDialog({ open: true, mode: "withdrawal", expense: null })}
                sx={{ textTransform: "none", fontSize: 13, background: "#0f8a84", "&:hover": { background: "#0b6b66" } }}
              >
                Plan a New Withdrawal
              </Button>
            </Box>

            {/* Current Safe Draw Buffer */}
            <Box sx={{ p: 3, borderRadius: 3, border: "1px solid #e4e8ed", background: "#fff" }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: "#16232f", mb: 1 }}>
                Safe Personal Drawing Capacity
              </Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: reserveBuffer > 0 ? "#115c3e" : "#c04343", mb: 0.5 }}>
                {formatINR(reserveBuffer)}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#6e7f8d", mb: 2 }}>
                Available cash above your business minimum reserve target ({formatINR(settings.minReservePaise)}).
              </Typography>

              <Alert
                severity={reserveBuffer > 0 ? "success" : "warning"}
                icon={reserveBuffer > 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                sx={{ borderRadius: 2, fontSize: 12 }}
              >
                {reserveBuffer > 0
                  ? "You have a comfortable buffer above the target reserve."
                  : "Cash is currently at or below minimum reserve target. Personal withdrawals are not recommended without incoming customer receipts."}
              </Alert>
            </Box>
          </Box>

          {/* Withdrawals Table */}
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: "#16232f", mb: 1.5 }}>
            Planned & Recorded Drawings
          </Typography>
          <TableContainer sx={{ border: "1px solid #e4e8ed", borderRadius: 2.5, background: "#fff" }}>
            <Table size="small">
              <TableHead sx={{ background: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Label / Narration</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Classification</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Amount Withdrawn</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ownerDrawings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 3 }}>
                      <EmptyState
                        title="No owner withdrawals recorded"
                        body="Click 'Plan Owner Draw' to simulate taking funds for personal expenses."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  ownerDrawings.map((draw) => (
                    <TableRow key={draw.id} hover>
                      <TableCell sx={{ fontSize: 12.5 }}>{formatDisplay(draw.date)}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{draw.label}</TableCell>
                      <TableCell>
                        <Chip
                          label="Personal Drawings"
                          size="small"
                          sx={{ height: 20, fontSize: 11.8, background: "#faf1dc", color: "#6b4a08" }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700, color: "#8f2f2f" }}>
                        {formatINR(draw.amountPaise)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={draw.date <= today ? "Withdrawn" : "Planned in Forecast"}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 11.8,
                            fontWeight: 600,
                            background: draw.date <= today ? "#e4f2ea" : "#e4f2f1",
                            color: draw.date <= today ? "#115c3e" : "#0b4e4c",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 2: Variable & One-Time Spend */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 15, color: "#16232f" }}>
                Variable & Discretionary Operational Costs
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>
                Ad-hoc maintenance, transport, logistics, and marketing spend.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Plus size={14} />}
              onClick={() => setExpenseDialog({ open: true, mode: "one-time", expense: null })}
              sx={{ textTransform: "none", fontSize: 12.5 }}
            >
              Add One-Time Cost
            </Button>
          </Box>

          <TableContainer sx={{ border: "1px solid #e4e8ed", borderRadius: 2.5, background: "#fff" }}>
            <Table size="small">
              <TableHead sx={{ background: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Category</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {variableExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 3 }}>
                      <EmptyState title="No variable expenses recorded" />
                    </TableCell>
                  </TableRow>
                ) : (
                  variableExpenses.slice(0, 15).map((exp) => (
                    <TableRow key={exp.id} hover>
                      <TableCell sx={{ fontSize: 12.5 }}>{formatDisplay(exp.date)}</TableCell>
                      <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{exp.label}</TableCell>
                      <TableCell>
                        <Chip
                          label={exp.category}
                          size="small"
                          sx={{ height: 20, fontSize: 11.8, textTransform: "capitalize" }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 13, fontWeight: 700, color: "#8f2f2f" }}>
                        {formatINR(exp.amountPaise)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={exp.date <= today ? "Settled" : "Committed"}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 11.8,
                            fontWeight: 600,
                            background: exp.date <= today ? "#e4f2ea" : "#faf1dc",
                            color: exp.date <= today ? "#115c3e" : "#6b4a08",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Expense Modal */}
      <ExpenseDialog
        open={expenseDialog.open}
        initialMode={expenseDialog.mode}
        expense={expenseDialog.expense}
        onClose={() => setExpenseDialog({ open: false, mode: "recurring", expense: null })}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Remove Recurring Expense?"
        body={`Are you sure you want to delete "${deleteConfirm.label}"? This will also remove any un-settled future occurrences from the cash forecast.`}
        confirmLabel="Delete Expense"
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteConfirm({ open: false, id: null, label: "" })}
      />
    </div>
  );
}
