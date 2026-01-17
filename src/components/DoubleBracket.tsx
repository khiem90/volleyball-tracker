"use client";

import { useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { getDoubleBracketStructure, getDoubleElimRoundName } from "@/lib/doubleElimination";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import type { Match, PersistentTeam } from "@/types/game";

interface DoubleBracketProps {
  matches: Match[];
  teams: PersistentTeam[];
  totalTeams: number;
  onMatchClick?: (match: Match) => void;
  onEditMatch?: (match: Match) => void;
}

export const DoubleBracket = ({ matches, teams, totalTeams, onMatchClick, onEditMatch }: DoubleBracketProps) => {
  const { canEdit } = useApp();
  const winnersRounds = Math.log2(totalTeams);

  const { getTeamName: getTeamNameFromMap, getTeamColor, getTeam } = useTeamsMap(teams);

  const bracketData = useMemo(
    () => getDoubleBracketStructure(matches, totalTeams),
    [matches, totalTeams]
  );

  const getTeamName = useCallback(
    (teamId: string) => {
      if (!teamId) return "TBD";
      const name = getTeamNameFromMap(teamId);
      return name === "Unknown Team" ? "Unknown" : name;
    },
    [getTeamNameFromMap]
  );

  const handleMatchClick = (match: Match) => {
    if (onMatchClick && match.homeTeamId && match.awayTeamId) {
      onMatchClick(match);
    }
  };

  const renderMatchCard = (match: Match) => {
    const isClickable = match.homeTeamId && match.awayTeamId;
    const isCompleted = match.status === "completed";
    const homeWon = match.winnerId === match.homeTeamId;
    const awayWon = match.winnerId === match.awayTeamId;

    return (
      <div key={match.id} className="relative group">
        <Card
          className={`
            w-44 overflow-hidden border-border/50 bg-card/50 relative
            ${isClickable ? "cursor-pointer hover:border-primary/50 hover:bg-card transition-all" : "opacity-75"}
          `}
          onClick={() => handleMatchClick(match)}
          role={isClickable ? "button" : undefined}
          tabIndex={isClickable ? 0 : undefined}
          onKeyDown={(e) => {
            if (isClickable && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              handleMatchClick(match);
            }
          }}
        >
          {/* Home Team */}
          <div
            className={`
              flex items-center justify-between px-2 py-1.5 border-b border-border/30 text-xs
              ${homeWon ? "bg-emerald-500/10" : ""}
              ${isCompleted && !homeWon ? "opacity-50" : ""}
            `}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getTeamColor(match.homeTeamId) }}
              />
              <span className={`truncate ${homeWon ? "font-semibold text-emerald-500" : ""}`}>
                {getTeamName(match.homeTeamId)}
              </span>
            </div>
            {isCompleted && (
              <span className={`font-bold tabular-nums ${homeWon ? "text-emerald-500" : ""}`}>
                {match.homeScore}
              </span>
            )}
          </div>

          {/* Away Team */}
          <div
            className={`
              flex items-center justify-between px-2 py-1.5 text-xs
              ${awayWon ? "bg-emerald-500/10" : ""}
              ${isCompleted && !awayWon ? "opacity-50" : ""}
            `}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getTeamColor(match.awayTeamId) }}
              />
              <span className={`truncate ${awayWon ? "font-semibold text-emerald-500" : ""}`}>
                {getTeamName(match.awayTeamId)}
              </span>
            </div>
            {isCompleted && (
              <span className={`font-bold tabular-nums ${awayWon ? "text-emerald-500" : ""}`}>
                {match.awayScore}
              </span>
            )}
          </div>

          {/* Status Indicator */}
          {match.status === "in_progress" && (
            <Badge className="status-live absolute top-1.5 right-1.5 text-[9px] font-semibold uppercase tracking-wider">
              Live
            </Badge>
          )}
        </Card>

        {/* Edit Button (only for pending matches) */}
        {canEdit && onEditMatch && match.status === "pending" && isClickable && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -left-2 h-6 w-6 bg-background border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
            onClick={(e) => {
              e.stopPropagation();
              onEditMatch(match);
            }}
            aria-label="Edit match assignment"
          >
            <Pencil className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Winners Bracket */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-blue-400">Winners Bracket</h3>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {bracketData.winners.map((roundMatches, roundIndex) => {
              const round = roundIndex + 1;
              const roundName = getDoubleElimRoundName(round, "winners", winnersRounds);

              return (
                <div key={`w-${round}`} className="flex flex-col">
                  <div className="text-center mb-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {roundName}
                    </span>
                  </div>
                  <div className="flex flex-col justify-around gap-4 flex-1">
                    {roundMatches.map((match) => renderMatchCard(match))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Losers Bracket */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-orange-400">Losers Bracket</h3>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {bracketData.losers.map((roundMatches, roundIndex) => {
              const round = roundIndex + 1;
              const roundName = getDoubleElimRoundName(round, "losers", winnersRounds);

              return (
                <div key={`l-${round}`} className="flex flex-col">
                  <div className="text-center mb-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {roundName}
                    </span>
                  </div>
                  <div className="flex flex-col justify-around gap-4 flex-1">
                    {roundMatches.map((match) => renderMatchCard(match))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grand Finals */}
      {bracketData.grandFinals && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-amber-500">Grand Finals</h3>
          <div className="flex gap-4 items-center">
            {renderMatchCard(bracketData.grandFinals)}

            {/* Champion Display */}
            {bracketData.grandFinals.status === "completed" && bracketData.grandFinals.winnerId && (() => {
              const winner = getTeam(bracketData.grandFinals.winnerId);
              return (
                <Card className="p-4 border-amber-500/50 bg-amber-500/10 text-center">
                  <div
                    className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${winner?.color || "#f59e0b"}, ${winner?.color || "#f59e0b"}99)`,
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
  );
};

