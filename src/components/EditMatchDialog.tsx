"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Repeat, AlertCircle, ArrowRightLeft } from "lucide-react";
import type { Match, PersistentTeam, Competition } from "@/types/game";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import {
  detectTeamSwap,
  calculateSwapUpdates,
  type SwapResult,
} from "@/lib/eliminationSwap";

interface EditMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  matches?: Match[];
  teams: PersistentTeam[];
  competition?: Competition | null;
}

export const EditMatchDialog = ({
  open,
  onOpenChange,
  match,
  matches = [],
  teams,
  competition,
}: EditMatchDialogProps) => {
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
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (match) {
      setHomeTeamId(match.homeTeamId);
      setAwayTeamId(match.awayTeamId);
      setError("");
      setSwapInfo(null);
    }
  }, [match]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Detect if a team swap is needed (for any format with pending matches)
  useEffect(() => {
    if (!match) {
      setSwapInfo(null);
      return;
    }

    // For elimination brackets: check same round only
    // For rotation formats: check any pending match
    const sameRoundOnly = isEliminationBracket;
    const result = detectTeamSwap(match, homeTeamId, awayTeamId, matches, sameRoundOnly);
    setSwapInfo(result.needsSwap ? result : null);
  }, [match, homeTeamId, awayTeamId, matches, isEliminationBracket]);

  // Get teams currently PLAYING (in_progress) on OTHER courts (not this match)
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


  // Get available teams for selection (teams in the competition)
  const availableTeams = useMemo(() => {
    if (!competition) return teams;
    return teams.filter((t) => competition.teamIds.includes(t.id));
  }, [teams, competition]);

  // Check if a team is currently playing (in_progress) on another court
  // Teams in pending matches can be swapped, so they're allowed
  const isTeamPlaying = useCallback(
    (teamId: string) => {
      if (!teamId) return false;
      // Allow teams that are currently in this match
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
    // Check if either team is currently playing another match
    if (isTeamPlaying(homeTeamId) || isTeamPlaying(awayTeamId))
      return false;
    return true;
  }, [homeTeamId, awayTeamId, isTeamPlaying]);

  // Check if anything has changed
  const hasChanges = useMemo(() => {
    if (!match) return false;
    return homeTeamId !== match.homeTeamId || awayTeamId !== match.awayTeamId;
  }, [match, homeTeamId, awayTeamId]);

  const handleSwapTeams = () => {
    const temp = homeTeamId;
    setHomeTeamId(awayTeamId);
    setAwayTeamId(temp);
  };

  const handleSave = () => {
    if (!match || !isValidMatchup) return;

    setError("");

    // Same teams check
    if (homeTeamId === awayTeamId) {
      setError("A team cannot play against itself");
      return;
    }

    // Update teams if changed
    if (homeTeamId !== match.homeTeamId || awayTeamId !== match.awayTeamId) {
      // Check if we need to do a swap with another match
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

    onOpenChange(false);
  };

  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Edit Match{match?.position ? ` - Court ${match.position}` : ""}
          </DialogTitle>
          <DialogDescription>
            Change which teams are playing on this court
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Team Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Teams
            </label>

            <div className="flex items-center gap-3">
              {/* Home Team Select */}
              <div className="flex-1">
                <div className="relative">
                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                    style={{ backgroundColor: getTeamColor(homeTeamId) }}
                  />
                  <select
                    value={homeTeamId}
                    onChange={(e) => setHomeTeamId(e.target.value)}
                    className="w-full h-10 pl-8 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                    aria-label="Select home team"
                  >
                    <option value="">Select team...</option>
                    {availableTeams.map((team) => {
                      const playing = isTeamPlaying(team.id);
                      return (
                        <option
                          key={team.id}
                          value={team.id}
                          disabled={playing}
                        >
                          {team.name}
                          {playing ? " (Playing)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Swap Button */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleSwapTeams}
                className="shrink-0"
                aria-label="Swap home and away teams"
              >
                <Repeat className="w-4 h-4" />
              </Button>

              {/* Away Team Select */}
              <div className="flex-1">
                <div className="relative">
                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                    style={{ backgroundColor: getTeamColor(awayTeamId) }}
                  />
                  <select
                    value={awayTeamId}
                    onChange={(e) => setAwayTeamId(e.target.value)}
                    className="w-full h-10 pl-8 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                    aria-label="Select away team"
                  >
                    <option value="">Select team...</option>
                    {availableTeams.map((team) => {
                      const playing = isTeamPlaying(team.id);
                      return (
                        <option
                          key={team.id}
                          value={team.id}
                          disabled={playing}
                        >
                          {team.name}
                          {playing ? " (Playing)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {homeTeamId === awayTeamId && homeTeamId && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />A team cannot play against
                itself
              </p>
            )}

            {isTeamPlaying(homeTeamId) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getTeamName(homeTeamId)} is currently playing another match
              </p>
            )}

            {isTeamPlaying(awayTeamId) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getTeamName(awayTeamId)} is currently playing another match
              </p>
            )}
          </div>

          {/* Preview */}
          {homeTeamId && awayTeamId && homeTeamId !== awayTeamId && (
            <div className="mt-4 p-4 rounded-xl bg-accent/20 border border-border/30">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                Preview
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getTeamColor(homeTeamId) }}
                  />
                  <span className="font-medium">{getTeamName(homeTeamId)}</span>
                </div>
                <span className="text-muted-foreground font-bold">vs</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getTeamName(awayTeamId)}</span>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getTeamColor(awayTeamId) }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Swap indicator when team is in another pending match */}
          {swapInfo?.needsSwap && swapInfo.displacedTeamId && swapInfo.swappingTeamId && (
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{getTeamName(swapInfo.swappingTeamId)}</strong> is in
                  another match. Saving will swap{" "}
                  <strong>{getTeamName(swapInfo.displacedTeamId)}</strong> into
                  that match.
                </span>
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValidMatchup || !hasChanges}
            className="flex-1 gap-2"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
