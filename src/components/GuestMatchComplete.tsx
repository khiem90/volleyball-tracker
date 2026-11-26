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
import { STOCK_COLOR } from "@/components/match";
import { FinalScore } from "@/components/match/MatchCompleteDialog";
import { Icon } from "@/components/shared/Icon";
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
 * winner, and the offer to sign in. It is the shared dialog, and the score
 * is drawn by the piece the confirm dialog uses. Each team keeps the color
 * its panel had.
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
  const winnerSide = !winner ? null : winner.id === homeTeam.id ? "home" : "away";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Icon id="trophy" size={18} className="shrink-0" />
            Match Complete!
          </DialogTitle>
          <DialogDescription>
            Great game! Here are the final results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FinalScore
            home={{ name: homeTeam.name, color: homeTeam.color || STOCK_COLOR.home }}
            away={{ name: awayTeam.name, color: awayTeam.color || STOCK_COLOR.away }}
            homeScore={homeScore}
            awayScore={awayScore}
            winner={winnerSide}
          />

          {/* Sign-in offer */}
          <div className="space-y-2">
            <p className="text-label font-medium">
              Sign in to unlock more features:
            </p>
            <ul className="grid grid-cols-2 gap-2 text-caption">
              {SIGN_IN_BENEFITS.map((benefit) => (
                <li key={benefit.label} className="flex items-center gap-1.5">
                  <Icon id={benefit.icon} size={14} className="shrink-0 text-ink-soft" />
                  <span>{benefit.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onPlayAgain} className="sm:flex-1">
            <Icon id="quick" size={14} />
            Play again
          </Button>
          <Link href={signInHref("/quick-match")} className="btn btn-ink sm:flex-1">
            <Icon id="login" size={14} />
            Sign In for More
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
