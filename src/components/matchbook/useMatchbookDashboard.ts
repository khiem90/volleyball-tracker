import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { rankTeams } from "@/lib/standings";
import { pluralise } from "@/lib/text";
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
import type { MbStartStep, MbStepState } from "./panels";

/* ---------------------------------------------------------------------------
   THE FIRST-RUN VIEW

   `MbDashboardData` lives in `types.ts`, which this workstream does not own, so
   the first-run fields extend it here rather than editing it. Nothing that
   reads `MbDashboardData` changes shape.
   --------------------------------------------------------------------------- */

/** A destination the reader can actually reach right now. */
export interface MbDashboardAction {
  label: string;
  href: string;
  /** Sprite id. */
  icon: string;
}

export interface MbDashboardView extends MbDashboardData {
  /**
   * NOTHING HAS BEEN PLAYED YET — no completed match and none in progress.
   *
   * The Overview is a screen about RESULTS: seven of its eight panels can only
   * be filled by one. Until a result exists the screen renders the first-run
   * composition instead, because every one of those panels would otherwise
   * print a `display/stat-sm` headline saying so, at the same size, one after
   * another.
   *
   * The condition is not `matches.length === 0`, and that distinction was
   * measured. A user who follows the three steps to the letter — add teams,
   * create a round robin — lands back here the moment the generator writes the
   * schedule, and at `matches.length === 1` the screen fell off the ledge it
   * had just been cleared of: 2431px, eight panels, FIVE headlines (no match of
   * the day · no live matches · no bracket · no results · no team leaders),
   * over a standings table of two teams on `0 0 0`, which this file's own
   * ranking notes call worse than no table at all.
   *
   * Keyed on results rather than on teams for the same reason: a competition
   * whose schedule has not been generated has nothing to report either.
   *
   * A match IN PROGRESS ends it — Live Courts has something to say the instant
   * one exists, and so does Match of the Day the instant one finishes.
   */
  isFirstRun: boolean;
  /** The three steps to a first match, with the live one marked. */
  startSteps: MbStartStep[];
  /**
   * The masthead's one action. It is derived from the data because the shipped
   * one was not: on an account with zero teams and zero matches the loudest
   * control on the screen read "Record Result".
   */
  primaryAction: MbDashboardAction;
  /** A second, genuinely different path, once the data allows one. */
  altAction: { label: string; href: string } | null;
  /** The masthead's kicker, which must not read "0 matches completed". */
  subLine: string;
}

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

/* ---------------------------------------------------------------------------
   THE PROGRESSION

   Three steps, and the FIRST unfinished one is the live step — not a stored
   cursor, so it cannot disagree with the data behind it. A user who adds teams
   from `/teams`, or creates a competition from the wizard's own quick-add,
   arrives back here with the ledger already moved on.
   --------------------------------------------------------------------------- */

const buildSteps = (
  teamCount: number,
  competitionName: string | null,
  scheduled: number
): MbStartStep[] => {
  /* Step 3 is never `done` in a first run: the moment a result exists the whole
     composition is replaced by the populated overview. */
  const done = [teamCount >= 2, competitionName !== null, false];
  const currentIndex = done.indexOf(false);
  const stateOf = (i: number): MbStepState =>
    done[i] ? "done" : i === currentIndex ? "current" : "todo";

  return [
    {
      n: "01",
      title: "Add Your Teams",
      deck: "A match needs two sides. A team keeps its crest and its record for the whole season.",
      state: stateOf(0),
      note:
        teamCount > 0
          ? `${teamCount} ${teamCount === 1 ? "team" : "teams"} added`
          : undefined,
    },
    {
      n: "02",
      title: "Create a Competition",
      deck: "Round robin, knockout or rotation — the format writes the schedule for you.",
      state: stateOf(1),
      note: competitionName ?? undefined,
    },
    {
      n: "03",
      title: "Play the First Match",
      deck: "Every score you record lands on this page: standings, live courts, results and leaders.",
      state: stateOf(2),
      /* The format has already written the fixtures — say so, so the step that
         is waiting on the reader does not read as though nothing happened when
         the generator has just done its work. */
      note:
        scheduled > 0
          ? `${scheduled} ${pluralise("match", scheduled)} scheduled`
          : undefined,
    },
  ];
};

const buildDashboard = (state: AppState): MbDashboardView => {
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

  /* ------------------------------------------------------------- first run */

  const teamCount = state.teams.length;
  const newest =
    [...state.competitions].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  const isFirstRun = completed.length === 0 && live.length === 0;

  /* The one action that is possible, in the order the data unlocks it. Every
     branch below was reachable on the shipped build and every one of them
     printed "Record Result" — including the first, on an account with zero
     teams and zero matches, which is the loudest control on the screen asking
     for the result of a match that cannot exist.

     The last branch is the one that grew with `isFirstRun`: with teams, a
     competition and a generated schedule but nothing played, the move is to
     OPEN that competition, which is where a fixture is started. "Record
     Result" only becomes true once there is a result to sit beside. */
  const primaryAction: MbDashboardAction = !isFirstRun
    ? { label: "Record Result", href: "/competitions", icon: "plus" }
    : teamCount < 2
      ? {
          label: teamCount === 0 ? "Add Your First Team" : "Add Another Team",
          href: "/teams",
          icon: "teams",
        }
      : newest === null
        ? { label: "Create a Competition", href: "/competitions/new", icon: "plus" }
        : {
            label: pending.length > 0 ? "Start the First Match" : "Open the Competition",
            href: `/competitions/${newest.id}`,
            icon: "compete",
          };

  return {
    dateLine,
    matchesCompleted: completed.length,
    isFirstRun,
    startSteps: buildSteps(teamCount, newest?.name ?? null, pending.length),
    primaryAction,
    /* Quick Match is the app's own primary and it needs two teams to name the
       sides, so it becomes a real alternative exactly when it becomes possible
       — and never as a second copy of `primaryAction`. */
    altAction:
      isFirstRun && teamCount >= 2
        ? { label: "Score a Quick Match", href: "/quick-match" }
        : null,
    /* Read off `completed` and not off `isFirstRun`, so the one state where the
       two disagree — a match in progress, none finished — says "no matches
       recorded yet" rather than "0 matches completed". */
    subLine:
      completed.length === 0
        ? "No matches recorded yet"
        : `${completed.length} ${pluralise("match", completed.length)} completed`,
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

export const useMatchbookDashboard = (): MbDashboardView => {
  const { state } = useApp();
  return useMemo(() => buildDashboard(state), [state]);
};
