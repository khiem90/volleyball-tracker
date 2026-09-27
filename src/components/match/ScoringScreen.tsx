"use client";

import type { ReactNode } from "react";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  canComplete as resultCanBeConfirmed,
  keepsScreenAwake,
  type ScoringAccess,
  type SeriesInfo,
  type Side,
} from "@/lib/scoring";
import type { MatchStatus } from "@/types/game";
import { FullscreenControls } from "./FullscreenControls";
import { MatchCompleteDialog } from "./MatchCompleteDialog";
import { ScoringHeader } from "./ScoringHeader";
import { TeamScorePanel, type Crowned } from "./TeamScorePanel";

export interface ScoringSide {
  name: string;
  /** The team's color; a team without one gets the side's stock color. */
  color?: string;
  score: number;
}

const STOCK_COLOR: Record<Side, string> = { home: "#3b82f6", away: "#f97316" };

export interface CompleteDialogState {
  open: boolean;
  isBusy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export interface ScoringScreenProps {
  home: ScoringSide;
  away: ScoringSide;
  status: MatchStatus;
  series: SeriesInfo;
  /** Who won, once the match is over. */
  winner: Side | null;
  access: ScoringAccess;
  /** Why taps do nothing, shown under the header. */
  notice: string | null;
  /** A button beside the notice, such as the guest's Play again. */
  noticeAction?: { label: string; onClick: () => void };
  backHref: string;
  backLabel: string;
  /** A word beside the status, such as Guest. */
  tag?: string;
  canUndo: boolean;
  onAddPoint: (side: Side) => void;
  onDeductPoint: (side: Side) => void;
  onUndo: () => void;
  onOpenCompleteDialog: () => void;
  complete: CompleteDialogState;
  /** Any further dialog the page needs, such as the guest's result. */
  children?: ReactNode;
}

const crownFor = (side: Side, status: MatchStatus, winner: Side | null, leading: Side | null): Crowned => {
  if (status === "completed") return winner === side ? "winner" : null;
  return leading === side ? "leading" : null;
};

/**
 * The scoring page: two full-bleed team panels, stacked in portrait and
 * side by side in landscape, under a header with Back, the status, and the
 * scorer's controls. It keeps the screen awake while the match is still to
 * be played, offers fullscreen only where the device has it, and says
 * Completed, with why taps do nothing, once the match is over. The
 * tournament page and the guest page both render it.
 */
export const ScoringScreen = ({
  home,
  away,
  status,
  series,
  winner,
  access,
  notice,
  noticeAction,
  backHref,
  backLabel,
  tag,
  canUndo,
  onAddPoint,
  onDeductPoint,
  onUndo,
  onOpenCompleteDialog,
  complete,
  children,
}: ScoringScreenProps) => {
  const { isSupported: fullscreenSupported, isFullscreen, toggleFullscreen } = useFullscreen();
  useWakeLock(keepsScreenAwake({ status }));

  const canScore = access.canScore;
  const canComplete = resultCanBeConfirmed({ home: home.score, away: away.score }, access);
  const homeColor = home.color ?? STOCK_COLOR.home;
  const awayColor = away.color ?? STOCK_COLOR.away;
  const leading: Side | null =
    home.score > away.score ? "home" : away.score > home.score ? "away" : null;

  const endLabel = series.isSeries ? "End game" : "End match";
  const dialogTitle = series.isSeries ? "End the game?" : "End the match?";
  const dialogDescription = series.isSeries
    ? "Confirm the score of this game."
    : "Confirm the final score and the winner.";
  const confirmLabel = series.isSeries ? "Confirm game" : "Confirm result";

  return (
    <div className={`flex min-h-dvh flex-col ${isFullscreen ? "bg-black" : "matchbook-surface"}`}>
      {!isFullscreen && (
        <ScoringHeader
          backHref={backHref}
          backLabel={backLabel}
          status={status}
          series={series}
          homeName={home.name}
          awayName={away.name}
          tag={tag}
          fullscreenSupported={fullscreenSupported}
          canScore={canScore}
          canUndo={canUndo}
          canComplete={canComplete}
          endLabel={endLabel}
          onFullscreen={toggleFullscreen}
          onUndo={onUndo}
          onOpenCompleteDialog={onOpenCompleteDialog}
        />
      )}

      {notice && (
        <div className="z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-mb-rule bg-mb-paper-bright px-4 py-2 text-center">
          <p role="status" className="text-[0.85rem] text-mb-navy">
            {notice}
          </p>
          {noticeAction && (
            <button
              type="button"
              onClick={noticeAction.onClick}
              className="mb-btn mb-btn-coral min-h-11 px-4"
            >
              {noticeAction.label}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col landscape:flex-row">
        <TeamScorePanel
          side="home"
          teamName={home.name}
          teamColor={homeColor}
          score={home.score}
          crowned={crownFor("home", status, winner, leading)}
          isFullscreen={isFullscreen}
          canScore={canScore}
          onAddPoint={() => onAddPoint("home")}
          onDeductPoint={() => onDeductPoint("home")}
        />
        <div aria-hidden className="h-1 bg-[rgba(7,50,77,0.35)] landscape:h-auto landscape:w-1" />
        <TeamScorePanel
          side="away"
          teamName={away.name}
          teamColor={awayColor}
          score={away.score}
          crowned={crownFor("away", status, winner, leading)}
          isFullscreen={isFullscreen}
          canScore={canScore}
          onAddPoint={() => onAddPoint("away")}
          onDeductPoint={() => onDeductPoint("away")}
        />
      </div>

      <FullscreenControls
        isFullscreen={isFullscreen}
        canScore={canScore}
        canUndo={canUndo}
        canComplete={canComplete}
        endLabel={endLabel}
        onUndo={onUndo}
        onOpenCompleteDialog={onOpenCompleteDialog}
        onExit={toggleFullscreen}
      />

      <MatchCompleteDialog
        open={complete.open}
        onOpenChange={complete.onOpenChange}
        homeTeamName={home.name}
        awayTeamName={away.name}
        homeScore={home.score}
        awayScore={away.score}
        homeColor={homeColor}
        awayColor={awayColor}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={confirmLabel}
        isBusy={complete.isBusy}
        error={complete.error}
        onConfirm={complete.onConfirm}
      />

      {children}
    </div>
  );
};
