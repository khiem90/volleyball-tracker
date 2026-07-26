import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import type { AppState } from "@/types/game";
import {
  buildTeamTallies,
  emptyTally,
  readinessPercent,
  readinessStatus,
  recentForm,
} from "./teamStats";
import {
  crestForTeam,
  type MbFormRow,
  type MbReadinessRow,
  type MbScheduleItem,
  type MbTeam,
  type MbTeamRow,
  type MbTeamsData,
} from "./types";

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

const buildTeams = (state: AppState): MbTeamsData => {
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

  const readiness: MbReadinessRow[] = rows.map((row) => {
    const percent = readinessPercent(tallies.get(row.id));
    return {
      team: row.team,
      percent,
      form: row.form,
      status: readinessStatus(percent),
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

  return {
    dateLine,
    matchesCompleted: completed.length,
    teamCount: state.teams.length,
    rows,
    snapshot,
    readiness,
    fixtures,
    recentForm: recentFormRows,
  };
};

export const useMatchbookTeams = (): MbTeamsData => {
  const { state } = useApp();
  return useMemo(() => buildTeams(state), [state]);
};
