import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { rankTeams } from "@/lib/standings";
import type { AppState, Competition } from "@/types/game";
import { createTeamRef } from "./useMatchbookCompetitionDetail";
import type { MbStandingLine } from "./StandingsTable";
import {
  buildTeamTallies,
  readinessPercent,
  readinessStatus,
  recentForm,
} from "./teamStats";
import { type MbDashboardData, type MbLeader, type MbTeam } from "./types";

/* ===========================================================================
   THE OVERVIEW VIEW MODEL

   Two fabrications lived in this file and both survived to the finished
   programme. Both were measured on the stress fixture at 1440px.

   F14 — THE STANDINGS TABLE WAS NOT A LEAGUE TABLE.
   The panel is headed with a competition's name, and the rows were built from
   `state.teams` — EVERY team in the app — tallied over `state.matches` — EVERY
   match in the app, across every competition and the loose quick matches —
   with `points: t.won * 3` hardcoded, ignoring each competition's own points
   system. Measured: the panel read "Harbor Classic — Sixteen Standings" over a
   row saying AB had played 8; Harbor Classic had played one round, so nobody
   in it had played more than one. Ranking was `points desc, won desc`, a third
   ordering measure beside the two the other screens use.

   It is now `rankTeams(competition.teamIds, that competition's matches,
   competition.config)` — the same call `/competitions/[id]`, `/session/[code]`
   and `/summary/[code]` make — emitted as the same `MbStandingLine` those
   screens render through `MbStandingsTable`. One vocabulary, one ranking.

   F13 — "UNKNOWN" WAS LEAKING INTO THE SCHEDULE.
   An undetermined bracket slot carries `homeTeamId: ""`, and this file's own
   `refFor` answered any unresolved id with the name "Unknown". In a 32px cell
   that painted as "UNKNO…" — a truncated placeholder shown to the user as a
   team — while the Bracket panel beside it correctly said "TBD" for the same
   state. The schedule now shows only fixtures that HAVE both teams, which is
   what every other schedule surface in the app already does, and the resolver
   is `createTeamRef` so all five hooks answer a missing id with one string.
   =========================================================================== */

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

  const refFor = createTeamRef(state.teams);

  const competitionName = (competitionId: string | null) =>
    state.competitions.find((c) => c.id === competitionId)?.name ?? "Quick Match";

  /* Byes are excluded everywhere a result is counted or shown. A walkover is
     a completed match carrying a generator-written 1–0 and one blank team id
     (`lib/singleElimination.ts:164-175`), so an unfiltered `completed` put a
     match nobody played into Match of the Day, Recent Results and the
     "matches completed" figure in the masthead. */
  const completed = state.matches
    .filter((m) => m.status === "completed" && !m.isBye)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const live = state.matches.filter((m) => m.status === "in_progress");
  /* F13: `homeTeamId` / `awayTeamId` are `""` until a bracket feeder resolves.
     Those are not fixtures — nobody can play one, and there is no name to
     print for either side. `useMatchbookCompete` and
     `useMatchbookCompetitionDetail` have always filtered them here; this hook
     did not, and named them "Unknown". */
  const pending = state.matches
    .filter((m) => m.status === "pending" && m.homeTeamId && m.awayTeamId)
    .sort((a, b) => a.createdAt - b.createdAt);

  const tallies = buildTeamTallies(completed);

  /* ------------------------------------------------------------- standings */

  /* WHICH league the table is for, named honestly in the caption. A points
     table is only meaningful for the competition that generated it, so the
     first in-progress round robin wins; failing that any competition in
     progress; failing that the most recently created one. `null` means the
     panel says so rather than inventing a cross-competition tally. */
  const rank = (c: Competition) =>
    (c.status === "in_progress" ? 0 : 2) + (c.type === "round_robin" ? 0 : 1);
  const league: Competition | null =
    [...state.competitions].sort(
      (a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt
    )[0] ?? null;

  const leagueMatches = league
    ? state.matches.filter((m) => m.competitionId === league.id)
    : [];
  const leagueTallies = league
    ? buildTeamTallies(
        leagueMatches
          .filter((m) => m.status === "completed" && !m.isBye)
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      )
    : tallies;

  const ranked = league
    ? rankTeams(league.teamIds, leagueMatches, league.config)
    : [];
  const standings: MbStandingLine[] = ranked.slice(0, 6).map((row) => ({
    teamId: row.teamId,
    team: refFor(row.teamId),
    rank: row.rank,
    sharesRank: row.sharesRank,
    played: row.played,
    won: row.won,
    lost: row.lost,
    tied: row.tied,
    pointsFor: row.pointsFor,
    pointsAgainst: row.pointsAgainst,
    diff: row.pointsDiff,
    points: row.competitionPoints,
    form: recentForm(leagueTallies.get(row.teamId)),
  }));

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

  /* Readiness is a whole-app measure of a team, not a league position, so it is
     ordered by the quantity the panel prints. It used to inherit the standings
     order, which is why the column read 68 · 76 · 48 · 61 · 42 · 59 — a "Team
     Readiness" panel sorted by something else. */
  const readiness = state.teams
    .map((team) => {
      const tally = tallies.get(team.id);
      const percent = readinessPercent(tally);
      return {
        team: refFor(team.id),
        percent,
        form: recentForm(tally),
        status: readinessStatus(percent),
      };
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);

  const byWins = [...tallies.entries()].sort((a, b) => b[1].won - a[1].won);
  const byPoints = [...tallies.entries()].sort((a, b) => b[1].pointsFor - a[1].pointsFor);
  const byStreak = [...tallies.entries()].sort((a, b) => b[1].streak - a[1].streak);
  const leaders: MbLeader[] = [];
  if (byWins[0]) leaders.push({ team: refFor(byWins[0][0]), stat: "Wins", value: String(byWins[0][1].won) });
  if (byPoints[0]) leaders.push({ team: refFor(byPoints[0][0]), stat: "Points", value: String(byPoints[0][1].pointsFor) });
  if (byStreak[0]) leaders.push({ team: refFor(byStreak[0][0]), stat: "Streak", value: String(byStreak[0][1].streak) });

  const totalPoints = completed.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0);
  const playableTotal = state.matches.filter((m) => !m.isBye).length;

  return {
    dateLine,
    matchesCompleted: completed.length,
    /* The name of the competition the table above actually belongs to — the
       panel used to be headed with one competition's name over a table built
       from every team and every match in the app. */
    league: league?.name ?? "Standings",
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
      { label: "Matches", value: String(playableTotal) },
      { label: "Points", value: totalPoints.toLocaleString("en-US") },
      { label: "Live", value: String(live.length) },
    ],
  };
};

export const useMatchbookDashboard = (): MbDashboardData => {
  const { state } = useApp();
  return useMemo(() => buildDashboard(state), [state]);
};
