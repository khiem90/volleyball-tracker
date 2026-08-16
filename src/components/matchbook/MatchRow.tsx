"use client";

import type { ReactNode } from "react";
import { MbBadge } from "./Badge";
import { MbIconButton } from "./IconButton";
import { TeamMark } from "./Panel";
import type { MbTeam } from "./types";

/* ===========================================================================
   THE MATCH ROW (charter §2.3, W4 / P3a)

   One row of a schedule, a results ledger or a live board. Five hand-written
   variants of it ship today — `CompetitionRoundRobinSection`, the two halves of
   `MatchHistorySection` (`sm:hidden` and `hidden sm:flex`, the same data in two
   markups that must be kept in sync), the Compete console's schedule strip and
   its results strip — and they disagree about which parts are clickable, where
   the score sits and whether the edit control exists on touch at all.

   Three things this row fixes that the shipped ones get wrong:

     1. It is a real `<button>` when it is interactive. The shipped RR row is a
        `<div role="button">` with a keydown handler that never calls
        `preventDefault`, so Space activated the row AND scrolled the page
        (invariant 48). A native button does both correctly for free.
     2. A COMPLETED match is interactive. `CompetitionRoundRobinSection.tsx:59`
        gates `onMatchClick` on `status !== "completed"`, so a finished match
        could not be opened, reviewed or corrected from anywhere in the app
        (BUG-7).
     3. The edit affordance is always painted at 44px. It was
        `opacity-0 group-hover:opacity-100` in three places, which on a phone
        means it does not exist (BUG-9, invariant 36).

   Won/lost never rests on a hue: the winner's name and score are BOLD and the
   loser's are muted, which survives a desaturated capture (invariant 13).
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
   * why this cannot be left to the score props (F12).
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
 * An empty side. TWO words, because they are two different facts and the app
 * was printing one of them for both (F12/F13).
 *
 *   `TBD`  the slot exists and will be filled by the winner of an earlier match
 *   `—`    there is no opponent and never will be — the other side had a bye
 *
 * `BracketRail`'s cell draws exactly this pair for exactly these two states, so
 * the schedule and the bracket beside it say the same word about the same
 * match. The em dash is `aria-hidden` with the meaning spelled out beside it:
 * a screen reader that announces "em dash" has been told nothing.
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
 * Winner emphasis, reaching the name itself.
 *
 * `TeamMark` puts `className` on its OUTER span and bakes `font-semibold` onto
 * the name span inside it, so the `font-bold` this row used to pass was a
 * no-op on both sides — the file's own claim that "the winner's name is BOLD"
 * was false as shipped. The name is always the mark's last child (crest first,
 * `reverse` only flips the flex direction), so an arbitrary child variant
 * reaches it: both declarations are Tailwind utilities in the same layer, and
 * `.x > span:last-child` (0,1,1) outranks `.font-semibold` (0,1,0).
 */
const MARK_WON = "[&>span:last-child]:font-bold";
const MARK_LOST = "[&>span:last-child]:text-mb-ink-muted";

/**
 * A seeding position, in the printed-draw box — the ONE seed mark in the
 * system, exported so the bracket cell, the rounds list and the draft preview
 * cannot draw three.
 *
 * `.mb-seed-box` is `globals.css`'s own class and had zero consumers in the
 * whole tree until these three; rubric 4's 8-anchor requires seeds and byes to
 * be explicit. Fixed `w-[18px]` and centred, so a 1 and a 16 cost the layout
 * the same and no name column moves between rounds — the same constant-box
 * argument the score track makes below.
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
 * The centre column, at a FIXED track width.
 *
 * Measured before this change, driving one live row through 12 → 123 → 9: the
 * away `TeamMark` moved 665.52 → 669.30 → 662.77px and both name cells resized
 * by 6.53px, because the centre track was `auto` and Oswald's figures are
 * proportional. Two things fix it and both are needed — the grid track is a
 * constant `MB_SCORE_TRACK` so the two `1fr` name columns cannot change, and
 * every figure is boxed to `1ch` so no glyph moves inside the track either.
 *
 * It is deliberately NOT `MbScoreNumeral`: that component's smallest step is
 * `display/stat-lg` (1.875rem / 30px), which is a scoreboard numeral, and a
 * 15-row results ledger set in 30px figures is not this screen's hierarchy —
 * the shipped Compete console sets its own row scoreline at 0.95rem/700. The
 * two properties `MbScoreNumeral` exists to guarantee (a constant box and a
 * still glyph) are guaranteed here by the track and by `.mb-numeral-digit`.
 * The score IS `MbScoreNumeral` everywhere it is the object rather than a row
 * measure: the live scoreboard, the court card and the match sheet.
 */
/* The value is also written as a LITERAL into the row's wide-cut grid class
   (`@min-[336px]:grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)]`), because a
   container variant cannot come from an inline style and Tailwind compiles
   nothing out of an interpolated class. This constant stays as the place the
   76 is explained and as the export other measurements read; change both. */
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
  /* F12 — THE FABRICATED SCORELINE.
     `generateSingleEliminationBracket` writes a walkover as a COMPLETED match
     carrying `homeScore: 1, awayScore: 0` and `isBye: true`
     (`lib/singleElimination.ts:164-175`); the 1–0 is bookkeeping that lets the
     generator name a `winnerId`, not a result anybody played. Every consumer
     that read `status` and the two scores and ignored `isBye` therefore printed
     it as fact: on `/competitions/s-se-13` the Schedule panel showed three rows
     reading `1 – 0` against an opponent called "TBD" while the Bracket panel on
     the same screen labelled the identical matches `BYE`.

     The word wins over the numerals, and it is checked FIRST — before the
     score-undefined guard — so no caller can reinstate the scoreline by passing
     the raw fields through. */
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
      {/* `font-semibold`, not the inherited 400: at 0.9rem the digits already
          run at 600 (loser) and 700 (winner), and a 400 dash between them was a
          THIRD weight at the same size — one more step on a scale of 23 for a
          glyph nobody reads as lighter. */}
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
  /* A bye is not a match, so it cannot be opened and it cannot be edited —
     there is no sheet to open and no pair of teams to swap. `BracketRail`'s
     cell has always refused both for `cell.bye`; the row refuses them HERE
     rather than trusting each caller to remember, which is what let the
     Schedule panel hand a walkover a button labelled "Open … 1, TBD 0". */
  const openable = Boolean(onSelect) && !bye;
  const editable = Boolean(onEdit) && !bye;
  const markClass = (won: boolean) =>
    status !== "completed" || bye ? "" : won ? MARK_WON : MARK_LOST;

  const body = (
    /* `flex-col` below `sm` and one line from `sm` up. The meta cluster keeps
       its own line on a phone so the two names get the full width rather than
       sharing it with a round number — measured at 390px, the single-line cut
       set "Riptide" as "Ript…" on every row. */
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

      {/* No `justify-self`. A grid item with `justify-self` other than
          `stretch` is sized by its MAX-CONTENT, so the name stopped truncating
          and ran straight through the score — reproduced with "Northwest
          Kalamazoo Thunderhawks Academy" against a 25–16 scoreline. Stretched
          to the track and reversed, the away mark hugs the right edge and
          still truncates.

          The centre track is a CONSTANT, not `auto`: with `auto` the two `1fr`
          name columns were sized from whatever the scoreline happened to
          measure, so a digit landing mid-match resized both of them.

          ----------------------------------------------- the cut it now takes

          A constant centre track is only half the guarantee. Three fixed
          claims on the line — 76px of scoreline and two 18px crests — mean the
          two names split whatever is left, and the arithmetic runs out long
          before the viewport does. Measured on an eight-club roster:

            /session/SUMMER  Next up, 1440   each side 91px, name head 47px
                             painted "Marlo VC", "Great  CC" — 7 characters
            /session/SUMMER  Latest results, 320                  6 characters

          1440 is not a narrow-screen excuse; the panel is `xl:col-span-4` and
          the row is 274px inside it whatever the screen is. So the row takes
          the SAME cut, at the same 336px threshold and for the same measured
          reason, that `MbMatchupPair` below takes: one column, one team per
          line, the scoreline between them, and the away side un-mirrored so
          both identities start at the same left edge.

          336 = 2 × (18 crest + 6 gap + 96 name) + 76 centre + 16 gaps, where
          96 is the track at which `display/link` still paints `NAME_FLOOR`
          characters of a two-word club name plus its tail (`TeamName.tsx`).

          The template is a literal class per cut, not the inline style it was:
          Tailwind cannot compile a container variant out of `style`, and an
          interpolated `@min-[${n}px]:` compiles to nothing at all — so
          `MB_SCORE_TRACK`'s 76 is written into the class and the constant
          stays as the single place the number is explained. */}
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
    /* The rail is the row's state channel and is drawn on the wrapper so it
       reaches the full row height including the edit key: coral for live (the
       schedule spine, coral job 4), teal for a finished result, nothing for a
       fixture that has not been played. */
    /* `py-1` and `gap-2` are measured, not decorative — the same note
       `competitions/page.tsx` carries on its own row. Without them the select
       button fills the row edge to edge, so two stacked rows put two 44px
       targets 1px apart, the edit key sits 4px from the button it belongs to,
       and the last visible row lands 5px above the fixed bottom bar. Measured
       on `competition-se-live@390`: 8 spacing violations before, 0 after. */
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
            ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
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
   THE MATCHUP PAIR (R4 / R5)

   Two identities and their two figures, as ONE markup that reflows.

   ------------------------------------------------------------------ the bug

   Every shipped pair sized its two name tracks for the eight fixture names —
   Surge, Tide, Storm, Apex, Flare, Peak, Nova, Riptide, none longer than seven
   characters. A real club types "Westhill Wanderers", and the same track then
   fails in one of exactly two ways, both measured on this build with an
   eight-club roster:

     OVERLAP — `/summaries`, the Results Ledger, whose row was
       `grid-cols-[52px_1fr_auto_1fr_auto]` with `justify-self-start` / `-end`
       on the two marks. A grid item with a `justify-self` other than `stretch`
       is sized by its MAX-CONTENT, so the names never truncated and ran
       straight through the score: at 390 the first row painted "Rovers" at
       x 176.7→223.7 over a "25" at 197.3→212.6, a 15.3px overlap, and that one
       row carried six overlapping pairs. 128 pairs across the ledger at 390;
       262 at 320, the worst 64.6px. No ancestor clipped any of it.

     STUB — `/`, at 1440, which is not a narrow-screen excuse. Upcoming
       Schedule, Live Courts and Recent Results each hand a name a ~48px track
       inside an `xl:col-span-4` panel. `MbTeamName` then elides everything it
       can and the head paints at 0–7px of a 45–66px word, so "Kingsway Rovers"
       and "Riverside Rovers" both render as their tail alone — two clubs, one
       string. 18 of the 36 names on the dashboard were collapsed below half.

   Both are the same defect — a track sized for a world of short names — and
   both have the same answer: when the line cannot hold two identities, stop
   trying to put them on one line.

   ------------------------------------------------------------- the mechanism

   `@container` on the pair's own wrapper, exactly as `MbScoreboardHero` picks
   between its two cuts from the card rather than from the viewport, and for
   the reason it gives: the same pair is 407px wide in the ledger and 183px in
   the schedule panel ON THE SAME 1440px SCREEN, so a media query cannot tell
   them apart. Here it is one markup rather than two, so there is no second
   copy to keep in sync and nothing is duplicated into the accessibility tree:

     wide    `minmax(0,1fr) auto minmax(0,1fr)`, away side `row-reverse`
             [crest] Home ....25  –  20.... Away [crest]
             the mirrored scoreline this app already prints, unchanged.

     narrow  one column, away side back to `row`, centre withdrawn
             [crest] Home ...................... 25
             [crest] Away ...................... 20
             one line per team, both ranged left, both figures in one
             right-hand column — the shape every phone scoreboard uses, and
             the one `MbScoreboardHero`'s own narrow cut already uses.

   The threshold is the width at which each name still gets a track a two-word
   club name survives, measured on this roster at each step:

     sm   name 0.72rem — "Westhill Wanderers" sets in 107.5px; 96px keeps its
          head at 74% and every shorter roster name whole. Side = 96 + 18 crest
          + 8 mark gap + 8 figure gap + 22 two-figure reserve = 152.
          Cut = 2 × 152 + 14 dash + 16 gaps = 336.
     md   name 0.82rem — the same name sets in 123px; 110px is the same 89%.
          Side = 110 + 24 + 8 + 8 + 22 = 172. Cut = 2 × 172 + 14 + 16 = 376.

   `gap-y-1.5` (6px) is the row rhythm of the narrow cut, and it is measured
   rather than picked: the archive ledger is 25 rows tiling continuously under
   a fixed bottom bar, so one row boundary always lands somewhere in the last
   row-height before the bar, and at 8px and 4px of gap that boundary fell
   inside `audit.mjs`'s 8px separation floor at 390 (7.2px) and at 834 (2.8px)
   respectively. At 6px both viewports clear it, and 6px is also the gap the
   two lines want — 2px read as one wrapped line rather than two teams.

   Both figures carry a `2ch` floor and `.mb-numeral-digit` cells, so a live
   score stepping 9 → 10 moves nothing: the reserve already held two figures
   and each figure is exactly one `1ch` box (invariant 43). That is the
   guarantee `MB_SCORE_TRACK` gives `MbMatchRow` above, restated per side
   because here each side carries its own figure.

   `MbMatchRow` keeps its own constant centre track and is NOT rebuilt on this:
   it models seeds, byes and a not-yet-played measure, none of which is a pair
   of figures, and its `Measure` is the one place the fabricated 1–0 walkover
   is refused. What the two share — `Figures`, `EmptySide`, the emphasis pair —
   is shared, which is where the duplication actually was.

   `Pair`, not `Matchup`, because `useMatchbookHistory` already exports an
   `MbMatchup` and it is a different object: a RIVALRY (two teams, a head-to-head
   record, a leader), not a single match between them.
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
