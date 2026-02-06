"use client";

import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { Match } from "@/types/game";

type SummaryMatchHistoryProps = {
  completedMatches: Match[];
  teamsMap: Record<string, { name: string; color: string }>;
};

export const SummaryMatchHistory = memo(function SummaryMatchHistory({
  completedMatches,
  teamsMap,
}: SummaryMatchHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Match History
        </CardTitle>
        <CardDescription>
          {completedMatches.length} completed matches
        </CardDescription>
      </CardHeader>
      <CardContent>
        {completedMatches.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No completed matches
          </p>
        ) : (
          <div className="space-y-2">
            {completedMatches.map((match, index) => {
              const homeTeam = teamsMap[match.homeTeamId];
              const awayTeam = teamsMap[match.awayTeamId];
              const homeWon = match.winnerId === match.homeTeamId;

              return (
                <div
                  key={match.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <span className="w-6 text-center text-xs text-muted-foreground">
                    #{completedMatches.length - index}
                  </span>
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: homeTeam?.color }}
                      />
                      <span
                        className={`truncate ${homeWon ? "font-semibold" : "text-muted-foreground"}`}
                      >
                        {homeTeam?.name || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-lg font-mono">
                      <span className={homeWon ? "text-green-500 font-bold" : ""}>
                        {match.homeScore}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className={!homeWon ? "text-green-500 font-bold" : ""}>
                        {match.awayScore}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span
                        className={`truncate ${!homeWon ? "font-semibold" : "text-muted-foreground"}`}
                      >
                        {awayTeam?.name || "Unknown"}
                      </span>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: awayTeam?.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
