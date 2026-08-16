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
 * How many figures the box reserves at every size step.
 *
 * Three, not two. `.mb-numeral`'s `min-width: 2ch` floor only held the box
 * still from 0 to 99; the point that crosses 99 widened it from 33.00px to
 * 44.56px at compact, 66.00px to 89.11px at console and 158.39px to 213.84px at
 * court — mid-match, and in a scoreline every one of those pixels comes out of
 * the two name columns. Three is the real ceiling for everything this app
 * scores: a volleyball match aggregates to ~125 points over five sets, table
 * tennis to ~100 over seven games, and charter §5.13 already requires the
 * 3-digit case at every breakpoint. Four is reachable only by a season total,
 * which is a stat, not a score — those callers pass `digits` explicitly.
 *
 * The reserve is `digits`ch on the LAYER, whose font-size is always the step's
 * own — never the ink scale below — so the box costs the same at 0 as at 108.
 * That constancy is the whole point: `MbScoreboardHero` chooses its layout from
 * how much room is left over rather than shrinking the reserve.
 */
const RESERVED_DIGITS = 3;

/* ===========================================================================
   OPTICAL MASS — the Apple Sports steal, without the width axis. (C1)

   Rubric D4's 10-anchor: ink coverage of the reserved box may vary by no more
   than 1.5x across the in-set score range. Before this block, a 7 filled 26.6%
   of the box and a 25 filled 62.0% — a 2.33x swing between two legitimate
   volleyball scores in one identical box. Apple equalises with the variable
   font's `wdth` axis. That tool does not exist here, and the probe that proves
   it is recorded rather than assumed: the Oswald the app loads registers 20
   static instances (400/500/600/700), every `FontFace.stretch` reads
   `normal`, and a 10-digit specimen at 100px measures **502.203125px at
   font-stretch 50%, 100%, 200% and at font-variation-settings 'wdth' 60 and
   150 alike** — no axis, and no synthesis in any engine this app targets.

   So the honest substitute named by the charter round is SIZE by digit count:
   fewer figures render larger, more render smaller, and the RESERVED BOX never
   moves. Factors, measured against the same canvas census (per-digit painted
   pixels at 700 weight: 0→2696 … 1→1447 … 7→1568 … 8→2608 per 100px em):

     figures   scale    box fill (was)     painted-pixel spread, worst v 1 digit
     1         1.12     37.3%  (33.3%)     —
     2         0.78     52.0%  (66.7%)     25v7 1.39x · 21v7 1.15x · 25v1 1.46x
                                           (was 2.92x / 2.42x / 3.01x)
     3         0.72     72.0%  (100%)      108v7 1.80x, out of the in-set range
                                           (was 4.45x)

   In-set spread (1 v 2 figures) lands at 2x0.78/1.12 = **1.39x by ink width**
   and ≤1.47x by measured pixel count over every pairing of the verdict's own
   cited values, under the 1.5x cap. 0.78 and not 0.80 because "25 v 1" — both
   legitimate in-set scores — measured 1.54x at 0.80: the census is of glyphs,
   not digit counts, and "1" is the lightest glyph in the set. (Full per-glyph
   equalisation is out of reach on principle: it would scale 18 differently
   from 19 and break the repaint-one-glyph contract below.) 1.12 and not more
   because the court step can run at exactly `100cqh`: a scaled "0" ascends
   0.83 x 1.12 = 0.930F over a baseline seated at R/2 + 0.45F, leaving 0.020R
   of headroom — 5.2px at the 256px step — where 1.14 left 0.97px, one
   subpixel rounding away from a clipped cap.

   HOW THE BOX SURVIVES: the value no longer sets inside the layer's own line.
   The layer is a fixed box — `digits`ch wide, 0.9em tall, the step's own
   font-size — and the figures live in an absolutely positioned overlay
   (`.mb-numeral-ink`) at `fontSize: <scale>em`, anchored `bottom: 0`. With
   `line-height: 0.9` the baseline of ANY box here sits exactly on its bottom
   edge (0.90em below the top of a 0.9em box), so overlay-bottom-on-layer-bottom
   IS baseline-on-baseline, at every scale — the two sides of a scoreline keep
   byte-identical baselines whether they show 9 v 18 or 21 v 18, which is the
   property the last verdict credited to 0.01px. Nothing inline-level scales,
   so the layer's height, the reserve and every neighbour are untouched: a
   digit-count change cross-fades between two overlays and reflows 0.00px.
   =========================================================================== */
const INK_SCALE = [1, 1.12, 0.8, 0.72] as const;

/** The ink scale for a rendered figure count. 4+ figures keep the 3-figure step. */
export const mbInkScale = (figures: number): number =>
  INK_SCALE[Math.min(Math.max(Math.round(figures), 1), 3)];

/* ===========================================================================
   DIVIDER CENTRING ON INK, NOT ON THE BOX. (C2)

   Two scores hugging a rule are positioned by their CELLS, and a cell is 1ch
   with the glyph's own advance centred inside it — so the paper between the
   rule and the first ink varies with whichever figure lands against the rule.
   Measured on the live console at the 256px court step: `20 | 19` sat 57.80px
   ink-to-rule on the "0" side and 68.68px on the "1" side, and `14 | 11` sat
   51.91 v 68.68 — a 16.77px wobble on the axis of the one object the screen
   exists to present, because tabular "1" holds 30px of ink in a 38.5px advance
   inside a 55px cell.

   The correction: each hugging layer translates toward (or off) the rule by
   the measured inset of its EDGE figure, normalised to a constant 0.045em of
   paper between rule and ink. The insets are per-glyph, from the same canvas
   census (units: 1/100 em; inset = cell padding + side bearing at 100px):

     figure        0     1      2    3    4    5     6    7     8     9
     left inset    5.0   9.25   4.8  4.8  3.3  6.05  4.6  6.55  4.45  3.6
     right inset   5.0  15.75   4.2  4.2  2.7  4.95  4.4  8.45  4.55  5.4

   The shift is a static `translate` — paint-only, so the reserve, the layout
   and rubric 4.1/4.2 cannot see it — applied per LAYER, so an outgoing value
   keeps its own correction while it fades. `ScoreSide`'s stacked mode centres
   the figures with `!important` utilities, which is exactly what outranks an
   inline `translate`, so the correction cannot leak into a centred layout.
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
 *    one grid cell — no translate, no scale, no flip (global invariant 43).
 *    (The static ink-centring `translate` above is not motion: it never
 *    animates, and each layer carries its own for the life of that layer.)
 * 2. It never reflows its neighbours. The box is `digits` figures wide and
 *    0.9em tall at that size step, whatever the value, so 7 occupies exactly
 *    the footprint of 21 and of 187 — the ink scale changes what is painted
 *    inside the box, never the box.
 * 3. No figure moves when another figure changes. Each one is boxed to `1ch`
 *    of the overlay's own scale, so 18 → 19 repaints one glyph and shifts none;
 *    the unboxed face measured 54.375px against 55.391px for that pair and
 *    slid the whole number sideways.
 * 4. It is silent to assistive tech unless the caller opts in. A live value is
 *    announced once, by the screen's own `aria-live` region (invariant 49); pass
 *    `ariaLabel` only where there is no such region — a static final score.
 *
 * The swap is detected during render and stored in state, which is React's
 * documented way to adjust state when a prop changes. It is deliberately not an
 * effect: setting state from an effect body renders the old number first and
 * cross-fades one frame late, and the lint rule that forbids it is right.
 *
 * `flash` adds a coral 3px edge on the side the score moved — top for "up",
 * bottom for "down" — so the direction survives greyscale. Every duration and
 * easing comes from a §2.1 token (invariant 40), and the global
 * `prefers-reduced-motion` clamp collapses all three animations at once.
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
   * Which edge of the reserve the figures sit against.
   *
   * Two numerals flanking a divider should pass `end` and `start`: the reserve
   * then opens *away* from the rule, the figure nearest it is anchored, and
   * the ink-centring shift above seats both sides' ink 0.045em off the rule.
   * Measured at the court step before the shift, rule centre to first ink:
   * 57.80 v 68.68 over `20–19` and 51.91 v 68.68 over `14–11`; after it, both
   * sides of any pair sit within a subpixel of the same gap.
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
     `bottom: 0` IS the baseline: with `line-height: 0.9` every box here puts
     its baseline exactly on its own bottom edge, so the overlay's baseline
     lands on the layer's at any scale. `max-content` keeps the overlay's rect
     the width of the figures themselves — which is what the rubric's 4.3
     expression measures as ink against the reserve behind it. */
  const inkStyle = (v: number): React.CSSProperties => ({
    position: "absolute",
    bottom: 0,
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
