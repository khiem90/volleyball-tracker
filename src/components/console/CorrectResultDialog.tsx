"use client";

import { useState, type FormEvent } from "react";
import { Loader2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Match } from "@/types/game";
import type { TeamLookup } from "./teamRefs";

/** A whole number of points, or null for anything else. */
const points = (value: string): number | null => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

const ScoreField = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label htmlFor={id} className="flex min-w-0 flex-1 flex-col gap-1.5">
    <span className="matchbook-display truncate text-[0.78rem] font-bold">{label}</span>
    <span className="mb-input py-[0.45rem]">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="text-center text-[1.4rem] font-bold tabular-nums"
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
        <DialogTitle className="flex items-center gap-2">
          <PencilLine className="h-5 w-5" />
          Correct the score
        </DialogTitle>
        <DialogDescription>{explanation(match.forfeitedBy !== undefined, series, bracket)}</DialogDescription>
      </DialogHeader>
      <div className="flex items-end gap-3">
        <ScoreField
          id="correct-home-score"
          label={team(match.homeTeamId).name}
          value={home}
          onChange={setHome}
        />
        <span className="matchbook-display pb-3 text-[0.8rem] font-bold text-mb-ink-muted">
          –
        </span>
        <ScoreField
          id="correct-away-score"
          label={team(match.awayTeamId).name}
          value={away}
          onChange={setAway}
        />
      </div>
      {(tied || error) && (
        <p role="alert" className="text-[0.8rem] font-medium text-mb-red">
          {error ?? "A match cannot end in a tie."}
        </p>
      )}
      <DialogFooter className="flex-row gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isBusy}
          className="min-h-11 flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!canSave} className="min-h-11 flex-1 gap-2">
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
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
    <DialogContent className="sm:max-w-md">
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
