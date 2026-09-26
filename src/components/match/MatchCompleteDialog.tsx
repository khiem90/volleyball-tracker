"use client";

import { memo } from "react";
import { Loader2, Trophy } from "lucide-react";
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
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-center gap-6 rounded-xl bg-accent/20 p-4">
            <div className="text-center">
              <div
                className="mx-auto mb-2 h-12 w-12 rounded-xl shadow-lg"
                style={{ backgroundColor: homeColor, boxShadow: `0 8px 20px ${homeColor}40` }}
              />
              <p className="mb-1 text-xs text-muted-foreground">{homeTeamName}</p>
              <p className="text-3xl font-bold tabular-nums">{homeScore}</p>
            </div>
            <span className="text-2xl font-light text-muted-foreground">:</span>
            <div className="text-center">
              <div
                className="mx-auto mb-2 h-12 w-12 rounded-xl shadow-lg"
                style={{ backgroundColor: awayColor, boxShadow: `0 8px 20px ${awayColor}40` }}
              />
              <p className="mb-1 text-xs text-muted-foreground">{awayTeamName}</p>
              <p className="text-3xl font-bold tabular-nums">{awayScore}</p>
            </div>
          </div>
          <div className="pt-2 pb-2 text-center">
            <p className="mb-1 text-sm text-muted-foreground">Winner</p>
            <p className="text-xl font-semibold">
              {homeScore > awayScore ? homeTeamName : awayTeamName}
            </p>
          </div>
          {error && (
            <p role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
            className="min-h-11 flex-1"
          >
            Keep playing
          </Button>
          <Button onClick={onConfirm} disabled={isBusy} className="min-h-11 flex-1 gap-2">
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trophy className="h-4 w-4" aria-hidden />
            )}
            {isBusy ? "Saving..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
