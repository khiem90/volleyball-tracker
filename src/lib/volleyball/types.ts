/**
 * Volleyball 5-1 Rotation System Types
 *
 * Coordinate system: Normalized 0..1 for both axes
 * - x: 0 = left sideline, 1 = right sideline
 * - y: 0 = end line, 1 = net
 */

/** Normalized court position */
export type CourtPosition = {
  x: number;
  y: number;
};

/** Player role identifiers in 5-1 system */
export type PlayerRole = 'S' | 'OPP' | 'OH1' | 'OH2' | 'MB1' | 'MB2' | 'L';

/** Court zones 1-6 (standard volleyball numbering) */
export type CourtZone = 1 | 2 | 3 | 4 | 5 | 6;

/** Rotation number 1-6 */
export type RotationNumber = 1 | 2 | 3 | 4 | 5 | 6;

/** Game mode affects positioning */
export type GameMode = 'serving' | 'receiving';

/** Formation variants for serve-receive */
export type FormationType = 'traditional' | 'stack' | 'spread' | 'rightSlant' | 'leftSlant';

/** Player position data for visualization */
export type PlayerPosition = {
  role: PlayerRole;
  zone: CourtZone;
  position: CourtPosition;
  label: string;
  color: string;
  isBackRow: boolean;
  isLiberoEligible: boolean;
};

/** Movement arrow data showing transition from contact to base */
export type MovementArrow = {
  role: PlayerRole;
  from: CourtPosition;
  to: CourtPosition;
  label?: string;
};

/** Overlap constraint type */
export type OverlapType = 'front-back' | 'left-right';

/** Overlap constraint between two zones */
export type OverlapConstraint = {
  type: OverlapType;
  zone1: CourtZone;
  zone2: CourtZone;
  description: string;
};

/** Player metadata for legend display */
export type PlayerInfo = {
  role: PlayerRole;
  fullName: string;
  shortName: string;
  description: string;
  color: string;
  textColor: string;
};

/** Formation configuration */
export type FormationConfig = {
  id: FormationType;
  name: string;
  description: string;
  tradeoffs: string;
};

/** Complete rotation state for rendering */
export type RotationState = {
  rotation: RotationNumber;
  mode: GameMode;
  formation: FormationType;
  liberoActive: boolean;
  players: PlayerPosition[];
  arrows: MovementArrow[];
  overlaps: OverlapConstraint[];
};
