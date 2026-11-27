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
import { InlineSpinner } from "@/components/shared";
import { Icon } from "@/components/shared/Icon";
import { TeamMark } from "@/components/shared/TeamMark";
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
      {/* One column that cannot grow past the dialog, so a long team name is cut short in its row. */}
      <DialogContent
        className={`grid-cols-1 ${showPlayInSelection ? "sm:max-w-lg" : "sm:max-w-md"}`}
      >
        <DialogHeader>
          <DialogTitle>
            <Icon id="play" size={18} className="shrink-0" />
            Start the tournament?
          </DialogTitle>
          <DialogDescription>
            This schedules the {formatLabel(tournament.format).toLowerCase()} for {teamCount}{" "}
            teams and opens the courts.
          </DialogDescription>
        </DialogHeader>

        {showPlayInSelection && (
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-label font-semibold">
                Pick {playInTeamCount} team{playInTeamCount > 1 ? "s" : ""} to play in
              </p>
              <span className="shrink-0 text-caption tabular-nums text-ink-soft">
                {selectedPlayInTeamIds.length}/{playInTeamCount} picked
              </span>
            </div>
            <p className="mb-3 text-caption text-ink-soft">
              They play {playInMatchCount} play-in match{playInMatchCount > 1 ? "es" : ""}. The
              other {teamCount - playInTeamCount} team{teamCount - playInTeamCount > 1 ? "s" : ""}{" "}
              get a bye into the next round.
            </p>
            {/* The padding keeps a focus ring clear of the edge the list scrolls under. */}
            <div className="-m-1 flex max-h-60 flex-col gap-1.5 overflow-y-auto p-1">
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
                    aria-pressed={isSelected}
                    className={`flex min-h-11 w-full shrink-0 items-center gap-2.5 rounded-tile border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-action bg-action-tint"
                        : isDisabled
                          ? "cursor-not-allowed border-ink-soft/75 opacity-45"
                          : "border-ink-soft/75 hover:bg-ink/4"
                    }`}
                  >
                    <TeamMark name={team.name} color={team.color} size={22} />
                    <span className="min-w-0 flex-1 truncate text-body font-medium">{team.name}</span>
                    {isSelected && <Icon id="check" size={18} className="shrink-0 text-action" />}
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
            {isStarting ? <InlineSpinner /> : <Icon id="play" size={14} />}
            {isStarting ? "Starting..." : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
