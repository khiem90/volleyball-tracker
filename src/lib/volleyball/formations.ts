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
 * COPY LENGTH IS A LAYOUT CONSTRAINT: each `description` is a card caption
 * that sets ONE full line at both card widths only when held to 45-54
 * characters. The nuance lives in `tradeoffs`.
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
