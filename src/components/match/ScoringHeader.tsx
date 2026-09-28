"use client";

import Link from "next/link";
import { ChevronLeft, Flag, Maximize2, Undo2 } from "lucide-react";
import { statusLabel, type SeriesInfo } from "@/lib/scoring";
import type { MatchStatus } from "@/types/game";

const STATUS_COLOR: Record<MatchStatus, string> = {
  in_progress: "var(--mb-red)",
  completed: "var(--mb-green)",
  pending: "var(--mb-ink-muted)",
};

type ScoringHeaderProps = {
  backHref: string;
  backLabel: string;
  status: MatchStatus;
  series: SeriesInfo;
  homeName: string;
  awayName: string;
  /** A word beside the status, such as Guest. */
  tag?: string;
  /** Hidden where the device has no fullscreen API, so nobody taps a button that does nothing. */
  fullscreenSupported: boolean;
  canScore: boolean;
  canUndo: boolean;
  canComplete: boolean;
  endLabel: string;
  onFullscreen: () => void;
  onUndo: () => void;
  onOpenCompleteDialog: () => void;
};

/**
 * The scoring page's top bar: Back, the match's status, and the controls a
 * scorer needs. Every control is at least 44px tall. It pads for the status
 * bar and, in landscape, for the notch.
 */
export const ScoringHeader = ({
  backHref,
  backLabel,
  status,
  series,
  homeName,
  awayName,
  tag,
  fullscreenSupported,
  canScore,
  canUndo,
  canComplete,
  endLabel,
  onFullscreen,
  onUndo,
  onOpenCompleteDialog,
}: ScoringHeaderProps) => {
  const color = STATUS_COLOR[status];
  return (
  <header className="z-20 border-b border-mb-rule bg-mb-paper-bright pt-[env(safe-area-inset-top)] pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))]">
    <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 py-2">
      <Link
        href={backHref}
        aria-label={`Back to ${backLabel}`}
        className="mb-btn mb-btn-outline-navy min-w-11 shrink-0 px-2.5 sm:px-3"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
        <span className="hidden sm:inline">{backLabel}</span>
      </Link>

      <div className="min-w-0 text-center">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span
            className="matchbook-display inline-flex items-center gap-1.5 border-[2px] px-2 py-1 text-[0.7rem] font-bold leading-none tracking-[0.14em]"
            style={{ borderColor: color, color }}
          >
            {status === "in_progress" && <span className="mb-live-dot" aria-hidden />}
            {statusLabel({ status })}
          </span>
          {tag && (
            <span className="matchbook-display border-[2px] border-mb-gold px-2 py-1 text-[0.7rem] font-bold leading-none tracking-[0.14em] text-mb-gold">
              {tag}
            </span>
          )}
        </div>
        {series.isSeries && (
          <p className="mb-kicker mt-1 truncate">
            Best of {series.seriesLength} · Game {series.gameNumber} · {homeName} {series.homeWins}
            –{series.awayWins} {awayName}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {fullscreenSupported && (
          <button
            type="button"
            onClick={onFullscreen}
            aria-label="Fullscreen"
            className="mb-btn mb-btn-outline-navy min-w-11 px-2.5"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        )}
        {canScore && (
          <>
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo the last point"
              className="mb-btn mb-btn-outline-navy min-w-11 px-2.5 sm:px-3"
            >
              <Undo2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={onOpenCompleteDialog}
              disabled={!canComplete}
              aria-label={endLabel}
              className="mb-btn mb-btn-coral px-3"
            >
              <Flag className="h-4 w-4" aria-hidden />
              <span className="sm:hidden">End</span>
              <span className="hidden sm:inline">{endLabel}</span>
            </button>
          </>
        )}
      </div>
    </div>
  </header>
  );
};
