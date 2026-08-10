"use client";

import { Crest, FormLetters, TeamMark } from "./Panel";
import { MbTableScroll } from "./TableScroll";
import type { MbFormResult, MbTeam } from "./types";

/* ===========================================================================
   THE STANDINGS TABLE (charter §2.3, W4 / P3a)

   Three tables ship today and none of them agree:

     src/components/Standings.tsx          9 columns, shadcn <Card>, lucide
                                           medals, emerald/amber/slate ranks,
                                           no <caption>, no scope, and at 390px
                                           it pushes **Pts** — the column that
                                           decides the competition — off the
                                           right edge behind a scroll nothing
                                           signals (comp-detail brief BUG-11).
     src/app/competitions/page.tsx:141-183 8 columns, matchbook, no Pts at all.
     src/hooks/useSessionPage.ts consumer  a third order and a third column set.

   This is that table, once. The column SET is a prop, the column ORDER is not:
   `# · Team` lead and `Pts` is the last always-visible column, so the measure a
   reader came for survives every width. Everything between them degrades by
   breakpoint, widest-first — P and PD at `sm`, PF/PA at `md`, Form at `lg`.

   Rank is read off the row (`rank` / `sharesRank` from `rankTeams()`), never
   from the map index, because joint positions are real: two teams level on
   points, difference, points-for and wins are joint 2nd and the next team is
   4th. An `index + 1` table has always lied about that.
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
  | "form";

export const MB_STANDINGS_COLUMNS: readonly MbStandingsColumn[] = [
  "played",
  "won",
  "lost",
  "pointsFor",
  "pointsAgainst",
  "diff",
  "points",
  "form",
];

interface ColumnSpec {
  /** Abbreviation in the header row. */
  short: string;
  /** Full name, announced to screen readers through `<abbr>`. */
  full: string;
  /**
   * When the column appears. `""` means always — and `points` is deliberately
   * the only measure column in that class besides W and L (BUG-11).
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
];

const mobileMeasures = (
  line: MbStandingLine,
  columns: readonly MbStandingsColumn[]
) =>
  columns
    .filter((column) => MOBILE_HIDDEN.includes(column))
    .map((column) => `${COLUMN[column].short} ${measure(line, column)}`)
    .join(" · ");

const measure = (line: MbStandingLine, column: MbStandingsColumn) => {
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
    case "form":
      return null;
  }
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
   * Required, and never visually hidden by accident: it is read out before the
   * table and is the only thing that tells a screen-reader user which
   * competition's table this is (invariant 47).
   */
  caption: string;
  columns?: readonly MbStandingsColumn[];
  compact?: boolean;
  /** Draws the row's rail in coral instead of leaving it unmarked. */
  highlightTeamId?: string;
  className?: string;
}) => (
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
          /* The leader's rail is teal — design language §1.2 maps "leader" to
             teal, and coral is reserved for the row the reader chose. A joint
             first gets it too, which is the whole point of reading `rank`. */
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
                className="matchbook-display pl-3! text-center text-[0.78rem] font-bold tabular-nums"
                style={rail ? { boxShadow: `inset 3px 0 0 ${rail}` } : undefined}
              >
                {/* A joint rank is marked with the printed-table "=" rather
                    than repeating a bare number, so two 2nds do not read as a
                    sorting bug. */}
                {line.sharesRank ? "=" : ""}
                {line.rank}
              </th>
              <td>
                <TeamMark team={line.team} size={compact ? "sm" : "md"} />
                {/* The route to the columns the breakpoints take away.
                    P / PF / PA / PD are `display:none` below `sm`, and a
                    reader on a phone had no way to reach them at all — the
                    legend still named all seven. They ride the row itself
                    instead, which needs no scroller and no accordion. */}
                <span className="mb-kicker mt-0.5 block tabular-nums sm:hidden">
                  {mobileMeasures(line, columns)}
                </span>
              </td>
              {columns.map((column) => {
                const spec = COLUMN[column];
                if (column === "form") {
                  return (
                    <td key={column} className={`text-center ${spec.reveal}`}>
                      {/* LETTERS, not squares. A W square and an L square are
                          `--mb-green` (luma 108.8) and `--mb-red` (luma 92.7)
                          — 1.15:1 apart at 11x11px, so a desaturated capture
                          showed 3W-0L as the same run of grey blocks as
                          1W-3L and the column carried its meaning in hue
                          alone (rubric HF-10). `FormLetters` is the shipped
                          primitive for exactly this case. The fixed 78px
                          right-aligned box keeps the column's width constant
                          whatever the run length — the property the padded
                          square strip was providing. */}
                      <span className="inline-flex w-[78px] justify-end">
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
                    }`}
                  >
                    {measure(line, column)}
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

/**
 * The legend that used to be three coloured medal glyphs. It is a ruled footer
 * strip of `.mb-kicker` pairs instead — the abbreviations are already in the
 * header's `<abbr>` titles, so this is for the pointer user who never hovers.
 *
 * Each entry carries its column's own `reveal` class, so the legend names
 * exactly the columns that are rendered at that width. It used to name all
 * seven at 390px while four of them were `display:none`, which is a caption
 * for a table that is not there.
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
    <span className="matchbook-display truncate text-[0.82rem] font-bold">
      {team.name}
    </span>
  </span>
);
