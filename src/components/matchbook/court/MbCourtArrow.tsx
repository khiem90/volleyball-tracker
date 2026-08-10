"use client";

import { memo } from "react";
import {
  ARROW_SHORTEN_END,
  ARROW_SHORTEN_END_FREE,
  ARROW_SHORTEN_START,
  shortenSegment,
  type CourtPoint,
} from "./geometry";

/* ===========================================================================
   MOVEMENT ARROWS

   Contact position -> base position. Navy, because coral on this court is spent
   on selection and nothing else (invariant 15), and because six coral arrows
   over six coral selection rings would make the one state that matters
   invisible.

   The head is a POLYGON, not a `<marker>`. A marker needs an `id`, an `id` in
   an SVG is document-global, and this component renders on three routes — two
   of which can show a second court in a dialog. `url(#arrowhead)` from the
   second court resolves against the first one's definition, which is exactly
   the class of bug that produces "the arrows disappeared on the share page".
   A polygon has no id and cannot collide.

   The four shorten constants that used to be typed as literals in two files
   (28/32 here, 28/12 in the editor) are derived from `NODE_RADIUS` in
   `geometry.ts`.
   =========================================================================== */

const HAIRLINE = { vectorEffect: "non-scaling-stroke" } as const;

/** Head length and half-width, in user units. */
const HEAD = 11;
const HEAD_HALF = 6;

export interface MbCourtArrowProps {
  /** Both ends already in the fixed SVG user space. */
  from: CourtPoint;
  to: CourtPoint;
  /** `token` clears a disc at the destination; `free` clears only the head. */
  end?: "token" | "free";
  highlighted?: boolean;
  /** Draws the line dashed and drops the head weight — the editor's preview. */
  preview?: boolean;
}

export const MbCourtArrow = memo(
  ({ from, to, end = "token", highlighted = false, preview = false }: MbCourtArrowProps) => {
    const segment = shortenSegment(
      from,
      to,
      ARROW_SHORTEN_START,
      end === "token" ? ARROW_SHORTEN_END : ARROW_SHORTEN_END_FREE
    );
    if (!segment) return null;

    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const length = Math.hypot(dx, dy);
    if (length < 1) return null;
    const ux = dx / length;
    const uy = dy / length;

    // Stop the shaft where the head begins, so a translucent line does not
    // show through its own arrowhead.
    const shaftX = segment.x2 - ux * HEAD;
    const shaftY = segment.y2 - uy * HEAD;
    const baseX = shaftX;
    const baseY = shaftY;
    const nx = -uy;
    const ny = ux;

    const tone = "var(--mb-court-line-strong)";
    const opacity = highlighted ? 1 : preview ? 0.5 : 0.55;

    return (
      <g
        stroke={tone}
        fill={tone}
        strokeOpacity={opacity}
        fillOpacity={opacity}
        style={{
          transition: "stroke-opacity var(--mb-dur-fast) var(--mb-ease-out)",
          pointerEvents: "none",
        }}
      >
        <line
          x1={segment.x1}
          y1={segment.y1}
          x2={shaftX}
          y2={shaftY}
          strokeWidth={highlighted ? 3 : 2}
          strokeLinecap="round"
          /* A static dash. The old preview marched its dash offset, which is
             both a reduced-motion hazard and a per-frame repaint. */
          strokeDasharray={preview ? "6 4" : undefined}
          style={HAIRLINE}
        />
        <polygon
          points={`${segment.x2},${segment.y2} ${baseX + nx * HEAD_HALF},${
            baseY + ny * HEAD_HALF
          } ${baseX - nx * HEAD_HALF},${baseY - ny * HEAD_HALF}`}
          stroke="none"
        />
      </g>
    );
  }
);
MbCourtArrow.displayName = "MbCourtArrow";
