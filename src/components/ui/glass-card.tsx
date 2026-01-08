"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// GLASS CARD VARIANTS
// ============================================

const glassVariants = {
  default: "glass-card",
  nav: "glass-nav",
  subtle: "bg-card/40 backdrop-blur-md border border-border/30",
  solid: "bg-card border border-border/50",
} as const;

type GlassVariant = keyof typeof glassVariants;

// ============================================
// GLASS CARD COMPONENT (Optimized - CSS only)
// ============================================

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  hover?: boolean;
  glow?: boolean;
}

const GlassCard = React.memo(
  React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, variant = "default", hover = true, glow = false, children, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-2xl overflow-hidden",
            glassVariants[variant],
            hover && "glass-card-hover cursor-pointer",
            glow && "glow-primary",
            className
          )}
          {...props}
        >
          {children}
        </div>
      );
    }
  )
);
GlassCard.displayName = "GlassCard";

// ============================================
// GLASS CARD HEADER
// ============================================

const GlassCardHeader = React.memo(
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn("flex flex-col space-y-1.5 p-5", className)}
          {...props}
        />
      );
    }
  )
);
GlassCardHeader.displayName = "GlassCardHeader";

// ============================================
// GLASS CARD TITLE
// ============================================

const GlassCardTitle = React.memo(
  React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => {
      return (
        <h3
          ref={ref}
          className={cn("text-lg font-semibold leading-none tracking-tight", className)}
          {...props}
        />
      );
    }
  )
);
GlassCardTitle.displayName = "GlassCardTitle";

// ============================================
// GLASS CARD DESCRIPTION
// ============================================

const GlassCardDescription = React.memo(
  React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => {
      return (
        <p
          ref={ref}
          className={cn("text-sm text-muted-foreground", className)}
          {...props}
        />
      );
    }
  )
);
GlassCardDescription.displayName = "GlassCardDescription";

// ============================================
// GLASS CARD CONTENT
// ============================================

const GlassCardContent = React.memo(
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn("p-5 pt-0", className)}
          {...props}
        />
      );
    }
  )
);
GlassCardContent.displayName = "GlassCardContent";

// ============================================
// GLASS CARD FOOTER
// ============================================

const GlassCardFooter = React.memo(
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn("flex items-center p-5 pt-0", className)}
          {...props}
        />
      );
    }
  )
);
GlassCardFooter.displayName = "GlassCardFooter";

// ============================================
// STAT CARD (SPECIAL GLASS CARD FOR STATS)
// ============================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconColor?: string;
  className?: string;
}

const StatCard = React.memo(({ icon, label, value, iconColor = "text-primary", className }: StatCardProps) => {
  return (
    <GlassCard hover={false} className={cn("overflow-hidden", className)}>
      <div className="p-4 relative">
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("w-4 h-4", iconColor)}>{icon}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
          </div>
          <div className="text-3xl font-bold text-foreground">{value}</div>
        </div>
      </div>
    </GlassCard>
  );
});
StatCard.displayName = "StatCard";

// ============================================
// EXPORTS
// ============================================

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
  StatCard,
};
