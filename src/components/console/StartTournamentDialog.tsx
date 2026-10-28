"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { InlineSpinner } from "@/components/shared";
import { formatLabel, isBracketFormat } from "@/lib/formats";
import { getPlayInMatchCount } from "@/lib/singleElimination";
import type { PersistentTeam, Tournament } from "@/types/game";

interface StartTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament;
  /** The entries as they should be shown, in seeding order. */
  teams: PersistentTeam[];
  isStarting: boolean;
  onStart: (byeTeamIds?: string[]) => void;
}

/**
 * The confirm before a draft goes live. A bracket whose team count is not a
 * power of two asks which teams play in; the rest get a bye into the next
 * round.
 */
export const StartTournamentDialog = ({
  open,
  onOpenChange,
  tournament,
  teams,
  isStarting,
  onStart,
}: StartTournamentDialogProps) => {
  const teamCount = tournament.teamIds.length;
  const playInMatchCount = isBracketFormat(tournament.format)
    ? getPlayInMatchCount(teamCount)
    : 0;
  const playInTeamCount = playInMatchCount * 2;
  const showPlayInSelection = playInMatchCount > 0;

  const [selectedPlayInTeamIds, setSelectedPlayInTeamIds] = useState<string[]>([]);

  // The lowest seeds play in by default.
  const defaultPlayInTeamIds = useMemo(
    () => (showPlayInSelection ? teams.slice(-playInTeamCount).map((t) => t.id) : []),
    [showPlayInSelection, teams, playInTeamCount],
  );

  // Reset the selection each time the dialog opens (render-time state adjustment).
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSelectedPlayInTeamIds(defaultPlayInTeamIds);
  }

  const toggleTeam = (teamId: string) => {
    setSelectedPlayInTeamIds((prev) => {
      if (prev.includes(teamId)) return prev.filter((id) => id !== teamId);
      if (prev.length < playInTeamCount) return [...prev, teamId];
      return prev;
    });
  };

  const handleStart = () => {
    if (showPlayInSelection && selectedPlayInTeamIds.length === playInTeamCount) {
      onStart(teams.filter((t) => !selectedPlayInTeamIds.includes(t.id)).map((t) => t.id));
    } else {
      onStart();
    }
  };

  const canStart =
    !isStarting && (!showPlayInSelection || selectedPlayInTeamIds.length === playInTeamCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={showPlayInSelection ? "sm:max-w-lg" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            <MbIcon id="play" size={18} className="shrink-0" />
            Start the tournament?
          </DialogTitle>
          <DialogDescription>
            This schedules the {formatLabel(tournament.format).toLowerCase()} for {teamCount}{" "}
            teams and opens the courts.
          </DialogDescription>
        </DialogHeader>

        {showPlayInSelection && (
          <div className="py-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">
                Pick {playInTeamCount} team{playInTeamCount > 1 ? "s" : ""} to play in
              </p>
              <span className="text-xs text-mb-ink-muted">
                {selectedPlayInTeamIds.length}/{playInTeamCount} picked
              </span>
            </div>
            <p className="mb-3 text-xs text-mb-ink-muted">
              They play {playInMatchCount} play-in match{playInMatchCount > 1 ? "es" : ""}. The
              other {teamCount - playInTeamCount} team{teamCount - playInTeamCount > 1 ? "s" : ""}{" "}
              get a bye into the next round.
            </p>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {teams.map((team) => {
                const isSelected = selectedPlayInTeamIds.includes(team.id);
                const isDisabled =
                  !isSelected && selectedPlayInTeamIds.length >= playInTeamCount;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleTeam(team.id)}
                    disabled={isDisabled}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-[4px] border bg-mb-paper-bright px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-mb-navy bg-mb-navy/6"
                        : isDisabled
                          ? "cursor-not-allowed border-mb-rule opacity-50"
                          : "border-mb-rule hover:bg-mb-navy/6"
                    }`}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-mb-navy"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="flex-1 truncate text-sm">{team.name}</span>
                    {isSelected && <MbIcon id="check" size={16} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={!canStart} className="sm:flex-1">
            {isStarting ? <InlineSpinner /> : <MbIcon id="play" size={14} />}
            {isStarting ? "Starting..." : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
