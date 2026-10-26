import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Chip from "@mui/material/Chip";
import {
  SlidersHorizontal,
  Save,
  RotateCcw,
  Pencil,
  Plus,
  Check,
  X,
  Building2,
  Briefcase,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { ConfirmDialog, KV } from "../components/common.jsx";
import HoldButton from "../components/common/HoldButton.jsx";
import { formatINR, rupeesToPaise } from "../utils/finance.js";

export default function SettingsPage() {
  const { business, settings, dispatch, toast } = useApp();
  const [reserve, setReserve] = useState(String(settings.minReservePaise / 100));
  const [horizon, setHorizon] = useState(settings.forecastHorizonDays);
  const [resetOpen, setResetOpen] = useState(false);

  // Business profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [bizForm, setBizForm] = useState({
    name: business?.name || "",
    type: business?.type || "",
    owner: business?.owner || "",
    email: business?.email || "",
    phone: business?.phone || "",
    city: business?.city || "",
    gstin: business?.gstin || "",
  });

  // Sync bizForm when active business changes
  useEffect(() => {
    if (business) {
      setBizForm({
        name: business.name || "",
        type: business.type || "",
        owner: business.owner || "",
        email: business.email || "",
        phone: business.phone || "",
        city: business.city || "",
        gstin: business.gstin || "",
      });
      setIsEditingProfile(false);
    }
  }, [business]);

  // Add another business dialog state
  const [addBizOpen, setAddBizOpen] = useState(false);
  const [newBizForm, setNewBizForm] = useState({
    name: "",
    type: "Wholesale distributor",
    owner: "",
    email: "",
    phone: "",
    city: "",
    gstin: "",
  });

  const cancelProfileEdit = () => {
    if (business) {
      setBizForm({
        name: business.name || "",
        type: business.type || "",
        owner: business.owner || "",
        email: business.email || "",
        phone: business.phone || "",
        city: business.city || "",
        gstin: business.gstin || "",
      });
    }
    setIsEditingProfile(false);
  };

  const saveProfile = () => {
    if (!bizForm.name.trim()) {
      toast("Business name cannot be empty", "error");
      return;
    }
    dispatch({
      type: "UPDATE_BUSINESS_PROFILE",
      patch: { ...bizForm },
    });
    setIsEditingProfile(false);
    toast("Business profile details updated");
  };

  const handleCreateBusiness = () => {
    if (!newBizForm.name.trim()) {
      toast("Business name is required", "error");
      return;
    }
    const slug = newBizForm.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 16) || "biz";
    const id = `${slug}-${Date.now().toString(36).slice(-4)}`;

    dispatch({
      type: "ADD_BUSINESS",
      business: {
        id,
        name: newBizForm.name.trim(),
        type: newBizForm.type.trim() || "Commercial business",
        owner: newBizForm.owner.trim() || "Owner",
        email: newBizForm.email.trim() || "accounts@business.in",
        phone: newBizForm.phone.trim() || "+91 98000 00000",
        city: newBizForm.city.trim() || "India",
        gstin: newBizForm.gstin.trim() || "27AAAAA0000A1Z5",
      },
    });

    setAddBizOpen(false);
    setNewBizForm({
      name: "",
      type: "Wholesale distributor",
      owner: "",
      email: "",
      phone: "",
      city: "",
      gstin: "",
    });
    toast(`Business "${newBizForm.name}" created and switched to active view!`);
  };

  const cancelSettings = () => {
    setReserve(String(settings.minReservePaise / 100));
    setHorizon(settings.forecastHorizonDays);
    toast("Forecast assumptions reset to saved values", "info");
  };

  const saveSettings = () => {
    const reservePaise = rupeesToPaise(Number(reserve));
    if (!Number.isFinite(reservePaise) || reservePaise < 0) {
      toast("Minimum reserve must be zero or more", "error");
      return;
    }
    dispatch({
      type: "UPDATE_SETTINGS",
      patch: {
        minReservePaise: reservePaise,
        forecastHorizonDays: Number(horizon),
      },
    });
    toast("Forecast assumptions saved — live forecast & alerts updated");
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
        minWidth: 0,
        "& .cfs-card": {
          border: "1px solid #e0eae3",
          borderRadius: "17px",
          bgcolor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(18px) saturate(125%)",
          boxShadow: "0 3px 8px rgba(22,39,31,0.025), 0 12px 30px rgba(22,39,31,0.035)",
          transition: "border-color 220ms ease, box-shadow 240ms ease, transform 240ms ease",
          "&:hover": {
            borderColor: "rgba(23,107,82,0.25)",
            boxShadow: "0 12px 32px rgba(22,39,31,0.07)",
            transform: "translateY(-2px)",
          },
        },
      }}
    >
      {/* Branded hero header */}
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: "22px",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #102B20 0%, #173E2E 48%, #0C231A 100%)",
          boxShadow: "0 12px 36px rgba(16,43,32,0.16)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
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
              <SlidersHorizontal size={13} color="#B5E7CC" />
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
              System Configuration
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
            }}
          >
            Settings
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
            Manage business identity, cash reserves, and forecast horizons. Changes apply immediately across all modules.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.1, flexWrap: "wrap", zIndex: 1 }}>
          <HoldButton
            label="Reset Data"
            confirmingLabel="Restoring System..."
            completedLabel="Reset Completed"
            onComplete={() => {
              dispatch({ type: "RESET_DATA" });
              toast("Demo data restored to initial synthetic state");
            }}
            variant="danger"
            size="medium"
            icon={RotateCcw}
            sx={{
              minHeight: 38,
              borderRadius: "13px",
              px: 1.8,
              fontSize: 12.5,
              fontWeight: 700,
            }}
          />

          <Button
            variant="contained"
            startIcon={<Save size={14} />}
            onClick={saveSettings}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              fontSize: 12.5,
              borderRadius: "13px",
              minHeight: 38,
              px: 2,
              color: "#082115",
              background: "linear-gradient(135deg, #70D6B1 0%, #4EBA93 100%)",
              boxShadow: "0 8px 20px rgba(112,214,177,0.35)",
              "&:hover": {
                background: "linear-gradient(135deg, #88e0bf 0%, #5ec7a0 100%)",
                transform: "translateY(-1px)",
              },
            }}
          >
            Save Settings 
          </Button>
        </Box>
      </Box>

      {/* Grid container */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" }, gap: 2.5, alignItems: "start" }}>
        {/* COLUMN 1: Business Profile & Add Business */}
        <Box>
          <Box className="cfs-card drift-wall" sx={{ p: { xs: 2, sm: 2.6 }, mb: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Building2 size={16} color="#176B52" />
                <Typography sx={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#16232F" }}>
                  Business Profile
                </Typography>
                <Chip
                  size="small"
                  label={business ? business.id.toUpperCase() : "ACTIVE"}
                  sx={{ height: 20, fontSize: 11.8, fontWeight: 800, bgcolor: "rgba(23,107,82,0.1)", color: "#176B52" }}
                />
              </Box>

              {!isEditingProfile ? (
                <Button
                  size="small"
                  startIcon={<Pencil size={12} />}
                  onClick={() => setIsEditingProfile(true)}
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "8px",
                    px: 1.2,
                    bgcolor: "rgba(23,107,82,0.08)",
                    color: "#176B52",
                    "&:hover": { bgcolor: "rgba(23,107,82,0.16)" },
                  }}
                >
                  Edit profile
                </Button>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<X size={12} />}
                    onClick={cancelProfileEdit}
                    sx={{ fontSize: 11.5, textTransform: "none", color: "#6B7280" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Check size={13} />}
                    onClick={saveProfile}
                    sx={{
                      fontSize: 11.5,
                      textTransform: "none",
                      fontWeight: 700,
                      bgcolor: "#176B52",
                      color: "#FFFFFF",
                      borderRadius: "8px",
                      px: 1.5,
                      boxShadow: "0 2px 6px rgba(23,107,82,0.25)",
                      "&:hover": { bgcolor: "#11523E" },
                    }}
                  >
                    Save changes
                  </Button>
                </Box>
              )}
            </Box>

            {!isEditingProfile ? (
              <Box sx={{ display: "grid", gap: 1.2 }}>
                <KV label="Business name">{business?.name || "—"}</KV>
                <KV label="Industry / Type">{business?.type || "—"}</KV>
                <KV label="Owner / Director">{business?.owner || "—"}</KV>
                <KV label="Email address">{business?.email || "—"}</KV>
                <KV label="Phone number">{business?.phone || "—"}</KV>
                <KV label="City / Region">{business?.city || "—"}</KV>
                <KV label="GSTIN">{business?.gstin || "—"}</KV>
              </Box>
            ) : (
              <Box sx={{ display: "grid", gap: 1.4 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Business name"
                  value={bizForm.name}
                  onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Industry / Type"
                  value={bizForm.type}
                  onChange={(e) => setBizForm({ ...bizForm, type: e.target.value })}
                />
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2 }}>
                  <TextField
                    size="small"
                    label="Owner / Contact"
                    value={bizForm.owner}
                    onChange={(e) => setBizForm({ ...bizForm, owner: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="City / Region"
                    value={bizForm.city}
                    onChange={(e) => setBizForm({ ...bizForm, city: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2 }}>
                  <TextField
                    size="small"
                    label="Email address"
                    value={bizForm.email}
                    onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Phone number"
                    value={bizForm.phone}
                    onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                  />
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  label="GSTIN"
                  value={bizForm.gstin}
                  onChange={(e) => setBizForm({ ...bizForm, gstin: e.target.value })}
                />
              </Box>
            )}
          </Box>

          {/* Add Another Business Card */}
          <Box
            className="cfs-card drift-wall"
            sx={{
              p: 2.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              background: "linear-gradient(135deg, rgba(246,251,248,0.95), rgba(236,246,240,0.8))",
              border: "1px dashed rgba(23,107,82,0.35)",
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#16232F" }}>
                Multi-Business Management
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: "#516170", mt: 0.2 }}>
                Add another legal entity or business unit to switch between books seamlessly.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={14} />}
              onClick={() => setAddBizOpen(true)}
              sx={{
                flexShrink: 0,
                textTransform: "none",
                fontWeight: 750,
                fontSize: 12.5,
                borderRadius: "10px",
                px: 1.6,
                bgcolor: "#176B52",
                color: "#FFFFFF",
                "&:hover": { bgcolor: "#11523E" },
              }}
            >
              Add business
            </Button>
          </Box>
        </Box>

        {/* COLUMN 2: Forecast Assumptions & Notifications */}
        <Box>
          <Box className="cfs-card drift-wall" sx={{ p: { xs: 2, sm: 2.6 }, mb: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <SlidersHorizontal size={16} color="#176B52" />
              <Typography sx={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#16232F" }}>
                Forecast Assumptions
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gap: 1.6 }}>
              <TextField select size="small" label="Default currency" value={settings.currency} disabled helperText="INR only in this demo — all amounts use Indian digit grouping (₹1,50,000).">
                <MenuItem value="INR">INR — Indian Rupee (₹)</MenuItem>
              </TextField>

              <TextField select size="small" label="Default forecast horizon" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
                {[7, 30, 60, 90].map((d) => (
                  <MenuItem key={d} value={d}>
                    {d} days outlook
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                type="number"
                label="Minimum cash reserve (₹)"
                value={reserve}
                onChange={(e) => setReserve(e.target.value)}
                slotProps={{ htmlInput: { min: 0, step: 10000 } }}
                helperText={`Currently ${formatINR(settings.minReservePaise)}. Red shortage alerts trigger below this safety buffer.`}
              />
            </Box>

            <Box sx={{ mt: 2.4, display: "flex", gap: 1.2, justifyContent: "flex-end" }}>
              <Button size="small" variant="text" color="inherit" onClick={cancelSettings}>
                Discard
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={saveSettings}
                sx={{
                  bgcolor: "#176B52",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  borderRadius: "8px",
                  "&:hover": { bgcolor: "#11523E" },
                }}
              >
                Apply changes
              </Button>
            </Box>
          </Box>

          <Box className="cfs-card drift-wall" sx={{ p: { xs: 2, sm: 2.6 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#16232F" }}>
                Notification Preferences
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifyShortage}
                    onChange={(e) => dispatch({ type: "UPDATE_SETTINGS", patch: { notifyShortage: e.target.checked } })}
                    color="success"
                  />
                }
                label="Predicted cash shortages & reserve breaches"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifyOverdue}
                    onChange={(e) => dispatch({ type: "UPDATE_SETTINGS", patch: { notifyOverdue: e.target.checked } })}
                    color="success"
                  />
                }
                label="Overdue customer invoices"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifySupplierDue}
                    onChange={(e) => dispatch({ type: "UPDATE_SETTINGS", patch: { notifySupplierDue: e.target.checked } })}
                    color="success"
                  />
                }
                label="Upcoming supplier payments (next 7 days)"
              />
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              Preferences determine automated inbox badges and proactive reminder notifications.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Add New Business Dialog */}
      <Dialog
        open={addBizOpen}
        onClose={() => setAddBizOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "18px",
            p: 1,
            boxShadow: "0 24px 60px rgba(16,43,32,0.22)",
            border: "1px solid #dce8e0",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 18, color: "#16232F", pb: 1 }}>
          Add New Business Entity
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.8, pt: "14px !important" }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Business name *"
            value={newBizForm.name}
            onChange={(e) => setNewBizForm({ ...newBizForm, name: e.target.value })}
            placeholder="e.g. Apex Industrial Supplies"
          />

          <TextField
            fullWidth
            size="small"
            label="Business type / Industry"
            value={newBizForm.type}
            onChange={(e) => setNewBizForm({ ...newBizForm, type: e.target.value })}
            placeholder="e.g. Manufacturing & Processing"
          />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2 }}>
            <TextField
              size="small"
              label="Owner / Managing Director"
              value={newBizForm.owner}
              onChange={(e) => setNewBizForm({ ...newBizForm, owner: e.target.value })}
            />
            <TextField
              size="small"
              label="City / State"
              value={newBizForm.city}
              onChange={(e) => setNewBizForm({ ...newBizForm, city: e.target.value })}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2 }}>
            <TextField
              size="small"
              label="Email"
              value={newBizForm.email}
              onChange={(e) => setNewBizForm({ ...newBizForm, email: e.target.value })}
            />
            <TextField
              size="small"
              label="Phone"
              value={newBizForm.phone}
              onChange={(e) => setNewBizForm({ ...newBizForm, phone: e.target.value })}
            />
          </Box>

          <TextField
            fullWidth
            size="small"
            label="GSTIN"
            value={newBizForm.gstin}
            onChange={(e) => setNewBizForm({ ...newBizForm, gstin: e.target.value })}
            placeholder="e.g. 27AAAPL1234F1Z9"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddBizOpen(false)} sx={{ textTransform: "none", color: "#6B7280" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateBusiness}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              borderRadius: "10px",
              px: 2.2,
              bgcolor: "#176B52",
              color: "#FFFFFF",
              "&:hover": { bgcolor: "#11523E" },
            }}
          >
            Create & Switch
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Confirmation */}
      <ConfirmDialog
        open={resetOpen}
        title="Reset demo data?"
        body="All imported invoices, recorded payments, and modified settings will return to the original starter dataset."
        confirmLabel="Reset everything"
        tone="error"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          dispatch({ type: "RESET_DATA" });
          setResetOpen(false);
          toast("Demo data restored to initial synthetic state");
        }}
      />
    </Box>
  );
}
