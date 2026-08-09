"use client";

import { useState } from "react";

export type MbScoreNumeralSize = "compact" | "console" | "court";

const FADE_IN = "mb-fade var(--mb-dur-fast) var(--mb-ease-out) both";
const FADE_OUT = "mb-fade var(--mb-dur-fast) var(--mb-ease-out) reverse both";
const EDGE = "mb-fade var(--mb-dur-slow) var(--mb-ease-out) reverse both";

/**
 * The loudest object in the app. Three rules it may never break:
 *
 * 1. It never moves. A changing value cross-fades between two layers stacked in
 *    one grid cell — no translate, no scale, no flip (global invariant 43).
 * 2. It never reflows its neighbours. `.mb-numeral` bakes `tabular-nums` and a
 *    `min-width: 2ch` floor, so the box is fixed per size step and 7 occupies
 *    exactly the footprint of 21.
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
  ariaLabel,
  className = "",
}: {
  value: number;
  size: MbScoreNumeralSize;
  /** Omit to inherit `currentColor` — the same rule `MbIcon` follows. */
  tone?: "ink" | "paper";
  flash?: "up" | "down" | null;
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
