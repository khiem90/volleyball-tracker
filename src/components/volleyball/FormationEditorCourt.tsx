"use client";

import { memo, useCallback, useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { DraggablePlayerNode } from "./DraggablePlayerNode";
import { CourtSvgDefs } from "./formation-editor/CourtSvgDefs";
import { CourtGrid } from "./formation-editor/CourtGrid";
import { ArrowLayer } from "./formation-editor/ArrowLayer";
import type {
  PlayerRole,
  CourtPosition,
  RotationFrame,
  GameMode,
  RotationNumber,
} from "@/lib/volleyball/types";
import { COURT_SVG, BACK_ROW_ZONES } from "@/lib/volleyball/constants";
import { ROTATION_CHART } from "@/lib/volleyball/rotations";
import { toSvgCoords, fromSvgCoords } from "@/lib/volleyball/coordinateUtils";

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
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

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
      if (role === "L") return getRoleZone(backRowMB);
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
          onSelectRole(null);
          return;
        }

        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;

        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        const svgX = (e.clientX - rect.left) * scaleX;
        const svgY = (e.clientY - rect.top) * scaleY;

        const normalized = fromSvgCoords(svgX, svgY);

        const clampedX = Math.max(0, Math.min(1, normalized.x));
        const clampedY = Math.max(0, Math.min(1, normalized.y));

        onArrowEndSelect({ x: clampedX, y: clampedY });
        setCursorPos(null);
      },
      [isDrawingArrow, arrowStartRole, onArrowEndSelect, onSelectRole]
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

    // Reset cursor position when drawing mode ends (render-time state adjustment)
    const [prevIsDrawingArrow, setPrevIsDrawingArrow] = useState(isDrawingArrow);
    if (isDrawingArrow !== prevIsDrawingArrow) {
      setPrevIsDrawingArrow(isDrawingArrow);
      if (prevIsDrawingArrow && !isDrawingArrow) {
        setCursorPos(null);
      }
    }

    // Get arrow start position for preview
    const getArrowStartPos = useCallback(() => {
      if (!arrowStartRole || !frame.roleSpots[arrowStartRole]) return null;

      if (arrowStartRole === "L") {
        const liberoPos = frame.roleSpots.L || frame.roleSpots[backRowMB];
        if (liberoPos) return toSvgCoords(liberoPos.x, liberoPos.y);
      }

      const pos = frame.roleSpots[arrowStartRole];
      if (pos) return toSvgCoords(pos.x, pos.y);
      return null;
    }, [arrowStartRole, frame.roleSpots, backRowMB]);

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
          <CourtSvgDefs />

          <CourtGrid
            attackLineY={attackLineY}
            mode={mode}
            rotation={rotation}
            disabled={disabled}
          />

          <ArrowLayer
            frame={frame}
            isDrawingArrow={isDrawingArrow}
            arrowStartRole={arrowStartRole}
            cursorPos={cursorPos}
            getArrowStartPos={getArrowStartPos}
          />

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
        </svg>
      </div>
    );
  }
);
FormationEditorCourt.displayName = "FormationEditorCourt";
