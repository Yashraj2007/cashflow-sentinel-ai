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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Tooltip from "@mui/material/Tooltip";
import {
  UploadCloud, FileText, Download, CheckCircle2, AlertTriangle,
  HelpCircle, ArrowRight, ShieldCheck, XCircle, Info
} from "lucide-react";
import { parseCSV } from "../../utils/csv.js";
import { formatINR, formatDisplay, rupeesToPaise, todayISO } from "../../utils/finance.js";
import {
  BANK_FIELD_DEFS,
  guessBankMapping,
  validateBankRecords,
  downloadBankTemplate,
} from "../../services/bankImportService.js";
import { useApp } from "../../context/AppContext.jsx";

const STEPS = ["Upload Statement", "Map Columns", "Preview & Validate", "Confirm Import"];
const IGNORE_VAL = "__ignore__";

export default function BankStatementImportWizard({ open, onClose, onComplete }) {
  const { dataset, dispatch, toast } = useApp();
  const [activeStep, setActiveStep] = useState(0);

  // Upload state
  const [fileMode, setFileMode] = useState("csv"); // "csv" | "pdf"
  const [fileName, setFileName] = useState("");
  const [csvRaw, setCsvRaw] = useState({ headers: [], records: [] });
  const [columnMapping, setColumnMapping] = useState({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [syncClosingBalance, setSyncClosingBalance] = useState(true);

  // PDF Manual fallback state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfManualRows, setPdfManualRows] = useState([
    { date: todayISO(), description: "", debit: "", credit: "", category: "operating" }
  ]);

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // Handle CSV file selection
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
      const guessed = guessBankMapping(parsed.headers);
      setColumnMapping(guessed);
      setActiveStep(1); // Advance to column mapping
    };
    reader.readAsText(file);
  };

  // Handle PDF file selection
  const handlePdfChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setFileName(file.name);
  };

  // Validation results
  const validationResult = useMemo(() => {
    if (fileMode === "csv") {
      if (!csvRaw.records.length) return null;
      return validateBankRecords(csvRaw.records, columnMapping, dataset.transactions || []);
    }
    // PDF Manual rows validation
    const valid = [];
    const invalid = [];
    pdfManualRows.forEach((row, idx) => {
      const deb = Number(row.debit);
      const cred = Number(row.credit);
      const errors = [];
      if (!row.description.trim()) errors.push("Description is required");
      if (!row.date) errors.push("Date is required");
      if (!(deb > 0) && !(cred > 0)) errors.push("Enter either debit or credit");
      if (deb > 0 && cred > 0) errors.push("Cannot have both debit and credit");

      if (errors.length) {
        invalid.push({ rowNum: idx + 1, errors, description: row.description });
      } else {
        const direction = cred > 0 ? "in" : "out";
        const amountPaise = rupeesToPaise(cred > 0 ? cred : deb);
        valid.push({
          id: `tx-pdf-${Date.now()}-${idx}`,
          date: row.date,
          label: row.description.trim(),
          category: row.category || "operating",
          direction,
          amountPaise,
          status: "actual",
          ref: { kind: "bank-import-pdf", filename: fileName },
          isDuplicate: false,
        });
      }
    });
    return { valid, invalid, duplicateCount: 0, closingBalancePaise: null };
  }, [fileMode, csvRaw, columnMapping, dataset.transactions, pdfManualRows, fileName]);

  const canProceedToPreview = useMemo(() => {
    if (fileMode === "pdf") return pdfManualRows.some((r) => r.description.trim() && (Number(r.debit) > 0 || Number(r.credit) > 0));
    // Must map date and description at least
    return !!columnMapping.date && !!columnMapping.description;
  }, [fileMode, columnMapping, pdfManualRows]);

  // Execute import
  const handleExecuteImport = () => {
    if (!validationResult) return;
    let recordsToImport = validationResult.valid;
    if (skipDuplicates) {
      recordsToImport = recordsToImport.filter((r) => !r.isDuplicate);
    }

    if (!recordsToImport.length) {
      toast("No new transactions to import.", "warning");
      return;
    }

    const newBalance =
      syncClosingBalance && validationResult.closingBalancePaise !== null
        ? validationResult.closingBalancePaise
        : undefined;

    dispatch({
      type: "IMPORT_BANK_TRANSACTIONS",
      transactions: recordsToImport,
      newBalancePaise: newBalance,
    });

    toast(
      `Successfully imported ${recordsToImport.length} bank transactions${
        newBalance !== undefined ? ` and updated cash balance to ${formatINR(newBalance)}` : ""
      }!`,
      "success"
    );

    if (onComplete) onComplete(recordsToImport.length);
    handleClose();
  };

  const handleClose = () => {
    setActiveStep(0);
    setFileName("");
    setCsvRaw({ headers: [], records: [] });
    setColumnMapping({});
    setPdfFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, background: "#e4f2f1", display: "grid", placeItems: "center" }}>
            <FileText size={18} color="#0f8a84" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#16232f" }}>
              Add Bank Statement
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>
              Guided financial statement import & cash reconciliation
            </Typography>
          </Box>
        </Box>
        <Chip
          label="Demo Safe • Synthetic Data"
          size="small"
          sx={{ background: "#f0f4f8", color: "#516170", fontWeight: 600, fontSize: 12 }}
        />
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

      <DialogContent dividers sx={{ minHeight: 380, py: 2.5 }}>
        {/* STEP 0: Upload */}
        {activeStep === 0 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
              <ToggleButtonGroup
                value={fileMode}
                exclusive
                onChange={(_, v) => v && setFileMode(v)}
                size="small"
                sx={{ background: "#f5f7fa" }}
              >
                <ToggleButton value="csv" sx={{ px: 3, fontWeight: 700, fontSize: 12.5, textTransform: "none" }}>
                  CSV Bank Statement (Recommended)
                </ToggleButton>
                <ToggleButton value="pdf" sx={{ px: 3, fontWeight: 700, fontSize: 12.5, textTransform: "none" }}>
                  PDF Statement Document
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {fileMode === "csv" ? (
              <Box>
                {/* Drag & drop upload area */}
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: "2px dashed #b4dcda",
                    borderRadius: 3,
                    p: 4,
                    textAlign: "center",
                    cursor: "pointer",
                    background: "#f8fdfc",
                    transition: "all .15s",
                    "&:hover": { background: "#edf9f8", borderColor: "#0f8a84" },
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <Box sx={{ width: 48, height: 48, borderRadius: 3, background: "#e4f2f1", mx: "auto", display: "grid", placeItems: "center", mb: 1.5 }}>
                    <UploadCloud size={24} color="#0f8a84" />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#16232f", mb: 0.5 }}>
                    Click to upload bank statement CSV
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: "#6e7f8d", mb: 2 }}>
                    Supports HDFC, ICICI, SBI, Axis, Kotak & standard Indian banking CSV exports
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Download size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadBankTemplate();
                    }}
                    sx={{ textTransform: "none", fontSize: 12 }}
                  >
                    Download Sample Statement Template (.CSV)
                  </Button>
                </Box>

                <Alert severity="info" icon={<ShieldCheck size={18} />} sx={{ mt: 2.5, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Privacy & Demo Safety Notice</Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#475467" }}>
                    We never connect to or store your online banking credentials. In demo mode, all financial processing runs entirely in your local browser storage. For production systems, statements are ingested via zero-knowledge encrypted channels.
                  </Typography>
                </Alert>
              </Box>
            ) : (
              <Box>
                <Alert severity="warning" icon={<AlertTriangle size={18} />} sx={{ mb: 2.5, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Transparent OCR Notice</Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#475467" }}>
                    No automated OCR service is active in demo mode. We do not fake PDF text extraction. You can attach your PDF as a source document and enter or confirm the key transactions below.
                  </Typography>
                </Alert>

                <Box
                  onClick={() => pdfInputRef.current?.click()}
                  sx={{
                    border: "1px dashed #cfd9e0",
                    borderRadius: 2.5,
                    p: 2.5,
                    textAlign: "center",
                    cursor: "pointer",
                    background: "#fcfdfe",
                    mb: 2.5,
                    "&:hover": { borderColor: "#0f8a84" },
                  }}
                >
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    style={{ display: "none" }}
                    onChange={handlePdfChange}
                  />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#16232f" }}>
                    {pdfFile ? `Attached: ${pdfFile.name}` : "Attach Statement PDF (Optional reference)"}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#8b98a5" }}>Click to select PDF document</Typography>
                </Box>

                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1, color: "#16232f" }}>
                  Record Statement Entries Manually
                </Typography>
                {pdfManualRows.map((row, idx) => (
                  <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
                    <TextField
                      type="date"
                      size="small"
                      value={row.date}
                      onChange={(e) => {
                        const next = [...pdfManualRows];
                        next[idx].date = e.target.value;
                        setPdfManualRows(next);
                      }}
                      sx={{ width: 140 }}
                    />
                    <TextField
                      placeholder="Narration / Description"
                      size="small"
                      value={row.description}
                      onChange={(e) => {
                        const next = [...pdfManualRows];
                        next[idx].description = e.target.value;
                        setPdfManualRows(next);
                      }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      placeholder="Debit ₹"
                      size="small"
                      value={row.debit}
                      onChange={(e) => {
                        const next = [...pdfManualRows];
                        next[idx].debit = e.target.value;
                        if (e.target.value) next[idx].credit = "";
                        setPdfManualRows(next);
                      }}
                      sx={{ width: 110 }}
                    />
                    <TextField
                      placeholder="Credit ₹"
                      size="small"
                      value={row.credit}
                      onChange={(e) => {
                        const next = [...pdfManualRows];
                        next[idx].credit = e.target.value;
                        if (e.target.value) next[idx].debit = "";
                        setPdfManualRows(next);
                      }}
                      sx={{ width: 110 }}
                    />
                  </Box>
                ))}
                <Button
                  size="small"
                  onClick={() =>
                    setPdfManualRows([
                      ...pdfManualRows,
                      { date: todayISO(), description: "", debit: "", credit: "", category: "operating" },
                    ])
                  }
                  sx={{ textTransform: "none", fontSize: 12 }}
                >
                  + Add another entry
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* STEP 1: Map Columns (CSV mode) */}
        {activeStep === 1 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: "#16232f" }}>
                  Match Columns from <span style={{ color: "#0f8a84" }}>{fileName}</span>
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>
                  Confirm which CSV column corresponds to each transaction field
                </Typography>
              </Box>
              <Chip label={`${csvRaw.records.length} rows found`} size="small" sx={{ fontWeight: 600 }} />
            </Box>

            <TableContainer sx={{ border: "1px solid #e4e8ed", borderRadius: 2, mb: 2.5 }}>
              <Table size="small">
                <TableHead sx={{ background: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Sentinel Field</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Requirement</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Matched CSV Column</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Preview of Row 1</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {BANK_FIELD_DEFS.map((field) => {
                    const matchedCol = columnMapping[field.key] || "";
                    const sampleVal = matchedCol && csvRaw.records[0] ? csvRaw.records[0][matchedCol] : "—";
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
                            value={matchedCol}
                            onChange={(e) =>
                              setColumnMapping({ ...columnMapping, [field.key]: e.target.value })
                            }
                            sx={{ minWidth: 180, "& .MuiSelect-select": { py: 0.75, fontSize: 12 } }}
                          >
                            <MenuItem value="">
                              <em>-- None / Ignore --</em>
                            </MenuItem>
                            {csvRaw.headers.map((h) => (
                              <MenuItem key={h} value={h} sx={{ fontSize: 12 }}>
                                {h}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: "#516170", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {sampleVal || "—"}
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
        {activeStep === 2 && validationResult && (
          <Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1, p: 1.75, borderRadius: 2, background: "#e4f2ea", border: "1px solid #b8dfc9" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#115c3e", textTransform: "uppercase" }}>Valid Entries</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#115c3e" }}>{validationResult.valid.length}</Typography>
              </Box>
              {validationResult.invalid.length > 0 && (
                <Box sx={{ flex: 1, p: 1.75, borderRadius: 2, background: "#f9e9e9", border: "1px solid #edd5d5" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#8f2f2f", textTransform: "uppercase" }}>Rejected Rows</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#8f2f2f" }}>{validationResult.invalid.length}</Typography>
                </Box>
              )}
              {validationResult.duplicateCount > 0 && (
                <Box sx={{ flex: 1, p: 1.75, borderRadius: 2, background: "#faf1dc", border: "1px solid #f0dfa0" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#6b4a08", textTransform: "uppercase" }}>Duplicates Detected</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#6b4a08" }}>{validationResult.duplicateCount}</Typography>
                </Box>
              )}
            </Box>

            {validationResult.duplicateCount > 0 && (
              <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, background: "#fcf8eb", border: "1px solid #f5e4b2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AlertTriangle size={16} color="#a2700e" />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#6b4a08" }}>
                    {validationResult.duplicateCount} transactions match existing records in your ledger
                  </Typography>
                </Box>
                <FormControlLabel
                  control={<Checkbox checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} size="small" />}
                  label={<Typography sx={{ fontSize: 12, fontWeight: 600 }}>Skip duplicates (recommended)</Typography>}
                />
              </Box>
            )}

            {validationResult.closingBalancePaise !== null && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, background: "#e4f2f1", border: "1px solid #b4dcda", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircle2 size={16} color="#0f8a84" />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#0b4e4c" }}>
                    Detected Statement Closing Balance: <strong>{formatINR(validationResult.closingBalancePaise)}</strong>
                  </Typography>
                </Box>
                <FormControlLabel
                  control={<Checkbox checked={syncClosingBalance} onChange={(e) => setSyncClosingBalance(e.target.checked)} size="small" />}
                  label={<Typography sx={{ fontSize: 12, fontWeight: 600 }}>Update available cash balance to match</Typography>}
                />
              </Box>
            )}

            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1, color: "#16232f" }}>
              Parsed Transactions Preview
            </Typography>
            <TableContainer sx={{ border: "1px solid #e4e8ed", borderRadius: 2, maxHeight: 220 }}>
              <Table size="small" stickyHeader>
                <TableHead sx={{ background: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Description</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Type</TableCell>
                    <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationResult.valid.slice(0, 8).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell sx={{ fontSize: 12 }}>{formatDisplay(row.date)}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.label}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5, color: "#516170" }}>{row.category}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.direction === "in" ? "Deposit" : "Withdrawal"}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 11.8,
                            fontWeight: 700,
                            background: row.direction === "in" ? "#e4f2ea" : "#f9e9e9",
                            color: row.direction === "in" ? "#115c3e" : "#8f2f2f",
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
                        {formatINR(row.amountPaise)}
                      </TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
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

            {validationResult.invalid.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#8f2f2f", mb: 0.5 }}>
                  Row Validation Errors ({validationResult.invalid.length} skipped)
                </Typography>
                <Box sx={{ maxHeight: 80, overflowY: "auto", p: 1, background: "#fdf3f3", borderRadius: 1.5, border: "1px solid #edd5d5" }}>
                  {validationResult.invalid.map((inv, idx) => (
                    <Typography key={idx} sx={{ fontSize: 12, color: "#8f2f2f" }}>
                      Row {inv.rowNum}: {inv.errors.join(", ")} ({inv.description || "empty narration"})
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* STEP 3: Confirm Import */}
        {activeStep === 3 && validationResult && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "50%", background: "#e4f2f1", mx: "auto", display: "grid", placeItems: "center", mb: 2 }}>
              <CheckCircle2 size={32} color="#0f8a84" />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#16232f", mb: 0.5 }}>
              Ready to reconcile statement
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#6e7f8d", maxWidth: 440, mx: "auto", mb: 3 }}>
              {validationResult.valid.length - (skipDuplicates ? validationResult.duplicateCount : 0)} verified transactions will be posted to your cash ledger.
              {syncClosingBalance && validationResult.closingBalancePaise !== null
                ? ` Available cash will be updated to ${formatINR(validationResult.closingBalancePaise)}.`
                : ""}
            </Typography>

            <Box sx={{ display: "inline-flex", gap: 3, p: 2, borderRadius: 2.5, background: "#f8fafc", border: "1px solid #e4e8ed", mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>Total Inflows</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#115c3e" }}>
                  {formatINR(
                    validationResult.valid
                      .filter((r) => (!skipDuplicates || !r.isDuplicate) && r.direction === "in")
                      .reduce((s, r) => s + r.amountPaise, 0)
                  )}
                </Typography>
              </Box>
              <Box sx={{ borderRight: "1px solid #e4e8ed" }} />
              <Box>
                <Typography sx={{ fontSize: 12, color: "#6e7f8d" }}>Total Outflows</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#8f2f2f" }}>
                  {formatINR(
                    validationResult.valid
                      .filter((r) => (!skipDuplicates || !r.isDuplicate) && r.direction === "out")
                      .reduce((s, r) => s + r.amountPaise, 0)
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        <Button onClick={handleClose} color="inherit" sx={{ textTransform: "none", fontSize: 13 }}>
          Cancel
        </Button>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          {activeStep > 0 && (
            <Button
              onClick={() => setActiveStep((s) => s - 1)}
              variant="outlined"
              sx={{ textTransform: "none", fontSize: 13 }}
            >
              Back
            </Button>
          )}

          {activeStep === 0 && fileMode === "pdf" && (
            <Button
              onClick={() => setActiveStep(2)}
              variant="contained"
              disabled={!canProceedToPreview}
              sx={{ textTransform: "none", fontSize: 13, background: "#0f8a84", "&:hover": { background: "#0b6b66" } }}
            >
              Preview Entries
            </Button>
          )}

          {activeStep === 1 && (
            <Button
              onClick={() => setActiveStep(2)}
              variant="contained"
              disabled={!canProceedToPreview}
              sx={{ textTransform: "none", fontSize: 13, background: "#0f8a84", "&:hover": { background: "#0b6b66" } }}
            >
              Preview & Validate
            </Button>
          )}

          {activeStep === 2 && (
            <Button
              onClick={() => setActiveStep(3)}
              variant="contained"
              disabled={!validationResult || !validationResult.valid.length}
              sx={{ textTransform: "none", fontSize: 13, background: "#0f8a84", "&:hover": { background: "#0b6b66" } }}
            >
              Proceed to Confirm
            </Button>
          )}

          {activeStep === 3 && (
            <Button
              onClick={handleExecuteImport}
              variant="contained"
              sx={{ textTransform: "none", fontSize: 13, background: "#0f8a84", "&:hover": { background: "#0b6b66" } }}
            >
              Confirm & Post to Ledger
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
