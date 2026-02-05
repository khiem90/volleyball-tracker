"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowUturnLeftIcon,
  CheckIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline";

type FullscreenControlsProps = {
  isFullscreen: boolean;
  canEdit?: boolean;
  canComplete?: boolean;
  historyLength: number;
  endLabel: string;
  onUndo: () => void;
  onOpenCompleteDialog: () => void;
  onFullscreenToggle: () => void;
};

export const FullscreenControls = memo(function FullscreenControls({
  isFullscreen,
  canEdit,
  canComplete,
  historyLength,
  endLabel,
  onUndo,
  onOpenCompleteDialog,
  onFullscreenToggle,
}: FullscreenControlsProps) {
  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 glass-nav rounded-full px-4 py-2"
        >
          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={historyLength < 2}
                className="gap-2 rounded-full"
              >
                <ArrowUturnLeftIcon className="w-4 h-4" />
                Undo
              </Button>
              <div className="w-px h-6 bg-border/30" />
              <Button
                size="sm"
                onClick={onOpenCompleteDialog}
                disabled={!canComplete}
                className="gap-2 rounded-full btn-teal-gradient"
              >
                <CheckIcon className="w-4 h-4" />
                {endLabel}
              </Button>
              <div className="w-px h-6 bg-border/30" />
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreenToggle}
            className="gap-2 rounded-full"
            title="Exit fullscreen"
          >
            <ArrowsPointingInIcon className="w-4 h-4" />
            Exit
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
