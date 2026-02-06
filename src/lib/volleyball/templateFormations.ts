import type {
  TemplateFormation,
  FormationData,
  RotationFrame,
  RotationNumber,
  PlayerRole,
  CourtPosition,
} from './types';
import { ZONE_POSITIONS } from './constants';
import { ROTATION_CHART, SERVE_RECEIVE_ADJUSTMENTS, TARGET_POSITIONS } from './rotations';

// ============================================
// Helper Functions
// ============================================

/** Get all player roles (excluding Libero for position data) */
const CORE_ROLES: PlayerRole[] = ['S', 'OPP', 'OH1', 'OH2', 'MB1', 'MB2'];

/** Build roleSpots from rotation chart using zone positions */
const buildRoleSpotsFromZones = (rotation: RotationNumber): Record<PlayerRole, CourtPosition> => {
  const roleSpots: Record<PlayerRole, CourtPosition> = {} as Record<PlayerRole, CourtPosition>;
  const chart = ROTATION_CHART[rotation];

  for (const [zoneStr, role] of Object.entries(chart)) {
    const zone = parseInt(zoneStr) as 1 | 2 | 3 | 4 | 5 | 6;
    roleSpots[role] = { ...ZONE_POSITIONS[zone] };
  }

  // Add Libero position (same as back-row MB position)
  const mb1Zone = Object.entries(chart).find(([, r]) => r === 'MB1')?.[0];
  const mb2Zone = Object.entries(chart).find(([, r]) => r === 'MB2')?.[0];
  const backRowZones = [1, 5, 6];
  const mb1InBackRow = mb1Zone && backRowZones.includes(parseInt(mb1Zone));
  const mbZone = mb1InBackRow ? mb1Zone : mb2Zone;
  roleSpots.L = { ...ZONE_POSITIONS[parseInt(mbZone!) as 1 | 2 | 3 | 4 | 5 | 6] };

  return roleSpots;
};

/** Build roleSpots from traditional serve-receive adjustments */
const buildRoleSpotsFromTraditional = (rotation: RotationNumber): Record<PlayerRole, CourtPosition> => {
  const adjustments = SERVE_RECEIVE_ADJUSTMENTS.traditional[rotation];
  const roleSpots: Record<PlayerRole, CourtPosition> = {} as Record<PlayerRole, CourtPosition>;

  for (const role of CORE_ROLES) {
    if (adjustments[role]) {
      roleSpots[role] = { ...adjustments[role]! };
    } else {
      // Fallback to zone position
      const chart = ROTATION_CHART[rotation];
      const zone = Object.entries(chart).find(([, r]) => r === role)?.[0];
      roleSpots[role] = { ...ZONE_POSITIONS[parseInt(zone!) as 1 | 2 | 3 | 4 | 5 | 6] };
    }
  }

  // Add Libero position (based on back-row MB)
  const chart = ROTATION_CHART[rotation];
  const mb1Zone = Object.entries(chart).find(([, r]) => r === 'MB1')?.[0];
  const backRowZones = [1, 5, 6];
  const mb1InBackRow = mb1Zone && backRowZones.includes(parseInt(mb1Zone));
  const backRowMB = mb1InBackRow ? 'MB1' : 'MB2';
  roleSpots.L = { ...roleSpots[backRowMB] };

  return roleSpots;
};

/** Build movement arrows for a rotation frame */
const buildMovementArrowsForFrame = (
  roleSpots: Record<PlayerRole, CourtPosition>
): Partial<Record<PlayerRole, { from: CourtPosition; to: CourtPosition }>> => {
  const arrows: Partial<Record<PlayerRole, { from: CourtPosition; to: CourtPosition }>> = {};

  for (const role of [...CORE_ROLES, 'L' as PlayerRole]) {
    const from = roleSpots[role];
    const to = TARGET_POSITIONS[role];

    if (!from || !to) continue;

    // Only add arrow if there's significant movement (>15% of court)
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
    );

    if (distance > 0.15) {
      arrows[role] = {
        from: { ...from },
        to: { ...to },
      };
    }
  }

  return arrows;
};

/** Build a complete RotationFrame from roleSpots */
const buildRotationFrame = (roleSpots: Record<PlayerRole, CourtPosition>): RotationFrame => {
  return {
    roleSpots,
    movementArrows: buildMovementArrowsForFrame(roleSpots),
  };
};

// ============================================
// Template Data Generators
// ============================================

/** Generate neutral/basic formation data using zone positions */
const generateNeutralFormationData = (): FormationData => {
  const serving: Record<RotationNumber, RotationFrame> = {} as Record<RotationNumber, RotationFrame>;
  const receiving: Record<RotationNumber, RotationFrame> = {} as Record<RotationNumber, RotationFrame>;

  for (let r = 1; r <= 6; r++) {
    const rotation = r as RotationNumber;
    const roleSpots = buildRoleSpotsFromZones(rotation);

    // For neutral template, serving and receiving use same positions
    serving[rotation] = buildRotationFrame(roleSpots);
    receiving[rotation] = buildRotationFrame(roleSpots);
  }

  return { serving, receiving };
};

/** Generate standard 5-1 formation data based on traditional serve-receive */
const generateStandard51FormationData = (): FormationData => {
  const serving: Record<RotationNumber, RotationFrame> = {} as Record<RotationNumber, RotationFrame>;
  const receiving: Record<RotationNumber, RotationFrame> = {} as Record<RotationNumber, RotationFrame>;

  for (let r = 1; r <= 6; r++) {
    const rotation = r as RotationNumber;

    // Serving uses base zone positions
    const servingRoleSpots = buildRoleSpotsFromZones(rotation);
    serving[rotation] = buildRotationFrame(servingRoleSpots);

    // Receiving uses traditional formation adjustments
    const receivingRoleSpots = buildRoleSpotsFromTraditional(rotation);
    receiving[rotation] = buildRotationFrame(receivingRoleSpots);
  }

  return { serving, receiving };
};

// ============================================
// Template Definitions
// ============================================

export const TEMPLATE_FORMATIONS: TemplateFormation[] = [
  {
    id: 'neutral',
    name: 'Neutral / Empty',
    description: 'Basic legal positions for each rotation. A blank canvas for creating your own formation from scratch.',
    data: generateNeutralFormationData(),
  },
  {
    id: 'standard-5-1',
    name: 'Standard 5-1',
    description: 'Based on the traditional 3-passer W formation with optimized serve-receive positions. Great starting point for customization.',
    data: generateStandard51FormationData(),
  },
];

// ============================================
// Helper Functions for Templates
// ============================================

/** Get all template formations */
export const getTemplateFormations = (): TemplateFormation[] => {
  return TEMPLATE_FORMATIONS;
};

/** Get a template formation by ID */
export const getTemplateById = (id: string): TemplateFormation | undefined => {
  return TEMPLATE_FORMATIONS.find((t) => t.id === id);
};

/** Create a deep copy of formation data (for editing) */
export const cloneFormationData = (data: FormationData): FormationData => {
  return JSON.parse(JSON.stringify(data));
};

/** Convert built-in formation to FormationData for editing */
export const builtinToFormationData = (formationType: string): FormationData => {
  const serving: Record<RotationNumber, RotationFrame> = {} as Record<RotationNumber, RotationFrame>;
  const receiving: Record<RotationNumber, RotationFrame> = {} as Record<RotationNumber, RotationFrame>;

  for (let r = 1; r <= 6; r++) {
    const rotation = r as RotationNumber;

    // Serving uses base zone positions
    const servingRoleSpots = buildRoleSpotsFromZones(rotation);
    serving[rotation] = buildRotationFrame(servingRoleSpots);

    // Receiving uses the specified formation's adjustments
    const adjustments = SERVE_RECEIVE_ADJUSTMENTS[formationType as keyof typeof SERVE_RECEIVE_ADJUSTMENTS];
    if (adjustments) {
      const receivingRoleSpots: Record<PlayerRole, CourtPosition> = {} as Record<PlayerRole, CourtPosition>;

      for (const role of CORE_ROLES) {
        if (adjustments[rotation][role]) {
          receivingRoleSpots[role] = { ...adjustments[rotation][role]! };
        } else {
          // Fallback to zone position
          const chart = ROTATION_CHART[rotation];
          const zone = Object.entries(chart).find(([, r]) => r === role)?.[0];
          receivingRoleSpots[role] = { ...ZONE_POSITIONS[parseInt(zone!) as 1 | 2 | 3 | 4 | 5 | 6] };
        }
      }

      // Add Libero position
      const chart = ROTATION_CHART[rotation];
      const mb1Zone = Object.entries(chart).find(([, r]) => r === 'MB1')?.[0];
      const backRowZones = [1, 5, 6];
      const mb1InBackRow = mb1Zone && backRowZones.includes(parseInt(mb1Zone));
      const backRowMB = mb1InBackRow ? 'MB1' : 'MB2';
      receivingRoleSpots.L = { ...receivingRoleSpots[backRowMB] };

      receiving[rotation] = buildRotationFrame(receivingRoleSpots);
    } else {
      // Fallback to neutral positions
      receiving[rotation] = buildRotationFrame(servingRoleSpots);
    }
  }

  return { serving, receiving };
};
