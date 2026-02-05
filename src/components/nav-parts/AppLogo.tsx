"use client";

import { memo } from "react";
import { Trophy } from "lucide-react";

interface AppLogoProps {
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

export const AppLogo = memo(function AppLogo({
  size = "md",
  showText = false,
  className = "",
}: AppLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-linear-to-br from-primary via-primary/90 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30`}
      >
        <Trophy className={`${iconSizes[size]} text-primary-foreground`} />
      </div>
      {showText && (
        <span className="text-sm font-bold tracking-tight">
          Tournament<span className="text-primary">Tracker</span>
        </span>
      )}
    </div>
  );
});
