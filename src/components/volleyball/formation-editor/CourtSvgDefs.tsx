"use client";

import { memo } from "react";

export const CourtSvgDefs = memo(function CourtSvgDefs() {
  return (
    <defs>
      {/* Arrow marker */}
      <marker
        id="editorArrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" className="fill-ink-soft" />
      </marker>

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
          className="text-ink/15"
        />
      </pattern>
    </defs>
  );
});
