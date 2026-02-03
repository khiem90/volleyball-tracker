import type { PlayerRole, PlayerInfo, CourtZone, CourtPosition } from './types';

/**
 * Player color scheme using OKLch for perceptual consistency
 */
export const PLAYER_COLORS: Record<PlayerRole, { bg: string; text: string }> = {
  S: { bg: 'oklch(0.55 0.22 25)', text: 'white' }, // Red - Setter
  OPP: { bg: 'oklch(0.55 0.15 250)', text: 'white' }, // Blue - Opposite
  OH1: { bg: 'oklch(0.55 0.15 145)', text: 'white' }, // Green - Outside 1
  OH2: { bg: 'oklch(0.60 0.12 145)', text: 'white' }, // Light Green - Outside 2
  MB1: { bg: 'oklch(0.60 0.15 55)', text: 'white' }, // Orange - Middle 1
  MB2: { bg: 'oklch(0.65 0.12 55)', text: 'white' }, // Light Orange - Middle 2
  L: { bg: 'oklch(0.60 0.18 310)', text: 'white' }, // Purple - Libero
};

/**
 * Player metadata for legend display
 */
export const PLAYER_INFO: Record<PlayerRole, PlayerInfo> = {
  S: {
    role: 'S',
    fullName: 'Setter',
    shortName: 'S',
    description: 'Orchestrates the offense by setting to attackers',
    color: PLAYER_COLORS.S.bg,
    textColor: PLAYER_COLORS.S.text,
  },
  OPP: {
    role: 'OPP',
    fullName: 'Opposite',
    shortName: 'OPP',
    description: 'Right-side hitter, opposite the setter in rotation',
    color: PLAYER_COLORS.OPP.bg,
    textColor: PLAYER_COLORS.OPP.text,
  },
  OH1: {
    role: 'OH1',
    fullName: 'Outside Hitter 1',
    shortName: 'OH1',
    description: 'Primary left-side attacker, typically strongest hitter',
    color: PLAYER_COLORS.OH1.bg,
    textColor: PLAYER_COLORS.OH1.text,
  },
  OH2: {
    role: 'OH2',
    fullName: 'Outside Hitter 2',
    shortName: 'OH2',
    description: 'Secondary left-side attacker',
    color: PLAYER_COLORS.OH2.bg,
    textColor: PLAYER_COLORS.OH2.text,
  },
  MB1: {
    role: 'MB1',
    fullName: 'Middle Blocker 1',
    shortName: 'MB1',
    description: 'Primary middle attacker and blocker',
    color: PLAYER_COLORS.MB1.bg,
    textColor: PLAYER_COLORS.MB1.text,
  },
  MB2: {
    role: 'MB2',
    fullName: 'Middle Blocker 2',
    shortName: 'MB2',
    description: 'Secondary middle attacker and blocker',
    color: PLAYER_COLORS.MB2.bg,
    textColor: PLAYER_COLORS.MB2.text,
  },
  L: {
    role: 'L',
    fullName: 'Libero',
    shortName: 'L',
    description: 'Defensive specialist, replaces back-row middles',
    color: PLAYER_COLORS.L.bg,
    textColor: PLAYER_COLORS.L.text,
  },
};

/**
 * Base zone positions (serve contact positions)
 * Normalized coordinates: x (0..1 left to right), y (0..1 endline to net)
 */
export const ZONE_POSITIONS: Record<CourtZone, CourtPosition> = {
  1: { x: 0.83, y: 0.25 }, // Right Back
  2: { x: 0.83, y: 0.78 }, // Right Front
  3: { x: 0.50, y: 0.78 }, // Middle Front
  4: { x: 0.17, y: 0.78 }, // Left Front
  5: { x: 0.17, y: 0.25 }, // Left Back
  6: { x: 0.50, y: 0.25 }, // Middle Back
};

/**
 * Front row zones (near net)
 */
export const FRONT_ROW_ZONES: CourtZone[] = [2, 3, 4];

/**
 * Back row zones (near endline)
 */
export const BACK_ROW_ZONES: CourtZone[] = [1, 5, 6];

/**
 * SVG rendering constants
 */
export const COURT_SVG = {
  WIDTH: 400,
  HEIGHT: 300,
  PADDING: 40,
  NODE_RADIUS: 24,
  ATTACK_LINE_Y: 0.55, // Normalized position of 3m attack line
} as const;
