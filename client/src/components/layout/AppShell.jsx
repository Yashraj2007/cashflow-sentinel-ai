
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";

import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";

import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  ClipboardList,
  ArrowLeftRight,
  Users,
  Truck,
  Scale,
  FlaskConical,
  Bell,
  BarChart3,
  Settings as SettingsLucide,
  ShieldCheck,
  Banknote,
} from "lucide-react";

import { useApp } from "../../context/AppContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { ConfirmDialog, ToastHost } from "../common.jsx";
import AssistantPanel from "../AssistantPanel.jsx";
import { formatDisplay } from "../../utils/finance.js";

/* -------------------------------------------------------------------------- */
/* Navigation configuration                                                   */
/* -------------------------------------------------------------------------- */

const NAV_GROUPS = [
  {
    label: "Insight",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/forecast", label: "Cash Forecast", icon: TrendingUp },
    ],
  },
  {
    label: "Financial Data",
    items: [
      { to: "/bank-invoices", label: "Bank & Expense", icon: Banknote },
      { to: "/invoices", label: "Invoice", icon: Receipt },
      { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Parties",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    label: "Decisions",
    items: [
      { to: "/deal-checker", label: "Deal Impact Checker", icon: Scale },
      { to: "/scenario-lab", label: "Scenario Lab", icon: FlaskConical },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/alerts", label: "Alerts & Reminders", icon: Bell, badge: true },
      { to: "/reports", label: "Reports", icon: BarChart3 },
      { to: "/settings", label: "Settings", icon: SettingsLucide },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Brand                                                                      */
/* -------------------------------------------------------------------------- */

function Brand({ collapsed }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: collapsed ? 0 : 2,
        py: 2.25,
        justifyContent: collapsed ? "center" : "flex-start",
        minHeight: 80,
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* 3D Elevated Logo Mark */}
      <Box
        sx={{
          position: "relative",
          perspective: "800px",
          cursor: "pointer",
          flexShrink: 0,
          "&:hover .brand-emblem": {
            transform: "translateY(-2px) rotateX(8deg) rotateY(-8deg) scale(1.04)",
            boxShadow:
              "0 14px 30px -4px rgba(16,185,129,0.5), 0 0 20px rgba(52,211,153,0.35), inset 0 1.5px 1px rgba(255,255,255,0.65), inset 0 -2px 6px rgba(0,0,0,0.4)",
          },
        }}
      >
        {/* Ambient backlight glow */}
        <Box
          sx={{
            position: "absolute",
            inset: -4,
            borderRadius: "16px",
            background: "radial-gradient(circle, rgba(16,185,129,0.35) 0%, transparent 70%)",
            filter: "blur(8px)",
            pointerEvents: "none",
          }}
        />

        <Box
          className="brand-emblem"
          sx={{
            width: 42,
            height: 42,
            borderRadius: "14px",
            background:
              "linear-gradient(135deg, #4ade80 0%, #10b981 35%, #059669 75%, #047857 100%)",
            display: "grid",
            placeItems: "center",
            position: "relative",
            boxShadow:
              "0 10px 24px -3px rgba(16,185,129,0.42), inset 0 1.5px 1px rgba(255,255,255,0.55), inset 0 -2px 5px rgba(0,0,0,0.35)",
            border: "1px solid rgba(167,243,208,0.35)",
            transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            transform: "perspective(800px) rotateX(4deg)",
          }}
        >
          <ShieldCheck size={23} color="#ffffff" strokeWidth={2.4} />

          {/* Micro elevated indicator dot */}
          <Box
            sx={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              border: "2px solid #0f172a",
              boxShadow: "0 0 8px #10b981",
            }}
          />
        </Box>
      </Box>

      {/* Elevated Brand Typography - Finance Theme */}
      {!collapsed && (
        <Box sx={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: "5px",
              lineHeight: 1.15,
            }}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 800,
                fontSize: "15px",
                letterSpacing: "-0.025em",
                color: "#FFFFFF",
                textShadow: "0 1px 2px rgba(0,0,0,0.5), 0 3px 10px rgba(0,0,0,0.4)",
              }}
            >
              CashFlow
            </Typography>
            <Typography
              component="span"
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 800,
                fontSize: "15px",
                letterSpacing: "-0.025em",
                background: "linear-gradient(135deg, #a7f3d0 0%, #34d399 45%, #10b981 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 8px rgba(16,185,129,0.4))",
              }}
            >
              Sentinel
            </Typography>
          </Box>

          <Box
            sx={{
              mt: 0.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.65,
              px: 0.85,
              py: 0.2,
              borderRadius: "5px",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(52,211,153,0.18)",
              backdropFilter: "blur(6px)",
            }}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 6px #34d399",
                animation: "pulse 2s infinite",
              }}
            />
            <Typography
              sx={{
                fontSize: 11.5,
                letterSpacing: "0.14em",
                color: "#6ee7b7",
                fontWeight: 800,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              AI · Capital Guard
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Vertical sidebar                                                           */
/* -------------------------------------------------------------------------- */

function SidebarContent({
  onNavigate,
  collapsed,
  onToggleCollapse,
}) {
  const { unreadCount } = useApp();

  return (
    <Box
      component="nav"
      aria-label="Primary navigation"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background:
          "linear-gradient(180deg, #102a24 0%, #0d241f 52%, #0b201b 100%)",
        borderRight: "1px solid rgba(174,229,211,0.11)",
        color: "#f4fff9",
        boxShadow: "8px 0 36px rgba(15,38,30,0.05)",
      }}
    >
      <Brand collapsed={collapsed} />

      {/* Scrollable navigation groups */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          px: collapsed ? 0.75 : 1.35,
          pb: 2,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(188,231,214,.2) transparent",
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(188,231,214,.2)",
            borderRadius: 8,
          },
        }}
      >
        {NAV_GROUPS.map((group) => (
          <Box key={group.label} sx={{ mb: 1.25 }}>
            {!collapsed && (
              <Typography
                sx={{
                  px: 1.45,
                  pt: 1.15,
                  pb: 0.65,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(205,235,221,0.42)",
                }}
              >
                {group.label}
              </Typography>
            )}

            {collapsed && (
              <Divider
                sx={{
                  borderColor: "rgba(174,229,211,0.12)",
                  my: 1.25,
                  mx: 0.5,
                }}
              />
            )}

            {group.items.map((item) => {
              const Icon = item.icon;

              const renderItem = (isActive) => (
                <Box
                  className="nav-link-item"
                  sx={{
                    display: "flex",
                    position: "relative",
                    alignItems: "center",
                    gap: 1.3,
                    px: collapsed ? 0 : 1.4,
                    py: collapsed ? 1.2 : 1.05,
                    mb: 0.45,
                    minHeight: 44,
                    borderRadius: "13px",
                    overflow: "hidden",
                    justifyContent: collapsed ? "center" : "flex-start",
                    color: isActive
                      ? "#ffffff"
                      : "rgba(226,243,235,0.74)",
                    background: isActive
                      ? "linear-gradient(102deg, rgba(42,190,156,0.25) 0%, rgba(22,133,107,0.14) 100%)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(95,224,190,0.28)"
                      : "1px solid transparent",
                    boxShadow: isActive
                      ? "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 18px rgba(0,0,0,0.12)"
                      : "none",
                    fontSize: 12.8,
                    fontWeight: isActive ? 700 : 530,
                    letterSpacing: isActive ? "-0.01em" : 0,
                    transition:
                      "all 0.28s cubic-bezier(0.16, 1, 0.3, 1)",

                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: -1,
                      top: "calc(50% - 11px)",
                      height: "22px",
                      width: "3.5px",
                      borderRadius: "0 4px 4px 0",
                      background: isActive ? "#63dfbd" : "#45cfa8",
                      boxShadow: isActive
                        ? "0 0 14px rgba(99,223,189,0.75)"
                        : "0 0 10px rgba(69,207,168,0.5)",
                      transform: isActive ? "scaleY(1)" : "scaleY(0)",
                      opacity: isActive ? 1 : 0,
                      transition:
                        "transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease",
                    },

                    "&::after": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      borderRadius: "inherit",
                      background:
                        "radial-gradient(ellipse 140px 45px at 15% 50%, rgba(124,232,201,0.14), transparent 75%)",
                      opacity: 0,
                      pointerEvents: "none",
                      transition: "opacity 0.32s ease",
                    },

                    "&:hover": {
                      background: isActive
                        ? "linear-gradient(102deg, rgba(42,190,156,0.34) 0%, rgba(22,133,107,0.20) 100%)"
                        : "linear-gradient(102deg, rgba(38,166,136,0.18) 0%, rgba(22,133,107,0.08) 100%)",
                      color: "#ffffff",
                      transform: collapsed
                        ? "translateY(-2px) scale(1.06)"
                        : "translateX(6px)",
                      borderColor: isActive
                        ? "rgba(124,232,201,0.42)"
                        : "rgba(124,232,201,0.26)",
                      boxShadow: isActive
                        ? "0 6px 22px rgba(16,185,129,0.22), inset 0 1px 0 rgba(255,255,255,0.12)"
                        : "0 6px 20px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
                      "&::before": {
                        transform: "scaleY(1)",
                        opacity: 1,
                      },
                      "&::after": {
                        opacity: 1,
                      },
                      "& .nav-icon": {
                        color: "#8effdb",
                        transform: "scale(1.15) rotate(-3deg)",
                        filter: "drop-shadow(0 0 8px rgba(142,255,219,0.6))",
                      },
                      "& .nav-label": {
                        color: "#ffffff",
                        letterSpacing: "-0.005em",
                      },
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      display: "grid",
                      placeItems: "center",
                      zIndex: 1,
                    }}
                  >
                    <Box
                      className="nav-icon"
                      sx={{
                        display: "grid",
                        placeItems: "center",
                        color: isActive ? "#7ce8c9" : "currentColor",
                        transition:
                          "transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), color 0.22s ease, filter 0.26s ease",
                      }}
                    >
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.45 : 1.9}
                      />
                    </Box>

                    {item.badge && unreadCount > 0 && collapsed && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: -4,
                          right: -6,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#cd3c3c",
                          border: "1.5px solid #12263a",
                        }}
                      />
                    )}
                  </Box>

                  {!collapsed && (
                    <Box
                      className="nav-label"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        zIndex: 1,
                        transition: "color 0.22s ease, letter-spacing 0.22s ease",
                      }}
                    >
                      {item.label}
                    </Box>
                  )}

                  {item.badge && unreadCount > 0 && !collapsed && (
                    <Chip
                      className="nav-badge"
                      label={unreadCount > 99 ? "99+" : unreadCount}
                      size="small"
                      sx={{
                        height: 19,
                        minWidth: 20,
                        fontSize: 11.8,
                        fontWeight: 800,
                        background: "#e35d5b",
                        color: "#fff",
                        borderRadius: "7px",
                        zIndex: 1,
                        transition: "transform 0.24s ease",
                        "& .MuiChip-label": { px: 0.7 },
                      }}
                    />
                  )}
                </Box>
              );

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  style={{ textDecoration: "none" }}
                >
                  {({ isActive }) =>
                    collapsed ? (
                      <Tooltip title={item.label} placement="right" arrow>
                        {renderItem(isActive)}
                      </Tooltip>
                    ) : (
                      renderItem(isActive)
                    )
                  }
                </NavLink>
              );
            })}
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: "rgba(174,229,211,0.11)" }} />

      {!collapsed && (
        <Box sx={{ px: 1.7, py: 1.35, flexShrink: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              mb: 0.6,
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: "#54d7ac",
                boxShadow: "0 0 0 3px rgba(84,215,172,0.1)",
              }}
            />

            <Typography
              sx={{
                fontSize: 11.5,
                letterSpacing: "0.13em",
                fontWeight: 800,
                color: "rgba(205,235,221,0.66)",
                textTransform: "uppercase",
              }}
            >
              Demo workspace
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: 11.8,
              color: "rgba(220,239,230,0.42)",
              lineHeight: 1.5,
            }}
          >
            Synthetic data only · No real money or emails
          </Typography>
        </Box>
      )}

      {/* Compact mode toggle */}
      <Box
        component="button"
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          width: "100%",
          py: 1.1,
          border: "none",
          borderTop: "1px solid rgba(174,229,211,0.11)",
          background: "rgba(0,0,0,0.06)",
          color: "rgba(220,239,230,0.56)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          transition: "all 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
          "&:hover": {
            color: "#8effdb",
            background: "rgba(42,190,156,0.12)",
            "& svg": {
              transform: collapsed ? "translateX(3px)" : "translateX(-3px)",
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            },
          },
        }}
      >
        {collapsed ? (
          <KeyboardDoubleArrowRightIcon sx={{ fontSize: 16 }} />
        ) : (
          <>
            <KeyboardDoubleArrowLeftIcon sx={{ fontSize: 16 }} />
            Collapse
          </>
        )}
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Application shell                                                          */
/* -------------------------------------------------------------------------- */

export default function AppShell() {
  const {
    business,
    businesses,
    dispatch,
    settings,
    alerts,
    unreadCount,
    state,
    dataset,
    toast,
  } = useApp();

  const {
    user: authUser,
    signOut,
    resetOnboarding,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const effectiveCollapsed = collapsed && !isHovered;

  const [bellAnchor, setBellAnchor] = useState(null);
  const [helpAnchor, setHelpAnchor] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);

  /* Header elevation while the page is scrolled */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Global page, customer, supplier and invoice search */
  const searchOptions = useMemo(() => {
    const pages = NAV_GROUPS.flatMap((group) => group.items).map((item) => ({
      group: "Pages",
      label: item.label,
      to: item.to,
    }));

    if (!dataset) return pages;

    const customers = (dataset.customers || []).map((customer) => ({
      group: "Customers",
      label: customer.name,
      to: `/customers/${customer.id}`,
    }));

    const suppliers = (dataset.suppliers || []).map((supplier) => ({
      group: "Suppliers",
      label: supplier.name,
      to: `/suppliers/${supplier.id}`,
    }));

    const sales = (dataset.salesInvoices || []).map((invoice) => ({
      group: "Sales invoices",
      label: `${invoice.number} — ${
        (dataset.customers || []).find(
          (customer) => customer.id === invoice.partyId,
        )?.name || ""
      }`,
      to: "/sales-invoices",
    }));

    const purchase = (dataset.purchaseInvoices || []).map((invoice) => ({
      group: "Purchase invoices",
      label: `${invoice.number} — ${
        (dataset.suppliers || []).find(
          (supplier) => supplier.id === invoice.partyId,
        )?.name || ""
      }`,
      to: "/purchase-invoices",
    }));

    return [...pages, ...customers, ...suppliers, ...sales, ...purchase];
  }, [dataset]);

  const toggleSidebarVisibility = () => {
    setSidebarHidden((hidden) => !hidden);
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        position: "relative",
        isolation: "isolate",
        bgcolor: "#f3f7f4",
        color: "#172a22",
        overflowX: "clip",
      }}
    >
      {/* Soft evergreen background */}
      <Box
        className="app-backdrop"
        aria-hidden="true"
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 72% -8%, rgba(91,183,147,0.11), transparent 32%), radial-gradient(circle at 12% 90%, rgba(202,229,210,0.18), transparent 28%), #f3f7f4",
        }}
      />

      {/* Desktop sidebar: auto-collapses on hover */}
      <Box
        data-lenis-prevent
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          width: {
            xs: 0,
            md: sidebarHidden ? 0 : effectiveCollapsed ? 76 : 252,
          },
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 1100,
          overflow: "hidden",
          pointerEvents: sidebarHidden ? "none" : "auto",
          transition: "width 0.28s cubic-bezier(0.22,1,0.36,1)",
          willChange: "width",
          boxShadow: !effectiveCollapsed && isHovered
            ? "10px 0 35px rgba(13,36,28,0.22)"
            : "none",
        }}
      >
        <Box
          sx={{
            width: effectiveCollapsed ? 76 : 252,
            minWidth: effectiveCollapsed ? 76 : 252,
            height: "100%",
            transform: sidebarHidden ? "translateX(-100%)" : "translateX(0)",
            opacity: sidebarHidden ? 0.85 : 1,
            transition:
              "width 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease",
            willChange: "width, transform",
          }}
        >
          <SidebarContent
            collapsed={effectiveCollapsed}
            onToggleCollapse={() => setCollapsed((value) => !value)}
          />
        </Box>
      </Box>

      {/* Floating handle restores the fully hidden sidebar */}
      {sidebarHidden && (
        <Tooltip title="Show navigation" placement="right" arrow>
          <Box
            component="button"
            type="button"
            onClick={() => setSidebarHidden(false)}
            aria-label="Show navigation sidebar"
            sx={{
              display: { xs: "none", md: "grid" },
              placeItems: "center",
              position: "fixed",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1500,
              width: 30,
              height: 72,
              p: 0,
              border: "1px solid rgba(112,181,153,0.38)",
              borderLeft: 0,
              borderRadius: "0 12px 12px 0",
              color: "#d9fff1",
              background: "linear-gradient(180deg, #174b3a, #0d3026)",
              boxShadow: "5px 7px 20px rgba(14,48,36,0.2)",
              cursor: "pointer",
              animation: "appNavHandleIn 0.28s cubic-bezier(0.22,1,0.36,1) both",

              "@keyframes appNavHandleIn": {
                from: {
                  opacity: 0,
                  transform: "translate(-10px, -50%)",
                },
                to: {
                  opacity: 1,
                  transform: "translate(0, -50%)",
                },
              },

              "&:hover": {
                width: 36,
                color: "#ffffff",
                background: "linear-gradient(180deg, #1d6b50, #104332)",
              },
            }}
          >
            <KeyboardDoubleArrowRightIcon sx={{ fontSize: 19 }} />
          </Box>
        </Tooltip>
      )}

      {/* Mobile navigation drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ elevation: 0, "data-lenis-prevent": "true" }}
        sx={{
          "& .MuiDrawer-paper": {
            width: 278,
            maxWidth: "86vw",
            border: "none",
            boxShadow: "18px 0 50px rgba(12,35,26,0.22)",
          },
        }}
      >
        <SidebarContent
          collapsed={false}
          onNavigate={() => setMobileOpen(false)}
          onToggleCollapse={() => setMobileOpen(false)}
        />
      </Drawer>

      {/* Main application column */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Sticky glass-effect header */}
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            background: "rgba(250,253,250,0.86)",
            backdropFilter: "blur(18px) saturate(1.25)",
            borderBottom: "1px solid rgba(208,223,214,0.82)",
            boxShadow: scrolled
              ? "0 8px 28px rgba(20,53,39,0.07)"
              : "0 1px 0 rgba(255,255,255,0.7)",
            transition: "box-shadow .25s ease, background .25s ease",
          }}
        >
          <Toolbar
            variant="dense"
            sx={{
              gap: { xs: 0.75, sm: 1.1, lg: 1.5 },
              minHeight: "66px !important",
              flexWrap: "nowrap",
              py: 0.75,
              px: { xs: 1.25, sm: 2, lg: 2.5 },
              overflow: "hidden",
            }}
          >
            {/* Mobile menu toggle */}
            <IconButton
              edge="start"
              sx={{
                display: { md: "none" },
                color: "#1a4e3b",
                bgcolor: "rgba(20,113,78,0.07)",
                borderRadius: "11px",
                flexShrink: 0,
                transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                "&:hover": {
                  bgcolor: "rgba(20,113,78,0.14)",
                  transform: "scale(1.08)",
                  boxShadow: "0 2px 10px rgba(22,124,84,0.14)",
                },
              }}
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <MenuIcon />
            </IconButton>

            {/* Desktop hide/show navigation control */}
            <Tooltip
              title={
                sidebarHidden
                  ? "Show vertical navigation"
                  : "Hide vertical navigation"
              }
            >
              <IconButton
                onClick={toggleSidebarVisibility}
                aria-label={
                  sidebarHidden
                    ? "Show vertical navigation"
                    : "Hide vertical navigation"
                }
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  color: sidebarHidden ? "#0c7959" : "#355748",
                  bgcolor: sidebarHidden
                    ? "rgba(22,124,84,0.11)"
                    : "transparent",
                  border: "1px solid",
                  borderColor: sidebarHidden
                    ? "rgba(22,124,84,0.18)"
                    : "transparent",
                  borderRadius: "11px",
                  flexShrink: 0,
                  transition:
                    "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&:hover": {
                    bgcolor: "rgba(22,124,84,0.12)",
                    transform: "scale(1.08)",
                    borderColor: "rgba(22,124,84,0.25)",
                    boxShadow: "0 2px 10px rgba(22,124,84,0.14)",
                  },
                }}
              >
                {sidebarHidden ? (
                  <KeyboardDoubleArrowRightIcon />
                ) : (
                  <KeyboardDoubleArrowLeftIcon />
                )}
              </IconButton>
            </Tooltip>

            {/* Business selector */}
            <Tooltip title="Switch demo business">
              <Select
                size="small"
                value={state.businessId}
                onChange={(event) => {
                  dispatch({
                    type: "SWITCH_BUSINESS",
                    businessId: event.target.value,
                  });

                  const selectedBusiness = businesses.find(
                    (item) => item.id === event.target.value,
                  );

                  if (selectedBusiness) {
                    toast(`Switched to ${selectedBusiness.name}`, "info");
                  }
                }}
                sx={{
                  fontWeight: 700,
                  fontSize: 12.5,
                  minWidth: { xs: 100, sm: 150 },
                  maxWidth: { xs: "36vw", sm: 220 },
                  flexShrink: 1,
                  borderRadius: "12px",
                  bgcolor: "rgba(255,255,255,0.78)",
                  transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&:hover": {
                    bgcolor: "#ffffff",
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 14px rgba(22,124,84,0.10)",
                  },

                  "& .MuiSelect-select": {
                    py: 1,
                    pr: "30px !important",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },

                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#dce7df",
                  },

                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#9bbdac",
                  },
                }}
              >
                {businesses.map((item) => (
                  <MenuItem
                    key={item.id}
                    value={item.id}
                    sx={{ fontSize: 13 }}
                  >
                    <Box>
                      <Box sx={{ fontWeight: 600 }}>{item.name}</Box>
                      <Box sx={{ fontSize: 12, color: "text.secondary" }}>
                        {item.type}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </Tooltip>

            {/* Global search */}
            <Autocomplete
              size="small"
              options={searchOptions}
              groupBy={(option) => option.group}
              getOptionLabel={(option) => option.label}
              sx={{
                display: { xs: "none", sm: "block" },
                width: { sm: 190, md: 230, lg: 330 },
                flexShrink: 1,

                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: "rgba(255,255,255,0.78)",
                  fontSize: 12.5,
                  py: 0.1,
                  transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&:hover": {
                    bgcolor: "#ffffff",
                    boxShadow: "0 4px 16px rgba(22,124,84,0.09)",
                    transform: "translateY(-1px)",
                  },
                },

                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#dce7df",
                  transition: "border-color 0.2s ease",
                },

                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "#7fc4a5",
                  },
              }}
              onChange={(event, value) => {
                if (value) navigate(value.to);
              }}
              renderInput={(params) => {
                const { slotProps, ...restParams } = params;
                return (
                  <TextField
                    {...restParams}
                    placeholder="Search invoices, parties, pages…"
                    slotProps={{
                      ...slotProps,
                      input: {
                        ...slotProps?.input,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 18 }} />
                            </InputAdornment>
                            {slotProps?.input?.startAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                );
              }}
            />

            <Box sx={{ flex: 1, minWidth: 4 }} />

            {/* Global forecast horizon */}
            <Tooltip title="Forecast horizon — used across dashboard, forecast and scenario pages">
              <Select
                size="small"
                value={settings.forecastHorizonDays}
                onChange={(event) =>
                  dispatch({
                    type: "UPDATE_SETTINGS",
                    patch: {
                      forecastHorizonDays: Number(event.target.value),
                    },
                  })
                }
                sx={{
                  display: { xs: "none", sm: "block" },
                  fontSize: 11.5,
                  fontFamily: '"IBM Plex Mono", monospace',
                  minWidth: { xs: 70, sm: 84 },
                  borderRadius: "10px",
                  bgcolor: "rgba(255,255,255,0.75)",
                  transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&:hover": {
                    bgcolor: "#ffffff",
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(22,124,84,0.08)",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#dce7df",
                    transition: "border-color 0.2s ease",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#7fc4a5",
                  },
                }}
                aria-label="Forecast horizon"
              >
                {[7, 30, 60, 90].map((days) => (
                  <MenuItem
                    key={days}
                    value={days}
                    sx={{ fontSize: 13 }}
                  >
                    {days} days
                  </MenuItem>
                ))}
              </Select>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                sx={{
                  color: "#355748",
                  borderRadius: "11px",
                  flexShrink: 0,
                  transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&:hover": {
                    bgcolor: "rgba(22,124,84,0.12)",
                    transform: "scale(1.08)",
                    boxShadow: "0 2px 10px rgba(22,124,84,0.14)",
                    "& svg": {
                      transform: "rotate(14deg)",
                      transition: "transform 0.2s ease",
                    },
                  },
                }}
                onClick={(event) => setBellAnchor(event.currentTarget)}
                aria-label={`Notifications — ${unreadCount} unread`}
              >
                <Badge badgeContent={unreadCount} color="error" max={9}>
                  <NotificationsNoneIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={bellAnchor}
              open={!!bellAnchor}
              onClose={() => setBellAnchor(null)}
              PaperProps={{
                sx: {
                  width: 380,
                  maxWidth: "92vw",
                  mt: 1,
                  borderRadius: "16px",
                  border: "1px solid #e2ebe5",
                  boxShadow: "0 18px 50px rgba(20,53,39,0.14)",
                  overflow: "hidden",
                },
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle2">Alerts</Typography>

                <Typography variant="caption" color="text.secondary">
                  {unreadCount} unread
                </Typography>
              </Box>

              <Divider />

              {alerts.slice(0, 5).map((alert) => {
                const meta = (dataset?.alertMeta || {})[alert.id];

                return (
                  <MenuItem
                    key={alert.id}
                    sx={{
                      whiteSpace: "normal",
                      alignItems: "flex-start",
                      gap: 1,
                      opacity: meta && meta.read ? 0.62 : 1,
                    }}
                    onClick={() => {
                      dispatch({
                        type: "ALERT_META",
                        alertId: alert.id,
                        read: true,
                        resolved: meta ? !!meta.resolved : false,
                      });

                      setBellAnchor(null);
                      navigate(alert.link);
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        mt: 0.75,
                        flexShrink: 0,
                        background:
                          alert.severity === "high"
                            ? "#cd3c3c"
                            : alert.severity === "medium"
                              ? "#c07f10"
                              : "#7b8ba0",
                      }}
                    />

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          lineHeight: 1.35,
                        }}
                      >
                        {alert.title}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 11.5,
                          color: "text.secondary",
                        }}
                      >
                        {formatDisplay(alert.date)} · {alert.actionLabel}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              })}

              <Divider />

              <MenuItem
                sx={{
                  justifyContent: "center",
                  color: "primary.main",
                  fontWeight: 600,
                  fontSize: 13,
                }}
                onClick={() => {
                  setBellAnchor(null);
                  navigate("/alerts");
                }}
              >
                Open Alerts & Reminders
              </MenuItem>
            </Menu>

            {/* Help */}
            <Tooltip title="Help">
              <IconButton
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  color: "#355748",
                  borderRadius: "11px",
                  flexShrink: 0,
                  transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&:hover": {
                    bgcolor: "rgba(22,124,84,0.12)",
                    transform: "scale(1.08)",
                    boxShadow: "0 2px 10px rgba(22,124,84,0.14)",
                    "& svg": {
                      transform: "rotate(-12deg)",
                      transition: "transform 0.2s ease",
                    },
                  },
                }}
                onClick={(event) => setHelpAnchor(event.currentTarget)}
                aria-label="Help"
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={helpAnchor}
              open={!!helpAnchor}
              onClose={() => setHelpAnchor(null)}
              PaperProps={{
                sx: {
                  width: 320,
                  p: 1,
                  mt: 1,
                  borderRadius: "16px",
                  border: "1px solid #e2ebe5",
                  boxShadow: "0 18px 50px rgba(20,53,39,0.14)",
                },
              }}
            >
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  About this app
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: 12.5, mb: 1 }}
                >
                  All data is synthetic and anchored to today. Every forecast,
                  alert and recommendation is computed live in your browser —
                  nothing is hardcoded, and nothing leaves your machine. Try
                  the assistant (sparkle button) for quick answers.
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: 12.5 }}
                >
                  CashFlow Sentinel AI connects to Firebase Firestore for live data.
                  All forecasts, alerts and recommendations are computed from your
                  real business data. Use the AI assistant (sparkle button) for quick answers.
                </Typography>
              </Box>
            </Menu>

            {/* Account menu */}
            <Tooltip title="Account">
              <IconButton
                sx={{
                  p: 0.45,
                  borderRadius: "12px",
                  flexShrink: 0,
                  transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&:hover": {
                    bgcolor: "rgba(22,124,84,0.12)",
                    transform: "scale(1.06)",
                    "& .MuiAvatar-root": {
                      boxShadow:
                        "0 0 0 4px rgba(35,159,124,0.35), 0 4px 14px rgba(18,93,71,0.22)",
                      transform: "scale(1.03)",
                    },
                  },
                }}
                onClick={(event) => setProfileAnchor(event.currentTarget)}
                aria-label="Account menu"
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: "#14785d",
                    background: "linear-gradient(145deg, #239f7c, #125d47)",
                    fontSize: 12.5,
                    fontWeight: 800,
                    boxShadow: "0 0 0 3px #e6f2eb",
                    border: "1px solid rgba(255,255,255,0.8)",
                    transition:
                      "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease",
                  }}
                >
                  {authUser?.avatarInitials ||
                    (business
                      ? business.owner
                          .split(" ")
                          .map((word) => word[0])
                          .slice(0, 2)
                          .join("")
                      : "U")}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={profileAnchor}
              open={!!profileAnchor}
              onClose={() => setProfileAnchor(null)}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {authUser?.name || (business ? business.owner : "Demo user")}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: "text.secondary",
                  }}
                >
                  {authUser?.email || (business ? business.email : "")}
                </Typography>

                {authUser?.photoURL && (
                  <img src={authUser.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", display: "none" }} />
                )}
              </Box>

              <Divider sx={{ my: 0.5 }} />

              <MenuItem
                onClick={() => {
                  setProfileAnchor(null);
                  navigate("/settings");
                }}
              >
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Business settings</ListItemText>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setProfileAnchor(null);
                  setResetOpen(true);
                }}
              >
                <ListItemIcon>
                  <RestartAltIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Reset demo data</ListItemText>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setProfileAnchor(null);
                  signOut();
                  navigate("/welcome", { replace: true });
                }}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Sign out</ListItemText>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Animated page content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            zIndex: 0,
          }}
        >
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ willChange: "transform, opacity" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }
            }
          >
            <Outlet />
          </motion.div>
        </Box>
      </Box>

      {/* Global assistant and toast notifications */}
      <AssistantPanel />
      <ToastHost />

      {/* Reset demo data confirmation */}
      <ConfirmDialog
        open={resetOpen}
        title="Reset demo data?"
        body="All imported invoices, recorded payments, saved scenarios and settings for both demo businesses will be regenerated from the original synthetic dataset."
        confirmLabel="Reset data"
        tone="error"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          dispatch({ type: "RESET_DATA" });
          resetOnboarding();
          setResetOpen(false);
          toast("Demo data restored — please complete onboarding again");
          signOut();
          navigate("/welcome", { replace: true });
        }}
      />
    </Box>
  );
}
