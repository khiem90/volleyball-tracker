import type { FormationType, FormationConfig } from './types';

/**
 * Formation configurations for serve-receive
 *
 * Different formations optimize for different scenarios:
 * - Traditional: Standard 3-passer, most balanced
 * - Stack: Players grouped for approach lanes
 * - Spread: Wider positioning for defensive coverage
 *
 * Sources:
 * - Gold Medal Squared rotation guides
 * - Volleyball Vault 5-1 system analysis
 * - Art of Coaching Volleyball
 */
/*
 * COPY LENGTH IS A LAYOUT CONSTRAINT HERE, not a style preference. Each
 * `description` is the caption of a formation card and each `tradeoffs` is the
 * strip under the card grid. Measured at 390 (one column, ~56 characters per
 * line) and at 1440 (two columns, ~61): a caption of 76-98 characters set two
 * ragged lines averaging 35-38 characters, under the 45-75 measure band, on
 * every card. Held to 45-54 characters they set ONE full line at both widths.
 * The nuance that came off the caption is in `tradeoffs`, which is where a
 * reader comparing two shapes is looking anyway.
 */
export const FORMATIONS: Record<FormationType, FormationConfig> = {
  traditional: {
    id: 'traditional',
    name: 'Traditional',
    description: 'Balanced three-passer receive: OH1, OH2 and libero.',
    tradeoffs: 'Most consistent passing; fewer quick-attack looks.',
  },
  stack: {
    id: 'stack',
    name: 'Stack',
    description: 'Passers grouped one side to clear hitting lanes.',
    tradeoffs: 'Stronger attack options, but demands precise passing.',
  },
  spread: {
    id: 'spread',
    name: 'Spread',
    description: 'Wide positioning for maximum defensive coverage.',
    tradeoffs: 'Great coverage, but a longer transition to attack.',
  },
  rightSlant: {
    id: 'rightSlant',
    name: 'Right Slant',
    description: 'Passers shifted right against left-side serving.',
    tradeoffs: 'Protects a weak left-side passer; opens the right.',
  },
  leftSlant: {
    id: 'leftSlant',
    name: 'Left Slant',
    description: 'Passers shifted left against right-side serving.',
    tradeoffs: 'Protects a weak right-side passer; sets up the outside.',
  },
};

/**
 * Get all available formations
 */
export const getFormations = (): FormationConfig[] => {
  return Object.values(FORMATIONS);
};

/**
 * Get a specific formation config
 */
export const getFormation = (id: FormationType): FormationConfig => {
  return FORMATIONS[id];
};

/**
 * Get formation options for dropdown
 */
export const getFormationOptions = (): Array<{ value: FormationType; label: string }> => {
  return Object.values(FORMATIONS).map((f) => ({
    value: f.id,
    label: f.name,
  }));
};
