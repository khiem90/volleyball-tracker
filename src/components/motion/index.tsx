"use client";

import { motion, type Variants } from "framer-motion";

// ============================================
// ANIMATION VARIANTS
// ============================================

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
};

// ============================================
// MOTION COMPONENTS (use sparingly)
// ============================================

export const MotionDiv = motion.div;
