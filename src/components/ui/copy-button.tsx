"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "./button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  className?: string;
  resetDelay?: number;
  variant?: "outline" | "ghost" | "default";
  size?: "default" | "sm" | "icon" | "icon-sm";
  disabled?: boolean;
  "aria-label"?: string;
}

export const CopyButton = ({
  value,
  className,
  resetDelay = 2000,
  variant = "outline",
  size = "icon",
  disabled,
  "aria-label": ariaLabel = "Copy to clipboard",
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = useCallback(async () => {
    if (!value || disabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), resetDelay);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [value, resetDelay, disabled]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={disabled}
      className={cn("shrink-0 cursor-pointer", className)}
      aria-label={copied ? "Copied!" : ariaLabel}
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );
};
