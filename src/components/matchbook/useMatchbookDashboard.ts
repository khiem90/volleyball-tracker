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
  type MbDashboardData,
  type MbLeader,
  type MbStandingRow,
  type MbTeam,
} from "./types";

const ACCENTS = [
  "var(--mb-teal)",
  "var(--mb-gold)",
  "var(--mb-ink-muted)",
  "var(--mb-plum)",
];

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

const buildDashboard = (state: AppState): MbDashboardData => {
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
  const live = state.matches.filter((m) => m.status === "in_progress");
  const pending = state.matches
    .filter((m) => m.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt);

  const tallies = buildTeamTallies(completed);

  const rankedTeams = state.teams
    .map((team) => {
      const t = tallies.get(team.id) ?? emptyTally();
      const row: MbStandingRow = {
        team: refFor(team.id),
        played: t.played,
        won: t.won,
        lost: t.lost,
        sets: `${t.pointsFor}–${t.pointsAgainst}`,
        points: t.won * 3,
        form: recentForm(t),
      };
      return { teamId: team.id, row };
    })
    .sort((a, b) => b.row.points - a.row.points || b.row.won - a.row.won)
    .slice(0, 6);
  const standings = rankedTeams.map((r) => r.row);

  const featuredMatch = completed[0];
  const featured = featuredMatch
    ? {
        division: competitionName(featuredMatch.competitionId),
        time: shortTime(featuredMatch.completedAt),
        home: refFor(featuredMatch.homeTeamId),
        away: refFor(featuredMatch.awayTeamId),
        homeScore: featuredMatch.homeScore,
        awayScore: featuredMatch.awayScore,
        sets: [],
        venue: shortDate(featuredMatch.completedAt),
      }
    : null;

  const liveCourts = live.slice(0, 2).map((m, i) => ({
    court: `Court ${i + 1}`,
    time: shortTime(m.createdAt),
    home: refFor(m.homeTeamId),
    away: refFor(m.awayTeamId),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    setLabel: competitionName(m.competitionId),
  }));

  const schedule = pending.slice(0, 4).map((m) => ({
    day: shortDay(m.createdAt),
    date: shortDate(m.createdAt),
    time: shortTime(m.createdAt),
    home: refFor(m.homeTeamId),
    away: refFor(m.awayTeamId),
    venue: competitionName(m.competitionId),
  }));

  const bracket =
    standings.length >= 4
      ? {
          semifinals: [
            [
              { seed: 1, team: standings[0].team },
              { seed: 4, team: standings[3].team },
            ],
            [
              { seed: 2, team: standings[1].team },
              { seed: 3, team: standings[2].team },
            ],
          ] as [
            { seed: number; team: MbTeam },
            { seed: number; team: MbTeam },
          ][],
          finalNote: "Projected Championship Final",
          finalVenue: "Seeded from current standings",
        }
      : null;

  const recentResults = completed.slice(0, 4).map((m, i) => ({
    date: shortDate(m.completedAt),
    home: refFor(m.homeTeamId),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    away: refFor(m.awayTeamId),
    venue: competitionName(m.competitionId),
    accent: ACCENTS[i % ACCENTS.length],
  }));

  const readiness = rankedTeams.map(({ teamId, row }) => {
    const percent = readinessPercent(tallies.get(teamId));
    return { team: row.team, percent, form: row.form, status: readinessStatus(percent) };
  });

  const byWins = [...tallies.entries()].sort((a, b) => b[1].won - a[1].won);
  const byPoints = [...tallies.entries()].sort((a, b) => b[1].pointsFor - a[1].pointsFor);
  const byStreak = [...tallies.entries()].sort((a, b) => b[1].streak - a[1].streak);
  const leaders: MbLeader[] = [];
  if (byWins[0]) leaders.push({ team: refFor(byWins[0][0]), stat: "Wins", value: String(byWins[0][1].won) });
  if (byPoints[0]) leaders.push({ team: refFor(byPoints[0][0]), stat: "Points", value: String(byPoints[0][1].pointsFor) });
  if (byStreak[0]) leaders.push({ team: refFor(byStreak[0][0]), stat: "Streak", value: String(byStreak[0][1].streak) });

  const totalPoints = completed.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0);
  const activeCompetitions = state.competitions.filter((c) => c.status === "in_progress");

  return {
    dateLine,
    matchesCompleted: completed.length,
    league: activeCompetitions[0]?.name ?? "League",
    standings,
    featured,
    liveCourts,
    schedule,
    bracket,
    recentResults,
    readiness,
    leaders,
    allTimeTotals: [
      { label: "Teams", value: String(state.teams.length) },
      { label: "Matches", value: String(state.matches.length) },
      { label: "Points", value: totalPoints.toLocaleString("en-US") },
      { label: "Live", value: String(live.length) },
    ],
  };
};

export const useMatchbookDashboard = (): MbDashboardData => {
  const { state } = useApp();
  return useMemo(() => buildDashboard(state), [state]);
};
