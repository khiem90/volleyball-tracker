"use client";

import { memo } from "react";

export const CourtSvgDefs = memo(function CourtSvgDefs() {
  return (
    <defs>
      {/* Court gradient */}
      <linearGradient
        id="editorCourtGradient"
        x1="0%"
        y1="0%"
        x2="0%"
        y2="100%"
      >
        <stop offset="0%" stopColor="oklch(0.55 0.12 145 / 0.25)" />
        <stop offset="100%" stopColor="oklch(0.55 0.12 145 / 0.10)" />
      </linearGradient>

      {/* Arrow marker */}
      <marker
        id="editorArrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          className="fill-primary/70"
        />
      </marker>

      {/* Glow filter for selected elements */}
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Grid pattern */}
      <pattern
        id="editorGrid"
        width="40"
        height="30"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 40 0 L 0 0 0 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-foreground/5"
        />
      </pattern>
    </defs>
  );
});
