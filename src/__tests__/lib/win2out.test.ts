import { describe, it, expect } from 'vitest';
import {
  initializeWin2OutState,
  generateInitialMatches,
  processMatchResult,
  getTeamsByStatus,
  getCurrentChampionStreak,
  getChampionCount,
} from '@/lib/win2out';
import type { Match, Win2OutState } from '@/types/game';
import { asMatch, teamIds } from './fixtures';

/**
 * CHARACTERISATION suite for `src/lib/win2out.ts` (endless king-of-the-court).
 *
 * Two quirks are pinned deliberately:
 *  - a champion's streak is reset to 0 the moment it reaches 2, so `winStreak`
 *    is only ever 0 or 1 and `getCurrentChampionStreak` can never return 2;
 *  - `Win2OutTeamStatus.eliminatedAt` is repurposed as the crown counter.
 */

const win = (match: Omit<Match, 'id' | 'createdAt'>, winnerId: string, id: string): Match =>
  asMatch(match, { id, winnerId, status: 'completed' });

/** Drive one court from the initial state through a list of winner ids. */
const play = (state: Win2OutState, first: Match, winners: string[]) => {
  let current = state;
  let match: Match = first;
  const steps: { queue: string[]; courts: Win2OutState['courts']; next: Omit<Match, 'id' | 'createdAt'> | null }[] = [];

  winners.forEach((winnerId, index) => {
    const result = processMatchResult(current, { ...match, winnerId, status: 'completed' });
    current = result.updatedState;
    steps.push({ queue: result.updatedState.queue, courts: result.updatedState.courts, next: result.nextMatch });
    if (result.nextMatch) match = asMatch(result.nextMatch, { id: `n${index}` });
  });

  return { state: current, steps };
};

describe('initializeWin2OutState', () => {
  it('seats two teams per court in input order and queues the rest', () => {
    const state = initializeWin2OutState('c', teamIds(5), 2);
    expect(state.courts).toEqual([
      { courtNumber: 1, teamIds: ['t0', 't1'], currentChampionId: undefined },
      { courtNumber: 2, teamIds: ['t2', 't3'], currentChampionId: undefined },
    ]);
    expect(state.queue).toEqual(['t4']);
    expect(state.numberOfCourts).toBe(2);
    expect(state.isComplete).toBe(false);
    expect(state.currentChampionId).toBeUndefined();
  });

  it('zeroes every team status and stamps the court for seated teams only', () => {
    const state = initializeWin2OutState('c', teamIds(3), 1);
    expect(state.teamStatuses).toEqual([
      { teamId: 't0', winStreak: 0, isEliminated: false, matchesPlayed: 0, currentCourt: 1 },
      { teamId: 't1', winStreak: 0, isEliminated: false, matchesPlayed: 0, currentCourt: 1 },
      { teamId: 't2', winStreak: 0, isEliminated: false, matchesPlayed: 0, currentCourt: undefined },
    ]);
  });

  it('refuses a field that cannot fill the requested courts', () => {
    expect(() => initializeWin2OutState('c', teamIds(3), 2)).toThrow(
      'Win 2 & Out with 2 court(s) requires at least 4 teams'
    );
    expect(() => initializeWin2OutState('c', teamIds(1), 1)).toThrow();
  });

  it('BUG: the maxCourts clamp is unreachable — the guard throws first', () => {
    // `numberOfCourts * 2 <= teamIds.length` already implies
    // `numberOfCourts <= floor(teamIds.length / 2)`, so `Math.min` never bites
    // and an over-large court count is an exception rather than a clamp. The
    // wizard must clamp before calling (charter W3 acceptance 4).
    expect(() => initializeWin2OutState('c', teamIds(5), 9)).toThrow(
      'requires at least 18 teams'
    );
    expect(generateInitialMatches('c', teamIds(5), 9)).toHaveLength(2);
  });
});

describe('generateInitialMatches', () => {
  it('emits one pending match per court, positioned by court number', () => {
    expect(generateInitialMatches('c', teamIds(5), 2)).toEqual([
      { competitionId: 'c', homeTeamId: 't0', awayTeamId: 't1', homeScore: 0, awayScore: 0, status: 'pending', round: 1, position: 1 },
      { competitionId: 'c', homeTeamId: 't2', awayTeamId: 't3', homeScore: 0, awayScore: 0, status: 'pending', round: 1, position: 2 },
    ]);
  });

  it('clamps silently rather than throwing, unlike initializeWin2OutState', () => {
    expect(generateInitialMatches('c', teamIds(2), 4)).toHaveLength(1);
    expect(generateInitialMatches('c', [], 1)).toEqual([]);
  });
});

describe('processMatchResult', () => {
  it('keeps the winner on court and pulls the next challenger from the queue', () => {
    const state = initializeWin2OutState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    const result = processMatchResult(state, win(first, 't0', 'm1'));

    expect(result.newChampions).toEqual([]);
    expect(result.updatedState.queue).toEqual(['t3', 't1']);
    expect(result.updatedState.courts).toEqual([
      { courtNumber: 1, teamIds: ['t0', 't2'], currentChampionId: 't0' },
    ]);
    expect(result.nextMatch).toEqual({
      competitionId: 'c',
      homeTeamId: 't0',
      awayTeamId: 't2',
      homeScore: 0,
      awayScore: 0,
      status: 'pending',
      round: 2,
      position: 1,
    });
  });

  it('sends the loser to the back of the queue before the challenger is drawn', () => {
    const state = initializeWin2OutState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    const { updatedState } = processMatchResult(state, win(first, 't0', 'm1'));
    // queue was [t2, t3]; loser t1 pushed -> [t2, t3, t1]; t2 drawn -> [t3, t1]
    expect(updatedState.queue).toEqual(['t3', 't1']);
    expect(updatedState.teamStatuses.find((s) => s.teamId === 't1')).toMatchObject({
      winStreak: 0,
      matchesPlayed: 1,
      currentCourt: undefined,
    });
  });

  it('crowns a champion on the second straight win and queues them behind the loser', () => {
    const state = initializeWin2OutState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    const { state: after, steps } = play(state, asMatch(first, { id: 'm1' }), ['t0', 't0']);

    expect(steps[1].next).toMatchObject({ homeTeamId: 't3', awayTeamId: 't1', round: 3, position: 1 });
    expect(after.queue).toEqual(['t2', 't0']);
    expect(after.courts).toEqual([
      { courtNumber: 1, teamIds: ['t3', 't1'], currentChampionId: undefined },
    ]);
  });

  it('reports the new champion and increments its crown count', () => {
    const state = initializeWin2OutState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    const one = processMatchResult(state, win(first, 't0', 'm1'));
    const two = processMatchResult(one.updatedState, win(one.nextMatch!, 't0', 'm2'));

    expect(two.newChampions).toEqual(['t0']);
    expect(getChampionCount(two.updatedState, 't0')).toBe(1);
    expect(two.updatedState.teamStatuses.find((s) => s.teamId === 't0')).toMatchObject({
      winStreak: 0,
      matchesPlayed: 2,
      eliminatedAt: 1,
      currentCourt: undefined,
    });
  });

  it('BUG: winStreak resets on crowning, so it never exceeds 1', () => {
    const state = initializeWin2OutState('c', teamIds(6), 1);
    const first = generateInitialMatches('c', teamIds(6), 1)[0];
    const { state: after } = play(state, asMatch(first, { id: 'm1' }), ['t0', 't0', 't2', 't2']);
    expect(after.teamStatuses.every((status) => status.winStreak <= 1)).toBe(true);
  });

  it('reports the streak of the champion currently holding a court', () => {
    const state = initializeWin2OutState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    const one = processMatchResult(state, win(first, 't0', 'm1'));
    expect(getCurrentChampionStreak(one.updatedState, 1)).toBe(1);

    const two = processMatchResult(one.updatedState, win(one.nextMatch!, 't0', 'm2'));
    // The court was reset to two fresh teams, so it has no champion.
    expect(getCurrentChampionStreak(two.updatedState, 1)).toBe(0);
    expect(getCurrentChampionStreak(two.updatedState, 9)).toBe(0);
  });

  it('re-seats the same two teams when only they exist', () => {
    const state = initializeWin2OutState('c', teamIds(2), 1);
    const first = generateInitialMatches('c', teamIds(2), 1)[0];
    const result = processMatchResult(state, win(first, 't0', 'm1'));
    expect(result.updatedState.courts).toEqual([
      { courtNumber: 1, teamIds: ['t0', 't1'], currentChampionId: 't0' },
    ]);
    expect(result.updatedState.queue).toEqual([]);
    expect(result.nextMatch).toMatchObject({ homeTeamId: 't0', awayTeamId: 't1' });
  });

  it('advances only the court the match was played on', () => {
    const state = initializeWin2OutState('c', teamIds(6), 2);
    const [, courtTwo] = generateInitialMatches('c', teamIds(6), 2);
    const result = processMatchResult(state, win(courtTwo, 't2', 'm1'));
    expect(result.updatedState.courts[0]).toEqual({
      courtNumber: 1,
      teamIds: ['t0', 't1'],
      currentChampionId: undefined,
    });
    expect(result.updatedState.courts[1]).toEqual({
      courtNumber: 2,
      teamIds: ['t2', 't4'],
      currentChampionId: 't2',
    });
    expect(result.nextMatch?.position).toBe(2);
  });

  it('never marks the competition complete', () => {
    const state = initializeWin2OutState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    const { state: after } = play(state, asMatch(first, { id: 'm1' }), ['t0', 't0', 't3', 't3', 't1']);
    expect(after.isComplete).toBe(false);
  });

  it('throws without a winner id', () => {
    const state = initializeWin2OutState('c', teamIds(4), 1);
    const first = asMatch(generateInitialMatches('c', teamIds(4), 1)[0], { status: 'completed' });
    expect(() => processMatchResult(state, first)).toThrow('Match must have a winner');
  });

  it('throws when neither team is seated on a court', () => {
    const state = initializeWin2OutState('c', teamIds(4), 1);
    const offCourt = asMatch(
      { competitionId: 'c', homeTeamId: 't2', awayTeamId: 't3', homeScore: 1, awayScore: 0, status: 'completed', round: 1, position: 1 },
      { winnerId: 't2' }
    );
    expect(() => processMatchResult(state, offCourt)).toThrow(
      'Could not find court for this match'
    );
  });
});

describe('getTeamsByStatus', () => {
  it('splits the field into crowned, queued and seated', () => {
    const state = initializeWin2OutState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    const one = processMatchResult(state, win(first, 't0', 'm1'));
    const two = processMatchResult(one.updatedState, win(one.nextMatch!, 't0', 'm2'));

    const { championsData, inQueue, onCourt } = getTeamsByStatus(two.updatedState);
    expect(championsData.map((s) => [s.teamId, s.championCount])).toEqual([['t0', 1]]);
    expect(inQueue.map((s) => s.teamId)).toEqual(['t2', 't0']);
    expect(onCourt.map((s) => [s.teamId, s.courtNumber, s.isChampionOnCourt])).toEqual([
      ['t3', 1, false],
      ['t1', 1, false],
    ]);
  });

  it('reports nobody crowned at the start', () => {
    const { championsData, inQueue, onCourt } = getTeamsByStatus(
      initializeWin2OutState('c', teamIds(5), 2)
    );
    expect(championsData).toEqual([]);
    expect(inQueue.map((s) => s.teamId)).toEqual(['t4']);
    expect(onCourt).toHaveLength(4);
  });
});
