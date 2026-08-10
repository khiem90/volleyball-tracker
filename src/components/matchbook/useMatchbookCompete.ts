import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { rankTeams } from "@/lib/standings";
import type { Competition, CompetitionType, Match } from "@/types/game";
import type { MbStandingLine } from "./StandingsTable";
import { buildTeamTallies, recentForm } from "./teamStats";
import { createTeamRef } from "./useMatchbookCompetitionDetail";
import { type MbTeam } from "./types";

export const COMPETITION_TYPE_LABELS: Record<CompetitionType, string> = {
  round_robin: "Round Robin",
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  win2out: "Win 2 & Out",
  two_match_rotation: "Two Match Rotation",
};

export interface MbCompetitionRow {
  id: string;
  name: string;
  typeLabel: string;
  status: Competition["status"];
  teamCount: number;
  completed: number;
  total: number;
}

export interface MbBracketCell {
  home: MbTeam | null;
  away: MbTeam | null;
  homeScore: number;
  awayScore: number;
  homeWon: boolean;
  awayWon: boolean;
  live: boolean;
  pending: boolean;
  /** A walkover: `home` advanced, there is no `away`, and no score exists. */
  bye: boolean;
}

export interface MbBracketRound {
  label: string;
  cells: MbBracketCell[];
}

/* F14 — THE FIFTH STANDINGS SHAPE, DELETED.
   This screen shipped its own `MbStandingLine` — `W L Pct PF PA PD`, no Pts,
   no Form, no rank, no legend — and it was the ONLY surface in the app that
   printed a percentage. Measured on `/competitions` against the same league on
   `/competitions/s-rr-28`: the list screen showed rows 1 and 2 both on `.667`
   and rows 3, 4 and 5 all on `.500`, so the printed measure could not
   reproduce the printed order, while the detail screen separated the same
   teams by 13 / 12 and 10 / 10 / 9 competition points. Two screens, one
   league, one of them ranked by a measure it did not show.

   The type is now `MbStandingLine` from `StandingsTable` — the canonical one —
   and the rows come from `rankTeams()`, which also fixes what
   `lib/roundRobin.calculateStandings` got wrong underneath: it counts bye
   matches, it decides the winner from the scoreline instead of `winnerId`, and
   it drops a draw entirely when the competition forbids ties, so
   `played !== won + lost + tied`. */
export type { MbStandingLine };

export interface MbCourtLine {
  court: string;
  home: MbTeam;
  away: MbTeam;
  homeScore: number;
  awayScore: number;
}

export interface MbMatchLine {
  label: string;
  home: MbTeam;
  away: MbTeam;
  homeScore?: number;
  awayScore?: number;
}

export interface MbCompeteSelected {
  competition: Competition;
  typeLabel: string;
  isElimination: boolean;
  teamCount: number;
  matchTotal: number;
  matchesCompleted: number;
  completionPct: number;
  courtCount: number | null;
  winner: MbTeam | null;
  bracket: MbBracketRound[];
  standings: MbStandingLine[];
  liveCourts: MbCourtLine[];
  schedule: MbMatchLine[];
  recent: MbMatchLine[];
  createdDate: string;
  seriesLabel: string;
}

export interface MbCompeteData {
  dateLine: string;
  rows: MbCompetitionRow[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  /**
   * `null` **only** on a first run.
   *
   * `selectedId` falls back to `competitions[0]`, so a non-empty `rows` always
   * resolves an event: `selected === null` and `rows.length === 0` are the same
   * condition, and the route branches on this one because it is the one that
   * narrows. That matters — every panel on the screen reads off `selected`, and
   * when it was `null` the shipped build printed "No competition exists yet"
   * TWICE (Tournament Status, Event Details) and "No competitions exist yet" a
   * third time, three headlines separated by an invisible plural, three of the
   * seven with no action at all.
   */
  selected: MbCompeteSelected | null;
  deleteCompetition: (id: string) => void;
  /**
   * Teams already on the books, capped for display. The one fact that decides
   * whether a competition can be created, printed on the screen that creates
   * one — `teamCount` is the honest total.
   */
  teams: MbTeam[];
  teamCount: number;
}

/** How many team marks the first-run panel prints before it counts the rest. */
const TEAMS_SHOWN = 6;

const shortDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "TBD";

const roundLabel = (round: number, maxRound: number, cellsInRound: number): string => {
  if (round === maxRound) return cellsInRound > 1 ? `Round ${round}` : "Final";
  if (round === maxRound - 1 && cellsInRound <= 2) return "Semifinals";
  if (round === maxRound - 2 && cellsInRound <= 4) return "Quarterfinals";
  return `Round ${round}`;
};

export const useMatchbookCompete = (): MbCompeteData => {
  const { state, deleteCompetition } = useApp();
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);

  return useMemo(() => {
    const dateLine = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    /* One resolver for the whole app. This hook's own version answered an
       unresolved id with the name "Unknown", which in a narrow cell paints as
       "UNKNO…" — a truncated placeholder shown to the reader as a team (F13) —
       and it did a linear `find` per call inside a render. `createTeamRef`
       memoises and answers "Unknown team". */
    const refFor = createTeamRef(state.teams);

    const matchesOf = (competitionId: string): Match[] =>
      state.matches.filter((m) => m.competitionId === competitionId);

    const competitions = [...state.competitions].sort((a, b) => {
      const rank = (c: Competition) =>
        c.status === "in_progress" ? 0 : c.status === "draft" ? 1 : 2;
      return rank(a) - rank(b) || b.createdAt - a.createdAt;
    });

    const rows: MbCompetitionRow[] = competitions.map((c) => {
      /* `7/15 matches` counted three walkovers as matches played and as
         matches to play. A bye is neither. */
      const matches = matchesOf(c.id).filter((m) => !m.isBye);
      return {
        id: c.id,
        name: c.name,
        typeLabel: COMPETITION_TYPE_LABELS[c.type],
        status: c.status,
        teamCount: c.teamIds.length,
        completed: matches.filter((m) => m.status === "completed").length,
        total: matches.length,
      };
    });

    const selectedId =
      manualSelectedId && competitions.some((c) => c.id === manualSelectedId)
        ? manualSelectedId
        : competitions[0]?.id ?? null;

    let selected: MbCompeteSelected | null = null;
    const competition = competitions.find((c) => c.id === selectedId);
    if (competition) {
      const matches = matchesOf(competition.id);
      /* A bye is a completed match carrying a generator-written 1–0 and one
         blank team id. It is not a result, so it is out of every count and out
         of the Recent Results strip — the same rule `useMatchbookSummary` and
         `useMatchbookHistory` already apply. */
      const playable = matches.filter((m) => !m.isBye);
      const completed = playable.filter((m) => m.status === "completed");
      const live = playable.filter((m) => m.status === "in_progress");
      const pending = playable.filter((m) => m.status === "pending");
      const isElimination =
        competition.type === "single_elimination" ||
        competition.type === "double_elimination";

      // Compact bracket built from real rounds (winners bracket only for DE).
      let bracket: MbBracketRound[] = [];
      if (isElimination) {
        const bracketMatches = matches.filter(
          (m) => !m.bracket || m.bracket === "winners" || m.bracket === "grand_finals"
        );
        const maxRound = Math.max(0, ...bracketMatches.map((m) => m.round));
        for (let round = 1; round <= maxRound; round++) {
          const cells = bracketMatches
            .filter((m) => m.round === round)
            .sort((a, b) => a.position - b.position)
            /* Byes resolve to the advancing team with no opponent and no
               score, exactly as `bracketCellFor` shapes them for the full
               rail. Read straight off the match, this cell printed the
               generator's 1–0 against "TBD" (F12). */
            .map((m) => {
              const bye = m.isBye === true;
              const advancing = bye
                ? (m.winnerId ?? m.homeTeamId ?? m.awayTeamId)
                : null;
              return {
                home: bye
                  ? advancing
                    ? refFor(advancing)
                    : null
                  : m.homeTeamId
                    ? refFor(m.homeTeamId)
                    : null,
                away: bye ? null : m.awayTeamId ? refFor(m.awayTeamId) : null,
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                homeWon:
                  !bye && m.winnerId === m.homeTeamId && m.status === "completed",
                awayWon:
                  !bye && m.winnerId === m.awayTeamId && m.status === "completed",
                live: m.status === "in_progress",
                pending: m.status === "pending",
                bye,
              };
            });
          if (cells.length > 0) {
            bracket.push({ label: roundLabel(round, maxRound, cells.length), cells });
          }
        }
        bracket = bracket.slice(0, 4);
      }

      const tallies = buildTeamTallies(
        [...completed].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      );

      const standings: MbStandingLine[] = isElimination
        ? []
        : rankTeams(competition.teamIds, matches, competition.config).map((row) => ({
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
            form: recentForm(tallies.get(row.teamId)),
          }));

      selected = {
        competition,
        typeLabel: COMPETITION_TYPE_LABELS[competition.type],
        isElimination,
        teamCount: competition.teamIds.length,
        matchTotal: playable.length,
        matchesCompleted: completed.length,
        completionPct:
          playable.length > 0
            ? Math.round((completed.length / playable.length) * 100)
            : 0,
        courtCount: competition.numberOfCourts ?? null,
        winner: competition.winnerId ? refFor(competition.winnerId) : null,
        bracket,
        standings,
        liveCourts: live.slice(0, 4).map((m, i) => ({
          court: `Court ${i + 1}`,
          home: refFor(m.homeTeamId),
          away: refFor(m.awayTeamId),
          homeScore: m.homeScore,
          awayScore: m.awayScore,
        })),
        schedule: pending
          .filter((m) => m.homeTeamId && m.awayTeamId)
          .slice(0, 5)
          .map((m) => ({
            label: `Round ${m.round}`,
            home: refFor(m.homeTeamId),
            away: refFor(m.awayTeamId),
          })),
        recent: [...completed]
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
          .slice(0, 5)
          .map((m) => ({
            label: shortDate(m.completedAt),
            home: refFor(m.homeTeamId),
            away: refFor(m.awayTeamId),
            homeScore: m.homeScore,
            awayScore: m.awayScore,
          })),
        createdDate: new Date(competition.createdAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        seriesLabel:
          competition.matchSeriesLength && competition.matchSeriesLength > 1
            ? `Best of ${competition.matchSeriesLength}`
            : "Single match",
      };
    }

    return {
      dateLine,
      rows,
      selectedId,
      setSelectedId: setManualSelectedId,
      selected,
      deleteCompetition,
      isFirstRun: rows.length === 0,
      teams: state.teams.slice(0, TEAMS_SHOWN).map((team) => refFor(team.id)),
      teamCount: state.teams.length,
    };
  }, [state, manualSelectedId, deleteCompetition]);
};
