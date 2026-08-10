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
  variant?: MbMatchRowVariant;
  /** Opens the match. Omit and the row renders as static type. */
  onSelect?: () => void;
  /** Reassigns the teams. Omit and no edit control is drawn. */
  onEdit?: () => void;
  /** Names both controls for screen readers. Defaults to "{home} v {away}". */
  name?: string;
  className?: string;
}

const TBD = () => (
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

/** A seeding position, in the printed-draw box. */
const Seed = ({ value }: { value: number }) => (
  <span className="mb-seed-box shrink-0 px-1.5! py-0.5! matchbook-display text-[0.62rem] font-bold tracking-[0.06em] tabular-nums text-mb-ink-muted">
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
  homeScore,
  awayScore,
  homeWon,
  awayWon,
}: {
  status: MbMatchRowStatus;
  homeScore?: number;
  awayScore?: number;
  homeWon: boolean;
  awayWon: boolean;
}) => {
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
      <span className="text-mb-ink-muted">–</span>
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
  variant = "schedule",
  onSelect,
  onEdit,
  name,
  className = "",
}: MbMatchRowProps) => {
  const rowName = name ?? `${home?.name ?? "TBD"} v ${away?.name ?? "TBD"}`;
  const scored = status !== "pending" && homeScore !== undefined && awayScore !== undefined;
  /* The control's name carries the score, because the numerals inside it are
     display type the screen reader should not read figure by figure. */
  const openName = scored
    ? `${home?.name ?? "TBD"} ${homeScore}, ${away?.name ?? "TBD"} ${awayScore}`
    : rowName;
  const markClass = (won: boolean) =>
    status !== "completed" ? "" : won ? MARK_WON : MARK_LOST;

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
            {homeSeed !== undefined && <Seed value={homeSeed} />}
            <TeamMark team={home} size="sm" className={markClass(homeWon)} />
          </span>
        ) : (
          <TBD />
        )}
        <Measure
          status={status}
          homeScore={homeScore}
          awayScore={awayScore}
          homeWon={homeWon}
          awayWon={awayWon}
        />
        {away ? (
          <span className="flex min-w-0 flex-row-reverse items-center gap-1.5">
            {awaySeed !== undefined && <Seed value={awaySeed} />}
            <TeamMark team={away} size="sm" reverse className={markClass(awayWon)} />
          </span>
        ) : (
          <span className="flex justify-end">
            <TBD />
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
      style={
        status === "live"
          ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
          : variant === "result"
            ? { boxShadow: "inset 3px 0 0 var(--mb-tint-3)" }
            : undefined
      }
    >
      {onSelect ? (
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

      {onEdit && (
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
