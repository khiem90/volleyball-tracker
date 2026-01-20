"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

const spring = {
  type: "spring",
  stiffness: 500,
  damping: 30,
} as const;

export const ThemeToggle = memo(() => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-track"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Track glow effect */}
      <motion.span
        className="theme-toggle-glow"
        animate={{
          background: isDark
            ? "radial-gradient(circle at 75% 50%, oklch(0.62 0.2 25 / 0.4), transparent 70%)"
            : "radial-gradient(circle at 25% 50%, oklch(0.75 0.18 55 / 0.5), transparent 70%)",
        }}
        transition={{ duration: 0.4 }}
      />

      {/* Animated orb */}
      <motion.span
        className="theme-toggle-orb"
        layout
        animate={{
          x: isDark ? 20 : 0,
          background: isDark
            ? "linear-gradient(135deg, oklch(0.85 0.03 240), oklch(0.7 0.05 250))"
            : "linear-gradient(135deg, oklch(0.9 0.15 70), oklch(0.8 0.18 50))",
        }}
        transition={spring}
      >
        {/* Sun/Moon face */}
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.span
              key="moon"
              className="theme-toggle-icon"
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {/* Moon with craters */}
              <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
                <circle cx="10" cy="10" r="8" fill="oklch(0.75 0.04 250)" />
                <circle cx="7" cy="7" r="2" fill="oklch(0.65 0.04 250)" opacity="0.6" />
                <circle cx="12" cy="11" r="1.5" fill="oklch(0.65 0.04 250)" opacity="0.5" />
                <circle cx="8" cy="13" r="1" fill="oklch(0.65 0.04 250)" opacity="0.4" />
              </svg>
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              className="theme-toggle-icon"
              initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {/* Sun with animated rays */}
              <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
                <circle cx="10" cy="10" r="5" fill="oklch(0.85 0.18 70)" />
                <g className="sun-rays" stroke="oklch(0.85 0.18 70)" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="10" y1="1" x2="10" y2="3" />
                  <line x1="10" y1="17" x2="10" y2="19" />
                  <line x1="1" y1="10" x2="3" y2="10" />
                  <line x1="17" y1="10" x2="19" y2="10" />
                  <line x1="3.5" y1="3.5" x2="5" y2="5" />
                  <line x1="15" y1="15" x2="16.5" y2="16.5" />
                  <line x1="3.5" y1="16.5" x2="5" y2="15" />
                  <line x1="15" y1="5" x2="16.5" y2="3.5" />
                </g>
              </svg>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
});

ThemeToggle.displayName = "ThemeToggle";
