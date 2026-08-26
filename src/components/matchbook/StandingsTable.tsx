"use client";

import { MbIcon } from "./MbIcon";
import { Crest, FormLetters, TeamMark } from "./Panel";
import { MbTeamName } from "./TeamName";
import { MbTableScroll } from "./TableScroll";
import type { MbFormResult, MbTeam } from "./types";

/* ===========================================================================
   THE STANDINGS TABLE — declared once. The column SET is a prop, the column
   ORDER is not: `# · Team` lead and `Pts` is the last always-visible column,
   so the measure a reader came for survives every width; everything between
   degrades by breakpoint, widest-first (P and PD at `sm`, PF/PA at `md`,
   Form at `lg`).

   Rank is read off the row (`rank` / `sharesRank` from `rankTeams()`), never
   from the map index: joint positions are real — two teams level are joint
   2nd and the next team is 4th, which an `index + 1` table lies about.
   =========================================================================== */

/** One line of a table, already ranked by `rankTeams()`. */
export interface MbStandingLine {
  teamId: string;
  team: MbTeam;
  /** 1-based finishing position. Level lines share a rank. */
  rank: number;
  /** True when at least one other line holds the same rank. */
  sharesRank: boolean;
  played: number;
  won: number;
  lost: number;
  tied: number;
  pointsFor: number;
  pointsAgainst: number;
  /** Signed point difference. Rendered with an explicit `+`. */
  diff: number;
  /** Competition points under this competition's own scoring rules. */
  points: number;
  /** Most recent results, oldest first. */
  form: MbFormResult[];
  /**
   * Places gained (+) or lost (−) since the previous round, from
   * `rankTeamsWithMovement`. `undefined` — no earlier round exists — renders
   * NOTHING, so a first-round table carries no mark rather than a dash farm.
   */
  movement?: number;
}

export type MbStandingsColumn =
  | "played"
  | "won"
  | "lost"
  | "tied"
  | "pointsFor"
  | "pointsAgainst"
  | "diff"
  | "points"
  | "gap"
  | "form";

export const MB_STANDINGS_COLUMNS: readonly MbStandingsColumn[] = [
  "played",
  "won",
  "lost",
  "pointsFor",
  "pointsAgainst",
  "diff",
  "points",
  "gap",
  "form",
];

interface ColumnSpec {
  /** Abbreviation in the header row. */
  short: string;
  /** Full name, announced to screen readers through `<abbr>`. */
  full: string;
  /**
   * When the column appears. `""` means always — and `points` is deliberately
   * the only measure column in that class besides W and L.
   */
  reveal: string;
  /** Display step: a measure a reader scans for is set in the display face. */
  strong?: boolean;
}

/**
 * The same breakpoint as `reveal`, for a legend entry.
 *
 * `reveal` restores `table-cell`, which is right for a `<th>`/`<td>` and wrong
 * for the `<span>` in a flex strip — it would turn the legend into a row of
 * anonymous table cells. One map, derived from the other, so the two cannot
 * drift into naming different breakpoints.
 */
const LEGEND_REVEAL: Record<string, string> = {
  "": "",
  "hidden sm:table-cell": "hidden sm:inline",
  "hidden md:table-cell": "hidden md:inline",
  "hidden lg:table-cell": "hidden lg:inline",
};

const COLUMN: Record<MbStandingsColumn, ColumnSpec> = {
  played: { short: "P", full: "Played", reveal: "hidden sm:table-cell" },
  won: { short: "W", full: "Won", reveal: "" },
  lost: { short: "L", full: "Lost", reveal: "" },
  tied: { short: "T", full: "Tied", reveal: "hidden sm:table-cell" },
  pointsFor: { short: "PF", full: "Points for", reveal: "hidden md:table-cell" },
  pointsAgainst: {
    short: "PA",
    full: "Points against",
    reveal: "hidden md:table-cell",
  },
  diff: {
    short: "PD",
    full: "Point difference",
    reveal: "hidden sm:table-cell",
    strong: true,
  },
  points: { short: "Pts", full: "Competition points", reveal: "", strong: true },
  /* The comparative column: competition points off the top of the table, so
     the chase is a number rather than a per-row subtraction. The leader's own
     cell is EMPTY — it is not behind anything, and a "0"/dash would claim a
     measure that does not exist for that row. */
  gap: { short: "Gap", full: "Points behind the leader", reveal: "hidden sm:table-cell" },
  form: { short: "Form", full: "Recent form", reveal: "hidden lg:table-cell" },
};

const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;

/** The columns a phone hides, restated as one kicker line under the name. */
const MOBILE_HIDDEN: readonly MbStandingsColumn[] = [
  "played",
  "tied",
  "pointsFor",
  "pointsAgainst",
  "diff",
  "gap",
];

const mobileMeasures = (
  line: MbStandingLine,
  columns: readonly MbStandingsColumn[],
  leaderPoints: number
) =>
  columns
    .filter((column) => MOBILE_HIDDEN.includes(column))
    .map((column) => {
      const value = measure(line, column, leaderPoints);
      /* A null measure (the leader's own gap) contributes nothing — not a
         labelled blank. */
      return value === null ? null : `${COLUMN[column].short} ${value}`;
    })
    .filter((entry): entry is string => entry !== null)
    .join(" · ");

const measure = (
  line: MbStandingLine,
  column: MbStandingsColumn,
  leaderPoints: number
) => {
  switch (column) {
    case "played":
      return line.played;
    case "won":
      return line.won;
    case "lost":
      return line.lost;
    case "tied":
      return line.tied;
    case "pointsFor":
      return line.pointsFor;
    case "pointsAgainst":
      return line.pointsAgainst;
    case "diff":
      return signed(line.diff);
    case "points":
      return line.points;
    case "gap":
      /* Signed, matching PD's grammar, and joint leaders are all "the
         leader" — rank 1 is what earns the empty cell, not row index 0. */
      return line.rank === 1 ? null : signed(line.points - leaderPoints);
    case "form":
      return null;
  }
};

/**
 * The rank-movement mark. Direction is SHAPE (one chevron, rotated), never
 * hue — both directions take the same muted ink — and the word lives in
 * `sr-only` with the magnitude the glyph compresses. `0` and `undefined` both
 * render nothing: a held place needs no announcement, and a table with no
 * previous round has no history to claim.
 */
const Movement = ({ movement }: { movement?: number }) => {
  if (!movement) return null;
  const up = movement > 0;
  const places = Math.abs(movement);
  return (
    <span className="mt-0.5 flex justify-center text-mb-ink-muted">
      <MbIcon id="chevron-down" size={9} className={up ? "rotate-180" : ""} />
      <span className="sr-only">
        {up ? "Up" : "Down"} {places} {places === 1 ? "place" : "places"} since
        the previous round
      </span>
    </span>
  );
};

export const MbStandingsTable = ({
  rows,
  caption,
  columns = MB_STANDINGS_COLUMNS,
  compact = false,
  highlightTeamId,
  className = "",
}: {
  rows: MbStandingLine[];
  /**
   * Required: it is read out before the table and is the only thing that
   * tells a screen-reader user which competition's table this is.
   */
  caption: string;
  columns?: readonly MbStandingsColumn[];
  compact?: boolean;
  /** Draws the row's rail in coral instead of leaving it unmarked. */
  highlightTeamId?: string;
  className?: string;
}) => {
  /* The top of the table, for the GB column. Rows arrive already ranked, so
     the first row's points are the leader's — including a joint lead, where
     every rank-1 row holds the same total by definition of the sort. */
  const leaderPoints = rows[0]?.points ?? 0;
  return (
  <MbTableScroll unit="columns">
    <table
      className={`mb-table ${compact ? "mb-table-compact" : ""} w-full border-collapse ${className}`}
    >
      <caption className="mb-kicker px-4 pb-2 pt-2.5 text-left">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className="w-9 pl-3! text-center">
            <abbr title="Position" className="no-underline">
              #
            </abbr>
          </th>
          <th scope="col">Team</th>
          {columns.map((column) => (
            <th
              key={column}
              scope="col"
              className={`text-center ${COLUMN[column].reveal}`}
            >
              <abbr title={COLUMN[column].full} className="no-underline">
                {COLUMN[column].short}
              </abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((line) => {
          /* The leader's rail is teal — coral is reserved for the row the
             reader chose. A joint first gets it too; that is the point of
             reading `rank`. */
          const rail =
            line.teamId === highlightTeamId
              ? "var(--mb-coral)"
              : line.rank === 1
                ? "var(--mb-teal)"
                : null;

          return (
            <tr key={line.teamId} className="mb-row-hover">
              <th
                scope="row"
                className="matchbook-display pl-3! text-center text-[0.78rem] mb-track-display font-bold tabular-nums"
                style={rail ? { boxShadow: `inset 3px 0 0 ${rail}` } : undefined}
              >
                {/* A joint rank is marked "=" so two 2nds do not read as a
                    sorting bug. The movement chevron stacks INSIDE this cell —
                    the rank cell is already the row's position channel, and a
                    tenth column would spend name-column width on a 9px glyph. */}
                <span className="block leading-none">
                  {line.sharesRank ? "=" : ""}
                  {line.rank}
                </span>
                <Movement movement={line.movement} />
              </th>
              {/* The ceiling, not just the floor: in `table-layout: auto` the
                  cell sizes to max-content, so the name elision never fires
                  and the scrollport cuts the string invisibly. The cap goes
                  on the CONTENT, never the `<td>` — a max-width on a table
                  cell is fed into auto layout, not honoured as a ceiling. */}
              <td>
                <div className="max-w-[min(15rem,46vw)] min-w-0">
                  <TeamMark team={line.team} size={compact ? "sm" : "md"} />
                </div>
                {/* The hidden columns ride the row itself below `sm` — no
                    scroller, no accordion, nothing unreachable on a phone. */}
                <span className="mb-kicker mt-0.5 block tabular-nums sm:hidden">
                  {mobileMeasures(line, columns, leaderPoints)}
                </span>
              </td>
              {columns.map((column) => {
                const spec = COLUMN[column];
                if (column === "form") {
                  return (
                    <td key={column} className={`text-center ${spec.reveal}`}>
                      {/* LETTERS, not coloured squares: green and red squares
                          are near-identical in greyscale, carrying the run in
                          hue alone. The fixed right-aligned box keeps the
                          column's width constant whatever the run length. */}
                      <span className="inline-flex w-[82px] justify-end">
                        <FormLetters form={line.form} />
                      </span>
                    </td>
                  );
                }
                return (
                  <td
                    key={column}
                    className={`text-center tabular-nums ${spec.reveal} ${
                      spec.strong ? "matchbook-display font-bold" : ""
                    } ${column === "gap" ? "text-mb-ink-muted" : ""}`}
                  >
                    {measure(line, column, leaderPoints)}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  </MbTableScroll>
  );
};

/**
 * A ruled footer strip of `.mb-kicker` pairs — the abbreviations are already
 * in the header's `<abbr>` titles; this is for the pointer user who never
 * hovers. Each entry carries its column's own `reveal` class, so the legend
 * names exactly the columns rendered at that width.
 */
export const MbStandingsLegend = ({
  columns = MB_STANDINGS_COLUMNS,
}: {
  columns?: readonly MbStandingsColumn[];
}) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-mb-navy px-4 py-2">
    {columns.map((column) => (
      <span
        key={column}
        className={`mb-kicker ${LEGEND_REVEAL[COLUMN[column].reveal] ?? ""}`}
      >
        <span className="text-mb-navy">{COLUMN[column].short}</span>{" "}
        {COLUMN[column].full}
      </span>
    ))}
  </div>
);

/** The crest-only cut used where a table would not fit — the champion strip. */
export const MbStandingsLeaderMark = ({ team }: { team: MbTeam }) => (
  <span className="inline-flex items-center gap-2">
    <Crest team={team} size={20} />
    <span className="matchbook-display truncate text-[0.82rem] mb-track-display font-bold">
      <MbTeamName name={team.name} />
    </span>
  </span>
);
