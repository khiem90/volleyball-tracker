"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, Play } from "lucide-react";
import type { CompetitionStatus } from "@/types/game";

interface CompetitionStatsProps {
  status: CompetitionStatus;
  completedMatches: number;
  inProgressMatches: number;
  pendingMatches: number;
  matchesCount: number;
  totalProgress: number;
}

export const CompetitionStats = ({
  status,
  completedMatches,
  inProgressMatches,
  pendingMatches,
  matchesCount,
  totalProgress,
}: CompetitionStatsProps) => {
  if (status === "draft") return null;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="border-border/40 bg-card/30">
          <CardContent className="py-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
            <div className="text-2xl font-bold">{completedMatches}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Completed
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/30">
          <CardContent className="py-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <div className="text-2xl font-bold">{inProgressMatches}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              In Progress
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/30">
          <CardContent className="py-4 text-center">
            <Play className="w-6 h-6 mx-auto mb-2 text-sky-500" />
            <div className="text-2xl font-bold">{pendingMatches}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Pending
            </p>
          </CardContent>
        </Card>
      </div>
      {matchesCount > 0 && (
        <div className="px-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Overall Progress</span>
            <span>{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>
      )}
    </div>
  );
};
