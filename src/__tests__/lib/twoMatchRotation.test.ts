import { describe, it, expect } from 'vitest';
import {
  initializeTwoMatchRotationState,
  generateInitialMatches,
  processMatchResult,
  getTeamsByStatus,
  getSessionMatchCount,
} from '@/lib/twoMatchRotation';
import type { Match, TwoMatchRotationState } from '@/types/game';
import { asMatch, teamIds } from './fixtures';

/**
 * CHARACTERISATION suite for `src/lib/twoMatchRotation.ts`.
 *
 * The format's headline rule ("play two, then rotate") is implemented with a
 * four-way branch whose third arm keeps the *loser* on court. Three findings
 * are pinned as BUG/GAP below:
 *   - after the opening match, a team that reaches two session matches rotates
 *     out even when it just won, and its beaten opponent inherits the court;
 *   - the both-teams-rotate arm is unreachable through `processMatchResult`
 *     alone, because every challenger arrives from the queue on 0;
 *   - the court-removal and queue-restore arms are dead: the queue is always
 *     long enough by the time it is read.
 */

const win = (
  match: Omit<Match, 'id' | 'createdAt'>,
  winnerId: string,
  id: string
): Match => asMatch(match, { id, winnerId, status: 'completed' });

/** Drive one court from its opening match through a list of winner ids. */
const play = (
  state: TwoMatchRotationState,
  first: Omit<Match, 'id' | 'createdAt'>,
  winners: string[]
) => {
  let current = state;
  let match = first;
  const steps: {
    queue: string[];
    courts: TwoMatchRotationState['courts'];
    next: Omit<Match, 'id' | 'createdAt'> | null;
  }[] = [];

  winners.forEach((winnerId, index) => {
    const result = processMatchResult(current, win(match, winnerId, `m${index}`));
    current = result.updatedState;
    steps.push({
      queue: result.updatedState.queue,
      courts: result.updatedState.courts,
      next: result.nextMatch,
    });
    if (result.nextMatch) match = result.nextMatch;
  });

  return { state: current, steps };
};

const courtOf = (state: TwoMatchRotationState, courtNumber = 1) =>
  state.courts.find((c) => c.courtNumber === courtNumber);

const statusOf = (state: TwoMatchRotationState, teamId: string) =>
  state.teamStatuses.find((s) => s.teamId === teamId)!;

describe('initializeTwoMatchRotationState', () => {
  it('seats two teams per court in input order and queues the rest', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(5), 2);
    expect(state.courts).toEqual([
      { courtNumber: 1, teamIds: ['t0', 't1'], isFirstMatch: true },
      { courtNumber: 2, teamIds: ['t2', 't3'], isFirstMatch: true },
    ]);
    expect(state.queue).toEqual(['t4']);
    expect(state.numberOfCourts).toBe(2);
    expect(state.isComplete).toBe(false);
    expect(state.competitionId).toBe('c');
  });

  it('zeroes every counter and stamps the court for seated teams only', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(3), 1);
    expect(state.teamStatuses).toEqual([
      { teamId: 't0', sessionMatches: 0, totalMatches: 0, totalWins: 0, totalLosses: 0, currentCourt: 1 },
      { teamId: 't1', sessionMatches: 0, totalMatches: 0, totalWins: 0, totalLosses: 0, currentCourt: 1 },
      { teamId: 't2', sessionMatches: 0, totalMatches: 0, totalWins: 0, totalLosses: 0, currentCourt: undefined },
    ]);
  });

  it('refuses a field that cannot fill the requested courts', () => {
    expect(() => initializeTwoMatchRotationState('c', teamIds(3), 2)).toThrow(
      'Two Match Rotation with 2 court(s) requires at least 4 teams'
    );
    expect(() => initializeTwoMatchRotationState('c', teamIds(1), 1)).toThrow();
  });

  it('BUG: the maxCourts clamp is unreachable — the guard throws first', () => {
    // `numberOfCourts * 2 <= teamIds.length` already implies
    // `numberOfCourts <= floor(teamIds.length / 2)`, so `Math.min` never bites.
    // An over-large court count is an exception, not a clamp; the wizard has to
    // clamp before calling. `generateInitialMatches` clamps instead of throwing,
    // so the two entry points disagree on the same input.
    expect(() => initializeTwoMatchRotationState('c', teamIds(5), 9)).toThrow(
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

  it('clamps silently rather than throwing', () => {
    expect(generateInitialMatches('c', teamIds(2), 4)).toHaveLength(1);
    expect(generateInitialMatches('c', [], 1)).toEqual([]);
  });
});

describe('processMatchResult — the opening match on a court', () => {
  const opening = () => {
    const state = initializeTwoMatchRotationState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    return processMatchResult(state, win(first, 't0', 'm1'));
  };

  it('keeps the winner on court and draws the next challenger from the queue', () => {
    const { updatedState, nextMatch } = opening();
    expect(courtOf(updatedState)).toEqual({
      courtNumber: 1,
      teamIds: ['t0', 't2'],
      isFirstMatch: false,
    });
    expect(nextMatch).toEqual({
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

  it('pushes the loser behind the queue before the challenger is drawn', () => {
    const { updatedState } = opening();
    // queue was [t2, t3]; loser t1 pushed -> [t2, t3, t1]; t2 drawn -> [t3, t1]
    expect(updatedState.queue).toEqual(['t3', 't1']);
  });

  it('banks the result for both sides but resets only the loser to the bench', () => {
    const { updatedState } = opening();
    expect(statusOf(updatedState, 't0')).toEqual({
      teamId: 't0', sessionMatches: 1, totalMatches: 1, totalWins: 1, totalLosses: 0, currentCourt: 1,
    });
    expect(statusOf(updatedState, 't1')).toEqual({
      teamId: 't1', sessionMatches: 0, totalMatches: 1, totalWins: 0, totalLosses: 1, currentCourt: undefined,
    });
    expect(statusOf(updatedState, 't2').currentCourt).toBe(1);
  });

  it('clears isFirstMatch so the court never takes the opening branch twice', () => {
    expect(courtOf(opening().updatedState)?.isFirstMatch).toBe(false);
  });

  it('advances only the court the match was played on', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(6), 2);
    const [, courtTwo] = generateInitialMatches('c', teamIds(6), 2);
    const { updatedState, nextMatch } = processMatchResult(state, win(courtTwo, 't2', 'm1'));

    expect(courtOf(updatedState, 1)).toEqual({
      courtNumber: 1,
      teamIds: ['t0', 't1'],
      isFirstMatch: true,
    });
    expect(courtOf(updatedState, 2)).toEqual({
      courtNumber: 2,
      teamIds: ['t2', 't4'],
      isFirstMatch: false,
    });
    expect(nextMatch?.position).toBe(2);
  });
});

describe('processMatchResult — after the opening match', () => {
  const twoDeep = () => {
    const state = initializeTwoMatchRotationState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    return processMatchResult(state, win(first, 't0', 'm1'));
  };

  it('BUG: a winner on two session matches rotates out and the team it beat inherits the court', () => {
    // t0 won the opener and won again, reaching sessionMatches 2. The `else`
    // arm at twoMatchRotation.ts:219 then makes the *loser* the staying team,
    // so the court reads "t2 (just beaten) vs the next challenger" and the
    // two-game winner is benched. Any "winner stays" copy in the UI is wrong.
    const { updatedState, nextMatch } = twoDeep();
    const second = processMatchResult(updatedState, win(nextMatch!, 't0', 'm2'));

    expect(courtOf(second.updatedState)).toEqual({
      courtNumber: 1,
      teamIds: ['t2', 't3'],
      isFirstMatch: false,
    });
    expect(second.nextMatch).toMatchObject({ homeTeamId: 't2', awayTeamId: 't3', round: 3, position: 1 });
    expect(statusOf(second.updatedState, 't0')).toMatchObject({
      sessionMatches: 0,
      totalMatches: 2,
      totalWins: 2,
      currentCourt: undefined,
    });
    expect(statusOf(second.updatedState, 't2')).toMatchObject({
      sessionMatches: 1,
      totalLosses: 1,
      currentCourt: 1,
    });
  });

  it('produces the same court when the challenger wins instead, by the other branch', () => {
    // Mirror of the case above: the challenger stays because it is on 1, and
    // t0 rotates because it is on 2. Same court, opposite reason — which is
    // why the branch cannot be simplified away without a behaviour diff.
    const { updatedState, nextMatch } = twoDeep();
    const second = processMatchResult(updatedState, win(nextMatch!, 't2', 'm2'));

    expect(courtOf(second.updatedState)?.teamIds).toEqual(['t2', 't3']);
    expect(statusOf(second.updatedState, 't0')).toMatchObject({
      sessionMatches: 0,
      totalWins: 1,
      totalLosses: 1,
      currentCourt: undefined,
    });
    expect(statusOf(second.updatedState, 't2')).toMatchObject({ sessionMatches: 1, totalWins: 1 });
  });

  it('GAP: the both-teams-rotate arm is unreachable through the normal flow', () => {
    // Every challenger is drawn from the queue with sessionMatches reset to 0,
    // so a court always holds exactly one team on 1 and one on 0. Two teams on
    // 2 therefore never meet, and the two-from-queue arm needs a hand-built
    // state to reach at all.
    let current = initializeTwoMatchRotationState('c', teamIds(6), 1);
    let match = generateInitialMatches('c', teamIds(6), 1)[0];

    for (let i = 0; i < 8; i++) {
      const result = processMatchResult(current, win(match, match.homeTeamId, `m${i}`));
      current = result.updatedState;
      const seated = current.courts[0].teamIds.map((id) => statusOf(current, id).sessionMatches);
      expect(seated.filter((n) => n >= 1)).toHaveLength(1);
      expect(current.teamStatuses.every((s) => s.sessionMatches <= 1)).toBe(true);
      match = result.nextMatch!;
    }
  });

  it('pulls two fresh teams when a hand-built state has both sides on two matches', () => {
    const state: TwoMatchRotationState = {
      competitionId: 'c',
      teamStatuses: [
        { teamId: 'a', sessionMatches: 1, totalMatches: 1, totalWins: 1, totalLosses: 0, currentCourt: 1 },
        { teamId: 'b', sessionMatches: 1, totalMatches: 1, totalWins: 0, totalLosses: 1, currentCourt: 1 },
        { teamId: 'c1', sessionMatches: 0, totalMatches: 0, totalWins: 0, totalLosses: 0, currentCourt: undefined },
        { teamId: 'd', sessionMatches: 0, totalMatches: 0, totalWins: 0, totalLosses: 0, currentCourt: undefined },
      ],
      queue: ['c1', 'd'],
      courts: [{ courtNumber: 1, teamIds: ['a', 'b'], isFirstMatch: false }],
      numberOfCourts: 1,
      isComplete: false,
    };
    const result = processMatchResult(
      state,
      asMatch(
        { competitionId: 'c', homeTeamId: 'a', awayTeamId: 'b', homeScore: 1, awayScore: 0, status: 'completed', round: 4, position: 1 },
        { id: 'm', winnerId: 'a' }
      )
    );

    expect(result.updatedState.courts[0].teamIds).toEqual(['c1', 'd']);
    // The winner is pushed before the loser here — the opposite of win2out,
    // where the loser is queued first and the crowned champion goes behind it.
    expect(result.updatedState.queue).toEqual(['a', 'b']);
    expect(result.nextMatch).toMatchObject({ homeTeamId: 'c1', awayTeamId: 'd', round: 5 });
    expect(statusOf(result.updatedState, 'a').currentCourt).toBeUndefined();
    expect(statusOf(result.updatedState, 'b').currentCourt).toBeUndefined();
  });
});

describe('processMatchResult — invariants across a long run', () => {
  it('never drops the court and never completes, over twelve matches', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(6), 1);
    const first = generateInitialMatches('c', teamIds(6), 1)[0];
    let current = state;
    let match = first;

    for (let i = 0; i < 12; i++) {
      const result = processMatchResult(current, win(match, match.homeTeamId, `m${i}`));
      current = result.updatedState;
      expect(result.nextMatch).not.toBeNull();
      expect(current.courts).toHaveLength(1);
      expect(current.isComplete).toBe(false);
      // every team is either on the court or in the queue, exactly once
      expect([...current.queue, ...current.courts[0].teamIds].sort()).toEqual(teamIds(6));
      match = result.nextMatch!;
    }

    const totals = current.teamStatuses.reduce((sum, s) => sum + s.totalMatches, 0);
    expect(totals).toBe(24);
  });

  it('re-seats the same two teams when only they exist', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(2), 1);
    const first = generateInitialMatches('c', teamIds(2), 1)[0];
    const { state: after, steps } = play(state, first, ['t0', 't0']);
    expect(steps[0].courts[0].teamIds).toEqual(['t0', 't1']);
    expect(after.courts[0].teamIds).toEqual(['t1', 't0']);
    expect(after.queue).toEqual([]);
  });

  it('advances the round number from the completed match, per court', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(6), 1);
    const first = generateInitialMatches('c', teamIds(6), 1)[0];
    const { steps } = play(state, first, ['t0', 't0', 't2']);
    expect(steps.map((s) => s.next?.round)).toEqual([2, 3, 4]);
    expect(steps.every((s) => s.next?.position === 1)).toBe(true);
  });

  it('throws without a winner id', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(4), 1);
    const first = asMatch(generateInitialMatches('c', teamIds(4), 1)[0], { status: 'completed' });
    expect(() => processMatchResult(state, first)).toThrow('Match must have a winner');
  });

  it('throws when the two teams are not seated on the same court', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(4), 1);
    const offCourt = asMatch(
      { competitionId: 'c', homeTeamId: 't2', awayTeamId: 't3', homeScore: 1, awayScore: 0, status: 'completed', round: 1, position: 1 },
      { winnerId: 't2' }
    );
    expect(() => processMatchResult(state, offCourt)).toThrow(
      'Could not find court for this match'
    );
  });
});

describe('getSessionMatchCount', () => {
  it('reports the live session counter and 0 for an unknown team', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    const { updatedState } = processMatchResult(state, win(first, 't0', 'm1'));

    expect(getSessionMatchCount(updatedState, 't0')).toBe(1);
    expect(getSessionMatchCount(updatedState, 't1')).toBe(0);
    expect(getSessionMatchCount(updatedState, 'nobody')).toBe(0);
  });
});

describe('getTeamsByStatus', () => {
  it('splits the field into seated and queued, and leaves the leaderboard empty at the start', () => {
    const { onCourt, inQueue, leaderboard } = getTeamsByStatus(
      initializeTwoMatchRotationState('c', teamIds(5), 2)
    );
    expect(onCourt.map((s) => [s.teamId, s.courtNumber, s.isFirstMatchOnCourt])).toEqual([
      ['t0', 1, true],
      ['t1', 1, true],
      ['t2', 2, true],
      ['t3', 2, true],
    ]);
    expect(inQueue.map((s) => s.teamId)).toEqual(['t4']);
    expect(leaderboard).toEqual([]);
  });

  it('ranks the leaderboard on wins, then win rate, and hides teams yet to play', () => {
    const state = initializeTwoMatchRotationState('c', teamIds(4), 1);
    const first = generateInitialMatches('c', teamIds(4), 1)[0];
    const { state: after } = play(state, first, ['t0', 't0']);

    expect(after.teamStatuses.filter((s) => s.totalMatches === 0)).toHaveLength(1);
    expect(
      getTeamsByStatus(after).leaderboard.map((s) => [s.teamId, s.totalWins, s.totalMatches])
    ).toEqual([
      ['t0', 2, 2],
      ['t1', 0, 1],
      ['t2', 0, 1],
    ]);
  });
});
