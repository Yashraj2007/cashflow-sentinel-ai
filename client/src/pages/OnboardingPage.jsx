
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  IndianRupee,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import gsap from "gsap";
import { useAuth } from "../context/AuthContext.jsx";
import { authApi } from "../services/apiClient.js";

const C = {
  page: "#F5F8FA",
  pageTint: "#EDF5F4",
  paper: "#FFFFFF",
  field: "#FBFCFD",
  border: "#E1E7EB",
  borderStrong: "#B9C8CF",
  text: "#172B3A",
  body: "#536675",
  muted: "#7A8A96",
  teal: "#087F78",
  tealDark: "#076B65",
  tealSoft: "#EAF7F5",
  tealBorder: "#BFE5DF",
  success: "#18794E",
  warning: "#9A6700",
  shadow: "rgba(28,54,70,0.09)",
};

const BUSINESS_TYPES = [
  "Retail / Trading",
  "Manufacturing",
  "Services / Consulting",
  "Food & Beverage",
  "Construction",
  "Import / Export",
  "E-commerce",
  "Healthcare / Pharmacy",
  "Education",
  "Other",
];

const STEPS = ["Business info", "Financial setup", "All set"];

const fieldSx = {
  "& .MuiInputLabel-root": {
    color: C.body,
    fontSize: 14,
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: C.teal,
  },
  "& .MuiOutlinedInput-root": {
    color: C.text,
    backgroundColor: C.field,
    borderRadius: 2.5,
    transition: "background-color 160ms ease, box-shadow 160ms ease",
    "& fieldset": {
      borderColor: C.border,
    },
    "&:hover fieldset": {
      borderColor: C.borderStrong,
    },
    "&.Mui-focused": {
      backgroundColor: "#FFFFFF",
      boxShadow: "0 0 0 3px rgba(8,127,120,0.08)",
    },
    "&.Mui-focused fieldset": {
      borderColor: C.teal,
      borderWidth: 1.3,
    },
  },
  "& .MuiFormHelperText-root": {
    fontSize: 11,
    lineHeight: 1.45,
    marginLeft: 1,
    marginTop: 0.7,
  },
};

function validate(step, form) {
  const errors = {};

  if (step === 0) {
    if (!form.businessName.trim()) {
      errors.businessName = "Business name is required";
    }

    if (!form.ownerName.trim()) {
      errors.ownerName = "Owner name is required";
    }

    if (!form.businessType) {
      errors.businessType = "Please select a business type";
    }

    if (!form.city.trim()) {
      errors.city = "City is required";
    }

    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      errors.email = "Enter a valid email address";
    }
  }

  if (step === 1) {
    const bal = Number.parseFloat(form.openingBalance);
    const res = Number.parseFloat(form.minReserve);

    if (!Number.isFinite(bal) || bal < 0) {
      errors.openingBalance =
        "Enter a valid opening balance (0 or more)";
    }

    if (!Number.isFinite(res) || res < 0) {
      errors.minReserve =
        "Enter a valid minimum reserve (0 or more)";
    }

    if (
      Number.isFinite(bal) &&
      Number.isFinite(res) &&
      res > bal
    ) {
      errors.minReserve =
        "Minimum reserve cannot exceed opening balance";
    }
  }

  return errors;
}

export default function OnboardingPage() {
  const {
    completeOnboarding,
    setBusinessId,
    user,
    firebaseUser,
  } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    ownerName:
      user?.name === "Demo Owner" ? "" : user?.name || "",
    email:
      user?.email === "demo@cashflow-sentinel.local"
        ? ""
        : user?.email || "",
    phone: "",
    city: "",
    openingBalance: "",
    minReserve: "",
  });

  const containerRef = useRef(null);

  const set = (field) => (event) => {
    const value = event?.target?.value ?? "";

    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((previous) => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    }
  };

  const handleNext = () => {
    const validationErrors = validate(activeStep, form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setActiveStep((step) => Math.min(step + 1, 2));
  };

  const handleBack = () => {
    setErrors({});
    setActiveStep((step) => Math.max(step - 1, 0));
  };

  const handleFinish = async () => {
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const ownerEmail = form.email || user?.email || "";
      const ownerName = form.ownerName || user?.name || "";

      const response = await authApi.ownerAuth({
        email: ownerEmail,
        name: ownerName,
        businessName: form.businessName,
        openingBalance: Number.parseFloat(
          form.openingBalance || "0"
        ),
        minReserve: Number.parseFloat(form.minReserve || "0"),
        businessType: form.businessType,
        city: form.city,
        phone: form.phone,
        firebaseUid: firebaseUser?.uid || null,
      });

      if (response?.businessId) {
        setBusinessId(response.businessId);
      }

      completeOnboarding({
        name: ownerName,
        email: ownerEmail,
        businessId: response?.businessId,
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Onboarding API error:", error);

      setSubmitError(
        error?.message ||
          "Could not set up your business. Please check your connection and try again."
      );

      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const ctx = gsap.context(() => {
      gsap.from(".onboarding-header", {
        y: -10,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
      });

      gsap.from(".onboarding-card", {
        y: 14,
        opacity: 0,
        duration: 0.55,
        ease: "power2.out",
        delay: 0.05,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const stepContent = containerRef.current.querySelector?.(
      ".onboarding-step-content"
    );

    if (!stepContent) return undefined;

    const tween = gsap.fromTo(
      stepContent,
      { opacity: 0, x: 10 },
      {
        opacity: 1,
        x: 0,
        duration: 0.28,
        ease: "power2.out",
      }
    );

    return () => tween.kill();
  }, [activeStep]);

  const rupeeAdornment = (
    <InputAdornment position="start">
      <IndianRupee size={15} color={C.muted} />
    </InputAdornment>
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        minHeight: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${C.page} 0%, #F9FBFC 52%, ${C.pageTint} 100%)`,
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 3, sm: 4 },
      }}
    >
      {/* Subtle decorative background */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: "rgba(8,127,120,0.035)",
          top: -170,
          right: -115,
          pointerEvents: "none",
        }}
      />

      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          width: 270,
          height: 270,
          borderRadius: "50%",
          background: "rgba(74,119,157,0.035)",
          bottom: -145,
          left: -100,
          pointerEvents: "none",
        }}
      />

      {/* Brand header */}
      <Box
        className="onboarding-header"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          mb: 2.5,
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            width: 39,
            height: 39,
            borderRadius: 2.5,
            background: `linear-gradient(140deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 5px 14px rgba(8,127,120,0.20)",
          }}
        >
          <ShieldCheck size={21} color="#FFFFFF" strokeWidth={2.1} />
        </Box>

        <Box>
          <Typography
            sx={{
              fontFamily: '"Space Grotesk", "DM Sans", sans-serif',
              fontWeight: 700,
              fontSize: 17,
              lineHeight: 1.2,
              color: C.text,
            }}
          >
            CashFlow Sentinel AI
          </Typography>

          <Typography
            sx={{
              color: C.muted,
              fontSize: 10.5,
              mt: 0.35,
              letterSpacing: 0.2,
            }}
          >
            Cash-flow clarity for your business
          </Typography>
        </Box>
      </Box>

      {/* Main onboarding card */}
      <Paper
        component="main"
        className="onboarding-card"
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 590,
          borderRadius: { xs: 3, sm: 4 },
          p: { xs: 2.25, sm: 4 },
          border: `1px solid ${C.border}`,
          backgroundColor: C.paper,
          boxShadow: `0 18px 55px ${C.shadow}, 0 2px 8px rgba(28,54,70,0.025)`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 800,
              color: C.teal,
              letterSpacing: 1.45,
              mb: 0.7,
            }}
          >
            BUSINESS SETUP
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Space Grotesk", "DM Sans", sans-serif',
              fontWeight: 700,
              fontSize: { xs: 22, sm: 25 },
              lineHeight: 1.25,
              color: C.text,
              letterSpacing: -0.6,
            }}
          >
            Set up your workspace
          </Typography>

          <Typography
            sx={{
              color: C.body,
              fontSize: 13,
              lineHeight: 1.65,
              mt: 0.8,
            }}
          >
            A few details help personalise your cash-flow forecasts and alerts.
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            mb: 3.5,
            "& .MuiStepLabel-label": {
              color: `${C.muted} !important`,
              fontSize: 11,
              fontWeight: 500,
              mt: 0.7,
            },
            "& .MuiStepLabel-label.Mui-active": {
              color: `${C.text} !important`,
              fontWeight: 700,
            },
            "& .MuiStepLabel-label.Mui-completed": {
              color: `${C.teal} !important`,
              fontWeight: 600,
            },
            "& .MuiStepIcon-root": {
              color: "#E2E8EC",
              fontSize: 25,
            },
            "& .MuiStepIcon-root.Mui-active": {
              color: C.teal,
            },
            "& .MuiStepIcon-root.Mui-completed": {
              color: C.teal,
            },
            "& .MuiStepConnector-line": {
              borderColor: C.border,
              borderTopWidth: 1.5,
            },
          }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: Business information */}
        {activeStep === 0 && (
          <Box className="onboarding-step-content">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.7,
              }}
            >
              <Box
                sx={{
                  width: 33,
                  height: 33,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: C.tealSoft,
                  color: C.teal,
                }}
              >
                <Building2 size={17} />
              </Box>

              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", "DM Sans", sans-serif',
                  fontWeight: 700,
                  color: C.text,
                  fontSize: 17,
                }}
              >
                Tell us about your business
              </Typography>
            </Box>

            <Typography
              sx={{
                color: C.body,
                fontSize: 12.5,
                lineHeight: 1.65,
                mb: 2.5,
              }}
            >
              These details set up your business profile. You can update them later in Settings.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Business name *"
                value={form.businessName}
                onChange={set("businessName")}
                error={!!errors.businessName}
                helperText={errors.businessName}
                fullWidth
                placeholder="e.g. Navkar Traders"
                sx={fieldSx}
              />

              <TextField
                select
                label="Business type *"
                value={form.businessType}
                onChange={set("businessType")}
                error={!!errors.businessType}
                helperText={errors.businessType}
                fullWidth
                sx={fieldSx}
              >
                {BUSINESS_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Owner / your name *"
                value={form.ownerName}
                onChange={set("ownerName")}
                error={!!errors.ownerName}
                helperText={errors.ownerName}
                fullWidth
                placeholder="e.g. Ramesh Patel"
                sx={fieldSx}
              />

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Email address"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  error={!!errors.email}
                  helperText={errors.email}
                  fullWidth
                  placeholder="you@business.com"
                  sx={fieldSx}
                />

                <TextField
                  label="Phone (optional)"
                  value={form.phone}
                  onChange={set("phone")}
                  fullWidth
                  placeholder="+91 98765 43210"
                  sx={fieldSx}
                />
              </Box>

              <TextField
                label="City / location *"
                value={form.city}
                onChange={set("city")}
                error={!!errors.city}
                helperText={errors.city}
                fullWidth
                placeholder="e.g. Ahmedabad"
                sx={fieldSx}
              />
            </Box>
          </Box>
        )}

        {/* Step 1: Financial setup */}
        {activeStep === 1 && (
          <Box className="onboarding-step-content">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.7,
              }}
            >
              <Box
                sx={{
                  width: 33,
                  height: 33,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: C.tealSoft,
                  color: C.teal,
                }}
              >
                <IndianRupee size={17} />
              </Box>

              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", "DM Sans", sans-serif',
                  fontWeight: 700,
                  color: C.text,
                  fontSize: 17,
                }}
              >
                Financial starting point
              </Typography>
            </Box>

            <Typography
              sx={{
                color: C.body,
                fontSize: 12.5,
                lineHeight: 1.65,
                mb: 2.5,
              }}
            >
              Enter estimates to anchor your initial cash-flow forecast. You can revise these values later.
            </Typography>

            <Alert
              severity="info"
              icon={<Sparkles size={18} />}
              sx={{
                mb: 2.5,
                borderRadius: 2.5,
                border: "1px solid #CFE5F4",
                backgroundColor: "#F2F8FD",
                color: "#315B77",
                fontSize: 12,
                alignItems: "center",
                "& .MuiAlert-icon": {
                  color: "#4D88B2",
                  pt: 0.25,
                },
                "& .MuiAlert-message": {
                  py: 0.25,
                },
              }}
            >
              For demo mode, approximate or synthetic values are fine. Do not enter bank account numbers or other sensitive credentials.
            </Alert>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                label="Current / opening cash balance (₹) *"
                value={form.openingBalance}
                onChange={set("openingBalance")}
                error={!!errors.openingBalance}
                helperText={
                  errors.openingBalance ||
                  "Total cash currently available in bank and on hand"
                }
                type="number"
                inputProps={{ min: 0, step: 1000 }}
                slotProps={{ input: { startAdornment: rupeeAdornment } }}
                fullWidth
                placeholder="e.g. 500000"
                sx={fieldSx}
              />

              <TextField
                label="Minimum cash reserve target (₹) *"
                value={form.minReserve}
                onChange={set("minReserve")}
                error={!!errors.minReserve}
                helperText={
                  errors.minReserve ||
                  "Your target reserve for upcoming obligations and unexpected costs"
                }
                type="number"
                inputProps={{ min: 0, step: 1000 }}
                slotProps={{ input: { startAdornment: rupeeAdornment } }}
                fullWidth
                placeholder="e.g. 100000"
                sx={fieldSx}
              />
            </Box>
          </Box>
        )}

        {/* Step 2: Confirmation and submission */}
        {activeStep === 2 && (
          <Box
            className="onboarding-step-content"
            sx={{ textAlign: "center", py: { xs: 1, sm: 2 } }}
          >
            <Box
              sx={{
                width: 70,
                height: 70,
                borderRadius: 4,
                background: "linear-gradient(145deg, #E7F7F1 0%, #D1EEE5 100%)",
                border: "1px solid #C4E7DA",
                display: "grid",
                placeItems: "center",
                mx: "auto",
                mb: 2.5,
              }}
            >
              <CheckCircle2 size={35} color={C.success} strokeWidth={1.9} />
            </Box>

            <Typography
              sx={{
                fontFamily: '"Space Grotesk", "DM Sans", sans-serif',
                fontWeight: 700,
                color: C.text,
                fontSize: 23,
                letterSpacing: -0.5,
                mb: 1,
              }}
            >
              You're almost there, {form.ownerName.split(" ")[0] || "there"}!
            </Typography>

            <Typography
              sx={{
                color: C.body,
                fontSize: 13.5,
                lineHeight: 1.75,
                mb: 2.5,
              }}
            >
              Review your details, then complete setup for{" "}
              <strong>{form.businessName || "your business"}</strong>. Your dashboard will be ready after your information is saved.
            </Typography>

            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                backgroundColor: "#F0F9F7",
                border: "1px solid #CDE9E2",
                textAlign: "left",
                mb: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.tealDark,
                  mb: 0.5,
                }}
              >
                What's next
              </Typography>

              <Typography
                sx={{
                  fontSize: 12,
                  color: "#426A66",
                  lineHeight: 1.7,
                }}
              >
                Once setup is complete, you can review your cash position, add upcoming payments, and explore your cash-flow forecasts.
              </Typography>
            </Box>

            {submitError && (
              <Alert
                severity="error"
                sx={{
                  mb: 2.5,
                  textAlign: "left",
                  borderRadius: 2.5,
                }}
              >
                {submitError}
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={handleFinish}
              disabled={submitting}
              fullWidth
              startIcon={
                submitting ? (
                  <CircularProgress size={17} color="inherit" />
                ) : (
                  <ArrowRight size={17} />
                )
              }
              sx={{
                py: 1.45,
                minHeight: 48,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13.5,
                color: "#FFFFFF",
                background: `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
                boxShadow: "0 7px 16px rgba(8,127,120,0.16)",
                "&:hover": {
                  background: `linear-gradient(135deg, ${C.tealDark} 0%, #055A55 100%)`,
                  boxShadow: "0 8px 18px rgba(8,127,120,0.20)",
                },
                "&.Mui-disabled": {
                  color: "#FFFFFF",
                  background: "#9CBFBB",
                },
              }}
            >
              {submitting
                ? "Setting up your business…"
                : "Complete setup and open dashboard"}
            </Button>
          </Box>
        )}

        {/* Navigation controls */}
        {activeStep < 2 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              mt: 3.5,
              pt: 2.5,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0}
              startIcon={<ArrowLeft size={15} />}
              sx={{
                px: 2,
                py: 1,
                minHeight: 40,
                borderRadius: 2.25,
                borderColor: C.border,
                color: C.body,
                textTransform: "none",
                fontWeight: 600,
                fontSize: 12,
                "&:hover": {
                  borderColor: C.borderStrong,
                  backgroundColor: "#F7F9FA",
                },
                "&.Mui-disabled": {
                  color: "#B8C2C9",
                  borderColor: "#E9EEF1",
                },
              }}
            >
              Back
            </Button>

            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowRight size={15} />}
              sx={{
                px: 2.5,
                py: 1,
                minHeight: 40,
                borderRadius: 2.25,
                textTransform: "none",
                backgroundColor: C.text,
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 12,
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#243F50",
                  boxShadow: "none",
                },
              }}
            >
              {activeStep === 1 ? "Review & finish" : "Continue"}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Footer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.75,
          mt: 2.5,
          zIndex: 1,
          flexWrap: "wrap",
        }}
      >
        <ShieldCheck size={13} color={C.muted} />

        <Typography
          sx={{
            color: C.muted,
            fontSize: 10.5,
            textAlign: "center",
          }}
        >
          Your business details are handled through your authenticated workspace.
        </Typography>
      </Box>
    </Box>
  );
}
