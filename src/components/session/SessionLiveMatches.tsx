"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Match, PersistentTeam } from "@/types/game";

interface SessionLiveMatchesProps {
  matches: Match[];
  teamsMap: Map<string, PersistentTeam>;
  canEdit: boolean;
  onMatchClick: (match: Match) => void;
}

export const SessionLiveMatches = ({
  matches,
  teamsMap,
  canEdit,
  onMatchClick,
}: SessionLiveMatchesProps) => {
  if (matches.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Live Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((match) => {
          const homeTeam = teamsMap.get(match.homeTeamId);
          const awayTeam = teamsMap.get(match.awayTeamId);
          const seriesLength = match.seriesLength ?? 1;
          const homeWins = match.homeWins ?? 0;
          const awayWins = match.awayWins ?? 0;
          const gamesPlayed = homeWins + awayWins;
          const gameNumber =
            match.status === "completed" ? gamesPlayed : gamesPlayed + 1;
          const isSeries = seriesLength > 1;

          return (
            <div
              key={match.id}
              className={`p-4 rounded-xl bg-muted/50 ${
                canEdit ? "cursor-pointer hover:bg-muted transition-colors" : ""
              }`}
              onClick={canEdit ? () => onMatchClick(match) : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: homeTeam?.color || "#888" }}
                  />
                  <span className="font-medium">{homeTeam?.name || "TBD"}</span>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {match.homeScore} - {match.awayScore}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{awayTeam?.name || "TBD"}</span>
                  <div
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: awayTeam?.color || "#888" }}
                  />
                </div>
              </div>
              {isSeries && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Game {gameNumber} of {seriesLength}
                  </span>
                  <span>
                    Series: {homeTeam?.name || "TBD"} {homeWins} - {awayWins}{" "}
                    {awayTeam?.name || "TBD"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
