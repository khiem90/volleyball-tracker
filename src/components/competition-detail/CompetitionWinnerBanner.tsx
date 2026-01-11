"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Crown } from "lucide-react";
import type { PersistentTeam } from "@/types/game";

interface CompetitionWinnerBannerProps {
  winner: PersistentTeam | null;
}

export const CompetitionWinnerBanner = ({
  winner,
}: CompetitionWinnerBannerProps) => {
  if (!winner) return null;

  return (
    <Card className="mb-8 border-amber-500/40 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent overflow-hidden">
      <div className="h-1 w-full bg-linear-to-r from-amber-500 to-amber-600" />
      <CardContent className="py-6">
        <div className="flex items-center justify-center gap-6">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${
                  winner.color || "#f59e0b"
                }, ${winner.color || "#f59e0b"}99)`,
              }}
            >
              <span className="text-3xl font-bold text-white">
                {winner.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
              <Crown className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-amber-500 font-semibold uppercase tracking-wider mb-1">
              Champion
            </p>
            <p className="text-3xl font-bold">{winner.name}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
