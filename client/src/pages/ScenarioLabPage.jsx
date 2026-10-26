import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import LinearProgress from "@mui/material/LinearProgress";
import GlobalStyles from "@mui/material/GlobalStyles";

import {
  BrainCircuit,
  Mail,
  PhoneCall,
  DollarSign,
  Split,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Calendar,
  Send,
  Building2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  Volume2,
  X,
  Layers,
  Zap,
} from "lucide-react";

import { useApp } from "../context/AppContext.jsx";
import { MetricCard, EmptyState, CSVExportButton, ConfirmDialog, InfoTip } from "../components/common.jsx";
import { ScenarioComparisonChart } from "../components/charts.jsx";
import { evaluateScenario } from "../services/scenarioService.js";
import { outstandingPaise } from "../utils/calculations.js";
import { formatINR, formatDisplay, todayISO, addDaysISO, daysBetween } from "../utils/finance.js";

export default function ScenarioLabPage() {
  const { dataset, settings, state, dispatch, toast } = useApp();
  const navigate = useNavigate();
  const today = todayISO();

  // Active simulated recommendations
  const [activeActions, setActiveActions] = useState([]);
  const [acceptOpen, setAcceptOpen] = useState(false);

  // Two dedicated features: "moment" (Moment Scenario Viewer) & "general" (General Scenario Graph)
  const [activeTab, setActiveTab] = useState(state.scenarioDraft ? "moment" : "general");

  // Grab proposed deal from Deal Impact Checker
  const [grabDeal, setGrabDeal] = useState(Boolean(state.scenarioDraft));
  useEffect(() => {
    if (state.scenarioDraft) {
      setGrabDeal(true);
      setActiveTab("moment");
    }
  }, [state.scenarioDraft]);

  // On-graph solution preview overlay state
  const [hoveredRec, setHoveredRec] = useState(null);
  const leaveTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // Execution modal states
  const [emailModal, setEmailModal] = useState({ open: false, candidate: null });
  const [callModal, setCallModal] = useState({ open: false, candidate: null, status: "idle" });
  const [advanceModal, setAdvanceModal] = useState({ open: false, candidate: null });
  const [splitModal, setSplitModal] = useState({ open: false, candidate: null });

  const dealDate = state.scenarioDraft?.receiptDate;
  const horizonDays = useMemo(() => {
    if (!dealDate) return 35;
    const days = daysBetween(today, dealDate);
    return Math.max(35, days + 7);
  }, [today, dealDate]);

  // Baseline evaluation (zero adjustments: General Scenario)
  const baselineResult = useMemo(
    () => evaluateScenario(dataset, settings, [], { horizonDays, today }),
    [dataset, settings, horizonDays, today]
  );

  const baselineDiff = baselineResult.diff;
  const breachDate = baselineDiff.baselineBreachDate;
  const shortageAmount = baselineDiff.baselineNeeded;
  const hasShortage = Boolean(breachDate);

  // Customers & suppliers lookup
  const customers = useMemo(
    () => Object.fromEntries(dataset.customers.map((c) => [c.id, c])),
    [dataset.customers]
  );
  const suppliers = useMemo(
    () => Object.fromEntries(dataset.suppliers.map((s) => [s.id, s])),
    [dataset.suppliers]
  );

  // Auto-generate the 4 intelligent recommendations based on live payments & expenses
  const recommendations = useMemo(() => {
    const list = [];
    const openSales = dataset.salesInvoices
      .filter((i) => !i.isDraft && outstandingPaise(i) > 0)
      .sort((a, b) => outstandingPaise(b) - outstandingPaise(a));
    const openPurchases = dataset.purchaseInvoices
      .filter((i) => outstandingPaise(i) > 0)
      .sort((a, b) => outstandingPaise(b) - outstandingPaise(a));

    // 1. Email Automation of Reminder
    // Target: Customer invoice landing around/after the shortage date
    const emailTarget =
      openSales.find((i) => i.dueDate >= (breachDate || today)) || openSales[0];
    if (emailTarget) {
      const cust = customers[emailTarget.partyId] || { name: "Customer", email: "accounts@client.com" };
      const amount = outstandingPaise(emailTarget);
      list.push({
        id: "rec-email",
        type: "email",
        title: "Email Automation of Reminder",
        subtitle: `Automate payment reminder to ${cust.name}`,
        partyName: cust.name,
        contact: cust.email || `${cust.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
        invoiceNumber: emailTarget.number,
        invoiceAmountPaise: amount,
        impactText: `Accelerates ~${formatINR(amount)} collection 4 days earlier`,
        description: `Sends an automated formal reminder email with integrated payment link to ${cust.name} to clear Invoice #${emailTarget.number} before the projected shortage date.`,
        actionType: "delayInvoice",
        adjustment: {
          type: "delayInvoice",
          invoiceType: "sales",
          invoiceId: emailTarget.id,
          days: -4,
          label: `Early collection from ${cust.name} (${emailTarget.number})`,
        },
        icon: Mail,
        badgeColor: "#3B82F6",
      });
    }

    // 2. Call Automation of Reminder
    // Target: Second-largest or delayed customer invoice
    const callTarget =
      openSales.find((i) => i.id !== (emailTarget && emailTarget.id)) || openSales[0];
    if (callTarget) {
      const cust = customers[callTarget.partyId] || { name: "Customer", phone: "+91 98201 44521" };
      const amount = outstandingPaise(callTarget);
      list.push({
        id: "rec-call",
        type: "call",
        title: "Call Automation of Reminder",
        subtitle: `AI voice follow-up call with ${cust.name}`,
        partyName: cust.name,
        contact: cust.phone || "+91 98201 88412",
        invoiceNumber: callTarget.number,
        invoiceAmountPaise: amount,
        impactText: `Brings forward ${formatINR(amount)} through phone escalation`,
        description: `Triggers an automated voice AI call to ${cust.name}'s accounts department to expedite clearance of ${formatINR(amount)} on Invoice #${callTarget.number}.`,
        actionType: "delayInvoice",
        adjustment: {
          type: "delayInvoice",
          invoiceType: "sales",
          invoiceId: callTarget.id,
          days: -6,
          label: `Voice call collection from ${cust.name} (${callTarget.number})`,
        },
        icon: PhoneCall,
        badgeColor: "#8B5CF6",
      });
    }

    // 3. Requesting 50% Advance
    // Target: Largest upcoming sales order
    const advanceTarget = openSales[0];
    if (advanceTarget) {
      const cust = customers[advanceTarget.partyId] || { name: "Customer" };
      const halfAmount = Math.round(outstandingPaise(advanceTarget) / 2);
      list.push({
        id: "rec-advance",
        type: "advance",
        title: "Requesting 50% Advance",
        subtitle: `Request 50% upfront deposit on ${advanceTarget.number}`,
        partyName: cust.name,
        invoiceNumber: advanceTarget.number,
        invoiceAmountPaise: halfAmount,
        impactText: `Immediate injection of +${formatINR(halfAmount)} cash`,
        description: `Propose a 50% advance notice (${formatINR(halfAmount)}) against Order #${advanceTarget.number} before delivery, securing liquidity 2 days before the shortage.`,
        actionType: "advance",
        adjustment: {
          type: "advance",
          invoiceId: advanceTarget.id,
          percent: 50,
          date: addDaysISO(today, 2),
          label: `50% Advance from ${cust.name} (${advanceTarget.number})`,
        },
        icon: DollarSign,
        badgeColor: "#10B981",
      });
    }

    // 4. Splitting Payment on Shortage Day and Deal Day
    // Target: Largest supplier bill due on or around shortage date
    const splitTarget = openPurchases[0];
    if (splitTarget) {
      const supp = suppliers[splitTarget.partyId] || { name: "Supplier" };
      const halfBill = Math.round(outstandingPaise(splitTarget) / 2);
      list.push({
        id: "rec-split",
        type: "split",
        title: "Splitting Payment on Shortage Day & Deal Day",
        subtitle: `Split ${supp.name} bill across two dates`,
        partyName: supp.name,
        invoiceNumber: splitTarget.number,
        invoiceAmountPaise: halfBill,
        impactText: `Halves immediate outflow: saves ${formatINR(halfBill)} on shortage day`,
        description: `Negotiate paying 50% (${formatINR(halfBill)}) on the shortage date, deferring the remaining 50% to the deal receipt day when customer receivables clear.`,
        actionType: "supplierExtension",
        adjustment: {
          type: "supplierExtension",
          invoiceId: splitTarget.id,
          days: 12,
          label: `Split payment agreement with ${supp.name} (${splitTarget.number})`,
        },
        icon: Split,
        badgeColor: "#F59E0B",
      });
    }

    return list;
  }, [dataset.salesInvoices, dataset.purchaseInvoices, customers, suppliers, breachDate, today]);

  // 1. Moment Scenario result (General Scenario baseline vs Deal Grab Scenario)
  const momentScenarioResult = useMemo(() => {
    if (!grabDeal || !state.scenarioDraft) {
      return baselineResult;
    }
    let draftAdj = state.scenarioDraft;
    const revenue = draftAdj.amountPaise || 0;
    const rDate = draftAdj.receiptDate || addDaysISO(today, 25);
    const isFar = daysBetween(today, rDate) > 3;

    // Ensure deal impact has an upfront milestone if scheduled far, so upward growth is visible
    if (!draftAdj.events || draftAdj.events.length <= 1) {
      if (isFar) {
        const half = Math.round(revenue / 2);
        draftAdj = {
          ...draftAdj,
          events: [
            { date: addDaysISO(today, 2), label: `Deal advance booking (50%)`, direction: "in", amountPaise: half },
            { date: rDate, label: `Deal settlement balance (50%)`, direction: "in", amountPaise: revenue - half },
          ],
        };
      } else {
        draftAdj = {
          ...draftAdj,
          events: [
            { date: rDate, label: `Deal settlement`, direction: "in", amountPaise: revenue },
          ],
        };
      }
    }
    return evaluateScenario(dataset, settings, [draftAdj], { horizonDays, today });
  }, [dataset, settings, grabDeal, state.scenarioDraft, horizonDays, today, baselineResult]);

  // 2. General Scenario result based on actively simulated remediation actions
  const generalScenarioResult = useMemo(() => {
    const activeAdjs = activeActions.map((a) => a.adjustment);
    return evaluateScenario(dataset, settings, activeAdjs, { horizonDays, today });
  }, [dataset, settings, activeActions, horizonDays, today]);

  const sDiff = generalScenarioResult.diff;
  const isResolved = activeActions.length > 0 && !sDiff.scenarioBreachDate;

  const mDiff = momentScenarioResult.diff;
  const isMomentUplift = mDiff.scenarioMin > baselineDiff.baselineMin;

  const loadDemoDeal = () => {
    const demo = {
      customerId: Object.keys(customers)[0] || "cust-1",
      customerName: "Tata Consultancy Services (TCS)",
      amountPaise: 15000000, // ₹1,50,000
      receiptDate: addDaysISO(today, 24),
      label: "Enterprise Retainer Contract (₹1,50,000)",
    };
    dispatch({ type: "SET_SCENARIO_DRAFT", draft: demo });
    setGrabDeal(true);
    setActiveTab("moment");
    toast("Loaded sample deal for Tata Consultancy Services into Moment Scenario Viewer", "info");
  };

  // Toggle recommendation simulation in graph
  const toggleSimulation = (rec) => {
    setActiveActions((prev) => {
      const exists = prev.some((item) => item.id === rec.id);
      if (exists) {
        toast(`Removed “${rec.title}” from simulation`);
        return prev.filter((item) => item.id !== rec.id);
      } else {
        toast(`Simulating “${rec.title}” — graph updated!`, "info");
        return [...prev, rec];
      }
    });
  };

  // Execute action handlers
  const handleExecute = (rec) => {
    if (rec.type === "email") {
      setEmailModal({ open: true, candidate: rec });
    } else if (rec.type === "call") {
      setCallModal({ open: true, candidate: rec, status: "ready" });
    } else if (rec.type === "advance") {
      setAdvanceModal({ open: true, candidate: rec });
    } else if (rec.type === "split") {
      setSplitModal({ open: true, candidate: rec });
    }
  };

  const acceptLivePlan = () => {
    if (activeActions.length === 0) return;
    dispatch({
      type: "APPLY_SCENARIO",
      adjustments: activeActions.map((a) => a.adjustment),
    });
    toast("Action plan accepted! Live invoice dates and cash forecast recalculated.");
    setAcceptOpen(false);
  };

  const commitDealToLedger = () => {
    if (!state.scenarioDraft) return;
    const draft = state.scenarioDraft;
    const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const targetPartyId = draft.customerId || Object.keys(customers)[0] || "cust-1";
    const newInvoice = {
      id: `inv-${Date.now()}`,
      number: invoiceNumber,
      partyId: targetPartyId,
      issueDate: today,
      dueDate: draft.receiptDate || addDaysISO(today, 30),
      expectedPaymentDate: draft.receiptDate || addDaysISO(today, 30),
      totalPaise: draft.amountPaise || 0,
      paidPaise: 0,
      status: "confirmed",
      notes: `Committed deal for ${draft.customerName || "Customer"} (${formatINR(draft.amountPaise)}) from Deal Impact Checker`,
    };

    dispatch({ type: "ADD_SALES_INVOICE", invoice: newInvoice });
    dispatch({ type: "SET_SCENARIO_DRAFT", draft: null });
    setGrabDeal(false);
    toast(`Deal committed! Automatically submitted and saved as Invoice ${invoiceNumber} for ${draft.customerName}.`, "success");
  };

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
              <BrainCircuit size={13} color="#B5E7CC" />
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
              Predictive Cash AI
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
            Scenario Lab
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
            Live cash outlook generated from predicted upcoming customer payments and committed expenses. Recommended actions automatically resolve projected cash shortages.
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
          {activeTab === "general" ? (
            <>
              {activeActions.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<RotateCcw size={14} color="#B5E7CC" />}
                  onClick={() => setActiveActions([])}
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
                  }}
                >
                  Reset Simulation
                </Button>
              )}

              <Button
                variant="contained"
                startIcon={<CheckCircle2 size={15} />}
                disabled={activeActions.length === 0}
                onClick={() => setAcceptOpen(true)}
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
                Apply Plan to Live ({activeActions.length})
              </Button>
            </>
          ) : (
            <>
              {state.scenarioDraft ? (
                <Button
                  variant="contained"
                  startIcon={<CheckCircle2 size={15} />}
                  onClick={commitDealToLedger}
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
                    "&:hover": {
                      background: "linear-gradient(135deg, #2DB481 0%, #1D7A57 100%)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  Grab Deal & Save to Ledger
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<Sparkles size={14} color="#B5E7CC" />}
                  onClick={loadDemoDeal}
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
                  }}
                >
                  Simulate Demo Deal
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Segmented Tab Switcher: 2 Distinct Purpose-Driven Features */}
      <Box
        sx={{
          mb: 2.8,
          p: 0.8,
          borderRadius: "16px",
          bgcolor: "rgba(22, 39, 31, 0.05)",
          border: "1px solid rgba(22, 39, 31, 0.1)",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 1.2,
        }}
      >
        {/* Tab 1: Moment Scenario Viewer */}
        <Box
          component="button"
          type="button"
          onClick={() => setActiveTab("moment")}
          sx={{
            py: 1.3,
            px: 2,
            borderRadius: "13px",
            border: activeTab === "moment" ? "1.5px solid rgba(16,185,129,0.5)" : "1.5px solid transparent",
            bgcolor: activeTab === "moment" ? "#FFFFFF" : "transparent",
            boxShadow: activeTab === "moment" ? "0 6px 18px rgba(17,40,31,0.08)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 180ms ease",
            textAlign: "left",
            outline: "none",
            "&:hover": {
              bgcolor: activeTab === "moment" ? "#FFFFFF" : "rgba(255,255,255,0.65)",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.4, minWidth: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "10px",
                display: "grid",
                placeItems: "center",
                bgcolor: activeTab === "moment" ? "rgba(16,185,129,0.18)" : "rgba(100,116,139,0.1)",
                color: activeTab === "moment" ? "#059669" : "#64748B",
                flexShrink: 0,
              }}
            >
              <Zap size={20} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: activeTab === "moment" ? "#14382B" : "#475569" }}>
                  Moment Scenario Viewer
                </Typography>
                {state.scenarioDraft ? (
                  <Chip
                    size="small"
                    label="Deal Active"
                    sx={{
                      height: 20,
                      fontSize: 11.8,
                      fontWeight: 800,
                      bgcolor: "rgba(16,185,129,0.2)",
                      color: "#065F46",
                    }}
                  />
                ) : (
                  <Chip
                    size="small"
                    label="Simulator"
                    sx={{
                      height: 20,
                      fontSize: 11.8,
                      fontWeight: 700,
                      bgcolor: "rgba(100,116,139,0.1)",
                      color: "#64748B",
                    }}
                  />
                )}
              </Box>
              <Typography sx={{ fontSize: 11.5, color: "#64748B", mt: 0.2 }}>
                Real-time deal impact: General Scenario vs. Deal Grab Scenario
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Tab 2: General Scenario Graph */}
        <Box
          component="button"
          type="button"
          onClick={() => setActiveTab("general")}
          sx={{
            py: 1.3,
            px: 2,
            borderRadius: "13px",
            border: activeTab === "general" ? "1.5px solid rgba(16,185,129,0.5)" : "1.5px solid transparent",
            bgcolor: activeTab === "general" ? "#FFFFFF" : "transparent",
            boxShadow: activeTab === "general" ? "0 6px 18px rgba(17,40,31,0.08)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 180ms ease",
            textAlign: "left",
            outline: "none",
            "&:hover": {
              bgcolor: activeTab === "general" ? "#FFFFFF" : "rgba(255,255,255,0.65)",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.4, minWidth: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "10px",
                display: "grid",
                placeItems: "center",
                bgcolor: activeTab === "general" ? "rgba(16,185,129,0.18)" : "rgba(100,116,139,0.1)",
                color: activeTab === "general" ? "#059669" : "#64748B",
                flexShrink: 0,
              }}
            >
              <TrendingUp size={20} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: activeTab === "general" ? "#14382B" : "#475569" }}>
                  General Scenario Graph
                </Typography>
                {hasShortage ? (
                  <Chip
                    size="small"
                    label="Shortage Alert"
                    sx={{
                      height: 20,
                      fontSize: 11.8,
                      fontWeight: 800,
                      bgcolor: "rgba(239,68,68,0.15)",
                      color: "#DC2626",
                    }}
                  />
                ) : (
                  <Chip
                    size="small"
                    label="Runway Safe"
                    sx={{
                      height: 20,
                      fontSize: 11.8,
                      fontWeight: 800,
                      bgcolor: "rgba(16,185,129,0.15)",
                      color: "#059669",
                    }}
                  />
                )}
              </Box>
              <Typography sx={{ fontSize: 11.5, color: "#64748B", mt: 0.2 }}>
                Ledger cash forecast & 4 intelligent remediation actions
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* FEATURE 2: GENERAL SCENARIO GRAPH */}
      {activeTab === "general" && (
        <Box sx={{ animation: "cfs-rise 220ms ease both" }}>
          {/* Cash Outlook & Shortage Diagnostic Banner */}
          <Box
        sx={{
          mb: 1.4,
          p: { xs: 1.1, sm: 1.35 },
          borderRadius: "12px",
          border: isResolved
            ? "1px solid rgba(16, 185, 129, 0.4)"
            : hasShortage
            ? "1px solid rgba(239, 68, 68, 0.35)"
            : "1px solid rgba(199,224,208,0.85)",
          background: isResolved
            ? "linear-gradient(135deg, rgba(236,253,245,0.95), rgba(209,250,229,0.85))"
            : hasShortage
            ? "linear-gradient(135deg, rgba(254,242,242,0.95), rgba(254,226,226,0.85))"
            : "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(244,250,246,0.9))",
          boxShadow: "0 4px 14px rgba(0,0,0,0.025)",
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.4,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              display: "grid",
              placeItems: "center",
              bgcolor: isResolved
                ? "rgba(16, 185, 129, 0.15)"
                : hasShortage
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(15, 138, 132, 0.1)",
              color: isResolved ? "#059669" : hasShortage ? "#DC2626" : "#0F8A84",
            }}
          >
            {isResolved ? (
              <CheckCircle2 size={18} />
            ) : hasShortage ? (
              <AlertTriangle size={18} />
            ) : (
              <Sparkles size={18} />
            )}
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#16232F" }}>
                {isResolved
                  ? "Shortage Overcome Successfully!"
                  : hasShortage
                  ? `Cash Shortage Projected on ${formatDisplay(breachDate)}`
                  : "Safe Working Capital — No Shortage Detected"}
              </Typography>
              <Chip
                size="small"
                label={
                  isResolved
                    ? "Resolved ✓"
                    : hasShortage
                    ? `Deficit: ${formatINR(shortageAmount, { compact: true })}`
                    : "Healthy"
                }
                sx={{
                  fontWeight: 800,
                  fontSize: 12,
                  bgcolor: isResolved
                    ? "rgba(16, 185, 129, 0.2)"
                    : hasShortage
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(15, 138, 132, 0.15)",
                  color: isResolved ? "#065F46" : hasShortage ? "#991B1B" : "#0F8A84",
                }}
              />
            </Box>

            <Typography sx={{ fontSize: 12.5, color: "#475467" }}>
              {isResolved
                ? `Simulated actions lift your lowest balance to ${formatINR(sDiff.scenarioMin)} — keeping account above the minimum reserve.`
                : hasShortage
                ? `Account balance breaches safety reserve on ${formatDisplay(breachDate)} due to concentrated supplier bills and pending receivables. Use recommended actions below to overcome it.`
                : "Upcoming customer receipts comfortably cover obligations over the next 30 days."}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontSize: 12, color: "#667085", fontWeight: 700, textTransform: "uppercase" }}>
              Lowest Projected Balance
            </Typography>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 850,
                color: (activeActions.length > 0 ? sDiff.scenarioMin : baselineDiff.baselineMin) >= settings.minReservePaise ? "#059669" : "#DC2626",
              }}
            >
              {formatINR(activeActions.length > 0 ? sDiff.scenarioMin : baselineDiff.baselineMin)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Recommendation Line with 4 Solution Icons at the side */}
      <Box
        className="cfs-card"
        sx={{
          mb: 2,
          p: { xs: 1.4, sm: 1.6 },
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(240,253,244,0.65) 100%)",
          border: "1px solid rgba(16,185,129,0.22)",
          boxShadow: "0 4px 16px rgba(20,45,36,0.05)",
          position: "relative",
          zIndex: hoveredRec ? 100 : 2,
        }}
      >
        {/* Left: Recommendation Title & Subtitle */}
        <Box sx={{ minWidth: 260, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: "6px",
                bgcolor: "rgba(16,185,129,0.14)",
                display: "grid",
                placeItems: "center",
                color: "#059669",
              }}
            >
              <Sparkles size={14} />
            </Box>
            <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: "#14382B" }}>
              Recommended Remediation Actions
            </Typography>
            <Chip
              size="small"
              label={`${activeActions.length}/${recommendations.length} Active`}
              sx={{
                fontWeight: 750,
                fontSize: 11.8,
                height: 20,
                bgcolor: activeActions.length > 0 ? "rgba(16,185,129,0.15)" : "rgba(23,107,82,0.08)",
                color: activeActions.length > 0 ? "#065F46" : "#176B52",
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 12, color: "#55685F", mt: 0.3 }}>
            Hover solution icons on the right to preview on the graph • Click icon to execute
          </Typography>
        </Box>

        {/* Right: 4 Solution Icons displayed at the side of recommendation */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", position: "relative", zIndex: hoveredRec ? 105 : 2 }}>
          {recommendations.map((rec, idx) => {
            const IconComp = rec.icon;
            const isSimulated = activeActions.some((a) => a.id === rec.id);
            const isHovered = hoveredRec?.id === rec.id;

            return (
              <Box
                key={rec.id}
                sx={{ position: "relative", zIndex: isHovered ? 120 : 1 }}
                onMouseEnter={() => {
                  if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                  setHoveredRec(rec);
                }}
                onMouseLeave={() => {
                  leaveTimerRef.current = setTimeout(() => {
                    setHoveredRec(null);
                  }, 240);
                }}
              >
                <Box
                  component="button"
                  type="button"
                  onClick={() => handleExecute(rec)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    py: 0.55,
                    px: 1,
                    width: { xs: "auto", sm: 136 },
                    borderRadius: "10px",
                    border: isSimulated
                      ? `1.5px solid ${rec.badgeColor}`
                      : isHovered
                      ? `1.5px solid ${rec.badgeColor}`
                      : "1px solid rgba(22,39,31,0.12)",
                    bgcolor: isSimulated
                      ? `${rec.badgeColor}18`
                      : isHovered
                      ? `${rec.badgeColor}12`
                      : "#FFFFFF",
                    boxShadow: isHovered
                      ? `0 6px 16px ${rec.badgeColor}25`
                      : "0 1px 4px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    transition: "all 180ms ease",
                    outline: "none",
                    position: "relative",
                    "&:hover": {
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "7px",
                      display: "grid",
                      placeItems: "center",
                      bgcolor: `${rec.badgeColor}20`,
                      color: rec.badgeColor,
                    }}
                  >
                    <IconComp size={15} strokeWidth={2.2} />
                  </Box>

                  <Box sx={{ textAlign: "left", display: { xs: "none", sm: "block" } }}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 750,
                        color: "#16232F",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rec.type === "email"
                        ? "Email Reminder"
                        : rec.type === "call"
                        ? "Call AI"
                        : rec.type === "advance"
                        ? "50% Advance"
                        : "Split Bill"}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: isSimulated ? "#059669" : "#667085",
                        lineHeight: 1.1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isSimulated ? "✓ In Graph" : "Click to open"}
                    </Typography>
                  </Box>

                  {isSimulated && (
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        bgcolor: "#10B981",
                        boxShadow: "0 0 0 2px #FFFFFF",
                      }}
                    />
                  )}
                </Box>

                {/* Single Sleek Info Card Displayed DIRECTLY BELOW this button */}
                {hoveredRec?.id === rec.id && (
                  <Box
                    onMouseEnter={() => {
                      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
                    }}
                    onMouseLeave={() => {
                      leaveTimerRef.current = setTimeout(() => {
                        setHoveredRec(null);
                      }, 240);
                    }}
                    sx={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      ...(idx <= 1 ? { left: 0 } : { right: 0 }),
                      zIndex: 1000,
                      width: { xs: 295, sm: 320 },
                      maxWidth: "92vw",
                      bgcolor: "rgba(255, 255, 255, 0.98)",
                      backdropFilter: "blur(14px)",
                      WebkitBackdropFilter: "blur(14px)",
                      border: `1.5px solid ${rec.badgeColor}`,
                      borderRadius: "14px",
                      p: 1.5,
                      boxShadow: "0 18px 40px rgba(15, 35, 25, 0.22), 0 2px 8px rgba(0,0,0,0.06)",
                      animation: "cfs-rise 180ms ease both",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: -10,
                        left: 0,
                        right: 0,
                        height: 12,
                        bgcolor: "transparent",
                      },
                    }}
                  >
                    {/* Small Caret Arrow pointing directly to the button center */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: -6,
                        ...(idx <= 1 ? { left: 62 } : { right: 62 }),
                        width: 12,
                        height: 12,
                        bgcolor: "#FFFFFF",
                        borderLeft: `1.5px solid ${rec.badgeColor}`,
                        borderTop: `1.5px solid ${rec.badgeColor}`,
                        transform: "rotate(45deg)",
                        zIndex: 1,
                      }}
                    />

                    {/* Header */}
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.8, position: "relative", zIndex: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.9, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "8px",
                            bgcolor: `${rec.badgeColor}18`,
                            color: rec.badgeColor,
                            border: `1px solid ${rec.badgeColor}30`,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <IconComp size={16} strokeWidth={2.2} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: "#14382B", lineHeight: 1.25 }}>
                            {rec.title}
                          </Typography>
                          <Typography sx={{ fontSize: 11.8, color: "#5B7065", fontWeight: 600 }}>
                            {rec.partyName} • Inv #{rec.invoiceNumber}
                          </Typography>
                        </Box>
                      </Box>

                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHoveredRec(null);
                        }}
                        sx={{ p: 0.3, color: "#8B98A5" }}
                      >
                        <X size={14} />
                      </IconButton>
                    </Box>

                    {/* Impact Pill */}
                    <Box
                      sx={{
                        px: 0.85,
                        py: 0.4,
                        borderRadius: "7px",
                        bgcolor: isSimulated ? "rgba(16, 185, 129, 0.12)" : "rgba(23, 107, 82, 0.06)",
                        border: "1px solid",
                        borderColor: isSimulated ? "rgba(16, 185, 129, 0.25)" : "rgba(23, 107, 82, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.6,
                        mb: 0.8,
                        position: "relative",
                        zIndex: 2,
                      }}
                    >
                      <TrendingUp size={11} color="#059669" />
                      <Typography sx={{ fontSize: 11.8, fontWeight: 750, color: "#065F46" }}>
                        {rec.impactText}
                      </Typography>
                    </Box>

                    {/* Compact description */}
                    <Typography sx={{ fontSize: 11.8, color: "#4A5D53", lineHeight: 1.45, mb: 1.1, position: "relative", zIndex: 2 }}>
                      {rec.description}
                    </Typography>

                    {/* Action buttons inside card */}
                    <Box sx={{ display: "flex", gap: 0.8, position: "relative", zIndex: 2 }}>
                      <Button
                        size="small"
                        variant={isSimulated ? "contained" : "outlined"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSimulation(rec);
                        }}
                        sx={{
                          flex: 1,
                          textTransform: "none",
                          fontWeight: 750,
                          fontSize: 11.8,
                          borderRadius: "7px",
                          py: 0.35,
                          minHeight: 28,
                          bgcolor: isSimulated ? "#10B981" : "transparent",
                          color: isSimulated ? "#FFFFFF" : "#176B52",
                          borderColor: isSimulated ? "#10B981" : "rgba(23,107,82,0.35)",
                          "&:hover": {
                            bgcolor: isSimulated ? "#059669" : "rgba(23, 107, 82, 0.08)",
                          },
                        }}
                      >
                        {isSimulated ? "✓ In Graph" : "Simulate in Graph"}
                      </Button>

                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecute(rec);
                          setHoveredRec(null);
                        }}
                        sx={{
                          flex: 1,
                          textTransform: "none",
                          fontWeight: 750,
                          fontSize: 11.8,
                          borderRadius: "7px",
                          py: 0.35,
                          minHeight: 28,
                          bgcolor: rec.badgeColor,
                          color: "#FFFFFF",
                          "&:hover": {
                            filter: "brightness(0.9)",
                          },
                        }}
                      >
                        {rec.type === "email"
                          ? "Draft Email"
                          : rec.type === "call"
                          ? "Call AI"
                          : rec.type === "advance"
                          ? "Request 50%"
                          : "Negotiate"}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

          {/* General Scenario Graph: Working Capital Forecast Chart */}
          <Box className="cfs-card" sx={{ mb: 3, p: 2.5, borderRadius: "18px", position: "relative", zIndex: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
              <Box sx={{ maxWidth: 670 }}>
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 800, color: "#16232F" }}>
                  General Scenario Graph: Working Capital Forecast (₹)
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#667085", mt: 0.2 }}>
                  Solid line: <strong>General Scenario Baseline</strong> (current database). Dotted line: <strong>Simulated Actions</strong> (impact of applying intelligent remediation recommendations).
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1.8, alignItems: "center", flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, fontSize: 12.5, color: "#1E293B", fontWeight: 700 }}>
                  <Box sx={{ width: 18, height: 3, bgcolor: "#1E293B", borderRadius: 1 }} />
                  <span>General Scenario Baseline</span>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, fontSize: 12.5, color: "#059669", fontWeight: 800 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 0,
                      borderTop: "3px dashed #10B981",
                    }}
                  />
                  <span>Simulated Remediation ({activeActions.length} Active)</span>
                </Box>
              </Box>
            </Box>

            <ScenarioComparisonChart
              baseline={baselineResult.baseline}
              scenario={generalScenarioResult.scenario}
              reserve={settings.minReservePaise}
              height={320}
              baselineLabel="General Scenario"
              scenarioLabel={activeActions.length > 0 ? "Simulated Remediation" : "General Scenario"}
            />
          </Box>
        </Box>
      )}

      {/* FEATURE 1: MOMENT SCENARIO VIEWER */}
      {activeTab === "moment" && (
        <Box sx={{ animation: "cfs-rise 220ms ease both" }}>
          {/* Proposed Deal Simulator Card or Empty/Launch Card */}
          {state.scenarioDraft ? (
            <Box
              className="cfs-card"
              sx={{
                mb: 2.5,
                p: { xs: 1.8, sm: 2.2 },
                borderRadius: "16px",
                background: grabDeal
                  ? "linear-gradient(135deg, rgba(236,253,245,0.96) 0%, rgba(209,250,229,0.7) 100%)"
                  : "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.9) 100%)",
                border: grabDeal
                  ? "1.5px solid rgba(16,185,129,0.4)"
                  : "1px solid rgba(148,163,184,0.25)",
                boxShadow: grabDeal
                  ? "0 8px 24px rgba(16,185,129,0.14)"
                  : "0 4px 14px rgba(0,0,0,0.04)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.8 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 260, flex: 1 }}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: "14px",
                      bgcolor: grabDeal ? "rgba(16,185,129,0.2)" : "rgba(100,116,139,0.12)",
                      display: "grid",
                      placeItems: "center",
                      color: grabDeal ? "#059669" : "#475569",
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={24} />
                  </Box>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 850, color: "#14382B" }}>
                        Deal Under Assessment: {state.scenarioDraft.customerName || state.scenarioDraft.label}
                      </Typography>
                      <Chip
                        size="small"
                        label={`+${formatINR(state.scenarioDraft.amountPaise)}`}
                        sx={{
                          bgcolor: "rgba(16,185,129,0.2)",
                          color: "#065F46",
                          fontWeight: 800,
                          fontSize: 11.5,
                          height: 24,
                        }}
                      />
                      <Chip
                        size="small"
                        label={grabDeal ? "✓ Deal Uplift Active" : "Deal Inactive"}
                        sx={{
                          bgcolor: grabDeal ? "#10B981" : "rgba(100,116,139,0.12)",
                          color: grabDeal ? "#FFFFFF" : "#475569",
                          fontWeight: 800,
                          fontSize: 11.8,
                          height: 22,
                        }}
                      />
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: "#4A5D53", mt: 0.4 }}>
                      Settlement on <strong>{formatDisplay(state.scenarioDraft.receiptDate)}</strong> · Commercial Structure: 50% upfront booking milestone + 50% milestone settlement balance.
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
                  <Button
                    variant="outlined"
                    onClick={() => setGrabDeal((prev) => !prev)}
                    sx={{
                      borderRadius: "10px",
                      fontWeight: 750,
                      fontSize: 12,
                      textTransform: "none",
                      minHeight: 38,
                      px: 1.6,
                      borderColor: "rgba(20,56,43,0.2)",
                      color: "#14382B",
                      "&:hover": {
                        bgcolor: "rgba(20,56,43,0.06)",
                        borderColor: "rgba(20,56,43,0.35)",
                      },
                    }}
                  >
                    {grabDeal ? "Temporarily Toggle Off" : "Turn On Deal Impact"}
                  </Button>

                  <Button
                    variant="contained"
                    onClick={commitDealToLedger}
                    startIcon={<CheckCircle2 size={16} />}
                    sx={{
                      borderRadius: "10px",
                      fontWeight: 800,
                      fontSize: 12.5,
                      textTransform: "none",
                      minHeight: 38,
                      px: 2.2,
                      bgcolor: "#10B981",
                      color: "#FFFFFF",
                      boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
                      "&:hover": {
                        bgcolor: "#059669",
                      },
                    }}
                  >
                    Grab this Deal & Save to Ledger
                  </Button>

                  <IconButton
                    size="small"
                    onClick={() => {
                      dispatch({ type: "SET_SCENARIO_DRAFT", draft: null });
                      setGrabDeal(false);
                      toast("Cleared deal draft from Moment Scenario Viewer");
                    }}
                    sx={{ color: "#94A3B8", "&:hover": { color: "#475569" } }}
                    title="Dismiss deal draft"
                  >
                    <X size={18} />
                  </IconButton>
                </Box>
              </Box>

              {/* Decision support note */}
              <Box
                sx={{
                  mt: 1.8,
                  pt: 1.4,
                  borderTop: "1px dashed rgba(16,185,129,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1.2,
                }}
              >
                <Typography sx={{ fontSize: 12, color: "#334155" }}>
                  💡 <strong>Decision Support:</strong> AI models and deep learning projections show the dotted green line above the baseline. If the upward growth meets your liquidity target, click <strong>Grab this Deal & Save to Ledger</strong>. Final decision rests with you.
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Typography sx={{ fontSize: 11.5, color: "#64748B" }}>
                    General Baseline Min: <strong>{formatINR(baselineDiff.baselineMin)}</strong>
                  </Typography>
                  <ArrowRight size={14} color="#10B981" />
                  <Typography sx={{ fontSize: 11.5, color: "#065F46", fontWeight: 800 }}>
                    Deal Grab Min: <strong>{formatINR(mDiff.scenarioMin)}</strong>
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box
              className="cfs-card"
              sx={{
                mb: 2.5,
                p: 3,
                borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(240,253,244,0.5) 100%)",
                border: "1px dashed rgba(16,185,129,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ maxWidth: 620 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.6 }}>
                  <Zap size={18} color="#059669" />
                  <Typography sx={{ fontSize: 15, fontWeight: 850, color: "#14382B" }}>
                    No Active Deal in Moment Scenario Viewer
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.6 }}>
                  Evaluate prospective customer contracts in the <strong>Deal Impact Checker</strong> or load a demo contract to test the real-time upward comparison line vs. your general baseline.
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  onClick={loadDemoDeal}
                  startIcon={<Sparkles size={14} color="#059669" />}
                  sx={{
                    borderRadius: "10px",
                    fontWeight: 750,
                    fontSize: 12.5,
                    textTransform: "none",
                    minHeight: 38,
                    borderColor: "rgba(16,185,129,0.4)",
                    color: "#065F46",
                    "&:hover": {
                      borderColor: "#10B981",
                      bgcolor: "rgba(16,185,129,0.06)",
                    },
                  }}
                >
                  Load Sample Deal (TCS ₹1.5L)
                </Button>

                <Button
                  variant="contained"
                  onClick={() => navigate("/deal-checker")}
                  startIcon={<ArrowRight size={15} />}
                  sx={{
                    borderRadius: "10px",
                    fontWeight: 800,
                    fontSize: 12.5,
                    textTransform: "none",
                    minHeight: 38,
                    bgcolor: "#10B981",
                    color: "#FFFFFF",
                    "&:hover": {
                      bgcolor: "#059669",
                    },
                  }}
                >
                  Open Deal Impact Checker
                </Button>
              </Box>
            </Box>
          )}

          {/* Moment Scenario Chart: General Scenario vs Deal Grab Scenario */}
          <Box className="cfs-card" sx={{ mb: 3, p: 2.5, borderRadius: "18px", position: "relative" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
              <Box sx={{ maxWidth: 670 }}>
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 800, color: "#16232F" }}>
                  Moment Scenario Viewer: General Scenario vs. Deal Grab Scenario (₹)
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#667085", mt: 0.2 }}>
                  Solid dark line: <strong>General Scenario</strong> (existing database). Dotted green line: <strong>Deal Grab Scenario</strong> (shows cash uplift if you grab this deal).
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1.8, alignItems: "center", flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, fontSize: 12.5, color: "#1E293B", fontWeight: 700 }}>
                  <Box sx={{ width: 18, height: 3, bgcolor: "#1E293B", borderRadius: 1 }} />
                  <span>General Scenario</span>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, fontSize: 12.5, color: "#059669", fontWeight: 800 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 0,
                      borderTop: "3px dashed #10B981",
                    }}
                  />
                  <span>Deal Grab Scenario {grabDeal && state.scenarioDraft ? "(Active Uplift)" : "(Off)"}</span>
                </Box>
              </Box>
            </Box>

            <ScenarioComparisonChart
              baseline={baselineResult.baseline}
              scenario={momentScenarioResult.scenario}
              reserve={settings.minReservePaise}
              height={320}
              baselineLabel="General Scenario"
              scenarioLabel="Deal Grab Scenario"
            />
          </Box>
        </Box>
      )}

      {/* 1. Email Automation Modal (Low background blur) */}
      <Dialog
        open={emailModal.open}
        onClose={() => setEmailModal({ open: false, candidate: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 20px 48px rgba(15, 35, 25, 0.22)",
            border: "1px solid rgba(22, 39, 31, 0.12)",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.18)",
            backdropFilter: "blur(2.5px)",
            WebkitBackdropFilter: "blur(2.5px)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 17, pb: 1 }}>
          Automated Payment Reminder Email
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 1.8 }}>
          <TextField
            size="small"
            label="Recipient"
            value={emailModal.candidate ? emailModal.candidate.contact : ""}
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            size="small"
            label="Subject"
            value={emailModal.candidate ? `Payment Reminder: Invoice #${emailModal.candidate.invoiceNumber} Due for Settlement` : ""}
            fullWidth
          />
          <TextField
            multiline
            rows={5}
            label="Email Body"
            defaultValue={
              emailModal.candidate
                ? `Dear ${emailModal.candidate.partyName},\n\nThis is a friendly reminder regarding Invoice #${emailModal.candidate.invoiceNumber} for ${formatINR(emailModal.candidate.invoiceAmountPaise)} which is scheduled for payment. To assist our operational planning, we request clearance via RTGS/NEFT or UPI.\n\nThank you for your valued partnership.\nAccounts Team — Navkar Traders`
                : ""
            }
            fullWidth
          />
          <Box sx={{ p: 1.2, borderRadius: "10px", bgcolor: "#F0FDF4", display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircle2 size={16} color="#059669" />
            <Typography sx={{ fontSize: 12, color: "#065F46", fontWeight: 600 }}>
              Direct payment link & verified bank QR will be appended automatically.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEmailModal({ open: false, candidate: null })}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<Send size={15} />}
            sx={{ bgcolor: "#0F8A84", "&:hover": { bgcolor: "#0B6B66" }, textTransform: "none", fontWeight: 700 }}
            onClick={() => {
              toast(`Email reminder dispatched to ${emailModal.candidate.partyName}!`);
              setEmailModal({ open: false, candidate: null });
            }}
          >
            Send Automated Email
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. Call Automation Modal (Low background blur) */}
      <Dialog
        open={callModal.open}
        onClose={() => setCallModal({ open: false, candidate: null, status: "idle" })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 20px 48px rgba(15, 35, 25, 0.22)",
            border: "1px solid rgba(22, 39, 31, 0.12)",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.18)",
            backdropFilter: "blur(2.5px)",
            WebkitBackdropFilter: "blur(2.5px)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 17, pb: 1 }}>
          AI Voice Call Reminder Dispatcher
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, bgcolor: "#F8FAFC", borderRadius: "12px" }}>
            <Box sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "#8B5CF618", color: "#8B5CF6", display: "grid", placeItems: "center" }}>
              <Volume2 size={24} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                Target: {callModal.candidate?.partyName}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                Phone: {callModal.candidate?.contact} · Invoice #{callModal.candidate?.invoiceNumber}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 1.5, bgcolor: "#F1F5F9", borderRadius: "10px" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 750, color: "#475569", textTransform: "uppercase", mb: 0.5 }}>
              AI Script Preview
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "#334155", fontStyle: "italic", lineHeight: 1.6 }}>
              “Hello, this is Navkar Traders accounts assistant calling. We are following up on invoice #{callModal.candidate?.invoiceNumber} for {callModal.candidate ? formatINR(callModal.candidate.invoiceAmountPaise) : ""}. Could you please confirm if this payment is scheduled for clearance this week?”
            </Typography>
          </Box>

          {callModal.status === "calling" && (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 750, color: "#8B5CF6", mb: 1 }}>
                Dialling customer phone… Connected to accounts desk
              </Typography>
              <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
            </Box>
          )}

          {callModal.status === "completed" && (
            <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#ECFDF5", border: "1px solid #10B981" }}>
              <Typography sx={{ fontWeight: 750, fontSize: 13, color: "#065F46" }}>
                ✓ Call Completed Successfully
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#047857", mt: 0.3 }}>
                Customer acknowledged invoice and committed to early settlement.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCallModal({ open: false, candidate: null, status: "idle" })}>Close</Button>
          {callModal.status !== "completed" && (
            <Button
              variant="contained"
              startIcon={<PhoneCall size={15} />}
              sx={{ bgcolor: "#8B5CF6", "&:hover": { bgcolor: "#7C3AED" }, textTransform: "none", fontWeight: 700 }}
              onClick={() => {
                setCallModal((prev) => ({ ...prev, status: "calling" }));
                setTimeout(() => {
                  setCallModal((prev) => ({ ...prev, status: "completed" }));
                  toast("Voice call completed! Customer response logged.");
                }, 2000);
              }}
            >
              Start Automated Call
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 3. Advance Request Modal (Low background blur) */}
      <Dialog
        open={advanceModal.open}
        onClose={() => setAdvanceModal({ open: false, candidate: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 20px 48px rgba(15, 35, 25, 0.22)",
            border: "1px solid rgba(22, 39, 31, 0.12)",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.18)",
            backdropFilter: "blur(2.5px)",
            WebkitBackdropFilter: "blur(2.5px)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 17, pb: 1 }}>
          Generate 50% Advance Request
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 1.8 }}>
          <Typography sx={{ fontSize: 13, color: "#475467" }}>
            Secure upfront working capital from <strong>{advanceModal.candidate?.partyName}</strong> against Order #{advanceModal.candidate?.invoiceNumber}.
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <TextField
              size="small"
              label="50% Advance Amount"
              value={advanceModal.candidate ? formatINR(advanceModal.candidate.invoiceAmountPaise) : ""}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Deposit Due Date"
              value={formatDisplay(addDaysISO(today, 2))}
              slotProps={{ input: { readOnly: true } }}
            />
          </Box>

          <TextField
            multiline
            rows={3}
            label="Payment Terms Note"
            defaultValue="50% deposit required prior to dispatch / delivery. Balance payable net 15 days upon receipt."
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdvanceModal({ open: false, candidate: null })}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<DollarSign size={15} />}
            sx={{ bgcolor: "#10B981", "&:hover": { bgcolor: "#059669" }, textTransform: "none", fontWeight: 700 }}
            onClick={() => {
              toast("50% advance request generated and dispatched!");
              setAdvanceModal({ open: false, candidate: null });
            }}
          >
            Dispatch Advance Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* 4. Split Payment Modal (Low background blur) */}
      <Dialog
        open={splitModal.open}
        onClose={() => setSplitModal({ open: false, candidate: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 20px 48px rgba(15, 35, 25, 0.22)",
            border: "1px solid rgba(22, 39, 31, 0.12)",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.18)",
            backdropFilter: "blur(2.5px)",
            WebkitBackdropFilter: "blur(2.5px)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 17, pb: 1 }}>
          Split Supplier Payment Schedule
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography sx={{ fontSize: 13, color: "#475467" }}>
            Splitting Bill #{splitModal.candidate?.invoiceNumber} with <strong>{splitModal.candidate?.partyName}</strong> to preserve cash on the shortage day.
          </Typography>

          <Box sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Tranche 1 (50% on Shortage Day):</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#0F8A84" }}>
                {splitModal.candidate ? formatINR(splitModal.candidate.invoiceAmountPaise) : ""}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 11.5, color: "#64748B" }}>
              Scheduled on {formatDisplay(breachDate || today)} — avoids draining bank reserve.
            </Typography>

            <Divider sx={{ my: 1.2 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Tranche 2 (50% on Deal Day):</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#0F8A84" }}>
                {splitModal.candidate ? formatINR(splitModal.candidate.invoiceAmountPaise) : ""}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 11.5, color: "#64748B" }}>
              Scheduled on {formatDisplay(addDaysISO(breachDate || today, 12))} when customer receipts arrive.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSplitModal({ open: false, candidate: null })}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<Split size={15} />}
            sx={{ bgcolor: "#F59E0B", "&:hover": { bgcolor: "#D97706" }, textTransform: "none", fontWeight: 700 }}
            onClick={() => {
              toast("Split payment agreement confirmed with supplier!");
              setSplitModal({ open: false, candidate: null });
            }}
          >
            Confirm Split Agreement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Plan Acceptance Dialog */}
      <ConfirmDialog
        open={acceptOpen}
        title="Apply this Solution to Live Forecast?"
        body={`This will apply ${activeActions.length} simulated adjustment(s) to live records: shifting customer payment dates and supplier terms. Your forecast and cash dashboard will immediately update to reflect this safe cash position.`}
        confirmLabel="Apply to Live Forecast"
        onCancel={() => setAcceptOpen(false)}
        onConfirm={acceptLivePlan}
      />
    </div>
  );
}
