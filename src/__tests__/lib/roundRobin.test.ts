import { describe, it, expect } from 'vitest';
import {
  generateRoundRobinSchedule,
  calculateStandings,
} from '@/lib/roundRobin';
import type { CompetitionConfig } from '@/types/competition-config';
import { DEFAULT_TERMINOLOGY } from '@/types/competition-config';
import { makeMatch, pairKeys, shape, teamIds } from './fixtures';

/**
 * CHARACTERISATION suite — this pins what `src/lib/roundRobin.ts` does today,
 * not what it ought to do. Three assertions below are marked BUG: they encode
 * behaviour that is wrong but shipped, so a refactor cannot change it silently.
 */

const config = (overrides: Partial<CompetitionConfig>): CompetitionConfig => ({
  pointsForWin: 3,
  pointsForLoss: 0,
  allowTies: false,
  terminology: DEFAULT_TERMINOLOGY,
  ...overrides,
});

describe('generateRoundRobinSchedule', () => {
  it('returns nothing for zero teams', () => {
    expect(generateRoundRobinSchedule([], 'c')).toEqual([]);
  });

  it('returns nothing for a single team (its only pairing is the bye)', () => {
    expect(generateRoundRobinSchedule(teamIds(1), 'c')).toEqual([]);
  });

  it('produces exactly one match for two teams', () => {
    const matches = generateRoundRobinSchedule(teamIds(2), 'c');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({
      competitionId: 'c',
      homeTeamId: 't0',
      awayTeamId: 't1',
      homeScore: 0,
      awayScore: 0,
      status: 'pending',
      round: 1,
      position: 1,
    });
  });

  it('produces the exact circle-method order for four teams', () => {
    expect(shape(generateRoundRobinSchedule(teamIds(4), 'c'))).toEqual([
      'r1p1 t0vt3',
      'r1p2 t1vt2',
      'r2p1 t1vt3',
      'r2p2 t2vt0',
      'r3p1 t2vt3',
      'r3p2 t0vt1',
    ]);
  });

  it('pairs every team with every other exactly once at 4, 6 and 8 teams', () => {
    for (const count of [4, 6, 8]) {
      const matches = generateRoundRobinSchedule(teamIds(count), 'c');
      const expected = (count * (count - 1)) / 2;
      expect(matches).toHaveLength(expected);
      expect(new Set(pairKeys(matches)).size).toBe(expected);
    }
  });

  it('spreads an even field over n-1 rounds of n/2 matches', () => {
    const matches = generateRoundRobinSchedule(teamIds(6), 'c');
    const rounds = new Map<number, number>();
    matches.forEach((match) =>
      rounds.set(match.round, (rounds.get(match.round) ?? 0) + 1)
    );
    expect([...rounds.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect([...rounds.values()]).toEqual([3, 3, 3, 3, 3]);
  });

  it('drops the bye pairing for an odd field, still covering every pair', () => {
    const matches = generateRoundRobinSchedule(teamIds(3), 'c');
    expect(shape(matches)).toEqual(['r1p2 t1vt2', 'r2p2 t2vt0', 'r3p2 t0vt1']);
    expect(pairKeys(matches)).toEqual(['t0-t1', 't0-t2', 't1-t2']);
  });

  it('covers every pair for five teams across five rounds', () => {
    const matches = generateRoundRobinSchedule(teamIds(5), 'c');
    expect(matches).toHaveLength(10);
    expect(new Set(pairKeys(matches)).size).toBe(10);
    expect(new Set(matches.map((m) => m.round))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('BUG: an odd field never emits position 1, because the bye always sits in that slot', () => {
    // The placeholder is appended last and `match === 0` is pinned to the last
    // index, so slot 1 of every round is the bye and gets skipped. Positions
    // are therefore non-contiguous and any UI keying on `position === 1` for
    // "first match of the round" is wrong for odd fields.
    const three = generateRoundRobinSchedule(teamIds(3), 'c');
    const five = generateRoundRobinSchedule(teamIds(5), 'c');
    expect(new Set(three.map((m) => m.position))).toEqual(new Set([2]));
    expect(new Set(five.map((m) => m.position))).toEqual(new Set([2, 3]));
  });

  it('stamps every generated match pending, scoreless and on the competition', () => {
    const matches = generateRoundRobinSchedule(teamIds(6), 'comp-42');
    expect(matches.every((m) => m.status === 'pending')).toBe(true);
    expect(matches.every((m) => m.homeScore === 0 && m.awayScore === 0)).toBe(true);
    expect(matches.every((m) => m.competitionId === 'comp-42')).toBe(true);
  });
});

describe('calculateStandings', () => {
  it('returns one zeroed row per team, in input order, with no matches', () => {
    const standings = calculateStandings(teamIds(3), []);
    expect(standings.map((s) => s.teamId)).toEqual(['t0', 't1', 't2']);
    expect(standings[0]).toEqual({
      teamId: 't0',
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

  it('awards the default 3 for a win and 0 for a loss', () => {
    const standings = calculateStandings(
      teamIds(2),
      [
        makeMatch({
          homeTeamId: 't0',
          awayTeamId: 't1',
          homeScore: 21,
          awayScore: 15,
          status: 'completed',
        }),
      ]
    );
    expect(standings[0]).toMatchObject({
      teamId: 't0',
      played: 1,
      won: 1,
      lost: 0,
      pointsFor: 21,
      pointsAgainst: 15,
      pointsDiff: 6,
      competitionPoints: 3,
    });
    expect(standings[1]).toMatchObject({
      teamId: 't1',
      played: 1,
      won: 0,
      lost: 1,
      pointsDiff: -6,
      competitionPoints: 0,
    });
  });

  it('ignores pending and in-progress matches', () => {
    const standings = calculateStandings(teamIds(2), [
      makeMatch({ homeTeamId: 't0', awayTeamId: 't1', homeScore: 9, awayScore: 1, status: 'pending' }),
      makeMatch({ homeTeamId: 't0', awayTeamId: 't1', homeScore: 9, awayScore: 1, status: 'in_progress' }),
    ]);
    expect(standings.every((s) => s.played === 0)).toBe(true);
  });

  it('honours a custom points system', () => {
    const standings = calculateStandings(
      teamIds(2),
      [
        makeMatch({
          homeTeamId: 't0',
          awayTeamId: 't1',
          homeScore: 2,
          awayScore: 0,
          status: 'completed',
        }),
      ],
      config({ pointsForWin: 2, pointsForLoss: 1 })
    );
    expect(standings[0].competitionPoints).toBe(2);
    expect(standings[1].competitionPoints).toBe(1);
  });

  it('records a draw when ties are allowed', () => {
    const standings = calculateStandings(
      teamIds(2),
      [
        makeMatch({
          homeTeamId: 't0',
          awayTeamId: 't1',
          homeScore: 10,
          awayScore: 10,
          status: 'completed',
        }),
      ],
      config({ allowTies: true, pointsForTie: 1 })
    );
    expect(standings.map((s) => [s.tied, s.competitionPoints])).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });

  it('defaults pointsForTie to 0 even when ties are allowed', () => {
    const standings = calculateStandings(
      teamIds(2),
      [
        makeMatch({
          homeTeamId: 't0',
          awayTeamId: 't1',
          homeScore: 10,
          awayScore: 10,
          status: 'completed',
        }),
      ],
      config({ allowTies: true })
    );
    expect(standings.map((s) => [s.tied, s.competitionPoints])).toEqual([
      [1, 0],
      [1, 0],
    ]);
  });

  it('BUG: a drawn match with ties disallowed counts as played but as neither W, L nor T', () => {
    // `played` is incremented before the outcome branch, and the `else if
    // (allowTies)` has no `else`, so the ledger no longer satisfies
    // played === won + lost + tied.
    const standings = calculateStandings(teamIds(2), [
      makeMatch({
        homeTeamId: 't0',
        awayTeamId: 't1',
        homeScore: 10,
        awayScore: 10,
        status: 'completed',
      }),
    ]);
    expect(standings[0]).toMatchObject({ played: 1, won: 0, lost: 0, tied: 0, competitionPoints: 0 });
    expect(standings[0].won + standings[0].lost + standings[0].tied).not.toBe(
      standings[0].played
    );
  });

  it('BUG: winnerId is ignored — an instant win recorded 0-0 scores as no result', () => {
    const standings = calculateStandings(teamIds(2), [
      makeMatch({
        homeTeamId: 't0',
        awayTeamId: 't1',
        homeScore: 0,
        awayScore: 0,
        status: 'completed',
        winnerId: 't0',
      }),
    ]);
    expect(standings[0]).toMatchObject({ played: 1, won: 0, lost: 0, competitionPoints: 0 });
  });

  it('drops a whole match when either side is outside the ranked team list', () => {
    const standings = calculateStandings(teamIds(2), [
      makeMatch({
        homeTeamId: 't0',
        awayTeamId: 'deleted-team',
        homeScore: 21,
        awayScore: 3,
        status: 'completed',
      }),
    ]);
    expect(standings.every((s) => s.played === 0)).toBe(true);
  });

  it('excludes bye matches as a side effect of the empty opponent id', () => {
    const standings = calculateStandings(teamIds(2), [
      makeMatch({
        homeTeamId: 't0',
        awayTeamId: '',
        homeScore: 1,
        awayScore: 0,
        status: 'completed',
        isBye: true,
        winnerId: 't0',
      }),
    ]);
    expect(standings[0].played).toBe(0);
  });

  it('orders by competition points, then point difference', () => {
    const matches = [
      makeMatch({ id: 'm1', homeTeamId: 't0', awayTeamId: 't1', homeScore: 21, awayScore: 10, status: 'completed' }),
      makeMatch({ id: 'm2', homeTeamId: 't2', awayTeamId: 't3', homeScore: 21, awayScore: 19, status: 'completed' }),
      makeMatch({ id: 'm3', homeTeamId: 't0', awayTeamId: 't2', homeScore: 21, awayScore: 15, status: 'completed' }),
      makeMatch({ id: 'm4', homeTeamId: 't1', awayTeamId: 't3', homeScore: 21, awayScore: 5, status: 'completed' }),
    ];
    const standings = calculateStandings(teamIds(4), matches);
    expect(standings.map((s) => s.teamId)).toEqual(['t0', 't1', 't2', 't3']);
    expect(standings.map((s) => s.competitionPoints)).toEqual([6, 3, 3, 0]);
    expect(standings.map((s) => s.pointsDiff)).toEqual([17, 10, -4, -18]);
  });

  it('breaks a points+difference tie on points for, then keeps input order', () => {
    const matches = [
      makeMatch({ id: 'm1', homeTeamId: 't0', awayTeamId: 't1', homeScore: 21, awayScore: 11, status: 'completed' }),
      makeMatch({ id: 'm2', homeTeamId: 't2', awayTeamId: 't3', homeScore: 11, awayScore: 1, status: 'completed' }),
      makeMatch({ id: 'm3', homeTeamId: 't1', awayTeamId: 't0', homeScore: 30, awayScore: 20, status: 'completed' }),
      makeMatch({ id: 'm4', homeTeamId: 't3', awayTeamId: 't2', homeScore: 20, awayScore: 10, status: 'completed' }),
    ];
    const standings = calculateStandings(teamIds(4), matches);
    expect(standings.map((s) => s.competitionPoints)).toEqual([3, 3, 3, 3]);
    expect(standings.map((s) => s.pointsDiff)).toEqual([0, 0, 0, 0]);
    expect(standings.map((s) => s.pointsFor)).toEqual([41, 41, 21, 21]);
    // t0 before t1 and t2 before t3 is the input order surviving a stable sort.
    expect(standings.map((s) => s.teamId)).toEqual(['t0', 't1', 't2', 't3']);
  });
});
