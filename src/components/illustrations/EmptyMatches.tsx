"use client";

import { memo } from "react";

interface EmptyMatchesProps {
  className?: string;
}

export const EmptyMatches = memo(({ className }: EmptyMatchesProps) => (
  <svg
    viewBox="0 0 240 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Background blob */}
    <ellipse
      cx="120"
      cy="170"
      rx="100"
      ry="18"
      className="fill-primary/5"
    />

    {/* Left team badge */}
    <g>
      {/* Shield shape */}
      <path
        d="M30 50 L80 50 L80 100 C80 130 55 145 55 145 C55 145 30 130 30 100 Z"
        className="fill-primary/25"
      />
      {/* Shield highlight */}
      <path
        d="M35 55 L55 55 L55 95 C55 115 45 125 45 125 C45 125 35 115 35 95 Z"
        className="fill-white/20"
      />
      {/* Team symbol - circle */}
      <circle cx="55" cy="85" r="15" className="fill-primary/40" />
    </g>

    {/* VS text */}
    <g className="fill-primary">
      <text
        x="120"
        y="105"
        textAnchor="middle"
        fontSize="28"
        fontWeight="bold"
        className="fill-primary/60"
      >
        VS
      </text>
    </g>

    {/* Right team badge */}
    <g>
      {/* Shield shape */}
      <path
        d="M160 50 L210 50 L210 100 C210 130 185 145 185 145 C185 145 160 130 160 100 Z"
        className="fill-primary/25"
      />
      {/* Shield highlight */}
      <path
        d="M165 55 L185 55 L185 95 C185 115 175 125 175 125 C175 125 165 115 165 95 Z"
        className="fill-white/20"
      />
      {/* Team symbol - square */}
      <rect x="172" y="72" width="26" height="26" rx="4" className="fill-primary/40" />
    </g>

    {/* Connecting line */}
    <path
      d="M85 95 Q 120 70 155 95"
      stroke="currentColor"
      strokeWidth="2"
      strokeDasharray="6 4"
      className="stroke-primary/30"
      fill="none"
    />

    {/* Action lines / energy */}
    <g className="stroke-primary/20" strokeWidth="2" strokeLinecap="round">
      <line x1="100" y1="50" x2="95" y2="40" />
      <line x1="120" y1="45" x2="120" y2="35" />
      <line x1="140" y1="50" x2="145" y2="40" />
    </g>

    {/* Sparkle decorations */}
    <g className="fill-primary/30">
      <circle cx="25" cy="35" r="3" />
      <circle cx="215" cy="40" r="2" />
      <circle cx="50" cy="160" r="2" />
      <circle cx="190" cy="165" r="3" />
    </g>
  </svg>
));

EmptyMatches.displayName = "EmptyMatches";
