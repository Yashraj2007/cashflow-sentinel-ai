import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import { motion } from "framer-motion";

/**
 * TrueFocusText: A futuristic focus-pulling text animation component.
 * Words start with a soft cinematic blur and snap into crisp, luminous focus
 * with an interactive glowing focus bracket that glides across words.
 */
export default function TrueFocusText({
  sentence = "CashFlow Sentinel",
  manualMode = false,
  blurAmount = 3,
  borderColor = "#4ade80",
  glowColor = "rgba(74, 222, 128, 0.4)",
  animationDuration = 0.5,
  pauseBetweenAnimations = 1.2,
  fontSize = "15px",
  fontWeight = 800,
  fontFamily = '"Space Grotesk", sans-serif',
  color = "#ffffff",
  className = "",
  style = {},
}) {
  const words = sentence.split(" ");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (manualMode) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, (animationDuration + pauseBetweenAnimations) * 1000);

    return () => clearInterval(interval);
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);

  return (
    <Box
      component="span"
      className={`true-focus-container ${className}`}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4em",
        position: "relative",
        cursor: "pointer",
        ...style,
      }}
      onMouseEnter={() => setCurrentIndex((prev) => (prev + 1) % words.length)}
    >
      {words.map((word, index) => {
        const isFocused = index === currentIndex;
        return (
          <Box
            key={`${word}-${index}`}
            component="span"
            sx={{
              position: "relative",
              display: "inline-block",
              fontSize,
              fontWeight,
              fontFamily,
              color,
              whiteSpace: "nowrap",
              transition: `filter ${animationDuration}s cubic-bezier(0.22, 1, 0.36, 1), transform ${animationDuration}s ease, color ${animationDuration}s ease`,
              filter: isFocused ? "blur(0px)" : `blur(${blurAmount}px)`,
              opacity: isFocused ? 1 : 0.65,
              transform: isFocused ? "scale(1.02)" : "scale(0.98)",
              textShadow: isFocused ? `0 0 16px ${glowColor}` : "none",
            }}
          >
            {word}
            {isFocused && (
              <motion.span
                layoutId="true-focus-bracket"
                style={{
                  position: "absolute",
                  inset: "-2px -5px",
                  borderRadius: "6px",
                  border: `1.5px solid ${borderColor}`,
                  boxShadow: `0 0 14px ${glowColor}, inset 0 0 8px ${glowColor}`,
                  pointerEvents: "none",
                }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 25,
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
