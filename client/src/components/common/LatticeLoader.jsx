import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { motion } from "framer-motion";

/**
 * LatticeLoader: A sleek, high-tech matrix lattice loader for financial telemetry,
 * AI scenario simulations, and async data ingestion.
 * Features a 3x3 matrix lattice with wave-phased pulsing nodes and glowing interconnected lines.
 */
export default function LatticeLoader({
  size = 48,
  color = "#10b981",
  secondaryColor = "rgba(16, 185, 129, 0.2)",
  message = "Syncing Financial Telemetry...",
  subtext = "Calibrating working capital vectors",
  fullscreen = false,
}) {
  const gridSize = 3;
  const nodes = Array.from({ length: gridSize * gridSize }, (_, i) => ({
    id: i,
    row: Math.floor(i / gridSize),
    col: i % gridSize,
  }));

  const content = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2.5,
        p: 3,
      }}
    >
      {/* 3D Elevated Lattice Matrix */}
      <Box
        sx={{
          position: "relative",
          width: size,
          height: size,
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          gap: `${size * 0.16}px`,
          perspective: "600px",
          transform: "rotateX(15deg) rotateZ(-5deg)",
        }}
      >
        {/* Ambient backdrop glow */}
        <Box
          sx={{
            position: "absolute",
            inset: -12,
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
            filter: "blur(12px)",
            pointerEvents: "none",
          }}
        />

        {/* Nodes in Lattice */}
        {nodes.map((node) => {
          // Distance from center determines animation phase
          const delay = (node.row + node.col) * 0.15;

          return (
            <motion.div
              key={node.id}
              animate={{
                scale: [0.65, 1.25, 0.65],
                opacity: [0.35, 1, 0.35],
                backgroundColor: [secondaryColor, color, secondaryColor],
                boxShadow: [
                  `0 0 0px ${color}`,
                  `0 0 14px ${color}, 0 0 24px ${color}88`,
                  `0 0 0px ${color}`,
                ],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
              }}
              style={{
                borderRadius: "4px",
                width: "100%",
                height: "100%",
                border: `1px solid ${color}66`,
              }}
            />
          );
        })}
      </Box>

      {/* Accompanying telemetry labels */}
      {(message || subtext) && (
        <Box sx={{ textAlign: "center" }}>
          {message && (
            <Typography
              sx={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: 13.5,
                fontWeight: 700,
                color: "#e2e8f0",
                letterSpacing: "-0.01em",
              }}
            >
              {message}
            </Typography>
          )}
          {subtext && (
            <Typography
              sx={{
                mt: 0.5,
                fontSize: 12,
                fontWeight: 500,
                color: "#94a3b8",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {subtext}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );

  if (fullscreen) {
    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "grid",
          placeItems: "center",
          background: "rgba(10, 15, 29, 0.82)",
          backdropFilter: "blur(12px)",
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
}
