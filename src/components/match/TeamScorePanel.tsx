"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MinusIcon, PlusIcon, EyeIcon } from "@heroicons/react/24/outline";
import { CrownIcon } from "@/lib/icons";

type TeamScorePanelProps = {
  teamName: string;
  teamColor: string;
  score: number;
  isLeading: boolean;
  isFullscreen: boolean;
  canEdit: boolean;
  isSharedMode?: boolean;
  onAddPoint: () => void;
  onDeductPoint: () => void;
};

export const TeamScorePanel = memo(function TeamScorePanel({
  teamName,
  teamColor,
  score,
  isLeading,
  isFullscreen,
  canEdit,
  isSharedMode = false,
  onAddPoint,
  onDeductPoint,
}: TeamScorePanelProps) {
  return (
    <motion.div
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={canEdit ? onAddPoint : undefined}
      onKeyDown={
        canEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onAddPoint();
            }
          : undefined
      }
      whileTap={canEdit ? { scale: 0.99 } : undefined}
      className={`flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none focus:outline-none ${
        canEdit ? "cursor-pointer" : ""
      }`}
      style={{
        background: `linear-gradient(135deg, ${teamColor}, ${teamColor}bb)`,
      }}
      aria-label={
        canEdit
          ? `Add point to ${teamName}. Current score: ${score}`
          : `${teamName}: ${score}`
      }
    >
      {/* Decorative elements */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-white/10 to-transparent" />

      {/* View-only indicator */}
      {!canEdit && isSharedMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5"
        >
          <EyeIcon className="w-4 h-4 text-white/80" />
          <span className="text-xs font-medium text-white/80">View Only</span>
        </motion.div>
      )}

      {/* Leading indicator */}
      <AnimatePresence>
        {isLeading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-amber-500/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-amber-400/30"
          >
            <CrownIcon className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-semibold text-white">Leading</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Name */}
      <h2
        className={`text-white/90 font-semibold relative z-10 ${
          isFullscreen
            ? "text-2xl md:text-3xl mb-2"
            : "text-lg md:text-xl mb-4"
        }`}
      >
        {teamName}
      </h2>

      {/* Animated Score */}
      <div className="relative z-10">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={score}
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`text-white font-black leading-none tracking-tighter min-w-[1.5ch] text-center inline-block score-text ${
              isFullscreen
                ? "text-[10rem] md:text-[16rem] lg:text-[20rem]"
                : "text-[6rem] md:text-[12rem]"
            }`}
          >
            {score}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Controls */}
      {!isFullscreen &&
        (canEdit ? (
          <div className="flex items-center gap-4 mt-6 relative z-10">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeductPoint();
                }}
                aria-label={`Deduct point from ${teamName}`}
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
              >
                <MinusIcon className="w-5 h-5" />
              </Button>
            </motion.div>
            <span className="text-white/50 text-sm font-medium px-2">
              Tap to score
            </span>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddPoint();
                }}
                aria-label={`Add point to ${teamName}`}
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white"
              >
                <PlusIcon className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="mt-6 relative z-10">
            <span className="text-white/40 text-sm font-medium">
              Live Score
            </span>
          </div>
        ))}

      {isFullscreen && canEdit && (
        <span className="text-white/40 text-sm font-medium mt-4 relative z-10">
          Tap to score
        </span>
      )}
    </motion.div>
  );
});
