import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import type { AppState, Match } from "@/types/game";
import {
  crestForTeam,
  type MbDashboardData,
  type MbFormResult,
  type MbLeader,
  type MbReadinessStatus,
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

const weekOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return Math.min(52, Math.floor(day / 7) + 1);
};

const buildDashboard = (state: AppState): MbDashboardData => {
  const now = new Date();
  const week = String(weekOfYear(now)).padStart(2, "0");
  const dateLine = now.toLocaleDateString("en-US", {
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

  // Per-team aggregates from completed matches (newest first).
  interface Tally {
    played: number;
    won: number;
    lost: number;
    scoreFor: number;
    scoreAgainst: number;
    results: MbFormResult[];
    streak: number;
  }
  const tallies = new Map<string, Tally>();
  const tallyFor = (teamId: string): Tally => {
    let t = tallies.get(teamId);
    if (!t) {
      t = { played: 0, won: 0, lost: 0, scoreFor: 0, scoreAgainst: 0, results: [], streak: 0 };
      tallies.set(teamId, t);
    }
    return t;
  };
  const record = (match: Match, teamId: string, scored: number, conceded: number) => {
    const t = tallyFor(teamId);
    t.played += 1;
    t.scoreFor += scored;
    t.scoreAgainst += conceded;
    const won = match.winnerId === teamId;
    if (won) t.won += 1;
    else t.lost += 1;
    t.results.push(won ? "W" : "L");
    if (t.results.length === t.streak + 1 && won) t.streak += 1;
  };
  for (const match of completed) {
    if (match.isBye) continue;
    record(match, match.homeTeamId, match.homeScore, match.awayScore);
    record(match, match.awayTeamId, match.awayScore, match.homeScore);
  }

  const rankedTeams = state.teams
    .map((team) => {
      const t = tallies.get(team.id) ?? tallyFor(team.id);
      const row: MbStandingRow = {
        team: refFor(team.id),
        played: t.played,
        won: t.won,
        lost: t.lost,
        sets: `${t.scoreFor}–${t.scoreAgainst}`,
        points: t.won * 3,
        form: t.results.slice(0, 5).reverse(),
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
    const t = tallies.get(teamId);
    const winRate = t && t.played > 0 ? t.won / t.played : 0;
    const recent = t?.results.slice(0, 5) ?? [];
    const recentRate =
      recent.length > 0 ? recent.filter((r) => r === "W").length / recent.length : 0;
    const percent = Math.round((winRate * 0.5 + recentRate * 0.5) * 100);
    const status: MbReadinessStatus =
      percent >= 85 ? "READY" : percent >= 65 ? "GOOD" : "NEEDS ATTN";
    return { team: row.team, percent, form: recent.slice().reverse(), status };
  });

  const byWins = [...tallies.entries()].sort((a, b) => b[1].won - a[1].won);
  const byPoints = [...tallies.entries()].sort((a, b) => b[1].scoreFor - a[1].scoreFor);
  const byStreak = [...tallies.entries()].sort((a, b) => b[1].streak - a[1].streak);
  const leaders: MbLeader[] = [];
  if (byWins[0]) leaders.push({ team: refFor(byWins[0][0]), stat: "Wins", value: String(byWins[0][1].won) });
  if (byPoints[0]) leaders.push({ team: refFor(byPoints[0][0]), stat: "Points", value: String(byPoints[0][1].scoreFor) });
  if (byStreak[0]) leaders.push({ team: refFor(byStreak[0][0]), stat: "Streak", value: String(byStreak[0][1].streak) });

  const totalPoints = completed.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0);
  const activeCompetitions = state.competitions.filter((c) => c.status === "in_progress");

  return {
    week,
    dateLine,
    matchesCompleted: completed.length,
    league: activeCompetitions[0]?.name ?? "League",
    season: `${now.getFullYear()} Season`,
    standings,
    featured,
    liveCourts,
    schedule,
    bracket,
    recentResults,
    readiness,
    leaders,
    seasonTotals: [
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
