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
export const FORMATIONS: Record<FormationType, FormationConfig> = {
  traditional: {
    id: 'traditional',
    name: 'Traditional',
    description: 'Standard 3-passer serve-receive formation with OH1, OH2, and Libero passing.',
    tradeoffs: 'Most balanced. Good for consistent serve-receive but can limit quick attack options.',
  },
  stack: {
    id: 'stack',
    name: 'Stack',
    description: 'Players grouped to one side to create clear approach lanes for hitters. Used by Olympic teams.',
    tradeoffs: 'Better attack options but requires precise passing. Vulnerable to short serves.',
  },
  spread: {
    id: 'spread',
    name: 'Spread',
    description: 'Wider positioning for maximum court coverage and defensive readiness.',
    tradeoffs: 'Good court coverage but longer transition to attack positions.',
  },
  rightSlant: {
    id: 'rightSlant',
    name: 'Right Slant',
    description: 'Passers shifted toward the right side. Good when opponents target left side.',
    tradeoffs: 'Protects weak left-side passer. May leave right side vulnerable.',
  },
  leftSlant: {
    id: 'leftSlant',
    name: 'Left Slant',
    description: 'Passers shifted toward the left side. Good when opponents target right side.',
    tradeoffs: 'Protects weak right-side passer. Sets up outside hitter approach from left.',
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
