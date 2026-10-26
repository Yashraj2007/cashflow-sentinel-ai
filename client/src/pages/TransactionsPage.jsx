import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import GlobalStyles from "@mui/material/GlobalStyles";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TablePagination from "@mui/material/TablePagination";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Chip from "@mui/material/Chip";
import SearchIcon from "@mui/icons-material/Search";
import { ArrowLeftRight, Download, Plus, UploadCloud } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { StatusBadge, CSVExportButton, EmptyState, MetricCard } from "../components/common.jsx";
import { downloadCSV } from "../utils/csv.js";
import { formatINR, formatDisplay, todayISO, rupeesToPaise, addDaysISO } from "../utils/finance.js";
import TransactionImportWizard from "../components/transactions/TransactionImportWizard.jsx";

const CATEGORIES = ["cash-sales", "invoice-receipt", "supplier-payment", "salary", "rent", "utilities", "loan-emi", "tax", "inventory", "marketing", "operating", "financing"];

export default function TransactionsPage() {
  const { dataset, dispatch, toast } = useApp();
  const today = todayISO();
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState(addDaysISO(today, -45));
  const [to, setTo] = useState(addDaysISO(today, 90));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ label: "", category: "operating", direction: "out", amount: "", date: addDaysISO(today, 7), status: "confirmed" });

  const rows = useMemo(() => {
    let list = [...dataset.transactions];
    if (search.trim()) list = list.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()));
    if (direction) list = list.filter((t) => t.direction === direction);
    if (category) list = list.filter((t) => t.category === category);
    if (status) list = list.filter((t) => t.status === status);
    list = list.filter((t) => t.date >= from && t.date <= to);
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    return list;
  }, [dataset.transactions, search, direction, category, status, from, to]);

  const paged = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalIn = rows.filter((r) => r.direction === "in").reduce((s, r) => s + r.amountPaise, 0);
  const totalOut = rows.filter((r) => r.direction === "out").reduce((s, r) => s + r.amountPaise, 0);

  const exportRows = useMemo(
    () =>
      rows.map((t) => ({
        date: t.date,
        label: t.label,
        category: t.category,
        direction: t.direction,
        amount: t.amountPaise / 100,
        status: t.status,
      })),
    [rows]
  );

  const submit = () => {
    if (!form.label.trim() || !(Number(form.amount) > 0)) { toast("Label and a positive amount are required", "error"); return; }
    dispatch({
      type: "ADD_TRANSACTION",
      transaction: {
        id: `tx-u-${Date.now()}`, date: form.date, label: form.label.trim(), category: form.category,
        direction: form.direction, amountPaise: rupeesToPaise(Number(form.amount)), status: form.status,
      },
    });
    toast(form.status === "actual" ? "Transaction recorded" : "Committed transaction added — forecast updated");
    setAddOpen(false);
    setForm({ label: "", category: "operating", direction: "out", amount: "", date: addDaysISO(today, 7), status: "confirmed" });
  };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="page"
      sx={{
        position: "relative",
        "& .cfs-card": {
          transition: "all 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          "&:hover": {
            borderColor: "rgba(16, 185, 129, 0.24)",
            boxShadow:
              "0 10px 28px -6px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(16, 185, 129, 0.12)",
            transform: "translateY(-2px)",
          },
        },
      }}
    >
      <GlobalStyles
        styles={{
          "@keyframes cfs-breathe": {
            "0%,100%": { opacity: 0.42, transform: "scale(0.97)" },
            "50%": { opacity: 0.68, transform: "scale(1.03)" },
          },
        }}
      />

      {/* Ambient background glow */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          zIndex: 0,
          pointerEvents: "none",
          width: { xs: 240, md: 430 },
          height: { xs: 240, md: 430 },
          top: -160,
          right: { xs: -120, md: -80 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(74,158,122,0.18) 0%, rgba(74,158,122,0.035) 48%, transparent 72%)",
          filter: "blur(36px)",
          animation: "cfs-breathe 10s ease-in-out infinite",
        }}
      />

      {/* Branded hero header matching PurchaseInvoicesPage and Dashboard */}
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
              <ArrowLeftRight size={13} color="#B5E7CC" />
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
              Ledger Register
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
            Transactions
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
            Every recorded cash movement plus committed future spend (salaries, rent, EMIs, tax). Future rows feed the forecast until the day they become actual.
          </Typography>
        </Box>

        {/* Action buttons on right side */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.1,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Download size={14} color="#B5E7CC" />}
            disabled={exportRows.length === 0}
            onClick={() =>
              downloadCSV("transactions.csv", exportRows, [
                { key: "date" },
                { key: "label" },
                { key: "category" },
                { key: "direction" },
                { key: "amount" },
                { key: "status" },
              ])
            }
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12.5,
              borderRadius: "13px",
              minHeight: 38,
              px: 1.6,
              border: "1px solid rgba(255,255,255,0.2)",
              bgcolor: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              color: "#FFFFFF",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.15)",
                borderColor: "rgba(181,231,204,0.55)",
                transform: "translateY(-1px)",
              },
              "&.Mui-disabled": {
                color: "rgba(255,255,255,0.35)",
                borderColor: "rgba(255,255,255,0.08)",
                bgcolor: "rgba(255,255,255,0.03)",
              },
            }}
          >
            Export CSV
          </Button>

          {/* ── Import CSV button — opens the TransactionImportWizard ── */}
          <Button
            variant="outlined"
            startIcon={<UploadCloud size={14} color="#B5E7CC" />}
            onClick={() => setImportOpen(true)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12.5,
              borderRadius: "13px",
              minHeight: 38,
              px: 1.6,
              border: "1px solid rgba(181,231,204,0.45)",
              bgcolor: "rgba(181,231,204,0.10)",
              backdropFilter: "blur(12px)",
              color: "#B5E7CC",
              "&:hover": {
                bgcolor: "rgba(181,231,204,0.22)",
                borderColor: "rgba(181,231,204,0.75)",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 14px rgba(78,186,147,0.25)",
              },
            }}
          >
            Import CSV
          </Button>

          <Button
            variant="contained"
            startIcon={<Plus size={15} />}
            onClick={() => setAddOpen(true)}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              fontSize: 12.5,
              borderRadius: "13px",
              minHeight: 38,
              px: 2,
              color: "#082115",
              background: "linear-gradient(135deg, #70D6B1 0%, #4EBA93 100%)",
              boxShadow: "0 8px 18px rgba(78, 186, 147, 0.35)",
              "&:hover": {
                background: "linear-gradient(135deg, #81E2BE 0%, #5BC9A1 100%)",
                boxShadow: "0 10px 22px rgba(78, 186, 147, 0.45)",
                transform: "translateY(-1px)",
              },
            }}
          >
            Add transaction
          </Button>
        </Box>
      </Box>

      <Box className="grid-3" sx={{ mb: 1.4 }}>
        <MetricCard label="In range — inflows" value={formatINR(totalIn)} tone="green" note={`${rows.filter((r) => r.direction === "in").length} receipts`} />
        <MetricCard label="In range — outflows" value={formatINR(totalOut)} tone="amber" note={`${rows.filter((r) => r.direction === "out").length} payments`} />
        <MetricCard label="Net movement" value={formatINR(totalIn - totalOut, { withSign: true, compact: true })} tone={totalIn - totalOut >= 0 ? "green" : "red"} note="Inflows minus outflows for the selected filter range." />
      </Box>

      <Box className="cfs-card cfs-card--flush drift-wall">
        <Box sx={{ p: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <TextField size="small" placeholder="Search label…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ width: { xs: "100%", sm: 220 } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> } }} />
          <TextField select size="small" label="Direction" value={direction} onChange={(e) => { setDirection(e.target.value); setPage(0); }} sx={{ minWidth: 110 }}>
            <MenuItem value="">Both</MenuItem><MenuItem value="in">In</MenuItem><MenuItem value="out">Out</MenuItem>
          </TextField>
          <TextField select size="small" label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 120 }}>
            <MenuItem value="">Any</MenuItem><MenuItem value="actual">Actual</MenuItem><MenuItem value="confirmed">Confirmed</MenuItem><MenuItem value="expected">Expected</MenuItem>
          </TextField>
          <TextField size="small" type="date" label="From" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="To" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} slotProps={{ inputLabel: { shrink: true } }} />
          <Box sx={{ flex: 1 }} />
          <CSVExportButton filename="transactions.csv" rows={rows.map((t) => ({ date: t.date, label: t.label, category: t.category, direction: t.direction, amount: t.amountPaise / 100, status: t.status }))} columns={[{ key: "date" }, { key: "label" }, { key: "category" }, { key: "direction" }, { key: "amount" }, { key: "status" }]} />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell><TableCell>Description</TableCell><TableCell>Category</TableCell><TableCell>Status</TableCell><TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.length === 0 && <TableRow><TableCell colSpan={5}><EmptyState title="No transactions in range" body="Widen the date range or clear filters." /></TableCell></TableRow>}
              {paged.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 600 }}>{formatDisplay(t.date)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{t.label}{t.optional ? <Chip size="small" label="optional" sx={{ ml: 1, height: 17, fontSize: 11.8 }} /> : null}</TableCell>
                  <TableCell><Chip size="small" variant="outlined" label={t.category} sx={{ height: 19, fontSize: 11.8 }} /></TableCell>
                  <TableCell>
                    <StatusBadge tone={t.status === "actual" ? "green" : t.status === "confirmed" ? "navy" : "amber"} label={t.status} dot={false} />
                  </TableCell>
                  <TableCell align="right">
                    <span className={`amount-cell ${t.direction === "in" ? "text-pos" : "text-neg"}`} style={{ fontWeight: 600 }}>
                      {formatINR(t.amountPaise, { withSign: true })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={rows.length} page={page} onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[15, 30, 60]} />
      </Box>

      {/* Transaction CSV Import Wizard */}
      <TransactionImportWizard open={importOpen} onClose={() => setImportOpen(false)} />

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Add transaction</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gap: 1.5, mt: 0.5 }}>
            <TextField size="small" label="Description *" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Diwali bonus payout" />
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField select size="small" label="Direction" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} fullWidth>
                <MenuItem value="in">Money in</MenuItem><MenuItem value="out">Money out</MenuItem>
              </TextField>
              <TextField size="small" label="Amount (₹) *" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} slotProps={{ htmlInput: { min: 0 } }} fullWidth />
            </Box>
            <TextField select size="small" label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField size="small" type="date" label="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField select size="small" label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} fullWidth>
                <MenuItem value="actual">Actual (already happened)</MenuItem>
                <MenuItem value="confirmed">Confirmed (committed)</MenuItem>
                <MenuItem value="expected">Expected (estimate)</MenuItem>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
