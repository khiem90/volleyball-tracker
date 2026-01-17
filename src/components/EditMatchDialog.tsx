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
import { Users, Repeat, AlertCircle } from "lucide-react";
import type { Match, PersistentTeam, Competition } from "@/types/game";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";

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
  const { updateMatchTeams, canEdit } = useApp();
  const { getTeamName, getTeamColor } = useTeamsMap(teams);

  const [homeTeamId, setHomeTeamId] = useState<string>("");
  const [awayTeamId, setAwayTeamId] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Reset form when match changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (match) {
      setHomeTeamId(match.homeTeamId);
      setAwayTeamId(match.awayTeamId);
      setError("");
    }
  }, [match]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Get teams currently playing on OTHER courts (not this match)
  const teamsOnOtherCourts = useMemo(() => {
    if (!match) return new Set<string>();

    const otherActiveMatches = matches.filter(
      (m) =>
        m.id !== match.id &&
        (m.status === "pending" || m.status === "in_progress") &&
        m.competitionId === match.competitionId
    );

    const teamIds = new Set<string>();
    otherActiveMatches.forEach((m) => {
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

  // Check if a team is on another court
  const isTeamOnOtherCourt = useCallback((teamId: string) => {
    if (!teamId) return false;
    // Allow teams that are currently in this match
    if (match && (teamId === match.homeTeamId || teamId === match.awayTeamId)) {
      return false;
    }
    return teamsOnOtherCourts.has(teamId);
  }, [match, teamsOnOtherCourts]);

  // Check if the selected matchup is valid
  const isValidMatchup = useMemo(() => {
    if (!homeTeamId || !awayTeamId) return false;
    if (homeTeamId === awayTeamId) return false;
    // Check if either team is already on another court
    if (isTeamOnOtherCourt(homeTeamId) || isTeamOnOtherCourt(awayTeamId))
      return false;
    return true;
  }, [homeTeamId, awayTeamId, isTeamOnOtherCourt]);

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
      updateMatchTeams(match.id, homeTeamId, awayTeamId);
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
                      const onOtherCourt = isTeamOnOtherCourt(team.id);
                      return (
                        <option
                          key={team.id}
                          value={team.id}
                          disabled={onOtherCourt}
                        >
                          {team.name}
                          {onOtherCourt ? " (On Court)" : ""}
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
                      const onOtherCourt = isTeamOnOtherCourt(team.id);
                      return (
                        <option
                          key={team.id}
                          value={team.id}
                          disabled={onOtherCourt}
                        >
                          {team.name}
                          {onOtherCourt ? " (On Court)" : ""}
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

            {isTeamOnOtherCourt(homeTeamId) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getTeamName(homeTeamId)} is already playing on another court
              </p>
            )}

            {isTeamOnOtherCourt(awayTeamId) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getTeamName(awayTeamId)} is already playing on another court
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
