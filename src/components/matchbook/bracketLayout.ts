import type { MbTeam } from "./types";

/* ===========================================================================
   BRACKET GEOMETRY — arithmetic only, no DOM, no React

   Split out of `BracketRail.tsx` so it can be tested without a renderer, and
   because charter §2.3 makes the arithmetic the contract: "connectors computed
   arithmetically (round *r* has `2^(R-r)` cells; cell *i* centres between
   children `2i`, `2i+1`), never measured from the DOM, never animated."

   Measuring was the alternative and it is worse in three separate ways. It
   needs `ResizeObserver` + `getBoundingClientRect` inside a horizontally
   scrolling container, so it re-runs on every resize and on every scroll frame;
   it produces a first paint with no connectors and a second with them, which is
   a visible layout change on load (invariant 27); and elbows that are recomputed
   from live boxes slide when anything reflows, which §4 forbids outright.
   =========================================================================== */

/** Cell box. 156px is the brief's figure; the height is 32 + 32 + 24 + 2px rule. */
export const MB_CELL_W = 156;
export const MB_CELL_H = 90;
/** Vertical air between sibling cells in the same round. */
export const MB_ROW_GAP = 14;
/** Horizontal air between rounds. The elbow's vertical leg sits at its middle. */
export const MB_COL_GAP = 40;

export interface MbBracketCellData {
  /** Stable id — the match id. Passed back to `onSelect` / `onEdit`. */
  id: string;
  /** Short name of the match itself: "M3". */
  label?: string;
  home: MbTeam | null;
  away: MbTeam | null;
  /**
   * Seeding position, 1-based. Drawn as a `.mb-seed-box` numeral beside the
   * crest so a bracket states the seeding it was generated from — rubric 4's
   * 8-anchor requires "seeds and byes are explicit", and a cell that shows two
   * names and no seeds cannot be checked against the draw.
   */
  homeSeed?: number;
  awaySeed?: number;
  homeScore: number;
  awayScore: number;
  homeWon: boolean;
  awayWon: boolean;
  live: boolean;
  pending: boolean;
  /** A walkover: one side advanced without playing. */
  bye: boolean;
  /** Neither feeder has resolved yet. */
  tbd: boolean;
}

export interface MbBracketRound {
  label: string;
  cells: MbBracketCellData[];
  /**
   * The round being played, or the next one to be played. Exactly one round of
   * a section carries it; the rail marks it so "where are we" is answered
   * without counting completed cells (rubric 4, "the current round is marked").
   */
  current?: boolean;
}

export type MbBracketAccent = "teal" | "gold" | "coral" | "plum";

/** A labelled block of rounds. Single elimination has one; double has three. */
export interface MbBracketSection {
  id: string;
  label: string;
  accent: MbBracketAccent;
  rounds: MbBracketRound[];
}

export interface MbBracketChampion {
  team: MbTeam;
  /** "25 – 19", already formatted with an en dash. */
  score?: string;
  caption?: string;
}

export interface PlacedCell {
  cell: MbBracketCellData;
  top: number;
  centre: number;
}

export interface PlacedColumn {
  label: string;
  cells: PlacedCell[];
  /** True when this round's cells pair cleanly onto the previous round's. */
  paired: boolean;
  /** Mirrors `MbBracketRound.current` — the round the event is standing on. */
  current: boolean;
}

export interface SectionLayout {
  columns: PlacedColumn[];
  width: number;
  height: number;
}

export const naturalHeight = (count: number) =>
  count > 0 ? count * MB_CELL_H + (count - 1) * MB_ROW_GAP : 0;

/**
 * The whole layout, from cell counts alone. Pure, synchronous, and the single
 * source both the cells and the connector overlay read — so the lines cannot
 * disagree with the boxes.
 *
 *   round 0   centre(0, i) = offset + i * (CELL_H + ROW_GAP) + CELL_H / 2
 *   round r   centre(r, i) = (centre(r-1, 2i) + centre(r-1, 2i+1)) / 2
 *
 * A round whose cell count is not exactly half its predecessor's is RAGGED —
 * the losers side of a double-elimination bracket is full of them — and is
 * distributed evenly down the canvas instead, with `paired: false` so no
 * connectors are drawn into it. A line that does not describe a real
 * parent/child relationship is worse than no line.
 */
export const layoutBracket = (rounds: MbBracketRound[]): SectionLayout => {
  const live = rounds.filter((round) => round.cells.length > 0);
  if (live.length === 0) return { columns: [], width: 0, height: 0 };

  const height = Math.max(...live.map((round) => naturalHeight(round.cells.length)));
  const columns: PlacedColumn[] = [];
  let previous: number[] = [];

  live.forEach((round, index) => {
    const count = round.cells.length;
    let centres: number[];
    let paired = false;

    if (index === 0) {
      // Centred in the canvas so a short first round does not hang from the top.
      const offset = (height - naturalHeight(count)) / 2;
      centres = round.cells.map(
        (_, i) => offset + i * (MB_CELL_H + MB_ROW_GAP) + MB_CELL_H / 2
      );
    } else if (previous.length === count * 2) {
      paired = true;
      centres = round.cells.map((_, i) => (previous[i * 2] + previous[i * 2 + 1]) / 2);
    } else {
      centres = round.cells.map((_, i) => (height * (2 * i + 1)) / (2 * count));
    }

    columns.push({
      label: round.label,
      paired,
      current: round.current === true,
      cells: round.cells.map((cell, i) => ({
        cell,
        centre: centres[i],
        top: centres[i] - MB_CELL_H / 2,
      })),
    });
    previous = centres;
  });

  return {
    columns,
    width: columns.length * (MB_CELL_W + MB_COL_GAP) - MB_COL_GAP,
    height,
  };
};

export interface BracketConnectorPath {
  d: string;
  live: boolean;
}

/**
 * The tree, as SVG path data, from `layoutBracket`'s numbers and nothing else.
 *
 * Two subpaths per connector: the bracket itself (two horizontal stubs joined
 * by a vertical leg at the mid-gutter) and the stem into the parent's left
 * edge. The stem's `y` is the parent's centre, which for a paired round is by
 * construction the midpoint of the vertical leg.
 */
export const bracketConnectorPaths = (
  layout: SectionLayout
): BracketConnectorPath[] => {
  const out: BracketConnectorPath[] = [];
  layout.columns.forEach((column, r) => {
    if (r === 0 || !column.paired) return;
    const children = layout.columns[r - 1].cells;
    const childRight = (r - 1) * (MB_CELL_W + MB_COL_GAP) + MB_CELL_W;
    const parentLeft = r * (MB_CELL_W + MB_COL_GAP);
    const mid = childRight + MB_COL_GAP / 2;

    column.cells.forEach((parent, i) => {
      const top = children[i * 2];
      const bottom = children[i * 2 + 1];
      if (!top || !bottom) return;
      out.push({
        d:
          `M ${childRight} ${top.centre} H ${mid} V ${bottom.centre} H ${childRight}` +
          ` M ${mid} ${parent.centre} H ${parentLeft}`,
        live: parent.cell.live,
      });
    });
  });
  return out;
};
