"use client";

import { memo } from "react";
import type { OverlapType } from "@/lib/volleyball/types";

/* ===========================================================================
   OVERLAP CONSTRAINT LINES

   The old pair was `oklch(0.6 0.15 250 / 0.4)` against `oklch(0.6 0.15 45 / 0.4)`
   — two raw literals whose only difference was hue, described in the help copy
   as "blue dashed lines" and "orange dotted lines". Desaturate that and the
   legend stops mapping to the drawing: a colour-blind reader is told to look
   for a colour that is not there. That is invariant 13, and it is a hard fail.

   The channel that carries the meaning here is the MIDPOINT MARK:

     front / back   ONE crossbar   — a gate the back-row player may not cross
     left / right   TWO crossbars  — the middle must stay between its two sides

   reinforced by the dash: a long `9 5` rule for front/back, a fine `3 4` dotting
   for left/right. Two independent shape channels, both of which survive
   desaturation and a monochrome printout.

   TWO CORRECTIONS IN THIS PASS.

   THE MARKS WERE THE FAINTEST INK ON THE COURT. Measured against
   `--mb-court-fill` (#fffaf1): front/back navy at 0.35 alpha = 2.04:1,
   left/right teal at 0.45 = 1.76:1, against a 3:1 floor for a non-text mark —
   while the *suggestive* movement arrows sat at 3.38:1. The rule marks are FIVB
   7.4: they are the analytic payload of the diagram, the "must", and they were
   drawing lighter than the "may". One rest opacity now serves both families and
   it is chosen so the rules are the heaviest ink in the overlay:

     rest        0.72 -> 5.52:1     (arrows sit at 0.55 -> 3.38:1)
     highlighted 1.00 -> 12.84:1

   HUE IS NO LONGER A CHANNEL HERE, and that is the fix rather than a loss.
   Teal at any legible alpha is 3.8:1 at best — it has no headroom on paper —
   and it was already spending itself on the 3 m attack line, so `--mb-teal`
   meant two different things on one drawing. Both families now draw in
   `--mb-court-line-strong`; the dash and the crossbar count tell them apart,
   which is what the legend and the help copy have always named. Teal is left to
   mean exactly one thing on this court: the 3 m line.

   `MbConstraintKey` draws from the same constant. It previously drew at
   0.55/0.65 while the court drew at 0.35/0.45 — a key 44-57% stronger than the
   thing it keys, which is the one failure that component exists to prevent.
   =========================================================================== */

const HAIRLINE = { vectorEffect: "non-scaling-stroke" } as const;

/** Half-length of a midpoint crossbar, in user units. */
const TICK = 7;

/**
 * Ink strength of a rule mark. ONE table, read by the court and by the legend,
 * so the two cannot drift. Measured against `--mb-court-fill`: 0.72 = 5.52:1,
 * 1 = 12.84:1. The floor for a meaning-bearing non-text mark is 3:1.
 */
export const CONSTRAINT_INK = { rest: 0.72, highlighted: 1 } as const;

/** Stroke weights. Emphasis is carried by WIDTH, since the ink is already full. */
const CONSTRAINT_WIDTH = { rest: 1.5, highlighted: 3 } as const;

/** The dash that names each family, shared by the court and the key. */
export const CONSTRAINT_DASH: Record<OverlapType, string> = {
  "front-back": "9 5",
  "left-right": "3 4",
};

export interface MbConstraintLineProps {
  type: OverlapType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** One of the two endpoints belongs to the selected player. */
  highlighted?: boolean;
}

export const MbConstraintLine = memo(
  ({ type, x1, y1, x2, y2, highlighted = false }: MbConstraintLineProps) => {
    const frontBack = type === "front-back";
    const opacity = highlighted ? CONSTRAINT_INK.highlighted : CONSTRAINT_INK.rest;
    const width = highlighted
      ? CONSTRAINT_WIDTH.highlighted
      : CONSTRAINT_WIDTH.rest;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    // A degenerate pair (two players stacked) draws the line and skips the
    // marks rather than dividing by zero and emitting NaN into the DOM.
    const unit = length > 1 ? { x: dx / length, y: dy / length } : null;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    /** One crossbar, offset along the line from the midpoint. */
    const bar = (offset: number, key: string) => {
      if (!unit) return null;
      const cx = midX + unit.x * offset;
      const cy = midY + unit.y * offset;
      // Perpendicular to the line: (-uy, ux).
      return (
        <line
          key={key}
          x1={cx - -unit.y * TICK}
          y1={cy - unit.x * TICK}
          x2={cx + -unit.y * TICK}
          y2={cy + unit.x * TICK}
          strokeWidth={width + 0.5}
          strokeLinecap="round"
        />
      );
    };

    return (
      <g
        stroke="var(--mb-court-line-strong)"
        strokeOpacity={opacity}
        style={{
          transition:
            "stroke-opacity var(--mb-dur-fast) var(--mb-ease-out), stroke-width var(--mb-dur-fast) var(--mb-ease-out)",
        }}
      >
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          strokeWidth={width}
          strokeDasharray={CONSTRAINT_DASH[type]}
          style={HAIRLINE}
        />
        <g style={HAIRLINE}>
          {frontBack
            ? bar(0, "bar")
            : [bar(-4, "bar-a"), bar(4, "bar-b")]}
        </g>
      </g>
    );
  }
);
MbConstraintLine.displayName = "MbConstraintLine";

/**
 * The legend's cut of the same two marks, drawn at row scale from the SAME ink
 * and dash constants the court uses, so the key and the drawing cannot describe
 * different things.
 */
export const MbConstraintKey = ({ type }: { type: OverlapType }) => {
  const frontBack = type === "front-back";
  return (
    <svg width={46} height={14} viewBox="0 0 46 14" aria-hidden="true" className="shrink-0">
      <g
        stroke="var(--mb-court-line-strong)"
        strokeOpacity={CONSTRAINT_INK.rest}
      >
        <line
          x1={1}
          y1={7}
          x2={45}
          y2={7}
          strokeWidth={CONSTRAINT_WIDTH.rest}
          strokeDasharray={CONSTRAINT_DASH[type]}
        />
        {frontBack ? (
          <line x1={23} y1={1} x2={23} y2={13} strokeWidth={2} strokeLinecap="round" />
        ) : (
          <>
            <line x1={19} y1={1} x2={19} y2={13} strokeWidth={2} strokeLinecap="round" />
            <line x1={27} y1={1} x2={27} y2={13} strokeWidth={2} strokeLinecap="round" />
          </>
        )}
      </g>
    </svg>
  );
};
