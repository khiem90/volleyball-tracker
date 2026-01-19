"use client";

import { memo } from "react";

interface EmptyTeamsProps {
  className?: string;
}

export const EmptyTeams = memo(({ className }: EmptyTeamsProps) => (
  <svg
    viewBox="0 0 240 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Background blob */}
    <ellipse
      cx="120"
      cy="160"
      rx="100"
      ry="20"
      className="fill-primary/5"
    />

    {/* Left person silhouette */}
    <g className="fill-primary/20">
      {/* Head */}
      <circle cx="60" cy="70" r="22" />
      {/* Body */}
      <path d="M35 100 C35 95 45 92 60 92 C75 92 85 95 85 100 L85 140 C85 145 75 150 60 150 C45 150 35 145 35 140 Z" />
    </g>

    {/* Center person silhouette (main) */}
    <g className="fill-primary/40">
      {/* Head */}
      <circle cx="120" cy="55" r="28" />
      {/* Body */}
      <path d="M88 90 C88 84 100 80 120 80 C140 80 152 84 152 90 L152 145 C152 152 140 158 120 158 C100 158 88 152 88 145 Z" />
    </g>

    {/* Right person silhouette */}
    <g className="fill-primary/20">
      {/* Head */}
      <circle cx="180" cy="70" r="22" />
      {/* Body */}
      <path d="M155 100 C155 95 165 92 180 92 C195 92 205 95 205 100 L205 140 C205 145 195 150 180 150 C165 150 155 145 155 140 Z" />
    </g>

    {/* Plus icon */}
    <g className="fill-primary">
      <circle cx="180" cy="130" r="18" className="fill-primary/90" />
      <rect x="173" y="123" width="14" height="4" rx="2" className="fill-white" />
      <rect x="176" y="116" width="8" height="28" rx="2" className="fill-white" transform="rotate(90 180 130)" />
    </g>

    {/* Sparkle decorations */}
    <g className="fill-primary/30">
      <circle cx="45" cy="45" r="3" />
      <circle cx="195" cy="40" r="2" />
      <circle cx="30" cy="120" r="2" />
      <circle cx="210" cy="100" r="3" />
    </g>
  </svg>
));

EmptyTeams.displayName = "EmptyTeams";
