"use client";

import { memo } from "react";

interface EmptyHistoryProps {
  className?: string;
}

export const EmptyHistory = memo(({ className }: EmptyHistoryProps) => (
  <svg
    viewBox="0 0 240 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Background blob */}
    <ellipse
      cx="120"
      cy="175"
      rx="90"
      ry="15"
      className="fill-primary/5"
    />

    {/* Clock face */}
    <circle
      cx="120"
      cy="90"
      r="60"
      className="fill-white stroke-primary/30"
      strokeWidth="4"
    />

    {/* Clock inner ring */}
    <circle
      cx="120"
      cy="90"
      r="50"
      className="fill-primary/5"
    />

    {/* Clock tick marks */}
    <g className="stroke-primary/40" strokeWidth="2" strokeLinecap="round">
      <line x1="120" y1="45" x2="120" y2="52" />
      <line x1="120" y1="128" x2="120" y2="135" />
      <line x1="75" y1="90" x2="82" y2="90" />
      <line x1="158" y1="90" x2="165" y2="90" />
    </g>

    {/* Clock hands */}
    <g className="stroke-primary" strokeWidth="4" strokeLinecap="round">
      {/* Hour hand */}
      <line x1="120" y1="90" x2="120" y2="60" />
      {/* Minute hand */}
      <line x1="120" y1="90" x2="145" y2="90" />
    </g>

    {/* Clock center dot */}
    <circle cx="120" cy="90" r="6" className="fill-primary" />

    {/* Timeline dots below */}
    <g>
      {/* Timeline line */}
      <line
        x1="50"
        y1="165"
        x2="190"
        y2="165"
        className="stroke-primary/20"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      {/* Timeline dots */}
      <circle cx="60" cy="165" r="5" className="fill-primary/20" />
      <circle cx="100" cy="165" r="5" className="fill-primary/30" />
      <circle cx="140" cy="165" r="5" className="fill-primary/40" />
      <circle cx="180" cy="165" r="6" className="fill-primary/50" />
    </g>

    {/* Curved arrow indicating history/past */}
    <path
      d="M55 75 C35 55 35 110 55 105"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className="stroke-primary/40"
      fill="none"
    />
    <path
      d="M55 105 L50 95 M55 105 L65 100"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className="stroke-primary/40"
      fill="none"
    />

    {/* Sparkle decorations */}
    <g className="fill-primary/30">
      <circle cx="185" cy="45" r="3" />
      <circle cx="200" cy="130" r="2" />
      <circle cx="40" cy="140" r="2" />
    </g>
  </svg>
));

EmptyHistory.displayName = "EmptyHistory";
