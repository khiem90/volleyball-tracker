"use client";

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
    <span className="matchbook-display text-[0.78rem] font-semibold text-mb-ink-muted">
      <span aria-hidden="true">—</span>
      <span className="sr-only">No opponent</span>
    </span>
  ) : (
    <span className="matchbook-display truncate text-[0.78rem] font-semibold text-mb-ink-muted">
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
  <span className="mb-seed-box w-[18px] shrink-0 justify-center px-0! py-0! matchbook-display text-[0.62rem] font-bold tracking-[0.06em] tabular-nums text-mb-ink-muted">
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
      <span className="matchbook-display text-center text-[0.74rem] font-bold uppercase tracking-[0.1em] text-mb-ink-muted">
        Bye
      </span>
    );
  }
  if (status === "pending" || homeScore === undefined || awayScore === undefined) {
    return (
      <span className="matchbook-display text-center text-[0.74rem] font-bold tracking-[0.1em] text-mb-ink-muted">
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
    <span className="matchbook-display flex items-center justify-center gap-1 whitespace-nowrap text-[0.9rem] leading-none tabular-nums">
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
          measure, so a digit landing mid-match resized both of them. */}
      <span
        className="grid min-w-0 flex-1 items-center gap-2"
        style={{
          gridTemplateColumns: `minmax(0,1fr) ${MB_SCORE_TRACK}px minmax(0,1fr)`,
        }}
      >
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
        {away ? (
          <span className="flex min-w-0 flex-row-reverse items-center gap-1.5">
            {awaySeed !== undefined && <MbSeedBox value={awaySeed} />}
            <TeamMark team={away} size="sm" reverse className={markClass(awayWon)} />
          </span>
        ) : (
          <span className="flex justify-end">
            <EmptySide bye={bye} />
          </span>
        )}
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
