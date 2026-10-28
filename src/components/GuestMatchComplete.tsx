"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { TeamScore } from "@/components/match/MatchCompleteDialog";
import type { PersistentTeam } from "@/types/game";
import { signInHref } from "@/lib/shell";

interface GuestMatchCompleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winner: PersistentTeam | null;
  homeTeam: PersistentTeam;
  awayTeam: PersistentTeam;
  homeScore: number;
  awayScore: number;
  onPlayAgain: () => void;
}

/* What a guest gets by signing in. Four points, each with a sprite glyph. */
const SIGN_IN_BENEFITS: { icon: string; label: string }[] = [
  { icon: "teams", label: "Custom Teams" },
  { icon: "compete", label: "Tournaments" },
  { icon: "history", label: "Match History" },
  { icon: "chart", label: "Statistics" },
];

/**
 * The result a guest sees when a quick match ends: the final score, the
 * winner, and the offer to sign in. A matchbook panel like every other
 * dialog; it opens with the dialog's own fade rather than its own entrance.
 */
export const GuestMatchComplete = ({
  open,
  onOpenChange,
  winner,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  onPlayAgain,
}: GuestMatchCompleteProps) => {
  const homeColor = homeTeam.color || "#3b82f6";
  const awayColor = awayTeam.color || "#f97316";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <MbIcon id="trophy" size={18} className="shrink-0" />
            Match Complete!
          </DialogTitle>
          <DialogDescription>
            Great game! Here are the final results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Final score */}
          <div className="flex items-center justify-center gap-6 rounded-[4px] border border-mb-rule bg-mb-paper-bright p-4">
            <TeamScore name={homeTeam.name} color={homeColor} score={homeScore} />
            <span className="matchbook-display text-2xl text-mb-ink-muted">
              :
            </span>
            <TeamScore name={awayTeam.name} color={awayColor} score={awayScore} />
          </div>

          {/* Winner */}
          {winner && (
            <div className="rounded-[4px] border-[1.5px] border-mb-navy bg-mb-paper-bright p-4 text-center">
              <p className="mb-kicker mb-1">Winner</p>
              <p className="matchbook-display text-xl font-bold text-mb-green">
                {winner.name}
              </p>
            </div>
          )}

          {/* Sign-in offer */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-mb-navy">
              Sign in to unlock more features:
            </p>
            <ul className="grid grid-cols-2 gap-2 text-xs text-mb-navy">
              {SIGN_IN_BENEFITS.map((benefit) => (
                <li key={benefit.label} className="flex items-center gap-1.5">
                  <MbIcon id={benefit.icon} size={14} className="shrink-0" />
                  <span>{benefit.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onPlayAgain} className="sm:flex-1">
            <MbIcon id="quick" size={14} />
            Play again
          </Button>
          <Link
            href={signInHref("/quick-match")}
            className="mb-btn mb-btn-navy sm:flex-1"
          >
            <MbIcon id="login" size={14} />
            Sign In for More
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
