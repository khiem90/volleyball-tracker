import { describe, it, expect } from 'vitest';
import {
  rankTeams,
  tallyTeams,
  compareStandings,
  assignRanks,
  resolvePointsSystem,
} from '@/lib/standings';
import { calculateStandings } from '@/lib/roundRobin';
import type { Match, RoundRobinStanding } from '@/types/game';
import type { CompetitionConfig } from '@/types/competition-config';
import { DEFAULT_TERMINOLOGY } from '@/types/competition-config';
import { makeMatch, teamIds } from './fixtures';

/**
 * `src/lib/standings.ts` is new, so this suite is a SPECIFICATION, not a
 * characterisation — except for the final block, which pins the exact set of
 * differences from the legacy `roundRobin.calculateStandings` so the migration
 * described at the bottom of standings.ts can be reviewed as a diff.
 */

const config = (overrides: Partial<CompetitionConfig>): CompetitionConfig => ({
  pointsForWin: 3,
  pointsForLoss: 0,
  allowTies: false,
  terminology: DEFAULT_TERMINOLOGY,
  ...overrides,
});

const done = (
  homeTeamId: string,
  homeScore: number,
  awayScore: number,
  awayTeamId: string,
  extra: Partial<Match> = {}
) =>
  makeMatch({
    id: `${homeTeamId}-${awayTeamId}`,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    status: 'completed',
    ...extra,
  });

describe('resolvePointsSystem', () => {
  it('falls back to the 3/0/0 default with no config at all', () => {
    expect(resolvePointsSystem()).toEqual({
      pointsForWin: 3,
      pointsForTie: 0,
      pointsForLoss: 0,
      allowTies: false,
    });
  });

  it('zeroes the tie value when the competition forbids ties, whatever is configured', () => {
    expect(resolvePointsSystem(config({ pointsForTie: 5 }))).toMatchObject({
      pointsForTie: 0,
      allowTies: false,
    });
  });

  it('keeps a configured tie value when ties are allowed, defaulting it to 0', () => {
    expect(resolvePointsSystem(config({ allowTies: true, pointsForTie: 1 })).pointsForTie).toBe(1);
    expect(resolvePointsSystem(config({ allowTies: true })).pointsForTie).toBe(0);
  });

  it('accepts a partial config and fills only the holes', () => {
    expect(resolvePointsSystem({ pointsForWin: 2 })).toEqual({
      pointsForWin: 2,
      pointsForTie: 0,
      pointsForLoss: 0,
      allowTies: false,
    });
  });
});

describe('tallyTeams', () => {
  it('returns one zeroed row per team, in input order, with no matches', () => {
    const table = tallyTeams(['b', 'a', 'c'], []);
    expect(table.map((row) => row.teamId)).toEqual(['b', 'a', 'c']);
    expect(table[0]).toEqual({
      teamId: 'b',
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDiff: 0,
      competitionPoints: 0,
    });
  });

  it('returns nothing for an empty field', () => {
    expect(tallyTeams([], [done('t0', 1, 0, 't1')])).toEqual([]);
  });

  it('leaves a lone team on a zeroed row', () => {
    expect(tallyTeams(['t0'], [done('t0', 21, 3, 't1')])[0].played).toBe(0);
  });

  it('does not sort — that is rankTeams job', () => {
    const table = tallyTeams(teamIds(2), [done('t1', 21, 3, 't0')]);
    expect(table.map((row) => row.teamId)).toEqual(['t0', 't1']);
    expect(table[0].competitionPoints).toBe(0);
  });

  it('counts only completed matches', () => {
    const table = tallyTeams(teamIds(2), [
      makeMatch({ homeTeamId: 't0', awayTeamId: 't1', homeScore: 9, awayScore: 1, status: 'pending' }),
      makeMatch({ homeTeamId: 't0', awayTeamId: 't1', homeScore: 9, awayScore: 1, status: 'in_progress' }),
    ]);
    expect(table.every((row) => row.played === 0)).toBe(true);
  });

  it('skips a bye even when it is completed and names two real teams', () => {
    const table = tallyTeams(
      teamIds(2),
      [done('t0', 1, 0, 't1', { isBye: true, winnerId: 't0' })]
    );
    expect(table.every((row) => row.played === 0)).toBe(true);
  });

  it('drops a whole match when either side is outside the ranked field', () => {
    const table = tallyTeams(teamIds(2), [done('t0', 21, 3, 'deleted')]);
    expect(table.every((row) => row.played === 0)).toBe(true);
  });

  it('prefers winnerId over the scoreline, so an instant win counts', () => {
    const table = tallyTeams(teamIds(2), [done('t0', 0, 0, 't1', { winnerId: 't0' })]);
    expect(table[0]).toMatchObject({ played: 1, won: 1, lost: 0, tied: 0, competitionPoints: 3 });
    expect(table[1]).toMatchObject({ played: 1, won: 0, lost: 1, tied: 0, competitionPoints: 0 });
  });

  it('lets winnerId overrule a contradicting scoreline (a forfeit)', () => {
    const table = tallyTeams(teamIds(2), [done('t0', 25, 10, 't1', { winnerId: 't1' })]);
    expect(table[0]).toMatchObject({ won: 0, lost: 1, pointsFor: 25 });
    expect(table[1]).toMatchObject({ won: 1, lost: 0, pointsFor: 10 });
  });

  it('ignores a winnerId that names neither side and falls back to the score', () => {
    const table = tallyTeams(teamIds(2), [done('t0', 25, 10, 't1', { winnerId: 'ghost' })]);
    expect(table[0].won).toBe(1);
  });

  it('books a draw for both sides even when ties are forbidden', () => {
    const table = tallyTeams(teamIds(2), [done('t0', 15, 15, 't1')]);
    expect(table.map((row) => [row.tied, row.competitionPoints])).toEqual([
      [1, 0],
      [1, 0],
    ]);
  });

  it('pays the configured tie value only when ties are allowed', () => {
    const draw = [done('t0', 15, 15, 't1')];
    expect(
      tallyTeams(teamIds(2), draw, config({ allowTies: true, pointsForTie: 1 }))[0].competitionPoints
    ).toBe(1);
    expect(
      tallyTeams(teamIds(2), draw, config({ pointsForTie: 1 }))[0].competitionPoints
    ).toBe(0);
  });

  it('keeps played === won + lost + tied on every row, drawn or not', () => {
    const table = tallyTeams(teamIds(3), [
      done('t0', 15, 15, 't1'),
      done('t1', 21, 10, 't2'),
      done('t2', 0, 0, 't0', { winnerId: 't2' }),
    ]);
    expect(table.every((row) => row.won + row.lost + row.tied === row.played)).toBe(true);
    expect(table.map((row) => row.played)).toEqual([2, 2, 2]);
  });

  it('honours a custom points system for wins and losses', () => {
    const table = tallyTeams(
      teamIds(2),
      [done('t0', 2, 0, 't1')],
      config({ pointsForWin: 2, pointsForLoss: 1 })
    );
    expect(table.map((row) => row.competitionPoints)).toEqual([2, 1]);
  });

  it('accumulates points for, against and difference across several matches', () => {
    const table = tallyTeams(teamIds(2), [
      done('t0', 21, 10, 't1', { id: 'a' }),
      done('t1', 25, 20, 't0', { id: 'b' }),
    ]);
    expect(table[0]).toMatchObject({ played: 2, won: 1, lost: 1, pointsFor: 41, pointsAgainst: 35, pointsDiff: 6 });
    expect(table[1]).toMatchObject({ played: 2, won: 1, lost: 1, pointsFor: 35, pointsAgainst: 41, pointsDiff: -6 });
  });

  it('GOTCHA: a duplicated team id yields two references to one row', () => {
    // The map is keyed by id, so the second `set` wins and both output slots
    // read the same object. Callers must pass a de-duplicated field.
    const table = tallyTeams(['t0', 't0', 't1'], [done('t0', 21, 3, 't1')]);
    expect(table[0]).toBe(table[1]);
    expect(table[0].played).toBe(1);
  });
});

describe('compareStandings', () => {
  const row = (overrides: Partial<RoundRobinStanding>): RoundRobinStanding => ({
    teamId: 'x',
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointsDiff: 0,
    competitionPoints: 0,
    ...overrides,
  });

  it('puts more competition points first', () => {
    expect(compareStandings(row({ competitionPoints: 6 }), row({ competitionPoints: 3 }))).toBeLessThan(0);
  });

  it('falls to point difference, then points for, then wins', () => {
    const base = { competitionPoints: 3 };
    expect(compareStandings(row({ ...base, pointsDiff: 5 }), row({ ...base, pointsDiff: -5 }))).toBeLessThan(0);
    expect(compareStandings(row({ ...base, pointsFor: 40 }), row({ ...base, pointsFor: 10 }))).toBeLessThan(0);
    expect(compareStandings(row({ ...base, won: 2 }), row({ ...base, won: 1 }))).toBeLessThan(0);
  });

  it('returns 0 for two genuinely level rows, so a stable sort keeps input order', () => {
    expect(compareStandings(row({ teamId: 'a' }), row({ teamId: 'b' }))).toBe(0);
  });
});

describe('assignRanks', () => {
  const line = (teamId: string, competitionPoints: number) => ({
    teamId,
    played: 1,
    won: 0,
    lost: 0,
    tied: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointsDiff: 0,
    competitionPoints,
  });

  it('numbers a strictly ordered table 1..n with no shared ranks', () => {
    const ranked = assignRanks([line('a', 9), line('b', 6), line('c', 3)]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 3]);
    expect(ranked.every((row) => !row.sharesRank)).toBe(true);
  });

  it('shares a rank between level rows and skips the ones they consumed', () => {
    const ranked = assignRanks([line('a', 9), line('b', 6), line('c', 6), line('d', 3)]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 2, 4]);
    expect(ranked.map((row) => row.sharesRank)).toEqual([false, true, true, false]);
  });

  it('carries a shared rank through a run of three', () => {
    const ranked = assignRanks([line('a', 6), line('b', 6), line('c', 6), line('d', 1)]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 1, 1, 4]);
    expect(ranked.map((row) => row.sharesRank)).toEqual([true, true, true, false]);
  });

  it('handles empty and single-row tables', () => {
    expect(assignRanks([])).toEqual([]);
    expect(assignRanks([line('a', 3)])).toMatchObject([{ rank: 1, sharesRank: false }]);
  });

  it('does not mutate the rows it was given', () => {
    const rows = [line('a', 9), line('b', 6)];
    assignRanks(rows);
    expect(rows[0]).not.toHaveProperty('rank');
  });
});

describe('rankTeams', () => {
  it('orders by competition points, then difference, then points for', () => {
    const ranked = rankTeams(teamIds(4), [
      done('t0', 21, 10, 't1', { id: 'm1' }),
      done('t2', 21, 19, 't3', { id: 'm2' }),
      done('t0', 21, 15, 't2', { id: 'm3' }),
      done('t1', 21, 5, 't3', { id: 'm4' }),
    ]);
    expect(ranked.map((row) => row.teamId)).toEqual(['t0', 't1', 't2', 't3']);
    expect(ranked.map((row) => row.competitionPoints)).toEqual([6, 3, 3, 0]);
    expect(ranked.map((row) => row.pointsDiff)).toEqual([17, 5, -4, -18]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 3, 4]);
  });

  it('breaks a points-and-difference tie on points for', () => {
    const ranked = rankTeams(teamIds(4), [
      done('t0', 21, 11, 't1', { id: 'm1' }),
      done('t2', 11, 1, 't3', { id: 'm2' }),
      done('t1', 30, 20, 't0', { id: 'm3' }),
      done('t3', 20, 10, 't2', { id: 'm4' }),
    ]);
    expect(ranked.map((row) => row.pointsFor)).toEqual([41, 41, 21, 21]);
    expect(ranked.map((row) => row.teamId)).toEqual(['t0', 't1', 't2', 't3']);
    expect(ranked.map((row) => row.rank)).toEqual([1, 1, 3, 3]);
    expect(ranked.map((row) => row.sharesRank)).toEqual([true, true, true, true]);
  });

  it('uses wins as the fourth key when points, difference and points for are level', () => {
    // At 1-per-win and 1-per-tie, "won two" and "drew two" are worth the same.
    // Every scoreline is 10-10, so difference and points for are level too and
    // only `won` can separate them. `drawer` is passed FIRST, so input order
    // would put it top if wins were not a key.
    const ranked = rankTeams(
      ['drawer', 'winner', 'c', 'd'],
      [
        done('winner', 10, 10, 'c', { winnerId: 'winner' }),
        done('winner', 10, 10, 'd', { winnerId: 'winner' }),
        done('drawer', 10, 10, 'c'),
        done('drawer', 10, 10, 'd'),
      ],
      config({ pointsForWin: 1, allowTies: true, pointsForTie: 1 })
    );

    expect(ranked.map((row) => row.teamId)).toEqual(['winner', 'drawer', 'c', 'd']);
    expect(ranked.map((row) => row.competitionPoints)).toEqual([2, 2, 1, 1]);
    expect(ranked.map((row) => row.pointsDiff)).toEqual([0, 0, 0, 0]);
    expect(ranked.map((row) => row.pointsFor)).toEqual([20, 20, 20, 20]);
    expect(ranked.map((row) => row.won)).toEqual([2, 0, 0, 0]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 3, 3]);
  });

  it('keeps the caller order for a dead heat, so a live table and its summary agree', () => {
    const ranked = rankTeams(['b', 'a', 'c'], []);
    expect(ranked.map((row) => row.teamId)).toEqual(['b', 'a', 'c']);
    expect(ranked.map((row) => row.rank)).toEqual([1, 1, 1]);
    expect(ranked.every((row) => row.sharesRank)).toBe(true);
  });

  it('is deterministic: ranking the same field twice gives the same order', () => {
    const matches = [
      done('t0', 21, 10, 't1', { id: 'm1' }),
      done('t2', 21, 10, 't3', { id: 'm2' }),
    ];
    const first = rankTeams(teamIds(4), matches).map((row) => row.teamId);
    const second = rankTeams(teamIds(4), matches).map((row) => row.teamId);
    expect(first).toEqual(second);
  });

  it('does not mutate the matches array it was handed', () => {
    const matches = [done('t0', 21, 10, 't1')];
    const snapshot = JSON.stringify(matches);
    rankTeams(teamIds(2), matches);
    expect(JSON.stringify(matches)).toBe(snapshot);
  });

  it('copes with an empty field, a lone team and an empty schedule', () => {
    expect(rankTeams([], [])).toEqual([]);
    expect(rankTeams(['solo'], [])).toMatchObject([{ teamId: 'solo', rank: 1, played: 0 }]);
    expect(rankTeams(teamIds(2), []).map((row) => row.rank)).toEqual([1, 1]);
  });
});

describe('rankTeams vs the legacy calculateStandings', () => {
  /**
   * These four cases are the entire behavioural delta. Anything else must
   * agree, which the last case checks over a full round robin.
   */

  it('differs on byes: legacy counts a completed bye between two real teams', () => {
    const matches = [done('t0', 1, 0, 't1', { isBye: true, winnerId: 't0' })];
    expect(calculateStandings(teamIds(2), matches)[0].played).toBe(1);
    expect(rankTeams(teamIds(2), matches)[0].played).toBe(0);
  });

  it('differs on winnerId: legacy scores a 0-0 instant win as no result', () => {
    const matches = [done('t0', 0, 0, 't1', { winnerId: 't0' })];
    expect(calculateStandings(teamIds(2), matches)[0]).toMatchObject({ won: 0, competitionPoints: 0 });
    expect(rankTeams(teamIds(2), matches)[0]).toMatchObject({ won: 1, competitionPoints: 3 });
  });

  it('differs on draws with ties forbidden: legacy books neither W, L nor T', () => {
    const matches = [done('t0', 15, 15, 't1')];
    const legacy = calculateStandings(teamIds(2), matches)[0];
    const ranked = rankTeams(teamIds(2), matches)[0];
    expect(legacy).toMatchObject({ played: 1, tied: 0 });
    expect(legacy.won + legacy.lost + legacy.tied).not.toBe(legacy.played);
    expect(ranked).toMatchObject({ played: 1, tied: 1, competitionPoints: 0 });
    expect(ranked.won + ranked.lost + ranked.tied).toBe(ranked.played);
  });

  it('adds wins as a fourth tiebreaker where legacy stops at points for', () => {
    const rows = [
      { teamId: 'a', played: 3, won: 1, lost: 0, tied: 2, pointsFor: 10, pointsAgainst: 10, pointsDiff: 0, competitionPoints: 3 },
      { teamId: 'b', played: 3, won: 3, lost: 0, tied: 0, pointsFor: 10, pointsAgainst: 10, pointsDiff: 0, competitionPoints: 3 },
    ];
    expect(compareStandings(rows[0], rows[1])).toBeGreaterThan(0);
  });

  it('agrees with legacy on an ordinary decisive round robin', () => {
    const matches = [
      done('t0', 21, 10, 't1', { id: 'm1' }),
      done('t2', 21, 19, 't3', { id: 'm2' }),
      done('t0', 21, 15, 't2', { id: 'm3' }),
      done('t1', 21, 5, 't3', { id: 'm4' }),
      done('t0', 21, 8, 't3', { id: 'm5' }),
      done('t1', 21, 18, 't2', { id: 'm6' }),
    ];
    const legacy = calculateStandings(teamIds(4), matches);
    const ranked = rankTeams(teamIds(4), matches);
    expect(ranked.map((row) => row.teamId)).toEqual(legacy.map((row) => row.teamId));
    expect(ranked.map((row) => row.competitionPoints)).toEqual(
      legacy.map((row) => row.competitionPoints)
    );
    expect(ranked.map((row) => row.pointsDiff)).toEqual(legacy.map((row) => row.pointsDiff));
  });
});
