"use client";

import { memo } from "react";
import { motion, type Variants, type Transition } from "framer-motion";

// ============================================
// PERFORMANCE NOTE:
// Use CSS animations (animate-fade-in, etc.) for simple effects.
// Reserve framer-motion for:
// - Complex sequential animations
// - Layout animations (layoutId)
// - Score flip animations
// - Interactive gestures
// ============================================

// ============================================
// ANIMATION VARIANTS (Simplified for performance)
// ============================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.25 }
  },
};

// Number flip animation for scores - keep this one complex
export const numberFlip: Variants = {
  initial: { opacity: 0, y: 15, scale: 0.9 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  },
  exit: { 
    opacity: 0, 
    y: -15, 
    scale: 0.9,
    transition: { duration: 0.1 }
  }
};

// Simplified card hover - use CSS .glass-card-hover instead when possible
export const cardHover: Variants = {
  rest: { y: 0 },
  hover: { 
    y: -3,
    transition: { duration: 0.15 }
  },
  tap: { scale: 0.98 }
};

// Spring transitions
export const springSmooth: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30
};

// ============================================
// MOTION COMPONENTS (use sparingly)
// ============================================

export const MotionDiv = motion.div;
export const MotionSpan = motion.span;
export const MotionButton = motion.button;

// ============================================
// SIMPLE PAGE WRAPPER (CSS-based fade)
// Prefer using CSS animate-fade-in class directly
// ============================================

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition = memo(({ children, className }: PageTransitionProps) => {
  return (
    <div className={`animate-fade-in ${className || ""}`}>
      {children}
    </div>
  );
});
PageTransition.displayName = "PageTransition";

// ============================================
// STAGGER CONTAINER - Use CSS animation delays instead
// This is a lighter alternative to framer-motion stagger
// ============================================

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerContainer = memo(({ children, className }: StaggerContainerProps) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
});
StaggerContainer.displayName = "StaggerContainer";

// ============================================
// STAGGER ITEM - Simple wrapper
// ============================================

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerItem = memo(({ children, className }: StaggerItemProps) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
});
StaggerItem.displayName = "StaggerItem";

// ============================================
// ANIMATED SCORE NUMBER - Keep framer-motion for this
// ============================================

interface AnimatedScoreProps {
  score: number;
  className?: string;
}

export const AnimatedScore = memo(({ score, className }: AnimatedScoreProps) => {
  return (
    <motion.span
      key={score}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={numberFlip}
      className={className}
    >
      {score}
    </motion.span>
  );
});
AnimatedScore.displayName = "AnimatedScore";

// ============================================
// LIVE PULSE - Use CSS animation instead
// ============================================

interface LivePulseProps {
  className?: string;
}

export const LivePulse = memo(({ className }: LivePulseProps) => {
  return (
    <span className={`live-dot ${className || ""}`} />
  );
});
LivePulse.displayName = "LivePulse";
