"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Icon, InlineSpinner } from "@/components/shared";
import type { UndoToastProps } from "@/types/undo";

const toastVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 20, scale: 0.95 },
};

/**
 * The offer to take back an instant win on a rotation court: an ink bar
 * with the saved result in white, a green Undo, and a white X. It floats at
 * the foot of the screen, above the tab bar where there is one. It renders
 * outside the page, on <body>, so it sets the body font itself.
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
        <div className="ink-bar lift flex items-center gap-2 rounded-card py-1.5 pr-1.5 pl-4">
          <Icon id="check" size={18} className="shrink-0" />

          <span className="min-w-0 flex-1 truncate text-label font-medium">
            {entry.description}
          </span>

          <button
            type="button"
            onClick={handleUndo}
            onKeyDown={handleKeyDown}
            disabled={isUndoing}
            // The green button at the toast's 44px, not the main button's 52px.
            className="btn btn-action min-h-11 shrink-0 px-4 text-label"
            aria-label={`Undo action${additionalUndos > 0 ? `, ${additionalUndos} more available` : ""}`}
            tabIndex={0}
          >
            {isUndoing && <InlineSpinner />}
            <span>{undoButtonText}</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
            aria-label="Dismiss notification and clear undo history"
            tabIndex={0}
          >
            <Icon id="close" size={20} />
          </button>
        </div>
      </motion.div>
    );
  }
);

UndoToast.displayName = "UndoToast";
