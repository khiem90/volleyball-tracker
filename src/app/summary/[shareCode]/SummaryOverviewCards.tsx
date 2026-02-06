"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, Timer, Calendar } from "lucide-react";
import type { SessionStats } from "@/types/session";

type SummaryOverviewCardsProps = {
  stats: SessionStats;
  endedAt: number;
  formatDuration: (ms: number) => string;
};

export const SummaryOverviewCards = memo(function SummaryOverviewCards({
  stats,
  endedAt,
  formatDuration,
}: SummaryOverviewCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-linear-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Matches</p>
              <p className="text-2xl font-bold">{stats.completedMatches}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teams</p>
              <p className="text-2xl font-bold">{stats.totalTeams}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Timer className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-bold">{formatDuration(stats.duration)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-green-500/5 to-green-500/10 border-green-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Calendar className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ended</p>
              <p className="text-lg font-bold">
                {new Date(endedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
