import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Truck } from "lucide-react";
import { useApp } from "../../context/AppContext.jsx";
import { SUPPLIER_CATEGORIES } from "../../services/supplierService.js";

export default function SupplierDialog({ open, onClose, supplier = null }) {
  const { dataset, dispatch, toast } = useApp();
  const isEdit = Boolean(supplier?.id);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState("30");
  const [category, setCategory] = useState("Raw Material");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || "");
      setContact(supplier.contact || "");
      setEmail(supplier.email || "");
      setPhone(supplier.phone || "");
      setCity(supplier.city || "");
      setGstin(supplier.gstin || "");
      setPaymentTermsDays(String(supplier.paymentTermsDays || 30));
      setCategory(supplier.category || "General Vendor");
      const latestNote = supplier.notes?.[supplier.notes.length - 1]?.text || "";
      setNotes(latestNote);
    } else {
      setName("");
      setContact("");
      setEmail("");
      setPhone("");
      setCity("");
      setGstin("");
      setPaymentTermsDays("30");
      setCategory("Raw Material");
      setNotes("");
    }
    setErrors({});
  }, [supplier, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Supplier name is required";
    } else {
      const exists = dataset.suppliers.some(
        (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase() && s.id !== supplier?.id
      );
      if (exists) {
        newErrors.name = "A supplier with this name already exists";
      }
    }

    const terms = Number(paymentTermsDays);
    if (!Number.isFinite(terms) || terms <= 0) {
      newErrors.paymentTermsDays = "Payment terms must be a positive number of days";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (isEdit) {
      dispatch({
        type: "UPDATE_SUPPLIER",
        id: supplier.id,
        patch: {
          name: name.trim(),
          contact: contact.trim() || name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim() || "India",
          gstin: gstin.trim(),
          paymentTermsDays: terms,
          category,
          ...(notes.trim() && {
            notes: [...(supplier.notes || []), { date: new Date().toISOString().slice(0, 10), text: notes.trim() }],
          }),
        },
      });
      toast(`Supplier "${name.trim()}" updated successfully.`, "success");
    } else {
      const newSupplier = {
        id: `s-${Date.now()}`,
        name: name.trim(),
        contact: contact.trim() || name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim() || "India",
        gstin: gstin.trim(),
        paymentTermsDays: terms,
        category,
        deliveryHistory: [], // Unrecorded delivery history starts clean without invented scores
        priceTrend: [],
        notes: notes.trim()
          ? [{ date: new Date().toISOString().slice(0, 10), text: notes.trim() }]
          : [],
      };
      dispatch({
        type: "ADD_SUPPLIER",
        supplier: newSupplier,
      });
      toast(`Supplier "${name.trim()}" added.`, "success");
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, background: "#f0f4f8", display: "grid", placeItems: "center" }}>
            <Truck size={18} color="#0f8a84" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#16232f" }}>
              {isEdit ? "Edit Supplier Details" : "Add New Supplier"}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>
              Payment terms, delivery promises, and vendor category
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Supplier / Business Name"
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
              placeholder="e.g. Polar Cables Ltd"
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Primary Contact Person"
                fullWidth
                size="small"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. Sales Desk / Vikram Rao"
              />
              <TextField
                select
                label="Supplier Category"
                fullWidth
                size="small"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {SUPPLIER_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@supplier.com"
              />
              <TextField
                label="Phone Number"
                fullWidth
                size="small"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 22 2890 0000"
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="City / Location"
                fullWidth
                size="small"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Maharashtra"
              />
              <TextField
                label="GSTIN (Optional)"
                fullWidth
                size="small"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 27AAACP7788F1Z3"
              />
            </Box>

            <TextField
              label="Standard Payment Terms (Days)"
              type="number"
              required
              fullWidth
              size="small"
              value={paymentTermsDays}
              onChange={(e) => {
                setPaymentTermsDays(e.target.value);
                if (errors.paymentTermsDays) setErrors({ ...errors, paymentTermsDays: null });
              }}
              error={Boolean(errors.paymentTermsDays)}
              helperText={errors.paymentTermsDays || "Credit period agreed with vendor before payment is due"}
            />

            <TextField
              label="Notes & Terms"
              multiline
              rows={2}
              fullWidth
              size="small"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery lead times, critical raw materials, MOQs, or discounts..."
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
            {isEdit ? "Save Changes" : "Create Supplier"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
