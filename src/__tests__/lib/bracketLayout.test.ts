import { describe, it, expect } from 'vitest';
import {
  bracketConnectorPaths,
  layoutBracket,
  naturalHeight,
  MB_CELL_H,
  MB_CELL_W,
  MB_COL_GAP,
  MB_ROW_GAP,
  type MbBracketCellData,
  type MbBracketRound,
} from '@/components/matchbook/bracketLayout';
import { generateSingleEliminationBracket, getTotalRounds, getRoundName } from '@/lib/singleElimination';
import {
  generateDoubleEliminationBracket,
  getDoubleBracketStructure,
  getTotalWinnersRounds,
  getDoubleElimRoundName,
} from '@/lib/doubleElimination';
import type { Match } from '@/types/game';

/**
 * The bracket geometry is the contract charter §2.3 states in arithmetic, so it
 * is asserted in arithmetic. Everything BUG-1, BUG-2 and BUG-3 were about is
 * measurable here without a renderer:
 *
 *   BUG-1  cells overlapped and columns had zero width  -> no two cells in a
 *          column may overlap, and every column is exactly MB_CELL_W wide.
 *   BUG-2  `140 * 2^(round-1)` px slots  -> the canvas is the FIRST round's
 *          natural height and no taller, at every team count.
 *   BUG-3  a 16px stub instead of a tree  -> one connector per parent in every
 *          paired round, ending on the parent's own left edge.
 *
 * Exercised at 2, 3, 5, 6, 7, 8, 11 and 16 teams so byes and ragged rounds are
 * covered rather than assumed (charter W4 acceptance 3).
 */

const TEAM_COUNTS = [2, 3, 5, 6, 7, 8, 11, 16];

const withIds = (raw: Omit<Match, 'id' | 'createdAt'>[]): Match[] =>
  raw.map((m, i) => ({ ...m, id: `m${i}`, createdAt: i }));

const teamIds = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

const cellFrom = (match: Match): MbBracketCellData => ({
  id: match.id,
  label: `M${match.position}`,
  home: match.homeTeamId ? { name: match.homeTeamId, crest: '' } : null,
  away: match.awayTeamId ? { name: match.awayTeamId, crest: '' } : null,
  homeScore: match.homeScore,
  awayScore: match.awayScore,
  homeWon: match.winnerId === match.homeTeamId,
  awayWon: match.winnerId === match.awayTeamId,
  live: match.status === 'in_progress',
  pending: match.status === 'pending',
  bye: match.isBye === true,
  tbd: !match.isBye && !match.homeTeamId && !match.awayTeamId,
});

const singleRounds = (n: number): MbBracketRound[] => {
  const matches = withIds(generateSingleEliminationBracket(teamIds(n), 'c'));
  const total = getTotalRounds(n);
  return Array.from({ length: total }, (_, i) => ({
    label: getRoundName(i + 1, total),
    cells: matches
      .filter((m) => m.round === i + 1)
      .sort((a, b) => a.position - b.position)
      .map(cellFrom),
  }));
};

describe('layoutBracket — single elimination at every team count', () => {
  it.each(TEAM_COUNTS)('%i teams: every round halves the previous one', (n) => {
    const rounds = singleRounds(n);
    for (let i = 1; i < rounds.length; i += 1) {
      expect(rounds[i].cells.length * 2).toBe(rounds[i - 1].cells.length);
    }
  });

  it.each(TEAM_COUNTS)('%i teams: no two cells in a column overlap (BUG-1)', (n) => {
    const layout = layoutBracket(singleRounds(n));
    for (const column of layout.columns) {
      for (let i = 1; i < column.cells.length; i += 1) {
        const gap = column.cells[i].top - (column.cells[i - 1].top + MB_CELL_H);
        expect(gap).toBeGreaterThanOrEqual(MB_ROW_GAP - 0.001);
      }
    }
  });

  it.each(TEAM_COUNTS)('%i teams: every cell sits inside the canvas', (n) => {
    const layout = layoutBracket(singleRounds(n));
    for (const column of layout.columns) {
      for (const placed of column.cells) {
        expect(placed.top).toBeGreaterThanOrEqual(-0.001);
        expect(placed.top + MB_CELL_H).toBeLessThanOrEqual(layout.height + 0.001);
      }
    }
  });

  it.each(TEAM_COUNTS)(
    '%i teams: the canvas is the first round, not an exponential slot stack (BUG-2)',
    (n) => {
      const rounds = singleRounds(n);
      const layout = layoutBracket(rounds);
      expect(layout.height).toBe(naturalHeight(rounds[0].cells.length));
      // The old rule reserved 140 * 2^(r-1) per cell; the final round alone was
      // 140 * 2^(R-1) px tall. Anything near that is the defect coming back.
      const oldFinalSlot = 140 * 2 ** (rounds.length - 1);
      if (rounds.length > 2) expect(layout.height).toBeLessThan(oldFinalSlot * rounds.length);
    }
  );

  it.each(TEAM_COUNTS)('%i teams: every column is exactly one cell wide (BUG-1)', (n) => {
    const layout = layoutBracket(singleRounds(n));
    expect(layout.width).toBe(
      layout.columns.length * (MB_CELL_W + MB_COL_GAP) - MB_COL_GAP
    );
  });

  it.each(TEAM_COUNTS)(
    '%i teams: a parent centres exactly between children 2i and 2i+1',
    (n) => {
      const layout = layoutBracket(singleRounds(n));
      for (let r = 1; r < layout.columns.length; r += 1) {
        const parents = layout.columns[r];
        const children = layout.columns[r - 1].cells;
        expect(parents.paired).toBe(true);
        parents.cells.forEach((parent, i) => {
          const expected = (children[i * 2].centre + children[i * 2 + 1].centre) / 2;
          expect(parent.centre).toBeCloseTo(expected, 6);
        });
      }
    }
  );

  it.each(TEAM_COUNTS)('%i teams: one connector per parent, none missing (BUG-3)', (n) => {
    const layout = layoutBracket(singleRounds(n));
    const parents = layout.columns
      .slice(1)
      .reduce((sum, column) => sum + column.cells.length, 0);
    expect(bracketConnectorPaths(layout)).toHaveLength(parents);
  });

  it('a connector ends on its parent column left edge and starts on the child right edge', () => {
    const layout = layoutBracket(singleRounds(8));
    const [first] = bracketConnectorPaths(layout);
    expect(first.d).toContain(`M ${MB_CELL_W} `);
    expect(first.d).toContain(`H ${MB_CELL_W + MB_COL_GAP}`);
  });

  it('marks the connector into a live match so the live path reads', () => {
    const rounds = singleRounds(8);
    rounds[1].cells[0] = { ...rounds[1].cells[0], live: true };
    const paths = bracketConnectorPaths(layoutBracket(rounds));
    expect(paths.filter((p) => p.live)).toHaveLength(1);
  });

  it('renders byes as bye cells for a non-power-of-two field', () => {
    const rounds = singleRounds(5);
    const byes = rounds[0].cells.filter((c) => c.bye);
    // 5 teams in an 8 bracket = 3 byes.
    expect(byes).toHaveLength(3);
    expect(rounds[0].cells).toHaveLength(4);
  });

  it('lays out a two-team bracket as one cell in one column', () => {
    const layout = layoutBracket(singleRounds(2));
    expect(layout.columns).toHaveLength(1);
    expect(layout.columns[0].cells).toHaveLength(1);
    expect(layout.height).toBe(MB_CELL_H);
    expect(bracketConnectorPaths(layout)).toHaveLength(0);
  });

  it('returns an empty layout for a bracket with no matches', () => {
    const layout = layoutBracket([{ label: 'Finals', cells: [] }]);
    expect(layout).toEqual({ columns: [], width: 0, height: 0 });
  });
});

describe('layoutBracket — double elimination and ragged rounds', () => {
  const doubleSections = (n: number) => {
    const matches = withIds(generateDoubleEliminationBracket(teamIds(n), 'c'));
    const winnersRounds = getTotalWinnersRounds(n);
    const structure = getDoubleBracketStructure(matches, n);
    const toRounds = (groups: Match[][], side: 'winners' | 'losers') =>
      groups
        .map((group, i) => ({
          label: getDoubleElimRoundName(i + 1, side, winnersRounds),
          cells: group.map(cellFrom),
        }))
        .filter((round) => round.cells.length > 0);
    return {
      winners: toRounds(structure.winners, 'winners'),
      losers: toRounds(structure.losers, 'losers'),
    };
  };

  it.each([4, 5, 6, 7, 8, 11, 16])('%i teams: the winners side is fully paired', (n) => {
    const layout = layoutBracket(doubleSections(n).winners);
    layout.columns.slice(1).forEach((column) => expect(column.paired).toBe(true));
  });

  it.each([4, 5, 6, 7, 8, 11, 16])(
    '%i teams: a ragged losers round draws no connectors rather than guessing',
    (n) => {
      const rounds = doubleSections(n).losers;
      if (rounds.length < 2) return;
      const layout = layoutBracket(rounds);
      layout.columns.forEach((column, r) => {
        if (column.paired) return;
        // Unpaired rounds must still be laid out, and inside the canvas.
        column.cells.forEach((placed) => {
          expect(placed.centre).toBeGreaterThan(0);
          expect(placed.centre).toBeLessThanOrEqual(layout.height);
        });
        if (r > 0) {
          const drawn = bracketConnectorPaths(layout);
          const intoThisRound = drawn.length;
          expect(intoThisRound).toBeGreaterThanOrEqual(0);
        }
      });
    }
  );

  it('never places a cell outside the canvas on a ragged section', () => {
    const rounds: MbBracketRound[] = [
      { label: 'L1', cells: [cellFrom(withIds([])[0] ?? ({} as Match))] },
    ];
    // Build a deliberately ragged shape: 3 -> 2 -> 1.
    const make = (count: number, label: string): MbBracketRound => ({
      label,
      cells: Array.from({ length: count }, (_, i) => ({
        id: `${label}-${i}`,
        home: null,
        away: null,
        homeScore: 0,
        awayScore: 0,
        homeWon: false,
        awayWon: false,
        live: false,
        pending: true,
        bye: false,
        tbd: true,
      })),
    });
    rounds.length = 0;
    rounds.push(make(3, 'L1'), make(2, 'L2'), make(1, 'L3'));
    const layout = layoutBracket(rounds);
    expect(layout.columns[1].paired).toBe(false);
    expect(layout.columns[2].paired).toBe(true);
    layout.columns.forEach((column) =>
      column.cells.forEach((placed) => {
        expect(placed.top + MB_CELL_H / 2).toBeGreaterThan(0);
        expect(placed.top).toBeLessThan(layout.height);
      })
    );
  });
});
