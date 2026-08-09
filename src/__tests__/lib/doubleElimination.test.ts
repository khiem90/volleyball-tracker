import { describe, it, expect } from 'vitest';
import {
  generateDoubleEliminationBracket,
  getDoubleBracketStructure,
  getDoubleElimRoundName,
  getTotalWinnersRounds,
} from '@/lib/doubleElimination';
import type { Match } from '@/types/game';
import { asMatch, bracketShape, teamIds } from './fixtures';

/**
 * CHARACTERISATION suite for `src/lib/doubleElimination.ts`.
 *
 * The headline finding is pinned below: the losers bracket is generated as
 * empty placeholders and **no code in this module ever routes a loser into
 * them**. There is no `advanceLoser`, and `advanceWinner` (single elimination)
 * has no notion of `bracket`. Any redesign of the double-elimination view is
 * therefore rendering a permanently empty half.
 */

/** Generic so the Match fields survive the filter and `bracketShape` accepts it. */
const inBracket = <T extends Pick<Match, 'bracket'>>(
  matches: readonly T[],
  bracket: Match['bracket']
): T[] => matches.filter((m) => m.bracket === bracket);

const winners = <T extends Pick<Match, 'bracket'>>(matches: readonly T[]): T[] =>
  inBracket(matches, 'winners');
const losers = <T extends Pick<Match, 'bracket'>>(matches: readonly T[]): T[] =>
  inBracket(matches, 'losers');

describe('getTotalWinnersRounds', () => {
  it('rounds the field up to the next power of two', () => {
    expect([4, 5, 6, 8, 16].map(getTotalWinnersRounds)).toEqual([2, 3, 3, 3, 4]);
  });
});

describe('getDoubleElimRoundName', () => {
  it('names the winners bracket from the final backwards', () => {
    expect(getDoubleElimRoundName(3, 'winners', 3)).toBe('Winners Finals');
    expect(getDoubleElimRoundName(2, 'winners', 3)).toBe('Winners Semi-Finals');
    expect(getDoubleElimRoundName(1, 'winners', 3)).toBe('Winners Quarter-Finals');
    expect(getDoubleElimRoundName(1, 'winners', 5)).toBe('Winners Round 1');
  });

  it('numbers every losers round and labels the grand final', () => {
    expect(getDoubleElimRoundName(1, 'losers', 3)).toBe('Losers Round 1');
    expect(getDoubleElimRoundName(4, 'losers', 3)).toBe('Losers Round 4');
    expect(getDoubleElimRoundName(1, 'grand_finals', 3)).toBe('Grand Finals');
  });
});

describe('generateDoubleEliminationBracket', () => {
  it('refuses a field smaller than four', () => {
    expect(() => generateDoubleEliminationBracket(teamIds(3), 'c')).toThrow(
      'Need at least 4 teams for double elimination'
    );
  });

  it('emits the full four-team shape', () => {
    const matches = generateDoubleEliminationBracket(teamIds(4), 'c');
    expect(bracketShape(matches)).toEqual([
      'winners r1p1 t0vt3',
      'winners r1p2 t1vt2',
      'winners r2p1 -v-',
      'losers r1p1 -v-',
      'losers r2p1 -v-',
      'grand_finals r1p1 -v-',
    ]);
  });

  it('emits 14 matches for any field between five and eight teams', () => {
    for (const count of [5, 6, 7, 8]) {
      const matches = generateDoubleEliminationBracket(teamIds(count), 'c');
      expect(matches).toHaveLength(14);
      expect(winners(matches)).toHaveLength(7);
      expect(losers(matches)).toHaveLength(6);
      expect(matches.filter((m) => m.bracket === 'grand_finals')).toHaveLength(1);
    }
  });

  it('seeds the winners bracket exactly like single elimination', () => {
    const matches = generateDoubleEliminationBracket(teamIds(8), 'c');
    expect(bracketShape(winners(matches))).toEqual([
      'winners r1p1 t0vt7',
      'winners r1p2 t3vt4',
      'winners r1p3 t1vt6',
      'winners r1p4 t2vt5',
      'winners r2p1 -v-',
      'winners r2p2 -v-',
      'winners r3p1 -v-',
    ]);
  });

  it('gives byes to the top seeds and pre-fills winners round two', () => {
    const matches = generateDoubleEliminationBracket(teamIds(5), 'c');
    expect(bracketShape(winners(matches))).toEqual([
      'winners r1p1 t0v-',
      'winners r1p2 t3vt4',
      'winners r1p3 t1v-',
      'winners r1p4 t2v-',
      'winners r2p1 t0v-',
      'winners r2p2 t1vt2',
      'winners r3p1 -v-',
    ]);
    expect(matches.filter((m) => m.isBye)).toHaveLength(3);
  });

  it('honours a nominated bye list of the right length', () => {
    const matches = generateDoubleEliminationBracket(teamIds(6), 'c', ['t5', 't4']);
    expect(bracketShape(winners(matches))).toEqual([
      'winners r1p1 t5v-',
      'winners r1p2 t1vt2',
      'winners r1p3 t4v-',
      'winners r1p4 t0vt3',
      'winners r2p1 t5v-',
      'winners r2p2 t4v-',
      'winners r3p1 -v-',
    ]);
  });

  it('lays the losers bracket out as 2/2/1/1 for an eight-slot field', () => {
    const matches = generateDoubleEliminationBracket(teamIds(8), 'c');
    expect(bracketShape(losers(matches))).toEqual([
      'losers r1p1 -v-',
      'losers r1p2 -v-',
      'losers r2p1 -v-',
      'losers r2p2 -v-',
      'losers r3p1 -v-',
      'losers r4p1 -v-',
    ]);
  });

  it('GAP: no losers-bracket match or grand final is ever populated by this module', () => {
    // There is no advanceLoser(); nothing here or in singleElimination.ts
    // routes a defeated team. Every non-winners match ships empty and stays
    // empty until a human edits it.
    const matches = generateDoubleEliminationBracket(teamIds(8), 'c');
    const unrouted = matches.filter((m) => m.bracket !== 'winners');
    expect(unrouted).toHaveLength(7);
    expect(
      unrouted.every((m) => m.homeTeamId === '' && m.awayTeamId === '')
    ).toBe(true);
  });

  it('restarts round numbering per bracket, so round 1 is ambiguous without it', () => {
    const matches = generateDoubleEliminationBracket(teamIds(4), 'c');
    const roundOne = matches.filter((m) => m.round === 1);
    expect(roundOne.map((m) => m.bracket)).toEqual([
      'winners',
      'winners',
      'losers',
      'grand_finals',
    ]);
  });
});

describe('getDoubleBracketStructure', () => {
  it('groups an eight-team bracket into 4/2/1 winners and 2/2/1/1 losers', () => {
    const matches = generateDoubleEliminationBracket(teamIds(8), 'c').map(
      (match, index) => asMatch(match, { id: `m${index}` })
    );
    const structure = getDoubleBracketStructure(matches, 8);
    expect(structure.winners.map((round) => round.length)).toEqual([4, 2, 1]);
    expect(structure.losers.map((round) => round.length)).toEqual([2, 2, 1, 1]);
    expect(structure.grandFinals?.bracket).toBe('grand_finals');
  });

  it('sorts each round by position', () => {
    const matches = generateDoubleEliminationBracket(teamIds(8), 'c')
      .map((match, index) => asMatch(match, { id: `m${index}` }))
      .reverse();
    const structure = getDoubleBracketStructure(matches, 8);
    expect(structure.winners[0].map((m) => m.position)).toEqual([1, 2, 3, 4]);
  });

  it('still reserves the winners rounds, but no losers rounds, for an empty bracket', () => {
    // Winners rounds come from the team count, losers rounds from the data —
    // so an unstarted competition renders three empty winners columns and no
    // losers column at all.
    const structure = getDoubleBracketStructure([], 8);
    expect(structure.winners).toEqual([[], [], []]);
    expect(structure.losers).toEqual([]);
    expect(structure.grandFinals).toBeNull();
  });
});
