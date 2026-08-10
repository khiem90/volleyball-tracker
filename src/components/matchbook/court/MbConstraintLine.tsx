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

   The help copy and the legend both name the mark by its shape ("one crossbar",
   "two crossbars"), never by its hue, so the two agree in greyscale and on a
   monochrome printout. Hue is retained as a *redundant* channel — navy for the
   front/back rule and teal for the left/right one — because for a reader who
   can see it, it is faster.
   =========================================================================== */

const HAIRLINE = { vectorEffect: "non-scaling-stroke" } as const;

/** Half-length of a midpoint crossbar, in user units. */
const TICK = 7;

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
    const tone = frontBack
      ? "var(--mb-court-line-strong)"
      : "var(--mb-court-accent)";
    const opacity = highlighted ? 0.95 : frontBack ? 0.35 : 0.45;
    const width = highlighted ? 2.5 : 1.5;

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
        stroke={tone}
        strokeOpacity={opacity}
        style={{ transition: "stroke-opacity var(--mb-dur-fast) var(--mb-ease-out)" }}
      >
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          strokeWidth={width}
          strokeDasharray={frontBack ? "9 5" : "3 4"}
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
 * The legend's cut of the same two marks, drawn at row scale so the key and the
 * court cannot describe different things.
 */
export const MbConstraintKey = ({ type }: { type: OverlapType }) => {
  const frontBack = type === "front-back";
  return (
    <svg width={46} height={14} viewBox="0 0 46 14" aria-hidden="true" className="shrink-0">
      <g
        stroke={frontBack ? "var(--mb-court-line-strong)" : "var(--mb-court-accent)"}
        strokeOpacity={frontBack ? 0.55 : 0.65}
      >
        <line x1={1} y1={7} x2={45} y2={7} strokeWidth={1.5} strokeDasharray={frontBack ? "9 5" : "3 4"} />
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
