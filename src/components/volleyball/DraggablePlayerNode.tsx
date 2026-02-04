"use client";

import { memo, useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PlayerRole, CourtPosition } from "@/lib/volleyball/types";
import { COURT_SVG, PLAYER_COLORS } from "@/lib/volleyball/constants";

const { NODE_RADIUS } = COURT_SVG;

type DraggablePlayerNodeProps = {
  role: PlayerRole;
  position: CourtPosition;
  label: string;
  isBackRow?: boolean;
  isSelected: boolean;
  isArrowSource?: boolean;
  toSvgCoords: (x: number, y: number) => { x: number; y: number };
  fromSvgCoords: (svgX: number, svgY: number) => { x: number; y: number };
  onSelect: (role: PlayerRole | null) => void;
  onPositionChange: (role: PlayerRole, position: CourtPosition) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  preventDrag?: boolean;
};

export const DraggablePlayerNode = memo(
  ({
    role,
    position,
    label,
    isBackRow = false,
    isSelected,
    isArrowSource = false,
    toSvgCoords,
    fromSvgCoords,
    onSelect,
    onPositionChange,
    onDragStart,
    onDragEnd,
    disabled = false,
    preventDrag = false,
  }: DraggablePlayerNodeProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const svgRef = useRef<SVGGElement>(null);

    const coords = toSvgCoords(position.x, position.y);
    const color = PLAYER_COLORS[role]?.bg || "gray";

    // Clamp position to valid range
    const clampPosition = (pos: CourtPosition): CourtPosition => ({
      x: Math.max(0, Math.min(1, pos.x)),
      y: Math.max(0, Math.min(1, pos.y)),
    });

    // Get SVG element for coordinate calculations
    const getSvgElement = (): SVGSVGElement | null => {
      return svgRef.current?.ownerSVGElement || null;
    };

    // Convert client coordinates to SVG coordinates
    const clientToSvg = (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = getSvgElement();
      if (!svg) return null;

      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;

      const ctm = svg.getScreenCTM();
      if (!ctm) return null;

      const svgPoint = point.matrixTransform(ctm.inverse());
      return { x: svgPoint.x, y: svgPoint.y };
    };

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (disabled) return;

        e.preventDefault();
        e.stopPropagation();

        // Click-only mode: just select, no drag
        if (preventDrag) {
          onSelect(role);
          return;
        }

        // Capture pointer for tracking outside element
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const svgCoords = clientToSvg(e.clientX, e.clientY);
        if (svgCoords) {
          dragStartRef.current = svgCoords;
          setIsDragging(true);
          onDragStart?.();
          onSelect(role);
        }
      },
      [disabled, preventDrag, onDragStart, onSelect, role]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isDragging || !dragStartRef.current) return;

        e.preventDefault();
        e.stopPropagation();

        const svgCoords = clientToSvg(e.clientX, e.clientY);
        if (svgCoords) {
          // Convert SVG coordinates to normalized court position
          const normalizedPos = fromSvgCoords(svgCoords.x, svgCoords.y);
          const clampedPos = clampPosition(normalizedPos);
          onPositionChange(role, clampedPos);
        }
      },
      [isDragging, fromSvgCoords, onPositionChange, role]
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent) => {
        if (!isDragging) return;

        e.preventDefault();
        e.stopPropagation();

        // Release pointer capture
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        setIsDragging(false);
        dragStartRef.current = null;
        onDragEnd?.();
      },
      [isDragging, onDragEnd]
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (disabled) return;
        e.stopPropagation();
        // Click-only mode: always select (no toggle)
        if (preventDrag) {
          onSelect(role);
          return;
        }
        // Only toggle selection if not dragging
        if (!isDragging) {
          onSelect(isSelected ? null : role);
        }
      },
      [disabled, preventDrag, isDragging, isSelected, onSelect, role]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onSelect(isSelected ? null : role);
        }

        // Arrow key movement
        if (isSelected && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          const step = e.shiftKey ? 0.05 : 0.02;
          let newPos = { ...position };

          switch (e.key) {
            case "ArrowUp":
              newPos.y = Math.min(1, position.y + step);
              break;
            case "ArrowDown":
              newPos.y = Math.max(0, position.y - step);
              break;
            case "ArrowLeft":
              newPos.x = Math.max(0, position.x - step);
              break;
            case "ArrowRight":
              newPos.x = Math.min(1, position.x + step);
              break;
          }

          onPositionChange(role, newPos);
        }
      },
      [disabled, isSelected, onSelect, role, position, onPositionChange]
    );

    return (
      <motion.g
        ref={svgRef}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: isDragging ? 1.1 : 1,
          opacity: 1,
          x: coords.x,
          y: coords.y,
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: isDragging ? 400 : 300,
          damping: isDragging ? 30 : 25,
          x: { type: "spring", stiffness: 200, damping: 20 },
          y: { type: "spring", stiffness: 200, damping: 20 },
        }}
        style={{
          originX: 0,
          originY: 0,
          cursor: disabled ? "default" : preventDrag ? "pointer" : isDragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={`${label}${isBackRow ? " (back row)" : " (front row)"}. ${disabled ? "" : "Drag to move or use arrow keys when selected."}`}
        aria-pressed={isSelected}
      >
        {/* Arrow source indicator (pulsing ring) */}
        {isArrowSource && (
          <motion.circle
            r={NODE_RADIUS + 8}
            fill="none"
            className="stroke-primary"
            strokeWidth="3"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: "easeInOut"
            }}
          />
        )}

        {/* Selection ring */}
        {isSelected && !isArrowSource && (
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

        {/* Drag indicator ring */}
        {isDragging && (
          <motion.circle
            r={NODE_RADIUS + 10}
            fill="none"
            className="stroke-primary/50"
            strokeWidth="2"
            strokeDasharray="4 4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          />
        )}

        {/* Back row indicator (dashed outline) */}
        {isBackRow && (
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
          fill={color}
          stroke="white"
          strokeWidth="2"
          className={`drop-shadow-md ${isDragging ? "drop-shadow-lg" : ""}`}
        />

        {/* Player label */}
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-sm font-bold pointer-events-none select-none"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
        >
          {label}
        </text>

        {/* Position indicator (shown when dragging or selected) */}
        {(isDragging || isSelected) && (
          <text
            y={NODE_RADIUS + 14}
            textAnchor="middle"
            className="fill-primary text-[10px] font-medium pointer-events-none"
          >
            {position.x.toFixed(2)}, {position.y.toFixed(2)}
          </text>
        )}

        {/* Libero badge */}
        {role === "L" && (
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
DraggablePlayerNode.displayName = "DraggablePlayerNode";
