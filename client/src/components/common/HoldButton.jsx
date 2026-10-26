import React, { useState, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { Check, ShieldAlert } from "lucide-react";

/**
 * HoldButton: An intentional press-and-hold confirmation button for critical financial actions.
 * Prevents accidental clicks by requiring continuous hold until progress reaches 100%.
 */
export default function HoldButton({
  label = "Hold to Confirm",
  confirmingLabel = "Holding...",
  completedLabel = "Confirmed",
  onComplete,
  holdDuration = 1400, // milliseconds
  variant = "primary", // "primary" (emerald) | "danger" (rose) | "warning" (amber)
  disabled = false,
  icon: CustomIcon,
  size = "medium", // "small" | "medium" | "large"
  sx = {},
}) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const requestRef = useRef(null);
  const startTimeRef = useRef(null);

  // Palette selection
  const palettes = {
    primary: {
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.35)",
      text: "#10b981",
      fill: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
      glow: "rgba(16, 185, 129, 0.45)",
    },
    danger: {
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.35)",
      text: "#f87171",
      fill: "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
      glow: "rgba(239, 68, 68, 0.45)",
    },
    warning: {
      bg: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.35)",
      text: "#fbbf24",
      fill: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
      glow: "rgba(245, 158, 11, 0.45)",
    },
  };

  const currentTheme = palettes[variant] || palettes.primary;

  const startHold = (e) => {
    if (disabled || isComplete) return;
    setIsHolding(true);
    startTimeRef.current = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTimeRef.current;
      const calculatedProgress = Math.min(100, (elapsed / holdDuration) * 100);
      setProgress(calculatedProgress);

      if (calculatedProgress < 100) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setIsHolding(false);
        setIsComplete(true);
        if (onComplete) onComplete();
        // Reset after short delay
        setTimeout(() => {
          setIsComplete(false);
          setProgress(0);
        }, 1800);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
  };

  const stopHold = () => {
    if (isComplete) return;
    setIsHolding(false);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    // Smooth reset
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const sizeStyles = {
    small: { px: 1.75, py: 0.75, fontSize: "12px", minHeight: 34 },
    medium: { px: 2.25, py: 1, fontSize: "13.5px", minHeight: 40 },
    large: { px: 3, py: 1.25, fontSize: "15px", minHeight: 46 },
  }[size] || { px: 2.25, py: 1, fontSize: "13.5px", minHeight: 40 };

  return (
    <ButtonBase
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={startHold}
      onTouchEnd={stopHold}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "10px",
        backgroundColor: currentTheme.bg,
        border: `1.5px solid ${currentTheme.border}`,
        color: currentTheme.text,
        userSelect: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease",
        transform: isHolding ? "scale(0.98)" : "scale(1)",
        boxShadow: isHolding
          ? `0 0 16px ${currentTheme.glow}, inset 0 0 10px ${currentTheme.glow}`
          : "none",
        ...sizeStyles,
        ...sx,
      }}
    >
      {/* Background Fill Progress Bar */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progress}%`,
          background: currentTheme.fill,
          opacity: 0.35,
          transition: isHolding ? "none" : "width 0.25s ease-out",
          pointerEvents: "none",
        }}
      />

      {/* Glowing leading progress line */}
      {isHolding && progress > 0 && progress < 100 && (
        <Box
          sx={{
            position: "absolute",
            left: `${progress}%`,
            top: 0,
            bottom: 0,
            width: "3px",
            background: "#ffffff",
            boxShadow: `0 0 10px #ffffff, 0 0 18px ${currentTheme.glow}`,
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Button content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        {isComplete ? (
          <Check size={16} strokeWidth={2.5} />
        ) : CustomIcon ? (
          <CustomIcon size={16} strokeWidth={2.2} />
        ) : (
          <ShieldAlert size={16} strokeWidth={2} />
        )}

        <Typography
          component="span"
          sx={{
            fontSize: "inherit",
            fontWeight: "inherit",
            letterSpacing: "inherit",
            color: isComplete ? "#ffffff" : currentTheme.text,
          }}
        >
          {isComplete ? completedLabel : isHolding ? confirmingLabel : label}
        </Typography>

        {isHolding && (
          <Typography
            component="span"
            sx={{
              fontSize: "11px",
              opacity: 0.8,
              fontFamily: "monospace",
              ml: 0.5,
            }}
          >
            {Math.round(progress)}%
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
}
