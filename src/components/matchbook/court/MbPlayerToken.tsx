"use client";

import {
  memo,
  useCallback,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
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
   back). Setter and libero add a detached ring, solid and dashed respectively.
   Nothing here is carried by hue alone, which is the whole difference from the
   seven-hue map it replaces — see `lib/volleyball/roleTokens.ts`.

   MOTION. The token is positioned by a CSS `transform` on its group and moves
   by transitioning that transform, so a rotation change is one composited
   property on seven elements. There is no spring and no framer-motion
   (invariants 40, 41, 51). While a finger is down, `instant` switches the
   transition off entirely: a drag that eases toward the pointer feels like lag,
   and the brief's whole ask for this screen is that dragging feel exact.

   THE PRESS, in two layers. Before this the target was a transparent
   `<button>` carrying no `mb-*` class, so the only rule that reached it was the
   legacy `button:active { transform: scale(0.98) }` — applied to a fully
   transparent element, which is zero visible feedback on the screen's
   most-touched object.

     1. The TARGET carries `.mb-row-hover`, the system's flush press recipe. It
        is CSS, so the ink lands on the next frame whatever the state update
        behind the tap costs — and on this screen the worst measured `click` is
        512ms at 4x CPU throttle, so a press drawn from React state would have
        arrived half a second late. This is the feedback that matters.
     2. The drawn TOKEN additionally takes the RAISED recipe — a 1px sink,
        landing in zero time, easing back over `--mb-dur-fast` — because a token
        is a counter sitting ON the diagram, not a row that IS the page plane.
        It rides a React prop and is therefore the slower of the two; it is a
        refinement on top of the ink, never the only signal.

   The sink lives on an INNER group. The outer group carries the position and a
   `--mb-stagger` rotation-ordered settle delay; putting the press on the outer
   group would make the release wait out that delay and feel mushy.

   `--mb-stagger` fractions give the six tokens a rotation-ordered settle so the
   eye can follow the clockwise move. No literal duration appears here; every
   number resolves to a motion token (invariant 40).
   =========================================================================== */

export type MbPlayerTokenState = "idle" | "selected" | "dragging" | "arrow-source";

export interface MbPlayerTokenProps {
  role: PlayerRole;
  /** Rendered letterform. Usually the role, but the libero substitutes in place. */
  label: string;
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
  /**
   * Rendered under the disc when set — the editor's live x,y readout.
   *
   * The read-only court passes nothing. It used to print `Z{zone}`, which said
   * the zone a THIRD time (the cell already carries a 36-unit watermark and the
   * On Court ledger carries a `Zone n` column) and, being 15 units below a disc
   * that constraint lines and arrows run through, was overlapped by a stroke in
   * 10 of the 12 rotation x mode states.
   */
  caption?: string;
  /** Held down. Draws the raised recipe's 1px sink. */
  pressed?: boolean;
}

/* Both literals are named steps of the display scale (design language §2.1):
   19.2px = 1.2rem `display/stat-sm`, 11.52px = 0.72rem. They were 17 and 12,
   which are between steps and were counted as off-scale sizes (rubric 1.2). */
const LETTERFORM: CSSProperties = {
  fontSize: 19.2,
  fontWeight: 700,
  letterSpacing: "0.02em",
};

const CAPTION: CSSProperties = {
  fontSize: 11.52,
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
    row,
    x,
    y,
    state = "idle",
    size = "md",
    instant = false,
    order = 0,
    caption,
    pressed = false,
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
        <g
          /* THE PRESS — raised recipe. The sink is a transform, it lands in 0s
             and eases back over --mb-dur-fast, exactly as `.mb-btn:active`
             does. `--mb-press-shift` is the same token the CSS recipe reads. */
          style={{
            transform: pressed ? "translateY(var(--mb-press-shift))" : undefined,
            transition: "transform var(--mb-dur-fast) var(--mb-ease-out)",
            transitionDuration: pressed ? "0s" : undefined,
          }}
        >
          {/* Selection. Coral, which is one of the three structural jobs
              invariant 15 reserves for it: this is the selection rail, drawn
              round instead of straight. No Gaussian glow — the old
              `filter="url(#glow)"` was both a banned effect and a repaint. */}
          {selected && (
            <circle
              r={radius + 10}
              fill="none"
              stroke="var(--mb-coral)"
              strokeWidth={2.5}
              style={HAIRLINE}
            />
          )}

          {/* Drag. A third ring, dotted rather than dashed so it cannot be read
              as the libero's mark, at a radius outside both. */}
          {dragging && (
            <circle
              r={radius + 15}
              fill="none"
              stroke="var(--mb-court-line-strong)"
              strokeWidth={1}
              strokeDasharray="2 5"
              strokeOpacity={0.55}
              style={HAIRLINE}
            />
          )}

          {/* The role mark: a SOLID ring for the setter, a DASHED one for the
              libero. A shape, not a hue — see `roleTokens.ts`. */}
          {token.ring && (
            <circle
              r={radius + token.ring.gap}
              fill="none"
              stroke={token.ring.tone}
              strokeWidth={2}
              strokeDasharray={token.ring.dash ?? undefined}
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

          {caption && (
            <text
              className="matchbook-display select-none"
              textAnchor="middle"
              y={radius + 15}
              style={{ ...CAPTION, pointerEvents: "none" }}
            >
              {caption}
            </text>
          )}
        </g>
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
 *
 * The press is reported UPWARD through `onPressedChange` so the drawn token can
 * take the sink; the target itself inks at `--mb-tint-press` as well, because a
 * thumb covering a 37px disc hides the sink and not the halo around it.
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
  onPressedChange,
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
  /** Fires true on pointer/key down and false on up, cancel or blur. */
  onPressedChange?: (pressed: boolean) => void;
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

  const press = useCallback(
    (next: boolean) => onPressedChange?.(next),
    [onPressedChange]
  );

  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      aria-pressed={state === "selected" || state === "arrow-source"}
      onPointerDown={(event) => {
        press(true);
        onPointerDown?.(event);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        press(false);
        onPointerUp?.(event);
      }}
      onPointerCancel={(event) => {
        press(false);
        onPointerUp?.(event);
      }}
      onPointerLeave={() => press(false)}
      onBlur={() => press(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") press(true);
        onKeyDown?.(event);
      }}
      onKeyUp={() => press(false)}
      onClick={onClick}
      /* `.mb-row-hover` is the system's FLUSH press recipe and it is CSS, not
         React: `:active` inks at `--mb-tint-press` in 0s and eases back over
         `--mb-dur-fast`, so the feedback lands on the next frame no matter how
         long the state update behind the tap takes. That matters here — the
         worst measured `click` on this screen is 512ms at 4x CPU throttle, and
         a press drawn from React state would have been 512ms late. Round,
         because the button is; the hover wash also finally shows a mouse user
         where the 52px target actually is. 999px in the literal the radius
         vocabulary declares, not `rounded-full` — that utility compiles to
         `calc(infinity * 1px)` and measures 3.35544e+07px, a second spelling of
         the same round in the D2 census. This one is a bare hit area, so it
         takes the literal rather than `.mb-icon-disc`, which would draw a navy
         edge around an element that must stay invisible.

         Both numbers here are NAMED EXEMPTIONS in design language §3.3, not
         strays: the round is outside the four-use ink budget because it never
         paints (invisible hit-extension geometry), and the 52px box is target
         geometry, not a control height — 52 is the charter's floor for a
         court token, and it must not migrate onto the {44,48,56} ladder or
         the ladder acquires a rung that exists for one screen. */
      className="mb-row-hover absolute rounded-[999px]"
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
 * disc — so it takes `.mb-icon-disc`, the class that *names* that round, rather
 * than `rounded-full`, which compiles to `calc(infinity * 1px)` and measures as
 * a second round value. The class also supplies the inline-flex centring, the
 * no-shrink and the solid border style; width, border width, border colour,
 * background, ink and the detached ring all still come from `roleChipStyle`
 * below, which outranks it.
 *
 * The setter's and libero's detached rings come from `roleChipStyle`, which
 * derives them from the same `roleToken` the court draws, as an `outline` —
 * outside the border box, reserving no space. The chip used to draw the setter
 * as a 3px `--mb-gold` BORDER, which is a different mark from the court's
 * detached ring and measured 2.15:1 on paper.
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
      className={`matchbook-display mb-icon-disc font-bold ${className}`}
      style={{
        width: size,
        height: size,
        /* 0.62rem, not 0.6rem: `display/badge-label` is 0.6rem/700 at 0.22em
           and the masthead prints one on this very screen, so a 0.6rem/700
           chip at any other tracking would be a collision (rubric 1.3).

           The TRACKING follows the size, because the ladder is per (size,
           weight) and this chip renders at two sizes: 0.62rem/700 is
           `mb-track-nav`'s 0.08em, 0.72rem is `mb-track-link`'s 0.04em. A
           single 0.08em for both put the larger disc on a rung 0.72rem does not
           have, which measured as 12 nodes at 0.08em against 169 at 0.04em.

           Inline rather than a class because the disc also sets its size, ink
           and ring from `roleChipStyle` in the same object, and `textIndent`
           has to move with it: it cancels the trailing letter-space so a
           centred letterform stays centred in a fixed disc — the same reason
           `globals.css` declares `letter-spacing: normal` on the numerals. */
        fontSize: size <= 26 ? "0.62rem" : "0.72rem",
        letterSpacing: size <= 26 ? "0.08em" : "0.04em",
        textIndent: size <= 26 ? "0.08em" : "0.04em",
        borderWidth: 1,
        borderColor: style.borderColor,
        background: style.background,
        color: style.color,
        outline: style.outline,
        outlineOffset: style.outlineOffset,
      }}
    >
      {children ?? label ?? role}
    </span>
  );
};
