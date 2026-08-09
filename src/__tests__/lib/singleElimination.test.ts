import { describe, it, expect } from 'vitest';
import {
  generateSingleEliminationBracket,
  advanceWinner,
  getPlayInMatchCount,
  getRoundName,
  getTotalRounds,
} from '@/lib/singleElimination';
import { asMatch, shape, teamIds } from './fixtures';

/**
 * CHARACTERISATION suite for `src/lib/singleElimination.ts`.
 * Bracket shape, seeding order, bye placement and advancement are all pinned
 * exactly, because W4 rewrites the renderer on top of this data.
 */

describe('getTotalRounds', () => {
  it('rounds the field up to the next power of two', () => {
    expect([2, 3, 4, 5, 8, 11, 16].map(getTotalRounds)).toEqual([1, 2, 2, 3, 3, 4, 4]);
  });
});

describe('getPlayInMatchCount', () => {
  it('counts the teams above the previous power of two', () => {
    expect([1, 2, 3, 5, 6, 7, 8, 11].map(getPlayInMatchCount)).toEqual([
      0, 0, 1, 1, 2, 3, 0, 3,
    ]);
  });
});

describe('getRoundName', () => {
  it('names the last three rounds and numbers the rest', () => {
    expect(getRoundName(3, 3)).toBe('Finals');
    expect(getRoundName(2, 3)).toBe('Semi-Finals');
    expect(getRoundName(1, 3)).toBe('Quarter-Finals');
    expect(getRoundName(1, 4)).toBe('Round 1');
    expect(getRoundName(1, 1)).toBe('Finals');
  });
});

describe('generateSingleEliminationBracket', () => {
  it('refuses a field smaller than two', () => {
    expect(() => generateSingleEliminationBracket(teamIds(1), 'c')).toThrow(
      'Need at least 2 teams for single elimination'
    );
    expect(() => generateSingleEliminationBracket([], 'c')).toThrow();
  });

  it('produces a single final for two teams', () => {
    expect(shape(generateSingleEliminationBracket(teamIds(2), 'c'))).toEqual([
      'r1p1 t0vt1',
    ]);
  });

  it('seeds four teams 1v4 / 2v3 and leaves the final empty', () => {
    expect(shape(generateSingleEliminationBracket(teamIds(4), 'c'))).toEqual([
      'r1p1 t0vt3',
      'r1p2 t1vt2',
      'r2p1 -v-',
    ]);
  });

  it('seeds eight teams 1v8 / 4v5 / 2v7 / 3v6', () => {
    const matches = generateSingleEliminationBracket(teamIds(8), 'c');
    expect(matches).toHaveLength(7);
    expect(shape(matches).slice(0, 4)).toEqual([
      'r1p1 t0vt7',
      'r1p2 t3vt4',
      'r1p3 t1vt6',
      'r1p4 t2vt5',
    ]);
    expect(shape(matches).slice(4)).toEqual(['r2p1 -v-', 'r2p2 -v-', 'r3p1 -v-']);
  });

  it('gives the top seed a completed bye at three teams and pre-fills round two', () => {
    const matches = generateSingleEliminationBracket(teamIds(3), 'c');
    expect(shape(matches)).toEqual(['r1p1 t0v-', 'r1p2 t1vt2', 'r2p1 t0v-']);
    expect(matches[0]).toMatchObject({
      status: 'completed',
      isBye: true,
      winnerId: 't0',
      homeScore: 1,
      awayScore: 0,
    });
    expect(matches[1].status).toBe('pending');
  });

  it('places three byes for five teams and pre-fills both round-two slots it can', () => {
    const matches = generateSingleEliminationBracket(teamIds(5), 'c');
    expect(shape(matches)).toEqual([
      'r1p1 t0v-',
      'r1p2 t3vt4',
      'r1p3 t1v-',
      'r1p4 t2v-',
      'r2p1 t0v-',
      'r2p2 t1vt2',
      'r3p1 -v-',
    ]);
    expect(matches.filter((m) => m.isBye)).toHaveLength(3);
    expect(matches.filter((m) => m.status === 'completed')).toHaveLength(3);
  });

  it('scores a bye 1-0 to whichever side is real', () => {
    const [bye] = generateSingleEliminationBracket(teamIds(3), 'c');
    expect(bye.homeTeamId).toBe('t0');
    expect(bye.awayTeamId).toBe('');
    expect([bye.homeScore, bye.awayScore]).toEqual([1, 0]);
  });

  it('reorders the field so nominated teams receive the byes', () => {
    const matches = generateSingleEliminationBracket(teamIds(5), 'c', [
      't4',
      't3',
      't2',
    ]);
    expect(shape(matches)).toEqual([
      'r1p1 t4v-',
      'r1p2 t0vt1',
      'r1p3 t3v-',
      'r1p4 t2v-',
      'r2p1 t4v-',
      'r2p2 t3vt2',
      'r3p1 -v-',
    ]);
  });

  it('ignores a bye list whose length does not match the bye count', () => {
    const matches = generateSingleEliminationBracket(teamIds(5), 'c', ['t4']);
    expect(shape(matches).slice(0, 4)).toEqual([
      'r1p1 t0v-',
      'r1p2 t3vt4',
      'r1p3 t1v-',
      'r1p4 t2v-',
    ]);
  });

  it('emits 2^k - 1 matches for a power-of-two field', () => {
    expect(generateSingleEliminationBracket(teamIds(2), 'c')).toHaveLength(1);
    expect(generateSingleEliminationBracket(teamIds(4), 'c')).toHaveLength(3);
    expect(generateSingleEliminationBracket(teamIds(8), 'c')).toHaveLength(7);
    expect(generateSingleEliminationBracket(teamIds(16), 'c')).toHaveLength(15);
  });
});

describe('advanceWinner', () => {
  const bracket = () =>
    generateSingleEliminationBracket(teamIds(4), 'c').map((match, index) =>
      asMatch(match, { id: `m${index}` })
    );

  it('drops an odd position into the home slot of the next round', () => {
    const matches = bracket();
    const advanced = advanceWinner(matches, matches[0], 't0');
    expect(shape(advanced)).toEqual(['r1p1 t0vt3', 'r1p2 t1vt2', 'r2p1 t0v-']);
  });

  it('drops an even position into the away slot of the next round', () => {
    const matches = bracket();
    const advanced = advanceWinner(matches, matches[1], 't2');
    expect(shape(advanced)).toEqual(['r1p1 t0vt3', 'r1p2 t1vt2', 'r2p1 -vt2']);
  });

  it('fills both slots when both feeder matches resolve', () => {
    const matches = bracket();
    const advanced = advanceWinner(
      advanceWinner(matches, matches[0], 't0'),
      matches[1],
      't2'
    );
    expect(shape(advanced)).toEqual(['r1p1 t0vt3', 'r1p2 t1vt2', 'r2p1 t0vt2']);
  });

  it('returns the same array reference for a final, so nothing downstream changes', () => {
    const matches = bracket();
    expect(advanceWinner(matches, matches[2], 't0')).toBe(matches);
  });

  it('does not mark the completed match as completed or set its winner', () => {
    // Advancement only writes the *next* match. Status and winnerId are the
    // caller's job (`useMatchPage.handleCompleteMatch`).
    const matches = bracket();
    const advanced = advanceWinner(matches, matches[0], 't0');
    expect(advanced[0].status).toBe('pending');
    expect(advanced[0].winnerId).toBeUndefined();
  });

  it('treats the deepest round present as the final, even mid-generation', () => {
    const onlyRoundOne = bracket().filter((match) => match.round === 1);
    expect(advanceWinner(onlyRoundOne, onlyRoundOne[0], 't0')).toBe(onlyRoundOne);
  });
});
