"use client";

import { useState } from "react";

export type MbScoreNumeralSize = "compact" | "console" | "court";

const FADE_IN = "mb-fade var(--mb-dur-fast) var(--mb-ease-out) both";
const FADE_OUT = "mb-fade var(--mb-dur-fast) var(--mb-ease-out) reverse both";
const EDGE = "mb-fade var(--mb-dur-slow) var(--mb-ease-out) reverse both";

/**
 * How many digits the box reserves at every size step.
 *
 * Three, not two. `.mb-numeral`'s `min-width: 2ch` floor only held the box
 * still from 0 to 99: 100 widened console from 69.02px to 103.55px, court from
 * 165.66px to 248.48px and compact from 34.51px to 51.78px, and in a
 * `1fr auto 1fr` scoreline every one of those pixels came out of the two name
 * columns — mid-match, on the point that crosses 99. Three digits is the real
 * ceiling for everything this app scores: a volleyball match aggregates to
 * ~125 points over five sets, table tennis to ~100 over seven games, and
 * charter §5.13 already requires the 3-digit case to be verified at every
 * breakpoint. Four is reachable only by a season total, which is a stat, not a
 * score — those callers pass `digits` explicitly.
 *
 * The reserve is a hidden sibling of `digits` zeros in the same grid cell, not
 * a `Nch` min-width: `ch` is the advance of "0" as the font reports it, which
 * sits 0.008px per digit under what the tabular figures actually render, so a
 * `3ch` floor still let 99 → 100 move the box by a hundredth of a pixel. A
 * rendered string of zeros is by construction exactly as wide as any 3-digit
 * value in the same font at the same size, so the box measures identically for
 * 0, 9, 25, 99, 100 and 187.
 */
const RESERVED_DIGITS = 3;

/**
 * The loudest object in the app. Three rules it may never break:
 *
 * 1. It never moves. A changing value cross-fades between two layers stacked in
 *    one grid cell — no translate, no scale, no flip (global invariant 43).
 * 2. It never reflows its neighbours. The box is the width of `RESERVED_DIGITS`
 *    figures at that size step, whatever the value, so 7 occupies exactly the
 *    footprint of 21 and of 187.
 * 3. It is silent to assistive tech unless the caller opts in. A live value is
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
  ariaLabel,
  className = "",
}: {
  value: number;
  size: MbScoreNumeralSize;
  /** Omit to inherit `currentColor` — the same rule `MbIcon` follows. */
  tone?: "ink" | "paper";
  flash?: "up" | "down" | null;
  /**
   * Digits the box reserves. A floor, never a clamp — a wider value still
   * renders in full, it just costs the layout the difference. Raise it only
   * where the ceiling is genuinely higher than a score (a season total).
   */
  digits?: number;
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
  const cell = { gridArea: "1 / 1" } as const;
  const reserve = Math.max(1, Math.min(6, Math.round(digits)));

  return (
    <span
      className={`relative inline-grid align-bottom ${ink} ${className}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {/* The reserve. `visibility: hidden` keeps the box and drops the ink, the
          selection and the a11y tree, so this sets the column width and does
          nothing else. It shares the cell, so the column is max(value, zeros). */}
      <span className={face} aria-hidden="true" style={{ ...cell, visibility: "hidden" }}>
        {"0".repeat(reserve)}
      </span>
      {outgoing !== null && (
        <span
          key={`out-${generation}`}
          className={face}
          style={{ ...cell, animation: FADE_OUT }}
          onAnimationEnd={() => setOutgoing(null)}
        >
          {outgoing}
        </span>
      )}
      <span
        key={`in-${generation}`}
        className={face}
        style={{ ...cell, animation: generation > 0 ? FADE_IN : undefined }}
      >
        {value}
      </span>
      {flash && generation > 0 && (
        <span
          key={`edge-${generation}`}
          aria-hidden="true"
          className={`pointer-events-none absolute -left-2 -right-2 h-[3px] bg-mb-coral ${
            flash === "up" ? "top-0" : "bottom-0"
          }`}
          style={{ animation: EDGE }}
        />
      )}
    </span>
  );
};
