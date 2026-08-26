"use client";

import type { ReactNode } from "react";
import { MbBadge } from "./Badge";
import { MbIconButton } from "./IconButton";
import { TeamMark } from "./Panel";
import type { MbTeam } from "./types";

/* ===========================================================================
   THE MATCH ROW — one row of a schedule, results ledger or live board.

   Contracts: it is a real `<button>` when interactive (native Space/Enter
   semantics for free); a COMPLETED match stays interactive so a result can be
   reviewed or corrected; the edit affordance is always painted at 44px —
   never hover-revealed, which on a phone means it does not exist. Won/lost
   never rests on a hue: the winner is BOLD, the loser muted, so the state
   survives a desaturated capture.
   =========================================================================== */

export type MbMatchRowStatus = "pending" | "live" | "completed";
export type MbMatchRowVariant = "schedule" | "result" | "live";

export interface MbMatchRowProps {
  /** Left-hand identifier — "R3 · M2", "#14". Rendered `tabular-nums`. */
  label?: string;
  /** Second meta word, usually the venue: "Court 2". */
  subLabel?: string;
  home: MbTeam | null;
  away: MbTeam | null;
  /** 1-based seeding position, drawn before the crest. */
  homeSeed?: number;
  awaySeed?: number;
  homeScore?: number;
  awayScore?: number;
  homeWon?: boolean;
  awayWon?: boolean;
  status: MbMatchRowStatus;
  /**
   * A walkover: one team advances and NOTHING was played. See `Measure` for
   * why this cannot be left to the score props.
   */
  bye?: boolean;
  variant?: MbMatchRowVariant;
  /** Opens the match. Omit and the row renders as static type. */
  onSelect?: () => void;
  /** Reassigns the teams. Omit and no edit control is drawn. */
  onEdit?: () => void;
  /** Names both controls for screen readers. Defaults to "{home} v {away}". */
  name?: string;
  className?: string;
}

/**
 * An empty side. TWO words for two different facts:
 *
 *   `TBD`  the slot exists and will be filled by the winner of an earlier match
 *   `—`    there is no opponent and never will be — the other side had a bye
 *
 * `BracketRail`'s cell draws the same pair for the same states. The em dash is
 * `aria-hidden` with the meaning spelled out beside it: a screen reader that
 * announces "em dash" has been told nothing.
 */
const EmptySide = ({ bye = false }: { bye?: boolean }) =>
  bye ? (
    <span className="matchbook-display text-[0.78rem] mb-track-display font-semibold text-mb-ink-muted">
      <span aria-hidden="true">—</span>
      <span className="sr-only">No opponent</span>
    </span>
  ) : (
    <span className="matchbook-display truncate text-[0.78rem] mb-track-display font-semibold text-mb-ink-muted">
      TBD
    </span>
  );

/**
 * Winner emphasis, reaching the name itself. `TeamMark` puts `className` on
 * its OUTER span and bakes `font-semibold` onto the name span inside, so a
 * plain `font-bold` passed in is a no-op. The name is always the mark's last
 * child (`reverse` only flips flex direction), and `.x > span:last-child`
 * (0,1,1) outranks `.font-semibold` (0,1,0).
 */
const MARK_WON = "[&>span:last-child]:font-bold";
const MARK_LOST = "[&>span:last-child]:text-mb-ink-muted";

/**
 * A seeding position, in the printed-draw box — the ONE seed mark in the
 * system, exported so the bracket cell, the rounds list and the draft preview
 * cannot draw three. Fixed `w-[18px]` and centred, so a 1 and a 16 cost the
 * layout the same and no name column moves between rounds.
 */
export const MbSeedBox = ({ value }: { value: number }) => (
  <span className="mb-seed-box w-[18px] shrink-0 justify-center px-0! py-0! matchbook-display text-[0.62rem] mb-track-nav font-bold tabular-nums text-mb-ink-muted">
    {value}
  </span>
);

/**
 * One figure per `1ch` box, so an N-figure value is exactly N × 1ch wide.
 *
 * `.mb-numeral-digit` is `globals.css`'s own cell — reused, not re-derived —
 * and it exists because Oswald ships no `tnum` table, so `tabular-nums` alone
 * is a no-op on this face and "18" and "19" measure differently.
 */
const Figures = ({ value }: { value: number }) => (
  <>
    {String(value)
      .split("")
      .map((figure, i) => (
        <span key={i} className="mb-numeral-digit">
          {figure}
        </span>
      ))}
  </>
);

/**
 * The centre column, at a FIXED track width. With an `auto` track the two
 * `1fr` name columns resized on every score tick (Oswald's figures are
 * proportional); the constant track plus `1ch`-boxed figures keep every glyph
 * still. Deliberately NOT `MbScoreNumeral` — its smallest step is a 30px
 * scoreboard numeral, not a row measure; the two guarantees it exists for
 * (constant box, still glyph) are provided here by the track and
 * `.mb-numeral-digit`.
 */
/* The value is also written as a LITERAL into the row's wide-cut grid class
   (`@min-[336px]:grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)]`): a container
   variant cannot come from an inline style, and Tailwind compiles nothing out
   of an interpolated class. Change both together. */
export const MB_SCORE_TRACK = 76;

const Measure = ({
  status,
  bye,
  homeScore,
  awayScore,
  homeWon,
  awayWon,
}: {
  status: MbMatchRowStatus;
  bye: boolean;
  homeScore?: number;
  awayScore?: number;
  homeWon: boolean;
  awayWon: boolean;
}) => {
  /* THE FABRICATED SCORELINE: the bracket generator writes a walkover as a
     COMPLETED match carrying `homeScore: 1, awayScore: 0` — bookkeeping that
     lets it name a `winnerId`, not a result anybody played. The word wins
     over the numerals and is checked FIRST — before the score-undefined
     guard — so no caller can reinstate the scoreline. */
  if (bye) {
    return (
      <span className="matchbook-display text-center text-[0.74rem] mb-track-status font-bold uppercase text-mb-ink-muted">
        Bye
      </span>
    );
  }
  if (status === "pending" || homeScore === undefined || awayScore === undefined) {
    return (
      <span className="matchbook-display text-center text-[0.74rem] mb-track-status font-bold text-mb-ink-muted">
        vs
      </span>
    );
  }
  const decided = status === "completed";
  const side = (won: boolean) =>
    !decided ? "font-bold" : won ? "font-bold" : "font-semibold text-mb-ink-muted";
  return (
    /* `end` then `start`: both scores hug the divider, so the reserve opens
       outward and the pair reads as a pair at 7–108 as well as at 21–18. */
    <span className="matchbook-display flex items-center justify-center gap-1 whitespace-nowrap text-[0.9rem] mb-track-display leading-none tabular-nums">
      <span className={`flex-1 text-right ${side(homeWon)}`}>
        <Figures value={homeScore} />
      </span>
      {/* `font-semibold`, not the inherited 400: the digits run at 600/700,
          and a 400 dash would be a third weight at one size. */}
      <span className="font-semibold text-mb-ink-muted">–</span>
      <span className={`flex-1 text-left ${side(awayWon)}`}>
        <Figures value={awayScore} />
      </span>
    </span>
  );
};

export const MbMatchRow = ({
  label,
  subLabel,
  home,
  away,
  homeSeed,
  awaySeed,
  homeScore,
  awayScore,
  homeWon = false,
  awayWon = false,
  status,
  bye = false,
  variant = "schedule",
  onSelect,
  onEdit,
  name,
  className = "",
}: MbMatchRowProps) => {
  const rowName = bye
    ? `${home?.name ?? away?.name ?? "TBD"} — bye, no opponent`
    : (name ?? `${home?.name ?? "TBD"} v ${away?.name ?? "TBD"}`);
  const scored =
    !bye && status !== "pending" && homeScore !== undefined && awayScore !== undefined;
  /* The control's name carries the score, because the numerals inside it are
     display type the screen reader should not read figure by figure. */
  const openName = scored
    ? `${home?.name ?? "TBD"} ${homeScore}, ${away?.name ?? "TBD"} ${awayScore}`
    : rowName;
  /* A bye is not a match: no sheet to open, no pair of teams to swap. The
     row refuses both HERE rather than trusting each caller to remember. */
  const openable = Boolean(onSelect) && !bye;
  const editable = Boolean(onEdit) && !bye;
  const markClass = (won: boolean) =>
    status !== "completed" || bye ? "" : won ? MARK_WON : MARK_LOST;

  const body = (
    /* `flex-col` below `sm` and one line from `sm` up: the meta cluster keeps
       its own line on a phone so the two names get the full width. */
    <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      {(label || subLabel || status === "live") && (
        <span className="flex shrink-0 items-center gap-2 sm:w-[104px]">
          {label && (
            <span className="mb-kicker whitespace-nowrap tabular-nums">{label}</span>
          )}
          {subLabel && (
            <span className="mb-kicker truncate tabular-nums">{subLabel}</span>
          )}
          {status === "live" && <MbBadge tone="live">Live</MbBadge>}
        </span>
      )}

      {/* No `justify-self`: a grid item with `justify-self` other than
          `stretch` is sized by its MAX-CONTENT, so the name stops truncating
          and runs through the score. Stretched and reversed, the away mark
          hugs the right edge and still truncates.

          Below 336px of CONTAINER (not viewport — a 274px panel row exists on
          a 1440px screen) the fixed claims on the line starve the names, so
          the row takes the same one-column cut as `MbMatchupPair`: one team
          per line, the scoreline between them, the away side un-mirrored.
          336 = 2 × (18 crest + 6 gap + 96 name) + 76 centre + 16 gaps, where
          96 keeps a two-word club name legible (`TeamName.tsx`).

          The template is a literal class per cut: Tailwind cannot compile a
          container variant out of `style`, and an interpolated `@min-[${n}px]:`
          compiles to nothing — `MB_SCORE_TRACK`'s 76 is written into the class. */}
      <span className="@container block min-w-0 flex-1">
        <span className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 @min-[336px]:grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)]">
          {home ? (
            <span className="flex min-w-0 items-center gap-1.5">
              {homeSeed !== undefined && <MbSeedBox value={homeSeed} />}
              <TeamMark team={home} size="sm" className={markClass(homeWon)} />
            </span>
          ) : (
            <EmptySide bye={bye} />
          )}
          <Measure
            status={status}
            bye={bye}
            homeScore={homeScore}
            awayScore={awayScore}
            homeWon={homeWon}
            awayWon={awayWon}
          />
          {/* `flex-row-reverse` is the MIRROR, and a mirror only means
              anything opposite something. Below the cut the away side sits
              under the home side rather than across from it, so it reads left
              to right like every other row in the app. */}
          {away ? (
            <span className="flex min-w-0 items-center gap-1.5 @min-[336px]:flex-row-reverse">
              {awaySeed !== undefined && <MbSeedBox value={awaySeed} />}
              <TeamMark
                team={away}
                size="sm"
                className={`@min-[336px]:flex-row-reverse ${markClass(awayWon)}`}
              />
            </span>
          ) : (
            <span className="flex @min-[336px]:justify-end">
              <EmptySide bye={bye} />
            </span>
          )}
        </span>
      </span>
    </span>
  );

  return (
    /* The rail is the row's state channel, drawn on the wrapper so it reaches
       the full row height including the edit key: RED for live (the same ink
       as the dot and the word inside the row), a muted tint for a finished
       result, nothing for an unplayed fixture. Never the sole carrier — the
       dot and the word survive greyscale on their own. */
    /* `py-1` and `gap-2` keep adjacent 44px targets 8px apart — without them
       stacked rows put two targets 1px apart and the edit key rides its
       button. */
    <div
      className={`mb-row-hover flex items-stretch gap-2 py-1 pr-1.5 ${className}`}
      /* A bye takes NO rail. The rail's two states are "in play" and "played",
         and a walkover is neither — `variant` arrives as `result` for it
         (nothing is pending about a bye), which would have marked a match that
         never happened as a finished one. */
      style={
        bye
          ? undefined
          : status === "live"
            ? { boxShadow: "inset 3px 0 0 var(--mb-red)" }
            : variant === "result"
              ? { boxShadow: "inset 3px 0 0 var(--mb-tint-3)" }
              : undefined
      }
    >
      {openable ? (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Open ${openName}`}
          className="mb-btn-touch flex min-w-0 flex-1 items-center px-3 py-2 text-left"
        >
          {body}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-center px-3 py-2.5">{body}</span>
      )}

      {editable && onEdit && (
        <span className="flex shrink-0 items-center">
          <MbIconButton
            icon="edit"
            label={`Change the teams in ${rowName}`}
            size="sm"
            onClick={onEdit}
          />
        </span>
      )}
    </div>
  );
};

/* ===========================================================================
   THE MATCHUP PAIR — two identities and their two figures, ONE markup that
   reflows. `@container` on the pair's own wrapper, because the same pair
   renders at 407px in one panel and 183px in another ON THE SAME SCREEN — a
   media query cannot tell them apart, and one markup means no second copy in
   the accessibility tree:

     wide    `minmax(0,1fr) auto minmax(0,1fr)`, away side `row-reverse`
             [crest] Home ....25  –  20.... Away [crest]
     narrow  one column, away side back to `row`, centre withdrawn
             [crest] Home ...................... 25
             [crest] Away ...................... 20

   The thresholds (336 for `sm`, 376 for `md`) are the container widths at
   which each name still gets a track a two-word club name survives.
   `gap-y-1.5` clears the 8px separation floor against the fixed bottom bar
   while still reading as two teams rather than one wrapped line.

   Both figures carry a `2ch` floor and `.mb-numeral-digit` cells, so a live
   score stepping 9 → 10 moves nothing — `MB_SCORE_TRACK`'s guarantee,
   restated per side because here each side carries its own figure.

   `MbMatchRow` is NOT rebuilt on this: it models seeds, byes and a
   not-yet-played measure, and its `Measure` is where the fabricated 1–0
   walkover is refused. What the two share — `Figures`, `EmptySide`, the
   emphasis pair — is shared.

   `Pair`, not `Matchup`: `useMatchbookHistory` already exports an `MbMatchup`
   and it is a different object — a rivalry, not a single match.
   =========================================================================== */

export type MbMatchupSize = "sm" | "md";

/**
 * The container-query cut per step. Every class here is a LITERAL string:
 * Tailwind scans source text, so an interpolated `@min-[${n}px]:` compiles to
 * nothing and the wide cut would silently never arrive.
 *
 * The centre is `hidden` by default and revealed at the cut, rather than shown
 * and hidden below it, so only the `@min-` variant is needed — and a pair with
 * no figures opts out by simply never being hidden.
 *
 * `mark` mirrors the away identity itself — crest outboard of its name — which
 * is what `TeamMark`'s `reverse` does everywhere else in the system. It is a
 * class rather than the prop because the prop is JS and the cut is CSS: the
 * same row is mirrored at 407px of container and stacked at 264px, and only
 * the stylesheet knows which.
 */
const MB_MATCHUP_CUT: Record<
  MbMatchupSize,
  { grid: string; away: string; mark: string; centre: string; awayFigure: string }
> = {
  sm: {
    grid: "@min-[336px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
    away: "@min-[336px]:flex-row-reverse",
    mark: "@min-[336px]:flex-row-reverse",
    centre: "@min-[336px]:inline-flex",
    awayFigure: "@min-[336px]:text-left",
  },
  md: {
    grid: "@min-[376px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
    away: "@min-[376px]:flex-row-reverse",
    mark: "@min-[376px]:flex-row-reverse",
    centre: "@min-[376px]:inline-flex",
    awayFigure: "@min-[376px]:text-left",
  },
};

/**
 * One side's figure, in a two-figure reserve.
 *
 * `text-right` in the narrow cut, where both figures sit in one right-hand
 * column; `text-left` for the away side once the cut mirrors it, so the pair
 * hugs the dash from both directions — the "end then start" the scoreline
 * above and `MbScoreboardHero` both already use.
 */
const MatchupFigure = ({
  value,
  emphasis,
  className = "",
}: {
  value: number;
  emphasis: string;
  className?: string;
}) => (
  <span
    className={`matchbook-display min-w-[2ch] shrink-0 text-right text-[0.9rem] mb-track-display leading-none tabular-nums ${emphasis} ${className}`}
  >
    <Figures value={value} />
  </span>
);

const MatchupSide = ({
  team,
  figure,
  markEmphasis,
  figureEmphasis,
  size,
  reverse = false,
  figureClass = "",
  reverseClass = "",
  markClass = "",
}: {
  team: MbTeam | null;
  figure?: number;
  markEmphasis: string;
  figureEmphasis: string;
  size: MbMatchupSize;
  reverse?: boolean;
  figureClass?: string;
  reverseClass?: string;
  markClass?: string;
}) => (
  <span className={`flex min-w-0 items-center gap-2 ${reverse ? reverseClass : ""}`}>
    {team ? (
      <TeamMark
        team={team}
        size={size}
        className={`min-w-0 flex-1 ${markClass} ${markEmphasis}`}
      />
    ) : (
      <span className="flex min-w-0 flex-1 items-center">
        <EmptySide />
      </span>
    )}
    {figure !== undefined && (
      <MatchupFigure value={figure} emphasis={figureEmphasis} className={figureClass} />
    )}
  </span>
);

export interface MbMatchupPairProps {
  home: MbTeam | null;
  away: MbTeam | null;
  /** Pass BOTH or neither — one figure alone is half a result. */
  homeScore?: number;
  awayScore?: number;
  /** Which side won, once the match is `decided`. Drives weight, never hue. */
  homeWon?: boolean;
  awayWon?: boolean;
  /** `false` while a match is in play: neither side is muted yet. */
  decided?: boolean;
  /**
   * The centre word when there are no figures — "vs" on a fixture. It stays
   * visible in the narrow cut, where it is the only thing saying the two names
   * are one match; the dash between two figures does not, because the figures
   * carry the measure on their own.
   */
  note?: ReactNode;
  size?: MbMatchupSize;
  className?: string;
}

export const MbMatchupPair = ({
  home,
  away,
  homeScore,
  awayScore,
  homeWon = false,
  awayWon = false,
  decided = true,
  note,
  size = "md",
  className = "",
}: MbMatchupPairProps) => {
  const cut = MB_MATCHUP_CUT[size];
  const scored = homeScore !== undefined && awayScore !== undefined;
  const markEmphasis = (won: boolean) =>
    !scored || !decided ? "" : won ? MARK_WON : MARK_LOST;
  const figureEmphasis = (won: boolean) =>
    !decided ? "font-bold" : won ? "font-bold" : "font-semibold text-mb-ink-muted";

  return (
    /* The container is its own element: an `@container` query styles a
       container's DESCENDANTS and never the container itself, so the grid
       whose columns change cannot also be the box being measured. */
    <span className={`@container block min-w-0 ${className}`}>
      <span
        className={`grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 ${cut.grid}`}
      >
        <MatchupSide
          team={home}
          figure={homeScore}
          markEmphasis={markEmphasis(homeWon)}
          figureEmphasis={figureEmphasis(homeWon)}
          size={size}
        />

        {scored ? (
          /* `font-semibold`, not the inherited 400: the figures beside it run
             at 600 and 700, and a 400 dash would be a third weight at one
             size — the same call `Measure` makes above. */
          <span
            aria-hidden="true"
            className={`matchbook-display hidden shrink-0 items-center justify-center text-[0.9rem] mb-track-display font-semibold leading-none text-mb-ink-muted ${cut.centre}`}
          >
            –
          </span>
        ) : (
          <span className="matchbook-display inline-flex shrink-0 items-center text-[0.74rem] mb-track-status font-bold text-mb-ink-muted">
            {note}
          </span>
        )}

        <MatchupSide
          team={away}
          figure={awayScore}
          markEmphasis={markEmphasis(awayWon)}
          figureEmphasis={figureEmphasis(awayWon)}
          size={size}
          reverse
          reverseClass={cut.away}
          markClass={cut.mark}
          figureClass={cut.awayFigure}
        />
      </span>
    </span>
  );
};
