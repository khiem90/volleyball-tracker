import type { PlayerRole } from "./types";

/* ===========================================================================
   ROLE -> MATCHBOOK TOKENS

   `PLAYER_COLORS` (constants.ts) is a seven-hue map of raw `oklch(...)`
   literals and it was the PRIMARY identity channel on the court: seven discs,
   seven hues, the label repeated on top. That fails invariant 10 (no hardcoded
   colour, including inside SVG) and invariant 13 (information never carried by
   colour alone) at the same time — desaturate the old court and the only thing
   telling you a player is back row is a dashed blue ring that is itself a hue.

   This is the replacement. Identity is carried by the LETTERFORM (`S`, `OPP`,
   `MB2`), which was always there and was always the thing coaches read. What
   the tokens carry is the one fact the letterform cannot: which ROW the player
   is in, which is what the overlap rules are about.

     front row   solid navy disc, paper letterform          (dark in greyscale)
     back row    paper disc, navy edge, navy letterform      (light in greyscale)

   Two roles carry a second, non-colour mark on top of that:

     Setter      a detached gold ring — the system's "leader" mark, the same
                 job `--mb-gold` does on a crown or a rank rail. The setter is
                 the one player whose position changes what the rotation MEANS
                 (front-row setter = 2 attackers), so it earns a mark.
     Libero      a plum disc AND a detached hairline ring. Plum is the libero's
                 one categorical job in this system, but plum and navy are close
                 enough in luminance to be a colour-alone failure on their own,
                 so the ring is what actually reads: a substituted player is the
                 only token drawn with a second circle around it.

   `PLAYER_COLORS` is deliberately not imported here and is no longer read by
   anything that renders. It stays in `constants.ts` because `PlayerInfo.color`
   is part of a published type and `rotations.ts` still fills it; nothing paints
   with it.
   =========================================================================== */

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
  ring: { tone: string; gap: number } | null;
  /** Long form for the accessible name — "front row" / "back row". */
  rowWord: "front row" | "back row";
}

const PAPER = "var(--mb-court-fill)";
const NAVY = "var(--mb-court-line-strong)";
const PLUM = "var(--mb-plum)";
const GOLD = "var(--mb-gold)";

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
    return {
      fill: PLUM,
      ink: PAPER,
      edge: NAVY,
      // Two circles: the mark that says "this is a substitution", not a hue.
      ring: { tone: NAVY, gap: 5 },
      rowWord: "back row",
    };
  }

  const base = isBackRow
    ? { fill: PAPER, ink: NAVY, edge: NAVY }
    : { fill: NAVY, ink: PAPER, edge: NAVY };

  return {
    ...base,
    ring: role === "S" ? { tone: GOLD, gap: 5 } : null,
    rowWord,
  };
};

/**
 * The chip cut of the same token, for the legend and the arrow list — the
 * non-SVG variant the charter calls `MbRoleChip`. Identical rules; separated so
 * a future change to the disc recipe cannot make the legend disagree with the
 * court, which is exactly how the old legend ended up drawing a hue the court
 * had already stopped using.
 */
export const roleChipStyle = (
  role: PlayerRole,
  isBackRow: boolean
): { background: string; color: string; borderColor: string } => {
  const token = roleToken(role, isBackRow);
  return { background: token.fill, color: token.ink, borderColor: token.edge };
};
