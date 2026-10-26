import { useMemo, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import { UploadCloud, Users, Download, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { parseCSV } from "../../utils/csv.js";
import {
  CUSTOMER_FIELD_DEFS,
  guessCustomerMapping,
  validateCustomerRecords,
  downloadCustomerTemplate,
} from "../../services/customerService.js";
import { useApp } from "../../context/AppContext.jsx";

const STEPS = ["Upload CSV", "Map Columns", "Preview & Validate"];

export default function CustomerImportModal({ open, onClose }) {
  const { dataset, dispatch, toast } = useApp();
  const [activeStep, setActiveStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [csvRaw, setCsvRaw] = useState({ headers: [], records: [] });
  const [columnMapping, setColumnMapping] = useState({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result || "";
      const parsed = parseCSV(text);
      if (!parsed.headers.length || !parsed.records.length) {
        toast("The uploaded CSV file is empty or could not be parsed.", "error");
        return;
      }
      setCsvRaw(parsed);
      const guessed = guessCustomerMapping(parsed.headers);
      setColumnMapping(guessed);
      setActiveStep(1);
    };
    reader.readAsText(file);
  };

  const validation = useMemo(() => {
    if (!csvRaw.records.length) return null;
    return validateCustomerRecords(csvRaw.records, columnMapping, dataset.customers || []);
  }, [csvRaw, columnMapping, dataset.customers]);

  const handleExecuteImport = () => {
    if (!validation) return;
    let recordsToImport = validation.valid;
    if (skipDuplicates) {
      recordsToImport = recordsToImport.filter((r) => !r.isDuplicate);
    }
    if (!recordsToImport.length) {
      toast("No new customers to import.", "warning");
      return;
    }

    dispatch({
      type: "IMPORT_CUSTOMERS",
      customers: recordsToImport,
    });

    toast(`Successfully imported ${recordsToImport.length} customers!`, "success");
    handleClose();
  };

  const handleClose = () => {
    setActiveStep(0);
    setFileName("");
    setCsvRaw({ headers: [], records: [] });
    setColumnMapping({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, background: "#e4f2ea", display: "grid", placeItems: "center" }}>
            <Users size={18} color="#115c3e" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#16232f" }}>
              Import Customers from CSV
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>
              Batch upload customer contact details and payment terms
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Box sx={{ px: 3, pt: 1, pb: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel sx={{ "& .MuiStepLabel-label": { fontSize: 12, fontWeight: 600 } }}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent dividers sx={{ minHeight: 340, py: 2.5 }}>
        {/* STEP 0: Upload */}
        {activeStep === 0 && (
          <Box>
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: "2px dashed #b8dfc9",
                borderRadius: 3,
                p: 4,
                textAlign: "center",
                cursor: "pointer",
                background: "#f4fbf7",
                transition: "all .15s",
                "&:hover": { background: "#eaf6ef", borderColor: "#115c3e" },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Box sx={{ width: 48, height: 48, borderRadius: 3, background: "#e4f2ea", mx: "auto", display: "grid", placeItems: "center", mb: 1.5 }}>
                <UploadCloud size={24} color="#115c3e" />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#16232f", mb: 0.5 }}>
                Click to upload customers CSV
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "#6e7f8d", mb: 2 }}>
                Upload customer name, contact details, payment terms, and GSTIN
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download size={14} />}
                onClick={(e) => {
                  e.stopPropagation();
                  downloadCustomerTemplate();
                }}
                sx={{ textTransform: "none", fontSize: 12 }}
              >
                Download Customer Template (.CSV)
              </Button>
            </Box>
          </Box>
        )}

        {/* STEP 1: Map Columns */}
        {activeStep === 1 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: "#16232f" }}>
                Map CSV Columns ({csvRaw.records.length} records found)
              </Typography>
            </Box>

            <TableContainer sx={{ border: "1px solid #e4e8ed", borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ background: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Requirement</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Matched CSV Column</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Preview of Row 1</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {CUSTOMER_FIELD_DEFS.map((field) => {
                    const matched = columnMapping[field.key] || "";
                    const sample = matched && csvRaw.records[0] ? csvRaw.records[0][matched] : "—";
                    return (
                      <TableRow key={field.key}>
                        <TableCell sx={{ fontWeight: 600, fontSize: 12.5 }}>{field.label}</TableCell>
                        <TableCell>
                          {field.required ? (
                            <Chip label="Required" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: 11.8 }} />
                          ) : (
                            <Typography sx={{ fontSize: 12, color: "#8b98a5" }}>Optional</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            value={matched}
                            onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                            sx={{ minWidth: 180, "& .MuiSelect-select": { py: 0.75, fontSize: 12 } }}
                          >
                            <MenuItem value="">-- None / Ignore --</MenuItem>
                            {csvRaw.headers.map((h) => (
                              <MenuItem key={h} value={h} sx={{ fontSize: 12 }}>{h}</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: "#516170", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {sample || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* STEP 2: Preview & Validate */}
        {activeStep === 2 && validation && (
          <Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1, p: 1.75, borderRadius: 2, background: "#e4f2ea", border: "1px solid #b8dfc9" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#115c3e", textTransform: "uppercase" }}>Valid Customers</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#115c3e" }}>{validation.valid.length}</Typography>
              </Box>
              {validation.invalid.length > 0 && (
                <Box sx={{ flex: 1, p: 1.75, borderRadius: 2, background: "#f9e9e9", border: "1px solid #edd5d5" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#8f2f2f", textTransform: "uppercase" }}>Invalid Rows</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#8f2f2f" }}>{validation.invalid.length}</Typography>
                </Box>
              )}
              {validation.duplicateCount > 0 && (
                <Box sx={{ flex: 1, p: 1.75, borderRadius: 2, background: "#faf1dc", border: "1px solid #f0dfa0" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6b4a08", textTransform: "uppercase" }}>Duplicate Names</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#6b4a08" }}>{validation.duplicateCount}</Typography>
                </Box>
              )}
            </Box>

            {validation.duplicateCount > 0 && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, background: "#fcf8eb", border: "1px solid #f5e4b2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AlertTriangle size={16} color="#a2700e" />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#6b4a08" }}>
                    {validation.duplicateCount} customer names already exist
                  </Typography>
                </Box>
                <FormControlLabel
                  control={<Checkbox checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} size="small" />}
                  label={<Typography sx={{ fontSize: 12, fontWeight: 600 }}>Skip existing duplicates</Typography>}
                />
              </Box>
            )}

            <TableContainer sx={{ border: "1px solid #e4e8ed", borderRadius: 2, maxHeight: 220 }}>
              <Table size="small" stickyHeader>
                <TableHead sx={{ background: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Customer Name</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Contact</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Location</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Terms</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validation.valid.slice(0, 8).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell sx={{ fontSize: 12.5, fontWeight: 600 }}>{c.name}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: "#516170" }}>{c.contact}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{c.city}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{c.termsDays} days</TableCell>
                      <TableCell>
                        {c.isDuplicate ? (
                          <Chip label="Duplicate" size="small" sx={{ height: 20, fontSize: 11.8, background: "#faf1dc", color: "#6b4a08" }} />
                        ) : (
                          <Chip label="Ready" size="small" sx={{ height: 20, fontSize: 11.8, background: "#e4f2ea", color: "#115c3e" }} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        <Button onClick={handleClose} color="inherit" sx={{ textTransform: "none", fontSize: 13 }}>
          Cancel
        </Button>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          {activeStep > 0 && (
            <Button onClick={() => setActiveStep((s) => s - 1)} variant="outlined" sx={{ textTransform: "none", fontSize: 13 }}>
              Back
            </Button>
          )}
          {activeStep === 1 && (
            <Button
              onClick={() => setActiveStep(2)}
              variant="contained"
              disabled={!columnMapping.name}
              sx={{ textTransform: "none", fontSize: 13, background: "#0f8a84", "&:hover": { background: "#0b6b66" } }}
            >
              Preview & Validate
            </Button>
          )}
          {activeStep === 2 && (
            <Button
              onClick={handleExecuteImport}
              variant="contained"
              disabled={!validation || !validation.valid.length}
              sx={{ textTransform: "none", fontSize: 13, background: "#0f8a84", "&:hover": { background: "#0b6b66" } }}
            >
              Confirm Import
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
