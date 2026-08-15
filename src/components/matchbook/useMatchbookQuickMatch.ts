import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { pluralise } from "@/lib/text";
import { buildTeamTallies, recentForm, type TeamTally } from "./teamStats";
import type { MbLedgerRow } from "./panels";
import { crestForTeam, type MbFormResult, type MbTeam } from "./types";

/* ---------------------------------------------------------------------------
   THE THREE PANELS THAT CAN BE MUTE

   Measured at 390px on an empty account, `/quick-match` was 1195px carrying
   `NO QUICK MATCHES EXIST YET` and `NO COMPARISON EXISTS YET` under a working
   screen — plus a Scoreboard Preview of two grey ghost crests over 0 – 0 and a
   full-width DISABLED "Start Scoring", and a coral masthead action that was
   disabled too.

   Match Setup is the one panel that always has something to draw: with no teams
   it says so, and it carries the move. The preview is on this list because
   without two teams it is not a preview of anything — a scoreboard whose sides
   have no names is furniture, and the largest control on it cannot be pressed.
   Once two teams exist it is honest again at 0 – 0, which is exactly what a
   preview is.

   The index table lives in this file rather than beside the panels because the
   panels are inline in `quick-match/page.tsx` and the mute flags are computed
   here: a row and the flag that withholds it cannot drift while they are ten
   lines apart. `/`'s pair sits in `panels.tsx` for the same reason — the index
   goes wherever it can be read against the thing it describes.
   --------------------------------------------------------------------------- */

export type MbQuickMatchSection = "preview" | "recent" | "form";

const QUICK_MATCH_INDEX: {
  key: MbQuickMatchSection;
  term: string;
  gloss: string;
}[] = [
  {
    key: "preview",
    term: "Scoreboard Preview",
    gloss: "The two sides at 0 – 0, once there are two teams to name.",
  },
  {
    key: "recent",
    term: "Recent Quick Matches",
    gloss: "Every quick match you finish, newest first.",
  },
  {
    key: "form",
    term: "Team Form",
    gloss: "The two sides compared, once both teams are picked.",
  },
];

/** The withheld panels, in the order the populated screen prints them. */
export const mbQuickMatchContentsFor = (
  sections: readonly MbQuickMatchSection[]
): MbLedgerRow[] =>
  QUICK_MATCH_INDEX.filter((row) => sections.includes(row.key)).map(
    ({ term, gloss }) => ({ term, gloss })
  );

export interface MbQuickMatchRow {
  date: string;
  home: MbTeam;
  homeScore: number;
  awayScore: number;
  away: MbTeam;
  homeWon: boolean;
}

// Head-to-head style summary for one side of the setup panel.
export interface MbTeamFormSummary {
  team: MbTeam;
  form: MbFormResult[];
  record: string;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface MbQuickMatchData {
  dateLine: string;
  matchesCompleted: number;
  /** 1-based number of the quick match being set up. */
  nextMatchNumber: number;
  recentQuickMatches: MbQuickMatchRow[];
  summaryFor: (teamId: string | null) => MbTeamFormSummary | null;
  /** Teams on the books. Two is what this screen needs to do anything at all. */
  teamCount: number;
  /**
   * The panels with nothing to print. `form` is read off the SELECTION, not off
   * the data, which is why it can be mute on a fully populated account and why
   * the collapse still arms at two: an account with quick matches behind it
   * keeps its one honest "select both teams" empty state.
   */
  muteSections: MbQuickMatchSection[];
  /** The masthead kicker, which must not read "0 matches completed". */
  subLine: string;
}

const shortDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "TBD";

/**
 * @param selection the two team ids the setup panel currently holds. It is an
 * argument rather than page state because Team Form is mute on the SELECTION
 * and Recent Quick Matches on the DATA, and a screen cannot withhold a panel
 * whose emptiness it works out somewhere else — that is how a page ends up
 * listing a panel as missing while it is drawing rows.
 */
export const useMatchbookQuickMatch = (
  selection: { homeTeamId: string; awayTeamId: string } = {
    homeTeamId: "",
    awayTeamId: "",
  }
): MbQuickMatchData => {
  const { state } = useApp();
  const { homeTeamId, awayTeamId } = selection;

  return useMemo(() => {
    const dateLine = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const refFor = (teamId: string): MbTeam => {
      const team = state.teams.find((t) => t.id === teamId);
      return {
        name: team?.name ?? "Unknown",
        crest: crestForTeam(teamId, team?.name ?? ""),
      };
    };

    const completed = state.matches
      .filter((m) => m.status === "completed")
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

    const tallies = buildTeamTallies(completed);

    const quickMatches = state.matches.filter((m) => m.competitionId === null);

    const recentQuickMatches = quickMatches
      .filter((m) => m.status === "completed")
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(0, 5)
      .map((m) => ({
        date: shortDate(m.completedAt),
        home: refFor(m.homeTeamId),
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        away: refFor(m.awayTeamId),
        homeWon: m.winnerId === m.homeTeamId,
      }));

    const summaryFor = (teamId: string | null): MbTeamFormSummary | null => {
      if (!teamId) return null;
      const tally: TeamTally | undefined = tallies.get(teamId);
      const form = recentForm(tally);
      return {
        team: refFor(teamId),
        form,
        record: `${tally?.won ?? 0}–${tally?.lost ?? 0}`,
        won: tally?.won ?? 0,
        lost: tally?.lost ?? 0,
        pointsFor: tally?.pointsFor ?? 0,
        pointsAgainst: tally?.pointsAgainst ?? 0,
      };
    };

    const muteSections = (
      [
        ["preview", state.teams.length < 2],
        ["recent", recentQuickMatches.length === 0],
        ["form", !homeTeamId || !awayTeamId],
      ] as const
    )
      .filter(([, mute]) => mute)
      .map(([key]) => key);

    return {
      dateLine,
      matchesCompleted: completed.length,
      nextMatchNumber: quickMatches.length + 1,
      recentQuickMatches,
      summaryFor,
      teamCount: state.teams.length,
      muteSections,
      /* "0 matches completed" was the kicker on an account with no match in
         any state, and "1 matches completed" the one after that. */
      subLine:
        completed.length === 0
          ? "No matches recorded yet"
          : `${completed.length} ${pluralise("match", completed.length)} completed`,
    };
  }, [state, homeTeamId, awayTeamId]);
};
