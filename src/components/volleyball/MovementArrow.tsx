"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { MovementArrow as ArrowType } from "@/lib/volleyball/types";

type MovementArrowProps = {
  arrow: ArrowType;
  toSvgCoords: (x: number, y: number) => { x: number; y: number };
  isHighlighted: boolean;
};

export const MovementArrow = memo(
  ({ arrow, toSvgCoords, isHighlighted }: MovementArrowProps) => {
    const from = toSvgCoords(arrow.from.x, arrow.from.y);
    const to = toSvgCoords(arrow.to.x, arrow.to.y);

    // Calculate angle and shorten the arrow to not overlap with nodes
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Shorten from both ends to account for player node radius
    const shortenStart = 28; // NODE_RADIUS + padding
    const shortenEnd = 32;

    const startX = from.x + (dx / length) * shortenStart;
    const startY = from.y + (dy / length) * shortenStart;
    const endX = to.x - (dx / length) * shortenEnd;
    const endY = to.y - (dy / length) * shortenEnd;

    return (
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          className={`transition-all duration-200 ${
            isHighlighted
              ? "stroke-primary stroke-[3]"
              : "stroke-primary/50 stroke-[2]"
          }`}
          markerEnd="url(#arrowhead)"
          strokeLinecap="round"
        />
      </motion.g>
    );
  }
);
MovementArrow.displayName = "MovementArrow";
