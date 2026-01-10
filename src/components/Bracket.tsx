"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { getRoundName } from "@/lib/singleElimination";
import { useApp } from "@/context/AppContext";
import type { Match, PersistentTeam } from "@/types/game";

interface BracketProps {
  matches: Match[];
  teams: PersistentTeam[];
  totalTeams: number;
  onMatchClick?: (match: Match) => void;
  onEditMatch?: (match: Match) => void;
}

export const Bracket = ({
  matches,
  teams,
  totalTeams,
  onMatchClick,
  onEditMatch,
}: BracketProps) => {
  const { canEdit } = useApp();
  const totalRounds = Math.log2(totalTeams);

  const teamsMap = useMemo(() => {
    const map = new Map<string, PersistentTeam>();
    teams.forEach((team) => map.set(team.id, team));
    return map;
  }, [teams]);

  const getTeamName = (teamId: string) => {
    if (!teamId) return "TBD";
    return teamsMap.get(teamId)?.name || "Unknown";
  };

  const getTeamColor = (teamId: string) => {
    return teamsMap.get(teamId)?.color || "#64748b";
  };

  const roundMatches = useMemo(() => {
    const rounds: Match[][] = [];
    for (let r = 1; r <= totalRounds; r++) {
      rounds.push(
        matches
          .filter((m) => m.round === r)
          .sort((a, b) => a.position - b.position)
      );
    }
    return rounds;
  }, [matches, totalRounds]);

  const getMatchHeight = (round: number) => {
    // Each subsequent round needs more spacing
    const baseHeight = 80;
    const multiplier = Math.pow(2, round - 1);
    return baseHeight * multiplier;
  };

  const handleMatchClick = (match: Match) => {
    if (onMatchClick && match.homeTeamId && match.awayTeamId) {
      onMatchClick(match);
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {roundMatches.map((roundMatchList, roundIndex) => {
          const round = roundIndex + 1;
          const matchHeight = getMatchHeight(round);
          const roundName = getRoundName(round, totalRounds);

          return (
            <div key={round} className="flex flex-col">
              {/* Round Header */}
              <div className="text-center mb-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {roundName}
                </span>
              </div>

              {/* Matches */}
              <div className="flex flex-col justify-around flex-1">
                {roundMatchList.map((match) => {
                  const isClickable = match.homeTeamId && match.awayTeamId;
                  const isCompleted = match.status === "completed";
                  const homeWon = match.winnerId === match.homeTeamId;
                  const awayWon = match.winnerId === match.awayTeamId;

                  return (
                    <div
                      key={match.id}
                      className="relative group"
                      style={{ height: matchHeight }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 w-full">
                        <Card
                          className={`
                            w-48 overflow-hidden border-border/50 bg-card/50
                            ${
                              isClickable
                                ? "cursor-pointer hover:border-primary/50 hover:bg-card transition-all"
                                : "opacity-75"
                            }
                          `}
                          onClick={() => handleMatchClick(match)}
                          role={isClickable ? "button" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (
                              isClickable &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              handleMatchClick(match);
                            }
                          }}
                        >
                          {/* Home Team */}
                          <div
                            className={`
                              flex items-center justify-between px-3 py-2 border-b border-border/30
                              ${homeWon ? "bg-emerald-500/10" : ""}
                              ${isCompleted && !homeWon ? "opacity-50" : ""}
                            `}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: getTeamColor(
                                    match.homeTeamId
                                  ),
                                }}
                              />
                              <span
                                className={`text-sm truncate ${
                                  homeWon
                                    ? "font-semibold text-emerald-500"
                                    : ""
                                }`}
                              >
                                {getTeamName(match.homeTeamId)}
                              </span>
                            </div>
                            {isCompleted && (
                              <span
                                className={`text-sm font-bold tabular-nums ${
                                  homeWon ? "text-emerald-500" : ""
                                }`}
                              >
                                {match.homeScore}
                              </span>
                            )}
                          </div>

                          {/* Away Team */}
                          <div
                            className={`
                              flex items-center justify-between px-3 py-2
                              ${awayWon ? "bg-emerald-500/10" : ""}
                              ${isCompleted && !awayWon ? "opacity-50" : ""}
                            `}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: getTeamColor(
                                    match.awayTeamId
                                  ),
                                }}
                              />
                              <span
                                className={`text-sm truncate ${
                                  awayWon
                                    ? "font-semibold text-emerald-500"
                                    : ""
                                }`}
                              >
                                {getTeamName(match.awayTeamId)}
                              </span>
                            </div>
                            {isCompleted && (
                              <span
                                className={`text-sm font-bold tabular-nums ${
                                  awayWon ? "text-emerald-500" : ""
                                }`}
                              >
                                {match.awayScore}
                              </span>
                            )}
                          </div>

                          {/* Status Indicator */}
                          {match.status === "in_progress" && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                          )}

                          {/* Edit Button (only for pending matches when canEdit) */}
                          {canEdit &&
                            onEditMatch &&
                            match.status === "pending" &&
                            isClickable && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -left-2 h-6 w-6 bg-background border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditMatch(match);
                                }}
                                aria-label="Edit match assignment"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
                        </Card>

                        {/* Connector Lines - simplified for now */}
                        {round < totalRounds && (
                          <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-border/50" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Winner Display */}
        {matches.some(
          (m) => m.round === totalRounds && m.status === "completed"
        ) && (
          <div className="flex flex-col justify-center">
            <div className="text-center mb-4">
              <span className="text-sm font-medium text-amber-500">
                Champion
              </span>
            </div>
            <div className="w-48">
              {(() => {
                const finalMatch = matches.find((m) => m.round === totalRounds);
                if (!finalMatch?.winnerId) return null;

                const winner = teamsMap.get(finalMatch.winnerId);
                return (
                  <Card className="p-4 border-amber-500/50 bg-amber-500/10 text-center">
                    <div
                      className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2"
                      style={{
                        background: `linear-gradient(135deg, ${
                          winner?.color || "#f59e0b"
                        }, ${winner?.color || "#f59e0b"}99)`,
                      }}
                    >
                      <span className="text-2xl">🏆</span>
                    </div>
                    <p className="font-bold text-amber-500">
                      {winner?.name || "Champion"}
                    </p>
                  </Card>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
