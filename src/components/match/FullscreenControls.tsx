"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/shared/Icon";

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
 * It floats over the panels, so it takes the lift. The bar is a white pill
 * 6px larger all round than the pill buttons inside it. End is the green
 * button, held to the 44px of the two beside it.
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
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 lift rounded-pill bg-surface p-1.5"
        >
          {canScore && (
            <>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Undo the last point"
                className="btn btn-fill min-w-11 px-3"
              >
                <Icon id="undo" size={16} />
                <span className="hidden sm:inline">Undo</span>
              </button>
              <button
                type="button"
                onClick={onOpenCompleteDialog}
                disabled={!canComplete}
                className="btn btn-action min-h-11 px-4 text-label"
              >
                <Icon id="flag" size={16} />
                {endLabel}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit fullscreen"
            className="btn btn-fill min-w-11 px-3"
          >
            <Icon id="minimize" size={16} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
