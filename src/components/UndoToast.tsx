"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Check, X, Undo2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UndoToastProps } from "@/types/undo";

const toastVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 20, scale: 0.95 },
};

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
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
        role="alert"
        aria-live="polite"
      >
        <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-lg">
          {/* Content */}
          <div className="flex items-center gap-3 p-3">
            {/* Check icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>

            {/* Description */}
            <span className="flex-1 text-sm font-medium text-foreground truncate">
              {entry.description}
            </span>

            {/* Undo button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              onKeyDown={handleKeyDown}
              disabled={isUndoing}
              className="flex-shrink-0 gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
              aria-label={`Undo action${additionalUndos > 0 ? `, ${additionalUndos} more available` : ""}`}
              tabIndex={0}
            >
              {isUndoing ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Undo2 className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{undoButtonText}</span>
            </Button>

            {/* Dismiss button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss notification and clear undo history"
              tabIndex={0}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }
);

UndoToast.displayName = "UndoToast";
