"use client";

import { memo, useMemo } from "react";
import type { OverlapConstraint, PlayerPosition } from "@/lib/volleyball/types";
import { OVERLAP_COLORS, ZONE_POSITIONS } from "@/lib/volleyball/constants";

type OverlapLineProps = {
  overlap: OverlapConstraint;
  players: PlayerPosition[];
  toSvgCoords: (x: number, y: number) => { x: number; y: number };
  selectedPlayer: string | null;
};

export const OverlapLine = memo(
  ({ overlap, players, toSvgCoords, selectedPlayer }: OverlapLineProps) => {
    // Get player positions for the two zones in this constraint
    const { coords1, coords2, isHighlighted } = useMemo(() => {
      const player1 = players.find((p) => p.zone === overlap.zone1);
      const player2 = players.find((p) => p.zone === overlap.zone2);

      // Use actual player positions if available, fallback to zone positions
      const pos1 = player1?.position ?? ZONE_POSITIONS[overlap.zone1];
      const pos2 = player2?.position ?? ZONE_POSITIONS[overlap.zone2];

      // Check if either player in this constraint is selected
      const highlighted =
        selectedPlayer !== null &&
        (player1?.role === selectedPlayer || player2?.role === selectedPlayer);

      return {
        coords1: toSvgCoords(pos1.x, pos1.y),
        coords2: toSvgCoords(pos2.x, pos2.y),
        isHighlighted: highlighted,
      };
    }, [overlap, players, toSvgCoords, selectedPlayer]);

    // Blue for front-back, orange for left-right. A line is quiet until one
    // of its two players is selected.
    return (
      <line
        x1={coords1.x}
        y1={coords1.y}
        x2={coords2.x}
        y2={coords2.y}
        stroke={OVERLAP_COLORS[overlap.type]}
        strokeOpacity={isHighlighted ? 1 : 0.5}
        strokeWidth={isHighlighted ? 3 : 1.5}
        strokeDasharray={overlap.type === "front-back" ? "6 3" : "3 3"}
        className="transition-all duration-200"
      />
    );
  }
);
OverlapLine.displayName = "OverlapLine";
