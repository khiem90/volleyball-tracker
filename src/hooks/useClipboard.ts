"use client";

import { useState, useCallback, useRef } from "react";

interface UseClipboardReturn {
  copied: boolean;
  copyToClipboard: (text: string) => Promise<boolean>;
}

export const useClipboard = (resetDelay: number = 2000): UseClipboardReturn => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        timeoutRef.current = setTimeout(() => setCopied(false), resetDelay);
        return true;
      } catch (err) {
        console.error("Failed to copy:", err);
        return false;
      }
    },
    [resetDelay]
  );

  return {
    copied,
    copyToClipboard,
  };
};
