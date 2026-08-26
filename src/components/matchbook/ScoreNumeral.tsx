"use client";

import { useState } from "react";

export type MbScoreNumeralSize = "compact" | "console" | "court";

/**
 * Where the figures sit inside the reserved box. `center` is the default and
 * the only sane choice for a numeral standing on its own (a console column, a
 * stat). A *pair* flanking a divider uses `end` / `start` instead, so both
 * scores hug the rule between them — see the note on `align` below.
 */
export type MbScoreNumeralAlign = "center" | "start" | "end";

const FADE_IN = "mb-fade var(--mb-dur-fast) var(--mb-ease-out) both";
const FADE_OUT = "mb-fade var(--mb-dur-fast) var(--mb-ease-out) reverse both";
const EDGE = "mb-fade var(--mb-dur-slow) var(--mb-ease-out) reverse both";

/** Where a marking rule hangs, so it tracks the figures rather than the box. */
const EDGE_ANCHOR: Record<MbScoreNumeralAlign, React.CSSProperties> = {
  center: { left: "50%", transform: "translateX(-50%)" },
  start: { left: -8 },
  end: { right: -8 },
};

/**
 * How many figures the box reserves at every size step. Three, not two: a
 * 2ch floor only holds the box still to 99, and the point that crosses 99
 * would widen it mid-match — pixels that come straight out of the name
 * columns. Three covers everything this app scores; four is only a season
 * total, which is a stat — those callers pass `digits` explicitly.
 *
 * The reserve is `digits`ch on the LAYER at the step's own font-size — never
 * the ink scale below — so the box costs the same at 0 as at 108.
 * `MbScoreboardHero` chooses its layout from the leftover room.
 */
const RESERVED_DIGITS = 3;

/* ===========================================================================
   OPTICAL MASS — ink coverage of the reserved box must stay roughly even
   across the score range. Oswald ships no width axis to equalise with, so the
   substitute is SIZE by digit count: fewer figures render larger, more render
   smaller, and the RESERVED BOX never moves. 0.78 rather than 0.80 because
   "1" is the lightest glyph in the set and "25 v 1" broke the cap at 0.80;
   1.12 and not more because the court step can run at exactly `100cqh` and a
   larger scale leaves no headroom before a clipped cap. (Per-glyph
   equalisation is out on principle: it would scale 18 differently from 19
   and break the repaint-one-glyph contract below.)

   HOW THE BOX SURVIVES: the layer is a fixed box — `digits`ch wide, 0.9em
   tall, the step's own font-size — and the figures live in an absolutely
   positioned overlay (`.mb-numeral-ink`) at `fontSize: <scale>em`, anchored
   to the bottom. With `line-height: 0.9` every box's baseline sits exactly on
   its bottom edge, so overlay-bottom-on-layer-bottom IS baseline-on-baseline
   at every scale. Nothing inline-level scales: a digit-count change
   cross-fades between two overlays and reflows 0.00px.
   =========================================================================== */
const INK_SCALE = [1, 1.12, 0.78, 0.72] as const;

/** The ink scale for a rendered figure count. 4+ figures keep the 3-figure step. */
export const mbInkScale = (figures: number): number =>
  INK_SCALE[Math.min(Math.max(Math.round(figures), 1), 3)];

/* ===========================================================================
   DIVIDER CENTRING ON INK, NOT ON THE BOX. A cell is 1ch with the glyph's
   advance centred inside it, so the paper between the rule and the first ink
   varies with whichever figure lands against the rule (tabular "1" is the
   worst). Each hugging layer translates toward the rule by the measured inset
   of its EDGE figure (the per-glyph tables below, 1/100 em), normalising the
   rule-to-ink paper to a constant 0.045em. The shift is a static `translate`
   — paint-only, so the reserve and layout cannot see it — applied per LAYER,
   so an outgoing value keeps its own correction while it fades. `ScoreSide`'s
   stacked mode centres with `!important` utilities, which outrank an inline
   `translate`, so the correction cannot leak into a centred layout.
   =========================================================================== */
const INSET_LEFT: Record<string, number> = {
  "0": 5, "1": 9.25, "2": 4.8, "3": 4.8, "4": 3.3,
  "5": 6.05, "6": 4.6, "7": 6.55, "8": 4.45, "9": 3.6,
};
const INSET_RIGHT: Record<string, number> = {
  "0": 5, "1": 15.75, "2": 4.2, "3": 4.2, "4": 2.7,
  "5": 4.95, "6": 4.4, "7": 8.45, "8": 4.55, "9": 5.4,
};
/** Rule-to-ink paper both sides normalise to, in 1/100 of the step's em. */
const INSET_TARGET = 4.5;

/**
 * The translate (em of the STEP size, not of the scaled ink) that seats a
 * value's edge ink `INSET_TARGET` from the rule it hugs. Positive is toward a
 * rule on the right (`align="end"`); `center` never shifts. Exported for
 * `MbScoreboardHero`, whose lead rule must track the same ink.
 */
export const mbEdgeShiftEm = (value: number, align: MbScoreNumeralAlign): number => {
  const s = String(value);
  const k = mbInkScale(s.length);
  if (align === "end") return +(((INSET_RIGHT[s[s.length - 1]] ?? INSET_TARGET) * k - INSET_TARGET) / 100).toFixed(4);
  if (align === "start") return +(-(((INSET_LEFT[s[0]] ?? INSET_TARGET) * k - INSET_TARGET) / 100)).toFixed(4);
  return 0;
};

/** One boxed figure per character, so the string is exactly N × 1ch wide. */
const Figures = ({ value }: { value: string }) => (
  <>
    {value.split("").map((figure, i) => (
      <span key={i} className="mb-numeral-digit">
        {figure}
      </span>
    ))}
  </>
);

/**
 * The loudest object in the app. Four rules it may never break:
 *
 * 1. It never moves. A changing value cross-fades between two layers stacked in
 *    one grid cell — no translate, no scale, no flip. (The static ink-centring
 *    `translate` above is not motion: it never animates, and each layer
 *    carries its own for the life of that layer.)
 * 2. It never reflows its neighbours. The box is `digits` figures wide and
 *    0.9em tall at that size step, whatever the value, so 7 occupies exactly
 *    the footprint of 21 and of 187 — the ink scale changes what is painted
 *    inside the box, never the box.
 * 3. No figure moves when another figure changes. Each one is boxed to `1ch`
 *    of the overlay's own scale, so 18 → 19 repaints one glyph and shifts none;
 *    the unboxed face measured 54.375px against 55.391px for that pair and
 *    slid the whole number sideways.
 * 4. It is silent to assistive tech unless the caller opts in. A live value is
 *    announced once, by the screen's own `aria-live` region; pass `ariaLabel`
 *    only where there is no such region — a static final score.
 *
 * The swap is detected during render and stored in state, which is React's
 * documented way to adjust state when a prop changes. It is deliberately not an
 * effect: setting state from an effect body renders the old number first and
 * cross-fades one frame late, and the lint rule that forbids it is right.
 *
 * `flash` adds a coral 3px edge on the side the score moved — top for "up",
 * bottom for "down" — so the direction survives greyscale. Every duration and
 * easing is a token, and the global `prefers-reduced-motion` clamp collapses
 * all three animations at once.
 */
export const MbScoreNumeral = ({
  value,
  size,
  tone,
  flash = null,
  digits = RESERVED_DIGITS,
  align = "center",
  ariaLabel,
  className = "",
}: {
  value: number;
  size: MbScoreNumeralSize;
  /** Omit to inherit `currentColor` — the same rule `MbIcon` follows. */
  tone?: "ink" | "paper";
  flash?: "up" | "down" | null;
  /**
   * Figures the box reserves. A floor, never a clamp — a wider value still
   * renders in full, it just costs the layout the difference. Raise it only
   * where the ceiling is genuinely higher than a score (a season total).
   */
  digits?: number;
  /**
   * Which edge of the reserve the figures sit against. Two numerals flanking
   * a divider pass `end` and `start`: the reserve opens *away* from the rule,
   * the figure nearest it is anchored, and the ink-centring shift seats both
   * sides' ink 0.045em off the rule.
   */
  align?: MbScoreNumeralAlign;
  ariaLabel?: string;
  className?: string;
}) => {
  const [shown, setShown] = useState(value);
  /** Bumped once per change; keys both animated layers so each one restarts. */
  const [generation, setGeneration] = useState(0);
  /** The value on its way out. Null once its fade has finished. */
  const [outgoing, setOutgoing] = useState<number | null>(null);

  if (shown !== value) {
    setShown(value);
    setGeneration((g) => g + 1);
    setOutgoing(shown);
  }

  const ink = tone === "paper" ? "text-mb-paper-bright" : tone === "ink" ? "text-mb-navy" : "";
  const face = `mb-numeral mb-numeral--${size}`;
  const reserve = Math.max(1, Math.min(6, Math.round(digits)));

  /* The fixed box: `gridArea` stacks the layers; `minWidth` is the reserve in
     the STEP's own `ch`; `height: 0.9em` is byte-identical to the line box the
     figures used to establish (`line-height: 0.9`), declared explicitly
     because the figures now live in the overlay and an empty box has no line.
     `relative` seats that overlay. Inline because `.mb-numeral` is an
     unlayered rule and would otherwise outrank a utility. */
  const layerStyle = (v: number): React.CSSProperties => {
    const shift = mbEdgeShiftEm(v, align);
    return {
      gridArea: "1 / 1",
      minWidth: `${reserve}ch`,
      height: "0.9em",
      position: "relative",
      translate: shift !== 0 ? `${shift}em` : undefined,
    };
  };

  /* The ink overlay: scaled by figure count, baseline-locked to the layer.
     With `line-height: 0.9` every box here puts its baseline exactly on its
     own bottom edge, so the overlay's baseline lands on the layer's at any
     scale; `max-content` keeps the overlay's rect the width of the figures.

     The overlay is also the figures' HIT-BOX, and it must tell the truth: a
     Range-measured text rect spans the FONT's ascent to descent (~1.48em on
     this face) while the real ink runs 0.85em, so on stacked numerals the
     phantom skirts read as an overlap. `overflow: clip` stops the measured
     rect at this box. The box is first grown to enclose every painted pixel
     WITHOUT moving the baseline: `paddingBottom: 0.05em` extends the border
     box below the content box and `bottom: -0.05em` seats it so the content
     bottom — the baseline under `line-height: 0.9` — stays on the layer's
     bottom edge; `overflowClipMargin` adds slack against edge antialiasing.
     Ascenders need no skirt (0.83em of ink inside a 0.9em box). Nothing
     inline-level changes, so the reserve and the 0-reflow contract hold. */
  const inkStyle = (v: number): React.CSSProperties => ({
    position: "absolute",
    bottom: "-0.05em",
    paddingBottom: "0.05em",
    overflow: "clip",
    overflowClipMargin: "0.1em",
    width: "max-content",
    fontSize: `${mbInkScale(String(v).length)}em`,
    ...(align === "end"
      ? { right: 0 }
      : align === "start"
        ? { left: 0 }
        : { left: 0, right: 0, marginInline: "auto" }),
  });

  return (
    <span
      className={`relative inline-grid align-bottom ${ink} ${className}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {outgoing !== null && (
        <span
          key={`out-${generation}`}
          className={face}
          style={{ ...layerStyle(outgoing), animation: FADE_OUT }}
          onAnimationEnd={() => setOutgoing(null)}
        >
          <span className="mb-numeral-ink" style={inkStyle(outgoing)}>
            <Figures value={String(outgoing)} />
          </span>
        </span>
      )}
      <span
        key={`in-${generation}`}
        className={face}
        style={{ ...layerStyle(value), animation: generation > 0 ? FADE_IN : undefined }}
      >
        <span className="mb-numeral-ink" style={inkStyle(value)}>
          <Figures value={String(value)} />
        </span>
      </span>
      {/* The edge marks the figures, not the reserve behind them: it is as wide
          as the value at its ink scale plus an 8px bleed either side, anchored
          to whichever edge the figures rest against and carrying the same
          ink-centring shift they do. `--mb-figures` is a bare multiplier of
          `1ch` in `.mb-score-rule`, so the scale rides in as arithmetic. */}
      {flash && generation > 0 && (
        <span
          key={`edge-${generation}`}
          aria-hidden="true"
          className={`mb-score-rule mb-numeral--${size} pointer-events-none absolute ${
            flash === "up" ? "top-0" : "bottom-0"
          }`}
          style={
            {
              ...EDGE_ANCHOR[align],
              translate:
                mbEdgeShiftEm(value, align) !== 0
                  ? `${mbEdgeShiftEm(value, align)}em`
                  : undefined,
              "--mb-figures": (String(value).length * mbInkScale(String(value).length)).toFixed(3),
              "--mb-score-bleed": "8px",
              "--mb-score-ink": "var(--mb-coral)",
              animation: EDGE,
            } as React.CSSProperties
          }
        />
      )}
    </span>
  );
};
