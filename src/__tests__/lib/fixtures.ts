import type { Match } from '@/types/game';

/**
 * Shared builders for the engine characterisation suites.
 * Not a test file — `vitest.config.ts` only collects `*.test.ts`.
 */

/** `teamIds(4)` -> `["t0", "t1", "t2", "t3"]`. */
export const teamIds = (count: number, prefix = 't'): string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}${index}`);

const BASE_MATCH: Match = {
  id: 'm',
  competitionId: 'c',
  homeTeamId: '',
  awayTeamId: '',
  homeScore: 0,
  awayScore: 0,
  status: 'pending',
  round: 1,
  position: 1,
  createdAt: 0,
};

/** A `Match` with every required field filled, overridable field by field. */
export const makeMatch = (overrides: Partial<Match> = {}): Match => ({
  ...BASE_MATCH,
  ...overrides,
});

/** Promote a generator's `Omit<Match, "id" | "createdAt">` to a full `Match`. */
export const asMatch = (
  generated: Omit<Match, 'id' | 'createdAt'>,
  overrides: Partial<Match> = {}
): Match => ({ ...BASE_MATCH, ...generated, ...overrides });

/** `"r1p2 t0vt3"` — a stable one-line shape for whole-schedule assertions. */
export const shape = (
  matches: readonly Omit<Match, 'id' | 'createdAt'>[]
): string[] =>
  matches.map(
    (match) =>
      `r${match.round}p${match.position} ${match.homeTeamId || '-'}v${match.awayTeamId || '-'}`
  );

/** Same as `shape`, prefixed with the double-elimination bracket name. */
export const bracketShape = (
  matches: readonly Omit<Match, 'id' | 'createdAt'>[]
): string[] =>
  matches.map(
    (match) =>
      `${match.bracket ?? 'none'} r${match.round}p${match.position} ${match.homeTeamId || '-'}v${match.awayTeamId || '-'}`
  );

/** Every unordered pairing in a schedule, sorted, for "plays everyone once". */
export const pairKeys = (
  matches: readonly Omit<Match, 'id' | 'createdAt'>[]
): string[] =>
  matches
    .map((match) => [match.homeTeamId, match.awayTeamId].sort().join('-'))
    .sort();
