import { useState, useMemo, useCallback } from 'react';
import type {
  RotationNumber,
  GameMode,
  FormationType,
  PlayerPosition,
  MovementArrow,
  OverlapConstraint,
  FormationData,
  PlayerRole,
} from '@/lib/volleyball/types';
import { buildPlayerPositions, buildMovementArrows, ROTATION_CHART } from '@/lib/volleyball/rotations';
import { getOverlapConstraints } from '@/lib/volleyball/overlap';
import { PLAYER_COLORS, BACK_ROW_ZONES } from '@/lib/volleyball/constants';

type UseVolleyballRotationOptions = {
  initialRotation?: RotationNumber;
  initialMode?: GameMode;
  initialFormation?: FormationType;
  initialLiberoActive?: boolean;
  customFormationData?: FormationData | null;
};

type UseVolleyballRotationReturn = {
  // State
  rotation: RotationNumber;
  mode: GameMode;
  formation: FormationType;
  liberoActive: boolean;
  isUsingCustomData: boolean;

  // Computed data
  players: PlayerPosition[];
  arrows: MovementArrow[];
  overlaps: OverlapConstraint[];

  // Actions
  setRotation: (r: RotationNumber) => void;
  setMode: (m: GameMode) => void;
  setFormation: (f: FormationType) => void;
  setLiberoActive: (active: boolean) => void;
  nextRotation: () => void;
  prevRotation: () => void;
};

/**
 * Build player positions from custom formation data
 */
const buildPlayerPositionsFromCustom = (
  rotation: RotationNumber,
  mode: GameMode,
  data: FormationData,
  liberoActive: boolean
): PlayerPosition[] => {
  const frame = data[mode]?.[rotation];
  if (!frame) return [];

  const positions: PlayerPosition[] = [];
  const chart = ROTATION_CHART[rotation];

  // Determine which MB is in back row
  const getBackRowMB = (): 'MB1' | 'MB2' => {
    for (const [zoneStr, role] of Object.entries(chart)) {
      const zone = parseInt(zoneStr);
      if ((role === 'MB1' || role === 'MB2') && BACK_ROW_ZONES.includes(zone as 1 | 2 | 3 | 4 | 5 | 6)) {
        return role;
      }
    }
    return 'MB1';
  };

  const backRowMB = getBackRowMB();

  for (const [zoneStr, role] of Object.entries(chart)) {
    const zone = parseInt(zoneStr) as 1 | 2 | 3 | 4 | 5 | 6;
    const isBackRow = BACK_ROW_ZONES.includes(zone);
    const isMiddleBlocker = role === 'MB1' || role === 'MB2';
    const shouldShowLibero = liberoActive && isBackRow && isMiddleBlocker;

    const actualRole = shouldShowLibero ? 'L' : role;
    const pos = shouldShowLibero
      ? frame.roleSpots.L || frame.roleSpots[backRowMB]
      : frame.roleSpots[role as PlayerRole];

    if (pos) {
      positions.push({
        role: actualRole as PlayerRole,
        zone,
        position: pos,
        label: actualRole,
        color: PLAYER_COLORS[actualRole as PlayerRole]?.bg || 'gray',
        isBackRow,
        isLiberoEligible: isMiddleBlocker,
      });
    }
  }

  return positions;
};

/**
 * Build movement arrows from custom formation data
 */
const buildMovementArrowsFromCustom = (
  rotation: RotationNumber,
  mode: GameMode,
  data: FormationData
): MovementArrow[] => {
  const frame = data[mode]?.[rotation];
  if (!frame?.movementArrows) return [];

  return Object.entries(frame.movementArrows)
    .filter(([, arrow]) => arrow !== undefined)
    .map(([role, arrow]) => ({
      role: role as PlayerRole,
      from: arrow!.from,
      to: arrow!.to,
    }));
};

/**
 * Hook for managing volleyball rotation visualization state
 */
export const useVolleyballRotation = (
  options: UseVolleyballRotationOptions = {}
): UseVolleyballRotationReturn => {
  const {
    initialRotation = 1,
    initialMode = 'receiving',
    initialFormation = 'traditional',
    initialLiberoActive = true,
    customFormationData = null,
  } = options;

  const [rotation, setRotation] = useState<RotationNumber>(initialRotation);
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [formation, setFormation] = useState<FormationType>(initialFormation);
  const [liberoActive, setLiberoActive] = useState(initialLiberoActive);

  const isUsingCustomData = !!customFormationData;

  // Compute player positions based on current state
  const players = useMemo(() => {
    if (customFormationData) {
      return buildPlayerPositionsFromCustom(rotation, mode, customFormationData, liberoActive);
    }
    return buildPlayerPositions(rotation, mode, formation, liberoActive);
  }, [rotation, mode, formation, liberoActive, customFormationData]);

  // Compute movement arrows
  const arrows = useMemo(() => {
    if (customFormationData) {
      return buildMovementArrowsFromCustom(rotation, mode, customFormationData);
    }
    return buildMovementArrows(rotation, mode, formation, liberoActive);
  }, [rotation, mode, formation, liberoActive, customFormationData]);

  // Get overlap constraints (static)
  const overlaps = useMemo(() => {
    return getOverlapConstraints();
  }, []);

  // Navigation helpers
  const nextRotation = useCallback(() => {
    setRotation((prev) => (prev === 6 ? 1 : ((prev + 1) as RotationNumber)));
  }, []);

  const prevRotation = useCallback(() => {
    setRotation((prev) => (prev === 1 ? 6 : ((prev - 1) as RotationNumber)));
  }, []);

  return {
    rotation,
    mode,
    formation,
    liberoActive,
    isUsingCustomData,
    players,
    arrows,
    overlaps,
    setRotation,
    setMode,
    setFormation,
    setLiberoActive,
    nextRotation,
    prevRotation,
  };
};
