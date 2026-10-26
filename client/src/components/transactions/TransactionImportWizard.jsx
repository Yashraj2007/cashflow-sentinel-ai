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
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { Users, Package } from "lucide-react";

import { parseCSV, downloadCSV } from "../../utils/csv.js";
import { parseAnyDate, rupeesToPaise, todayISO } from "../../utils/finance.js";
import { useApp } from "../../context/AppContext.jsx";

// ── Field definitions ─────────────────────────────────────────────────────────
const TX_FIELD_DEFS = [
  { key: "date", label: "Date", required: true },
  { key: "label", label: "Description / Label", required: true },
  { key: "amount", label: "Amount (₹)", required: true },
  { key: "direction", label: "Direction (in/out)", required: true },
  { key: "category", label: "Category", required: false },
  { key: "status", label: "Status", required: false },
  { key: "party", label: "Customer / Supplier name (for auto-link)", required: false },
];

const IGNORE = "__ignore__";
const STEPS = ["Upload", "Map columns", "Validate & auto-link", "Import"];

const VALID_DIRECTIONS = new Set(["in", "out", "credit", "debit", "receipt", "payment"]);
const DIR_MAP = { credit: "in", receipt: "in", debit: "out", payment: "out" };

const VALID_CATEGORIES = [
  "cash-sales", "invoice-receipt", "supplier-payment", "salary",
  "rent", "utilities", "loan-emi", "tax", "inventory",
  "marketing", "operating", "financing",
];

function guessCategory(label = "", direction = "out") {
  const l = label.toLowerCase();
  if (/salary|wages|payroll|bonus/.test(l)) return "salary";
  if (/rent|lease|utilities|electricity|water|internet/.test(l)) return "rent";
  if (/loan|emi|repayment|instalment/.test(l)) return "loan-emi";
  if (/tax|gst|tds|income.*tax/.test(l)) return "tax";
  if (/inventory|stock|purchase|raw.*material/.test(l)) return direction === "out" ? "inventory" : "operating";
  if (/marketing|advertising|promotion/.test(l)) return "marketing";
  if (/sale|revenue|receipt|customer/.test(l) && direction === "in") return direction === "in" ? "cash-sales" : "operating";
  if (/supplier|vendor|payment|bill/.test(l) && direction === "out") return "supplier-payment";
  return direction === "in" ? "invoice-receipt" : "operating";
}

function guessMapping(headers) {
  const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z]/g, "");
  const patterns = {
    date: ["date", "txdate", "transactiondate", "valuedate", "postingdate"],
    label: ["description", "label", "narration", "particular", "details", "remarks", "txdescription"],
    amount: ["amount", "credit", "debit", "value", "sum", "txamount"],
    direction: ["type", "direction", "drorcr", "creditdebit", "txtype", "transactiontype"],
    category: ["category", "head", "txcategory", "accounthead"],
    status: ["status", "state"],
    party: ["party", "partyname", "customer", "customername", "supplier", "suppliername", "name", "clientname"],
  };
  const mapping = {};
  headers.forEach((header) => {
    const n = norm(header);
    Object.entries(patterns).forEach(([field, keys]) => {
      if (!mapping[field] && keys.includes(n)) mapping[field] = header;
    });
  });
  return mapping;
}

function sampleTransactionCSV() {
  return [
    "date,description,amount,type,category,party",
    "2026-10-01,Cash sale — Sharma Hardware,85000,in,cash-sales,Sharma Hardware",
    "2026-10-03,Salary — October,120000,out,salary,",
    "2026-10-05,Polar Cables Ltd — BILL-505,182000,out,inventory,Polar Cables Ltd",
    "2026-10-08,GST payment,34200,out,tax,",
    "2026-10-10,Invoice receipt — Gupta Electricals,96500,in,invoice-receipt,Gupta Electricals",
    "2026-10-12,Electricity bill,9800,out,utilities,",
  ].join("\n");
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TransactionImportWizard({ open, onClose }) {
  const { dataset, dispatch, toast } = useApp();
  const [step, setStep] = useState(0);
  const [parsed, setParsed] = useState({ headers: [], records: [] });
  const [mapping, setMapping] = useState({});
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  // Build lookup maps from existing customers and suppliers
  const partyMap = useMemo(() => {
    const map = new Map();
    (dataset.customers || []).forEach((c) => {
      map.set(c.name.toLowerCase(), { type: "customer", id: c.id, name: c.name });
    });
    (dataset.suppliers || []).forEach((s) => {
      map.set(s.name.toLowerCase(), { type: "supplier", id: s.id, name: s.name });
    });
    return map;
  }, [dataset.customers, dataset.suppliers]);

  // Validation + party auto-linking
  const validation = useMemo(() => {
    if (!parsed.records.length) return null;
    const get = (rec, field) => (mapping[field] ? rec[mapping[field]] : "");
    const valid = [];
    const invalid = [];

    parsed.records.forEach((rec, idx) => {
      const errors = [];
      const dateStr = parseAnyDate(get(rec, "date"));
      const label = String(get(rec, "label") || "").trim();
      const amountRaw = String(get(rec, "amount") || "").replace(/[₹,\s]/g, "");
      const amount = Number(amountRaw);
      const dirRaw = String(get(rec, "direction") || "in").toLowerCase().trim();
      const direction = DIR_MAP[dirRaw] || (VALID_DIRECTIONS.has(dirRaw) ? dirRaw : "out");
      const categoryRaw = String(get(rec, "category") || "").toLowerCase().trim();
      const category = VALID_CATEGORIES.includes(categoryRaw) ? categoryRaw : guessCategory(label, direction);
      const statusRaw = String(get(rec, "status") || "actual").toLowerCase().trim();
      const status = ["actual", "confirmed", "expected"].includes(statusRaw) ? statusRaw : "actual";
      const partyName = String(get(rec, "party") || "").trim();
      const matchedParty = partyName ? partyMap.get(partyName.toLowerCase()) : null;

      if (!dateStr) errors.push("Date invalid — use yyyy-mm-dd or dd/mm/yyyy");
      if (!label) errors.push("Description / label missing");
      if (!Number.isFinite(amount) || amount <= 0) errors.push("Amount must be a positive number");

      if (errors.length) {
        invalid.push({ idx, rec, errors, label, amount });
      } else {
        valid.push({
          idx, label, direction, category, status, partyName, matchedParty,
          amountPaise: rupeesToPaise(amount),
          date: dateStr,
          guessedCategory: category !== categoryRaw,
        });
      }
    });

    return { valid, invalid, importable: valid };
  }, [parsed, mapping, partyMap]);

  const reset = () => {
    setStep(0);
    setParsed({ headers: [], records: [] });
    setMapping({});
    setFileName("");
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCSV(String(reader.result || ""));
      setParsed(result);
      setMapping(guessMapping(result.headers));
      setFileName(file.name);
      if (result.records.length) setStep(1);
      else toast("That file has no data rows", "error");
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    const v = validation;
    const transactions = v.importable.map((row, n) => ({
      id: `tx-imp-${Date.now()}-${n}`,
      date: row.date,
      label: row.label,
      category: row.category,
      direction: row.direction,
      amountPaise: row.amountPaise,
      status: row.status,
      ...(row.matchedParty ? { partyRef: { type: row.matchedParty.type, id: row.matchedParty.id, name: row.matchedParty.name } } : {}),
    }));

    dispatch({ type: "IMPORT_BANK_TRANSACTIONS", transactions, newBalancePaise: null });
    toast(
      `Imported ${transactions.length} transaction${transactions.length === 1 ? "" : "s"} · ${v.invalid.length} rejected · ${v.importable.filter((r) => r.matchedParty).length} auto-linked to parties`,
      transactions.length ? "success" : "warning",
    );
    setStep(3);
  };

  const linkedCount = validation ? validation.importable.filter((r) => r.matchedParty).length : 0;
  const unlinkedCount = validation ? validation.importable.filter((r) => r.partyName && !r.matchedParty).length : 0;

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 17, pb: 1 }}>
        Import Transactions
        <Typography variant="caption" display="block" color="text.secondary">
          CSV wizard · auto-links customers &amp; suppliers from your existing data
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={step} sx={{ mb: 3 }} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel sx={{ fontSize: 12 }}>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {/* ── Step 0: Upload ─────────────────────────────────────────────── */}
        {step === 0 && (
          <Box>
            <Box
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current && fileRef.current.click()}
              sx={{
                border: "2px dashed #cbd5df",
                borderRadius: 3,
                p: 5,
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color .2s, background .2s",
                "&:hover": { borderColor: "#176B52", background: "rgba(23,107,82,0.04)" },
              }}
            >
              <UploadFileIcon color="primary" sx={{ fontSize: 40, color: "#176B52" }} />
              <Typography sx={{ fontWeight: 600, mt: 1, color: "#16271F" }}>
                {fileName ? `Selected: ${fileName}` : "Drop a CSV here, or click to browse"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Only .csv files are read locally in your browser. Nothing is uploaded to any server.
              </Typography>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => handleFile(e.target.files && e.target.files[0])}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ fontSize: 12.5, mb: 1.5 }}>
                <strong>Auto-linking:</strong> If your CSV has a <em>Customer / Supplier name</em> column, it will
                automatically be matched against your existing customers &amp; suppliers and linked — no manual re-entry
                needed.
              </Alert>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: "#16271F" }}>
                No file handy? Download a sample:
              </Typography>
              <Link
                component="button"
                variant="body2"
                onClick={() =>
                  downloadCSV("sample-transactions.csv", parseCSV(sampleTransactionCSV()).records,
                    parseCSV(sampleTransactionCSV()).headers.map((h) => ({ key: h })))
                }
                sx={{ color: "#176B52" }}
              >
                Download sample transactions CSV
              </Link>
            </Box>
          </Box>
        )}

        {/* ── Step 1: Map columns ────────────────────────────────────────── */}
        {step === 1 && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              <strong>{fileName}</strong> — {parsed.records.length} rows detected. Map your CSV columns to the
              required fields:
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mb: 2 }}>
              {TX_FIELD_DEFS.map((field) => (
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

            {/* CSV preview */}
            <TableContainer sx={{ border: "1px solid #e3e8ee", borderRadius: 2, maxHeight: 200 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {parsed.headers.map((h) => <TableCell key={h} sx={{ fontSize: 11.5, fontWeight: 700 }}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsed.records.slice(0, 4).map((rec, i) => (
                    <TableRow key={i}>
                      {parsed.headers.map((h) => <TableCell key={h} sx={{ fontSize: 12 }}>{rec[h]}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Step 2: Validate + Party auto-link ─────────────────────────── */}
        {step === 2 && validation && (
          <Box>
            {/* Summary chips */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              <Chip color="success" variant="outlined" label={`${validation.importable.length} ready to import`} />
              <Chip color="error" variant="outlined" label={`${validation.invalid.length} invalid rows`} />
              {linkedCount > 0 && (
                <Chip
                  icon={<PersonIcon sx={{ fontSize: 14 }} />}
                  color="primary"
                  variant="outlined"
                  label={`${linkedCount} auto-linked to party`}
                />
              )}
              {unlinkedCount > 0 && (
                <Chip
                  variant="outlined"
                  label={`${unlinkedCount} party name(s) not found`}
                />
              )}
            </Box>

            {/* Auto-link summary panel */}
            {(linkedCount > 0 || unlinkedCount > 0) && (
              <Alert severity={linkedCount > 0 ? "success" : "info"} sx={{ mb: 2, fontSize: 12.5 }}>
                <Box>
                  {linkedCount > 0 && (
                    <div>
                      <strong>✓ Auto-linked:</strong>{" "}
                      {validation.importable
                        .filter((r) => r.matchedParty)
                        .slice(0, 5)
                        .map((r) => `${r.partyName} → ${r.matchedParty.type === "customer" ? "Customer" : "Supplier"}`)
                        .join(", ")}
                      {linkedCount > 5 ? ` …and ${linkedCount - 5} more` : ""}
                    </div>
                  )}
                  {unlinkedCount > 0 && (
                    <div style={{ marginTop: linkedCount > 0 ? 4 : 0 }}>
                      <strong>Not matched:</strong>{" "}
                      {validation.importable
                        .filter((r) => r.partyName && !r.matchedParty)
                        .slice(0, 3)
                        .map((r) => r.partyName)
                        .join(", ")}
                      {unlinkedCount > 3 ? ` …and ${unlinkedCount - 3} more` : ""}
                      {" "}— transactions will still be imported but without a party link.
                    </div>
                  )}
                </Box>
              </Alert>
            )}

            {/* Error list */}
            {validation.invalid.length > 0 && (
              <Alert severity="error" sx={{ mb: 2, fontSize: 12.5 }}>
                <strong>{validation.invalid.length} row(s) will be skipped:</strong>
                {validation.invalid.slice(0, 5).map((r) => (
                  <div key={r.idx}>Row {r.idx + 2}: {r.errors.join("; ")}</div>
                ))}
                {validation.invalid.length > 5 && <div>…and {validation.invalid.length - 5} more</div>}
              </Alert>
            )}

            {/* Transaction preview table */}
            <TableContainer sx={{ border: "1px solid #e3e8ee", borderRadius: 2, maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Description</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }} align="right">Amount (₹)</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Dir</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Party auto-link</TableCell>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validation.valid.slice(0, 10).map((v) => (
                    <TableRow key={v.idx}>
                      <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{v.date}</TableCell>
                      <TableCell sx={{ fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.label}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={v.category}
                          sx={{ height: 18, fontSize: 10.5 }}
                          color={v.guessedCategory ? "warning" : "default"}
                          variant="outlined"
                        />
                        {v.guessedCategory && <Typography sx={{ fontSize: 10, color: "text.secondary" }}>auto-guessed</Typography>}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600, color: v.direction === "in" ? "#16805D" : "#BC3D35" }}>
                        {v.direction === "in" ? "+" : "−"}{(v.amountPaise / 100).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={v.direction}
                          sx={{ height: 18, fontSize: 11 }}
                          color={v.direction === "in" ? "success" : "error"}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {v.matchedParty ? (
                          <Chip
                            size="small"
                            icon={v.matchedParty.type === "customer"
                              ? <PersonIcon sx={{ fontSize: 13 }} />
                              : <BusinessIcon sx={{ fontSize: 13 }} />}
                            label={`${v.matchedParty.name} (${v.matchedParty.type})`}
                            color="primary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        ) : v.partyName ? (
                          <Chip size="small" label={`"${v.partyName}" — no match`} sx={{ height: 18, fontSize: 10.5 }} />
                        ) : (
                          <Typography sx={{ fontSize: 11, color: "text.disabled" }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={v.status} sx={{ height: 18, fontSize: 10.5 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {validation.invalid.slice(0, 3).map((r) => (
                    <TableRow key={`inv-${r.idx}`} sx={{ bgcolor: "rgba(188,61,53,0.04)" }}>
                      <TableCell colSpan={2} sx={{ fontSize: 12, color: "#BC3D35" }}>{r.label || "—"}</TableCell>
                      <TableCell colSpan={5}>
                        <Chip size="small" color="error" label={r.errors[0]} sx={{ height: 18, fontSize: 11 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {validation.valid.length > 10 && (
              <Typography sx={{ mt: 1, fontSize: 12, color: "text.secondary" }}>
                Showing 10 of {validation.valid.length} valid rows in preview.
              </Typography>
            )}
          </Box>
        )}

        {/* ── Step 3: Done ───────────────────────────────────────────────── */}
        {step === 3 && validation && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 52, color: "#16805D" }} />
            <Typography variant="h6" sx={{ mt: 1 }}>Import finished!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              {validation.importable.length} transaction{validation.importable.length === 1 ? "" : "s"} imported ·{" "}
              {validation.invalid.length} rejected ·{" "}
              {linkedCount} auto-linked to customers / suppliers.
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              The forecast and all dashboards have been recalculated with the new data.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button color="inherit" onClick={() => { reset(); onClose(); }}>Close</Button>
        <Box sx={{ flex: 1 }} />
        {step > 0 && step < 3 && (
          <Button onClick={() => setStep((s) => s - 1)}>Back</Button>
        )}
        {step === 0 && (
          <Button variant="contained" onClick={() => fileRef.current && fileRef.current.click()}
            sx={{ background: "linear-gradient(135deg, #176B52, #0E523F)", "&:hover": { background: "linear-gradient(135deg, #1d8066, #176B52)" } }}>
            Browse file
          </Button>
        )}
        {step === 1 && (
          <Button
            variant="contained"
            disabled={!mapping.date || !mapping.label || !mapping.amount}
            onClick={() => setStep(2)}
            sx={{ background: "linear-gradient(135deg, #176B52, #0E523F)", "&:hover": { background: "linear-gradient(135deg, #1d8066, #176B52)" } }}
          >
            Validate →
          </Button>
        )}
        {step === 2 && (
          <Button
            variant="contained"
            disabled={!validation || validation.importable.length === 0}
            onClick={confirmImport}
            sx={{ background: "linear-gradient(135deg, #176B52, #0E523F)", "&:hover": { background: "linear-gradient(135deg, #1d8066, #176B52)" } }}
          >
            Import {validation ? validation.importable.length : 0} transactions
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
