"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const DEFAULT_TEAM_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  className?: string;
  size?: "sm" | "default" | "lg";
}

export const ColorPicker = ({
  value,
  onChange,
  colors = DEFAULT_TEAM_COLORS,
  className,
  size = "default",
}: ColorPickerProps) => {
  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg",
    default: "w-10 h-10 rounded-xl",
    lg: "w-12 h-12 rounded-xl",
  };

  const checkSizeClasses = {
    sm: "w-4 h-4",
    default: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup" aria-label="Color selection">
      {colors.map((color) => {
        const isSelected = value === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(color)}
            className={cn(
              sizeClasses[size],
              "transition-all duration-200 relative cursor-pointer",
              "hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSelected && "ring-2 ring-offset-2 ring-offset-background ring-white scale-110"
            )}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          >
            {isSelected && (
              <Check
                className={cn(
                  checkSizeClasses[size],
                  "text-white absolute inset-0 m-auto drop-shadow-md"
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
