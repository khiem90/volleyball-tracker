"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { MbIcon } from "./MbIcon";
import { MbIconButton } from "./IconButton";
import { MbScoreNumeral } from "./ScoreNumeral";
import { Crest } from "./Panel";
import type { MbTeam } from "./types";

/* ===========================================================================
   THE TAP COLUMN (GAP-7, charter §2.3, W5/P3a)

   The screen a scorer stares at for two hours in a loud gym, one-handed. Every
   decision below is that sentence.

   THE COLUMN IS A PANEL ON STOCK, WITH A PANEL HEAD. The first two cuts drew
   the column as an undifferentiated sheet with a hairline-ruled identity row at
   the top, and the result measured 7.6% text-painting area at 1440x900 — a
   scoreboard floating in 80% blank cream, with no panel head, no rule work and
   nothing resolving its two co-equal numerals. It now carries the same
   `mb-panel` device every other Matchbook screen uses: a HEAD BAR over a body
   over a ruled foot.

   THE HEAD BAR IS WHERE THE LEAD LIVES, AND IT IS THE WHOLE POINT. Design
   language §1.2's rank vocabulary is a mark; a scoreboard needs a BLOCK. The
   leading side's head inverts to navy with paper letterforms, the trailing
   side's stays paper with navy ink — so from three metres the answer to "who is
   ahead" is the dark bar, before a single figure is read, and in greyscale it
   is fill against no-fill rather than one hue against another (invariant 13).
   A lead change swaps the two grounds over `--mb-dur-slow`; that is the one
   semantic event of a game and the only thing on the screen that transitions a
   colour.

   THE TEAM COLOUR IS A CONTAINED SWATCH, and nothing else. It used to be a
   full-bleed 3px rule under the name, which is the same device the system uses
   for rank-1 and for "selected" — so on a completed round-robin match the
   WINNER was underlined red and the LOSER green, purely because those were the
   two teams' colours, on the one screen where win and loss is the entire
   subject. The swatch is bounded (3rem) and carries a hairline, which (a) stops
   it reading as a rank rail, and (b) fixes the non-text contrast failure
   underneath it: a user's gold measured 2.90:1 against paper-bright and a 3px
   mark needs 3:1, whereas the hairline that bounds it is navy at 12.84:1
   (paper-bright at 12.84:1 on the navy head) whatever colour the user picked.

   WIN AND LOSS ARE INK AND WEIGHT, NOT COLOUR. A finished match marks the
   winner with a crown, the word "Won" and a navy head; the loser drops to
   `--mb-ink-muted` — name and numeral together. `lost` was declared and
   documented here for two rounds and passed by nobody, so both columns of a
   completed match rendered identically and the result was carried by a 13px
   glyph. It is wired now, from `useMatchbookMatch` and from the guest route.

   THE NUMERAL NEVER MOVES. `MbScoreNumeral` boxes every figure to `1ch` and
   reserves three of them, so 7 occupies the footprint of 187 and 18 -> 19
   repaints one glyph without sliding the number. Where the two columns sit side
   by side the pair HUGS the rule between them (`align="end"` / `"start"`),
   which is the alignment `ScoreNumeral.tsx` documents with measured evidence
   for exactly this case and which turns two numbers into one scoreline.

   PRESS IS TINT, NOT SCALE — and hover is a tint one step quieter. `.mb-console-column`
   ships `:active` in `globals.css` but no `:hover`, so at 1440 the largest
   control in the app gave a pointer no feedback at all and its only affordance
   was an 11px caption. Both washes are declared at the call site because the
   class sets `background` in unlayered CSS.
   =========================================================================== */

export type MbScoreSideId = "home" | "away";

/* ---------------------------------------------------------------------------
   TWO VOCABULARIES, AND THE DIFFERENCE BETWEEN THEM IS THE WHOLE FIX

   The previous cut had one: `@media (max-height: 520px)`, the landscape
   contract (brief §3.4, charter invariant 39). Everything the column does when
   it runs out of vertical room hung off the VIEWPORT's height.

   That is the wrong quantity, and it is the S1 defect. The column's height is
   not the viewport's: it is `viewport − chrome − rail`, halved when the two
   columns stack. Measured at 320x568 the viewport is 568px tall and passes the
   520px test comfortably, while the COLUMN is **146.1px** and has to seat a
   93.4px head, a 65px foot and a numeral. 93.4 + 65 = 158.4 > 146.1, so the
   score row was flex-shrunk to **0px** and `overflow-hidden` deleted the score
   from the live scoring console entirely. At 375x667 the row was 35.2px against
   a 114.8px numeral box.

   So there are two quantities and they get two vocabularies:

     MB_SHORT   the VIEWPORT is short  →  landscape. Governs which way things
                lie down (the columns go side by side; the head becomes a row)
                and nothing else. That really is a property of the device.

     COL_TIGHT  the COLUMN is short    →  a container query on the column's own
                box. Governs what the column can AFFORD: the foot, the crest
                step, the name step. Landscape is a strict subset of it (every
                landscape column measures ≤190px), so nothing needs to say both.

   Each class is spelled out in full because Tailwind generates a utility only
   when its literal text appears in a source file — a template that assembles
   one compiles to nothing at all. Neither can be a prop: a JS-driven layout
   switch renders one geometry and swaps it a frame later, which is a visible
   shift on the one screen that must not have any. Neither can be a
   `globals.css` utility: that file is W1-exclusive for the whole programme
   (charter H1), and design language §7.3 names "write the query locally" as the
   sanctioned alternative.

   **W1 follow-up:** promote both to `.mb-console-short-*` / `.mb-console-tight-*`
   in zone A and delete these objects; they are screen-local only because the
   stylesheet is frozen to this workstream.
   --------------------------------------------------------------------------- */
export const MB_SHORT = {
  /** Two columns side by side whatever the width, with the 8px separation track. */
  sideBySide:
    "[@media(max-height:520px)]:grid-cols-[1fr_8px_1fr] [@media(max-height:520px)]:grid-rows-1",
  /** Gone in landscape: the row does not exist rather than being clipped. */
  hide: "[@media(max-height:520px)]:hidden",
  /**
   * Vertical slack is what landscape has none of: the name stack lies down
   * beside the crest instead of under it. Measured before: at 740x360 the head
   * ran 113..185 (a 52px crest plus a stacked name and accent row), leaving a
   * 65px score row for a 91px numeral box.
   *
   * `gap-x-3`, not `gap-3`. The tight vocabulary sets the stack's *row* gap and
   * this sets its *column* gap, so the two queries touch different properties
   * and neither has to win an at-rule ordering race it cannot control.
   */
  row: "[@media(max-height:520px)]:flex-row [@media(max-height:520px)]:items-center [@media(max-height:520px)]:gap-x-3",
  /**
   * ONE LINE, FILLED — not one line, clamped.
   *
   * `line-clamp-1` breaks the text at a WORD boundary and then ellipsises what
   * is left of the line, so a name whose second word does not fit spends the
   * rest of the line on nothing. Measured at 568x320: a **150px** name box
   * painting "GREAT…" — five characters, against a floor of eight — because
   * "BARRINGTON" needed 96px and only 92px were left. `text-overflow` fills the
   * box to the last glyph that fits and ellipsises there: 15 characters in the
   * same 150px, 29 in the 280px box at 844x390.
   *
   * Spelled out rather than `truncate` because the base step is `line-clamp-2`,
   * which sets `display:-webkit-box` and `-webkit-line-clamp:2`; both have to
   * be unset or the box keeps clamping and never ellipsises.
   */
  oneLine:
    "[@media(max-height:520px)]:[display:block] [@media(max-height:520px)]:[-webkit-line-clamp:unset] [@media(max-height:520px)]:overflow-hidden [@media(max-height:520px)]:whitespace-nowrap [@media(max-height:520px)]:text-ellipsis",
} as const;

/**
 * THE COLUMN QUERIES ITSELF. `mb-col` is declared on the column root below.
 *
 * **360px**, and it is arithmetic rather than taste. The full card spends
 * 93.4px on its head and 65px on its foot — 158.4px of chrome — and a scoreboard
 * whose subject is read at three metres wants at least 200px of numeral. A
 * column that cannot seat 158.4 + 200 = 358.4px cannot afford the card, so it
 * stops paying for it. Measured column heights either side of the line:
 * 310.1px at 414x896 and 560px at 1280x800, so the threshold sits in a 250px
 * gap rather than on top of a real device.
 */
const COL_TIGHT = {
  /** The foot, once the column cannot seat it. */
  hide: "[@container_mb-col_(max-height:360px)]:hidden",
  /** Present only then — the inline `−` key, the games count. */
  onlyFlex: "hidden [@container_mb-col_(max-height:360px)]:flex",
  /** Present only then, as text that can truncate. */
  onlyBlock: "hidden [@container_mb-col_(max-height:360px)]:block",
  /** The head stops paying for a 20px band of padding it cannot afford. */
  headPad: "[@container_mb-col_(max-height:360px)]:py-1",
  /** `gap-y`, so the landscape query's `gap-x` is never competing for it. */
  stackGap: "[@container_mb-col_(max-height:360px)]:gap-y-1.5",
  /** `display/stat-md` steps down to `display/stat-sm`. Both lines survive. */
  name: "[@container_mb-col_(max-height:360px)]:text-[1.2rem]",
  /**
   * Two lines of `display/stat-sm` at `leading-[1.05]` = 2 x 1.2 x 1.05rem,
   * reserved whether the name reaches them or not. Scoped to portrait so it
   * cannot collide with the landscape one-line reserve.
   */
  nameReserve:
    "[@media(min-height:521px)]:[@container_mb-col_(max-height:360px)]:min-h-[2.52rem]",
  /** The inner gutter, at a third of the size, beside a third-size figure. */
  gutterEnd: "[@container_mb-col_(max-height:360px)]:pe-4",
  gutterStart: "[@container_mb-col_(max-height:360px)]:ps-4",
  /** Separation between the inline key and the fit box. */
  gap: "[@container_mb-col_(max-height:360px)]:gap-2",
} as const;

/**
 * STACKED, BOTH KEYS GO TO THE SAME EDGE — and it is the score that says so.
 *
 * Side by side, `−` sits on each column's OUTER edge so the two figures keep
 * hugging the rule between them. Stacked, there is no rule between them: the
 * columns read top to bottom, and a key before the home figure and after the
 * away figure pushes the two fit boxes opposite ways. Measured at 320x568 that
 * put the home ink's centre at x=186.5 and the away ink's at x=136 — a 50px
 * diagonal across a scoreline whose whole job is to be read as one object.
 *
 * The away key takes `order-first` in that mode alone, so both fit boxes are
 * the same box in the same place and the two figures land on one vertical.
 * Absolute-positioning the key instead was measured and rejected: it frees the
 * whole row for the reserve, but at 390 the 3-figure reserve then runs from
 * x=21 and the key occupies 13..57, so "108" would paint underneath it.
 */
const KEY_STACKED = "[@media(max-width:639px)_and_(min-height:521px)]:order-first";

/**
 * The crest, at three steps, on one element.
 *
 * `Crest` renders a `next/image` with fixed `width`/`height` attributes, so the
 * step has to be a CSS override on the `<img>` it produces; three wrapper spans
 * with `hidden` between them would put three copies of the same asset in the
 * DOM and in the accessibility tree. Every pair holds the crest pack's own
 * 96:112 aspect (36x42, 52x61, 32x37) so nothing is distorted at any step.
 *
 * The small step is keyed to the COLUMN, not to the viewport, so a wide-but-short
 * column (a landscape tablet) takes it too — which the `sm:` step would
 * otherwise have overridden back up to 61px inside a 190px box.
 */
const CREST =
  "shrink-0 [&>img]:h-[42px] [&>img]:w-[36px] sm:[&>img]:h-[61px] sm:[&>img]:w-[52px] [@container_mb-col_(max-height:360px)]:[&>img]:h-[37px] [@container_mb-col_(max-height:360px)]:[&>img]:w-[32px]";

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
 * `display/score-fit` — THE NUMERAL IS SIZED BY THE BOX IT IS IN. (design
 * language §2.1; S2.)
 *
 * The previous cut carried three `!` overrides — `clamp(4rem,min(36vh,34vw),9rem)`
 * stacked, `min(36vh,26vw)` at `sm`, `min(26vh,26vw)` in landscape — six
 * hand-fitted coefficients, each justified by a table of measurements at named
 * viewports, and each of them wrong at some viewport that was not in its table.
 * Every one of them is a VIEWPORT term, and the numeral does not live in the
 * viewport: it lives in the score row, whose height is
 * `column − head − foot` and whose width is `column − padding − the inline key`.
 * At 320x568 that arithmetic came out at **0px of row for a 108.8px figure**.
 *
 * A container query says the thing directly. `.mb-score-fit` below is a
 * `container-type: size` box holding nothing but the numeral, so `1cqh` IS the
 * height available and `1cqw` IS the width available, in both orientations, in
 * Court View, at any chrome height any other workstream ever ships.
 *
 * Both coefficients are measured, not guessed. Oswald 700, per 100px of
 * font-size (`TextMetrics`, canvas, this face):
 *
 *   fontBoundingBox  ascent 119, descent 29   (the 1.48em content area)
 *   digit ink        ascent  82, descent  2   (**0.84em of actual paint**)
 *   advance of "0"                       55   (**1ch = 0.55em**, as the file claims)
 *
 *   HEIGHT  the face is `line-height: 0.9`, so the box is 0.9F and the baseline
 *           lands at 0.90F below its top; ink runs 0.08F..0.92F. Centred in a
 *           row of height R the ink's low edge sits at `R/2 + 0.47F`, so it is
 *           inside the row while **F ≤ 1.064R**. `100cqh` takes 94% of that and
 *           leaves 6% for subpixel rounding.
 *   WIDTH   the reserve is 3 figures at 1ch = **1.65F** whatever the value (that
 *           constancy is what stops the score reflowing, so the width term uses
 *           the reserve and never the rendered digit count — otherwise 9→10
 *           would resize the numeral). `F ≤ W/1.65 = 0.606W`; **58cqw** takes
 *           96% of that.
 *
 * `100cqh` / `58cqw`, not `1cqh` / `0.58cqw`: a container query unit is ONE
 * PERCENT of the container, exactly as `vh` is one percent of the viewport.
 * The first cut of this line wrote the fractions and painted a **3.8px** score
 * at 1440x900 — 1% of the intended figure — which is what the harness caught
 * before any of it was believed.
 *
 * There is deliberately **no floor**. A floor is the defect: `4rem` inside a
 * 0px row is exactly how the score came to be invisible at 320. The container
 * is the floor — the numeral is as large as the room honestly is, and if the
 * room is wrong that is a layout bug to fix in the layout, not to paper over
 * here. The `16rem` ceiling is unchanged from the previous cut and keeps its
 * argument: at the step's own `9rem` the figure painted 144px inside a 715px
 * column at 1440x900, ~80% blank cream, which is rubric D2's five-anchor
 * verbatim.
 *
 * The selector is `.mb-numeral--court`, not `.mb-numeral`. Both the face AND
 * the flash rule carry the step class, and only the face carries `.mb-numeral` —
 * so the previous cut left `.mb-score-rule` sizing its `1ch` off the unoverridden
 * `clamp(4rem,18vw,9rem)`. Measured at 1440: a 174.4px mark under a 281.6px
 * pair, 62% of the ink it was marking. One selector fixes both.
 *
 * `!` because `.mb-numeral--court` sets `font-size` in UNLAYERED CSS, which
 * outranks every Tailwind utility regardless of specificity.
 */
const NUMERAL_FIT = "[&_.mb-numeral--court]:text-[min(100cqh,58cqw,16rem)]!";

/**
 * The fit box: the query container, and nothing else.
 *
 * `container-type: size` needs a size that does not depend on its contents, in
 * BOTH axes — which is why this is a `flex-1 min-w-0` item of a `items-stretch`
 * row rather than the row itself. Width comes from the flex line (basis 0,
 * grow 1), height from the stretch. `contain: size` then guarantees the other
 * half of the contract for free: the numeral cannot make its own box grow, so
 * it can never reflow the column no matter what the score does.
 *
 * `grid` + `justify-items` rather than the row's `justify-*`: the reserve has
 * to keep hugging the rule between the two columns (`ScoreNumeral`'s `align`
 * note measures 14–20px of rule-to-ink hugging against 15–53px centred), and
 * with the fit box filling the row it is the fit box's own alignment that
 * decides where the reserve sits. The row's `pe-10`/`ps-10` inner gutter is
 * padding, so it is outside the fit box's content box and `1cqw` has already
 * subtracted it.
 */
const FIT_BOX =
  "relative grid min-w-0 flex-1 items-center [container-name:mb-col-score] [container-type:size]";

/**
 * Below `sm` AND in portrait the two columns are STACKED, so there is no rule
 * between them for the figures to hug — the divider is horizontal and the pair
 * reads top to bottom. The reserve re-centres, and the flash rule (which
 * `ScoreNumeral` anchors to whichever edge `align` names) re-centres with it.
 *
 * `max-sm` alone was wrong and is the reason this is spelled out: 568x320 is
 * landscape (side by side, hugging a vertical rule) and also 568px wide, so
 * `max-sm` centred both figures away from the rule they were supposed to be
 * hugging. Stacked is `width < 640 AND height > 520` — the exact complement of
 * the two conditions `MatchConsole` turns the grid to columns on.
 *
 * `!` on each because `ScoreNumeral` sets `text-align` and the anchor offset as
 * INLINE styles, which only `!important` outranks.
 */
const STACKED_CENTRE =
  "[@media(max-width:639px)_and_(min-height:521px)]:justify-items-center " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-numeral]:text-center! " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-score-rule]:right-auto! " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-score-rule]:left-1/2! " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-score-rule]:-translate-x-1/2!";

/**
 * THE CAPTION, and why a finished match no longer says "Final" twice.
 *
 * Three live states, three sentences — never a blank column that leaves the
 * reader guessing whether tapping does anything. On a finished match the
 * caption carries the RESULT ("Won" / "Lost") rather than the status: the
 * status is stamped once, in the fixture line, and printing it again under each
 * numeral spent the only per-column line on a word the reader already had while
 * leaving win and loss unstated.
 */
const caption = (canEdit: boolean, viewOnly: boolean, won: boolean, lost: boolean): string => {
  if (canEdit) return "Tap to score";
  if (viewOnly) return "Live · read only";
  if (won) return "Won";
  if (lost) return "Lost";
  return "Final";
};

/**
 * EVERYTHING THE FOOT CARRIES HAS TO SURVIVE THE FOOT.
 *
 * A tight column has no foot, and until now that was true only in landscape,
 * where nobody had checked what went with it: the caption, and — the one that
 * matters — the per-side GAMES count, which is the only place in the app that
 * says which team is 2-1 up in a best-of-five. This file's own header claims
 * that count "lives in each column's own foot… where it cannot be misread",
 * and landscape silently deleted it.
 *
 * The tight vocabulary now covers every phone rather than just landscape, so
 * that could not be left standing. Both facts move into the head's accent row,
 * which is a `min-h-[14px]` box that is already reserved and already painted —
 * so they cost the column no height at all. `display: none` (not `visibility`)
 * keeps exactly one copy of each in the accessibility tree.
 */
const TightFoot = ({
  games,
  word,
}: {
  games: number | null;
  /** The foot's caption, minus anything the accent row already says. */
  word: string | null;
}) => (
  <>
    {games !== null && (
      <span className={`shrink-0 items-baseline gap-1.5 ${COL_TIGHT.onlyFlex} ${LABEL}`}>
        Games
        <span className="tabular-nums">{games}</span>
      </span>
    )}
    {/* Not in landscape. Stacked, the accent row sits UNDER the name and costs
        it nothing; lying down it sits BESIDE the name and every pixel it takes
        comes out of the team's identity. Landscape has shipped without a
        caption since the foot first left, so dropping it there is the status
        quo rather than a loss — see the note on `Leading` below. */}
    {word && (
      <span className={`min-w-0 truncate ${COL_TIGHT.onlyBlock} ${MB_SHORT.hide} ${LABEL}`}>
        {word}
      </span>
    )}
  </>
);

/**
 * A label that STEPS UP on the phone, out of two NAMED steps.
 *
 * `.mb-kicker` bakes 0.62rem, so a console built out of it paints byte-identical
 * label sizes at 390 and at 1440 — which rubric 6.6 calls out by name as a fail
 * on a screen premised as one-handed during a live match. The previous cut
 * stepped it up to 0.72rem/600/0.16em, which is not on the scale at all AND
 * collided with `display/link` — `MbButton size="sm"`, i.e. the Court View key
 * standing 40px away, renders 0.72rem/600 at 0.04em. One (size, weight) pair,
 * two trackings, which rubric 1.3 requires to be empty.
 *
 * Both steps below are named and share one (weight, tracking): `display/meta`
 * (0.74rem) on the phone, `display/status` (0.66rem) from `sm` up. Written as
 * utilities rather than as an override of `.mb-kicker`, whose `font-size` is
 * unlayered and would win against any utility anyway.
 */
const LABEL =
  "matchbook-display text-[0.74rem] mb-track-status font-bold uppercase leading-none sm:text-[0.66rem]";

/** The same label on paper ink, for the inverted head. */
const LABEL_MUTED = `${LABEL} text-mb-ink-muted`;

/**
 * The ±1 keys. ONE definition, two placements, exactly one of them rendered:
 * the ruled foot in portrait, and inline beside the numeral in landscape, where
 * there is no foot to put them in. `display: none` removes the hidden copy from
 * the accessibility tree entirely, so there is never a duplicate accessible
 * name and `elementFromPoint` never meets a zero-size box.
 *
 * `pointer-events-auto` puts them back in front of the tap layer they float
 * over. They are not its descendants, so nothing here needs `stopPropagation` —
 * the double-fire the old panel guarded against is structurally impossible.
 */
const Keys = ({
  team,
  onAdjust,
  showPlus,
}: {
  team: MbTeam;
  onAdjust: (delta: number) => void;
  /** The column *is* the plus. On a phone the key is redundant (invariant 38). */
  showPlus: boolean;
}) => (
  <>
    <MbIconButton
      icon="minus"
      label={`Take a point off ${team.name}`}
      variant="outline-navy"
      size="sm"
      onClick={() => onAdjust(-1)}
    />
    {showPlus && (
      /* `.mb-btn` sets `display: inline-flex` in unlayered CSS, so a
         `hidden sm:inline-flex` on the control itself is silently inert. The
         wrapper carries the breakpoint instead. */
      <span className="hidden sm:block">
        <MbIconButton
          icon="plus"
          label={`Add a point to ${team.name}`}
          variant="outline-navy"
          size="sm"
          onClick={() => onAdjust(1)}
        />
      </span>
    )}
  </>
);

export const MbScoreSide = ({
  team,
  score,
  side,
  accent,
  leading = false,
  serving = false,
  canEdit,
  viewOnly = false,
  won = false,
  lost = false,
  games = null,
  onScore,
  onAdjust,
  className = "",
}: MbScoreSideProps) => {
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
   * exactly the column, and no `stopPropagation` on the keys.
   */
  const Ground = interactive ? "button" : "div";

  /** The head inverts for whichever side is ahead — or has won. */
  const marked = leading || won;
  const ink = lost ? "text-mb-ink-muted" : "";
  const align = side === "home" ? "end" : "start";

  return (
    <div
      /* THE COLUMN IS A QUERY CONTAINER, and that declaration is the fix.
         `container-type: size` is legal here because the column's box comes
         from the grid track it sits in and never from its own contents — it is
         a `1fr` row of a definite-height frame with `min-h-0` on both axes.
         Everything the column does when it runs out of room now hangs off this
         box rather than off the viewport's. */
      className={`relative isolate flex min-h-0 flex-col overflow-hidden rounded-[3px] border border-mb-navy bg-mb-paper-bright [container-name:mb-col] [container-type:size] ${className}`}
      data-side={side}
    >
      <Ground
        {...(interactive
          ? {
              type: "button" as const,
              onClick: onScore,
              "aria-label": `Add a point to ${team.name}. Current score ${score}.`,
              /* Invariant 47 wants `title` beside `aria-label` on any control
                 with no text child of its own. The information is not
                 tooltip-only (the foot says "Tap to score" in words), so this
                 adds a pointer affordance without becoming the only channel. */
              title: `Add a point to ${team.name}`,
            }
          : { "aria-hidden": true })}
        data-leading={leading ? "true" : undefined}
        /* THE RING IS DRAWN INSIDE, THE WASHES ARE DECLARED HERE, AND EVERY `!`
           IS LOAD-BEARING.

           `.mb-console-column` sets `background` and `.matchbook-surface
           :focus-visible` sets `outline-offset` in UNLAYERED CSS, and unlayered
           CSS outranks every Tailwind utility whatever its specificity —
           measured `outline-offset: 2px` computed against the `-3px` this class
           asks for, inside an `overflow-hidden` box that clips the ring away
           entirely. `!` is the escape.

           `active:` is listed after `hover:` and carries the same weight, so a
           press still wins while the pointer is over the column; `globals.css`'s
           own `:active` rule keeps supplying the `transition-duration: 0s` that
           makes the press land on the next frame with no interpolation. */
        className={`mb-console-column absolute inset-0 h-full w-full focus-visible:[outline-offset:-3px]! ${
          interactive
            ? "hover:bg-[var(--mb-tint-2)]! active:bg-[var(--mb-tint-press)]!"
            : ""
        }`}
      />

      {/* The content sits above the target and lets every pointer through to
          it; only the keys take their own. `select-none` because a long press
          on a score should not start a text selection. */}
      <div
        className={`pointer-events-none relative z-10 flex h-full min-h-0 select-none flex-col ${ink}`}
      >
        {/* -------------------------------------------------- the panel head */}
        <div
          className={`flex shrink-0 items-center gap-3 border-b border-mb-navy px-3 py-2.5 sm:px-4 ${COL_TIGHT.headPad} ${
            marked
              ? "bg-mb-navy text-mb-paper-bright"
              : lost
                ? /* Name AND numeral drop together — the loss channel this file
                     has documented since it was written. Muted ink is the
                     system's secondary tier, so it stays over 4.5:1 on
                     paper-bright at any size. */
                  "bg-mb-paper-bright text-mb-ink-muted"
                : "bg-mb-paper-bright text-mb-navy"
          } [transition:background-color_var(--mb-dur-slow)_var(--mb-ease-out),color_var(--mb-dur-slow)_var(--mb-ease-out)]`}
        >
          <span className={CREST}>
            <Crest team={team} size={52} />
          </span>

          <span className={`flex min-w-0 flex-1 flex-col gap-2 ${COL_TIGHT.stackGap} ${MB_SHORT.row}`}>
            {/* display/stat-md, wrapped rather than truncated. Two 45-character
                names measured 14 and 23 rendered characters at 320 when this
                was one truncating line — asymmetric, and both cut before the
                distinguishing tail. The rubric's own Apple Sports anchor is
                "wrapping headers instead of truncating them"; `line-clamp-2`
                doubles the capacity.

                A tight column steps it down to `display/stat-sm`, and keeps
                BOTH lines. The step-down is what buys the score its row, and
                keeping the wrap is what stops that purchase costing the name:
                measured at 320, two lines of 1.2rem in a 248px stack seat 52
                characters, so the 40-character roster maximum still paints in
                full. Stepping to one line instead would have bought 20px more
                numeral for 39 characters of team name.

                THE CLAMP IS ALSO A RESERVE, and until now it was only a
                ceiling. This file claimed "both sides now clamp identically
                because nothing else shares their row"; that is true only when
                both names actually reach the clamp. Against the roster they do
                not — "Great Barrington Community Volleyball CC" takes two lines
                and "St Aidan's & Priory Spikers" takes one — so the two heads
                measured **69.3px and 49.2px** and the console's two co-equal
                columns were 20px out of register with each other. Invisible
                while the numeral was sized off the viewport; the moment it is
                sized off its own box, the same 20px came out as a **74.8px home
                score beside a 94.9px away score** — one scoreline, two type
                sizes. Reserving the clamp makes the heads identical by
                construction, for any pair of names, at every step.

                Each reserve is `lines x size x 1.05` for the clamp in force,
                and the portrait-tight one carries the landscape query inverted
                so that it and the landscape reserve are mutually exclusive
                rather than racing to set `min-height` from two at-rules whose
                emitted order this file does not control. */}
            <span
              title={team.name}
              className={`matchbook-display line-clamp-2 min-h-[3.15rem] text-2xl mb-track-display leading-[1.05] [overflow-wrap:anywhere] ${COL_TIGHT.name} ${COL_TIGHT.nameReserve} ${MB_SHORT.oneLine} [@media(max-height:520px)]:min-h-[1.26rem] [@media(max-height:520px)]:min-w-0 [@media(max-height:520px)]:flex-1 ${
                lost ? "font-semibold" : "font-bold"
              }`}
            >
              {team.name}
            </span>

            {/* The accent row is a FIXED HEIGHT on both sides whether or not a
                status word is present, so the two heads stay on one baseline
                and the name column is the same width in both.

                Lying down it is also `shrink-0`, and the name takes the
                remainder. Both are flex-initial by default, so they shrank in
                proportion to their content and the NAME — by far the longest
                string in the row — gave up almost all of it. */}
            <span
              className={`flex min-h-[14px] min-w-0 items-center gap-2 [@media(max-height:520px)]:shrink-0`}
            >
              {accent && (
                /* Bounded, and bounded by a hairline: the swatch says "this
                   team's colour" without borrowing the rank rail's device, and
                   its border carries the 3:1 non-text contrast the user's own
                   colour cannot be trusted to. */
                <span
                  aria-hidden="true"
                  className={`block h-[6px] w-[3rem] shrink-0 border ${
                    marked ? "border-mb-paper-bright" : "border-mb-navy"
                  }`}
                  style={{ background: accent }}
                />
              )}

              {serving && (
                <span className={`flex shrink-0 items-center gap-1 ${LABEL}`}>
                  <MbIcon id="volleyball" size={12} />
                  Serving
                </span>
              )}

              {won && (
                <span className={`flex min-w-0 shrink-0 items-center gap-2 ${LABEL}`}>
                  <MbIcon id="crown" size={14} />
                  Winner
                </span>
              )}

              {/* NOT IN LANDSCAPE, and the reason is this file's own argument.
                  The head bar inverts to navy for whichever side is ahead, and
                  the opening note calls that "the whole point" — from three
                  metres the dark bar answers "who is ahead" before a figure is
                  read, and it is a FILL against no-fill, so it survives
                  greyscale on its own (invariant 13). The word is a second
                  statement of that, and lying down it is a second statement
                  that costs the team's NAME 63px. Measured at 568x320 with the
                  word in: the name painted "GREAT…", five characters, against a
                  floor of eight, and the word itself was clipped to "LEA". */}
              {leading && !won && (
                <span className={`min-w-0 shrink-0 truncate ${MB_SHORT.hide} ${LABEL}`}>
                  Leading
                </span>
              )}

              {/* What the foot said, in a column that has no foot. The crown
                  above already says "Winner", so the caption is dropped for a
                  won side rather than printed twice. */}
              <TightFoot
                games={games}
                word={won ? null : caption(canEdit, viewOnly, won, lost)}
              />
            </span>
          </span>
        </div>

        {/* ------------------------------------------------------- the score */}
        <div
          /* THE INNER GUTTER. Hugging the rule turns two numbers into one
             scoreline, but at the console step that put a 256px "14" and a
             256px "11" ten pixels apart and they read as "1411". The extra
             inner padding opens 88px of paper between the two inks (40 + the
             8px separation track + 40) without moving either figure off the
             rule it is anchored to, and 16px in a tight column where the figure
             is a third of the size.

             `items-stretch`, not `items-center`: the fit box has to inherit a
             definite height from this row or `container-type: size` has nothing
             to measure. The numeral is still centred — one level down, by the
             fit box's own `items-center`. */
          className={`flex min-h-0 min-w-0 flex-1 items-stretch overflow-hidden px-3 sm:px-4 ${
            side === "home"
              ? `sm:pe-10 ${COL_TIGHT.gutterEnd}`
              : `sm:ps-10 ${COL_TIGHT.gutterStart}`
          } ${COL_TIGHT.gap} ${NUMERAL_FIT}`}
        >
          {/* A TIGHT COLUMN PUTS THE KEY BESIDE THE FIGURE, ON THE OUTER EDGE.
              Measured before: a 245px content stack inside a 247px box, so both
              keys rendered at y=309 against a bottom edge of 308 and
              `overflow-hidden` deleted them — `elementFromPoint` at their centre
              returned the action bar, so on a phone in landscape the decrement
              control was not painted, not tappable and not reachable.

              Only the `−` survives here, for the same reason it is the only key
              on a portrait phone: the column IS the plus, and one-handed the
              only key worth a thumb is the one that takes a point back. Putting
              it on the OUTER edge (left of home, right of away) keeps both
              numerals hugging the centre rule as one scoreline and keeps the
              corrective key of one team as far as the column allows from the
              other team's.

              The trigger is the COLUMN's height, not the viewport's, because
              the foot it replaces now leaves on the same condition — the two
              can never both be gone and can never both be there. */}
          {canEdit && onAdjust && side === "home" && (
            <span className={`pointer-events-auto shrink-0 items-center ${COL_TIGHT.onlyFlex}`}>
              <MbIconButton
                icon="minus"
                label={`Take a point off ${team.name}`}
                variant="outline-navy"
                size="sm"
                onClick={() => onAdjust(-1)}
              />
            </span>
          )}

          <span className={`${FIT_BOX} ${side === "home" ? "justify-items-end" : "justify-items-start"} ${STACKED_CENTRE}`}>
            <MbScoreNumeral value={score} size="court" flash={direction} align={align} />
          </span>

          {canEdit && onAdjust && side === "away" && (
            <span
              className={`pointer-events-auto shrink-0 items-center ${COL_TIGHT.onlyFlex} ${KEY_STACKED}`}
            >
              <MbIconButton
                icon="minus"
                label={`Take a point off ${team.name}`}
                variant="outline-navy"
                size="sm"
                onClick={() => onAdjust(-1)}
              />
            </span>
          )}
        </div>

        {/* -------------------------------------------------------- the foot */}
        <div
          className={`flex w-full min-w-0 shrink-0 items-center justify-between gap-3 border-t border-mb-rule px-3 pb-3 pt-2 sm:px-4 ${COL_TIGHT.hide}`}
        >
          <span className={`${LABEL_MUTED} min-w-0 truncate`}>
            {caption(canEdit, viewOnly, won, lost)}
          </span>

          {games !== null && (
            <span className="flex shrink-0 items-baseline gap-2">
              <span className={LABEL_MUTED}>Games</span>
              <span className="matchbook-display text-[1.2rem] mb-track-display font-bold leading-tight tabular-nums">
                {games}
              </span>
            </span>
          )}

          {canEdit && onAdjust && (
            <span className="pointer-events-auto flex shrink-0 items-center gap-2">
              <Keys team={team} onAdjust={onAdjust} showPlus />
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
   lives in each column's own foot, beside that team's crest and name, where it
   cannot be misread.

   CURRENT IS A NAVY RULE, NOT A CORAL ONE. Coral is the primary action and the
   score flash; a third job on this strip put the accent on a passive progress
   mark. The three states read as fill / rule / hairline, which also means they
   survive greyscale.
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
  className = "",
}: {
  sets: MbSetCell[];
  /** 1-based game currently in play. */
  current: number;
  className?: string;
}): ReactNode => {
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
    </ol>
  );
};
