"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CourtPosition,
  GameMode,
  PlayerRole,
  RotationFrame,
  RotationNumber,
} from "@/lib/volleyball/types";
import { BACK_ROW_ZONES } from "@/lib/volleyball/constants";
import { ROTATION_CHART, getBackRowMiddle } from "@/lib/volleyball/rotations";
import { fromSvgCoords, toSvgCoords } from "@/lib/volleyball/coordinateUtils";
import { MbCourt } from "@/components/matchbook/court/MbCourt";
import {
  MbPlayerTarget,
  MbPlayerToken,
  type MbPlayerTokenState,
} from "@/components/matchbook/court/MbPlayerToken";
import { MbCourtArrow } from "@/components/matchbook/court/MbCourtArrow";
import { MbConstraintLine } from "@/components/matchbook/court/MbConstraintLine";
import { COURT_RECT, clampCourtPosition } from "@/components/matchbook/court/geometry";
import { getOverlapConstraints } from "@/lib/volleyball/overlap";
import { useMbReducedMotion } from "@/components/matchbook/useMbReducedMotion";

/* ===========================================================================
   THE EDIT SURFACE

   This is the app's one genuinely tactile screen, so the drag is built to feel
   exact rather than smooth:

     ZERO EASING UNDER THE FINGER. `instant` switches the token's transform
     transition off for the duration of the gesture. A token that eases toward
     the pointer reads as lag at any duration above zero, and on release the
     player is exactly where the finger left it — no settle, no spring.

     POINTER EVENTS, NOT MOUSE EVENTS, with `setPointerCapture`, so a drag that
     leaves the token — or the SVG — keeps tracking, and so the same code path
     serves touch, pen and mouse. `touch-action: none` on the token stops the
     browser claiming the gesture as a scroll.

     DROP GUIDES. Two hairlines run from the dragged token to the court edges
     while the pointer is down, so the position can be read against the zone
     numerals instead of guessed.

     THE READOUT DOES NOT LIVE UNDER THE TOKEN. `DraggablePlayerNode` printed
     `{x.toFixed(2)}, {y.toFixed(2)}` as SVG text beneath the disc, in
     proportional figures, re-typesetting on every frame of every drag. The
     numbers are now reported upward through `onDragPosition` and set in a
     fixed-width `tabular-nums` box in the panel head, where nothing can reflow.

     KEYBOARD IS A FIRST-CLASS PATH. Select a token, then arrow keys move it —
     fine 0.005, Shift 0.02, Ctrl 0.05, exactly the three step sizes the old
     editor had.
   =========================================================================== */

const KEYBOARD_STEP = { fine: 0.005, medium: 0.02, coarse: 0.05 } as const;

/** Static in the domain layer, so it is read once rather than per render. */
const OVERLAPS = getOverlapConstraints();

const HAIRLINE = { vectorEffect: "non-scaling-stroke" } as const;

interface EditorPlayer {
  role: PlayerRole;
  label: string;
  position: CourtPosition;
  isBackRow: boolean;
  zone: number;
}

export interface EditorCourtStageProps {
  frame: RotationFrame;
  rotation: RotationNumber;
  mode: GameMode;
  liberoActive: boolean;
  selectedRole: PlayerRole | null;
  onSelectRole: (role: PlayerRole | null) => void;
  onPositionChange: (role: PlayerRole, position: CourtPosition) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** Live position of the token under the finger, or `null` when idle. */
  onDragPosition?: (position: CourtPosition | null) => void;
  isDrawingArrow?: boolean;
  arrowStartRole?: PlayerRole | null;
  onArrowStartSelect?: (role: PlayerRole) => void;
  onArrowEndSelect?: (position: CourtPosition) => void;
  onArrowCancel?: () => void;
  /**
   * The editor draws the same constraint lines the read-only court does. It is
   * the screen where they matter most — you are placing the players that have
   * to satisfy them — and without it the rail's Overlaps chip would be a
   * control that changes nothing.
   */
  showOverlaps?: boolean;
  showArrows?: boolean;
  className?: string;
}

export const EditorCourtStage = memo(
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
    onDragPosition,
    isDrawingArrow = false,
    arrowStartRole = null,
    onArrowStartSelect,
    onArrowEndSelect,
    onArrowCancel,
    showOverlaps = false,
    showArrows = true,
    className = "",
  }: EditorCourtStageProps) => {
    const reduce = useMbReducedMotion();
    const svgRef = useRef<SVGSVGElement>(null);
    const rafRef = useRef<number | null>(null);
    const pendingRef = useRef<CourtPosition | null>(null);
    const [dragRole, setDragRole] = useState<PlayerRole | null>(null);
    const [dragDraft, setDragDraft] = useState<CourtPosition | null>(null);
    const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

    useEffect(
      () => () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      },
      []
    );

    /**
     * The six tokens for this frame, memoised on the three inputs that decide
     * them. `FormationEditorCourt` recomputed `getBackRowMiddle`, `getRoleZone`
     * and the whole player list on every render, which — with the old
     * clone-per-frame in `useFormationEditor` — meant three full passes per
     * drag frame.
     */
    const players = useMemo<EditorPlayer[]>(() => {
      const chart = ROTATION_CHART[rotation];
      const backRowMB = getBackRowMiddle(rotation);
      const list: EditorPlayer[] = [];

      for (const [zoneKey, role] of Object.entries(chart)) {
        const zone = Number(zoneKey) as 1 | 2 | 3 | 4 | 5 | 6;
        const inBackRow = BACK_ROW_ZONES.includes(zone);
        const isMiddle = role === "MB1" || role === "MB2";
        const showLibero = liberoActive && isMiddle && inBackRow;

        if (showLibero) {
          // The legacy fallback, kept for documents written before the editor
          // started materialising `roleSpots.L` on save.
          const position = frame.roleSpots.L ?? frame.roleSpots[backRowMB];
          if (position) {
            list.push({ role: "L", label: "L", position, isBackRow: true, zone });
          }
          continue;
        }

        const position = frame.roleSpots[role];
        if (position) {
          list.push({ role, label: role, position, isBackRow: inBackRow, zone });
        }
      }
      return list;
    }, [frame, rotation, liberoActive]);

    /** Client px -> the fixed SVG user space, through the live screen matrix. */
    const clientToSvg = useCallback((clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const matrix = svg.getScreenCTM();
      if (!matrix) return null;
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const local = point.matrixTransform(matrix.inverse());
      return { x: local.x, y: local.y };
    }, []);

    const commit = useCallback(
      (role: PlayerRole, position: CourtPosition) => {
        pendingRef.current = position;
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingRef.current) onPositionChange(role, pendingRef.current);
        });
      },
      [onPositionChange]
    );

    const startDrag = useCallback(
      (player: EditorPlayer, event: React.PointerEvent<HTMLButtonElement>) => {
        if (isDrawingArrow) {
          // In arrow mode a token is a source, not a draggable object.
          if (!arrowStartRole && onArrowStartSelect) onArrowStartSelect(player.role);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragRole(player.role);
        setDragDraft(player.position);
        onSelectRole(player.role);
        onDragStart?.();
        onDragPosition?.(player.position);
      },
      [isDrawingArrow, arrowStartRole, onArrowStartSelect, onSelectRole, onDragStart, onDragPosition]
    );

    const moveDrag = useCallback(
      (player: EditorPlayer, event: React.PointerEvent<HTMLButtonElement>) => {
        if (dragRole !== player.role) return;
        event.preventDefault();
        event.stopPropagation();
        const local = clientToSvg(event.clientX, event.clientY);
        if (!local) return;
        const next = clampCourtPosition(fromSvgCoords(local.x, local.y));
        setDragDraft(next);
        onDragPosition?.(next);
        commit(player.role, next);
      },
      [dragRole, clientToSvg, commit, onDragPosition]
    );

    const endDrag = useCallback(
      (player: EditorPlayer, event: React.PointerEvent<HTMLButtonElement>) => {
        if (dragRole !== player.role) return;
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        if (target.hasPointerCapture(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
        }
        // Flush, so the last frame of the gesture is never dropped by the RAF.
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (pendingRef.current) {
          onPositionChange(player.role, pendingRef.current);
          pendingRef.current = null;
        }
        setDragRole(null);
        setDragDraft(null);
        onDragPosition?.(null);
        onDragEnd?.();
      },
      [dragRole, onPositionChange, onDragEnd, onDragPosition]
    );

    const handleTokenKeyDown = useCallback(
      (player: EditorPlayer, event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          if (isDrawingArrow && !arrowStartRole && onArrowStartSelect) {
            onArrowStartSelect(player.role);
          } else {
            onSelectRole(selectedRole === player.role ? null : player.role);
          }
          return;
        }
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const step = event.ctrlKey
          ? KEYBOARD_STEP.coarse
          : event.shiftKey
          ? KEYBOARD_STEP.medium
          : KEYBOARD_STEP.fine;
        const next = { ...player.position };
        if (event.key === "ArrowUp") next.y += step;
        if (event.key === "ArrowDown") next.y -= step;
        if (event.key === "ArrowLeft") next.x -= step;
        if (event.key === "ArrowRight") next.x += step;
        const clamped = clampCourtPosition(next);
        onSelectRole(player.role);
        onPositionChange(player.role, clamped);
        onDragPosition?.(clamped);
      },
      [
        isDrawingArrow,
        arrowStartRole,
        onArrowStartSelect,
        onSelectRole,
        onPositionChange,
        onDragPosition,
        selectedRole,
      ]
    );

    /* --------------------------------------------------------- arrow mode */

    const arrowStartPoint = useMemo(() => {
      if (!arrowStartRole) return null;
      const position =
        arrowStartRole === "L"
          ? frame.roleSpots.L ?? frame.roleSpots[getBackRowMiddle(rotation)]
          : frame.roleSpots[arrowStartRole];
      return position ? toSvgCoords(position.x, position.y) : null;
    }, [arrowStartRole, frame.roleSpots, rotation]);

    const handleSurfacePointerMove = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!isDrawingArrow || !arrowStartRole) return;
        const local = clientToSvg(event.clientX, event.clientY);
        if (local) setCursor(local);
      },
      [isDrawingArrow, arrowStartRole, clientToSvg]
    );

    const handleSurfaceClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isDrawingArrow && arrowStartRole && onArrowEndSelect) {
          const local = clientToSvg(event.clientX, event.clientY);
          if (local) {
            onArrowEndSelect(clampCourtPosition(fromSvgCoords(local.x, local.y)));
            setCursor(null);
          }
          return;
        }
        onSelectRole(null);
      },
      [isDrawingArrow, arrowStartRole, onArrowEndSelect, onSelectRole, clientToSvg]
    );

    const handleSurfaceKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Escape") return;
        if (isDrawingArrow && onArrowCancel) onArrowCancel();
        else onSelectRole(null);
      },
      [isDrawingArrow, onArrowCancel, onSelectRole]
    );

    // Clear the preview when the mode ends, without an effect.
    const [wasDrawing, setWasDrawing] = useState(isDrawingArrow);
    if (isDrawingArrow !== wasDrawing) {
      setWasDrawing(isDrawingArrow);
      if (!isDrawingArrow && cursor) setCursor(null);
    }

    const dragCoords =
      dragRole && dragDraft ? toSvgCoords(dragDraft.x, dragDraft.y) : null;

    /** One state derivation, so the picture and its target cannot disagree. */
    const tokenState = (role: PlayerRole): MbPlayerTokenState =>
      arrowStartRole === role
        ? "arrow-source"
        : dragRole === role
        ? "dragging"
        : selectedRole === role
        ? "selected"
        : "idle";

    const overlay = (
      <>
        {/* Drop guides — only while the pointer is down. */}
        {dragCoords && (
          <g
            stroke="var(--mb-court-line-strong)"
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="4 4"
            style={{ pointerEvents: "none", ...HAIRLINE }}
          >
            <line
              x1={COURT_RECT.x}
              y1={dragCoords.y}
              x2={COURT_RECT.right}
              y2={dragCoords.y}
            />
            <line
              x1={dragCoords.x}
              y1={COURT_RECT.y}
              x2={dragCoords.x}
              y2={COURT_RECT.bottom}
            />
          </g>
        )}

        {showOverlaps &&
          OVERLAPS.map((overlap) => {
            const a = players.find((player) => player.zone === overlap.zone1);
            const b = players.find((player) => player.zone === overlap.zone2);
            if (!a || !b) return null;
            const liveA = dragRole === a.role && dragDraft ? dragDraft : a.position;
            const liveB = dragRole === b.role && dragDraft ? dragDraft : b.position;
            const c1 = toSvgCoords(liveA.x, liveA.y);
            const c2 = toSvgCoords(liveB.x, liveB.y);
            return (
              <MbConstraintLine
                key={`${overlap.type}-${overlap.zone1}-${overlap.zone2}`}
                type={overlap.type}
                x1={c1.x}
                y1={c1.y}
                x2={c2.x}
                y2={c2.y}
                highlighted={a.role === selectedRole || b.role === selectedRole}
              />
            );
          })}

        {showArrows && frame.movementArrows &&
          Object.entries(frame.movementArrows).map(([role, arrow]) =>
            arrow ? (
              <MbCourtArrow
                key={`arrow-${role}`}
                from={toSvgCoords(arrow.from.x, arrow.from.y)}
                to={toSvgCoords(arrow.to.x, arrow.to.y)}
                end="free"
                highlighted={role === selectedRole}
              />
            ) : null
          )}

        {isDrawingArrow && arrowStartRole && arrowStartPoint && cursor && (
          <MbCourtArrow from={arrowStartPoint} to={cursor} end="free" preview />
        )}

        {players.map((player) => {
          const live =
            dragRole === player.role && dragDraft ? dragDraft : player.position;
          const coords = toSvgCoords(live.x, live.y);
          return (
            <MbPlayerToken
              key={player.role}
              role={player.role}
              label={player.label}
              row={player.isBackRow ? "back" : "front"}
              x={coords.x}
              y={coords.y}
              order={player.zone - 1}
              state={tokenState(player.role)}
              instant={reduce || dragRole === player.role}
            />
          );
        })}
      </>
    );

    const targets = (
      <>
        {/* The arrow endpoint capture. It exists ONLY while an arrow is being
            drawn, it is a real button with a real name, and it covers the court
            — which is what "click anywhere to place the end" actually is. The
            alternative, an `onClick` on the SVG, is invisible to the keyboard
            and to every audit that walks interactive nodes. */}
        {isDrawingArrow && arrowStartRole && (
          <button
            type="button"
            aria-label={`Place the end of the ${arrowStartRole} movement arrow`}
            className="absolute inset-0 bg-transparent"
            style={{ cursor: "crosshair", touchAction: "none" }}
            onPointerMove={handleSurfacePointerMove}
            onClick={handleSurfaceClick}
          />
        )}
        {players.map((player) => {
          const live =
            dragRole === player.role && dragDraft ? dragDraft : player.position;
          const coords = toSvgCoords(live.x, live.y);
          return (
            <MbPlayerTarget
              key={player.role}
              role={player.role}
              label={player.label}
              zone={player.zone as never}
              row={player.isBackRow ? "back" : "front"}
              x={coords.x}
              y={coords.y}
              state={tokenState(player.role)}
              draggable={!isDrawingArrow}
              ariaLabel={`${player.label}, ${
                player.isBackRow ? "back row" : "front row"
              }, zone ${player.zone}. Drag to move, or select and use the arrow keys — Shift for a larger step, Control for the largest.`}
              onPointerDown={(event) => startDrag(player, event)}
              onPointerMove={(event) => moveDrag(player, event)}
              onPointerUp={(event) => endDrag(player, event)}
              onClick={(event) => {
                event.stopPropagation();
                if (isDrawingArrow || dragRole) return;
                onSelectRole(selectedRole === player.role ? null : player.role);
              }}
              onKeyDown={(event) => handleTokenKeyDown(player, event)}
            />
          );
        })}
      </>
    );

    return (
      <MbCourt
        variant="edit"
        mode={mode}
        rotation={rotation}
        overlay={overlay}
        targets={targets}
        svgRef={svgRef}
        onKeyDown={handleSurfaceKeyDown}
        cursor={isDrawingArrow ? "crosshair" : "default"}
        className={className}
        label={`Formation editor, rotation ${rotation}, ${mode}. Drag a player to reposition, or select one and use the arrow keys.`}
      />
    );
  }
);
EditorCourtStage.displayName = "EditorCourtStage";
