"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchHistorySectionProps } from "./types";

export const MatchHistorySection = memo(function MatchHistorySection({
  matches,
  getTeamName,
  getTeamColor,
}: MatchHistorySectionProps) {
  if (matches.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Match History ({matches.length} matches)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {matches.slice(0, 20).map((match, index) => {
            const homeWon = match.winnerId === match.homeTeamId;

            return (
              <div
                key={match.id}
                className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground w-8 shrink-0">
                    #{matches.length - index}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    C{match.position}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: getTeamColor(match.homeTeamId),
                    }}
                  />
                  <span
                    className={`truncate ${
                      homeWon
                        ? "font-semibold text-emerald-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {getTeamName(match.homeTeamId)}
                  </span>
                </div>

                <span className="font-bold tabular-nums px-3 shrink-0">
                  {match.homeScore} - {match.awayScore}
                </span>

                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span
                    className={`truncate ${
                      !homeWon
                        ? "font-semibold text-emerald-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {getTeamName(match.awayTeamId)}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: getTeamColor(match.awayTeamId),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
