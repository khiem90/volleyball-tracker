"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Check } from "lucide-react";
import type { PersistentTeam, CompetitionType } from "@/types/game";

interface StartCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeLabel: string;
  teamCount: number;
  teams?: PersistentTeam[];
  competitionType?: CompetitionType;
  playInMatchCount?: number;
  onStart: (byeTeamIds?: string[]) => void;
}

export const StartCompetitionDialog = ({
  open,
  onOpenChange,
  typeLabel,
  teamCount,
  teams = [],
  competitionType,
  playInMatchCount = 0,
  onStart,
}: StartCompetitionDialogProps) => {
  const isEliminationBracket =
    competitionType === "single_elimination" ||
    competitionType === "double_elimination";

  // Number of teams that need to play in play-in matches
  const playInTeamCount = playInMatchCount * 2;
  const showPlayInSelection = isEliminationBracket && playInMatchCount > 0;

  // State for selected play-in teams (teams that will play in play-in matches)
  const [selectedPlayInTeamIds, setSelectedPlayInTeamIds] = useState<string[]>(
    []
  );

  // Get the last N teams as default play-in teams (lowest seeds play in play-in)
  const defaultPlayInTeamIds = useMemo(() => {
    if (!showPlayInSelection || teams.length === 0) return [];
    return teams.slice(-playInTeamCount).map((t) => t.id);
  }, [showPlayInSelection, teams, playInTeamCount]);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPlayInTeamIds(defaultPlayInTeamIds);
    }
  }, [open, defaultPlayInTeamIds]);

  const handleToggleTeam = (teamId: string) => {
    setSelectedPlayInTeamIds((prev) => {
      if (prev.includes(teamId)) {
        return prev.filter((id) => id !== teamId);
      }
      if (prev.length < playInTeamCount) {
        return [...prev, teamId];
      }
      return prev;
    });
  };

  const handleStart = () => {
    if (showPlayInSelection && selectedPlayInTeamIds.length === playInTeamCount) {
      // Calculate bye teams = all teams NOT in play-in
      const byeTeamIds = teams
        .filter((t) => !selectedPlayInTeamIds.includes(t.id))
        .map((t) => t.id);
      onStart(byeTeamIds);
    } else {
      onStart();
    }
  };

  const canStart =
    !showPlayInSelection || selectedPlayInTeamIds.length === playInTeamCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={showPlayInSelection ? "sm:max-w-lg" : "sm:max-w-md"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Start Competition?
          </DialogTitle>
          <DialogDescription>
            This will generate the {typeLabel.toLowerCase()} schedule for{" "}
            {teamCount} teams. You won&apos;t be able to add or remove teams
            after starting.
          </DialogDescription>
        </DialogHeader>

        {showPlayInSelection && (
          <div className="py-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                Select {playInTeamCount} team{playInTeamCount > 1 ? "s" : ""} for
                play-in {playInMatchCount > 1 ? "matches" : "match"}
              </p>
              <span className="text-xs text-muted-foreground">
                {selectedPlayInTeamIds.length}/{playInTeamCount} selected
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Selected teams will compete in {playInMatchCount} play-in match
              {playInMatchCount > 1 ? "es" : ""}. The other{" "}
              {teamCount - playInTeamCount} team
              {teamCount - playInTeamCount > 1 ? "s" : ""} will receive byes.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {teams.map((team) => {
                const isSelected = selectedPlayInTeamIds.includes(team.id);
                const isDisabled =
                  !isSelected && selectedPlayInTeamIds.length >= playInTeamCount;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleToggleTeam(team.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-accent/50"
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="flex-1 truncate text-sm">{team.name}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            {selectedPlayInTeamIds.length !== playInTeamCount && (
              <p className="text-xs text-amber-500 mt-2">
                Please select exactly {playInTeamCount} team
                {playInTeamCount > 1 ? "s" : ""} for play-in
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className="flex-1 gap-2 shadow-lg shadow-primary/20"
          >
            <Play className="w-4 h-4" />
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
