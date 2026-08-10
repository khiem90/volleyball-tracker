"use client";

import { memo, useCallback } from "react";
import type {
  GameMode,
  MovementArrow,
  OverlapConstraint,
  PlayerPosition,
  RotationNumber,
} from "@/lib/volleyball/types";
import { ZONE_POSITIONS } from "@/lib/volleyball/constants";
import { toSvgCoords } from "@/lib/volleyball/coordinateUtils";
import { MbCourt } from "@/components/matchbook/court/MbCourt";
import {
  MbPlayerTarget,
  MbPlayerToken,
} from "@/components/matchbook/court/MbPlayerToken";
import { MbConstraintLine } from "@/components/matchbook/court/MbConstraintLine";
import { MbCourtArrow } from "@/components/matchbook/court/MbCourtArrow";
import { useMbReducedMotion } from "@/components/matchbook/useMbReducedMotion";

/* ===========================================================================
   THE READ-ONLY COURT

   `VolleyballCourt.tsx` + `PlayerNode.tsx` + `OverlapLine.tsx` +
   `MovementArrow.tsx`, composed onto the shared court kit. Everything visual
   moved into `components/matchbook/court/*`; what is left here is the
   selection wiring and the paint order, which is the part that is specific to
   the read-only diagram.

   PAINT ORDER, and it matters: constraint lines under arrows under tokens. The
   old court drew the overlap lines inside `AnimatePresence` siblings so their
   order was whatever framer's exit bookkeeping produced, and a highlighted
   constraint could end up over a token.

   Keyboard: every token is a real `<button>` in the HTML target layer over the
   drawing, so Tab reaches it, Enter and Space activate it, `Escape` clears the
   selection, and the surface's own coral focus ring shows where you are. The
   old court was `<svg role="img" tabIndex={0} onClick>` wrapping `<g
   role="button">` nodes — an image that was focusable and clickable and
   announced as neither, with no visible focus anywhere in it.
   =========================================================================== */

export interface CourtStageProps {
  players: PlayerPosition[];
  overlaps: OverlapConstraint[];
  arrows: MovementArrow[];
  mode: GameMode;
  rotation: RotationNumber;
  selectedPlayer: string | null;
  onPlayerSelect: (role: string | null) => void;
  showOverlaps?: boolean;
  showArrows?: boolean;
  /** `sm` shrinks the disc for the phone cut where six labels compete. */
  tokenSize?: "md" | "sm";
  className?: string;
}

export const CourtStage = memo(
  ({
    players,
    overlaps,
    arrows,
    mode,
    rotation,
    selectedPlayer,
    onPlayerSelect,
    showOverlaps = true,
    showArrows = true,
    tokenSize = "md",
    className = "",
  }: CourtStageProps) => {
    const reduce = useMbReducedMotion();

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") onPlayerSelect(null);
      },
      [onPlayerSelect]
    );

    const overlay = (
      <>
        {showOverlaps &&
          overlaps.map((overlap) => {
            const a = players.find((player) => player.zone === overlap.zone1);
            const b = players.find((player) => player.zone === overlap.zone2);
            const p1 = a?.position ?? ZONE_POSITIONS[overlap.zone1];
            const p2 = b?.position ?? ZONE_POSITIONS[overlap.zone2];
            const c1 = toSvgCoords(p1.x, p1.y);
            const c2 = toSvgCoords(p2.x, p2.y);
            return (
              <MbConstraintLine
                key={`${overlap.type}-${overlap.zone1}-${overlap.zone2}`}
                type={overlap.type}
                x1={c1.x}
                y1={c1.y}
                x2={c2.x}
                y2={c2.y}
                highlighted={
                  selectedPlayer !== null &&
                  (a?.role === selectedPlayer || b?.role === selectedPlayer)
                }
              />
            );
          })}

        {showArrows &&
          arrows.map((arrow) => (
            <MbCourtArrow
              key={`arrow-${arrow.role}`}
              from={toSvgCoords(arrow.from.x, arrow.from.y)}
              to={toSvgCoords(arrow.to.x, arrow.to.y)}
              highlighted={arrow.role === selectedPlayer}
            />
          ))}

        {players.map((player) => {
          const coords = toSvgCoords(player.position.x, player.position.y);
          return (
            <MbPlayerToken
              key={player.role}
              role={player.role}
              label={player.label}
              zone={player.zone}
              row={player.isBackRow ? "back" : "front"}
              x={coords.x}
              y={coords.y}
              size={tokenSize}
              /* Rotation order, so the six tokens settle Z1 -> Z6 and the eye
                 can follow the clockwise move rather than seeing six things
                 teleport at once. */
              order={player.zone - 1}
              instant={reduce}
              state={selectedPlayer === player.role ? "selected" : "idle"}
            />
          );
        })}
      </>
    );

    const targets = players.map((player) => {
      const coords = toSvgCoords(player.position.x, player.position.y);
      return (
        <MbPlayerTarget
          key={player.role}
          role={player.role}
          label={player.label}
          zone={player.zone}
          row={player.isBackRow ? "back" : "front"}
          x={coords.x}
          y={coords.y}
          state={selectedPlayer === player.role ? "selected" : "idle"}
          onClick={() =>
            onPlayerSelect(selectedPlayer === player.role ? null : player.role)
          }
        />
      );
    });

    return (
      <MbCourt
        variant="view"
        mode={mode}
        rotation={rotation}
        overlay={overlay}
        targets={targets}
        onKeyDown={handleKeyDown}
        className={className}
        label={`Rotation ${rotation}, ${
          mode === "serving" ? "serving" : "receiving"
        }. ${players.length} players on court. Select a player to highlight its overlap constraints.`}
      />
    );
  }
);
CourtStage.displayName = "CourtStage";
