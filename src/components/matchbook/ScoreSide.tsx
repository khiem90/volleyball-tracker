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
   THE SHORT-VIEWPORT VOCABULARY — one place, two consumers

   `@media (max-height: 520px)` is the landscape contract (brief §3.4, charter
   invariant 39). It cannot be a prop: a JS-driven layout switch renders the
   portrait geometry first and swaps it a frame later, which is a visible shift
   on the one device the contract exists for. It cannot be a `globals.css`
   utility either — that file is W1-exclusive for the whole programme (charter
   H1) — and design language §7.3 rules out reusing zone B's `.hide-landscape`
   family, naming "write the media query locally" as the sanctioned alternative.

   So it is written locally, ONCE, as a named vocabulary that both this file and
   `MatchConsole.tsx` import. Each class is spelled out in full because Tailwind
   generates a utility only when its literal text appears in a source file — a
   template that assembles one compiles to nothing at all.

   **W1 follow-up:** promote these four to `.mb-console-short-*` in zone A and
   delete this object; it is a screen-local vocabulary only because the
   stylesheet is frozen to this workstream.
   --------------------------------------------------------------------------- */
export const MB_SHORT = {
  /** Gone in landscape: the row simply does not exist rather than being clipped. */
  hide: "[@media(max-height:520px)]:hidden",
  /** Present only in landscape. */
  only: "hidden [@media(max-height:520px)]:flex",
  /** Two columns side by side whatever the width, with the 8px separation track. */
  sideBySide:
    "[@media(max-height:520px)]:grid-cols-[1fr_8px_1fr] [@media(max-height:520px)]:grid-rows-1",
  /**
   * Vertical slack is what landscape has none of: everything on one line.
   *
   * Applied to the head AND to the name stack inside it, which is what takes
   * the head from 72px to 45px. Measured before: at 740x360 the head ran
   * 113..185 (a 52px crest plus a stacked name and accent row), leaving a 65px
   * score row for a 91px numeral box — the figure bled 13px past the column and
   * `overflow-hidden` took the bottom off it.
   */
  row: "[@media(max-height:520px)]:flex-row [@media(max-height:520px)]:items-center [@media(max-height:520px)]:gap-3 [@media(max-height:520px)]:py-1",
} as const;

/**
 * The crest, at three steps, on one element.
 *
 * `Crest` renders a `next/image` with fixed `width`/`height` attributes, so the
 * step has to be a CSS override on the `<img>` it produces; three wrapper spans
 * with `hidden` between them would put three copies of the same asset in the
 * DOM and in the accessibility tree. Every pair holds the crest pack's own
 * 96:112 aspect (36x42, 52x61, 32x37) so nothing is distorted at any step.
 */
const CREST =
  "shrink-0 [&>img]:h-[42px] [&>img]:w-[36px] sm:[&>img]:h-[61px] sm:[&>img]:w-[52px] [@media(max-height:520px)]:[&>img]:h-[37px] [@media(max-height:520px)]:[&>img]:w-[32px]";

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
 * THE NUMERAL IS SIZED BY THE ROOM THE COLUMN HAS, NOT BY THE VIEWPORT'S WIDTH.
 *
 * `.mb-numeral--court` bakes `display/score-2xl` as `clamp(4rem, 18vw, 9rem)`,
 * and the middle term is the problem: `18vw` is a WIDTH rule on a console whose
 * scarce axis is HEIGHT. Measured on the first cut, that painted **144px at
 * 1440 and 70.2px at 390** — the phone got half the desktop's hero on the one
 * screen whose whole premise is one-handed use in a loud gym.
 *
 * The growth term is re-authored to `min(36vh, 34vw)`, which is ONE expression
 * covering every case the previous cut needed two `!` overrides and a hard-coded
 * landscape step-down for. The step's own floor (`4rem`) and ceiling (`9rem`)
 * are untouched, and every measured value is unchanged or better:
 *
 *   1440x900   min(324, 489.6)  -> 144   (the ceiling; identical to before)
 *    390x844   min(303.8, 132.6) -> 132.6
 *    375x812   min(292.3, 127.5) -> 127.5
 *    320x844   min(303.8, 108.8) -> 108.8
 *    844x390   min(140.4, 287)  -> 140.4
 *
 * The `vh` arm is what keeps a landscape phone's figure inside its 200px column;
 * the `vw` arm is what stops a 3-figure score running out of column at 320.
 * `!` because `.mb-numeral--court` sets `font-size` in UNLAYERED CSS, which
 * outranks every Tailwind utility regardless of specificity.
 *
 * **W1 follow-up:** `display/score-2xl`'s growth term should become
 * `min(36vh, 34vw)` in design language §2.1 and in `globals.css`, at which point
 * this line and its `!` disappear.
 */
const NUMERAL_STACKED = "[&_.mb-numeral]:text-[clamp(4rem,min(36vh,34vw),9rem)]!";

/**
 * Side by side, the column owns the full height and HALF the width, so the
 * binding constraint flips from `vh` to `vw` and the ceiling stops being the
 * thing that matters.
 *
 * The reserve is three figures at `1ch`, and `1ch` in Oswald 700 is 0.55em, so
 * a column of content width `W` can carry `W / 1.65` before the figure runs out
 * of paper. That is 27.8vw at 768 and 29.0vw at 1440; **26vw** clears both with
 * a margin and clears the 640px `sm` boundary itself (166.4px against a 284px
 * content box) where 27vw is one pixel over.
 *
 *   1440x900  min(324, 374.4) -> 324 -> 256 (the ceiling)
 *   1280x800  min(288, 332.8) -> 288 -> 256
 *    834x1112 min(400, 216.8) -> 216.8
 *    768x1024 min(368.6, 199.7) -> 199.7
 *
 * **The ceiling is 16rem, not the step's 9rem, and that is a deliberate
 * divergence.** At 9rem the figure painted 144px inside a 715px column at
 * 1440x900 — 20% of the column's height, with ~80% of the console blank cream,
 * which is rubric D2's five-anchor verbatim ("lots of dead vertical space") and
 * fails the brief's own premise that this screen is read at three metres. 9rem
 * is a sane ceiling for `MbScoreboardHero`, which shares a row with two name
 * cells; it is not one for a full-bleed console column that has nothing else in
 * it. **W1 follow-up:** `display/score-2xl` needs a second row in §2.1 — a
 * `console` cut at `clamp(4rem, min(36vh, 26vw), 16rem)` — after which this
 * line and its `!` disappear.
 */
const NUMERAL_WIDE = "sm:[&_.mb-numeral]:text-[clamp(4rem,min(36vh,26vw),16rem)]!";

/**
 * Landscape gets its own coefficient, and it is arithmetic rather than taste.
 *
 * At `max-height: 520px` the column's own head (40px) sits under a 53px chrome
 * strip, a 61px event bar, a hint line and the 82px rail, so what is left for
 * the figure is `H − 263`, not a fraction of `H`. Against the side-by-side rule
 * the figure overflowed its row by 20px at 740x360 — `36vh` is 129.6px and the
 * row measured 96.7 — and `overflow-hidden` would have taken the bottom off
 * every numeral on the screen.
 *
 *   844x390  min(109.2, 219.4) -> 109.2, line box 98.3 in a 127px row
 *   740x360  min(100.8, 192.4) -> 100.8, line box 90.7 in a 97px row
 *   667x375  min(105, 173.4)   -> 105,   line box 94.5 in a 112px row
 *
 * A `calc((100vh − 263px) / 0.9)` term would be exact and is deliberately not
 * used: it hard-codes five other components' heights into this file and fails
 * silently the moment one of them changes.
 */
const NUMERAL_SHORT =
  "[@media(max-height:520px)]:[&_.mb-numeral]:text-[clamp(4rem,min(26vh,26vw),16rem)]!";

/**
 * Below `sm` the two columns are STACKED, so there is no rule between them for
 * the figures to hug — the divider is horizontal and the pair reads top to
 * bottom. The reserve re-centres, and the flash rule (which `ScoreNumeral`
 * anchors to whichever edge `align` names) re-centres with it, so the 3px mark
 * still lands on the figures rather than 8px outside them.
 *
 * `!` twice for the same reason both times: `ScoreNumeral` sets `text-align`
 * and the anchor offset as INLINE styles, which only `!important` outranks.
 */
const STACKED_CENTRE =
  "max-sm:[&_.mb-numeral]:text-center! max-sm:[&_.mb-score-rule]:right-auto! max-sm:[&_.mb-score-rule]:left-1/2! max-sm:[&_.mb-score-rule]:-translate-x-1/2!";

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
  "matchbook-display text-[0.74rem] font-bold uppercase leading-none tracking-[0.1em] sm:text-[0.66rem]";

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
      tone="outline-navy"
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
          tone="outline-navy"
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
      className={`relative isolate flex min-h-0 flex-col overflow-hidden rounded-[3px] border border-mb-navy bg-mb-paper-bright ${className}`}
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
          className={`flex shrink-0 items-center gap-3 border-b border-mb-navy px-3 py-2.5 sm:px-4 ${MB_SHORT.row} ${
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

          <span className={`flex min-w-0 flex-1 flex-col gap-2 ${MB_SHORT.row}`}>
            {/* display/stat-md, wrapped rather than truncated. Two 45-character
                names measured 14 and 23 rendered characters at 320 when this
                was one truncating line — asymmetric, and both cut before the
                distinguishing tail. The rubric's own Apple Sports anchor is
                "wrapping headers instead of truncating them"; `line-clamp-2`
                doubles the capacity and both sides now clamp identically
                because nothing else shares their row. */}
            <span
              title={team.name}
              className={`matchbook-display line-clamp-2 text-2xl leading-[1.05] [overflow-wrap:anywhere] [@media(max-height:520px)]:line-clamp-1 [@media(max-height:520px)]:text-[1.2rem] ${
                lost ? "font-semibold" : "font-bold"
              }`}
            >
              {team.name}
            </span>

            {/* The accent row is a FIXED HEIGHT on both sides whether or not a
                status word is present, so the two heads stay on one baseline
                and the name column is the same width in both. */}
            <span className="flex min-h-[14px] min-w-0 items-center gap-2">
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

              {leading && !won && (
                <span className={`min-w-0 shrink-0 truncate ${LABEL}`}>Leading</span>
              )}
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
             rule it is anchored to, and 32px in landscape where the figure is
             a third of the size. */
          className={`flex min-h-0 min-w-0 flex-1 items-center overflow-hidden px-3 sm:px-4 ${
            side === "home"
              ? "justify-center sm:justify-end sm:pe-10 [@media(max-height:520px)]:pe-4"
              : "justify-center sm:justify-start sm:ps-10 [@media(max-height:520px)]:ps-4"
          } [@media(max-height:520px)]:justify-between [@media(max-height:520px)]:gap-2 ${NUMERAL_STACKED} ${NUMERAL_WIDE} ${NUMERAL_SHORT} ${STACKED_CENTRE}`}
        >
          {/* LANDSCAPE PUTS THE KEY BESIDE THE FIGURE, ON THE OUTER EDGE.
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
              other team's. */}
          {canEdit && onAdjust && side === "home" && (
            <span className={`pointer-events-auto shrink-0 items-center ${MB_SHORT.only}`}>
              <MbIconButton
                icon="minus"
                label={`Take a point off ${team.name}`}
                tone="outline-navy"
                size="sm"
                onClick={() => onAdjust(-1)}
              />
            </span>
          )}

          <MbScoreNumeral value={score} size="court" flash={direction} align={align} />

          {canEdit && onAdjust && side === "away" && (
            <span className={`pointer-events-auto shrink-0 items-center ${MB_SHORT.only}`}>
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

        {/* -------------------------------------------------------- the foot */}
        <div
          className={`flex w-full min-w-0 shrink-0 items-center justify-between gap-3 border-t border-mb-rule px-3 pb-3 pt-2 sm:px-4 ${MB_SHORT.hide}`}
        >
          <span className={`${LABEL_MUTED} min-w-0 truncate`}>
            {caption(canEdit, viewOnly, won, lost)}
          </span>

          {games !== null && (
            <span className="flex shrink-0 items-baseline gap-2">
              <span className={LABEL_MUTED}>Games</span>
              <span className="matchbook-display text-[1.2rem] font-bold leading-tight tabular-nums">
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
