import type { PlayerRole, PlayerInfo, CourtZone, CourtPosition } from './types';

/**
 * Player metadata for the legend.
 *
 * The seven-hue `PLAYER_COLORS` map that used to sit above this — seven raw
 * `oklch(...)` literals, one per role — is GONE, and with it the `color` and
 * `textColor` fields it fed. It was the court's primary identity channel, which
 * made role identity a hue and nothing else: desaturate it and six of the seven
 * tokens became the same grey. Role tokens now come from
 * `lib/volleyball/roleTokens.ts`, which maps a role and its ROW to `--mb-*`
 * references and carries a second, non-colour mark for the setter and the
 * libero. Nothing in the app paints from a literal any more.
 */
export const PLAYER_INFO: Record<PlayerRole, PlayerInfo> = {
  S: {
    role: 'S',
    fullName: 'Setter',
    shortName: 'S',
    description: 'Orchestrates the offense by setting to attackers',
  },
  OPP: {
    role: 'OPP',
    fullName: 'Opposite',
    shortName: 'OPP',
    description: 'Right-side hitter, opposite the setter in rotation',
  },
  OH1: {
    role: 'OH1',
    fullName: 'Outside Hitter 1',
    shortName: 'OH1',
    description: 'Primary left-side attacker, typically strongest hitter',
  },
  OH2: {
    role: 'OH2',
    fullName: 'Outside Hitter 2',
    shortName: 'OH2',
    description: 'Secondary left-side attacker',
  },
  MB1: {
    role: 'MB1',
    fullName: 'Middle Blocker 1',
    shortName: 'MB1',
    description: 'Primary middle attacker and blocker',
  },
  MB2: {
    role: 'MB2',
    fullName: 'Middle Blocker 2',
    shortName: 'MB2',
    description: 'Secondary middle attacker and blocker',
  },
  L: {
    role: 'L',
    fullName: 'Libero',
    shortName: 'L',
    description: 'Defensive specialist, replaces back-row middles',
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
