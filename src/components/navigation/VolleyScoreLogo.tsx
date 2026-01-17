"use client";

import { memo } from "react";

interface VolleyScoreLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-10 h-10",
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-5 h-5",
};

export const VolleyScoreLogo = memo(function VolleyScoreLogo({
  size = "md",
  showText = false,
  className = "",
}: VolleyScoreLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-linear-to-br from-primary via-primary/90 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`${iconSizes[size]} text-primary-foreground`}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3c0 9 9 9 9 9" strokeWidth="1.5" />
          <path d="M12 3c0 9-9 9-9 9" strokeWidth="1.5" />
          <path d="M3 12c9 0 9 9 9 9" strokeWidth="1.5" />
        </svg>
      </div>
      {showText && (
        <span className="text-sm font-bold tracking-tight">
          Volley<span className="text-primary">Score</span>
        </span>
      )}
    </div>
  );
});
