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
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import { parseCSV, guessMapping, INVOICE_FIELD_DEFS, sampleCSV, downloadCSV } from "../../utils/csv.js";
import { parseAnyDate, rupeesToPaise, todayISO, addDaysISO } from "../../utils/finance.js";
import { useApp } from "../../context/AppContext.jsx";

const STEPS = ["Type", "Upload", "Map columns", "Validate", "Import"];
const IGNORE = "__ignore__";

export default function InvoiceImportWizard({ open, onClose, initialType = "sales" }) {
  const { dataset, dispatch, toast } = useApp();
  const [step, setStep] = useState(0);
  const [type, setType] = useState(initialType);
  const [mode, setMode] = useState("csv");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState({ headers: [], records: [] });
  const [mapping, setMapping] = useState({});
  const [createUnknown, setCreateUnknown] = useState(true);
  const [pdfDraft, setPdfDraft] = useState(null);
  const [pdfConfirmed, setPdfConfirmed] = useState(false);
  const fileRef = useRef(null);
  const pdfRef = useRef(null);

  const partyField = type === "sales" ? "party" : "party";
  const existingParties = type === "sales" ? dataset.customers : dataset.suppliers;
  const existingInvoices = type === "sales" ? dataset.salesInvoices : dataset.purchaseInvoices;

  const validation = useMemo(() => {
    if (!parsed.records.length) return null;
    const get = (rec, field) => (mapping[field] ? rec[mapping[field]] : "");
    const seen = new Set();
    const valid = [];
    const invalid = [];
    parsed.records.forEach((rec, idx) => {
      const errors = [];
      const number = String(get(rec, "number") || "").trim();
      const party = String(get(rec, partyField) || "").trim();
      const amountRaw = String(get(rec, "amount") || "").replace(/[₹,\s]/g, "");
      const amount = Number(amountRaw);
      const issueDate = parseAnyDate(get(rec, "issueDate"));
      const dueDate = parseAnyDate(get(rec, "dueDate"));
      const expectedDate = parseAnyDate(get(rec, "expectedPaymentDate")) || null;
      const actualDate = parseAnyDate(get(rec, "actualPaymentDate")) || null;
      const paidRaw = String(get(rec, "paidAmount") || "").replace(/[₹,\s]/g, "");
      const paidAmount = paidRaw === "" ? 0 : Number(paidRaw);

      if (!number) errors.push("Invoice number missing");
      if (!party) errors.push("Name missing");
      if (!Number.isFinite(amount) || amount <= 0) errors.push("Amount must be a positive number");
      if (!issueDate) errors.push("Invoice date invalid (use yyyy-mm-dd or dd/mm/yyyy)");
      if (!dueDate) errors.push("Due date invalid");
      if (Number.isFinite(paidAmount) && paidAmount > amount) errors.push("Paid amount exceeds invoice amount");
      if (expectedDate && dueDate && expectedDate < addDaysISO(dueDate, -5) && type === "sales") errors.push("Expected payment date suspiciously early");

      const dupExisting = existingInvoices.some((i) => i.number.toLowerCase() === number.toLowerCase());
      const dupFile = seen.has(number.toLowerCase());
      seen.add(number.toLowerCase());

      const known = existingParties.some((p) => p.name.toLowerCase() === party.toLowerCase());

      if (errors.length) {
        invalid.push({ idx, rec, errors, number, party });
      } else {
        valid.push({
          idx, number, party, known, dupExisting, dupFile,
          amountPaise: rupeesToPaise(amount),
          paidPaise: Number.isFinite(paidAmount) ? rupeesToPaise(paidAmount) : 0,
          issueDate, dueDate,
          expectedDate: expectedDate || dueDate,
          actualDate,
          status: String(get(rec, "status") || "").toLowerCase(),
          reference: String(get(rec, "reference") || "").trim() || null,
        });
      }
    });
    const duplicates = valid.filter((v) => v.dupExisting || v.dupFile).length;
    const unknown = valid.filter((v) => !v.known);
    const importable = valid.filter((v) => !v.dupExisting && !v.dupFile && (v.known || createUnknown));
    return { valid, invalid, duplicates, unknown, importable };
  }, [parsed, mapping, existingInvoices, existingParties, createUnknown, type, partyField]);

  const reset = () => {
    setStep(0);
    setParsed({ headers: [], records: [] });
    setMapping({});
    setFileName("");
    setCreateUnknown(true);
    setMode("csv");
    setPdfDraft(null);
    setPdfConfirmed(false);
  };

  const handlePdf = (file) => {
    if (!file) return;
    // Demo preview only — no OCR service is connected. Values below are
    // deterministic placeholders derived from the file, fully editable,
    // and must be confirmed by a human before importing.
    const seed = file.size || 12345;
    setFileName(file.name);
    setPdfDraft({
      number: `PDF-${(seed % 9000) + 1000}`,
      party: existingParties[seed % existingParties.length] ? existingParties[seed % existingParties.length].name : "Unknown party",
      amount: String(((seed % 150) + 40) * 1000),
      issueDate: addDaysISO(todayISO(), -3),
      dueDate: addDaysISO(todayISO(), 12),
    });
    setPdfConfirmed(false);
  };

  const confirmPdfImport = () => {
    if (!pdfDraft || !pdfConfirmed) return;
    const existing = existingParties.find((p) => p.name.toLowerCase() === String(pdfDraft.party).toLowerCase());
    const newParties = [];
    let partyId = existing ? existing.id : null;
    if (!partyId) {
      partyId = `${type === "sales" ? "c" : "s"}-pdf-${Date.now()}`;
      newParties.push({
        id: partyId, name: pdfDraft.party, contact: "—", email: "—", phone: "—", city: "—", gstin: "—", termsDays: 15,
        ...(type === "sales" ? { paymentHistory: [] } : { paymentTermsDays: 15, deliveryHistory: [], priceTrend: [] }),
      });
    }
    const amountPaise = rupeesToPaise(Number(pdfDraft.amount));
    const base = {
      id: `${type === "sales" ? "si" : "pi"}-pdf-${Date.now()}`,
      number: pdfDraft.number, partyId, amountPaise, paidPaise: 0,
      issueDate: pdfDraft.issueDate, dueDate: pdfDraft.dueDate,
      notes: [{ date: todayISO(), text: "Imported from PDF demo preview (fields confirmed by user — no OCR performed)." }],
    };
    const invoice = type === "sales"
      ? { ...base, expectedPaymentDate: pdfDraft.dueDate, actualPaymentDate: null, poRef: null }
      : { ...base, plannedPaymentDate: pdfDraft.dueDate, actualPaymentDate: null, priority: "normal", poRef: null, deliveryPromised: null, deliveryActual: null };
    dispatch({ type: "IMPORT_INVOICES", invoiceType: type, invoices: [invoice], newParties });
    toast("PDF preview imported after human confirmation (demo)", "success");
    setStep(4);
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCSV(String(reader.result || ""));
      setParsed(result);
      setMapping(guessMapping(result.headers));
      setFileName(file.name);
      if (result.records.length) setStep(2);
      else toast("That file has no data rows", "error");
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    const v = validation;
    const partyNameToId = {};
    const newParties = [];
    const invoices = v.importable.map((row, n) => {
      let partyId;
      const existing = existingParties.find((p) => p.name.toLowerCase() === row.party.toLowerCase());
      if (existing) {
        partyId = existing.id;
      } else {
        if (!partyNameToId[row.party.toLowerCase()]) {
          const id = `${type === "sales" ? "c" : "s"}-imp-${Date.now()}-${n}`;
          partyNameToId[row.party.toLowerCase()] = id;
          newParties.push({
            id,
            name: row.party,
            contact: "—",
            email: "—",
            phone: "—",
            city: "—",
            gstin: "—",
            termsDays: 15,
            ...(type === "sales" ? { paymentHistory: [] } : { paymentTermsDays: 15, deliveryHistory: [], priceTrend: [] }),
          });
        }
        partyId = partyNameToId[row.party.toLowerCase()];
      }
      const fullyPaid = row.paidPaise >= row.amountPaise;
      const base = {
        id: `${type === "sales" ? "si" : "pi"}-imp-${Date.now()}-${n}`,
        number: row.number,
        partyId,
        amountPaise: row.amountPaise,
        paidPaise: row.paidPaise,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        notes: [{ date: todayISO(), text: "Imported from CSV (demo)." }],
      };
      if (type === "sales") {
        return { ...base, expectedPaymentDate: row.actualDate || row.expectedDate, actualPaymentDate: fullyPaid ? (row.actualDate || row.issueDate) : null, poRef: row.reference };
      }
      return { ...base, plannedPaymentDate: row.actualDate || row.expectedDate, actualPaymentDate: fullyPaid ? (row.actualDate || row.issueDate) : null, priority: "normal", poRef: row.reference, deliveryPromised: null, deliveryActual: null };
    });

    dispatch({ type: "IMPORT_INVOICES", invoiceType: type, invoices, newParties });
    toast(`Imported ${invoices.length} ${type} invoice${invoices.length === 1 ? "" : "s"}${v.invalid.length ? ` · ${v.invalid.length} rejected` : ""}`, invoices.length ? "success" : "warning");
    setStep(4);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 17, pb: 1 }}>
        Import invoices
        <Typography variant="caption" display="block" color="text.secondary">CSV wizard · validation before anything touches your books</Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} sx={{ mb: 3 }} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel sx={{ fontSize: 12 }}>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {step === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose what you are importing. Both flows validate dates, amounts and duplicates before importing.
            </Typography>
            <ToggleButtonGroup value={type} exclusive onChange={(e, v) => v && setType(v)} size="small" sx={{ mb: 2 }}>
              <ToggleButton value="sales">Sales invoices (receivables)</ToggleButton>
              <ToggleButton value="purchase">Purchase invoices (payables)</ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <Box
                onClick={() => setMode("csv")}
                sx={{
                  border: mode === "csv" ? "2px solid #0e7c78" : "2px solid #e3e8ee", borderRadius: 3, p: 2, cursor: "pointer",
                  background: mode === "csv" ? "rgba(18,165,160,0.06)" : "transparent", transition: "all .2s",
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>CSV file</Typography>
                <Typography variant="caption" color="text.secondary">Full wizard: preview, column mapping, validation, duplicate checks. Downloadable samples included.</Typography>
              </Box>
              <Box
                onClick={() => setMode("pdf")}
                sx={{
                  border: mode === "pdf" ? "2px solid #0e7c78" : "2px solid #e3e8ee", borderRadius: 3, p: 2, cursor: "pointer",
                  background: mode === "pdf" ? "rgba(18,165,160,0.06)" : "transparent", transition: "all .2s",
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>PDF invoice (demo preview)</Typography>
                <Typography variant="caption" color="text.secondary">No OCR backend is connected, so “extracted” fields are demo placeholders you must review and confirm before import.</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {step === 1 && mode === "pdf" && (
          <Box>
            <Box
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handlePdf(e.dataTransfer.files && e.dataTransfer.files[0]); }}
              onClick={() => pdfRef.current && pdfRef.current.click()}
              sx={{
                border: "2px dashed #cbd5df", borderRadius: 3, p: 4, textAlign: "center", cursor: "pointer",
                transition: "border-color .2s, background .2s", "&:hover": { borderColor: "primary.main", background: "rgba(18,165,160,0.04)" },
              }}
            >
              <UploadFileIcon color="primary" sx={{ fontSize: 36 }} />
              <Typography sx={{ fontWeight: 600, mt: 1 }}>{fileName ? `Selected: ${fileName}` : "Drop a PDF invoice here, or click to browse"}</Typography>
              <Typography variant="caption" color="text.secondary">The file is not parsed — the preview below is a labelled demo simulation.</Typography>
              <input ref={pdfRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => handlePdf(e.target.files && e.target.files[0])} />
            </Box>
            {pdfDraft && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12.5 }}>
                  <strong>Demo preview — no OCR performed.</strong> These fields were not read from the PDF. Review and correct them; import only happens after you confirm.
                </Alert>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  <TextField size="small" label="Invoice number" value={pdfDraft.number} onChange={(e) => setPdfDraft({ ...pdfDraft, number: e.target.value })} />
                  <TextField size="small" label={type === "sales" ? "Customer" : "Supplier"} value={pdfDraft.party} onChange={(e) => setPdfDraft({ ...pdfDraft, party: e.target.value })} />
                  <TextField size="small" type="number" label="Amount (₹)" value={pdfDraft.amount} onChange={(e) => setPdfDraft({ ...pdfDraft, amount: e.target.value })} inputProps={{ min: 0 }} />
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <TextField size="small" type="date" label="Invoice date" value={pdfDraft.issueDate} onChange={(e) => setPdfDraft({ ...pdfDraft, issueDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                    <TextField size="small" type="date" label="Due date" value={pdfDraft.dueDate} onChange={(e) => setPdfDraft({ ...pdfDraft, dueDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                  </Box>
                </Box>
                <FormControlLabel
                  sx={{ mt: 1.5 }}
                  control={<Checkbox checked={pdfConfirmed} onChange={(e) => setPdfConfirmed(e.target.checked)} />}
                  label={<Typography sx={{ fontSize: 12.5 }}>I have verified these extracted details against the original PDF (required — human confirmation).</Typography>}
                />
              </Box>
            )}
          </Box>
        )}

        {step === 1 && mode === "csv" && (
          <Box>
            <Box
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current && fileRef.current.click()}
              sx={{
                border: "2px dashed #cbd5df", borderRadius: 3, p: 5, textAlign: "center", cursor: "pointer",
                transition: "border-color .2s, background .2s", "&:hover": { borderColor: "primary.main", background: "rgba(18,165,160,0.04)" },
              }}
            >
              <UploadFileIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography sx={{ fontWeight: 600, mt: 1 }}>Drop a CSV here, or click to browse</Typography>
              <Typography variant="caption" color="text.secondary">Only .csv files are read locally in your browser.</Typography>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => handleFile(e.target.files && e.target.files[0])} />
            </Box>
            <Typography variant="body2" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>No file handy? Download a sample:</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Link component="button" variant="body2" onClick={() => downloadCSV(`sample-${type}-invoices.csv`, parseCSV(sampleCSV(type)).records, parseCSV(sampleCSV(type)).headers.map((h) => ({ key: h })))}>
                Sample {type} CSV
              </Link>
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              <strong>{fileName}</strong> — {parsed.records.length} rows. Map your CSV columns to application fields:
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mb: 2 }}>
              {INVOICE_FIELD_DEFS.map((field) => (
                <TextField
                  key={field.key}
                  select
                  size="small"
                  label={`${field.label}${field.required ? " *" : ""}`}
                  value={mapping[field.key] || IGNORE}
                  onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value === IGNORE ? "" : e.target.value }))}
                >
                  <MenuItem value={IGNORE}>— not in file —</MenuItem>
                  {parsed.headers.map((h) => (
                    <MenuItem key={h} value={h}>{h}</MenuItem>
                  ))}
                </TextField>
              ))}
            </Box>
            <TableContainer sx={{ border: "1px solid #e3e8ee", borderRadius: 2, maxHeight: 220 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>{parsed.headers.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {parsed.records.slice(0, 4).map((rec, i) => (
                    <TableRow key={i}>{parsed.headers.map((h) => <TableCell key={h}>{rec[h]}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {step === 3 && validation && (
          <Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              <Chip color="success" variant="outlined" label={`${validation.importable.length} ready to import`} />
              <Chip color="error" variant="outlined" label={`${validation.invalid.length} invalid rows`} />
              <Chip color="warning" variant="outlined" label={`${validation.duplicates} duplicate warnings`} />
              <Chip variant="outlined" label={`${validation.unknown.length} unknown ${type === "sales" ? "customers" : "suppliers"}`} />
            </Box>

            {validation.invalid.length > 0 && (
              <Alert severity="error" sx={{ mb: 2, fontSize: 12.5 }}>
                {validation.invalid.slice(0, 4).map((r) => (
                  <div key={r.idx}>Row {r.idx + 2}: {r.errors.join("; ")}</div>
                ))}
                {validation.invalid.length > 4 && <div>…and {validation.invalid.length - 4} more. Fix the CSV and re-upload, or import without them.</div>}
              </Alert>
            )}

            {validation.duplicates > 0 && (
              <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
                {validation.duplicates} row(s) have invoice numbers that already exist (or repeat in the file). They will be skipped to avoid double-counting in the forecast.
              </Alert>
            )}

            {validation.unknown.length > 0 && (
              <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <span>{validation.unknown.length} {type === "sales" ? "customer" : "supplier"} name(s) are new: {validation.unknown.slice(0, 3).map((u) => u.party).join(", ")}{validation.unknown.length > 3 ? "…" : ""}. New parties start with no payment history.</span>
                  <Button size="small" variant={createUnknown ? "contained" : "outlined"} onClick={() => setCreateUnknown((v) => !v)}>
                    {createUnknown ? "Creating new parties" : "Skipping unknown parties"}
                  </Button>
                </Box>
              </Alert>
            )}

            <TableContainer sx={{ border: "1px solid #e3e8ee", borderRadius: 2, maxHeight: 240 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell><TableCell>Number</TableCell><TableCell>{type === "sales" ? "Customer" : "Supplier"}</TableCell>
                    <TableCell align="right">Amount</TableCell><TableCell>Due</TableCell><TableCell>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validation.valid.slice(0, 8).map((v) => (
                    <TableRow key={v.idx}>
                      <TableCell>{v.idx + 2}</TableCell>
                      <TableCell>{v.number}</TableCell>
                      <TableCell>{v.party} {!v.known && <Chip size="small" label="new" sx={{ height: 16, fontSize: 11.8 }} />}</TableCell>
                      <TableCell align="right" className="amount-cell">{(v.amountPaise / 100).toLocaleString("en-IN")}</TableCell>
                      <TableCell>{v.dueDate}</TableCell>
                      <TableCell>
                        {v.dupExisting || v.dupFile
                          ? <Chip size="small" color="warning" label="skipped (duplicate)" sx={{ height: 18, fontSize: 11.8 }} />
                          : <Chip size="small" color="success" label="will import" sx={{ height: 18, fontSize: 11.8 }} />}
                      </TableCell>
                    </TableRow>
                  ))}
                  {validation.invalid.slice(0, 4).map((r) => (
                    <TableRow key={r.idx}>
                      <TableCell>{r.idx + 2}</TableCell>
                      <TableCell>{r.number || "—"}</TableCell>
                      <TableCell>{r.party || "—"}</TableCell>
                      <TableCell /><TableCell />
                      <TableCell><Chip size="small" color="error" label={r.errors[0]} sx={{ height: 18, fontSize: 11.8 }} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {step === 4 && mode === "pdf" && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 52 }} />
            <Typography variant="h6" sx={{ mt: 1 }}>PDF preview imported</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              1 invoice imported after human confirmation. Forecast and dashboard values have been recalculated.
            </Typography>
          </Box>
        )}

        {step === 4 && validation && mode === "csv" && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 52 }} />
            <Typography variant="h6" sx={{ mt: 1 }}>Import finished</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {validation.importable.length} invoice(s) imported · {validation.invalid.length} rejected · {validation.duplicates} duplicates skipped.
              Forecast and dashboard values have been recalculated.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button color="inherit" onClick={() => { reset(); onClose(); }}>Close</Button>
        <Box sx={{ flex: 1 }} />
        {step > 0 && step < 4 && <Button onClick={() => setStep((s) => (mode === "pdf" ? 0 : s - 1))}>Back</Button>}
        {step === 0 && <Button variant="contained" onClick={() => setStep(1)}>Continue</Button>}
        {step === 1 && mode === "csv" && <Button variant="contained" disabled={!parsed.records.length} onClick={() => setStep(2)}>Use parsed file</Button>}
        {step === 1 && mode === "pdf" && <Button variant="contained" disabled={!pdfDraft || !pdfConfirmed} onClick={confirmPdfImport}>Confirm & import (demo)</Button>}
        {step === 2 && (
          <Button variant="contained" disabled={!mapping.number || !mapping.party || !mapping.amount || !mapping.issueDate || !mapping.dueDate} onClick={() => setStep(3)}>
            Validate
          </Button>
        )}
        {step === 3 && (
          <Button variant="contained" disabled={!validation || validation.importable.length === 0} onClick={confirmImport}>
            Import {validation ? validation.importable.length : 0} invoices
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
