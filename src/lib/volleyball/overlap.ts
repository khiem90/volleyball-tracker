import type { CourtZone, OverlapConstraint, OverlapType } from './types';

/**
 * Overlap Rules (FIVB Rules 7.4)
 *
 * At the moment of serve contact, players must maintain proper positioning:
 *
 * FRONT/BACK OVERLAP:
 * - Back-row players cannot be closer to the net than their corresponding front-row player
 * - Zone 1 must be behind Zone 2
 * - Zone 6 must be behind Zone 3
 * - Zone 5 must be behind Zone 4
 *
 * LEFT/RIGHT OVERLAP:
 * - Front row: Zone 3 must be between Zone 2 (right) and Zone 4 (left)
 * - Back row: Zone 6 must be between Zone 1 (right) and Zone 5 (left)
 *
 * Position is determined by the foot touching the ground.
 *
 * Note: As of 2025 rule changes, overlap rules only apply to the receiving team,
 * not the serving team. However, we display them for educational purposes.
 */

/**
 * All overlap constraint pairs that must be maintained
 */
export const OVERLAP_CONSTRAINTS: OverlapConstraint[] = [
  // Front/Back overlap - back row must be behind front row
  {
    type: 'front-back',
    zone1: 2, // Front (must be in front)
    zone2: 1, // Back (must be behind)
    description: 'Zone 1 must be behind Zone 2',
  },
  {
    type: 'front-back',
    zone1: 3,
    zone2: 6,
    description: 'Zone 6 must be behind Zone 3',
  },
  {
    type: 'front-back',
    zone1: 4,
    zone2: 5,
    description: 'Zone 5 must be behind Zone 4',
  },

  // Left/Right overlap - center must be between sides
  // Front row
  {
    type: 'left-right',
    zone1: 4, // Left
    zone2: 3, // Center (must be right of left)
    description: 'Zone 3 must be right of Zone 4',
  },
  {
    type: 'left-right',
    zone1: 3, // Center
    zone2: 2, // Right (must be right of center)
    description: 'Zone 2 must be right of Zone 3',
  },
  // Back row
  {
    type: 'left-right',
    zone1: 5, // Left
    zone2: 6, // Center (must be right of left)
    description: 'Zone 6 must be right of Zone 5',
  },
  {
    type: 'left-right',
    zone1: 6, // Center
    zone2: 1, // Right (must be right of center)
    description: 'Zone 1 must be right of Zone 6',
  },
];

/**
 * Get overlap constraints for visualization
 * Returns pairs of zones that have overlap relationships
 */
export const getOverlapConstraints = (): OverlapConstraint[] => {
  return OVERLAP_CONSTRAINTS;
};

/**
 * Get constraints filtered by type
 */
export const getConstraintsByType = (type: OverlapType): OverlapConstraint[] => {
  return OVERLAP_CONSTRAINTS.filter((c) => c.type === type);
};

/**
 * Get the zones that a specific zone has overlap constraints with
 */
export const getRelatedZones = (zone: CourtZone): CourtZone[] => {
  const related: CourtZone[] = [];

  for (const constraint of OVERLAP_CONSTRAINTS) {
    if (constraint.zone1 === zone) {
      related.push(constraint.zone2);
    } else if (constraint.zone2 === zone) {
      related.push(constraint.zone1);
    }
  }

  return related;
};

/**
 * Adjacency pairs for visual lines on the court
 * These show which positions are "adjacent" in the rotation order
 * and need to maintain overlap relationships
 */
export const ADJACENCY_PAIRS: Array<[CourtZone, CourtZone]> = [
  // Front row (left to right)
  [4, 3],
  [3, 2],
  // Back row (left to right)
  [5, 6],
  [6, 1],
  // Front/back connections
  [4, 5],
  [3, 6],
  [2, 1],
];

/**
 * Get all adjacency pairs for drawing lines
 */
export const getAdjacencyPairs = (): Array<[CourtZone, CourtZone]> => {
  return ADJACENCY_PAIRS;
};
