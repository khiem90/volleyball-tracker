"use client";

import { useEffect, useRef, useState } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";

/** Copies a link to the clipboard and says so for a moment. */
const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy the link:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className="mb-btn mb-btn-outline-navy shrink-0"
    >
      <MbIcon id={copied ? "check" : "clipboard"} size={14} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

/**
 * A link in a read-only field with a Copy button. Tapping the field
 * selects the whole link, for a phone whose clipboard needs a long press.
 */
export const LinkField = ({ id, value, label }: { id: string; value: string; label: string }) => (
  <div className="flex gap-2">
    <span className="mb-input min-w-0 flex-1">
      <input
        id={id}
        type="text"
        readOnly
        value={value}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        className="truncate"
      />
    </span>
    <CopyButton value={value} label={`Copy the ${label}`} />
  </div>
);
