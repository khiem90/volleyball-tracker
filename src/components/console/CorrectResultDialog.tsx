"use client";

import { useState, type FormEvent } from "react";
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
import type { Match } from "@/types/game";
import type { ConsoleTeam, TeamLookup } from "./teamRefs";

/** A whole number of points, or null for anything else. */
const points = (value: string): number | null => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

/** One team's score: its mark and name over a field with large digits. */
const ScoreField = ({
  id,
  team,
  value,
  onChange,
}: {
  id: string;
  team: ConsoleTeam;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label htmlFor={id} className="flex min-w-0 flex-1 flex-col gap-1.5">
    <span className="flex min-w-0 items-center gap-2">
      <TeamMark name={team.name} color={team.color} size={22} />
      <span className="truncate text-label font-bold">{team.name}</span>
    </span>
    <span className="field min-h-14">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="text-center text-[1.5rem] font-bold tabular-nums"
        autoComplete="off"
      />
    </span>
  </label>
);

/**
 * The two score fields, seeded from the match as it stands. Save is offered
 * once both are whole numbers that are not tied. Keyed on the match by its
 * parent so a different match starts fresh.
 */
const ScoreForm = ({
  match,
  team,
  bracket,
  isBusy,
  error,
  onCancel,
  onSave,
}: {
  match: Match;
  team: TeamLookup;
  bracket: boolean;
  isBusy: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (homeScore: number, awayScore: number) => void;
}) => {
  const [home, setHome] = useState(String(match.homeScore));
  const [away, setAway] = useState(String(match.awayScore));
  const homeScore = points(home);
  const awayScore = points(away);
  const tied = homeScore !== null && homeScore === awayScore;
  const canSave = homeScore !== null && awayScore !== null && !tied && !isBusy;
  const series = (match.seriesLength ?? 1) > 1;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (homeScore === null || awayScore === null || !canSave) return;
    onSave(homeScore, awayScore);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          <Icon id="pencil" size={18} className="shrink-0" />
          Correct the score
        </DialogTitle>
        <DialogDescription>{explanation(match.forfeitedBy !== undefined, series, bracket)}</DialogDescription>
      </DialogHeader>
      <div className="flex items-end gap-3">
        <ScoreField
          id="correct-home-score"
          team={team(match.homeTeamId)}
          value={home}
          onChange={setHome}
        />
        {/* As tall as a field, so the dash sits level with the digits. */}
        <span className="flex h-14 items-center text-title font-bold text-ink-soft">–</span>
        <ScoreField
          id="correct-away-score"
          team={team(match.awayTeamId)}
          value={away}
          onChange={setAway}
        />
      </div>
      {(tied || error) && (
        <p role="alert" className="text-caption font-medium text-danger">
          {error ?? "A match cannot end in a tie."}
        </p>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isBusy}
          className="sm:flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!canSave} className="sm:flex-1">
          {isBusy ? <InlineSpinner /> : <Icon id="pencil" size={14} />}
          {isBusy ? "Saving..." : "Save score"}
        </Button>
      </DialogFooter>
    </form>
  );
};

/** What saving the score will do, for the match at hand. A bracket forfeit never gets here. */
const explanation = (forfeit: boolean, series: boolean, bracket: boolean): string => {
  if (forfeit && !bracket) return "This match was a forfeit. Saving a score records it as played.";
  const game = series
    ? "This is the score of the deciding game. Changing its winner moves that game to the other side"
    : "The winner follows the new score";
  return bracket
    ? `${game} and goes through in place of the old one. A change of winner is refused once the next match has started.`
    : `${game}, and the standings recalculate.`;
};

/**
 * The correction of a completed result, reached from Schedule or the
 * Bracket tab. Open while `match` is set. The engine has the last word: a
 * score it refuses, such as one that would leave a best-of undecided or
 * change the winner of a bracket match whose next match has started, comes
 * back as `error`.
 */
export const CorrectResultDialog = ({
  match,
  team,
  bracket,
  isBusy,
  error,
  onClose,
  onSave,
}: {
  match: Match | null;
  team: TeamLookup;
  /** Whether the match is in a bracket, where a new winner goes through. */
  bracket: boolean;
  isBusy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (homeScore: number, awayScore: number) => void;
}) => (
  <Dialog
    open={match !== null}
    onOpenChange={(open) => {
      if (!open && !isBusy) onClose();
    }}
  >
    {/* One column that cannot grow past the dialog, so a long team name is cut short over its field. */}
    <DialogContent className="grid-cols-1 sm:max-w-md">
      {match && (
        <ScoreForm
          key={match.id}
          match={match}
          team={team}
          bracket={bracket}
          isBusy={isBusy}
          error={error}
          onCancel={onClose}
          onSave={onSave}
        />
      )}
    </DialogContent>
  </Dialog>
);
