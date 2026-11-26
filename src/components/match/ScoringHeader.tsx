"use client";

import Link from "next/link";
import { Chip } from "@/components/shared/Chip";
import { Icon } from "@/components/shared/Icon";
import { statusLabel, type SeriesInfo } from "@/lib/scoring";
import type { MatchStatus } from "@/types/game";

/* The bar's grey button. Holding a glyph alone, it is a 44px circle. */
const BAR_BUTTON = "btn btn-fill min-w-11 shrink-0 px-2.5";

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
 * scorer needs. It is a white surface, which gives the grey buttons their
 * edge. Ending the game is the bar's one green button, held to the 44px of
 * the buttons beside it. It pads for the status bar and, in landscape, for
 * the notch.
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
}: ScoringHeaderProps) => (
  <header className="z-20 border-b border-line bg-surface pt-[env(safe-area-inset-top)] pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(0.75rem,env(safe-area-inset-left))]">
    <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 py-2">
      <Link
        href={backHref}
        aria-label={`Back to ${backLabel}`}
        className={`${BAR_BUTTON} sm:px-3`}
      >
        <Icon id="chevron-left" size={20} />
        <span className="hidden sm:inline">{backLabel}</span>
      </Link>

      <div className="min-w-0 text-center">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {/* Green with the live dot while the match is played, grey before and after. */}
          <Chip live={status === "in_progress"}>{statusLabel({ status })}</Chip>
          {tag && <Chip>{tag}</Chip>}
        </div>
        {series.isSeries && (
          <p className="mt-1 truncate text-caption font-medium text-ink-soft">
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
            className={BAR_BUTTON}
          >
            <Icon id="maximize" size={16} />
          </button>
        )}
        {canScore && (
          <>
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo the last point"
              className={`${BAR_BUTTON} sm:px-3`}
            >
              <Icon id="undo" size={16} />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={onOpenCompleteDialog}
              disabled={!canComplete}
              aria-label={endLabel}
              className="btn btn-action min-h-11 px-3 text-label"
            >
              <Icon id="flag" size={16} />
              <span className="sm:hidden">End</span>
              <span className="hidden sm:inline">{endLabel}</span>
            </button>
          </>
        )}
      </div>
    </div>
  </header>
);
