"use client";

import { useState, type CSSProperties } from "react";
import { MbIcon } from "./MbIcon";
import { MbIconButton } from "./IconButton";
import { MbScoreNumeral } from "./ScoreNumeral";
import { Crest } from "./Panel";
import type { MbTeam } from "./types";

/* ===========================================================================
   THE TAP COLUMN (GAP-7, charter §2.3, W5/P3a)

   The screen a scorer stares at for two hours in a loud gym, one-handed. Every
   decision below is that sentence.

   THE COLUMN IS A PANEL ON STOCK. The first cut painted the whole console
   `--mb-paper-bright`, which switched off the two most recognisable Matchbook
   signals at once: `.matchbook-surface` draws `--mb-paper` plus the paper-grain
   texture, and a flood of paper-bright over the top hides both, leaving a
   screen on which nothing is a panel. The console frame is transparent now, so
   the cream stock and its grain are the ground, and each column is a
   paper-bright panel with a navy hairline and a 3px radius — the `mb-panel`
   vocabulary, at console scale.

   THE TEAM COLOUR IS A CONTAINED SWATCH, and nothing else. It used to be a
   full-bleed 3px rule under the name, which is the same device the system uses
   for rank-1 and for "selected" — so on a completed round-robin match the
   WINNER was underlined red and the LOSER green, purely because those were the
   two teams' colours, on the one screen where win and loss is the entire
   subject. The swatch is now bounded (3rem) and carries a navy hairline, which
   (a) stops it reading as a rank rail, and (b) fixes the non-text contrast
   failure underneath it: a user's gold measured 2.90:1 against paper-bright and
   a 3px mark needs 3:1, whereas the hairline that now bounds it is navy at
   12.84:1 whatever colour the user picked.

   THE LEAD IS TEAL, NOT CORAL. `globals.css` renames the notch `.mb-notch-lead`
   and states the reason: design language §1.2 already maps "rank #1" to
   `--mb-teal` and a standings table draws exactly that, so drawing it coral on
   a scoreboard would give one fact two colours while coral simultaneously means
   "the primary action". `data-leading="true"` picks up that 3px inset rule from
   `.mb-console-column`; the word LEADING beside it is the second channel
   invariant 13 requires, and its position — top of the column — is the third.

   WIN AND LOSS ARE INK AND WEIGHT, NOT COLOUR. A finished match marks the
   winner with a crown, the word "Won" and full-weight navy, and mutes the loser
   to `--mb-ink-muted` — name and numeral together. Design language §5.2 asks
   for exactly that pair and the first cut applied neither, so the two columns
   of a completed match were typographically identical and the result was
   carried by a 13px glyph.

   THE NUMERAL NEVER MOVES. `MbScoreNumeral` boxes every figure to `1ch` and
   reserves three of them, so 7 occupies the footprint of 187 and 18 → 19
   repaints one glyph without sliding the number. The old panel sprang the
   numeral `y: 30 → 0` on every point, which is the one animation a scorer
   glancing up from the court cannot afford.

   PRESS IS TINT, NOT SCALE. `.mb-console-column:active` inks to
   `--mb-tint-press` in zero time and eases back over `--mb-dur-fast`. Scaling a
   full-bleed column at 60fps on a mid-range Android is the frame-drop risk, and
   printed ink does not shrink.
   =========================================================================== */

export type MbScoreSideId = "home" | "away";
export type MbScoreSideView = "console" | "court";

export interface MbScoreSideProps {
  team: MbTeam;
  score: number;
  side: MbScoreSideId;
  /** The team's own colour, as a bounded swatch — never a ground, never a rail. */
  accent?: string;
  leading?: boolean;
  /** Reserved for the serve indicator; renders a hairline mark beside the name. */
  serving?: boolean;
  /** False on a completed match and for a viewer in a shared session. */
  canEdit: boolean;
  /**
   * Distinguishes "you are watching someone else score" from "this match is
   * over". Both are read-only; only one of them is still live.
   */
  viewOnly?: boolean;
  view?: MbScoreSideView;
  /** Marks the winner's column once the match is final. */
  won?: boolean;
  /** Marks the loser's column: name and numeral drop to muted ink. */
  lost?: boolean;
  /** Games this side has taken in a series. Omitted outside a series. */
  games?: number | null;
  /** +1. The whole column is this target. */
  onScore?: () => void;
  /** −1 / +1 from the explicit keys. */
  onAdjust?: (delta: number) => void;
  className?: string;
}

/**
 * THE NUMERAL IS SIZED BY THE COLUMN IT STANDS IN, NOT BY THE VIEWPORT'S WIDTH.
 *
 * `.mb-numeral--court` bakes `display/score-2xl` as `clamp(4rem, 18vw, 9rem)`,
 * and the middle term is the problem: `18vw` is a WIDTH rule on a console whose
 * only scarce axis is HEIGHT. Measured on the first cut, that painted **144px
 * at 1440 and 70.2px at 390** — the phone got half the desktop's hero on the
 * one screen whose whole premise is one-handed use in a loud gym — and 60px in
 * landscape, smaller again.
 *
 * Both rules below stay inside the named step's own band (its floor `4rem` and
 * its ceiling `9rem` are unchanged, and 144px is the exact value the desktop
 * already painted); what changes is the growth term, so the figure grows with
 * the room the column actually has:
 *
 *   stacked      `min(17vh, 34vw)` — two columns share the height below `sm`.
 *                390x844 → 132.6px, 320x844 → 108.8px.
 *   side by side `min(36vh, 30vw)` — one column owns the full height, which is
 *                true from `sm` up AND in landscape.
 *                1440x900 → 144px, 844x390 → 140.4px, 768x1024 → 144px.
 *
 * The `vw` arm is what stops a 3-figure score running out of column at 320.
 * `!` because `.mb-numeral--court` sets `font-size` in UNLAYERED CSS, which
 * outranks every Tailwind utility regardless of specificity.
 *
 * This also replaces the `@media (max-height: 520px)` step-down the first cut
 * carried: one height-aware rule does the landscape job that a second hard-coded
 * step was written to patch.
 */
const NUMERAL_STACKED = "[&_.mb-numeral]:text-[clamp(4rem,min(17vh,34vw),9rem)]!";
const NUMERAL_WIDE =
  "sm:[&_.mb-numeral]:text-[clamp(4rem,min(36vh,30vw),9rem)]! [@media(max-height:520px)]:[&_.mb-numeral]:text-[clamp(4rem,min(36vh,30vw),9rem)]!";

/** Row geometry, so the two views differ in numbers rather than in markup. */
const STEP = {
  console: { crest: 40, crestWide: 64, pad: "px-3 sm:px-4" },
  court: { crest: 28, crestWide: 40, pad: "px-3" },
} as const;

/**
 * THE CAPTION, and why a finished match no longer says "Final" twice.
 *
 * Three live states, three sentences — never a blank column that leaves the
 * reader guessing whether tapping does anything. On a finished match the
 * caption carries the RESULT ("Won" / "Lost") rather than the status: the
 * status is stamped once, in the fixture line, by `MbFinalStamp`, and printing
 * it again under each numeral spent the only per-column line on a word the
 * reader already had while leaving win and loss unstated.
 */
const caption = (canEdit: boolean, viewOnly: boolean, won: boolean, lost: boolean): string => {
  if (canEdit) return "Tap to score";
  if (viewOnly) return "Live · read only";
  if (won) return "Won";
  if (lost) return "Lost";
  return "Final";
};

/**
 * A label that STEPS UP on the phone.
 *
 * `.mb-kicker` bakes 0.62rem, so a console built out of it paints byte-identical
 * label sizes at 390 and at 1440 — which rubric 6.6 calls out by name as a fail
 * on a screen premised as one-handed during a live match. This is the same
 * voice (Oswald 600, uppercase, 0.16em, muted ink) one step larger below `sm`.
 * Written as utilities rather than as an override of `.mb-kicker`, whose
 * `font-size` is unlayered and would win against any utility anyway.
 */
const LABEL =
  "matchbook-display text-[0.72rem] font-semibold uppercase leading-none tracking-[0.16em] text-mb-ink-muted sm:text-[0.62rem]";

export const MbScoreSide = ({
  team,
  score,
  side,
  accent,
  leading = false,
  serving = false,
  canEdit,
  viewOnly = false,
  view = "console",
  won = false,
  lost = false,
  games = null,
  onScore,
  onAdjust,
  className = "",
}: MbScoreSideProps) => {
  const step = STEP[view];
  const interactive = canEdit && !!onScore;

  /**
   * Which way the score last moved, so the numeral can flash the right edge.
   * Derived during render rather than in an effect: an effect renders the old
   * value first and cross-fades one frame late.
   */
  const [seen, setSeen] = useState(score);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  if (seen !== score) {
    setDirection(score > seen ? "up" : "down");
    setSeen(score);
  }

  /**
   * THE TAP TARGET IS A REAL `<button>`, AND IT IS A SIBLING OF THE CONTENT.
   *
   * It used to be the content's own `<div role="button" tabIndex={0}>` with a
   * hand-rolled Enter/Space handler — which `audit.mjs` reports as `not-native`
   * on every scoring route, and which invariant 48 forbids outright. The
   * obvious fix, wrapping the column in a `<button>`, is invalid HTML: the
   * `−`/`+` keys are buttons and a button may not contain one.
   *
   * So the target is a full-bleed layer BEHIND the content, and the content is
   * `pointer-events-none` with the keys opting back in. That buys three things
   * at once: real `<button>` semantics (Enter, Space, the browser's own
   * activation behaviour, and no `preventDefault` dance), a hit area that is
   * exactly the column, and no `stopPropagation` on the keys — they are no
   * longer descendants of the thing they were double-firing.
   */
  const Ground = interactive ? "button" : "div";

  const ink = lost ? "text-mb-ink-muted" : "";

  return (
    <div
      className={`relative isolate flex min-h-0 flex-col overflow-hidden rounded-[3px] border border-mb-navy ${className}`}
      data-side={side}
    >
      <Ground
        {...(interactive
          ? {
              type: "button" as const,
              onClick: onScore,
              "aria-label": `Add a point to ${team.name}. Current score ${score}.`,
            }
          : { "aria-hidden": true })}
        data-leading={leading ? "true" : undefined}
        /* THE RING IS DRAWN INSIDE, AND THE `!` IS LOAD-BEARING.
           This layer is `inset-0` in an `overflow-hidden` box, so the system's
           `outline-offset: 2px` is clipped away in its entirety and the two
           largest controls on the screen had NO visible keyboard indicator.
           The arbitrary variant alone does not fix it: `.matchbook-surface
           :focus-visible` is UNLAYERED, and unlayered CSS outranks every
           Tailwind utility whatever its specificity — measured `outline-offset:
           2px` computed, against the `-3px` this class asks for. `!` is the
           escape, and it is the same one this file already uses for the
           numeral's unlayered `font-size`. */
        className="mb-console-column absolute inset-0 h-full w-full focus-visible:[outline-offset:-3px]!"
      />

      {/* The content sits above the target and lets every pointer through to
          it; only the keys take their own. `select-none` because a long press
          on a score should not start a text selection. */}
      <div
        className={`pointer-events-none relative z-10 flex h-full min-h-0 select-none flex-col items-center justify-between gap-2 ${step.pad} ${ink}`}
      >
        {/* ----------------------------------------------------- identity */}
        <div className="flex w-full min-w-0 shrink-0 items-center gap-2 border-b border-mb-rule pb-2 pt-3">
          <span className="sm:hidden">
            <Crest team={team} size={step.crest} />
          </span>
          <span className="hidden sm:block">
            <Crest team={team} size={step.crestWide} />
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              title={team.name}
              className={`matchbook-display truncate text-[1.2rem] leading-tight tracking-[0.02em] sm:text-[1.5rem] ${
                lost ? "font-semibold" : "font-bold"
              }`}
            >
              {team.name}
            </span>
            {accent && (
              /* Bounded, and bounded by NAVY: the swatch says "this team's
                 colour" without borrowing the rank rail's device, and its
                 hairline carries the 3:1 non-text contrast the user's own
                 colour cannot be trusted to. */
              <span
                aria-hidden="true"
                className="block h-[6px] w-[3rem] border border-mb-navy"
                style={{ background: accent }}
              />
            )}
          </span>

          {serving && (
            <span className={`flex shrink-0 items-center gap-1 ${LABEL}`}>
              <MbIcon id="volleyball" size={12} />
              Serving
            </span>
          )}

          {leading && (
            <span className="flex shrink-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="block h-[12px] w-[3px]"
                style={{ background: "var(--mb-teal)" }}
              />
              <span className={LABEL}>Leading</span>
            </span>
          )}

          {won && (
            <span className="flex shrink-0 items-center gap-2">
              <MbIcon id="crown" size={14} />
              <span className={`${LABEL} text-mb-navy!`}>Winner</span>
            </span>
          )}
        </div>

        {/* ------------------------------------------------------- numeral */}
        <div
          className={`flex w-full min-w-0 flex-1 items-center justify-center ${NUMERAL_STACKED} ${NUMERAL_WIDE}`}
        >
          <MbScoreNumeral value={score} size="court" flash={direction} />
        </div>

        {/* -------------------------------------------------------- footer */}
        <div className="flex w-full min-w-0 shrink-0 items-center justify-between gap-2 border-t border-mb-rule pb-3 pt-2">
          <span className={`${LABEL} min-w-0 truncate`}>
            {caption(canEdit, viewOnly, won, lost)}
          </span>

          {games !== null && (
            <span className="flex shrink-0 items-baseline gap-2">
              <span className={LABEL}>Games</span>
              <span className="matchbook-display text-[1.2rem] font-bold leading-none tracking-[0.02em] tabular-nums">
                {games}
              </span>
            </span>
          )}

          {canEdit && onAdjust && (
            /* `pointer-events-auto` puts the keys back in front of the tap layer
               they float over. They are no longer its descendants, so nothing
               here needs `stopPropagation` — the double-fire the old panel
               guarded against is structurally impossible now. */
            <span className="pointer-events-auto flex shrink-0 items-center gap-2">
              {/* `.mb-btn` sets `display: inline-flex` in unlayered CSS, so a
                  `hidden sm:inline-flex` on the control itself is silently inert.
                  The wrapper carries the breakpoint instead.

                  The `+` key is redundant with the column behind it — that is the
                  point of hiding it on a phone (invariant 38 allows exactly
                  redundant context). One-handed, the column is the plus and the
                  only key worth a thumb is the one that takes a point back. */}
              <span className="hidden sm:block">
                <MbIconButton
                  icon="plus"
                  label={`Add a point to ${team.name}`}
                  tone="outline-navy"
                  size="sm"
                  onClick={() => onAdjust(1)}
                />
              </span>
              <MbIconButton
                icon="minus"
                label={`Take a point off ${team.name}`}
                tone="outline-navy"
                size="sm"
                onClick={() => onAdjust(-1)}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ===========================================================================
   THE SET STRIP

   One cell per game in a series. It exists because the console used to print
   the series as body text — `Surge 1 - 0 Riptide` under two chips — which put
   the least-glanceable typography in the app on the one line that says how far
   through the match you are.

   The app stores `homeWins` / `awayWins` totals and a `seriesGame` counter; it
   does NOT store which game each win came from. So the strip claims only what
   is true: which games have been decided, which one is in play, and which are
   still to come.

   WHO HAS WON WHAT IS NOT IN THIS STRIP. It used to end in a bare `1–0`, which
   is a claim of ownership carried by reading order alone — nothing on the
   screen said which figure belonged to which crest. The per-side count now
   lives in each column's own footer, beside that team's crest and name, where
   it cannot be misread.

   CURRENT IS A NAVY RULE, NOT A CORAL ONE. Coral is the primary action and the
   score flash; a third job on this strip put the accent on a passive progress
   mark. The three states now read as fill / rule / hairline, which also means
   they survive greyscale.
   =========================================================================== */

export type MbSetState = "played" | "current" | "upcoming";

export interface MbSetCell {
  /** 1-based game number. */
  game: number;
  state: MbSetState;
  /** Final score of that game, where it is known. Renders instead of the number. */
  home?: number;
  away?: number;
}

const CELL_STYLE: Record<MbSetState, CSSProperties> = {
  played: { background: "var(--mb-navy)", color: "var(--mb-paper-bright)" },
  current: { borderBottomWidth: "var(--mb-rule-accent)", borderBottomColor: "var(--mb-navy)" },
  upcoming: { color: "var(--mb-ink-muted)", borderColor: "var(--mb-rule)" },
};

export const MbSetStrip = ({
  sets,
  current,
  tally,
  className = "",
}: {
  sets: MbSetCell[];
  /** 1-based game currently in play. */
  current: number;
  /** Games won so far, shown as a running series count after the chips. */
  tally?: { home: number; away: number };
  className?: string;
}) => {
  if (sets.length === 0) return null;

  return (
    /* No size utilities on the cells. `.mb-score-box` sets `min-width`,
       `height` and `font-size` in unlayered CSS, so the `h-[22px]
       min-w-[22px] text-[0.7rem]` this used to carry compiled, shipped and did
       nothing at all — the chips rendered 26x26 at 0.95rem throughout. Three
       dead declarations, one of them the only off-scale type size in the file. */
    <ol
      className={`flex min-w-0 shrink-0 items-center gap-1 ${className}`}
      aria-label={`Game ${current} of ${sets.length}`}
    >
      {sets.map((cell) => (
        <li
          key={cell.game}
          className="mb-score-box tabular-nums"
          style={CELL_STYLE[cell.state]}
          aria-current={cell.state === "current" ? "step" : undefined}
        >
          {cell.home !== undefined && cell.away !== undefined
            ? `${cell.home}–${cell.away}`
            : cell.game}
        </li>
      ))}
      {tally && (
        <li
          className="matchbook-display shrink-0 pl-1 text-[0.8rem] font-bold tabular-nums"
          aria-label={`Series ${tally.home} to ${tally.away}`}
        >
          {tally.home}–{tally.away}
        </li>
      )}
    </ol>
  );
};
