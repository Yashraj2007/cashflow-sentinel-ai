import { useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Edit2, Truck, ClipboardList, Info } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { PageHeader, MetricCard, InvoiceStatusBadge, PriorityChip, RiskChip, KV, EmptyState } from "../components/common.jsx";
import InvoiceDetailDrawer from "../components/invoices/InvoiceDetailDrawer.jsx";
import SupplierDialog from "../components/suppliers/SupplierDialog.jsx";
import { outstandingPaise, purchaseInvoiceStatus, supplierDeliveryStats, supplierDeliveryRisk } from "../utils/calculations.js";
import { formatINR, formatDisplay, formatPct, daysBetween, todayISO } from "../utils/finance.js";

export default function SupplierDetailPage() {
  const { id } = useParams();
  const { dataset } = useApp();
  const today = todayISO();
  const [detailId, setDetailId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const supplier = dataset.suppliers.find((s) => s.id === id);
  const bills = useMemo(
    () => dataset.purchaseInvoices.filter((i) => i.partyId === id).sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1)),
    [dataset.purchaseInvoices, id]
  );

  if (!supplier) {
    return (
      <div className="page">
        <EmptyState
          title="Supplier not found"
          body="This supplier may belong to another demo business or has been removed."
          action={<Button component={RouterLink} to="/suppliers">Back to suppliers</Button>}
        />
      </div>
    );
  }

  const stats = supplierDeliveryStats(supplier);
  const risk = supplierDeliveryRisk(supplier);
  const open = bills.filter((i) => outstandingPaise(i) > 0);
  const payable = open.reduce((s, i) => s + outstandingPaise(i), 0);
  const priceData = (supplier.priceTrend || []).map((v, i) => ({ name: `Q${i + 1}`, index: v }));
  const deliveries = bills.filter((b) => b.deliveryPromised);

  return (
    <div className="page" style={{ position: "relative" }}>
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

      <Breadcrumbs sx={{ mb: 1.5, fontSize: 12 }}>
        <Link component={RouterLink} to="/suppliers" underline="hover" color="inherit">
          Suppliers
        </Link>
        <Typography color="text.primary" sx={{ fontSize: 12, fontWeight: 600 }}>
          {supplier.name}
        </Typography>
      </Breadcrumbs>

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
              Supplier Profile
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
            {supplier.name}
          </Typography>

          <Typography
            sx={{
              mt: 0.9,
              maxWidth: 720,
              fontSize: 12,
              lineHeight: 1.7,
              color: "rgba(239,248,242,0.77)",
            }}
          >
            {`${supplier.category ? `${supplier.category} · ` : ""}${supplier.city || "India"}${supplier.gstin ? ` · GSTIN: ${supplier.gstin}` : ""} · Terms: ${supplier.paymentTermsDays || 30} days · ${supplier.contact || supplier.name}${supplier.email ? ` (${supplier.email})` : ""}`}
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
            startIcon={<Edit2 size={14} color="#B5E7CC" />}
            onClick={() => setEditOpen(true)}
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
            Edit Details
          </Button>

          <Button
            variant="contained"
            onClick={() => setDetailId(open[0] ? open[0].id : bills[0] ? bills[0].id : null)}
            disabled={!bills.length}
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
              "&.Mui-disabled": {
                color: "rgba(255,255,255,0.35)",
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.05)",
                boxShadow: "none",
              },
            }}
          >
            Open Purchase Bills ({open.length})
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Box className="grid-4" sx={{ mb: 1.4 }}>
        <MetricCard
          label="Outstanding Payable"
          value={formatINR(payable)}
          tone={payable > 0 ? "navy" : "green"}
          note={`${open.length} open purchase bill(s)`}
        />
        <MetricCard
          label="Avg Delivery Delay"
          value={stats.available ? `${stats.avgDelay.toFixed(1)} days` : "—"}
          tone={!stats.available ? "grey" : stats.avgDelay >= 5 ? "red" : stats.avgDelay >= 2.5 ? "amber" : "green"}
          note={stats.label}
        />
        <MetricCard
          label="On-Time Delivery Rate"
          value={stats.available ? formatPct(stats.onTimeRate) : "—"}
          tone={!stats.available ? "grey" : stats.onTimeRate >= 70 ? "green" : stats.onTimeRate >= 40 ? "amber" : "red"}
          note={stats.available ? `Across ${stats.n} deliveries` : "No delivery history recorded"}
        />
        <MetricCard
          label="Delivery Reliability"
          value={<RiskChip risk={risk} />}
          tone="grey"
          note={stats.available ? "From recorded promised vs actual delivery dates" : "Cannot score without delivery history"}
        />
      </Box>

      {!stats.available && (
        <Alert severity="info" icon={<Info size={16} />} sx={{ mb: 2.5, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Delivery performance data unavailable</Typography>
          <Typography sx={{ fontSize: 11.5, color: "#475467" }}>
            Sentinel deliberately does not invent a reliability score for this supplier. Delivery performance is tracked when promised delivery dates and actual receipt dates are recorded on purchase bills.
          </Typography>
        </Alert>
      )}

      {/* Grid: Bills & Deliveries */}
      <Box className="grid-2" sx={{ alignItems: "start", mb: 2.5 }}>
        <Box className="cfs-card cfs-card--flush">
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, color: "#16232f" }}>
              Purchase Invoice History ({bills.length})
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ background: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Bill</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Payment Due</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Delivery Promised</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Priority</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 3 }}>
                      <EmptyState title="No purchase bills yet" />
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((inv) => (
                    <TableRow key={inv.id} hover sx={{ cursor: "pointer" }} onClick={() => setDetailId(inv.id)}>
                      <TableCell>
                        <Box sx={{ fontWeight: 600, fontSize: 12.5 }}>{inv.number}</Box>
                        <Box sx={{ fontSize: 12, color: "text.secondary" }}>{inv.poRef || "No PO"}</Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatINR(inv.amountPaise)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {formatDisplay(inv.dueDate)}
                        <Box sx={{ fontSize: 12, color: "text.secondary" }}>Planned: {formatDisplay(inv.plannedPaymentDate)}</Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {inv.deliveryPromised ? formatDisplay(inv.deliveryPromised) : "—"}
                        {inv.deliveryPromised && (
                          <Box sx={{ fontSize: 12, color: inv.deliveryActual ? (inv.deliveryActual > inv.deliveryPromised ? "#c04343" : "#115c3e") : "#a2700e" }}>
                            {inv.deliveryActual ? `Received: ${formatDisplay(inv.deliveryActual)}` : "Pending delivery"}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={purchaseInvoiceStatus(inv, today)} />
                      </TableCell>
                      <TableCell>
                        <PriorityChip priority={inv.priority} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box>
          <Box className="cfs-card" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, color: "#16232f", mb: 1.5 }}>
              Delivery Track Record — Promised vs Actual
            </Typography>
            {deliveries.length === 0 ? (
              <EmptyState title="No delivery dates recorded on bills" />
            ) : (
              <Table size="small">
                <TableHead sx={{ background: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Bill</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Promised</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Actual Delivery</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Variance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveries.map((b) => {
                    const late = b.deliveryActual ? daysBetween(b.deliveryPromised, b.deliveryActual) : null;
                    const pendingLate = !b.deliveryActual ? daysBetween(b.deliveryPromised, today) : null;
                    return (
                      <TableRow key={b.id}>
                        <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{b.number}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{formatDisplay(b.deliveryPromised)}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{b.deliveryActual ? formatDisplay(b.deliveryActual) : "Not yet received"}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>
                          {late !== null ? (
                            <span style={{ color: late > 1 ? "#c04343" : "#115c3e" }}>
                              {late <= 0 ? "On time" : `+${late}d delay`}
                            </span>
                          ) : pendingLate > 0 ? (
                            <span style={{ color: "#c04343" }}>+{pendingLate}d overdue</span>
                          ) : (
                            <span style={{ color: "#8b98a5" }}>On schedule</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>

          <Box className="cfs-card">
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, color: "#16232f", mb: 2 }}>
              Contact & Commercial Terms
            </Typography>
            <KV label="Contact Person">{supplier.contact || supplier.name}</KV>
            <KV label="Email">{supplier.email || "—"}</KV>
            <KV label="Phone">{supplier.phone || "—"}</KV>
            <KV label="Agreed Credit Terms">{supplier.paymentTermsDays || 30} days</KV>
            <KV label="Category">{supplier.category || "General Vendor"}</KV>
            <Box sx={{ mt: 2, p: 1.75, borderRadius: 2, background: "#f8fafc", border: "1px solid #e4e8ed" }}>
              <Typography sx={{ fontSize: 12, color: "#516170" }}>
                ℹ️ <strong>Cash-flow rule:</strong> Supplier payments appear in your forecast on their planned payment dates. Delaying a <strong>critical</strong> input supplier is blocked in Scenario Lab to avoid disrupting customer commitments.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Drawers & Modals */}
      {detailId && (
        <InvoiceDetailDrawer
          type="purchase"
          invoiceId={detailId}
          open={!!detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      {editOpen && (
        <SupplierDialog
          open={editOpen}
          supplier={supplier}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
