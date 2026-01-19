"use client";

import { useMemo, useCallback } from "react";
import { getRoundName, getTotalRounds } from "@/lib/singleElimination";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import { BracketMatchCard, ChampionDisplay } from "@/components/bracket-parts";
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
  // Use getTotalRounds to handle non-power-of-2 team counts (byes)
  const totalRounds = getTotalRounds(totalTeams);

  const { getTeamName: getTeamNameFromMap, getTeamColor, getTeam } = useTeamsMap(teams);

  const getTeamName = useCallback(
    (teamId: string) => {
      if (!teamId) return "TBD";
      const name = getTeamNameFromMap(teamId);
      return name === "Unknown Team" ? "Unknown" : name;
    },
    [getTeamNameFromMap]
  );

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

  const getMatchHeight = useCallback((round: number) => {
    const baseHeight = 140;
    const multiplier = Math.pow(2, round - 1);
    return baseHeight * multiplier;
  }, []);

  // Find champion info
  const championInfo = useMemo(() => {
    const finalMatch = matches.find(
      (m) => m.round === totalRounds && m.status === "completed"
    );
    if (!finalMatch?.winnerId) return null;

    const winner = getTeam(finalMatch.winnerId);
    return {
      name: winner?.name || "Champion",
      color: winner?.color || "#f59e0b",
    };
  }, [matches, totalRounds, getTeam]);

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
                {roundMatchList.map((match) => (
                  <BracketMatchCard
                    key={match.id}
                    match={match}
                    height={matchHeight}
                    round={round}
                    totalRounds={totalRounds}
                    getTeamName={getTeamName}
                    getTeamColor={getTeamColor}
                    canEdit={canEdit}
                    onMatchClick={onMatchClick}
                    onEditMatch={onEditMatch}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Winner Display */}
        {championInfo && (
          <ChampionDisplay
            winnerName={championInfo.name}
            winnerColor={championInfo.color}
          />
        )}
      </div>
    </div>
  );
};
