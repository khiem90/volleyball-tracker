"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Match, PersistentTeam, Competition } from "@/types/game";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import {
  detectTeamSwap,
  calculateSwapUpdates,
  type SwapResult,
} from "@/lib/eliminationSwap";

interface UseEditMatchDialogProps {
  match: Match | null;
  matches: Match[];
  teams: PersistentTeam[];
  competition?: Competition | null;
  onClose: () => void;
}

export const useEditMatchDialog = ({
  match,
  matches,
  teams,
  competition,
  onClose,
}: UseEditMatchDialogProps) => {
  const { updateMatchTeams, swapMatchTeams, updateCompetition, canEdit } = useApp();
  const { getTeamName, getTeamColor } = useTeamsMap(teams);

  const [homeTeamId, setHomeTeamId] = useState<string>("");
  const [awayTeamId, setAwayTeamId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [swapInfo, setSwapInfo] = useState<SwapResult | null>(null);

  // Check competition type for swap logic
  const isEliminationBracket =
    competition?.type === "single_elimination" ||
    competition?.type === "double_elimination";
  const isRotationFormat =
    competition?.type === "win2out" ||
    competition?.type === "two_match_rotation";

  // Reset form when match changes
  useEffect(() => {
    if (match) {
      setHomeTeamId(match.homeTeamId);
      setAwayTeamId(match.awayTeamId);
      setError("");
      setSwapInfo(null);
    }
  }, [match]);

  // Detect if a team swap is needed
  useEffect(() => {
    if (!match) {
      setSwapInfo(null);
      return;
    }

    const sameRoundOnly = isEliminationBracket;
    const result = detectTeamSwap(match, homeTeamId, awayTeamId, matches, sameRoundOnly);
    setSwapInfo(result.needsSwap ? result : null);
  }, [match, homeTeamId, awayTeamId, matches, isEliminationBracket]);

  // Get teams currently PLAYING on OTHER courts
  const teamsPlaying = useMemo(() => {
    if (!match) return new Set<string>();

    const otherInProgressMatches = matches.filter(
      (m) =>
        m.id !== match.id &&
        m.status === "in_progress" &&
        m.competitionId === match.competitionId
    );

    const teamIds = new Set<string>();
    otherInProgressMatches.forEach((m) => {
      teamIds.add(m.homeTeamId);
      teamIds.add(m.awayTeamId);
    });

    return teamIds;
  }, [match, matches]);

  // Get available teams for selection
  const availableTeams = useMemo(() => {
    if (!competition) return teams;
    return teams.filter((t) => competition.teamIds.includes(t.id));
  }, [teams, competition]);

  // Check if a team is currently playing on another court
  const isTeamPlaying = useCallback(
    (teamId: string) => {
      if (!teamId) return false;
      if (match && (teamId === match.homeTeamId || teamId === match.awayTeamId)) {
        return false;
      }
      return teamsPlaying.has(teamId);
    },
    [match, teamsPlaying]
  );

  // Check if the selected matchup is valid
  const isValidMatchup = useMemo(() => {
    if (!homeTeamId || !awayTeamId) return false;
    if (homeTeamId === awayTeamId) return false;
    if (isTeamPlaying(homeTeamId) || isTeamPlaying(awayTeamId)) return false;
    return true;
  }, [homeTeamId, awayTeamId, isTeamPlaying]);

  // Check if anything has changed
  const hasChanges = useMemo(() => {
    if (!match) return false;
    return homeTeamId !== match.homeTeamId || awayTeamId !== match.awayTeamId;
  }, [match, homeTeamId, awayTeamId]);

  const handleSwapTeams = useCallback(() => {
    setHomeTeamId(awayTeamId);
    setAwayTeamId(homeTeamId);
  }, [homeTeamId, awayTeamId]);

  const handleSave = useCallback(() => {
    if (!match || !isValidMatchup) return;

    setError("");

    if (homeTeamId === awayTeamId) {
      setError("A team cannot play against itself");
      return;
    }

    if (homeTeamId !== match.homeTeamId || awayTeamId !== match.awayTeamId) {
      if (
        swapInfo?.needsSwap &&
        swapInfo.otherMatchId &&
        swapInfo.displacedTeamId &&
        swapInfo.swappingTeamId
      ) {
        const updates = calculateSwapUpdates(
          match.id,
          homeTeamId,
          awayTeamId,
          swapInfo.otherMatchId,
          swapInfo.displacedTeamId,
          swapInfo.swappingTeamId,
          matches
        );
        swapMatchTeams(updates);

        // For rotation formats, also update the court state
        if (isRotationFormat && competition) {
          const swappingTeamId = swapInfo.swappingTeamId;
          const displacedTeamId = swapInfo.displacedTeamId;

          if (competition.win2outState) {
            const courts = [...competition.win2outState.courts];
            const currentCourtIndex = courts.findIndex(
              (c) =>
                c.teamIds.includes(match.homeTeamId) &&
                c.teamIds.includes(match.awayTeamId)
            );
            const otherCourtIndex = courts.findIndex(
              (c, idx) =>
                c.teamIds.includes(swappingTeamId) && idx !== currentCourtIndex
            );

            if (currentCourtIndex !== -1 && otherCourtIndex !== -1) {
              courts[currentCourtIndex] = {
                ...courts[currentCourtIndex],
                teamIds: [homeTeamId, awayTeamId] as [string, string],
              };
              const otherCourt = courts[otherCourtIndex];
              courts[otherCourtIndex] = {
                ...otherCourt,
                teamIds: otherCourt.teamIds.map((id) =>
                  id === swappingTeamId ? displacedTeamId : id
                ) as [string, string],
              };
              updateCompetition({
                ...competition,
                win2outState: { ...competition.win2outState, courts },
              });
            }
          } else if (competition.twoMatchRotationState) {
            const courts = [...competition.twoMatchRotationState.courts];
            const currentCourtIndex = courts.findIndex(
              (c) =>
                c.teamIds.includes(match.homeTeamId) &&
                c.teamIds.includes(match.awayTeamId)
            );
            const otherCourtIndex = courts.findIndex(
              (c, idx) =>
                c.teamIds.includes(swappingTeamId) && idx !== currentCourtIndex
            );

            if (currentCourtIndex !== -1 && otherCourtIndex !== -1) {
              courts[currentCourtIndex] = {
                ...courts[currentCourtIndex],
                teamIds: [homeTeamId, awayTeamId] as [string, string],
              };
              const otherCourt = courts[otherCourtIndex];
              courts[otherCourtIndex] = {
                ...otherCourt,
                teamIds: otherCourt.teamIds.map((id) =>
                  id === swappingTeamId ? displacedTeamId : id
                ) as [string, string],
              };
              updateCompetition({
                ...competition,
                twoMatchRotationState: { ...competition.twoMatchRotationState, courts },
              });
            }
          }
        }
      } else {
        updateMatchTeams(match.id, homeTeamId, awayTeamId);
      }
    }

    onClose();
  }, [
    match,
    isValidMatchup,
    homeTeamId,
    awayTeamId,
    swapInfo,
    matches,
    isRotationFormat,
    competition,
    swapMatchTeams,
    updateMatchTeams,
    updateCompetition,
    onClose,
  ]);

  return {
    // State
    homeTeamId,
    setHomeTeamId,
    awayTeamId,
    setAwayTeamId,
    error,
    swapInfo,

    // Computed values
    availableTeams,
    isValidMatchup,
    hasChanges,
    canEdit,

    // Helpers
    getTeamName,
    getTeamColor,
    isTeamPlaying,

    // Actions
    handleSwapTeams,
    handleSave,
  };
};
