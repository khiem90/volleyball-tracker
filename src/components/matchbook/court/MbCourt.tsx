"use client";

import type { CSSProperties, PointerEvent, ReactNode, Ref } from "react";
import type { GameMode, RotationNumber } from "@/lib/volleyball/types";
import {
  ATTACK_LINE_SVG_Y,
  COURT_ASPECT,
  COURT_RECT,
  COURT_VIEWBOX,
  COURT_VIEWBOX_ATTR,
} from "./geometry";

/* ===========================================================================
   THE COURT

   One renderer for the court chrome, composed by both the read-only diagram and
   the editor. Before this there were two: `VolleyballCourt.tsx` drew a green
   gradient court with its own net/3m/zone chrome, and `CourtGrid.tsx` +
   `CourtSvgDefs.tsx` drew a second one for the editor — and they had already
   diverged in stroke weight, in zone-numeral placement and in how the attack
   line was dashed.

   What changed visually, and why:

     THE COURT IS PAPER, NOT GREEN. `oklch(0.55 0.12 145 / 0.25)` was a raw
     literal (invariant 10) and, more to the point, a green rectangle is the one
     thing on a Matchbook page that could not have come from the same press as
     the rest of it. The court is now `--mb-court-fill` — the brighter of the
     two papers — sitting on the page's own grain, bounded by navy rules. It
     reads as a diagram printed in the almanac rather than a screenshot of a
     video game.

     THE 3 M LINE IS TEAL. `--mb-court-accent` resolves to `--mb-teal`, and
     `globals.css` states why in its own words: a diagram is not a call to
     action, and coral on it would spend the screen's one coral on a reference
     drawing.

     THE ZONE NUMERALS ARE THE TEXTURE. Set in the display face at 10% navy and
     hung in the corner of each of the six cells, they do the job the old grey
     `2` / `5` / `6` / `1` were reaching for — orienting the reader — without
     competing with the tokens.

   Strokes carry `vector-effect="non-scaling-stroke"`, so a hairline is 1 CSS px
   whether the court renders at 356px on a phone or 660px in a desktop column.
   Without it the same `strokeWidth` renders 0.9px on mobile and 2.6px on
   desktop and the rule hierarchy inverts between breakpoints.
   =========================================================================== */

/** Zone cell geometry, in the fixed user space, in reading order. */
const CELL_W = COURT_RECT.w / 3;

/**
 * The numerals hang in the OUTER corner of each cell — including the two middle
 * cells, whose numerals sit at the cell's left edge rather than its centre.
 * Centred, zones 3 and 6 landed directly under the middle blocker and the
 * libero, which stand on the centre line in every rotation, and both watermarks
 * disappeared entirely. Hung left they clear a 24-unit disc at x = 0.5 by 25
 * units.
 */
const ZONE_CELLS: ReadonlyArray<{
  zone: 1 | 2 | 3 | 4 | 5 | 6;
  x: number;
  y: number;
  anchor: "start" | "end";
  baseline: "hanging" | "auto";
}> = [
  { zone: 4, x: COURT_RECT.x + 14, y: COURT_RECT.y + 12, anchor: "start", baseline: "hanging" },
  { zone: 3, x: COURT_RECT.x + CELL_W + 14, y: COURT_RECT.y + 12, anchor: "start", baseline: "hanging" },
  { zone: 2, x: COURT_RECT.right - 14, y: COURT_RECT.y + 12, anchor: "end", baseline: "hanging" },
  { zone: 5, x: COURT_RECT.x + 14, y: COURT_RECT.bottom - 12, anchor: "start", baseline: "auto" },
  { zone: 6, x: COURT_RECT.x + CELL_W + 14, y: COURT_RECT.bottom - 12, anchor: "start", baseline: "auto" },
  { zone: 1, x: COURT_RECT.right - 14, y: COURT_RECT.bottom - 12, anchor: "end", baseline: "auto" },
];

/** The editor's positioning grid: every 0.1 of normalised space. */
const GRID_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const HAIRLINE = { vectorEffect: "non-scaling-stroke" } as const;

/* Both SVG steps below are named steps of the display scale (design language
   §2.1) rather than numbers picked to look right: 13.6 = 0.85rem, 36 = 2.25rem
   `display/stat-xl`. They were 13 and 44, which sit between steps and were
   counted as off-scale sizes (rubric 1.2). Dropping the watermark from 44 to 36
   also buys back 8 units of clearance between the numeral and the discs that
   stand on the centre line. */

/** Reference labels, set at the kicker step and inked muted so they recede. */
const EDGE_LABEL: CSSProperties = {
  fontSize: 13.6,
  fontWeight: 700,
  letterSpacing: "0.16em",
  fill: "var(--mb-ink-muted)",
  fontVariantNumeric: "tabular-nums",
};

const ZONE_NUMERAL: CSSProperties = {
  fontSize: 36,
  fontWeight: 700,
  /* 0.01em, which is `display/masthead`'s tracking at the same 36px/700 the
     mobile `<h1>` renders at. Left at `.matchbook-display`'s 0.02em default it
     was a tracking collision with the page's own title (rubric 1.3). */
  letterSpacing: "0.01em",
  fill: "var(--mb-court-line-strong)",
  fillOpacity: 0.1,
  fontVariantNumeric: "tabular-nums",
};

export interface MbCourtProps {
  /** `edit` adds the 0.1 positioning grid and an `EDIT` kicker. */
  variant?: "view" | "edit";
  mode: GameMode;
  rotation: RotationNumber;
  showZoneNumerals?: boolean;
  showAttackLine?: boolean;
  /** Everything drawn over the chrome: constraint lines, arrows, tokens. */
  overlay?: ReactNode;
  /**
   * The HTML target layer — real `<button>`s over the drawing.
   *
   * The SVG is a PICTURE and carries `pointer-events: none`; every target is an
   * HTML control absolutely positioned over it. `<g role="button" tabIndex={0}>`
   * satisfies ARIA but not invariant 48 ("interactive cells are real
   * `<button type="button">`"), it takes no `.mb-btn-touch` floor, and SVG
   * `:focus-visible` is unstyled in this stylesheet — so a keyboard user
   * tabbing through the court saw nothing at all. A real button inherits the
   * surface's coral focus ring, measures as a target, and takes `touch-action`
   * without an inline style.
   */
  targets?: ReactNode;
  /** Accessible name of the DRAWING. The controls name themselves. */
  label: string;
  svgRef?: Ref<SVGSVGElement>;
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  /** `crosshair` while an arrow is being drawn. */
  cursor?: "default" | "crosshair";
  className?: string;
}

export const MbCourt = ({
  variant = "view",
  mode,
  rotation,
  showZoneNumerals = true,
  showAttackLine = true,
  overlay,
  targets,
  label,
  svgRef,
  onPointerMove,
  onKeyDown,
  cursor = "default",
  className = "",
}: MbCourtProps) => (
  /* The wrapper reserves the aspect BEFORE the SVG paints, so the court cannot
     contribute to CLS while the formation data resolves (invariant 27). It is
     also the positioning context for the HTML target layer. */
  <div
    className={`relative w-full ${className}`}
    style={{ aspectRatio: COURT_ASPECT, cursor }}
    onPointerMove={onPointerMove}
    onKeyDown={onKeyDown}
  >
    <svg
      ref={svgRef}
      viewBox={COURT_VIEWBOX_ATTR}
      className="block h-full w-full"
      role="img"
      aria-label={label}
      style={{ pointerEvents: "none" }}
    >
      {/* Court ground. Paper over the page's grain, not a fill of its own. */}
      <rect
        x={COURT_RECT.x}
        y={COURT_RECT.y}
        width={COURT_RECT.w}
        height={COURT_RECT.h}
        fill="var(--mb-court-fill)"
      />

      {variant === "edit" && (
        <g stroke="var(--mb-court-line)" strokeWidth={1} strokeOpacity={0.45} style={HAIRLINE}>
          {GRID_STEPS.map((step) => (
            <line
              key={`gv-${step}`}
              x1={COURT_RECT.x + (COURT_RECT.w * step) / 10}
              y1={COURT_RECT.y}
              x2={COURT_RECT.x + (COURT_RECT.w * step) / 10}
              y2={COURT_RECT.bottom}
            />
          ))}
          {GRID_STEPS.map((step) => (
            <line
              key={`gh-${step}`}
              x1={COURT_RECT.x}
              y1={COURT_RECT.y + (COURT_RECT.h * step) / 10}
              x2={COURT_RECT.right}
              y2={COURT_RECT.y + (COURT_RECT.h * step) / 10}
            />
          ))}
        </g>
      )}

      {showZoneNumerals && (
        <g className="matchbook-display select-none" style={ZONE_NUMERAL} aria-hidden="true">
          {ZONE_CELLS.map((cell) => (
            <text
              key={cell.zone}
              x={cell.x}
              y={cell.y}
              textAnchor={cell.anchor}
              dominantBaseline={cell.baseline}
            >
              {cell.zone}
            </text>
          ))}
        </g>
      )}

      {/* Centre reference, splitting left from right. Hairline, dotted: it is a
          reading aid, not a line that exists on a real floor. */}
      <line
        x1={COURT_RECT.x + COURT_RECT.w / 2}
        y1={COURT_RECT.y}
        x2={COURT_RECT.x + COURT_RECT.w / 2}
        y2={COURT_RECT.bottom}
        stroke="var(--mb-court-line)"
        strokeWidth={1}
        strokeDasharray="2 5"
        style={HAIRLINE}
      />

      {showAttackLine && (
        <line
          x1={COURT_RECT.x}
          y1={ATTACK_LINE_SVG_Y}
          x2={COURT_RECT.right}
          y2={ATTACK_LINE_SVG_Y}
          stroke="var(--mb-court-accent)"
          strokeWidth={2}
          strokeDasharray="10 6"
          style={HAIRLINE}
        />
      )}

      {/* Boundary last of the chrome, so it closes the drawing. */}
      <rect
        x={COURT_RECT.x}
        y={COURT_RECT.y}
        width={COURT_RECT.w}
        height={COURT_RECT.h}
        fill="none"
        stroke="var(--mb-court-line-strong)"
        strokeWidth={2}
        style={HAIRLINE}
      />

      {/* Edge labels sit INSIDE the boundary. Outside it there is only the
          token overhang budget, and a label there would be the first thing
          clipped by a player dragged onto a line. */}
      <g className="matchbook-display select-none" style={EDGE_LABEL} aria-hidden="true">
        <text x={COURT_RECT.x + 10} y={COURT_RECT.y + 18}>
          NET
        </text>
        <text x={COURT_RECT.x + 10} y={COURT_RECT.bottom - 10}>
          END LINE
        </text>
        {showAttackLine && (
          <text x={COURT_RECT.right - 10} y={ATTACK_LINE_SVG_Y - 8} textAnchor="end">
            3 M
          </text>
        )}
        <text x={COURT_RECT.right - 10} y={COURT_RECT.y + 18} textAnchor="end">
          {variant === "edit" ? "EDIT" : mode === "serving" ? "SERVING" : "RECEIVING"}
        </text>
        <text x={COURT_RECT.right - 10} y={COURT_RECT.bottom - 10} textAnchor="end">
          R{rotation}
        </text>
      </g>

      {overlay}
    </svg>
    {targets}
  </div>
);

/**
 * Where a target sits, as a percentage of the rendered box.
 *
 * The SVG user space and the box are the same rectangle, so a point in one is a
 * fraction of the other — which means the targets track the drawing at every
 * viewport without measuring anything at runtime.
 */
export const courtPercent = (svgX: number, svgY: number) => ({
  left: `${((svgX - COURT_VIEWBOX.x) / COURT_VIEWBOX.w) * 100}%`,
  top: `${((svgY - COURT_VIEWBOX.y) / COURT_VIEWBOX.h) * 100}%`,
});
