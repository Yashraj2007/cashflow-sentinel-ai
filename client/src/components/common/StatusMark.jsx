import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import {
  Mail,
  MailCheck,
  Send,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Zap,
  Sparkles,
  Bot,
  Clock,
  CheckCircle2,
  AlertCircle,
  Radio,
} from "lucide-react";

/**
 * StatusMark: A visual indicator for automation workflows,
 * email deliveries, AI voice call reminders, and auto-escalation triggers.
 */
export default function StatusMark({
  channel = "email", // "email" | "call" | "automation" | "sms" | "whatsapp"
  status = "sent",    // "sent" | "delivered" | "queued" | "calling" | "completed" | "failed" | "auto-triggered" | "auto-escalated"
  timestamp,
  tooltip,
  size = "medium",    // "small" | "medium"
  pulse = true,
  sx = {},
}) {
  // Normalize configuration
  let config = {
    label: "Processing",
    icon: Clock,
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.1)",
    border: "rgba(100, 116, 139, 0.25)",
    glow: "rgba(100, 116, 139, 0.3)",
    hasPulse: false,
  };

  const isSmall = size === "small";

  // Match channel & status
  if (channel === "email" || channel === "mail") {
    switch (status) {
      case "sent":
      case "delivered":
        config = {
          label: "Email Delivered",
          icon: MailCheck,
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.35)",
          glow: "rgba(16, 185, 129, 0.45)",
          hasPulse: false,
        };
        break;
      case "demo-scheduled":
      case "queued":
      case "scheduled":
        config = {
          label: "Email Queued",
          icon: Mail,
          color: "#0284c7",
          bg: "rgba(2, 132, 199, 0.12)",
          border: "rgba(2, 132, 199, 0.32)",
          glow: "rgba(2, 132, 199, 0.35)",
          hasPulse: pulse,
        };
        break;
      case "sending":
        config = {
          label: "Sending Dispatch...",
          icon: Send,
          color: "#06b6d4",
          bg: "rgba(6, 182, 212, 0.12)",
          border: "rgba(6, 182, 212, 0.35)",
          glow: "rgba(6, 182, 212, 0.45)",
          hasPulse: true,
        };
        break;
      case "failed":
      case "bounced":
        config = {
          label: "Delivery Bounced",
          icon: AlertCircle,
          color: "#ef4444",
          bg: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.32)",
          glow: "rgba(239, 68, 68, 0.4)",
          hasPulse: false,
        };
        break;
      case "draft":
      default:
        config = {
          label: "Draft Prepared",
          icon: Mail,
          color: "#64748b",
          bg: "rgba(100, 116, 139, 0.1)",
          border: "rgba(100, 116, 139, 0.25)",
          glow: "transparent",
          hasPulse: false,
        };
    }
  } else if (channel === "call" || channel === "phone") {
    switch (status) {
      case "completed":
      case "call-completed":
        config = {
          label: "Call Completed",
          icon: PhoneCall,
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.35)",
          glow: "rgba(16, 185, 129, 0.4)",
          hasPulse: false,
        };
        break;
      case "calling":
      case "in-progress":
        config = {
          label: "AI Call In-Progress",
          icon: Radio,
          color: "#06b6d4",
          bg: "rgba(6, 182, 212, 0.14)",
          border: "rgba(6, 182, 212, 0.4)",
          glow: "rgba(6, 182, 212, 0.5)",
          hasPulse: true,
        };
        break;
      case "no-answer":
      case "failed":
        config = {
          label: "Call Unanswered",
          icon: PhoneOff,
          color: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.32)",
          glow: "rgba(245, 158, 11, 0.35)",
          hasPulse: false,
        };
        break;
      case "scheduled":
      case "demo-scheduled":
      default:
        config = {
          label: "Call Scheduled",
          icon: PhoneForwarded,
          color: "#8b5cf6",
          bg: "rgba(139, 92, 246, 0.12)",
          border: "rgba(139, 92, 246, 0.32)",
          glow: "rgba(139, 92, 246, 0.35)",
          hasPulse: pulse,
        };
    }
  } else if (channel === "automation" || channel === "workflow") {
    switch (status) {
      case "auto-escalated":
        config = {
          label: "Auto-Escalated",
          icon: Zap,
          color: "#f43f5e",
          bg: "rgba(244, 63, 94, 0.12)",
          border: "rgba(244, 63, 94, 0.35)",
          glow: "rgba(244, 63, 94, 0.45)",
          hasPulse: true,
        };
        break;
      case "auto-triggered":
        config = {
          label: "Rule Auto-Fired",
          icon: Sparkles,
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.35)",
          glow: "rgba(16, 185, 129, 0.4)",
          hasPulse: true,
        };
        break;
      case "ai-agent":
      default:
        config = {
          label: "AI Flow Active",
          icon: Bot,
          color: "#6366f1",
          bg: "rgba(99, 102, 241, 0.12)",
          border: "rgba(99, 102, 241, 0.32)",
          glow: "rgba(99, 102, 241, 0.35)",
          hasPulse: pulse,
        };
    }
  }

  const IconComponent = config.icon;

  const badgeContent = (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? 0.6 : 0.85,
        px: isSmall ? 0.9 : 1.25,
        py: isSmall ? 0.3 : 0.45,
        borderRadius: "999px",
        bgcolor: config.bg,
        border: `1px solid ${config.border}`,
        boxShadow: config.hasPulse ? `0 0 10px ${config.glow}` : "none",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: `0 0 12px ${config.glow}`,
          borderColor: config.color,
        },
        ...sx,
      }}
    >
      {/* Icon with optional micro pulse beacon */}
      <Box sx={{ position: "relative", display: "grid", placeItems: "center" }}>
        <IconComponent
          size={isSmall ? 12 : 14}
          color={config.color}
          strokeWidth={2.4}
        />
        {config.hasPulse && (
          <Box
            sx={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 5,
              height: 5,
              borderRadius: "50%",
              bgcolor: config.color,
              boxShadow: `0 0 6px ${config.color}`,
              animation: "pulse 1.8s infinite ease-in-out",
            }}
          />
        )}
      </Box>

      {/* Status Label */}
      <Typography
        component="span"
        sx={{
          fontSize: isSmall ? 9.5 : 11,
          fontWeight: 750,
          color: config.color,
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {config.label}
      </Typography>

      {/* Timestamp sub-tag if provided */}
      {timestamp && (
        <Typography
          component="span"
          sx={{
            fontSize: isSmall ? 8.5 : 9.5,
            fontWeight: 500,
            color: config.color,
            opacity: 0.75,
            borderLeft: `1px solid ${config.border}`,
            pl: 0.6,
            lineHeight: 1,
          }}
        >
          {timestamp}
        </Typography>
      )}
    </Box>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow placement="top">
        {badgeContent}
      </Tooltip>
    );
  }

  return badgeContent;
}
