"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

type SummaryWinnerDisplayProps = {
  winner: {
    teamId: string;
    teamName: string;
    wins: number;
  };
};

export const SummaryWinnerDisplay = memo(function SummaryWinnerDisplay({
  winner,
}: SummaryWinnerDisplayProps) {
  return (
    <Card className="bg-linear-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 border-amber-500/30">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="p-4 rounded-2xl bg-amber-500/20">
            <Trophy className="w-10 h-10 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">Champion</p>
            <h2 className="text-2xl font-bold">{winner.teamName}</h2>
            <p className="text-muted-foreground">
              {winner.wins} wins
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
