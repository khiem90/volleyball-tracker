import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { pluralise } from "@/lib/text";
import type { AppState } from "@/types/game";
import {
  buildTeamTallies,
  emptyTally,
  readinessPercent,
  readinessStatus,
  recentForm,
} from "./teamStats";
import type { MbTeamReadinessRow, MbTeamsSection } from "./teamPanels";
import {
  crestForTeam,
  type MbFormRow,
  type MbScheduleItem,
  type MbTeam,
  type MbTeamRow,
  type MbTeamsData,
} from "./types";

/* ---------------------------------------------------------------------------
   THE DIRECTORY VIEW

   `MbTeamsData` lives in `types.ts`, which charter H3 reserves to W1, so the
   fields the zero state needs extend it here rather than editing it. Nothing
   that reads `MbTeamsData` changes shape; `readiness` is re-declared because
   its row gains a state the three-word union in `types.ts` cannot spell (see
   `teamStats.ts`, THE STATE A NEW TEAM IS IN).
   --------------------------------------------------------------------------- */

export interface MbTeamsView extends Omit<MbTeamsData, "readiness"> {
  readiness: MbTeamReadinessRow[];
  /**
   * NO TEAM EXISTS — every panel on the screen is mute, so the route renders
   * the first-run composition instead of six empty ones.
   *
   * Keyed on teams and not on matches, because this screen is ABOUT teams: one
   * team with nothing played still fills the directory, the snapshot, the
   * readiness line and the profile, and only the two match-fed panels stay
   * quiet — which is what `muteSections` is for.
   */
  isFirstRun: boolean;
  /** The panels with nothing to print, in the order the page prints them. */
  muteSections: MbTeamsSection[];
  /** The masthead kicker, which must not read "0 matches completed". */
  subLine: string;
}

const shortDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "TBD";

const shortDay = (ts?: number) =>
  ts ? new Date(ts).toLocaleDateString("en-US", { weekday: "short" }) : "";

const shortTime = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "TBD";

const buildTeams = (state: AppState): MbTeamsView => {
  const dateLine = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const teamRefs = new Map<string, MbTeam>(
    state.teams.map((t) => [t.id, { name: t.name, crest: crestForTeam(t.id, t.name) }])
  );
  const refFor = (teamId: string): MbTeam =>
    teamRefs.get(teamId) ?? { name: "Unknown", crest: crestForTeam(teamId, "") };

  const competitionName = (competitionId: string | null) =>
    state.competitions.find((c) => c.id === competitionId)?.name ?? "Quick Match";

  const completed = state.matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const upcoming = state.matches
    .filter((m) => m.status === "pending" || m.status === "in_progress")
    .sort((a, b) => a.createdAt - b.createdAt);

  const tallies = buildTeamTallies(completed);

  // Competitions each team is entered in, for the directory's "Entered In" column.
  const competitionsByTeam = new Map<string, string[]>();
  for (const competition of state.competitions) {
    if (competition.status === "completed") continue;
    for (const teamId of competition.teamIds) {
      const names = competitionsByTeam.get(teamId) ?? [];
      names.push(competition.name);
      competitionsByTeam.set(teamId, names);
    }
  }

  const rows: MbTeamRow[] = state.teams
    .map((team) => {
      const tally = tallies.get(team.id) ?? emptyTally();
      const next = upcoming.find(
        (m) => m.homeTeamId === team.id || m.awayTeamId === team.id
      );
      const isHome = next?.homeTeamId === team.id;

      return {
        id: team.id,
        team: refFor(team.id),
        color: team.color,
        competitions: competitionsByTeam.get(team.id) ?? [],
        played: tally.played,
        won: tally.won,
        lost: tally.lost,
        pointsFor: tally.pointsFor,
        pointsAgainst: tally.pointsAgainst,
        nextMatch: next
          ? {
              date: shortDate(next.createdAt),
              time: shortTime(next.createdAt),
              opponent: refFor(isHome ? next.awayTeamId : next.homeTeamId),
              isHome,
              competition: competitionName(next.competitionId),
            }
          : null,
        status: next ? ("ACTIVE" as const) : ("IDLE" as const),
        form: recentForm(tally),
      };
    })
    .sort((a, b) => b.won - a.won || a.lost - b.lost || a.team.name.localeCompare(b.team.name));

  const totalWins = [...tallies.values()].reduce((sum, t) => sum + t.won, 0);

  const snapshot = [
    { label: "Wins", value: String(totalWins) },
    { label: "Teams", value: String(state.teams.length) },
    { label: "Matches", value: String(state.matches.length) },
  ];

  const readiness: MbTeamReadinessRow[] = rows.map((row) => {
    const tally = tallies.get(row.id);
    const played = tally?.played ?? 0;
    const percent = readinessPercent(tally);
    return {
      team: row.team,
      percent,
      played,
      form: row.form,
      /* Two arguments, always. The one-argument form cannot tell a team that has
         played nothing from one that has lost everything — see `teamStats.ts`. */
      status: readinessStatus(percent, played),
    };
  });

  const fixtures: MbScheduleItem[] = upcoming.slice(0, 5).map((match) => ({
    day: shortDay(match.createdAt),
    date: shortDate(match.createdAt),
    time: shortTime(match.createdAt),
    home: refFor(match.homeTeamId),
    away: refFor(match.awayTeamId),
    venue: competitionName(match.competitionId),
  }));

  const recentFormRows: MbFormRow[] = rows
    .filter((row) => row.form.length > 0)
    .slice(0, 6)
    .map((row) => {
      const wins = row.form.filter((result) => result === "W").length;
      return {
        team: row.team,
        form: row.form,
        record: `${wins}–${row.form.length - wins}`,
      };
    });

  /* Which of the two match-fed panels has nothing to say. Read straight off the
     arrays the panels render, one line each, so a panel cannot be listed as
     mute while it is drawing rows or drawn empty while it is listed. */
  const muteSections = (
    [
      ["fixtures", fixtures.length === 0],
      ["form", recentFormRows.length === 0],
    ] as const
  )
    .filter(([, mute]) => mute)
    .map(([key]) => key);

  return {
    dateLine,
    matchesCompleted: completed.length,
    teamCount: state.teams.length,
    rows,
    snapshot,
    readiness,
    fixtures,
    recentForm: recentFormRows,
    isFirstRun: state.teams.length === 0,
    muteSections,
    /* "0 matches completed" and "1 matches completed" were both live on this
       masthead. The zero case is a sentence, not a count, and the plural above
       zero goes through `pluralise` like every other count in the app. */
    subLine:
      completed.length === 0
        ? "No matches recorded yet"
        : `${completed.length} ${pluralise("match", completed.length)} completed`,
  };
};

export const useMatchbookTeams = (): MbTeamsView => {
  const { state } = useApp();
  return useMemo(() => buildTeams(state), [state]);
};
