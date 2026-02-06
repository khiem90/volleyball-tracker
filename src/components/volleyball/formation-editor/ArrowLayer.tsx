"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { PlayerRole, RotationFrame } from "@/lib/volleyball/types";
import { toSvgCoords } from "@/lib/volleyball/coordinateUtils";

type ArrowLayerProps = {
  frame: RotationFrame;
  isDrawingArrow: boolean;
  arrowStartRole: PlayerRole | null;
  cursorPos: { x: number; y: number } | null;
  getArrowStartPos: () => { x: number; y: number } | null;
};

export const ArrowLayer = memo(function ArrowLayer({
  frame,
  isDrawingArrow,
  arrowStartRole,
  cursorPos,
  getArrowStartPos,
}: ArrowLayerProps) {
  return (
    <>
      {/* Existing movement arrows */}
      {frame.movementArrows && Object.entries(frame.movementArrows).map(([role, arrow]) => {
        if (!arrow) return null;
        const from = toSvgCoords(arrow.from.x, arrow.from.y);
        const to = toSvgCoords(arrow.to.x, arrow.to.y);

        // Shorten arrow to avoid overlap with player nodes
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 1) return null;

        const shortenStart = 28;
        const shortenEnd = 12;
        const startX = from.x + (dx / length) * shortenStart;
        const startY = from.y + (dy / length) * shortenStart;
        const endX = to.x - (dx / length) * shortenEnd;
        const endY = to.y - (dy / length) * shortenEnd;

        return (
          <motion.g
            key={`arrow-${role}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              className="stroke-primary/70 stroke-[2.5]"
              markerEnd="url(#editorArrowhead)"
              strokeLinecap="round"
            />
          </motion.g>
        );
      })}

      {/* Preview arrow while drawing */}
      {isDrawingArrow && arrowStartRole && cursorPos && (() => {
        const startPos = getArrowStartPos();
        if (!startPos) return null;

        // Calculate shortened start to avoid overlap with player node
        const dx = cursorPos.x - startPos.x;
        const dy = cursorPos.y - startPos.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 30) return null;

        const shortenStart = 28;
        const startX = startPos.x + (dx / length) * shortenStart;
        const startY = startPos.y + (dy / length) * shortenStart;

        return (
          <line
            x1={startX}
            y1={startY}
            x2={cursorPos.x}
            y2={cursorPos.y}
            className="stroke-primary/50 stroke-2"
            strokeDasharray="6 4"
            markerEnd="url(#editorArrowhead)"
            strokeLinecap="round"
            pointerEvents="none"
          />
        );
      })()}
    </>
  );
});
