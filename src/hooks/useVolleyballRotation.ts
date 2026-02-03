import { useState, useMemo, useCallback } from 'react';
import type {
  RotationNumber,
  GameMode,
  FormationType,
  PlayerPosition,
  MovementArrow,
  OverlapConstraint,
} from '@/lib/volleyball/types';
import { buildPlayerPositions, buildMovementArrows } from '@/lib/volleyball/rotations';
import { getOverlapConstraints } from '@/lib/volleyball/overlap';

type UseVolleyballRotationReturn = {
  // State
  rotation: RotationNumber;
  mode: GameMode;
  formation: FormationType;
  liberoActive: boolean;

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
 * Hook for managing volleyball rotation visualization state
 */
export const useVolleyballRotation = (): UseVolleyballRotationReturn => {
  const [rotation, setRotation] = useState<RotationNumber>(1);
  const [mode, setMode] = useState<GameMode>('receiving');
  const [formation, setFormation] = useState<FormationType>('traditional');
  const [liberoActive, setLiberoActive] = useState(true);

  // Compute player positions based on current state
  const players = useMemo(() => {
    return buildPlayerPositions(rotation, mode, formation, liberoActive);
  }, [rotation, mode, formation, liberoActive]);

  // Compute movement arrows
  const arrows = useMemo(() => {
    return buildMovementArrows(rotation, mode, formation, liberoActive);
  }, [rotation, mode, formation, liberoActive]);

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
