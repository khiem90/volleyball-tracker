"use client";

import { memo, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { CourtZone, PlayerRole } from "@/lib/volleyball/types";
import { PLAYER_INFO } from "@/lib/volleyball/constants";
import { roleToken, roleChipStyle } from "@/lib/volleyball/roleTokens";
import { TOKEN_HIT_PX, TOKEN_RADIUS, TOKEN_RADIUS_SM } from "./geometry";
import { courtPercent } from "./MbCourt";

/* ===========================================================================
   THE PLAYER TOKEN

   The single most-touched object in the app and, measured at 390x844, the
   smallest: 31x42 to 35x44 of real hit area. It is now a 72-unit transparent
   circle — 52 CSS px at the narrowest viewport the app supports — around a disc
   that is drawn at whatever size the diagram needs.

   Identity is the LETTERFORM. Row is the FILL (navy disc = front, paper disc =
   back). Setter and libero add a detached ring. Nothing here is carried by hue
   alone, which is the whole difference from the seven-hue map it replaces —
   see `lib/volleyball/roleTokens.ts` for the reasoning.

   MOTION. The token is positioned by a CSS `transform` on its group and moves
   by transitioning that transform, so a rotation change is one composited
   property on seven elements. There is no spring and no framer-motion
   (invariants 40, 41, 51). While a finger is down, `instant` switches the
   transition off entirely: a drag that eases toward the pointer feels like lag,
   and the brief's whole ask for this screen is that dragging feel exact.

   `--mb-stagger` fractions give the six tokens a rotation-ordered settle so the
   eye can follow the clockwise move. No literal duration appears here; every
   number resolves to a motion token (invariant 40).
   =========================================================================== */

export type MbPlayerTokenState = "idle" | "selected" | "dragging" | "arrow-source";

export interface MbPlayerTokenProps {
  role: PlayerRole;
  /** Rendered letterform. Usually the role, but the libero substitutes in place. */
  label: string;
  zone?: CourtZone;
  row: "front" | "back";
  /** Centre, already in the fixed SVG user space. */
  x: number;
  y: number;
  state?: MbPlayerTokenState;
  size?: "md" | "sm";
  /** Skip the transform transition — set while the pointer is down. */
  instant?: boolean;
  /** 0-5, the token's place in the rotation-ordered settle. */
  order?: number;
  /** Rendered under the disc when set — the editor's live x,y readout. */
  caption?: string;
}

const LETTERFORM: CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  letterSpacing: "0.02em",
};

const CAPTION: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.1em",
  fill: "var(--mb-ink-muted)",
  fontVariantNumeric: "tabular-nums",
};

const HAIRLINE = { vectorEffect: "non-scaling-stroke" } as const;

export const MbPlayerToken = memo(
  ({
    role,
    label,
    zone,
    row,
    x,
    y,
    state = "idle",
    size = "md",
    instant = false,
    order = 0,
    caption,
  }: MbPlayerTokenProps) => {
    const token = roleToken(role, row === "back");
    const radius = size === "sm" ? TOKEN_RADIUS_SM : TOKEN_RADIUS;
    const selected = state === "selected" || state === "arrow-source";
    const dragging = state === "dragging";

    return (
      <g
        /* Picture only — the interactive object is `MbPlayerTarget`, an HTML
           button positioned over this. `transform-box: fill-box` would re-origin
           the scale to the disc's own box and fight the translate, so the group
           is translated and the lift is applied to the drawn children. */
        style={{
          transform: `translate(${x}px, ${y}px)`,
          transition: instant
            ? "none"
            : "transform var(--mb-dur-base) var(--mb-ease-out)",
          transitionDelay: instant ? "0ms" : `calc(var(--mb-stagger) * ${order} / 8)`,
        }}
        data-mb-token={role}
        aria-hidden="true"
      >
        {/* Selection. Coral, which is one of the three structural jobs
            invariant 15 reserves for it: this is the selection rail, drawn
            round instead of straight. No Gaussian glow — the old
            `filter="url(#glow)"` was both a banned effect and a repaint. */}
        {selected && (
          <circle
            r={radius + 7}
            fill="none"
            stroke="var(--mb-coral)"
            strokeWidth={2.5}
            style={HAIRLINE}
          />
        )}

        {/* Drag. A second, dashed ring rather than a colour change, so the two
            states can coexist and both survive greyscale. */}
        {dragging && (
          <circle
            r={radius + 12}
            fill="none"
            stroke="var(--mb-court-line-strong)"
            strokeWidth={1}
            strokeDasharray="5 4"
            strokeOpacity={0.55}
            style={HAIRLINE}
          />
        )}

        {/* The role mark: gold for the setter, a second hairline for the
            libero. A shape, not a hue — see `roleTokens.ts`. */}
        {token.ring && (
          <circle
            r={radius + token.ring.gap}
            fill="none"
            stroke={token.ring.tone}
            strokeWidth={2}
            style={HAIRLINE}
          />
        )}

        <circle
          r={radius}
          fill={token.fill}
          stroke={token.edge}
          strokeWidth={2}
          style={{
            ...HAIRLINE,
            transform: dragging ? "scale(1.06)" : undefined,
            transition: instant ? "none" : "transform var(--mb-dur-fast) var(--mb-ease-out)",
          }}
        />

        <text
          className="matchbook-display select-none"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ ...LETTERFORM, fill: token.ink, pointerEvents: "none" }}
        >
          {label}
        </text>

        {(caption || zone) && (
          <text
            className="matchbook-display select-none"
            textAnchor="middle"
            y={radius + 15}
            style={{ ...CAPTION, pointerEvents: "none" }}
          >
            {caption ?? `Z${zone}`}
          </text>
        )}
      </g>
    );
  }
);
MbPlayerToken.displayName = "MbPlayerToken";

/* ---------------------------------------------------------- MbPlayerTarget */

/**
 * THE TARGET — the real control.
 *
 * A native `<button>` positioned over the drawing at the token's own
 * coordinates, at least `TOKEN_HIT_PX` across whatever the disc is drawn at.
 * The old node was 31x42 to 35x44 of hit area on the primary interaction object
 * of the whole tool.
 *
 * `left`/`top` carry no transition on purpose. They are layout properties and
 * invariant 40 allows only `transform` and `opacity` to animate — and it costs
 * nothing here, because the button is invisible: the eye follows the SVG disc,
 * which eases, while its target snaps. During a drag both are instant anyway.
 */
export const MbPlayerTarget = ({
  role,
  label,
  zone,
  row,
  x,
  y,
  state = "idle",
  ariaLabel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClick,
  onKeyDown,
  draggable = false,
}: {
  role: PlayerRole;
  label: string;
  zone?: CourtZone;
  row: "front" | "back";
  /** Centre, in the fixed SVG user space — the same numbers the token takes. */
  x: number;
  y: number;
  state?: MbPlayerTokenState;
  ariaLabel?: string;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLButtonElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  draggable?: boolean;
}) => {
  const token = roleToken(role, row === "back");
  const position = courtPercent(x, y);
  const name =
    ariaLabel ??
    `${PLAYER_INFO[role]?.fullName ?? label}, ${token.rowWord}${
      zone ? `, zone ${zone}` : ""
    }`;

  return (
    <button
      type="button"
      aria-label={name}
      aria-pressed={state === "selected" || state === "arrow-source"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="absolute rounded-full bg-transparent"
      style={{
        ...position,
        width: TOKEN_HIT_PX,
        height: TOKEN_HIT_PX,
        marginLeft: -TOKEN_HIT_PX / 2,
        marginTop: -TOKEN_HIT_PX / 2,
        touchAction: "none",
        cursor: draggable ? (state === "dragging" ? "grabbing" : "grab") : "pointer",
      }}
    />
  );
};

/* ------------------------------------------------------------- MbRoleChip */

/**
 * The token's inline cut — the legend rows, the arrow list, the formation
 * summary. Same three rules as the SVG disc, drawn in HTML so it can sit in a
 * table row without an SVG wrapper. 999px is sanctioned for it: the radius
 * vocabulary reserves the full round for discs and swatches, and this is the
 * disc.
 */
export const MbRoleChip = ({
  role,
  label,
  row,
  size = 34,
  className = "",
  children,
}: {
  role: PlayerRole;
  label?: string;
  row: "front" | "back";
  size?: number;
  className?: string;
  children?: ReactNode;
}) => {
  const style = roleChipStyle(role, row === "back");
  return (
    <span
      aria-hidden="true"
      className={`matchbook-display inline-flex shrink-0 items-center justify-center rounded-full border font-bold ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size <= 26 ? "0.6rem" : "0.72rem",
        letterSpacing: "0.02em",
        borderWidth: role === "S" ? 3 : 1,
        borderColor: role === "S" ? "var(--mb-gold)" : style.borderColor,
        background: style.background,
        color: style.color,
        // The libero's second circle. An `outline` rather than a `box-shadow`:
        // it draws outside the box without reserving space, and invariant 24
        // permits no shadow but `--mb-panel-shadow`.
        outline: role === "L" ? "1px solid var(--mb-court-line-strong)" : undefined,
        outlineOffset: role === "L" ? 2 : undefined,
      }}
    >
      {children ?? label ?? role}
    </span>
  );
};
