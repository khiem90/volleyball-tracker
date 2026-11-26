import { letterColor, type LetterColor } from '../teamColors';
import type { PlayerRole, PlayerInfo, CourtZone, CourtPosition, OverlapType } from './types';

/**
 * The color each role is drawn in on the court and in the legend. These and
 * the two overlap colors below are the court's own palette, outside the role
 * tokens, because a role is told apart by its hue. Each is written as #rrggbb
 * so a test can hold its label to 4.5 to 1. The label is ink or white,
 * whichever stands out more.
 */
const playerColor = (bg: string): { bg: string; text: LetterColor } => ({
  bg,
  text: letterColor(bg),
});

export const PLAYER_COLORS: Record<PlayerRole, { bg: string; text: LetterColor }> = {
  S: playerColor('#d40924'), // Red - Setter
  OPP: playerColor('#0f74c5'), // Blue - Opposite
  OH1: playerColor('#1e7729'), // Green - Outside 1
  OH2: playerColor('#71c575'), // Light Green - Outside 2
  MB1: playerColor('#ef7926'), // Orange - Middle 1
  MB2: playerColor('#fdbc6f'), // Light Orange - Middle 2
  L: playerColor('#9543c6'), // Purple - Libero
};

/**
 * The color of an overlap line, by the kind of rule it draws. The help text
 * calls them the blue lines and the orange lines, and writes each name in its
 * line's color.
 */
export const OVERLAP_COLORS: Record<OverlapType, string> = {
  'front-back': '#2563eb',
  'left-right': '#c2410c',
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
const FRONT_ROW_ZONES: CourtZone[] = [2, 3, 4];

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
