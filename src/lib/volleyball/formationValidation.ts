import type {
  FormationData,
  FormationValidationError,
  RotationNumber,
  GameMode,
  PlayerRole,
  CourtPosition,
  RotationFrame,
} from './types';
import { getOverlapConstraints } from './overlap';
import { ROTATION_CHART } from './rotations';

// ============================================
// Constants
// ============================================

/** Core roles that must have positions (excludes Libero) */
const REQUIRED_ROLES: PlayerRole[] = ['S', 'OPP', 'OH1', 'OH2', 'MB1', 'MB2'];

/** All rotation numbers */
const ALL_ROTATIONS: RotationNumber[] = [1, 2, 3, 4, 5, 6];

/** Both game modes */
const ALL_MODES: GameMode[] = ['serving', 'receiving'];

// ============================================
// Position Validation
// ============================================

/** Check if a position is within valid bounds (0-1 range) */
const isValidPosition = (pos: CourtPosition): boolean => {
  return pos.x >= 0 && pos.x <= 1 && pos.y >= 0 && pos.y <= 1;
};

/** Check if a position exists and is valid */
const validatePosition = (
  pos: CourtPosition | undefined,
  rotation: RotationNumber,
  mode: GameMode,
  role: PlayerRole
): FormationValidationError | null => {
  if (!pos) {
    return {
      type: 'incomplete',
      rotation,
      mode,
      role,
      message: `Missing position for ${role} in R${rotation} ${mode}`,
    };
  }

  if (!isValidPosition(pos)) {
    return {
      type: 'position',
      rotation,
      mode,
      role,
      message: `${role} position out of bounds in R${rotation} ${mode} (x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)})`,
    };
  }

  return null;
};

// ============================================
// Overlap Validation (Warnings Only)
// ============================================

/** Back row zones */
const BACK_ROW_ZONES = [1, 5, 6];

/** Get zone for a role in a rotation */
const getRoleZone = (rotation: RotationNumber, role: PlayerRole): number => {
  const chart = ROTATION_CHART[rotation];
  for (const [zoneStr, r] of Object.entries(chart)) {
    if (r === role) return parseInt(zoneStr);
  }
  return 0;
};

/** Check front-back overlap (front row player must be in front of corresponding back row player) */
const checkFrontBackOverlap = (
  frontPos: CourtPosition,
  backPos: CourtPosition
): boolean => {
  // Front row player must have higher y value (closer to net)
  return frontPos.y > backPos.y;
};

/** Check left-right overlap (right player must be to the right of left player) */
const checkLeftRightOverlap = (
  rightPos: CourtPosition,
  leftPos: CourtPosition
): boolean => {
  // Right player must have higher x value
  return rightPos.x > leftPos.x;
};

/** Validate overlap constraints for a rotation frame */
const validateOverlaps = (
  frame: RotationFrame,
  rotation: RotationNumber,
  mode: GameMode
): FormationValidationError[] => {
  const errors: FormationValidationError[] = [];
  const constraints = getOverlapConstraints();

  // Map zones to roles for this rotation
  const zoneToRole: Record<number, PlayerRole> = {};
  const chart = ROTATION_CHART[rotation];
  for (const [zoneStr, role] of Object.entries(chart)) {
    zoneToRole[parseInt(zoneStr)] = role;
  }

  for (const constraint of constraints) {
    const role1 = zoneToRole[constraint.zone1];
    const role2 = zoneToRole[constraint.zone2];

    if (!role1 || !role2) continue;

    const pos1 = frame.roleSpots[role1];
    const pos2 = frame.roleSpots[role2];

    if (!pos1 || !pos2) continue;

    let isViolation = false;

    if (constraint.type === 'front-back') {
      // Zone 1 should be the front row zone (higher y), Zone 2 should be back row
      const frontZone = constraint.zone1;
      const backZone = constraint.zone2;
      const frontRole = zoneToRole[frontZone];
      const backRole = zoneToRole[backZone];
      const frontPos = frame.roleSpots[frontRole];
      const backPos = frame.roleSpots[backRole];

      if (frontPos && backPos) {
        isViolation = !checkFrontBackOverlap(frontPos, backPos);
      }
    } else if (constraint.type === 'left-right') {
      // Need to determine which zone should be left/right based on zone numbers
      const leftZones = [4, 5]; // Left side
      const rightZones = [2, 1]; // Right side
      const centerZones = [3, 6]; // Center

      let leftPos: CourtPosition | undefined;
      let rightPos: CourtPosition | undefined;

      if (leftZones.includes(constraint.zone1) || rightZones.includes(constraint.zone2)) {
        leftPos = pos1;
        rightPos = pos2;
      } else {
        leftPos = pos2;
        rightPos = pos1;
      }

      if (leftPos && rightPos) {
        isViolation = !checkLeftRightOverlap(rightPos, leftPos);
      }
    }

    if (isViolation) {
      errors.push({
        type: 'overlap',
        rotation,
        mode,
        message: `Overlap violation in R${rotation} ${mode}: ${constraint.description}`,
      });
    }
  }

  return errors;
};

// ============================================
// Main Validation Functions
// ============================================

/**
 * Validate a single rotation frame
 */
export const validateRotationFrame = (
  frame: RotationFrame | undefined,
  rotation: RotationNumber,
  mode: GameMode,
  includeOverlapWarnings: boolean = true
): FormationValidationError[] => {
  const errors: FormationValidationError[] = [];

  if (!frame) {
    errors.push({
      type: 'incomplete',
      rotation,
      mode,
      message: `Missing ${mode} rotation ${rotation} data`,
    });
    return errors;
  }

  // Validate all required roles have valid positions
  for (const role of REQUIRED_ROLES) {
    const error = validatePosition(frame.roleSpots[role], rotation, mode, role);
    if (error) {
      errors.push(error);
    }
  }

  // Validate Libero position if present
  if (frame.roleSpots.L) {
    const error = validatePosition(frame.roleSpots.L, rotation, mode, 'L');
    if (error) {
      errors.push(error);
    }
  }

  // Check overlap constraints (warnings only)
  if (includeOverlapWarnings && errors.length === 0) {
    const overlapErrors = validateOverlaps(frame, rotation, mode);
    errors.push(...overlapErrors);
  }

  return errors;
};

/**
 * Validate complete formation data
 */
export const validateFormation = (
  data: FormationData,
  includeOverlapWarnings: boolean = true
): FormationValidationError[] => {
  const errors: FormationValidationError[] = [];

  // Check all rotations exist for both modes
  for (const mode of ALL_MODES) {
    const modeData = data[mode];

    if (!modeData) {
      errors.push({
        type: 'incomplete',
        mode,
        message: `Missing ${mode} mode data`,
      });
      continue;
    }

    for (const rotation of ALL_ROTATIONS) {
      const frame = modeData[rotation];
      const frameErrors = validateRotationFrame(frame, rotation, mode, includeOverlapWarnings);
      errors.push(...frameErrors);
    }
  }

  return errors;
};

/**
 * Check if formation is valid for publishing (no blocking errors)
 */
export const isFormationValid = (data: FormationData): boolean => {
  const errors = validateFormation(data, false); // Exclude overlap warnings
  return errors.filter((e) => e.type !== 'overlap').length === 0;
};

/**
 * Get blocking errors only (for publish validation)
 */
export const getBlockingErrors = (data: FormationData): FormationValidationError[] => {
  const errors = validateFormation(data, false);
  return errors.filter((e) => e.type !== 'overlap');
};

/**
 * Get overlap warnings only
 */
export const getOverlapWarnings = (data: FormationData): FormationValidationError[] => {
  const errors = validateFormation(data, true);
  return errors.filter((e) => e.type === 'overlap');
};

/**
 * Validate a single position update (for real-time feedback)
 */
export const validatePositionUpdate = (
  position: CourtPosition
): FormationValidationError | null => {
  if (!isValidPosition(position)) {
    return {
      type: 'position',
      message: `Position out of bounds (x: ${position.x.toFixed(2)}, y: ${position.y.toFixed(2)}). Must be between 0 and 1.`,
    };
  }
  return null;
};

/**
 * Get summary of validation errors
 */
export const getValidationSummary = (
  errors: FormationValidationError[]
): { blocking: number; warnings: number; byRotation: Record<number, number> } => {
  const blocking = errors.filter((e) => e.type !== 'overlap').length;
  const warnings = errors.filter((e) => e.type === 'overlap').length;

  const byRotation: Record<number, number> = {};
  for (const error of errors) {
    if (error.rotation) {
      byRotation[error.rotation] = (byRotation[error.rotation] || 0) + 1;
    }
  }

  return { blocking, warnings, byRotation };
};
