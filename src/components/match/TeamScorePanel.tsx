"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Minus, Plus } from "lucide-react";
import type { Side } from "@/lib/scoring";

/** The badge over a team: it leads while the match is played, it won once the match is over. */
export type Crowned = "leading" | "winner" | null;

type TeamScorePanelProps = {
  side: Side;
  teamName: string;
  teamColor: string;
  score: number;
  crowned: Crowned;
  isFullscreen: boolean;
  /** Whether taps change the score. Off, the panel only shows it. */
  canScore: boolean;
  onAddPoint: () => void;
  onDeductPoint: () => void;
};

const BUTTON =
  "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-white/40 bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60";

/**
 * One team's half of the scoring page, full-bleed in the team's color. The
 * whole panel is one big button that adds a point, with a minus and a plus
 * under the score for a thumb that wants a smaller target. In landscape the
 * panel pads for the notch on its outer edge.
 */
export const TeamScorePanel = memo(function TeamScorePanel({
  side,
  teamName,
  teamColor,
  score,
  crowned,
  isFullscreen,
  canScore,
  onAddPoint,
  onDeductPoint,
}: TeamScorePanelProps) {
  const inset =
    side === "home"
      ? "landscape:pl-[max(0.75rem,env(safe-area-inset-left))]"
      : "landscape:pr-[max(0.75rem,env(safe-area-inset-right))]";

  return (
    <motion.section
      whileTap={canScore ? { scale: 0.99 } : undefined}
      aria-label={`${teamName}: ${score}`}
      className={`relative flex flex-1 select-none flex-col items-center justify-center overflow-hidden p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] landscape:p-3 landscape:pb-[max(0.75rem,env(safe-area-inset-bottom))] ${inset}`}
      style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}bb)` }}
    >
      {/* Decorative light */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 to-transparent" />

      {canScore && (
        <button
          type="button"
          onClick={onAddPoint}
          aria-label={`Add a point to ${teamName}`}
          className="absolute inset-0 z-0 h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/60"
        />
      )}

      {/* Everything above the big button lets taps through except the small buttons. */}
      <div className="pointer-events-none relative z-10 flex flex-col items-center">
        <AnimatePresence>
          {crowned && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              className="mb-2 flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/30 px-3 py-1 backdrop-blur-sm landscape:mb-1"
            >
              <Crown className="h-4 w-4 text-amber-200" aria-hidden />
              <span className="matchbook-display text-[0.7rem] font-bold tracking-[0.12em] text-white">
                {crowned === "winner" ? "Winner" : "Leading"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <h2
          className={`matchbook-display max-w-full px-2 text-center font-bold text-white/90 [overflow-wrap:anywhere] ${
            isFullscreen ? "mb-1 text-2xl md:text-3xl" : "mb-2 text-lg md:text-xl landscape:mb-1"
          }`}
        >
          {teamName}
        </h2>

        <AnimatePresence mode="popLayout">
          <motion.span
            key={score}
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`score-text inline-block min-w-[1.5ch] text-center font-black leading-none tracking-tighter text-white ${
              isFullscreen
                ? "text-[clamp(6rem,40vmin,20rem)]"
                : "text-[clamp(4.5rem,24vmin,12rem)]"
            }`}
          >
            {score}
          </motion.span>
        </AnimatePresence>

        {canScore && !isFullscreen && (
          <div className="mt-5 flex items-center gap-5 landscape:mt-2">
            <button
              type="button"
              onClick={onDeductPoint}
              aria-label={`Take a point from ${teamName}`}
              className={BUTTON}
            >
              <Minus className="h-6 w-6" aria-hidden />
            </button>
            <span className="matchbook-display text-[0.7rem] font-semibold tracking-[0.12em] text-white/60">
              Tap to score
            </span>
            <button
              type="button"
              onClick={onAddPoint}
              aria-label={`Add a point to ${teamName}`}
              className={BUTTON}
            >
              <Plus className="h-6 w-6" aria-hidden />
            </button>
          </div>
        )}

        {canScore && isFullscreen && (
          <span className="matchbook-display mt-3 text-[0.7rem] font-semibold tracking-[0.12em] text-white/60">
            Tap to score
          </span>
        )}
      </div>
    </motion.section>
  );
});
