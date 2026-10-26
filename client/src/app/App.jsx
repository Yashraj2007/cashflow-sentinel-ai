import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AppProvider } from "../context/AppContext.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import AuthGuard from "../components/auth/AuthGuard.jsx";
import AppShell from "../components/layout/AppShell.jsx";
import SmoothScroll from "../components/layout/SmoothScroll.jsx";

// Public pages
import WelcomePage from "../pages/WelcomePage.jsx";
import OnboardingPage from "../pages/OnboardingPage.jsx";

// Protected pages
import DashboardPage from "../pages/DashboardPage.jsx";
import ForecastPage from "../pages/ForecastPage.jsx";
import InvoicesPage from "../pages/InvoicesPage.jsx";
import SalesInvoicesPage from "../pages/SalesInvoicesPage.jsx";
import PurchaseInvoicesPage from "../pages/PurchaseInvoicesPage.jsx";
import TransactionsPage from "../pages/TransactionsPage.jsx";
import BankInvoicesPage from "../pages/BankInvoicesPage.jsx";
import CustomersPage from "../pages/CustomersPage.jsx";
import CustomerDetailPage from "../pages/CustomerDetailPage.jsx";
import SuppliersPage from "../pages/SuppliersPage.jsx";
import SupplierDetailPage from "../pages/SupplierDetailPage.jsx";
import DealCheckerPage from "../pages/DealCheckerPage.jsx";
import ScenarioLabPage from "../pages/ScenarioLabPage.jsx";
import AlertsPage from "../pages/AlertsPage.jsx";
import ReportsPage from "../pages/ReportsPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#132433", dark: "#0d1b26", light: "#1b3a56", contrastText: "#ffffff" },
    secondary: { main: "#0f8a84", dark: "#0b6b66", light: "#dcf0ee", contrastText: "#ffffff" },
    success: { main: "#177a53", light: "#e4f2ea" },
    warning: { main: "#a2700e", light: "#faf1dc" },
    error: { main: "#c04343", light: "#f9e9e9" },
    info: { main: "#1b3a56" },
    background: { default: "#f5f6f8", paper: "#fdfdfc" },
    text: { primary: "#16232f", secondary: "#516170" },
    divider: "#e4e8ed",
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    fontSize: 13.5,
    h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, textTransform: "none", fontWeight: 600, fontSize: "13px", padding: "7px 14px", transition: "all .18s ease" },
        containedPrimary: { boxShadow: "0 1px 2px rgba(19,36,47,.18)", "&:hover": { boxShadow: "0 4px 14px rgba(19,36,47,.22)" } },
        outlined: { borderColor: "#d2d9e0", color: "#16232f", "&:hover": { borderColor: "#132433", background: "rgba(19,36,47,0.03)" } },
        text: { color: "#0b6b66", "&:hover": { background: "rgba(15,138,132,0.08)" } },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: "1px solid #eef0f3", fontSize: "13px", color: "#16232f" },
        head: { fontWeight: 700, color: "#8b98a5", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.09em", whiteSpace: "nowrap", borderBottom: "1px solid #e4e8ed" },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: "12px", backgroundColor: "#132433" } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#b9c3cd" } },
        notchedOutline: { borderColor: "#d2d9e0" },
      },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 600, fontSize: "13px" } },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* AuthProvider wraps everything so auth state is available on all routes */}
      <AuthProvider>
        {/* AppProvider wraps protected routes only — business data doesn't load until signed in */}
        <HashRouter>
          <SmoothScroll>
            <Routes>
              {/* ── Public routes (no auth required) ── */}
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />

              {/* ── Protected routes (require sign-in + onboarding) ── */}
              <Route
                path="/"
                element={
                  <AuthGuard>
                    <AppProvider>
                      <AppShell />
                    </AppProvider>
                  </AuthGuard>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="forecast" element={<ForecastPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="sales-invoices" element={<SalesInvoicesPage />} />
                <Route path="purchase-invoices" element={<PurchaseInvoicesPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="bank-invoices" element={<BankInvoicesPage />} />
                <Route path="bank-expense" element={<BankInvoicesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="suppliers/:id" element={<SupplierDetailPage />} />
                <Route path="deal-checker" element={<DealCheckerPage />} />
                <Route path="scenario-lab" element={<ScenarioLabPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Catch-all: redirect to welcome */}
              <Route path="*" element={<Navigate to="/welcome" replace />} />
            </Routes>
          </SmoothScroll>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
