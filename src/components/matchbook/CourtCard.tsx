"use client";

import { MbBadge } from "./Badge";
import { MbButton } from "./Button";
import { MbIconButton } from "./IconButton";
import { MbScoreNumeral } from "./ScoreNumeral";
import { Crest } from "./Panel";
import type { MbTeam } from "./types";

/* ===========================================================================
   THE COURT CARD (charter §2.3, W4 / P3a)

   `ActiveCourtCard.tsx` and `TwoMatchCourtCard.tsx` are 250 lines each and
   ~85% identical. Both carry the same three defects:

     BUG-6  With `instantWinEnabled` the card click AND the Play/Continue button
            are both gated off (`ActiveCourtCard.tsx:66-87,168-183`), so on the
            win2out fixture the ONLY interaction is "tap a team to declare a
            winner" — a real score can no longer be kept on a live match. Here
            both paths are always available: the coral Play/Continue button is
            unconditional and the two instant-win keys are additive.
     BUG-9  The edit pencil is `h-8 w-8` and hover-revealed. Here it is a
            persistent 44px `MbIconButton` in the card's top-right.
     R9     "Court" was hardcoded in several strings. The venue word is a
            required prop and comes from `useTerminology` at every call site.

   Team identity is a crest and a name (invariant 21) — the shipped card drew a
   `Users` glyph on a team-coloured gradient tile, which is a person pictogram
   standing in for a team, twice per card.
   =========================================================================== */

export type MbCourtStatus = "pending" | "live";

export interface MbCourtCardProps {
  /** Venue number. Rendered as "{Venue} {court}". */
  court: number;
  /** The venue word, singular, already capitalised: "Court", "Field", "Table". */
  venue: string;
  home: MbTeam;
  away: MbTeam;
  homeScore: number;
  awayScore: number;
  status: MbCourtStatus;
  /** One quiet line under each name: a streak, a crown tally, "1/2 matches". */
  homeSub?: string;
  awaySub?: string;
  canEdit: boolean;
  /** False in a shared-mode viewer: the scoring console is not reachable. */
  canPlay: boolean;
  instantWin: boolean;
  onPlay?: () => void;
  onEdit?: () => void;
  onInstantWin?: (winnerId: "home" | "away") => void;
  className?: string;
}

/**
 * One half of the card.
 *
 * The mirror is `sm:` only. Measured at 390px, the three-column scoreline gives
 * each side ~100px including a 38px crest, so "Streak 1 · one more takes the
 * crown" set as "STREAK 1…" and the opponent's name as "NO CROW…". Below `sm`
 * the card stacks instead — home, score, away — and each side gets the full
 * panel width, which is the only way both the name and its sub-line survive.
 */
const Side = ({
  team,
  sub,
  reverse = false,
}: {
  team: MbTeam;
  sub?: string;
  reverse?: boolean;
}) => (
  /* `gap-3`, not `gap-2.5`: 10px was the only gap value on this screen that
     came from a W4 file and was off the 4/6/8/12/16 ladder — measured twice on
     `w2o-live@1440`, against 8px ×345 and 12px ×100 (rubric 2.3). 12px is what
     every other crest-and-name cluster on the screen already uses. */
  <div
    className={`flex min-w-0 items-center gap-3 ${
      reverse ? "sm:flex-row-reverse sm:text-right" : ""
    }`}
  >
    <Crest team={team} size={34} />
    <div className="min-w-0">
      {/* `display/panel-title`'s tuple, reused rather than a fourth 0.95rem
          tracking. The card used 0.02em here and the panel head above it uses
          0.05em, which is a size/weight pair carrying two trackings on one
          screen (rubric 1.3). */}
      <p className="matchbook-display truncate text-[0.95rem] font-bold leading-tight tracking-[0.05em]">
        {team.name}
      </p>
      {sub && <p className="mb-kicker truncate tabular-nums">{sub}</p>}
    </div>
  </div>
);

export const MbCourtCard = ({
  court,
  venue,
  home,
  away,
  homeScore,
  awayScore,
  status,
  homeSub,
  awaySub,
  canEdit,
  canPlay,
  instantWin,
  onPlay,
  onEdit,
  onInstantWin,
  className = "",
}: MbCourtCardProps) => {
  const live = status === "live";

  return (
    <article className={`flex flex-col gap-3 px-4 py-3.5 ${className}`}>
      <header className="flex items-center gap-2">
        {/* `.mb-kicker`, because that is what this is: a label for the card
            below it, not a rank above the team names. It also retires a
            0.82rem/700/0.08em tuple that existed for this one heading. */}
        <h3 className="mb-kicker tabular-nums">
          {venue} {court}
        </h3>
        {live ? (
          <MbBadge tone="live">Live</MbBadge>
        ) : (
          <MbBadge tone="neutral">Ready</MbBadge>
        )}
        {canEdit && onEdit && (
          <span className="ml-auto">
            <MbIconButton
              icon="edit"
              label={`Change the teams on ${venue} ${court}`}
              size="sm"
              onClick={onEdit}
              /* Reassigning teams mid-point would orphan a live score, which
                 is why the shipped card gated it on `pending` too. It stays
                 painted and disabled rather than vanishing, so the control's
                 existence does not depend on the match state (invariant 36). */
              disabled={live}
            />
          </span>
        )}
      </header>

      {/* Grid, never flex: the two name cells must be able to shrink under a
          40-character team name (`.mb-scoreline` states the same rule). One
          column below `sm`, three from `sm` up. */}
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3 [&>*]:min-w-0">
        <Side team={home} sub={homeSub} />

        <div className="flex flex-col items-center gap-1">
          {live ? (
            /* No `digits` override. `digits={2}` reserved 33px and a 3-digit
               score rendered at 42.39px, overflowing its own parent mid-match
               — the exact reflow `MbScoreNumeral` exists to prevent. The
               component's own default reserves three, which is the real
               ceiling for everything this app scores.

               The divider is `.mb-rule-vertical`, the same hairline
               `MbScoreboardHero` sets between its two numerals, rather than a
               1.1rem en dash that existed at no named step. */
            <div className="flex items-stretch justify-center gap-2">
              <MbScoreNumeral value={homeScore} size="compact" align="end" />
              <span className="mb-rule-vertical" />
              <MbScoreNumeral value={awayScore} size="compact" align="start" />
            </div>
          ) : (
            <span className="mb-score-box">VS</span>
          )}
        </div>

        <Side team={away} sub={awaySub} reverse />
      </div>

      {/* One polite sentence for the pair. The numerals themselves are
          `aria-hidden` by default, so only one score value is in the tree. */}
      <p className="sr-only">
        {live
          ? `${home.name} ${homeScore}, ${away.name} ${awayScore}`
          : `${home.name} versus ${away.name}, not started`}
      </p>

      {canPlay && (
        <div className="flex flex-col gap-2">
          {/* Coral is the LIVE court's, and only the live court's. Painting
              "Start match" on an idle court identically to "Continue scoring"
              on a running one put the same emphasis on the thing already
              happening and the thing that has not started, and it spent two
              of the screen's coral jobs on one panel (rubric 3.4, 8.2). */}
          <MbButton
            variant={live ? "coral" : "outline-navy"}
            icon={live ? "live" : "quick"}
            fullWidth
            onClick={onPlay}
          >
            {live ? "Continue scoring" : "Start match"}
          </MbButton>

          {instantWin && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <MbButton
                  variant="outline-navy"
                  size="sm"
                  onClick={() => onInstantWin?.("home")}
                >
                  <span className="truncate">Win: {home.name}</span>
                </MbButton>
                <MbButton
                  variant="outline-navy"
                  size="sm"
                  onClick={() => onInstantWin?.("away")}
                >
                  <span className="truncate">Win: {away.name}</span>
                </MbButton>
              </div>
              <p className="mb-kicker">Instant win — records the result with no score.</p>
            </>
          )}
        </div>
      )}
    </article>
  );
};
