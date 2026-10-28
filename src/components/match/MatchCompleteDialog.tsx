"use client";

import { memo } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { InlineSpinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
 * One team's side of a final score: a square chip in the team color carrying
 * the initial, the name, and the score. The guest match-complete dialog shows
 * the same thing, so it imports this rather than drawing its own.
 */
export const TeamScore = ({ name, color, score }: { name: string; color: string; score: number }) => (
  <div className="min-w-0 text-center">
    <div
      className="mx-auto mb-2 flex size-12 items-center justify-center rounded-[4px] border-[1.5px] border-mb-navy"
      style={{ backgroundColor: color }}
    >
      <span className="matchbook-display text-xl font-bold text-white">{name.charAt(0)}</span>
    </div>
    <p className="mb-1 truncate text-xs text-mb-ink-muted">{name}</p>
    <p className="matchbook-display text-3xl font-bold tabular-nums text-mb-navy">{score}</p>
  </div>
);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <MbIcon id="trophy" size={18} className="shrink-0" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-center gap-6 rounded-[4px] border border-mb-rule bg-mb-paper p-4">
            <TeamScore name={homeTeamName} color={homeColor} score={homeScore} />
            <span className="text-2xl font-light text-mb-ink-muted">:</span>
            <TeamScore name={awayTeamName} color={awayColor} score={awayScore} />
          </div>
          <div className="pt-2 pb-2 text-center">
            <p className="mb-1 text-sm text-mb-ink-muted">Winner</p>
            <p className="matchbook-display text-xl font-bold text-mb-navy">
              {homeScore > awayScore ? homeTeamName : awayTeamName}
            </p>
          </div>
          {error && (
            <p role="alert" className="text-center text-sm font-medium text-mb-red">
              {error}
            </p>
          )}
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
            {isBusy ? <InlineSpinner /> : <MbIcon id="trophy" size={14} />}
            {isBusy ? "Saving..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
