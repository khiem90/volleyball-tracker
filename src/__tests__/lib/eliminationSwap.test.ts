import { describe, it, expect } from 'vitest';
import { detectTeamSwap, calculateSwapUpdates } from '@/lib/eliminationSwap';
import { makeMatch } from './fixtures';

/**
 * CHARACTERISATION suite for `src/lib/eliminationSwap.ts`, the module behind
 * "you moved a team that is already scheduled elsewhere — swap them?".
 *
 * Two limits are pinned as GAPs: only the *first* displaced/incoming pair is
 * considered, so swapping both sides of a fixture at once is silently treated
 * as a single-team move; and `calculateSwapUpdates` trusts its arguments
 * completely, returning updates even for a match that no longer needs one.
 */

const pending = (id: string, homeTeamId: string, awayTeamId: string, round = 1, position = 1) =>
  makeMatch({ id, homeTeamId, awayTeamId, round, position });

describe('detectTeamSwap', () => {
  const current = pending('m1', 't0', 't1', 1, 1);
  const other = pending('m2', 't2', 't3', 1, 2);
  const all = [current, other];

  it('reports no swap when nothing was displaced', () => {
    expect(detectTeamSwap(current, 't0', 't1', all)).toEqual({ needsSwap: false });
  });

  it('reports no swap when the incoming team is unscheduled', () => {
    expect(detectTeamSwap(current, 't0', 'free-agent', all)).toEqual({ needsSwap: false });
  });

  it('reports no swap when a slot is merely emptied', () => {
    // A blank id is filtered out before the diff, so there is an outgoing team
    // but no incoming one and the caller is left to just clear the slot.
    expect(detectTeamSwap(current, 't0', '', all)).toEqual({ needsSwap: false });
  });

  it('names the other match, the displaced team and the incoming team', () => {
    expect(detectTeamSwap(current, 't0', 't2', all)).toEqual({
      needsSwap: true,
      otherMatchId: 'm2',
      otherMatchPosition: 2,
      displacedTeamId: 't1',
      swappingTeamId: 't2',
    });
  });

  it('finds the incoming team in either slot of the other match', () => {
    expect(detectTeamSwap(current, 't0', 't3', all)).toMatchObject({
      needsSwap: true,
      otherMatchId: 'm2',
      swappingTeamId: 't3',
    });
  });

  it('detects a swap when the home side is the one being replaced', () => {
    expect(detectTeamSwap(current, 't2', 't1', all)).toMatchObject({
      needsSwap: true,
      displacedTeamId: 't0',
      swappingTeamId: 't2',
    });
  });

  it('ignores the match being edited, so a straight home/away flip is not a swap', () => {
    expect(detectTeamSwap(current, 't1', 't0', all)).toEqual({ needsSwap: false });
  });

  it('stays inside the round by default', () => {
    const nextRound = pending('m3', 't2', 't3', 2, 1);
    expect(detectTeamSwap(current, 't0', 't2', [current, nextRound])).toEqual({
      needsSwap: false,
    });
  });

  it('crosses rounds when sameRoundOnly is false, for the rotation formats', () => {
    const nextRound = pending('m3', 't2', 't3', 2, 1);
    expect(detectTeamSwap(current, 't0', 't2', [current, nextRound], false)).toMatchObject({
      needsSwap: true,
      otherMatchId: 'm3',
    });
  });

  it('ignores matches that are no longer pending', () => {
    const live = makeMatch({ id: 'm2', homeTeamId: 't2', awayTeamId: 't3', status: 'in_progress' });
    const finished = makeMatch({ id: 'm2', homeTeamId: 't2', awayTeamId: 't3', status: 'completed' });
    expect(detectTeamSwap(current, 't0', 't2', [current, live]).needsSwap).toBe(false);
    expect(detectTeamSwap(current, 't0', 't2', [current, finished]).needsSwap).toBe(false);
  });

  it('ignores bye matches', () => {
    const bye = makeMatch({ id: 'm2', homeTeamId: 't2', awayTeamId: '', isBye: true });
    expect(detectTeamSwap(current, 't0', 't2', [current, bye]).needsSwap).toBe(false);
  });

  it('ignores matches belonging to another competition', () => {
    const foreign = makeMatch({ id: 'm2', competitionId: 'other', homeTeamId: 't2', awayTeamId: 't3' });
    expect(detectTeamSwap(current, 't0', 't2', [current, foreign]).needsSwap).toBe(false);
  });

  it('picks the first candidate when the incoming team appears more than once', () => {
    const second = pending('m3', 't2', 't4', 1, 3);
    expect(detectTeamSwap(current, 't0', 't2', [current, other, second]).otherMatchId).toBe('m2');
  });

  it('GAP: replacing both sides at once is treated as a single-team move', () => {
    // `find` takes only the first displaced and first incoming team, so t1's
    // departure and t3's arrival are dropped on the floor. The caller writes
    // both new ids into m1 while m2 still lists t2 and t3 — one team ends up
    // scheduled twice in the same round.
    const result = detectTeamSwap(current, 't2', 't3', [current, other]);
    expect(result).toMatchObject({ displacedTeamId: 't0', swappingTeamId: 't2' });
    expect(result.otherMatchId).toBe('m2');
  });
});

describe('calculateSwapUpdates', () => {
  const other = pending('m2', 't2', 't3', 1, 2);
  const all = [pending('m1', 't0', 't1'), other];

  it('writes the new pairing into the edited match and back-fills the other', () => {
    expect(calculateSwapUpdates('m1', 't0', 't2', 'm2', 't1', 't2', all)).toEqual([
      { matchId: 'm1', homeTeamId: 't0', awayTeamId: 't2' },
      { matchId: 'm2', homeTeamId: 't1', awayTeamId: 't3' },
    ]);
  });

  it('back-fills whichever slot of the other match held the swapping team', () => {
    expect(calculateSwapUpdates('m1', 't0', 't3', 'm2', 't1', 't3', all)).toEqual([
      { matchId: 'm1', homeTeamId: 't0', awayTeamId: 't3' },
      { matchId: 'm2', homeTeamId: 't2', awayTeamId: 't1' },
    ]);
  });

  it('returns nothing when the other match cannot be found', () => {
    expect(calculateSwapUpdates('m1', 't0', 't2', 'gone', 't1', 't2', all)).toEqual([]);
  });

  it('GAP: leaves the other match untouched when the swapping team is not in it', () => {
    // No validation — the caller gets a no-op update it will still persist.
    expect(calculateSwapUpdates('m1', 't0', 't2', 'm2', 't1', 'nobody', all)).toEqual([
      { matchId: 'm1', homeTeamId: 't0', awayTeamId: 't2' },
      { matchId: 'm2', homeTeamId: 't2', awayTeamId: 't3' },
    ]);
  });

  it('round-trips a detected swap without leaving a team scheduled twice', () => {
    const current = pending('m1', 't0', 't1');
    const detected = detectTeamSwap(current, 't0', 't2', [current, other]);
    const updates = calculateSwapUpdates(
      current.id,
      't0',
      't2',
      detected.otherMatchId!,
      detected.displacedTeamId!,
      detected.swappingTeamId!,
      [current, other]
    );
    const seated = updates.flatMap((u) => [u.homeTeamId, u.awayTeamId]).sort();
    expect(seated).toEqual(['t0', 't1', 't2', 't3']);
  });
});
