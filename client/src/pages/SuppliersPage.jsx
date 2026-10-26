import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import GlobalStyles from "@mui/material/GlobalStyles";
import SearchIcon from "@mui/icons-material/Search";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { UserPlus, UploadCloud, Truck, AlertTriangle, ShieldCheck, ClipboardList, Download } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { PageHeader, RiskChip, CSVExportButton, EmptyState, MetricCard } from "../components/common.jsx";
import { downloadCSV } from "../utils/csv.js";
import SupplierDialog from "../components/suppliers/SupplierDialog.jsx";
import SupplierImportModal from "../components/suppliers/SupplierImportModal.jsx";
import { outstandingPaise, supplierDeliveryStats, supplierDeliveryRisk } from "../utils/calculations.js";
import { formatINR, formatPct, todayISO } from "../utils/finance.js";
import { SUPPLIER_CATEGORIES } from "../services/supplierService.js";

export default function SuppliersPage() {
  const { dataset } = useApp();
  const navigate = useNavigate();
  const today = todayISO();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const rows = useMemo(() => {
    let list = dataset.suppliers.map((s) => {
      const bills = dataset.purchaseInvoices.filter((i) => i.partyId === s.id);
      const open = bills.filter((i) => outstandingPaise(i) > 0);
      const stats = supplierDeliveryStats(s);
      const spent = bills.reduce((sum, i) => sum + i.amountPaise, 0);
      return {
        s,
        stats,
        risk: supplierDeliveryRisk(s),
        payable: open.reduce((sum, i) => sum + outstandingPaise(i), 0),
        openCount: open.length,
        openPOs: open.filter((i) => i.deliveryPromised && !i.deliveryActual).length,
        spent,
        lateNow: open.filter((i) => i.deliveryPromised && i.deliveryPromised < today && !i.deliveryActual).length,
      };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.s.name.toLowerCase().includes(q) ||
          (r.s.contact && r.s.contact.toLowerCase().includes(q)) ||
          (r.s.city && r.s.city.toLowerCase().includes(q))
      );
    }

    if (categoryFilter) {
      list = list.filter((r) => r.s.category === categoryFilter);
    }

    return list.sort((a, b) => b.payable - a.payable);
  }, [dataset.suppliers, dataset.purchaseInvoices, search, categoryFilter, today]);

  const pagedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const toggleSelect = (id) =>
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : sel.length >= 3 ? sel : [...sel, id]));
  const compared = rows.filter((r) => selected.includes(r.s.id));

  // Summary figures
  const totalPayable = useMemo(() => rows.reduce((sum, r) => sum + r.payable, 0), [rows]);
  const totalLateDeliveries = useMemo(() => rows.reduce((sum, r) => sum + r.lateNow, 0), [rows]);
  const totalOpenBills = useMemo(() => rows.reduce((sum, r) => sum + r.openCount, 0), [rows]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="page"
      style={{ position: "relative" }}
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

      {/* Branded hero header matching DashboardPage */}
      <Box
        className="cfs-enter"
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
              <Truck size={13} color="#B5E7CC" />
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
              Supplier Management
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
            Suppliers
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
            Track supplier payment obligations, credit terms, and delivery performance. Payment due dates and delivery arrival dates are tracked separately.
          </Typography>
        </Box>

        {/* Action buttons with frosted glass & emerald gradient */}
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
            disabled={rows.length === 0}
            onClick={() =>
              downloadCSV(
                "suppliers_export.csv",
                rows.map((r) => ({
                  supplier_name: r.s.name,
                  category: r.s.category || "",
                  city: r.s.city || "",
                  payment_terms_days: r.s.paymentTermsDays || 30,
                  payable_rupees: r.payable / 100,
                  open_bills: r.openCount,
                  avg_delivery_delay_days: r.stats.available ? r.stats.avgDelay.toFixed(1) : "",
                  on_time_delivery_pct: r.stats.available ? r.stats.onTimeRate.toFixed(0) : "",
                  delivery_risk: r.risk,
                })),
                [
                  { key: "supplier_name" },
                  { key: "category" },
                  { key: "city" },
                  { key: "payment_terms_days" },
                  { key: "payable_rupees" },
                  { key: "open_bills" },
                  { key: "avg_delivery_delay_days" },
                  { key: "on_time_delivery_pct" },
                  { key: "delivery_risk" },
                ]
              )
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
              WebkitBackdropFilter: "blur(12px)",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              transition:
                "transform 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.15)",
                borderColor: "rgba(181,231,204,0.55)",
                transform: "translateY(-1px)",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
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

          <Button
            variant="outlined"
            startIcon={<UploadCloud size={14} color="#B5E7CC" />}
            onClick={() => setImportModalOpen(true)}
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
              WebkitBackdropFilter: "blur(12px)",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              transition:
                "transform 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.15)",
                borderColor: "rgba(181,231,204,0.55)",
                transform: "translateY(-1px)",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              },
            }}
          >
            Import CSV
          </Button>

          <Button
            variant="outlined"
            startIcon={<CompareArrowsIcon sx={{ fontSize: 16, color: "#B5E7CC" }} />}
            disabled={selected.length < 2}
            onClick={() => setCompareOpen(true)}
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
              WebkitBackdropFilter: "blur(12px)",
              color: "#FFFFFF",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              transition:
                "transform 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.15)",
                borderColor: "rgba(181,231,204,0.55)",
                transform: "translateY(-1px)",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              },
              "&.Mui-disabled": {
                color: "rgba(255,255,255,0.35)",
                borderColor: "rgba(255,255,255,0.08)",
                bgcolor: "rgba(255,255,255,0.03)",
              },
            }}
          >
            Compare ({selected.length})
          </Button>

          <Button
            variant="contained"
            startIcon={<UserPlus size={15} />}
            onClick={() => setAddSupplierOpen(true)}
            sx={{
              textTransform: "none",
              fontWeight: 750,
              fontSize: 12.5,
              borderRadius: "13px",
              minHeight: 38,
              px: 1.8,
              color: "#FFFFFF",
              background: "linear-gradient(135deg, #248A63 0%, #176548 100%)",
              border: "1px solid rgba(181,231,204,0.4)",
              boxShadow: "0 8px 22px rgba(17,40,31,0.28)",
              transition:
                "transform 180ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
              "&:hover": {
                background: "linear-gradient(135deg, #2DB481 0%, #1D7A57 100%)",
                borderColor: "rgba(181,231,204,0.7)",
                transform: "translateY(-1px)",
                boxShadow: "0 10px 26px rgba(17,40,31,0.38)",
              },
            }}
          >
            Add Supplier
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Box className="grid-3" sx={{ mb: 1.4 }}>
        <MetricCard
          label="Total Payables Due"
          value={formatINR(totalPayable)}
          tone="neutral"
          note={`Across ${totalOpenBills} open purchase bills / invoices`}
        />
        <MetricCard
          label="Late Deliveries Right Now"
          value={String(totalLateDeliveries)}
          tone={totalLateDeliveries > 0 ? "red" : "green"}
          note={totalLateDeliveries > 0 ? "Purchase orders delayed past promised date" : "All promised shipments on track"}
        />
        <MetricCard
          label="Registered Vendors"
          value={String(dataset.suppliers.length)}
          tone="teal"
          note={`${rows.filter((r) => r.stats.available && r.stats.onTimeRate >= 70).length} dependable suppliers`}
        />
      </Box>

      {/* Table Card */}
      <Box className="cfs-card cfs-card--flush drift-wall">
        <Box sx={{ p: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search by supplier name, contact, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: "100%", sm: 300 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "#8b98a5" }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Supplier category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {SUPPLIER_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary">
            Select 2–3 checkboxes to compare trade-offs side by side
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ background: "#f8fafc" }}>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Supplier / Vendor</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Payable (Money Owed)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Open Bills</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Delivery Delay Performance</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>On-Time Deliveries</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Pending Shipments</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Delivery Reliability</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 4 }}>
                    <EmptyState
                      title="No suppliers found"
                      body="Try clearing your filters or click 'Add Supplier' to register a new vendor."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pagedRows.map((r) => (
                  <TableRow
                    key={r.s.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/suppliers/${r.s.id}`)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={selected.includes(r.s.id)}
                        onChange={() => toggleSelect(r.s.id)}
                        slotProps={{ input: { "aria-label": `Select ${r.s.name}` } }}
                      />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ fontWeight: 700, fontSize: 13, color: "#16232f", display: "flex", alignItems: "center", gap: 1 }}>
                        {r.s.name}
                        {r.lateNow > 0 && (
                          <Chip size="small" color="error" label={`${r.lateNow} late delivery`} sx={{ height: 18, fontSize: 11.8 }} />
                        )}
                      </Box>
                      <Box sx={{ fontSize: 11.5, color: "#6e7f8d" }}>
                        {r.s.category ? `${r.s.category} · ` : ""}{r.s.city} · terms: {r.s.paymentTermsDays || 30}d
                      </Box>
                    </TableCell>

                    <TableCell align="right">
                      <span style={{ fontWeight: 700, fontSize: 13, color: r.payable > 0 ? "#16232f" : "#8b98a5" }}>
                        {formatINR(r.payable)}
                      </span>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        size="small"
                        variant="outlined"
                        label={r.openCount}
                        sx={{ minWidth: 26, height: 20, fontSize: 12, fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell sx={{ fontSize: 12.5 }}>
                      {r.stats.available ? (
                        <Box>
                          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                            ~{r.stats.avgDelay.toFixed(1)} days delay
                          </Typography>
                          <Typography sx={{ fontSize: 11.8, color: "#6e7f8d" }}>
                            across {r.stats.n} deliveries
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 11.5, color: "#8b98a5", fontStyle: "italic" }}>
                          Delivery data unavailable
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ fontSize: 12.5 }}>
                      {r.stats.available ? (
                        <span style={{ fontWeight: 600, color: r.stats.onTimeRate >= 70 ? "#115c3e" : "#8f2f2f" }}>
                          {formatPct(r.stats.onTimeRate)} on-time
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={r.openPOs}
                        sx={{
                          height: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: r.lateNow > 0 ? "#f9e9e9" : "#f0f4f8",
                          color: r.lateNow > 0 ? "#8f2f2f" : "#516170",
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <RiskChip risk={r.risk} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Box>

      {/* Comparison Modal */}
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 17, color: "#16232f" }}>
          Supplier Trade-Off Comparison
        </DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead sx={{ background: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Evaluation Factor</TableCell>
                {compared.map((r) => (
                  <TableCell key={r.s.id} sx={{ fontWeight: 700, fontSize: 12 }}>
                    {r.s.name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Vendor Category</TableCell>
                {compared.map((r) => (
                  <TableCell key={r.s.id} sx={{ fontSize: 12 }}>
                    {r.s.category || "General Vendor"}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Delivery Reliability (On-time %)</TableCell>
                {compared.map((r) => (
                  <TableCell key={r.s.id} sx={{ fontSize: 12 }}>
                    {r.stats.available ? `${formatPct(r.stats.onTimeRate)} over ${r.stats.n} deliveries` : "Delivery performance data unavailable"}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Expected Delivery Delay</TableCell>
                {compared.map((r) => (
                  <TableCell key={r.s.id} sx={{ fontSize: 12 }}>
                    {r.stats.available ? `~${r.stats.avgDelay.toFixed(1)} days` : "—"}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Credit Payment Terms</TableCell>
                {compared.map((r) => (
                  <TableCell key={r.s.id} sx={{ fontSize: 12 }}>
                    {r.s.paymentTermsDays || 30} days
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Payable Balance (Owed Now)</TableCell>
                {compared.map((r) => (
                  <TableCell key={r.s.id} sx={{ fontSize: 12, fontWeight: 700 }}>
                    {formatINR(r.payable)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Delayed Shipments Right Now</TableCell>
                {compared.map((r) => (
                  <TableCell key={r.s.id} sx={{ fontSize: 12, color: r.lateNow > 0 ? "#c04343" : "inherit" }}>
                    {r.lateNow}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
          <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, background: "#f0fdfc", border: "1px solid #b4dcda" }}>
            <Typography sx={{ fontSize: 12, color: "#0b4e4c" }}>
              💡 <strong>Fintech guidance:</strong> A cheaper vendor with 7-day average delivery delays can cost more in stalled production and delayed customer receipts than the upfront material savings. Compare delivery reliability when ordering critical inputs.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCompareOpen(false)} color="inherit" sx={{ textTransform: "none", fontSize: 13 }}>
            Close Comparison
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Supplier Modal */}
      <SupplierDialog
        open={addSupplierOpen}
        onClose={() => setAddSupplierOpen(false)}
      />

      {/* Import Supplier Modal */}
      <SupplierImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </motion.div>
  );
}
