"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MbIcon } from "@/components/matchbook/MbIcon";

type FullscreenControlsProps = {
  isFullscreen: boolean;
  canScore: boolean;
  canUndo: boolean;
  canComplete: boolean;
  endLabel: string;
  onUndo: () => void;
  onOpenCompleteDialog: () => void;
  onExit: () => void;
};

/**
 * The floating bar that replaces the header in fullscreen: Undo and End
 * for a scorer, and Exit for everyone. It sits above the home indicator.
 * The bar is framed like a matchbook panel: 4px corners and the panel shadow.
 */
export const FullscreenControls = memo(function FullscreenControls({
  isFullscreen,
  canScore,
  canUndo,
  canComplete,
  endLabel,
  onUndo,
  onOpenCompleteDialog,
  onExit,
}: FullscreenControlsProps) {
  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-[4px] border-[1.5px] border-mb-navy bg-mb-paper-bright p-1.5 mb-shadow-panel"
        >
          {canScore && (
            <>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Undo the last point"
                className="mb-btn mb-btn-outline-navy min-w-11 px-3"
              >
                <MbIcon id="undo" size={16} />
                <span className="hidden sm:inline">Undo</span>
              </button>
              <button
                type="button"
                onClick={onOpenCompleteDialog}
                disabled={!canComplete}
                className="mb-btn mb-btn-coral px-4"
              >
                <MbIcon id="flag" size={16} />
                {endLabel}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit fullscreen"
            className="mb-btn mb-btn-outline-navy min-w-11 px-3"
          >
            <MbIcon id="minimize" size={16} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
