"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { TrophyIcon } from "@heroicons/react/24/outline";
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
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export const MatchCompleteDialog = memo(function MatchCompleteDialog({
  open,
  onOpenChange,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  homeColor,
  awayColor,
  dialogTitle,
  dialogDescription,
  confirmLabel,
  onConfirm,
}: MatchCompleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-glass-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-primary" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-center gap-6 p-4 rounded-xl bg-accent/20">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-2 shadow-lg"
                style={{
                  backgroundColor: homeColor,
                  boxShadow: `0 8px 20px ${homeColor}40`,
                }}
              />
              <p className="text-xs text-muted-foreground mb-1">
                {homeTeamName}
              </p>
              <p className="text-3xl font-bold">{homeScore}</p>
            </div>
            <span className="text-2xl text-muted-foreground font-light">
              :
            </span>
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-2 shadow-lg"
                style={{
                  backgroundColor: awayColor,
                  boxShadow: `0 8px 20px ${awayColor}40`,
                }}
              />
              <p className="text-xs text-muted-foreground mb-1">
                {awayTeamName}
              </p>
              <p className="text-3xl font-bold">{awayScore}</p>
            </div>
          </div>
          <div className="text-center pt-2 pb-2">
            <p className="text-sm text-muted-foreground mb-1">Winner</p>
            <p className="font-semibold text-xl text-emerald-400">
              {homeScore > awayScore ? homeTeamName : awayTeamName}
            </p>
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl cursor-pointer"
          >
            Continue Playing
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 gap-2 btn-teal-gradient rounded-xl cursor-pointer"
          >
            <TrophyIcon className="w-4 h-4" />
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
