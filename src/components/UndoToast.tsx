"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { InlineSpinner } from "@/components/shared";
import type { UndoToastProps } from "@/types/undo";

const toastVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 20, scale: 0.95 },
};

/**
 * The offer to take back an instant win on a rotation court: a navy bar in
 * the shape of the reload banner, with the saved result in paper, a coral
 * Undo, and a paper X. It renders outside .matchbook-surface, so it carries
 * the body font itself.
 */
export const UndoToast = memo(
  ({
    entry,
    additionalUndos,
    onUndo,
    onDismiss,
    isUndoing = false,
  }: UndoToastProps) => {
    if (!entry) return null;

    const handleUndo = () => {
      if (!isUndoing) {
        onUndo();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleUndo();
      }
    };

    // Show "Undo (N more)" when there are additional undos available
    const undoButtonText =
      additionalUndos > 0 ? `Undo (${additionalUndos} more)` : "Undo";

    return (
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={toastVariants}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        // Above the tab bar where there is one, and the home indicator always.
        className="fixed bottom-[calc(var(--tab-bar-space)+env(safe-area-inset-bottom)+1rem)] left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 font-sans"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 rounded-[4px] border-[1.5px] border-mb-navy bg-mb-navy py-1 pr-1 pl-3 text-mb-paper-bright shadow-[0_8px_22px_rgba(57,41,23,0.08)]">
          <MbIcon id="check" size={18} className="shrink-0" />

          <span className="min-w-0 flex-1 truncate text-[0.85rem] font-medium">
            {entry.description}
          </span>

          <button
            type="button"
            onClick={handleUndo}
            onKeyDown={handleKeyDown}
            disabled={isUndoing}
            className="mb-btn mb-btn-coral shrink-0 px-4"
            aria-label={`Undo action${additionalUndos > 0 ? `, ${additionalUndos} more available` : ""}`}
            tabIndex={0}
          >
            {isUndoing && <InlineSpinner />}
            <span>{undoButtonText}</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-mb-paper-bright transition-colors hover:bg-white/10"
            aria-label="Dismiss notification and clear undo history"
            tabIndex={0}
          >
            <MbIcon id="close" size={18} />
          </button>
        </div>
      </motion.div>
    );
  }
);

UndoToast.displayName = "UndoToast";
