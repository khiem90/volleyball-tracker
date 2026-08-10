import { COURT_SVG } from "@/lib/volleyball/constants";

/* ===========================================================================
   COURT GEOMETRY — the one place the numbers live

   THE INVARIANT THAT MATTERS: the normalised 0..1 coordinate space is
   load-bearing. Every saved formation in Firestore is a bag of `{x, y}` in
   that space; `toSvgCoords` / `fromSvgCoords` in `lib/volleyball/coordinateUtils`
   map it into a FIXED 480x380 user space (400x300 court + 40 padding), and
   those two functions are NOT touched by this module. Changing them silently
   re-draws every stored formation, which is why the charter (§2.3, W7
   acceptance 1) spells it out.

   What this module does change is (a) the rendered viewBox — the window onto
   that fixed space — and (b) the drawn radii, and it derives the arrow-shorten
   constants from `NODE_RADIUS` instead of the four magic numbers that were
   scattered across `MovementArrow.tsx` (28/32) and `ArrowLayer.tsx` (28/12).
   The derivations below reproduce all four exactly at `NODE_RADIUS = 24`, so
   this is a refactor with a zero-pixel diff on the arrows and a provable one on
   the coordinates.
   =========================================================================== */

const { WIDTH, HEIGHT, PADDING, NODE_RADIUS, ATTACK_LINE_Y } = COURT_SVG;

/** The court rectangle inside the fixed user space that `toSvgCoords` writes into. */
export const COURT_RECT = {
  x: PADDING,
  y: PADDING,
  w: WIDTH,
  h: HEIGHT,
  right: PADDING + WIDTH,
  bottom: PADDING + HEIGHT,
} as const;

/**
 * The rendered window — the ONE thing the charter lets this module change about
 * the geometry (W7 acceptance 1). The legacy window was `0 0 480 380`: the full
 * 40-unit padding on every side.
 *
 * Most of that padding is spent and cannot be cropped. A token dragged to
 * `x = 0` centres ON the sideline, so its disc overhangs by `TOKEN_RADIUS`, the
 * setter's gold ring by `TOKEN_RADIUS + TOKEN_RING_GAP`, and at `y = 0` the zone
 * caption sits `TOKEN_RADIUS + 15` below the end line. What IS slack is the
 * 8 units the drawn marks never reach.
 *
 * Cropping it is worth doing because of what the crop buys at 390px. The court
 * renders ~356 CSS px wide; against 480 units that is a scale of 0.742, against
 * 464 it is 0.767. In the traditional receive frame the outside hitter and the
 * libero stand 80 units apart, and their 52px targets measured **7.3px** apart
 * at the old scale — under the 8px separation floor, with no target size that
 * could fix it, because two 52px circles centred 59px apart must overlap. At
 * 0.767 the same two centres are 61.3px apart and the gap is 9.3px. The crop is
 * what makes the touch floor and the separation floor satisfiable at once.
 *
 * Stated here as data rather than interpolated at each call site so the two
 * courts (view and edit) cannot drift apart the way `VolleyballCourt.tsx` and
 * `CourtGrid.tsx` did.
 */
export const COURT_VIEWBOX = {
  x: 8,
  y: 2,
  w: WIDTH + PADDING * 2 - 16,
  h: HEIGHT + PADDING * 2 - 2,
} as const;

export const COURT_VIEWBOX_ATTR = `${COURT_VIEWBOX.x} ${COURT_VIEWBOX.y} ${COURT_VIEWBOX.w} ${COURT_VIEWBOX.h}`;

/** Aspect of the rendered window, so a caller can reserve space and hold CLS at 0. */
export const COURT_ASPECT = `${COURT_VIEWBOX.w} / ${COURT_VIEWBOX.h}`;

/** SVG y of the 3 m attack line. */
export const ATTACK_LINE_SVG_Y = PADDING + (1 - ATTACK_LINE_Y) * HEIGHT;

/* ------------------------------------------------------------------- radii */

/** The drawn disc. */
export const TOKEN_RADIUS = NODE_RADIUS;

/** The compact disc, for the read-only court on a phone where six labels compete. */
export const TOKEN_RADIUS_SM = NODE_RADIUS - 3;

/**
 * The transparent target, in CSS PIXELS rather than user units.
 *
 * The charter requires ≥52 CSS px of real hit area on a player token whatever
 * the disc is drawn at. Expressing it in user units made it a function of the
 * viewport — 36 units is 53px at 390 and 99px at 1440, which is far more target
 * than a mouse needs and starts swallowing neighbouring tokens on a wide
 * screen. `MbPlayerTarget` is an HTML button, so the number can simply be the
 * requirement: 52, everywhere.
 */
export const TOKEN_HIT_PX = 52;

/** Detached ring offset for the setter's gold mark and the libero's second circle. */
export const TOKEN_RING_GAP = 5;

/* ------------------------------------------------------------------ arrows */

/**
 * Both ends of a movement arrow are pulled back so the line does not disappear
 * under a disc. `START` clears the source token; `END` clears the destination
 * token; `END_FREE` clears only the arrowhead, for an editor arrow whose
 * endpoint is a bare court position with no token on it.
 *
 * At `NODE_RADIUS = 24` these evaluate to 28 / 32 / 12 — the exact literals
 * they replace.
 */
export const ARROW_SHORTEN_START = NODE_RADIUS + 4;
export const ARROW_SHORTEN_END = NODE_RADIUS + 8;
export const ARROW_SHORTEN_END_FREE = NODE_RADIUS / 2;

/** Shortest arrow worth drawing — under this the head and tail would overlap. */
export const ARROW_MIN_LENGTH = ARROW_SHORTEN_START + ARROW_SHORTEN_END_FREE;

export interface CourtPoint {
  x: number;
  y: number;
}

/**
 * Pull a segment back at both ends. Returns `null` when the pull would invert
 * the line, which is the case the old code hit whenever two players were
 * stacked and drew a backwards arrowhead.
 */
export const shortenSegment = (
  from: CourtPoint,
  to: CourtPoint,
  startPull: number,
  endPull: number
): { x1: number; y1: number; x2: number; y2: number } | null => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= startPull + endPull) return null;
  const ux = dx / length;
  const uy = dy / length;
  return {
    x1: from.x + ux * startPull,
    y1: from.y + uy * startPull,
    x2: to.x - ux * endPull,
    y2: to.y - uy * endPull,
  };
};

/** Clamp a normalised position back into the court. */
export const clampCourtPosition = (position: CourtPoint): CourtPoint => ({
  x: Math.max(0, Math.min(1, position.x)),
  y: Math.max(0, Math.min(1, position.y)),
});
