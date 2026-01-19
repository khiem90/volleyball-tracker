"use client";

import { memo } from "react";

interface EmptyCompetitionsProps {
  className?: string;
}

export const EmptyCompetitions = memo(({ className }: EmptyCompetitionsProps) => (
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

    {/* Trophy base */}
    <path
      d="M90 165 L150 165 L145 175 L95 175 Z"
      className="fill-primary/30"
    />
    <rect
      x="105"
      y="145"
      width="30"
      height="20"
      rx="2"
      className="fill-primary/30"
    />

    {/* Trophy cup */}
    <path
      d="M70 50 L75 120 C75 135 95 145 120 145 C145 145 165 135 165 120 L170 50 Z"
      className="fill-primary/40"
    />

    {/* Trophy inner shine */}
    <path
      d="M85 55 L88 110 C88 120 100 128 115 128 C115 128 95 125 95 110 L92 55 Z"
      className="fill-white/20"
    />

    {/* Trophy handles */}
    <path
      d="M70 55 C50 55 45 75 50 90 C55 105 65 110 75 105"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinecap="round"
      className="stroke-primary/40"
      fill="none"
    />
    <path
      d="M170 55 C190 55 195 75 190 90 C185 105 175 110 165 105"
      stroke="currentColor"
      strokeWidth="8"
      strokeLinecap="round"
      className="stroke-primary/40"
      fill="none"
    />

    {/* Trophy rim */}
    <ellipse
      cx="120"
      cy="50"
      rx="50"
      ry="10"
      className="fill-primary/50"
    />

    {/* Star on trophy */}
    <path
      d="M120 70 L124 82 L137 82 L127 90 L131 102 L120 95 L109 102 L113 90 L103 82 L116 82 Z"
      className="fill-white/40"
    />

    {/* Sparkle decorations */}
    <g className="fill-primary">
      {/* Top left sparkle */}
      <path d="M45 35 L48 42 L55 45 L48 48 L45 55 L42 48 L35 45 L42 42 Z" />
      {/* Top right sparkle */}
      <path d="M195 30 L197 35 L202 37 L197 39 L195 44 L193 39 L188 37 L193 35 Z" />
      {/* Small dots */}
      <circle cx="30" cy="80" r="3" className="fill-primary/30" />
      <circle cx="210" cy="70" r="2" className="fill-primary/30" />
      <circle cx="55" cy="130" r="2" className="fill-primary/20" />
      <circle cx="185" cy="140" r="3" className="fill-primary/20" />
    </g>
  </svg>
));

EmptyCompetitions.displayName = "EmptyCompetitions";
