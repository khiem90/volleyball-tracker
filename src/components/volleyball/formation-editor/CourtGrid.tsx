"use client";

import { memo } from "react";
import { COURT_SVG } from "@/lib/volleyball/constants";
import { toSvgCoords } from "@/lib/volleyball/coordinateUtils";

const { WIDTH, HEIGHT, PADDING } = COURT_SVG;
const VIEWBOX_HEIGHT = HEIGHT + PADDING * 2;

const ZONE_LABELS = [
  { zone: 4, x: 0.17, y: 0.88 },
  { zone: 3, x: 0.5, y: 0.88 },
  { zone: 2, x: 0.83, y: 0.88 },
  { zone: 5, x: 0.17, y: 0.12 },
  { zone: 6, x: 0.5, y: 0.12 },
  { zone: 1, x: 0.83, y: 0.12 },
] as const;

type CourtGridProps = {
  attackLineY: number;
  mode: string;
  rotation: number;
  disabled?: boolean;
};

export const CourtGrid = memo(function CourtGrid({
  attackLineY,
  mode,
  rotation,
  disabled = false,
}: CourtGridProps) {
  return (
    <>
      {/* Court background */}
      <rect
        x={PADDING}
        y={PADDING}
        width={WIDTH}
        height={HEIGHT}
        fill="url(#editorCourtGradient)"
        stroke="oklch(0.55 0.12 145 / 0.5)"
        strokeWidth="2"
        rx="4"
      />

      {/* Grid overlay for positioning help */}
      <rect
        x={PADDING}
        y={PADDING}
        width={WIDTH}
        height={HEIGHT}
        fill="url(#editorGrid)"
        pointerEvents="none"
      />

      {/* Net (top edge) */}
      <line
        x1={PADDING}
        y1={PADDING}
        x2={PADDING + WIDTH}
        y2={PADDING}
        className="stroke-foreground/40"
        strokeWidth="4"
      />
      <text
        x={PADDING + WIDTH / 2}
        y={PADDING - 12}
        textAnchor="middle"
        className="fill-muted-foreground text-xs font-semibold uppercase tracking-wider"
      >
        Net
      </text>

      {/* Attack line (3m line) */}
      <line
        x1={PADDING}
        y1={attackLineY}
        x2={PADDING + WIDTH}
        y2={attackLineY}
        className="stroke-primary/40"
        strokeWidth="2"
        strokeDasharray="8 4"
      />
      <text
        x={PADDING + WIDTH + 8}
        y={attackLineY + 4}
        className="fill-muted-foreground text-[10px] font-medium"
      >
        3m
      </text>

      {/* End line label */}
      <text
        x={PADDING + WIDTH / 2}
        y={PADDING + HEIGHT + 18}
        textAnchor="middle"
        className="fill-muted-foreground text-xs font-semibold uppercase tracking-wider"
      >
        End Line
      </text>

      {/* Center line (vertical) */}
      <line
        x1={PADDING + WIDTH / 2}
        y1={PADDING}
        x2={PADDING + WIDTH / 2}
        y2={PADDING + HEIGHT}
        className="stroke-foreground/10"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      {/* Zone labels (faded in background) */}
      {ZONE_LABELS.map(({ zone, x, y }) => {
        const coords = toSvgCoords(x, y);
        return (
          <text
            key={zone}
            x={coords.x}
            y={coords.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground/10 text-2xl font-bold select-none pointer-events-none"
          >
            {zone}
          </text>
        );
      })}

      {/* Mode indicator */}
      <text
        x={PADDING + WIDTH / 2}
        y={VIEWBOX_HEIGHT - 8}
        textAnchor="middle"
        className="fill-foreground text-sm font-bold uppercase tracking-widest"
      >
        {mode === "serving" ? "Serving" : "Receiving"} - R{rotation}
      </text>

      {/* Edit mode indicator */}
      {!disabled && (
        <text
          x={PADDING + 4}
          y={PADDING - 12}
          className="fill-primary text-[10px] font-medium uppercase"
        >
          Edit Mode
        </text>
      )}
    </>
  );
});
