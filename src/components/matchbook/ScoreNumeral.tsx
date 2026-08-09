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

const ALIGN: Record<MbScoreNumeralAlign, "center" | "left" | "right"> = {
  center: "center",
  start: "left",
  end: "right",
};

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
 * The reserve is `digits`ch on the face itself. That is exact rather than
 * approximate *because* every figure is boxed to `1ch` by `.mb-numeral-digit`:
 * an N-figure value measures N × 1ch and the floor measures `digits` × 1ch, so
 * the two are the same arithmetic on the same unit. (Before the figures were
 * boxed a `3ch` floor was not enough — Oswald carries no `tnum`, its figures
 * are proportional, and a rendered "100" is 89.11px against a 99.00px `3ch`.)
 *
 * What the reserve does **not** do is make the box the size of the value. The
 * reserve is the whole point: it costs the same at 0 as at 108, which is why
 * `MbScoreboardHero` chooses its layout from how much room is left over rather
 * than shrinking the reserve.
 */
const RESERVED_DIGITS = 3;

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
 * 2. It never reflows its neighbours. The box is `digits` figures wide at that
 *    size step, whatever the value, so 7 occupies exactly the footprint of 21
 *    and of 187.
 * 3. No figure moves when another figure changes. Each one is boxed to `1ch`,
 *    so 18 → 19 repaints one glyph and shifts none; the unboxed face measured
 *    54.375px against 55.391px for that pair and slid the whole number sideways.
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
   * then opens *away* from the rule and the figure nearest it is anchored.
   * Measured at the hero step, rule centre to first ink, over 7–9 / 21–18 /
   * 108–99 / 1–1 / 4–4 / 10–108: **14.0–20.0px** hugging, against
   * **15.0–53.0px** centred in the same reserve, and the two sides of one pair
   * differ by at most 5.0px rather than 16.5px. The residual 6px band is the
   * side bearing of whichever figure lands against the rule (1.5px for "4",
   * 7.5px for "1") and cannot be closed without per-glyph kerning — which is
   * why nothing here claims the pair is *optically* centred.
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
  /* `gridArea` stacks the layers; `minWidth` is the reserve; `textAlign` picks
     the edge the figures rest against. Inline because `.mb-numeral` is an
     unlayered rule and would otherwise outrank a utility. */
  const cell = {
    gridArea: "1 / 1",
    minWidth: `${reserve}ch`,
    textAlign: ALIGN[align],
  } as const;

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
          style={{ ...cell, animation: FADE_OUT }}
          onAnimationEnd={() => setOutgoing(null)}
        >
          <Figures value={String(outgoing)} />
        </span>
      )}
      <span
        key={`in-${generation}`}
        className={face}
        style={{ ...cell, animation: generation > 0 ? FADE_IN : undefined }}
      >
        <Figures value={String(value)} />
      </span>
      {/* The edge marks the figures, not the reserve behind them: it is as wide
          as the value plus an 8px bleed either side, anchored to whichever edge
          the figures are resting against. */}
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
              "--mb-figures": String(value).length,
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
