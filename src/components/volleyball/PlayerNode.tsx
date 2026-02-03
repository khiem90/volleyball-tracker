"use client";

import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import type { PlayerPosition } from "@/lib/volleyball/types";
import { COURT_SVG } from "@/lib/volleyball/constants";

type PlayerNodeProps = {
  player: PlayerPosition;
  toSvgCoords: (x: number, y: number) => { x: number; y: number };
  isSelected: boolean;
  onSelect: (role: string | null) => void;
};

const { NODE_RADIUS } = COURT_SVG;

export const PlayerNode = memo(
  ({ player, toSvgCoords, isSelected, onSelect }: PlayerNodeProps) => {
    const coords = toSvgCoords(player.position.x, player.position.y);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(isSelected ? null : player.role);
      },
      [onSelect, isSelected, player.role]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onSelect(isSelected ? null : player.role);
        }
      },
      [onSelect, isSelected, player.role]
    );

    return (
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          x: coords.x,
          y: coords.y,
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          x: { type: "spring", stiffness: 200, damping: 20 },
          y: { type: "spring", stiffness: 200, damping: 20 },
        }}
        style={{ originX: 0, originY: 0 }}
        className="cursor-pointer"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${player.label} in zone ${player.zone}${player.isBackRow ? " (back row)" : " (front row)"}`}
        aria-pressed={isSelected}
      >
        {/* Selection ring */}
        {isSelected && (
          <motion.circle
            r={NODE_RADIUS + 6}
            fill="none"
            className="stroke-primary"
            strokeWidth="3"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            filter="url(#glow)"
          />
        )}

        {/* Back row indicator (dashed outline) */}
        {player.isBackRow && (
          <circle
            r={NODE_RADIUS + 3}
            fill="none"
            className="stroke-blue-400/60 dark:stroke-blue-300/60"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        )}

        {/* Main circle */}
        <circle
          r={NODE_RADIUS}
          fill={player.color}
          stroke="white"
          strokeWidth="2"
          className="drop-shadow-md"
        />

        {/* Player label */}
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-sm font-bold pointer-events-none select-none"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
        >
          {player.label}
        </text>

        {/* Zone indicator */}
        <text
          y={NODE_RADIUS + 14}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] font-medium pointer-events-none"
        >
          Z{player.zone}
        </text>

        {/* Libero badge */}
        {player.role === "L" && (
          <g transform={`translate(${NODE_RADIUS - 6}, ${-NODE_RADIUS + 6})`}>
            <circle
              r="8"
              fill="oklch(0.60 0.18 310)"
              stroke="white"
              strokeWidth="1.5"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white text-[8px] font-bold pointer-events-none"
            >
              L
            </text>
          </g>
        )}
      </motion.g>
    );
  }
);
PlayerNode.displayName = "PlayerNode";
