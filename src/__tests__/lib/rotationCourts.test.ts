import { describe, it, expect } from 'vitest';
import {
  applyRotationCourtSwap,
  rewriteRotationCourts,
  type RotationSwapRequest,
} from '@/lib/rotationCourts';
import type { Competition, Win2OutCourt, TwoMatchRotationCourt } from '@/types/game';

/**
 * CHARACTERISATION suite for the court rewrite extracted out of
 * `useEditMatchDialog.ts:145-209` (charter W4 acceptance 8).
 *
 * Every expectation below was read off the two shipped blocks before they were
 * deleted, so a behavioural regression during the W4 restyle fails here rather
 * than silently mis-seating two teams on a live court.
 */

const w2oCourts = (): Win2OutCourt[] => [
  { courtNumber: 1, teamIds: ['a', 'b'] },
  { courtNumber: 2, teamIds: ['c', 'd'], currentChampionId: 'c' },
];

const tmrCourts = (): TwoMatchRotationCourt[] => [
  { courtNumber: 1, teamIds: ['a', 'b'], isFirstMatch: true },
  { courtNumber: 2, teamIds: ['c', 'd'], isFirstMatch: false, matchId: 'm2' },
];

/** Court 1 keeps `a` and takes `c` from court 2; `b` goes to court 2. */
const swapAB: RotationSwapRequest = {
  currentTeamIds: ['a', 'b'],
  nextTeamIds: ['a', 'c'],
  swappingTeamId: 'c',
  displacedTeamId: 'b',
};

describe('rewriteRotationCourts', () => {
  it('seats the chosen pair on the edited court in the order given', () => {
    const next = rewriteRotationCourts(w2oCourts(), swapAB);
    expect(next?.[0].teamIds).toEqual(['a', 'c']);
  });

  it('substitutes only the swapped id on the other court, keeping its order', () => {
    const next = rewriteRotationCourts(w2oCourts(), swapAB);
    expect(next?.[1].teamIds).toEqual(['b', 'd']);
  });

  it('preserves every other field on both courts', () => {
    const next = rewriteRotationCourts(tmrCourts(), swapAB);
    expect(next?.[0]).toMatchObject({ courtNumber: 1, isFirstMatch: true });
    expect(next?.[1]).toMatchObject({ courtNumber: 2, isFirstMatch: false, matchId: 'm2' });
  });

  it('does not mutate the array it was given', () => {
    const courts = w2oCourts();
    rewriteRotationCourts(courts, swapAB);
    expect(courts[0].teamIds).toEqual(['a', 'b']);
    expect(courts[1].teamIds).toEqual(['c', 'd']);
  });

  it('returns null when the edited court cannot be found', () => {
    expect(
      rewriteRotationCourts(w2oCourts(), {
        ...swapAB,
        currentTeamIds: ['x', 'y'],
      })
    ).toBeNull();
  });

  it('returns null when the swapping team is not on any other court', () => {
    expect(
      rewriteRotationCourts(w2oCourts(), {
        ...swapAB,
        nextTeamIds: ['a', 'z'],
        swappingTeamId: 'z',
      })
    ).toBeNull();
  });

  it('refuses a swap with a team already on the edited court', () => {
    // `b` is on court 1, so there is no OTHER court holding it.
    expect(
      rewriteRotationCourts(w2oCourts(), {
        currentTeamIds: ['a', 'b'],
        nextTeamIds: ['b', 'a'],
        swappingTeamId: 'b',
        displacedTeamId: 'a',
      })
    ).toBeNull();
  });

  it('works with three courts, touching only the two involved', () => {
    const courts: Win2OutCourt[] = [
      ...w2oCourts(),
      { courtNumber: 3, teamIds: ['e', 'f'] },
    ];
    const next = rewriteRotationCourts(courts, swapAB);
    expect(next?.[2].teamIds).toEqual(['e', 'f']);
  });
});

const competition = (extra: Partial<Competition>): Competition => ({
  id: 'comp',
  name: 'Test',
  type: 'win2out',
  teamIds: ['a', 'b', 'c', 'd'],
  matchIds: [],
  status: 'in_progress',
  createdAt: 0,
  ...extra,
});

describe('applyRotationCourtSwap', () => {
  it('rewrites win2outState.courts and leaves the rest of the state alone', () => {
    const base = competition({
      win2outState: {
        competitionId: 'comp',
        teamStatuses: [],
        queue: ['e'],
        courts: w2oCourts(),
        numberOfCourts: 2,
        isComplete: false,
      },
    });
    const next = applyRotationCourtSwap(base, swapAB);
    expect(next?.win2outState?.courts[0].teamIds).toEqual(['a', 'c']);
    expect(next?.win2outState?.courts[1].teamIds).toEqual(['b', 'd']);
    expect(next?.win2outState?.queue).toEqual(['e']);
    expect(next?.win2outState?.courts[1].currentChampionId).toBe('c');
  });

  it('rewrites twoMatchRotationState.courts', () => {
    const base = competition({
      type: 'two_match_rotation',
      twoMatchRotationState: {
        competitionId: 'comp',
        teamStatuses: [],
        queue: [],
        courts: tmrCourts(),
        numberOfCourts: 2,
        isComplete: false,
      },
    });
    const next = applyRotationCourtSwap(base, swapAB);
    expect(next?.twoMatchRotationState?.courts[0].teamIds).toEqual(['a', 'c']);
    expect(next?.twoMatchRotationState?.courts[1].teamIds).toEqual(['b', 'd']);
  });

  it('returns null for a competition with no rotation state', () => {
    expect(applyRotationCourtSwap(competition({ type: 'round_robin' }), swapAB)).toBeNull();
  });

  it('returns null rather than a partially applied competition', () => {
    const base = competition({
      win2outState: {
        competitionId: 'comp',
        teamStatuses: [],
        queue: [],
        courts: [{ courtNumber: 1, teamIds: ['a', 'b'] }],
        numberOfCourts: 1,
        isComplete: false,
      },
    });
    expect(applyRotationCourtSwap(base, swapAB)).toBeNull();
  });
});
