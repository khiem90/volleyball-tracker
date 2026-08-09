"use client";

import { useEffect, useRef, useState } from "react";

export type MbScoreNumeralSize = "compact" | "console" | "court";

/**
 * The loudest object in the app. Three rules it may never break:
 *
 * 1. It never moves. A changing value cross-fades between two layers stacked in
 *    one grid cell — no translate, no scale, no flip (global invariant 43).
 * 2. It never reflows its neighbours. `.mb-numeral` bakes `tabular-nums` and a
 *    `min-width: 2ch` floor, so the box is fixed per size step and 7 occupies
 *    exactly the footprint of 21.
 * 3. It is silent to assistive tech unless the caller opts in. The live value is
 *    announced once, by the screen's own `aria-live` region (invariant 49); pass
 *    `ariaLabel` only where there is no such region (a static final score).
 *
 * `flash` adds a coral 3px edge on the side the score moved — top for "up",
 * bottom for "down" — so direction survives greyscale. It rides the shipped
 * `mb-fade` keyframes in reverse, so the global reduced-motion clamp collapses
 * it with everything else.
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
  // Double buffer: the front layer fades out while the back layer fades in, both
  // pinned to grid cell 1/1, so the swap happens strictly in place.
  const [layers, setLayers] = useState({ a: value, b: value, front: "a" as "a" | "b" });
  const [pulse, setPulse] = useState(0);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setLayers((current) =>
      current.front === "a"
        ? { ...current, b: value, front: "b" }
        : { ...current, a: value, front: "a" },
    );
    setPulse((n) => n + 1);
  }, [value]);

  const ink = tone === "paper" ? "text-mb-paper-bright" : tone === "ink" ? "text-mb-navy" : "";
  const face = `mb-numeral mb-numeral--${size}`;
  const fade = {
    gridArea: "1 / 1",
    transition: "opacity var(--mb-dur-fast) var(--mb-ease-out)",
  } as const;

  return (
    <span
      className={`relative inline-grid align-bottom ${ink} ${className}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <span className={face} style={{ ...fade, opacity: layers.front === "a" ? 1 : 0 }}>
        {layers.a}
      </span>
      <span className={face} style={{ ...fade, opacity: layers.front === "b" ? 1 : 0 }}>
        {layers.b}
      </span>
      {flash && pulse > 0 && (
        <span
          key={pulse}
          aria-hidden="true"
          className={`pointer-events-none absolute -left-2 -right-2 h-[3px] bg-mb-coral ${
            flash === "up" ? "top-0" : "bottom-0"
          }`}
          style={{ animation: "mb-fade var(--mb-dur-slow) var(--mb-ease-out) reverse both" }}
          onAnimationEnd={() => setPulse(0)}
        />
      )}
    </span>
  );
};
