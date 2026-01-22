"use client";

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
import { useEditMatchDialog } from "./useEditMatchDialog";
import { TeamSelectDropdown } from "./TeamSelectDropdown";
import { MatchPreview } from "./MatchPreview";
import { SwapWarning } from "./SwapWarning";

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
  const {
    homeTeamId,
    setHomeTeamId,
    awayTeamId,
    setAwayTeamId,
    error,
    swapInfo,
    availableTeams,
    isValidMatchup,
    hasChanges,
    canEdit,
    getTeamName,
    getTeamColor,
    isTeamPlaying,
    handleSwapTeams,
    handleSave,
  } = useEditMatchDialog({
    match,
    matches,
    teams,
    competition,
    onClose: () => onOpenChange(false),
  });

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
              <TeamSelectDropdown
                value={homeTeamId}
                onChange={setHomeTeamId}
                teams={availableTeams}
                teamColor={getTeamColor(homeTeamId)}
                isTeamPlaying={isTeamPlaying}
                label="Select home team"
              />

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

              <TeamSelectDropdown
                value={awayTeamId}
                onChange={setAwayTeamId}
                teams={availableTeams}
                teamColor={getTeamColor(awayTeamId)}
                isTeamPlaying={isTeamPlaying}
                label="Select away team"
              />
            </div>

            {/* Validation errors */}
            {homeTeamId === awayTeamId && homeTeamId && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                A team cannot play against itself
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

          <MatchPreview
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
            getTeamName={getTeamName}
            getTeamColor={getTeamColor}
          />

          <SwapWarning swapInfo={swapInfo} getTeamName={getTeamName} />

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
