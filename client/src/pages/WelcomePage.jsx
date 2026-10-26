import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import gsap from "gsap";

import {
  ShieldCheck,
  TrendingUp,
  Users,
  CalendarClock,
  Wallet,
  Activity,
  Sparkles,
  Check,
} from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";

const C = {
  page: "#F0F4F2",
  surface: "#FFFFFF",
  ink: "#132D24",
  muted: "#4E6459",
  subtle: "#7E9589",
  border: "#D8E5DE",
  teal: "#0F7A62",
  tealHover: "#0B5F4C",
  tealLight: "#E5F5EF",
  accent: "#1ABC9C",
  danger: "#C0392B",
  googleBlue: "#4285F4",
};

const FEATURES = [
  { icon: TrendingUp, title: "Cash-flow Forecasting", desc: "See expected inflows, outflows and cash gaps weeks ahead." },
  { icon: Users, title: "Payment Risk Intelligence", desc: "Customers and suppliers ranked by payment reliability." },
  { icon: Wallet, title: "Deal Impact Analysis", desc: "Evaluate how a new order affects your working capital." },
  { icon: CalendarClock, title: "Shortage Early Warnings", desc: "Spot cash shortages before payment deadlines arrive." },
  { icon: Sparkles, title: "AI Financial Assistant", desc: "Ask anything about your finances in plain language." },
  { icon: Activity, title: "Scenario Simulation", desc: "Model 'what-if' scenarios on real business data." },
];

const STATS = [
  { value: "15–30%", label: "reduction in late payments with proactive alerts" },
  { value: "₹2L+", label: "average cash buffer recovered per business" },
  { value: "< 30s", label: "to get your first cash forecast after sign-in" },
];

// Google SVG icon
function GoogleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function WelcomePage() {
  const { signIn, enterDemo, isAuthenticated, onboarded, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(onboarded ? "/dashboard" : "/onboarding", { replace: true });
    }
  }, [isAuthenticated, onboarded, authLoading, navigate]);

  // Entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".wlc-brand", { y: -20, opacity: 0, duration: 0.5 })
        .from(".wlc-badge", { x: -16, opacity: 0, duration: 0.4 }, "-=0.25")
        .from(".wlc-title", { y: 30, opacity: 0, duration: 0.7 }, "-=0.3")
        .from(".wlc-desc", { y: 16, opacity: 0, duration: 0.5 }, "-=0.45")
        .from(".wlc-auth-card", { scale: 0.93, y: 24, opacity: 0, duration: 0.8, ease: "back.out(1.2)" }, "-=0.5")
        .from(".wlc-feature", { y: 20, opacity: 0, duration: 0.5, stagger: 0.07 }, "-=0.45")
        .from(".wlc-stat", { y: 16, opacity: 0, duration: 0.4, stagger: 0.06 }, "-=0.35");
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await signIn();
      // Navigation handled by the useEffect above after auth state updates
    } catch (err) {
      console.error("Google sign-in failed:", err);
      const msg = err.code === "auth/popup-closed-by-user"
        ? "Sign-in popup was closed. Please try again."
        : err.code === "auth/popup-blocked"
        ? "Popup was blocked by your browser. Please allow popups for this site."
        : "Google sign-in failed. Please try again.";
      setError(msg);
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: C.page }}>
        <CircularProgress sx={{ color: C.teal }} />
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        minHeight: "100vh",
        bgcolor: C.page,
        color: C.ink,
        fontFamily: '"Inter", "IBM Plex Sans", sans-serif',
        overflowX: "hidden",
      }}
    >
      {/* ── Background subtle pattern ─────────────────────────────────────── */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(15,122,98,0.06) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(26,188,156,0.05) 0%, transparent 50%)
          `,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box
        component="header"
        className="wlc-brand"
        sx={{
          width: "100%",
          borderBottom: `1px solid ${C.border}`,
          bgcolor: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2.5, sm: 4 }, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "10px", background: `linear-gradient(135deg, ${C.teal}, #0B5F4C)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={18} color="#fff" />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "17px", fontFamily: '"Space Grotesk", sans-serif', color: C.ink, letterSpacing: "-0.02em" }}>
              CashFlow Sentinel AI
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.5, py: 0.5, bgcolor: C.tealLight, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <ShieldCheck size={13} color={C.teal} />
              <Typography sx={{ fontSize: "12px", color: C.teal, fontWeight: 600 }}>Secured by Firebase</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2.5, sm: 4 }, pt: { xs: 5, md: 8 }, pb: 10, position: "relative", zIndex: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 400px" }, gap: { xs: 5, lg: 8 }, alignItems: "start" }}>

          {/* ── Left: Hero ─────────────────────────────────────────────────── */}
          <Box>
            <Box className="wlc-badge" sx={{ display: "inline-flex", alignItems: "center", gap: 0.8, px: 1.5, py: 0.6, bgcolor: C.tealLight, borderRadius: 10, border: `1px solid ${C.border}`, mb: 3 }}>
              <Sparkles size={13} color={C.teal} />
              <Typography sx={{ fontSize: "12px", color: C.teal, fontWeight: 600, letterSpacing: "0.04em" }}>
                AI-Powered Cash Intelligence
              </Typography>
            </Box>

            <Typography
              className="wlc-title"
              component="h1"
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                fontWeight: 800,
                lineHeight: 1.15,
                color: C.ink,
                letterSpacing: "-0.03em",
                mb: 2.5,
              }}
            >
              Know your cash position
              <Box component="span" sx={{ display: "block", background: `linear-gradient(135deg, ${C.teal}, ${C.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                before surprises hit.
              </Box>
            </Typography>

            <Typography className="wlc-desc" sx={{ fontSize: { xs: "15px", md: "16px" }, color: C.muted, lineHeight: 1.7, maxWidth: 560, mb: 5 }}>
              CashFlow Sentinel AI gives Indian SMBs real-time cash forecasting, payment risk scoring,
              deal impact analysis, and an AI assistant — powered by your actual invoices and transactions.
            </Typography>

            {/* ── Stats ──────────────────────────────────────────────────── */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 6 }}>
              {STATS.map((s) => (
                <Box key={s.label} className="wlc-stat" sx={{ minWidth: 140 }}>
                  <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: "1.6rem", fontWeight: 800, color: C.teal, lineHeight: 1 }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: C.muted, mt: 0.4, lineHeight: 1.4, maxWidth: 160 }}>
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* ── Feature grid ───────────────────────────────────────────── */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <Box
                  key={title}
                  className="wlc-feature"
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    p: 2,
                    bgcolor: "rgba(255,255,255,0.7)",
                    borderRadius: "12px",
                    border: `1px solid ${C.border}`,
                    backdropFilter: "blur(8px)",
                    transition: "all 0.2s",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 16px rgba(15,122,98,0.1)", borderColor: C.teal + "40" },
                  }}
                >
                  <Box sx={{ width: 36, height: 36, borderRadius: "9px", bgcolor: C.tealLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={17} color={C.teal} strokeWidth={2} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: "13.5px", color: C.ink, mb: 0.3 }}>{title}</Typography>
                    <Typography sx={{ fontSize: "12.5px", color: C.muted, lineHeight: 1.5 }}>{desc}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* ── Right: Auth Card ───────────────────────────────────────────── */}
          <Box sx={{ position: { lg: "sticky" }, top: { lg: 100 } }}>
            <Paper
              className="wlc-auth-card"
              elevation={0}
              sx={{
                border: `1.5px solid ${C.border}`,
                borderRadius: "20px",
                p: { xs: 3, sm: 4 },
                bgcolor: "rgba(255,255,255,0.96)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 40px rgba(15,122,98,0.08), 0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {/* Card header */}
              <Box sx={{ textAlign: "center", mb: 3.5 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: "14px", background: `linear-gradient(135deg, ${C.teal}, #0B5F4C)`, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2, boxShadow: "0 4px 20px rgba(15,122,98,0.3)" }}>
                  <Activity size={26} color="#fff" />
                </Box>
                <Typography sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: "20px", color: C.ink, mb: 0.5 }}>
                  Welcome back
                </Typography>
                <Typography sx={{ fontSize: "13.5px", color: C.muted }}>
                  Sign in to access your financial dashboard
                </Typography>
              </Box>

              {/* Error */}
              {error && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: "10px", fontSize: "13px" }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {/* Google Sign In */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                fullWidth
                variant="outlined"
                startIcon={loading ? <CircularProgress size={18} sx={{ color: C.muted }} /> : <GoogleIcon size={18} />}
                sx={{
                  py: 1.5,
                  fontSize: "14px",
                  fontWeight: 600,
                  borderRadius: "10px",
                  borderColor: C.border,
                  color: C.ink,
                  bgcolor: "#fff",
                  mb: 2,
                  gap: 0.5,
                  transition: "all 0.2s",
                  "&:hover": { borderColor: "#aaa", bgcolor: "#f8f9fa", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
                  "&:disabled": { opacity: 0.65 },
                }}
              >
                {loading ? "Signing in…" : "Continue with Google"}
              </Button>

              <Divider sx={{ my: 2, color: C.subtle, fontSize: "12px" }}>or</Divider>

              {/* Instant Demo Access */}
              <Button
                onClick={() => {
                  enterDemo();
                  navigate("/dashboard", { replace: true });
                }}
                fullWidth
                variant="contained"
                sx={{
                  py: 1.4,
                  fontSize: "14px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  bgcolor: C.teal,
                  color: "#fff",
                  mb: 2.5,
                  boxShadow: "0 4px 14px rgba(15,122,98,0.25)",
                  "&:hover": { bgcolor: C.tealHover, boxShadow: "0 6px 20px rgba(15,122,98,0.35)" },
                }}
              >
                Explore Demo Dashboard (Instant Access)
              </Button>

              {/* Info: what they get */}
              <Box sx={{ bgcolor: C.tealLight, borderRadius: "12px", p: 2, mb: 3 }}>
                <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: C.teal, mb: 1 }}>
                  What you get for free:
                </Typography>
                {["Real-time cash flow forecast", "Customer payment risk scores", "Invoice management & tracking", "AI financial assistant"].map((item) => (
                  <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.5 }}>
                    <Check size={12} color={C.teal} />
                    <Typography sx={{ fontSize: "12px", color: C.muted }}>{item}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Trust signals */}
              <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
                {["Google Auth", "Firestore backed", "End-to-end secure"].map((t) => (
                  <Box key={t} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <ShieldCheck size={12} color={C.subtle} />
                    <Typography sx={{ fontSize: "11px", color: C.subtle }}>{t}</Typography>
                  </Box>
                ))}
              </Box>

              <Typography sx={{ textAlign: "center", mt: 2, fontSize: "11.5px", color: C.subtle }}>
                By signing in you agree to our terms of service.
                Your financial data is private and encrypted.
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Box>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <Box component="footer" sx={{ borderTop: `1px solid ${C.border}`, py: 3, px: 4, bgcolor: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)" }}>
        <Box sx={{ maxWidth: 1200, mx: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Typography sx={{ fontSize: "12px", color: C.subtle }}>© 2025 CashFlow Sentinel AI</Typography>
          <Typography sx={{ fontSize: "12px", color: C.subtle }}>Built for Indian SMBs · Firebase · FastAPI · React</Typography>
        </Box>
      </Box>
    </Box>
  );
}