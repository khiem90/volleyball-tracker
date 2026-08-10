"use client";

import { MbBadge } from "@/components/matchbook/Badge";
import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbScoreNumeral } from "@/components/matchbook/ScoreNumeral";
import { Crest } from "@/components/matchbook/Panel";
import { crestForTeam } from "@/components/matchbook/types";
import type { Match, PersistentTeam } from "@/types/game";

/* ===========================================================================
   THE MATCH SHEET

   One dialog for all three match states, which is what makes BUG-7 fixable:
   a completed match is now openable, its result is shown, and there is a route
   to correct it. The shipped dialog only ever saw a not-yet-finished match
   because the row that opened it refused to fire on `status === "completed"`.

   It is also the bracket cell's edit path. A 156 x 90 cell has no room for a
   44px pencil that is honestly painted at all times, so "Change teams" is an
   action here instead — which removes the last hover-only control on the
   screen (BUG-9).
   =========================================================================== */

const Side = ({
  team,
  score,
  show,
  won,
  reverse = false,
}: {
  team: PersistentTeam | undefined;
  score: number;
  show: boolean;
  won: boolean;
  reverse?: boolean;
}) => (
  <div
    className={`flex min-w-0 flex-col items-center gap-2 ${reverse ? "" : ""}`}
  >
    <Crest
      team={{
        name: team?.name ?? "TBD",
        crest: crestForTeam(team?.id ?? "", team?.name ?? ""),
      }}
      size={40}
    />
    <p
      className={`matchbook-display w-full text-center text-[0.9rem] leading-tight [overflow-wrap:anywhere] ${
        won ? "font-bold" : "font-semibold"
      }`}
    >
      {team?.name ?? "To be decided"}
    </p>
    {/* No `digits` override: `digits={2}` reserved a 33px box that a 3-digit
        score rendered 42.39px into. The default reserve is three figures. */}
    {show && <MbScoreNumeral value={score} size="compact" tone="ink" />}
  </div>
);

export const MatchActionDialog = ({
  open,
  onOpenChange,
  match,
  teams,
  venueLabel,
  canEdit,
  onPlayMatch,
  onEditMatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  teams: PersistentTeam[];
  /** "Round 3 · Match 2" or "Court 1" — whatever names the fixture. */
  venueLabel?: string;
  canEdit: boolean;
  /**
   * Opens the scoring console. Optional on purpose: a shared-mode VIEWER can
   * open this sheet from a results row and must still see the scoreline, but
   * must not be handed a route into a console they cannot use.
   */
  onPlayMatch?: () => void;
  onEditMatch?: () => void;
}) => {
  if (!match) return null;

  const home = teams.find((t) => t.id === match.homeTeamId);
  const away = teams.find((t) => t.id === match.awayTeamId);
  const live = match.status === "in_progress";
  const done = match.status === "completed";

  const primaryLabel = done
    ? "Open match"
    : live
      ? "Continue scoring"
      : "Start match";

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${home?.name ?? "TBD"} v ${away?.name ?? "TBD"}`}
      icon="volleyball"
      kicker={venueLabel}
      size="sm"
    >
      <MbDialogBody className="flex flex-col gap-4">
        <div className="flex items-center justify-center">
          {live ? (
            <MbBadge tone="live" variant="framed" size="md">
              Live
            </MbBadge>
          ) : done ? (
            <MbBadge tone="final" variant="framed" size="md">
              Final
            </MbBadge>
          ) : (
            <MbBadge tone="neutral" variant="framed" size="md">
              Not started
            </MbBadge>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
          <Side
            team={home}
            score={match.homeScore}
            show={!!(live || done)}
            won={match.winnerId === match.homeTeamId}
          />
          <span className="matchbook-display pt-10 text-[0.8rem] font-semibold text-mb-ink-muted">
            {live || done ? "–" : "vs"}
          </span>
          <Side
            team={away}
            score={match.awayScore}
            show={!!(live || done)}
            won={match.winnerId === match.awayTeamId}
            reverse
          />
        </div>

        {match.seriesLength && match.seriesLength > 1 && (
          <p className="mb-kicker text-center tabular-nums">
            Game {Math.min(match.seriesGame ?? 1, match.seriesLength)} of{" "}
            {match.seriesLength} · series {match.homeWins ?? 0}–{match.awayWins ?? 0}
          </p>
        )}

        <p className="text-center text-[0.82rem] leading-[1.5] text-mb-ink-muted">
          {done
            ? "Opening a finished match lets you review it and correct the score."
            : live
              ? "The scoring console picks up where this match left off."
              : "Opening the scoring console starts this match."}
        </p>
      </MbDialogBody>

      <MbDialogFooter>
        {canEdit && onEditMatch && !live && !done && (
          <MbButton
            variant="outline-navy"
            size="lg"
            icon="swap"
            onClick={() => {
              onOpenChange(false);
              onEditMatch();
            }}
          >
            Change teams
          </MbButton>
        )}
        {onPlayMatch && (
          <MbButton variant="coral" size="lg" icon="quick" onClick={onPlayMatch}>
            {primaryLabel}
          </MbButton>
        )}
      </MbDialogFooter>
    </MbDialog>
  );
};
