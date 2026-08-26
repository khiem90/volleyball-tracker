"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { MbIcon } from "./MbIcon";
import { MbIconButton } from "./IconButton";
import { MbScoreNumeral } from "./ScoreNumeral";
import { Crest } from "./Panel";
import type { MbTeam } from "./types";

/* The live scoring column: a panel with a head bar (the leading side inverts
   to navy — fill against no-fill, so it survives greyscale), a container-sized
   numeral, and a ruled foot. Built for one-handed use in a loud gym: the whole
   column is the tap target, and nothing may reflow when the score changes.
   Hover/press washes are declared at the call site because `.mb-console-column`
   sets `background` in unlayered CSS. */

export type MbScoreSideId = "home" | "away";

/* Two vocabularies for two different quantities:
     MB_SHORT   the VIEWPORT is short (landscape) — governs which way things lie
                down, nothing else.
     COL_TIGHT  the COLUMN is short — a container query on the column's own box
                (viewport − chrome − rail, halved when stacked) — governs what
                the column can afford: the foot, the crest step, the name step.
   Each class is spelled out in full because Tailwind only generates a utility
   whose literal text appears in a source file. Neither can be a prop: a
   JS-driven layout switch renders one geometry and swaps it a frame later. */
export const MB_SHORT = {
  /** Two columns side by side whatever the width, with the 8px separation track. */
  sideBySide:
    "[@media(max-height:520px)]:grid-cols-[1fr_8px_1fr] [@media(max-height:520px)]:grid-rows-1",
  /** Gone in landscape: the row does not exist rather than being clipped. */
  hide: "[@media(max-height:520px)]:hidden",
  /**
   * Landscape has no vertical slack: the name stack lies down beside the crest.
   * `gap-x-3`, not `gap-3` — the tight vocabulary sets the stack's *row* gap and
   * this sets its *column* gap, so neither query has to win an at-rule ordering
   * race.
   */
  row: "[@media(max-height:520px)]:flex-row [@media(max-height:520px)]:items-center [@media(max-height:520px)]:gap-x-3",
  /**
   * One line, filled to the last glyph that fits — `line-clamp-1` breaks at a
   * word boundary and wastes the rest of the line. Spelled out rather than
   * `truncate` because the base step's `display:-webkit-box` and
   * `-webkit-line-clamp:2` both have to be unset or the box keeps clamping and
   * never ellipsises.
   */
  oneLine:
    "[@media(max-height:520px)]:[display:block] [@media(max-height:520px)]:[-webkit-line-clamp:unset] [@media(max-height:520px)]:overflow-hidden [@media(max-height:520px)]:whitespace-nowrap [@media(max-height:520px)]:text-ellipsis",
} as const;

/**
 * The column queries itself; `mb-col` is declared on the column root below.
 * 360px = head + foot chrome (~158px) plus the minimum room a glanceable
 * numeral needs; the threshold sits in a large gap between real column heights.
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
  /** The inner gutter, at a third of the size, beside a third-size figure.
   *
   * Stacked portrait takes it back out, with `!` so the at-rule emission order
   * cannot decide: stacked, the rule the figures hug is horizontal, and the
   * asymmetric padding would skew the two fit boxes off one vertical. Symmetric
   * `pe-3`/`ps-3` restores the base padding exactly there. */
  gutterEnd:
    "[@container_mb-col_(max-height:360px)]:pe-4 [@media(max-width:639px)_and_(min-height:521px)]:pe-3!",
  gutterStart:
    "[@container_mb-col_(max-height:360px)]:ps-4 [@media(max-width:639px)_and_(min-height:521px)]:ps-3!",
  /** Separation between the inline key and the fit box. */
  gap: "[@container_mb-col_(max-height:360px)]:gap-2",
} as const;

/**
 * Stacked, both `−` keys go to the same edge: the away key takes `order-first`
 * so both fit boxes are the same box in the same place and the two figures land
 * on one vertical. (Absolute-positioning the key instead lets the reserve paint
 * underneath it.)
 */
const KEY_STACKED = "[@media(max-width:639px)_and_(min-height:521px)]:order-first";

/**
 * The crest, at three steps, on one element. `Crest` renders a `next/image`
 * with fixed `width`/`height`, so the steps must be CSS overrides on the `<img>`
 * it produces — wrapper spans with `hidden` would put three copies of the asset
 * in the DOM and the accessibility tree. Every pair holds the crest pack's
 * 96:112 aspect. The small step is keyed to the COLUMN, not the viewport, so a
 * wide-but-short column takes it too.
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
 * The numeral is sized by the box it is in, not the viewport: `.mb-score-fit`
 * is a `container-type: size` box holding nothing but the numeral, so `cqh`/`cqw`
 * ARE the room available. Coefficients come from Oswald 700 metrics: at
 * `line-height: 0.9` the ink fits while F ≤ 1.064R (100cqh leaves headroom for
 * subpixel rounding), and the width term uses the fixed 3-figure 1ch reserve
 * (1.65F), never the rendered digit count — otherwise 9→10 would resize the
 * numeral. Deliberately no floor: a floor inside a 0px row is how a score goes
 * invisible; if the room is wrong, fix the layout. The selector is
 * `.mb-numeral--court` because the flash rule carries that class too and must
 * scale with the face. `!` because the class sets `font-size` in unlayered CSS,
 * which outranks every Tailwind utility.
 */
const NUMERAL_FIT = "[&_.mb-numeral--court]:text-[min(100cqh,58cqw,16rem)]!";

/**
 * The fit box: the query container, and nothing else. `container-type: size`
 * needs a size independent of its contents in BOTH axes — width comes from the
 * flex line (basis 0, grow 1), height from the row's `items-stretch`.
 * `contain: size` then guarantees the numeral can never reflow the column.
 * `grid` + `justify-items` (not the row's `justify-*`) so the reserve keeps
 * hugging the rule between the two columns.
 */
const FIT_BOX =
  "relative grid min-w-0 flex-1 items-center [container-name:mb-col-score] [container-type:size]";

/**
 * Stacked (`width < 640 AND height > 520` — NOT `max-sm`: 568x320 is landscape
 * and side by side) there is no vertical rule to hug, so the reserve, the ink
 * overlay and the flash rule all re-centre. `!` on each because `ScoreNumeral`
 * positions the overlay and the rule-hugging `translate` as INLINE styles,
 * which only `!important` outranks.
 */
const STACKED_CENTRE =
  "[@media(max-width:639px)_and_(min-height:521px)]:justify-items-center " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-numeral]:translate-x-0! " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-numeral-ink]:left-0! " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-numeral-ink]:right-0! " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-numeral-ink]:mx-auto! " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-score-rule]:right-auto! " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-score-rule]:left-1/2! " +
  "[@media(max-width:639px)_and_(min-height:521px)]:[&_.mb-score-rule]:-translate-x-1/2!";

/**
 * Three live states, three sentences — never a blank column. On a finished
 * match the caption carries the RESULT ("Won" / "Lost"); the status is already
 * stamped once in the fixture line.
 */
const caption = (canEdit: boolean, viewOnly: boolean, won: boolean, lost: boolean): string => {
  if (canEdit) return "Tap to score";
  if (viewOnly) return "Live · read only";
  if (won) return "Won";
  if (lost) return "Lost";
  return "Final";
};

/**
 * A tight column has no foot, so the caption and the per-side games count (the
 * only place the app says which team is 2-1 up in a series) move into the
 * head's accent row, which is already reserved and painted — zero extra height.
 * `display: none` keeps exactly one copy of each in the accessibility tree.
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
    {/* Not in landscape: lying down the accent row sits BESIDE the name, and
        every pixel the word takes comes out of the team's identity. */}
    {word && (
      <span className={`min-w-0 truncate ${COL_TIGHT.onlyBlock} ${MB_SHORT.hide} ${LABEL}`}>
        {word}
      </span>
    )}
  </>
);

/**
 * Two named label steps sharing one (weight, tracking): `display/meta`
 * (0.74rem) on the phone, `display/status` (0.66rem) from `sm` up. Written as
 * utilities rather than as an override of `.mb-kicker`, whose `font-size` is
 * unlayered and would win against any utility anyway.
 */
const LABEL =
  "matchbook-display text-[0.74rem] mb-track-status font-bold uppercase leading-none sm:text-[0.66rem]";

/** The same label on paper ink, for the inverted head. */
const LABEL_MUTED = `${LABEL} text-mb-ink-muted`;

/**
 * The ±1 keys. One definition, two placements, exactly one rendered:
 * `display: none` removes the hidden copy from the accessibility tree, so there
 * is never a duplicate accessible name and `elementFromPoint` never meets a
 * zero-size box. `pointer-events-auto` puts them back in front of the tap layer
 * they float over; they are not its descendants, so no `stopPropagation`.
 */
const Keys = ({
  team,
  onAdjust,
  showPlus,
}: {
  team: MbTeam;
  onAdjust: (delta: number) => void;
  /** The column *is* the plus. On a phone the key is redundant. */
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
   * The tap target is a real `<button>`, and it is a SIBLING of the content:
   * wrapping the column in a `<button>` is invalid HTML because the `−`/`+`
   * keys are buttons and a button may not contain one. So the target is a
   * full-bleed layer BEHIND the content, and the content is
   * `pointer-events-none` with the keys opting back in — native semantics, a
   * hit area that is exactly the column, and no `stopPropagation`.
   */
  const Ground = interactive ? "button" : "div";

  /** The head inverts for whichever side is ahead — or has won. */
  const marked = leading || won;
  const ink = lost ? "text-mb-ink-muted" : "";
  const align = side === "home" ? "end" : "start";

  return (
    <div
      /* The column is the query container. `container-type: size` is legal here
         because the column's box comes from the grid track it sits in, never
         from its own contents. */
      className={`relative isolate flex min-h-0 flex-col overflow-hidden rounded-[3px] border border-mb-navy bg-mb-paper-bright [container-name:mb-col] [container-type:size] ${className}`}
      data-side={side}
    >
      <Ground
        {...(interactive
          ? {
              type: "button" as const,
              onClick: onScore,
              "aria-label": `Add a point to ${team.name}. Current score ${score}.`,
              /* A pointer affordance beside the aria-label; not the only
                 channel — the foot says "Tap to score" in words. */
              title: `Add a point to ${team.name}`,
            }
          : { "aria-hidden": true })}
        data-leading={leading ? "true" : undefined}
        /* Every `!` is load-bearing: `.mb-console-column` sets `background` and
           `.matchbook-surface :focus-visible` sets `outline-offset` in
           UNLAYERED CSS, which outranks every Tailwind utility — and the ring
           must draw inside (`-3px`) or `overflow-hidden` clips it away.
           `active:` is listed after `hover:` so a press still wins while the
           pointer is over the column. */
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
                ? /* Name and numeral drop to muted ink together. */
                  "bg-mb-paper-bright text-mb-ink-muted"
                : "bg-mb-paper-bright text-mb-navy"
          } [transition:background-color_var(--mb-dur-slow)_var(--mb-ease-out),color_var(--mb-dur-slow)_var(--mb-ease-out)]`}
        >
          <span className={CREST}>
            <Crest team={team} size={52} />
          </span>

          <span className={`flex min-w-0 flex-1 flex-col gap-2 ${COL_TIGHT.stackGap} ${MB_SHORT.row}`}>
            {/* Wrapped, not truncated (`line-clamp-2`); a tight column steps
                the size down but keeps both lines.

                The clamp is also a RESERVE: without the `min-h`, a one-line
                name against a two-line name makes the two heads different
                heights, and the moment the numeral is sized off its own box
                that skew comes out as one scoreline in two type sizes.
                Reserving the clamp makes the heads identical by construction.
                The portrait-tight reserve carries the landscape query inverted
                so the two reserves are mutually exclusive rather than racing
                to set `min-height`. */}
            <span
              title={team.name}
              className={`matchbook-display line-clamp-2 min-h-[3.15rem] text-2xl mb-track-display leading-[1.05] [overflow-wrap:anywhere] ${COL_TIGHT.name} ${COL_TIGHT.nameReserve} ${MB_SHORT.oneLine} [@media(max-height:520px)]:min-h-[1.26rem] [@media(max-height:520px)]:min-w-0 [@media(max-height:520px)]:flex-1 ${
                lost ? "font-semibold" : "font-bold"
              }`}
            >
              {team.name}
            </span>

            {/* Fixed height on both sides whether or not a status word is
                present, so the two heads stay on one baseline. Lying down it is
                `shrink-0` so the shrink comes out of the name, not the row. */}
            <span
              className={`flex min-h-[14px] min-w-0 items-center gap-2 [@media(max-height:520px)]:shrink-0`}
            >
              {accent && (
                /* Bounded swatch with a hairline border: never reads as a rank
                   rail, and the border carries the 3:1 non-text contrast the
                   user's own colour cannot be trusted to. */
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

              {/* Not in landscape: the inverted head already answers "who is
                  ahead", and lying down the word costs the team's name its
                  width. */}
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
          /* The inner gutter opens paper between the two inks without moving
             either figure off the rule it is anchored to (side by side, two
             large numerals ten pixels apart read as one four-digit number).
             `items-stretch`, not `items-center`: the fit box must inherit a
             definite height or `container-type: size` has nothing to measure —
             the numeral is centred one level down, by the fit box itself. */
          className={`flex min-h-0 min-w-0 flex-1 items-stretch overflow-hidden px-3 sm:px-4 ${
            side === "home"
              ? `sm:pe-10 ${COL_TIGHT.gutterEnd}`
              : `sm:ps-10 ${COL_TIGHT.gutterStart}`
          } ${COL_TIGHT.gap} ${NUMERAL_FIT}`}
        >
          {/* A tight column has no foot, so the `−` key moves inline, on the
              OUTER edge — the numerals keep hugging the centre rule, and each
              team's corrective key sits as far as possible from the other's.
              Only the `−` survives here: the column IS the plus. The trigger is
              the COLUMN's height, the same condition the foot leaves on, so the
              two can never both be gone nor both be there. */}
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

/* The set strip: one cell per game in a series. The app stores win totals and
   a game counter, NOT which game each win came from, so the strip claims only
   played / current / upcoming; the per-side count lives in each column's own
   foot, beside that team's name. The three states read as fill / rule /
   hairline, so they survive greyscale, and current is navy, not coral — coral
   stays reserved for the primary action and the score flash. */

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
    /* No size utilities on the cells: `.mb-score-box` sets `min-width`,
       `height` and `font-size` in unlayered CSS, so any utility here is
       silently inert. */
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
