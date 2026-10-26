import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { User, Building2, Phone, Mail, MapPin, Calendar, FileText, Info } from "lucide-react";
import { useApp } from "../../context/AppContext.jsx";

export default function CustomerDialog({ open, onClose, customer = null }) {
  const { dataset, dispatch, toast } = useApp();
  const isEdit = Boolean(customer?.id);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState("");
  const [termsDays, setTermsDays] = useState("15");
  const [notes, setNotes] = useState("");

  // Owner provided baseline history (for customers without previous invoices)
  const [hasOwnerHistory, setHasOwnerHistory] = useState(false);
  const [onTimeCount, setOnTimeCount] = useState("");
  const [delayedCount, setDelayedCount] = useState("");
  const [avgDelayDays, setAvgDelayDays] = useState("");

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setContact(customer.contact || "");
      setEmail(customer.email || "");
      setPhone(customer.phone || "");
      setCity(customer.city || "");
      setGstin(customer.gstin || "");
      setTermsDays(String(customer.termsDays || 15));
      const latestNote = customer.notes?.[customer.notes.length - 1]?.text || "";
      setNotes(latestNote);

      if (customer.ownerHistory) {
        setHasOwnerHistory(true);
        setOnTimeCount(String(customer.ownerHistory.onTimeCount || ""));
        setDelayedCount(String(customer.ownerHistory.delayedCount || ""));
        setAvgDelayDays(String(customer.ownerHistory.avgDelayDays || ""));
      } else {
        setHasOwnerHistory(false);
        setOnTimeCount("");
        setDelayedCount("");
        setAvgDelayDays("");
      }
    } else {
      setName("");
      setContact("");
      setEmail("");
      setPhone("");
      setCity("");
      setGstin("");
      setTermsDays("15");
      setNotes("");
      setHasOwnerHistory(false);
      setOnTimeCount("");
      setDelayedCount("");
      setAvgDelayDays("");
    }
    setErrors({});
  }, [customer, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Customer or business name is required";
    } else {
      // Check for duplicate name
      const exists = dataset.customers.some(
        (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.id !== customer?.id
      );
      if (exists) {
        newErrors.name = "A customer with this name already exists";
      }
    }

    const terms = Number(termsDays);
    if (!Number.isFinite(terms) || terms <= 0) {
      newErrors.termsDays = "Payment terms must be a positive number of days";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let ownerHistory = null;
    if (hasOwnerHistory && (Number(onTimeCount) > 0 || Number(delayedCount) > 0)) {
      ownerHistory = {
        onTimeCount: Number(onTimeCount) || 0,
        delayedCount: Number(delayedCount) || 0,
        avgDelayDays: Number(avgDelayDays) || 0,
        recordedAt: new Date().toISOString().slice(0, 10),
      };
    }

    if (isEdit) {
      dispatch({
        type: "UPDATE_CUSTOMER",
        id: customer.id,
        patch: {
          name: name.trim(),
          contact: contact.trim() || name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim() || "India",
          gstin: gstin.trim(),
          termsDays: terms,
          ...(ownerHistory && { ownerHistory }),
          ...(notes.trim() && {
            notes: [...(customer.notes || []), { date: new Date().toISOString().slice(0, 10), text: notes.trim() }],
          }),
        },
      });
      toast(`Customer "${name.trim()}" updated successfully.`, "success");
    } else {
      const newCustomer = {
        id: `c-${Date.now()}`,
        name: name.trim(),
        contact: contact.trim() || name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim() || "India",
        gstin: gstin.trim(),
        termsDays: terms,
        paymentHistory: [], // Starts clean; builds as invoices and payments are recorded
        ...(ownerHistory && { ownerHistory }),
        notes: notes.trim()
          ? [{ date: new Date().toISOString().slice(0, 10), text: notes.trim() }]
          : [],
      };
      dispatch({
        type: "ADD_CUSTOMER",
        customer: newCustomer,
      });
      toast(`Customer "${name.trim()}" added.`, "success");
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, background: "#e4f2ea", display: "grid", placeItems: "center" }}>
            <Building2 size={18} color="#115c3e" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#16232f" }}>
              {isEdit ? "Edit Customer Details" : "Add New Customer"}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>
              Payment terms and customer profile
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Business / Customer Name"
              required
              fullWidth
              size="small"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              error={Boolean(errors.name)}
              helperText={errors.name}
              placeholder="e.g. Apex Electricals Pvt Ltd"
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Primary Contact Person"
                fullWidth
                size="small"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. Anil Sharma"
              />
              <TextField
                label="City / Location"
                fullWidth
                size="small"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Pune, Maharashtra"
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accounts@example.com"
              />
              <TextField
                label="Phone Number"
                fullWidth
                size="small"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98200 00000"
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Default Payment Terms (Days)"
                type="number"
                required
                fullWidth
                size="small"
                value={termsDays}
                onChange={(e) => {
                  setTermsDays(e.target.value);
                  if (errors.termsDays) setErrors({ ...errors, termsDays: null });
                }}
                error={Boolean(errors.termsDays)}
                helperText={errors.termsDays || "Standard credit days before due"}
              />
              <TextField
                label="GSTIN (Optional)"
                fullWidth
                size="small"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 27AABCA1234D1Z2"
              />
            </Box>

            {/* Owner baseline history accordion */}
            <Accordion
              expanded={hasOwnerHistory}
              onChange={(_, expanded) => setHasOwnerHistory(expanded)}
              sx={{
                border: "1px solid #e4e8ed",
                borderRadius: "8px !important",
                "&:before": { display: "none" },
                boxShadow: "none",
                background: hasOwnerHistory ? "#f8fafc" : "#fff",
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#16232f" }}>
                    Initial Payment History (Optional baseline)
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Alert severity="info" icon={<Info size={16} />} sx={{ mb: 2, fontSize: 11.5 }}>
                  New customers normally start with <strong>"Not enough payment history"</strong> until invoices and actual payments are recorded. If you already have historical numbers from past records, you may specify them here as <em>owner-provided summary</em>.
                </Alert>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1.5 }}>
                  <TextField
                    label="On-time payments"
                    type="number"
                    size="small"
                    value={onTimeCount}
                    onChange={(e) => setOnTimeCount(e.target.value)}
                    placeholder="e.g. 5"
                  />
                  <TextField
                    label="Delayed payments"
                    type="number"
                    size="small"
                    value={delayedCount}
                    onChange={(e) => setDelayedCount(e.target.value)}
                    placeholder="e.g. 1"
                  />
                  <TextField
                    label="Avg delay (days)"
                    type="number"
                    size="small"
                    value={avgDelayDays}
                    onChange={(e) => setAvgDelayDays(e.target.value)}
                    placeholder="e.g. 3"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            <TextField
              label="Notes & Terms"
              multiline
              rows={2}
              fullWidth
              size="small"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal reminders, delivery instructions, or special discounts..."
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
            sx={{ textTransform: "none", fontSize: 13, background: "#0f8a84", "&:hover": { background: "#0b6b66" } }}
          >
            {isEdit ? "Save Changes" : "Create Customer"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
