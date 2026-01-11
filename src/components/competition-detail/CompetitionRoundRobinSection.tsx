"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Standings } from "@/components/Standings";
import { Pencil, Swords } from "lucide-react";
import type { RoundRobinStanding } from "@/lib/roundRobin";
import type { PersistentTeam } from "@/types/game";
import type { RoundRobinMatchRow } from "@/hooks/useCompetitionDetailPage";

interface CompetitionRoundRobinSectionProps {
  standings: RoundRobinStanding[];
  teams: PersistentTeam[];
  matches: RoundRobinMatchRow[];
  canEdit: boolean;
  onMatchClick: (match: RoundRobinMatchRow["match"]) => void;
  onEditMatch: (match: RoundRobinMatchRow["match"]) => void;
}

export const CompetitionRoundRobinSection = ({
  standings,
  teams,
  matches,
  canEdit,
  onMatchClick,
  onEditMatch,
}: CompetitionRoundRobinSectionProps) => (
  <div className="space-y-6">
    <Standings standings={standings} teams={teams} />

    <Card className="border-border/40 bg-card/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          Match Schedule
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="space-y-2">
          {matches.map(({ match, homeTeam, awayTeam, homeWon, awayWon }) => (
            <div
              key={match.id}
              className={`
                p-4 rounded-xl border transition-all duration-200 group
                ${
                  match.status === "in_progress"
                    ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20"
                    : "border-border/40 bg-card"
                }
                ${
                  match.status !== "completed"
                    ? "cursor-pointer hover:border-primary/40 hover:bg-accent/30"
                    : ""
                }
              `}
              onClick={() => {
                if (match.status !== "completed") {
                  onMatchClick(match);
                }
              }}
              role={match.status !== "completed" ? "button" : undefined}
              tabIndex={match.status !== "completed" ? 0 : undefined}
              onKeyDown={(event) => {
                if (
                  (event.key === "Enter" || event.key === " ") &&
                  match.status !== "completed"
                ) {
                  onMatchClick(match);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: homeTeam?.color || "#3b82f6" }}
                  />
                  <span
                    className={`truncate ${
                      homeWon ? "font-semibold text-emerald-500" : ""
                    }`}
                  >
                    {homeTeam?.name || "TBD"}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 px-4">
                  {match.status === "completed" ? (
                    <span className="text-lg font-bold tabular-nums">
                      {match.homeScore} - {match.awayScore}
                    </span>
                  ) : (
                    <>
                      <Badge
                        className={
                          match.status === "in_progress"
                            ? "status-active"
                            : "status-draft"
                        }
                      >
                        {match.status === "in_progress" ? "Live" : "Pending"}
                      </Badge>
                      {canEdit && match.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditMatch(match);
                          }}
                          aria-label={`Edit match ${homeTeam?.name} vs ${awayTeam?.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                  <span
                    className={`truncate ${
                      awayWon ? "font-semibold text-emerald-500" : ""
                    }`}
                  >
                    {awayTeam?.name || "TBD"}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: awayTeam?.color || "#f97316" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);
