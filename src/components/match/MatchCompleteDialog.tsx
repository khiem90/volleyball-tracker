"use client";

import { memo } from "react";
import { CardError, Icon, InlineSpinner, ScoreLine } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Side } from "@/lib/scoring";
import type { Team } from "@/lib/teamShapes";

type MatchCompleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeColor: string;
  awayColor: string;
  title: string;
  description: string;
  confirmLabel: string;
  /** True while the result is being saved. */
  isBusy: boolean;
  /** Why the last confirm did not go through, if it did not. */
  error: string | null;
  onConfirm: () => void;
};

/**
 * A final score inside a dialog: the score line at its large size on a grey
 * tile, and the winner's name under it. The guest's result dialog shows the
 * same thing, so it imports this and draws none of its own.
 */
export const FinalScore = ({
  home,
  away,
  homeScore,
  awayScore,
  winner,
}: {
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  /** The side that won. With none, the score is shown without a winner under it. */
  winner: Side | null;
}) => (
  <div className="space-y-3">
    <div className="rounded-tile bg-fill px-3 py-4">
      <ScoreLine
        size="court"
        home={home}
        away={away}
        homeScore={homeScore}
        awayScore={awayScore}
        winner={winner}
      />
    </div>
    {winner && (
      <div className="text-center">
        <p className="text-caption font-medium text-ink-soft">Winner</p>
        <p className="text-title font-bold [overflow-wrap:anywhere]">
          {winner === "home" ? home.name : away.name}
        </p>
      </div>
    )}
  </div>
);

/**
 * The frame of both result dialogs. A phone on its side is 390px tall and the
 * guest's result is taller, so the dialog stops 16px short of each edge and
 * scrolls inside.
 */
export const RESULT_DIALOG = "max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md";

/** The confirm before a result is recorded: the score, the winner, and a way back to playing. */
export const MatchCompleteDialog = memo(function MatchCompleteDialog({
  open,
  onOpenChange,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  homeColor,
  awayColor,
  title,
  description,
  confirmLabel,
  isBusy,
  error,
  onConfirm,
}: MatchCompleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={RESULT_DIALOG}>
        <DialogHeader>
          <DialogTitle>
            <Icon id="trophy" size={18} className="shrink-0" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FinalScore
            home={{ name: homeTeamName, color: homeColor }}
            away={{ name: awayTeamName, color: awayColor }}
            homeScore={homeScore}
            awayScore={awayScore}
            winner={homeScore > awayScore ? "home" : "away"}
          />
          {error && <CardError message={error} className="text-center" />}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
            className="sm:flex-1"
          >
            Keep playing
          </Button>
          <Button onClick={onConfirm} disabled={isBusy} className="sm:flex-1">
            {isBusy ? <InlineSpinner /> : <Icon id="trophy" size={14} />}
            {isBusy ? "Saving..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
