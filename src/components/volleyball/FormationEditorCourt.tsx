"use client";

import { memo, useCallback, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DraggablePlayerNode } from "./DraggablePlayerNode";
import type {
  PlayerRole,
  CourtPosition,
  RotationFrame,
  GameMode,
  RotationNumber,
} from "@/lib/volleyball/types";
import { COURT_SVG, PLAYER_COLORS, BACK_ROW_ZONES } from "@/lib/volleyball/constants";
import { ROTATION_CHART } from "@/lib/volleyball/rotations";

type FormationEditorCourtProps = {
  frame: RotationFrame;
  rotation: RotationNumber;
  mode: GameMode;
  liberoActive: boolean;
  selectedRole: PlayerRole | null;
  onSelectRole: (role: PlayerRole | null) => void;
  onPositionChange: (role: PlayerRole, position: CourtPosition) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  // Arrow editing props
  isDrawingArrow?: boolean;
  arrowStartRole?: PlayerRole | null;
  onArrowStartSelect?: (role: PlayerRole) => void;
  onArrowEndSelect?: (position: CourtPosition) => void;
  onArrowCancel?: () => void;
};

const { WIDTH, HEIGHT, PADDING } = COURT_SVG;
const VIEWBOX_WIDTH = WIDTH + PADDING * 2;
const VIEWBOX_HEIGHT = HEIGHT + PADDING * 2;

// Core roles (excludes Libero as it replaces MB)
const CORE_ROLES: PlayerRole[] = ["S", "OPP", "OH1", "OH2", "MB1", "MB2"];

export const FormationEditorCourt = memo(
  ({
    frame,
    rotation,
    mode,
    liberoActive,
    selectedRole,
    onSelectRole,
    onPositionChange,
    onDragStart,
    onDragEnd,
    disabled = false,
    isDrawingArrow = false,
    arrowStartRole = null,
    onArrowStartSelect,
    onArrowEndSelect,
    onArrowCancel,
  }: FormationEditorCourtProps) => {
    // Track cursor position for arrow preview
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    /** Convert normalized coordinates to SVG coordinates */
    const toSvgCoords = useCallback((x: number, y: number) => {
      return {
        x: PADDING + x * WIDTH,
        y: PADDING + (1 - y) * HEIGHT, // Flip Y axis (0 at bottom)
      };
    }, []);

    /** Convert SVG coordinates back to normalized coordinates */
    const fromSvgCoords = useCallback((svgX: number, svgY: number) => {
      return {
        x: (svgX - PADDING) / WIDTH,
        y: 1 - (svgY - PADDING) / HEIGHT, // Flip Y axis back
      };
    }, []);

    const attackLineY = PADDING + (1 - COURT_SVG.ATTACK_LINE_Y) * HEIGHT;

    // Determine which MB is in back row
    const getBackRowMiddle = (): "MB1" | "MB2" => {
      const chart = ROTATION_CHART[rotation];
      for (const [zoneStr, role] of Object.entries(chart)) {
        const zone = parseInt(zoneStr);
        if ((role === "MB1" || role === "MB2") && BACK_ROW_ZONES.includes(zone as 1 | 2 | 3 | 4 | 5 | 6)) {
          return role;
        }
      }
      return "MB1";
    };

    const backRowMB = getBackRowMiddle();

    // Get role zone from rotation chart
    const getRoleZone = (role: PlayerRole): number => {
      if (role === "L") {
        return getRoleZone(backRowMB);
      }
      const chart = ROTATION_CHART[rotation];
      for (const [zoneStr, r] of Object.entries(chart)) {
        if (r === role) return parseInt(zoneStr);
      }
      return 1;
    };

    // Check if role is in back row
    const isBackRow = (role: PlayerRole): boolean => {
      const zone = getRoleZone(role);
      return BACK_ROW_ZONES.includes(zone as 1 | 2 | 3 | 4 | 5 | 6);
    };

    // Build player data from frame
    const getPlayersToRender = () => {
      const players: Array<{
        role: PlayerRole;
        position: CourtPosition;
        label: string;
        isBackRow: boolean;
      }> = [];

      const chart = ROTATION_CHART[rotation];

      for (const [, role] of Object.entries(chart)) {
        const isMiddle = role === "MB1" || role === "MB2";
        const inBackRow = isBackRow(role);
        const shouldShowLibero = liberoActive && isMiddle && inBackRow;

        if (shouldShowLibero) {
          // Show Libero instead of back-row MB
          const liberoPos = frame.roleSpots.L || frame.roleSpots[role];
          if (liberoPos) {
            players.push({
              role: "L",
              position: liberoPos,
              label: "L",
              isBackRow: true,
            });
          }
        } else {
          const pos = frame.roleSpots[role];
          if (pos) {
            players.push({
              role,
              position: pos,
              label: role,
              isBackRow: inBackRow,
            });
          }
        }
      }

      return players;
    };

    const playersToRender = getPlayersToRender();

    const handleCourtClick = useCallback(() => {
      onSelectRole(null);
    }, [onSelectRole]);

    const handleCourtKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          if (isDrawingArrow && onArrowCancel) {
            onArrowCancel();
          } else {
            onSelectRole(null);
          }
        }
      },
      [onSelectRole, isDrawingArrow, onArrowCancel]
    );

    // Handle mouse move for arrow preview
    const handleMouseMove = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDrawingArrow || !arrowStartRole || !svgRef.current) return;

        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;

        // Convert screen coordinates to SVG coordinates
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        const svgX = (e.clientX - rect.left) * scaleX;
        const svgY = (e.clientY - rect.top) * scaleY;

        setCursorPos({ x: svgX, y: svgY });
      },
      [isDrawingArrow, arrowStartRole]
    );

    // Handle click on court for arrow end position
    const handleCourtClickForArrow = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDrawingArrow || !arrowStartRole || !onArrowEndSelect || !svgRef.current) {
          // Not in arrow drawing mode, use default click handler
          onSelectRole(null);
          return;
        }

        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;

        // Convert screen coordinates to SVG coordinates
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        const svgX = (e.clientX - rect.left) * scaleX;
        const svgY = (e.clientY - rect.top) * scaleY;

        // Convert to normalized coordinates
        const normalized = fromSvgCoords(svgX, svgY);

        // Clamp to court bounds
        const clampedX = Math.max(0, Math.min(1, normalized.x));
        const clampedY = Math.max(0, Math.min(1, normalized.y));

        onArrowEndSelect({ x: clampedX, y: clampedY });
        setCursorPos(null);
      },
      [isDrawingArrow, arrowStartRole, onArrowEndSelect, onSelectRole, fromSvgCoords]
    );

    // Handle player click for arrow start
    const handlePlayerClickForArrow = useCallback(
      (role: PlayerRole | null) => {
        if (role && isDrawingArrow && onArrowStartSelect && !arrowStartRole) {
          onArrowStartSelect(role);
        } else {
          onSelectRole(role);
        }
      },
      [isDrawingArrow, onArrowStartSelect, arrowStartRole, onSelectRole]
    );

    // Reset cursor position when drawing mode changes
    useEffect(() => {
      if (!isDrawingArrow) {
        setCursorPos(null);
      }
    }, [isDrawingArrow]);

    // Get arrow start position for preview
    const getArrowStartPos = useCallback(() => {
      if (!arrowStartRole || !frame.roleSpots[arrowStartRole]) return null;

      // Handle libero case
      const backRowMB = getBackRowMiddle();
      if (arrowStartRole === "L") {
        const liberoPos = frame.roleSpots.L || frame.roleSpots[backRowMB];
        if (liberoPos) return toSvgCoords(liberoPos.x, liberoPos.y);
      }

      const pos = frame.roleSpots[arrowStartRole];
      if (pos) return toSvgCoords(pos.x, pos.y);
      return null;
    }, [arrowStartRole, frame.roleSpots, toSvgCoords]);

    return (
      <div className="relative w-full aspect-4/3 max-w-2xl mx-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className={`w-full h-full ${isDrawingArrow ? "cursor-crosshair" : ""}`}
          role="application"
          aria-label="Formation editor court. Drag players to reposition them."
          onClick={handleCourtClickForArrow}
          onMouseMove={handleMouseMove}
          onKeyDown={handleCourtKeyDown}
          tabIndex={0}
          style={{ touchAction: "none" }}
        >
          <defs>
            {/* Court gradient */}
            <linearGradient
              id="editorCourtGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="oklch(0.55 0.12 145 / 0.25)" />
              <stop offset="100%" stopColor="oklch(0.55 0.12 145 / 0.10)" />
            </linearGradient>

            {/* Arrow marker */}
            <marker
              id="editorArrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                className="fill-primary/70"
              />
            </marker>

            {/* Glow filter for selected elements */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid pattern */}
            <pattern
              id="editorGrid"
              width="40"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 30"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-foreground/5"
              />
            </pattern>
          </defs>

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
                className="fill-foreground/10 text-2xl font-bold select-none pointer-events-none"
              >
                {zone}
              </text>
            );
          })}

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

          {/* Draggable player nodes */}
          <AnimatePresence mode="popLayout">
            {playersToRender.map((player) => (
              <DraggablePlayerNode
                key={player.role}
                role={player.role}
                position={player.position}
                label={player.label}
                isBackRow={player.isBackRow}
                toSvgCoords={toSvgCoords}
                fromSvgCoords={fromSvgCoords}
                isSelected={selectedRole === player.role}
                isArrowSource={isDrawingArrow && arrowStartRole === player.role}
                onSelect={isDrawingArrow ? handlePlayerClickForArrow : onSelectRole}
                onPositionChange={onPositionChange}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={disabled}
                preventDrag={isDrawingArrow}
              />
            ))}
          </AnimatePresence>

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
        </svg>
      </div>
    );
  }
);
FormationEditorCourt.displayName = "FormationEditorCourt";
