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
    const baseHeight = 140;
    const multiplier = Math.pow(2, round - 1);
    return baseHeight * multiplier;
  };

  const handleMatchClick = (match: Match) => {
    if (
      onMatchClick &&
      match.homeTeamId &&
      match.awayTeamId &&
      match.status !== "completed"
    ) {
      onMatchClick(match);
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex w-full min-w-max justify-between gap-10">
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
                  const isPlayable = isClickable && match.status !== "completed";
                  const isCompleted = match.status === "completed";
                  const homeWon = match.winnerId === match.homeTeamId;
                  const awayWon = match.winnerId === match.awayTeamId;
                  const actionLabel =
                    match.status === "in_progress" ? "Continue" : "Start";

                  return (
                    <div
                      key={match.id}
                      className="relative"
                      style={{ height: matchHeight }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 w-full">
                        <Card
                          className={`
                            group relative w-56 overflow-hidden border-border/40 bg-card/40 py-0 gap-0
                            transition-[border-color,box-shadow,transform]
                            ${
                              isPlayable
                                ? "cursor-pointer hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5"
                                : "opacity-60"
                            }
                          `}
                          onClick={() => handleMatchClick(match)}
                          role={isPlayable ? "button" : undefined}
                          tabIndex={isPlayable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (
                              isPlayable &&
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
                              flex items-center justify-between px-4 py-3 border-b border-border/30
                              ${isPlayable ? "group-hover:bg-primary/5" : ""}
                              ${homeWon ? "bg-emerald-500/10" : ""}
                              ${isCompleted && !homeWon ? "opacity-50" : ""}
                            `}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: getTeamColor(
                                    match.homeTeamId
                                  ),
                                }}
                              />
                              <span
                                className={`text-[13px] truncate ${
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
                                className={`text-[13px] font-bold tabular-nums ${
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
                              flex items-center justify-between px-4 py-3
                              ${isPlayable ? "group-hover:bg-primary/5" : ""}
                              ${awayWon ? "bg-emerald-500/10" : ""}
                              ${isCompleted && !awayWon ? "opacity-50" : ""}
                            `}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: getTeamColor(
                                    match.awayTeamId
                                  ),
                                }}
                              />
                              <span
                                className={`text-[13px] truncate ${
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
                                className={`text-[13px] font-bold tabular-nums ${
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

                          {/* Match Pairing Indicator */}
                          {isClickable && (
                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                              <span className="h-px w-6 bg-border/40" />
                              <span className="rounded-full border border-border/40 bg-background/70 px-1.5 py-0.5">
                                vs
                              </span>
                              <span className="h-px w-6 bg-border/40" />
                            </div>
                          )}

                          {/* Hover Action */}
                          {isPlayable && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                              <span className="text-[10px] uppercase tracking-wider text-primary/80 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                                {actionLabel}
                              </span>
                            </div>
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
            <div className="w-56">
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
