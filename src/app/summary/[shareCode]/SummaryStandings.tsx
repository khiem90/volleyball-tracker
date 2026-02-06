"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Medal } from "lucide-react";

type TeamStat = {
  team: { id: string; name: string; color?: string };
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

type SummaryStandingsProps = {
  teamStats: TeamStat[];
};

export const SummaryStandings = memo(function SummaryStandings({
  teamStats,
}: SummaryStandingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-primary" />
          Final Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {teamStats.map((stat, index) => (
            <div
              key={stat.team.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="w-6 text-center font-bold text-muted-foreground">
                {index + 1}
              </span>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stat.team.color }}
              />
              <span className="flex-1 font-medium">{stat.team.name}</span>
              <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                {stat.wins}W
              </Badge>
              <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                {stat.losses}L
              </Badge>
              <span className="text-sm text-muted-foreground w-16 text-right">
                {stat.pointsFor}-{stat.pointsAgainst}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
