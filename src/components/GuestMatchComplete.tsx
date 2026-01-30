"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrophyIcon,
  ArrowPathIcon,
  ArrowRightEndOnRectangleIcon,
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import type { PersistentTeam } from "@/types/game";

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
      <DialogContent className="sm:max-w-md glass-card border-glass-border">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl"
          >
            <TrophyIcon className="w-10 h-10 text-white" />
          </motion.div>
          <DialogTitle className="text-2xl">Match Complete!</DialogTitle>
          <DialogDescription>
            Great game! Here are the final results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Score Display */}
          <div className="flex items-center justify-center gap-6 p-4 rounded-xl bg-accent/20">
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-xl mx-auto mb-2 shadow-lg flex items-center justify-center"
                style={{
                  backgroundColor: homeColor,
                  boxShadow: `0 8px 20px ${homeColor}40`,
                }}
              >
                <span className="text-xl font-bold text-white">
                  {homeTeam.name.charAt(0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{homeTeam.name}</p>
              <p className="text-3xl font-bold">{homeScore}</p>
            </div>
            <span className="text-2xl text-muted-foreground font-light">:</span>
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-xl mx-auto mb-2 shadow-lg flex items-center justify-center"
                style={{
                  backgroundColor: awayColor,
                  boxShadow: `0 8px 20px ${awayColor}40`,
                }}
              >
                <span className="text-xl font-bold text-white">
                  {awayTeam.name.charAt(0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{awayTeam.name}</p>
              <p className="text-3xl font-bold">{awayScore}</p>
            </div>
          </div>

          {/* Winner */}
          {winner && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
              <p className="text-sm text-muted-foreground mb-1">Winner</p>
              <p className="font-bold text-xl text-emerald-400">{winner.name}</p>
            </motion.div>
          )}

          {/* Sign In CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl bg-primary/5 border border-primary/10"
          >
            <p className="text-sm font-medium mb-2 text-center">
              Sign in to unlock more features:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <UserGroupIcon className="w-3.5 h-3.5 text-primary" />
                <span>Custom Teams</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrophyIcon className="w-3.5 h-3.5 text-primary" />
                <span>Tournaments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5 text-primary" />
                <span>Match History</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ChartBarIcon className="w-3.5 h-3.5 text-primary" />
                <span>Statistics</span>
              </div>
            </div>
          </motion.div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={onPlayAgain}
            className="w-full gap-2 btn-teal-gradient rounded-xl"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Play Again
          </Button>
          <Link href="/login?redirect=/quick-match" className="w-full">
            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl cursor-pointer"
            >
              <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
              Sign In for More
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
