"use client";

import { memo, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { PlayerNode } from "./PlayerNode";
import { OverlapLine } from "./OverlapLine";
import { MovementArrow } from "./MovementArrow";
import type {
  PlayerPosition,
  OverlapConstraint,
  MovementArrow as ArrowType,
  GameMode,
} from "@/lib/volleyball/types";
import { COURT_SVG } from "@/lib/volleyball/constants";

type VolleyballCourtProps = {
  players: PlayerPosition[];
  overlaps: OverlapConstraint[];
  arrows: ArrowType[];
  selectedPlayer: string | null;
  onPlayerSelect: (role: string | null) => void;
  mode: GameMode;
  showOverlaps: boolean;
  showArrows: boolean;
};

const { WIDTH, HEIGHT, PADDING } = COURT_SVG;
const VIEWBOX_WIDTH = WIDTH + PADDING * 2;
const VIEWBOX_HEIGHT = HEIGHT + PADDING * 2;

export const VolleyballCourt = memo(
  ({
    players,
    overlaps,
    arrows,
    selectedPlayer,
    onPlayerSelect,
    mode,
    showOverlaps,
    showArrows,
  }: VolleyballCourtProps) => {
    /** Convert normalized coordinates to SVG coordinates */
    const toSvgCoords = useCallback((x: number, y: number) => {
      return {
        x: PADDING + x * WIDTH,
        y: PADDING + (1 - y) * HEIGHT, // Flip Y axis (0 at bottom)
      };
    }, []);

    const attackLineY = PADDING + (1 - COURT_SVG.ATTACK_LINE_Y) * HEIGHT;

    const handleCourtClick = useCallback(() => {
      onPlayerSelect(null);
    }, [onPlayerSelect]);

    const handleCourtKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          onPlayerSelect(null);
        }
      },
      [onPlayerSelect]
    );

    return (
      <div className="relative w-full aspect-[4/3] max-w-2xl mx-auto">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="w-full h-full"
          role="img"
          aria-label="Volleyball half-court diagram showing player positions"
          onClick={handleCourtClick}
          onKeyDown={handleCourtKeyDown}
          tabIndex={0}
        >
          <defs>
            {/* Arrow markers: one for a plain arrow, one for the selected player's */}
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" className="fill-ink-soft" />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" className="fill-ink" />
            </marker>
          </defs>

          {/* Court floor */}
          <rect
            x={PADDING}
            y={PADDING}
            width={WIDTH}
            height={HEIGHT}
            className="fill-fill stroke-ink-soft"
            strokeWidth="2"
            rx="4"
          />

          {/* Net (top edge) */}
          <line
            x1={PADDING}
            y1={PADDING}
            x2={PADDING + WIDTH}
            y2={PADDING}
            className="stroke-ink"
            strokeWidth="4"
          />
          <text
            x={PADDING + WIDTH / 2}
            y={PADDING - 12}
            textAnchor="middle"
            className="fill-ink-soft text-xs font-semibold"
          >
            Net
          </text>

          {/* Attack line (3m line) */}
          <line
            x1={PADDING}
            y1={attackLineY}
            x2={PADDING + WIDTH}
            y2={attackLineY}
            className="stroke-ink-soft"
            strokeWidth="2"
            strokeDasharray="8 4"
          />
          <text
            x={PADDING + WIDTH + 8}
            y={attackLineY + 4}
            className="fill-ink-soft text-[10px] font-medium"
          >
            3m
          </text>

          {/* End line label */}
          <text
            x={PADDING + WIDTH / 2}
            y={PADDING + HEIGHT + 18}
            textAnchor="middle"
            className="fill-ink-soft text-xs font-semibold"
          >
            End Line
          </text>

          {/* Center line (vertical) */}
          <line
            x1={PADDING + WIDTH / 2}
            y1={PADDING}
            x2={PADDING + WIDTH / 2}
            y2={PADDING + HEIGHT}
            className="stroke-ink-soft/50"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/*
            Zone numbers, as a faint watermark on the floor. They stay under
            4.5 to 1 on purpose: each player carries its own "Z" label, and at
            full strength the two would run into each other in the back row.
          */}
          {[
            { zone: 4, x: 0.17, y: 0.88 },
            { zone: 3, x: 0.5, y: 0.88 },
            { zone: 2, x: 0.83, y: 0.88 },
            { zone: 5, x: 0.17, y: 0.12 },
            { zone: 6, x: 0.5, y: 0.12 },
            { zone: 1, x: 0.83, y: 0.12 },
          ].map(({ zone, x, y }) => {
            const coords = toSvgCoords(x, y);
            return (
              <text
                key={zone}
                x={coords.x}
                y={coords.y}
                textAnchor="middle"
                dominantBaseline="middle"
                aria-hidden="true"
                className="fill-ink/10 text-2xl font-bold select-none pointer-events-none"
              >
                {zone}
              </text>
            );
          })}

          {/* Overlap constraint lines */}
          {showOverlaps && (
            <g>
              {overlaps.map((overlap, i) => (
                <OverlapLine
                  key={`overlap-${i}`}
                  overlap={overlap}
                  players={players}
                  toSvgCoords={toSvgCoords}
                  selectedPlayer={selectedPlayer}
                />
              ))}
            </g>
          )}

          {/* Movement arrows */}
          <AnimatePresence>
            {showArrows &&
              arrows.map((arrow, i) => (
                <MovementArrow
                  key={`arrow-${arrow.role}-${i}`}
                  arrow={arrow}
                  toSvgCoords={toSvgCoords}
                  isHighlighted={selectedPlayer === arrow.role}
                />
              ))}
          </AnimatePresence>

          {/* Player nodes */}
          <AnimatePresence mode="popLayout">
            {players.map((player) => (
              <PlayerNode
                key={player.role}
                player={player}
                toSvgCoords={toSvgCoords}
                isSelected={selectedPlayer === player.role}
                onSelect={onPlayerSelect}
              />
            ))}
          </AnimatePresence>

          {/* Mode indicator */}
          <text
            x={PADDING + WIDTH / 2}
            y={VIEWBOX_HEIGHT - 8}
            textAnchor="middle"
            className="fill-ink text-sm font-bold"
          >
            {mode === "serving" ? "Serving" : "Receiving"}
          </text>
        </svg>
      </div>
    );
  }
);
VolleyballCourt.displayName = "VolleyballCourt";
