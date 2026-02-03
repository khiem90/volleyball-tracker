import type {
  RotationNumber,
  PlayerRole,
  CourtZone,
  CourtPosition,
  PlayerPosition,
  GameMode,
  FormationType,
  MovementArrow,
} from './types';
import { PLAYER_COLORS, ZONE_POSITIONS, BACK_ROW_ZONES } from './constants';

/**
 * 5-1 Rotation Chart: Which role is in which zone for each rotation
 *
 * This follows the standard 5-1 rotation pattern where:
 * - Rotation 1: Setter serves from Zone 1
 * - Players rotate CLOCKWISE after winning serve (Z2→Z1→Z6→Z5→Z4→Z3→Z2)
 * - R1-R3: Setter in back row (zones 1, 6, 5) = 3 front-row attackers
 * - R4-R6: Setter in front row (zones 4, 3, 2) = 2 front-row attackers
 *
 * Source: Gold Medal Squared, FIVB Official Rules
 */
export const ROTATION_CHART: Record<RotationNumber, Record<CourtZone, PlayerRole>> = {
  // R1: Setter serves from Zone 1 (back right)
  1: { 1: 'S', 2: 'OH1', 3: 'MB2', 4: 'OPP', 5: 'OH2', 6: 'MB1' },
  // R2: After 1 clockwise rotation - Setter in Zone 6 (back middle)
  2: { 1: 'OH1', 2: 'MB2', 3: 'OPP', 4: 'OH2', 5: 'MB1', 6: 'S' },
  // R3: After 2 clockwise rotations - Setter in Zone 5 (back left)
  3: { 1: 'MB2', 2: 'OPP', 3: 'OH2', 4: 'MB1', 5: 'S', 6: 'OH1' },
  // R4: After 3 clockwise rotations - Setter in Zone 4 (front left)
  4: { 1: 'OPP', 2: 'OH2', 3: 'MB1', 4: 'S', 5: 'OH1', 6: 'MB2' },
  // R5: After 4 clockwise rotations - Setter in Zone 3 (front middle)
  5: { 1: 'OH2', 2: 'MB1', 3: 'S', 4: 'OH1', 5: 'MB2', 6: 'OPP' },
  // R6: After 5 clockwise rotations - Setter in Zone 2 (front right)
  6: { 1: 'MB1', 2: 'S', 3: 'OH1', 4: 'MB2', 5: 'OPP', 6: 'OH2' },
};

/**
 * Serve-receive positions: Adjusted positions to optimize for receiving
 * while maintaining overlap legality.
 *
 * Traditional 3-passer formation: OH1, OH2, and Libero/MB pass
 * Setter releases to position 2.5, MBs at net
 */
export const SERVE_RECEIVE_ADJUSTMENTS: Record<
  FormationType,
  Record<RotationNumber, Partial<Record<PlayerRole, CourtPosition>>>
> = {
  /**
   * Traditional (3-Passer W Formation)
   * Standard formation with OH1, OH2, and Libero passing in a W-shape.
   * Front-row non-passers positioned at net.
   * Based on: Gold Medal Squared, Volleyball Vault, JVA Education
   */
  traditional: {
    // R1: S in Z1, OH1 in Z2, MB2 in Z3, OPP in Z4, OH2 in Z5, MB1 in Z6
    1: {
      S: { x: 0.82, y: 0.40 },   // Back-right, releasing toward net
      OH1: { x: 0.72, y: 0.65 }, // Right-front area, ready to pass or attack
      MB2: { x: 0.50, y: 0.85 }, // At net center (front row)
      OPP: { x: 0.20, y: 0.85 }, // At net left (front row)
      OH2: { x: 0.35, y: 0.30 }, // Back-left, passing
      MB1: { x: 0.55, y: 0.25 }, // Back-center (Libero replaces - primary passer)
    },
    // R2: S in Z6, OH1 in Z1, MB2 in Z2, OPP in Z3, OH2 in Z4, MB1 in Z5
    2: {
      S: { x: 0.55, y: 0.50 },   // Center, releasing right toward net
      OH1: { x: 0.78, y: 0.30 }, // Back-right, passing
      MB2: { x: 0.80, y: 0.82 }, // At net right (front row)
      OPP: { x: 0.50, y: 0.85 }, // At net center (front row)
      OH2: { x: 0.20, y: 0.82 }, // At net left (front row)
      MB1: { x: 0.35, y: 0.28 }, // Back-left (Libero replaces)
    },
    // R3: S in Z5, OH1 in Z6, MB2 in Z1, OPP in Z2, OH2 in Z3, MB1 in Z4
    3: {
      S: { x: 0.25, y: 0.45 },   // Back-left, releasing toward net
      OH1: { x: 0.55, y: 0.30 }, // Back-center, passing
      MB2: { x: 0.80, y: 0.28 }, // Back-right (Libero replaces)
      OPP: { x: 0.78, y: 0.82 }, // At net right (front row)
      OH2: { x: 0.50, y: 0.85 }, // At net center (front row)
      MB1: { x: 0.20, y: 0.80 }, // At net left (front row)
    },
    // R4: S in Z4, OH1 in Z5, MB2 in Z6, OPP in Z1, OH2 in Z2, MB1 in Z3
    4: {
      S: { x: 0.20, y: 0.78 },   // Front-left, releasing to right
      OH1: { x: 0.25, y: 0.32 }, // Back-left, passing
      MB2: { x: 0.55, y: 0.25 }, // Back-center (Libero replaces)
      OPP: { x: 0.80, y: 0.30 }, // Back-right
      OH2: { x: 0.78, y: 0.82 }, // At net right (front row)
      MB1: { x: 0.50, y: 0.85 }, // At net center (front row)
    },
    // R5: S in Z3, OH1 in Z4, MB2 in Z5, OPP in Z6, OH2 in Z1, MB1 in Z2
    5: {
      S: { x: 0.55, y: 0.75 },   // Front-center, releasing right
      OH1: { x: 0.20, y: 0.82 }, // At net left (front row)
      MB2: { x: 0.22, y: 0.30 }, // Back-left (Libero replaces)
      OPP: { x: 0.50, y: 0.28 }, // Back-center
      OH2: { x: 0.80, y: 0.35 }, // Back-right, passing
      MB1: { x: 0.78, y: 0.85 }, // At net right (front row)
    },
    // R6: S in Z2, OH1 in Z3, MB2 in Z4, OPP in Z5, OH2 in Z6, MB1 in Z1
    6: {
      S: { x: 0.78, y: 0.75 },   // Front-right, ready to set
      OH1: { x: 0.50, y: 0.82 }, // At net center (front row)
      MB2: { x: 0.20, y: 0.85 }, // At net left (front row)
      OPP: { x: 0.22, y: 0.30 }, // Back-left
      OH2: { x: 0.50, y: 0.28 }, // Back-center, passing
      MB1: { x: 0.80, y: 0.25 }, // Back-right (Libero replaces)
    },
  },

  /**
   * Stack Formation (Oppo Runs)
   * Players grouped to one side for cleaner attack approach lanes.
   * Used by USA Women's Olympic team.
   * Based on: Coaching Volleyball Substack, Gold Medal Squared
   */
  stack: {
    // R1: Front row stacks left, back row groups right with S
    1: {
      S: { x: 0.85, y: 0.22 },   // Far back-right corner
      OH1: { x: 0.75, y: 0.35 }, // Back-right area with S (stacked)
      MB2: { x: 0.50, y: 0.82 }, // At net center
      OPP: { x: 0.22, y: 0.82 }, // At net left
      OH2: { x: 0.20, y: 0.30 }, // Back-left, passing
      MB1: { x: 0.55, y: 0.28 }, // Back-center (Libero - primary passer)
    },
    // R2: Similar positioning with setter releasing
    2: {
      S: { x: 0.55, y: 0.45 },   // Center, releasing right
      OH1: { x: 0.78, y: 0.32 }, // Back-right, passing
      MB2: { x: 0.80, y: 0.80 }, // At net right
      OPP: { x: 0.50, y: 0.82 }, // At net center
      OH2: { x: 0.22, y: 0.78 }, // At net left
      MB1: { x: 0.35, y: 0.30 }, // Back-left (Libero)
    },
    // R3: Setter releases from back-left
    3: {
      S: { x: 0.22, y: 0.25 },   // Far back-left corner
      OH1: { x: 0.50, y: 0.32 }, // Back-center, passing
      MB2: { x: 0.78, y: 0.30 }, // Back-right (Libero)
      OPP: { x: 0.80, y: 0.80 }, // At net right
      OH2: { x: 0.50, y: 0.82 }, // At net center
      MB1: { x: 0.25, y: 0.78 }, // At net left
    },
    // R4: Setter and MB stacked at front-left
    4: {
      S: { x: 0.18, y: 0.80 },   // Front-left at net
      OH1: { x: 0.22, y: 0.35 }, // Back-left, passing
      MB2: { x: 0.55, y: 0.28 }, // Back-center (Libero)
      OPP: { x: 0.80, y: 0.32 }, // Back-right
      OH2: { x: 0.80, y: 0.80 }, // At net right
      MB1: { x: 0.45, y: 0.82 }, // At net center (stacked with S)
    },
    // R5: Setter at front-center
    5: {
      S: { x: 0.55, y: 0.72 },   // Front-center
      OH1: { x: 0.22, y: 0.80 }, // At net left
      MB2: { x: 0.25, y: 0.32 }, // Back-left (Libero)
      OPP: { x: 0.50, y: 0.30 }, // Back-center
      OH2: { x: 0.78, y: 0.35 }, // Back-right, passing
      MB1: { x: 0.80, y: 0.82 }, // At net right
    },
    // R6: Setter at front-right
    6: {
      S: { x: 0.80, y: 0.72 },   // Front-right at net
      OH1: { x: 0.50, y: 0.80 }, // At net center
      MB2: { x: 0.22, y: 0.82 }, // At net left
      OPP: { x: 0.20, y: 0.32 }, // Back-left
      OH2: { x: 0.50, y: 0.30 }, // Back-center, passing
      MB1: { x: 0.78, y: 0.28 }, // Back-right (Libero)
    },
  },

  /**
   * Spread Formation
   * Wider positioning for better defensive coverage against tough servers.
   * 15-20% wider spacing than traditional.
   */
  spread: {
    1: {
      S: { x: 0.85, y: 0.38 },
      OH1: { x: 0.75, y: 0.62 },
      MB2: { x: 0.50, y: 0.88 },
      OPP: { x: 0.15, y: 0.88 },
      OH2: { x: 0.30, y: 0.25 },
      MB1: { x: 0.58, y: 0.20 },
    },
    2: {
      S: { x: 0.55, y: 0.48 },
      OH1: { x: 0.82, y: 0.25 },
      MB2: { x: 0.85, y: 0.85 },
      OPP: { x: 0.50, y: 0.88 },
      OH2: { x: 0.15, y: 0.85 },
      MB1: { x: 0.30, y: 0.22 },
    },
    3: {
      S: { x: 0.20, y: 0.42 },
      OH1: { x: 0.55, y: 0.25 },
      MB2: { x: 0.85, y: 0.22 },
      OPP: { x: 0.82, y: 0.85 },
      OH2: { x: 0.50, y: 0.88 },
      MB1: { x: 0.15, y: 0.82 },
    },
    4: {
      S: { x: 0.15, y: 0.80 },
      OH1: { x: 0.20, y: 0.28 },
      MB2: { x: 0.55, y: 0.20 },
      OPP: { x: 0.85, y: 0.25 },
      OH2: { x: 0.82, y: 0.85 },
      MB1: { x: 0.50, y: 0.88 },
    },
    5: {
      S: { x: 0.55, y: 0.78 },
      OH1: { x: 0.15, y: 0.85 },
      MB2: { x: 0.18, y: 0.25 },
      OPP: { x: 0.50, y: 0.22 },
      OH2: { x: 0.85, y: 0.30 },
      MB1: { x: 0.82, y: 0.88 },
    },
    6: {
      S: { x: 0.82, y: 0.78 },
      OH1: { x: 0.50, y: 0.85 },
      MB2: { x: 0.15, y: 0.88 },
      OPP: { x: 0.18, y: 0.25 },
      OH2: { x: 0.50, y: 0.22 },
      MB1: { x: 0.85, y: 0.20 },
    },
  },

  /**
   * Right Slant Formation
   * Passers shifted toward the right side of the court.
   * Good for protecting weak left-side passer or when opponents target left.
   */
  rightSlant: {
    1: {
      S: { x: 0.85, y: 0.40 },
      OH1: { x: 0.78, y: 0.65 },
      MB2: { x: 0.50, y: 0.85 },
      OPP: { x: 0.20, y: 0.85 },
      OH2: { x: 0.45, y: 0.30 }, // Shifted right +0.10
      MB1: { x: 0.65, y: 0.25 }, // Shifted right +0.10
    },
    2: {
      S: { x: 0.60, y: 0.50 },
      OH1: { x: 0.85, y: 0.30 }, // Shifted right
      MB2: { x: 0.80, y: 0.82 },
      OPP: { x: 0.50, y: 0.85 },
      OH2: { x: 0.20, y: 0.82 },
      MB1: { x: 0.45, y: 0.28 }, // Shifted right +0.10
    },
    3: {
      S: { x: 0.30, y: 0.45 },
      OH1: { x: 0.65, y: 0.30 }, // Shifted right +0.10
      MB2: { x: 0.85, y: 0.28 }, // Shifted right
      OPP: { x: 0.78, y: 0.82 },
      OH2: { x: 0.50, y: 0.85 },
      MB1: { x: 0.20, y: 0.80 },
    },
    4: {
      S: { x: 0.20, y: 0.78 },
      OH1: { x: 0.35, y: 0.32 }, // Shifted right +0.10
      MB2: { x: 0.65, y: 0.25 }, // Shifted right +0.10
      OPP: { x: 0.85, y: 0.30 },
      OH2: { x: 0.78, y: 0.82 },
      MB1: { x: 0.50, y: 0.85 },
    },
    5: {
      S: { x: 0.55, y: 0.75 },
      OH1: { x: 0.20, y: 0.82 },
      MB2: { x: 0.32, y: 0.30 }, // Shifted right +0.10
      OPP: { x: 0.60, y: 0.28 }, // Shifted right +0.10
      OH2: { x: 0.85, y: 0.35 },
      MB1: { x: 0.78, y: 0.85 },
    },
    6: {
      S: { x: 0.78, y: 0.75 },
      OH1: { x: 0.50, y: 0.82 },
      MB2: { x: 0.20, y: 0.85 },
      OPP: { x: 0.32, y: 0.30 }, // Shifted right +0.10
      OH2: { x: 0.60, y: 0.28 }, // Shifted right +0.10
      MB1: { x: 0.85, y: 0.25 },
    },
  },

  /**
   * Left Slant Formation
   * Passers shifted toward the left side of the court.
   * Good for protecting weak right-side passer or setting up outside hitter approach.
   */
  leftSlant: {
    1: {
      S: { x: 0.78, y: 0.40 },
      OH1: { x: 0.65, y: 0.65 },
      MB2: { x: 0.50, y: 0.85 },
      OPP: { x: 0.20, y: 0.85 },
      OH2: { x: 0.25, y: 0.30 }, // Shifted left -0.10
      MB1: { x: 0.45, y: 0.25 }, // Shifted left -0.10
    },
    2: {
      S: { x: 0.50, y: 0.50 },
      OH1: { x: 0.68, y: 0.30 }, // Shifted left -0.10
      MB2: { x: 0.80, y: 0.82 },
      OPP: { x: 0.50, y: 0.85 },
      OH2: { x: 0.20, y: 0.82 },
      MB1: { x: 0.25, y: 0.28 }, // Shifted left -0.10
    },
    3: {
      S: { x: 0.20, y: 0.45 },
      OH1: { x: 0.45, y: 0.30 }, // Shifted left -0.10
      MB2: { x: 0.70, y: 0.28 }, // Shifted left -0.10
      OPP: { x: 0.78, y: 0.82 },
      OH2: { x: 0.50, y: 0.85 },
      MB1: { x: 0.20, y: 0.80 },
    },
    4: {
      S: { x: 0.20, y: 0.78 },
      OH1: { x: 0.15, y: 0.32 }, // Shifted left -0.10
      MB2: { x: 0.45, y: 0.25 }, // Shifted left -0.10
      OPP: { x: 0.75, y: 0.30 },
      OH2: { x: 0.78, y: 0.82 },
      MB1: { x: 0.50, y: 0.85 },
    },
    5: {
      S: { x: 0.55, y: 0.75 },
      OH1: { x: 0.20, y: 0.82 },
      MB2: { x: 0.12, y: 0.30 }, // Shifted left -0.10
      OPP: { x: 0.40, y: 0.28 }, // Shifted left -0.10
      OH2: { x: 0.70, y: 0.35 },
      MB1: { x: 0.78, y: 0.85 },
    },
    6: {
      S: { x: 0.78, y: 0.75 },
      OH1: { x: 0.50, y: 0.82 },
      MB2: { x: 0.20, y: 0.85 },
      OPP: { x: 0.12, y: 0.30 }, // Shifted left -0.10
      OH2: { x: 0.40, y: 0.28 }, // Shifted left -0.10
      MB1: { x: 0.75, y: 0.25 },
    },
  },
};

/**
 * Target positions after serve (base/transition positions)
 * Used for movement arrows
 */
/**
 * Target/Base positions after serve contact (attack approach starting positions)
 *
 * Based on research from:
 * - Art of Coaching Volleyball: Outside hitters start 10-15ft off net, 2-3ft wide of antenna
 * - SportsEdTV: Middle blockers start at 3m line for quick approach
 * - Gold Medal Squared: Setter target is Zone 2.5 (right-of-center, 2ft off net)
 */
export const TARGET_POSITIONS: Record<PlayerRole, CourtPosition> = {
  S: { x: 0.75, y: 0.75 },   // Setting position (Zone 2.5 - right of center, 2ft off net)
  OPP: { x: 0.90, y: 0.55 }, // Right side attack approach (10ft+ off net)
  OH1: { x: 0.10, y: 0.55 }, // Left pin attack approach (10ft+ off net, outside antenna)
  OH2: { x: 0.12, y: 0.50 }, // Left side backup/approach position
  MB1: { x: 0.50, y: 0.60 }, // Center court at 3m line (quick approach start)
  MB2: { x: 0.50, y: 0.60 }, // Center court at 3m line (quick approach start)
  L: { x: 0.50, y: 0.25 },   // Deep center for defense
};

/**
 * Check if setter is in front row for given rotation
 */
export const isSetterFrontRow = (rotation: RotationNumber): boolean => {
  return rotation >= 4;
};

/**
 * Get number of front row attackers for given rotation
 */
export const getFrontRowAttackerCount = (rotation: RotationNumber): number => {
  return rotation <= 3 ? 3 : 2;
};

/**
 * Get the zone for a specific role in a specific rotation
 */
export const getRoleZone = (rotation: RotationNumber, role: PlayerRole): CourtZone => {
  if (role === 'L') {
    // Libero position depends on which MB is in back row
    const mb1Zone = getRoleZone(rotation, 'MB1');
    const mb2Zone = getRoleZone(rotation, 'MB2');
    return BACK_ROW_ZONES.includes(mb1Zone) ? mb1Zone : mb2Zone;
  }

  const chart = ROTATION_CHART[rotation];
  for (const [zone, r] of Object.entries(chart)) {
    if (r === role) return parseInt(zone) as CourtZone;
  }
  throw new Error(`Role ${role} not found in rotation ${rotation}`);
};

/**
 * Get which middle blocker is in back row for a rotation
 */
export const getBackRowMiddle = (rotation: RotationNumber): 'MB1' | 'MB2' => {
  const mb1Zone = getRoleZone(rotation, 'MB1');
  return BACK_ROW_ZONES.includes(mb1Zone) ? 'MB1' : 'MB2';
};

/**
 * Build player positions for a rotation
 */
export const buildPlayerPositions = (
  rotation: RotationNumber,
  mode: GameMode,
  formation: FormationType,
  liberoActive: boolean
): PlayerPosition[] => {
  const positions: PlayerPosition[] = [];
  const chart = ROTATION_CHART[rotation];
  const backRowMB = getBackRowMiddle(rotation);

  for (const [zoneStr, role] of Object.entries(chart)) {
    const zone = parseInt(zoneStr) as CourtZone;
    const isBackRow = BACK_ROW_ZONES.includes(zone);
    const isMiddleBlocker = role === 'MB1' || role === 'MB2';
    const shouldReplaceWithLibero = liberoActive && isBackRow && isMiddleBlocker;

    const actualRole = shouldReplaceWithLibero ? 'L' : role;

    // Get position based on mode
    let position: CourtPosition;
    if (mode === 'receiving') {
      const adjustments = SERVE_RECEIVE_ADJUSTMENTS[formation][rotation];
      const adjustedPos = adjustments[shouldReplaceWithLibero ? backRowMB : role];
      position = adjustedPos || ZONE_POSITIONS[zone];
    } else {
      position = ZONE_POSITIONS[zone];
    }

    positions.push({
      role: actualRole,
      zone,
      position,
      label: actualRole,
      color: PLAYER_COLORS[actualRole].bg,
      isBackRow,
      isLiberoEligible: isMiddleBlocker,
    });
  }

  return positions;
};

/**
 * Build movement arrows for a rotation
 */
export const buildMovementArrows = (
  rotation: RotationNumber,
  mode: GameMode,
  formation: FormationType,
  liberoActive: boolean
): MovementArrow[] => {
  const arrows: MovementArrow[] = [];
  const chart = ROTATION_CHART[rotation];
  const backRowMB = getBackRowMiddle(rotation);

  for (const [zoneStr, role] of Object.entries(chart)) {
    const zone = parseInt(zoneStr) as CourtZone;
    const isBackRow = BACK_ROW_ZONES.includes(zone);
    const isMiddleBlocker = role === 'MB1' || role === 'MB2';
    const shouldReplaceWithLibero = liberoActive && isBackRow && isMiddleBlocker;

    const actualRole = shouldReplaceWithLibero ? 'L' : role;

    // Get starting position
    let fromPos: CourtPosition;
    if (mode === 'receiving') {
      const adjustments = SERVE_RECEIVE_ADJUSTMENTS[formation][rotation];
      const adjustedPos = adjustments[shouldReplaceWithLibero ? backRowMB : role];
      fromPos = adjustedPos || ZONE_POSITIONS[zone];
    } else {
      fromPos = ZONE_POSITIONS[zone];
    }

    // Get target position
    const toPos = TARGET_POSITIONS[actualRole];

    // Only add arrow if there's significant movement (>15% of court)
    const distance = Math.sqrt(
      Math.pow(toPos.x - fromPos.x, 2) + Math.pow(toPos.y - fromPos.y, 2)
    );

    if (distance > 0.15) {
      arrows.push({
        role: actualRole,
        from: fromPos,
        to: toPos,
      });
    }
  }

  return arrows;
};
