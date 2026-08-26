import type { PlayerRole } from "./types";

/* ===========================================================================
   ROLE -> MATCHBOOK TOKENS

   Identity must never be carried by hue alone — desaturated, a
   seven-hue court tells you nothing. Identity is carried by the LETTERFORM (`S`, `OPP`,
   `MB2`), which was always there and was always the thing coaches read. What
   the tokens carry is the one fact the letterform cannot: which ROW the player
   is in, which is what the overlap rules are about.

     front row   solid navy disc, paper letterform          (dark in greyscale)
     back row    paper disc, navy edge, navy letterform      (light in greyscale)

   Two roles carry a second mark on top of that, and — this is the correction —
   both of them are a RING, told apart by whether it is SOLID or DASHED:

     Setter      a solid detached ring.
     Libero      a dashed detached ring. A dash is the drawing convention for
                 "not permanently part of this", which is exactly what a
                 substituted player is.

   The setter's ring draws in `--mb-gold-ink`, not `--mb-gold`: the detached
   ring sits OUTSIDE the disc, so its ground is always `--mb-court-fill`,
   where raw gold fails the 3:1 non-text floor. The libero is an ordinary
   back-row disc — it IS back row by rule — with the substitution carried
   entirely by the dashed ring.

   `PLAYER_COLORS` is deliberately not imported here and is no longer read by
   anything that renders. It stays in `constants.ts` because `PlayerInfo.color`
   is part of a published type and `rotations.ts` still fills it; nothing paints
   with it.
   =========================================================================== */

/** A detached ring outside the disc — the second, shape-borne channel. */
export interface MbRoleRing {
  tone: string;
  gap: number;
  /** SVG dash pattern, or `null` for a solid ring. */
  dash: string | null;
}

/** How one token is drawn. Every value is a `--mb-*` reference. */
export interface MbRoleToken {
  /** Disc fill. */
  fill: string;
  /** Letterform ink over that fill. */
  ink: string;
  /** Disc edge. */
  edge: string;
  /**
   * A detached ring outside the disc, or `null`. The second channel: it is a
   * shape, so it survives desaturation and it survives a monochrome printout.
   */
  ring: MbRoleRing | null;
  /** Long form for the accessible name — "front row" / "back row". */
  rowWord: "front row" | "back row";
}

const PAPER = "var(--mb-court-fill)";
const NAVY = "var(--mb-court-line-strong)";
/* Gold as INK, not as a mark on navy. Measured on --mb-court-fill (#fffaf1):
   --mb-gold 2.15:1 (fails the 3:1 non-text floor), --mb-gold-ink 5.59:1. */
const GOLD_INK = "var(--mb-gold-ink)";

/** The libero's ring pattern. Distinct from the drag ring's `2 5` dotting. */
export const LIBERO_RING_DASH = "5 4";

/**
 * The token for one role in one row.
 *
 * `isBackRow` is passed in rather than derived because the row is a property of
 * the ROTATION, not of the role: `MB1` is front row in three rotations and back
 * row in the other three, and the whole point of the diagram is that this
 * changes.
 */
export const roleToken = (role: PlayerRole, isBackRow: boolean): MbRoleToken => {
  const rowWord = isBackRow ? "back row" : "front row";

  if (role === "L") {
    // The libero is back row by rule, so it takes the back-row recipe exactly —
    // the legend says "hollow disc — back row" and now the drawing agrees.
    return {
      fill: PAPER,
      ink: NAVY,
      edge: NAVY,
      ring: { tone: NAVY, gap: 5, dash: LIBERO_RING_DASH },
      rowWord: "back row",
    };
  }

  const base = isBackRow
    ? { fill: PAPER, ink: NAVY, edge: NAVY }
    : { fill: NAVY, ink: PAPER, edge: NAVY };

  return {
    ...base,
    ring: role === "S" ? { tone: GOLD_INK, gap: 5, dash: null } : null,
    rowWord,
  };
};

/**
 * The chip cut of the same token, for the legend and the arrow list (the
 * non-SVG `MbRoleChip`). Identical rules; separated so a change to the disc
 * recipe cannot make the legend disagree with the court.
 *
 * The ring is returned as an `outline` because an outline draws OUTSIDE the
 * border box without reserving space — the HTML equivalent of the SVG's
 * detached circle — and no shadow but `--mb-panel-shadow` is permitted.
 */
export const roleChipStyle = (
  role: PlayerRole,
  isBackRow: boolean
): {
  background: string;
  color: string;
  borderColor: string;
  outline?: string;
  outlineOffset?: number;
} => {
  const token = roleToken(role, isBackRow);
  const base = {
    background: token.fill,
    color: token.ink,
    borderColor: token.edge,
  };
  if (!token.ring) return base;
  return {
    ...base,
    outline: `2px ${token.ring.dash ? "dashed" : "solid"} ${token.ring.tone}`,
    outlineOffset: 2,
  };
};
