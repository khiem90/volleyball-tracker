import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { calculateStandings } from "@/lib/roundRobin";
import type { Competition, CompetitionType, Match } from "@/types/game";
import { crestForTeam, type MbTeam } from "./types";

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
}

export interface MbBracketRound {
  label: string;
  cells: MbBracketCell[];
}

export interface MbStandingLine {
  team: MbTeam;
  won: number;
  lost: number;
  pct: string;
  pointsFor: number;
  pointsAgainst: number;
  diff: string;
}

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
  selected: MbCompeteSelected | null;
  deleteCompetition: (id: string) => void;
}

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

    const refFor = (teamId: string): MbTeam => {
      const team = state.teams.find((t) => t.id === teamId);
      return {
        name: team?.name ?? "Unknown",
        crest: crestForTeam(teamId, team?.name ?? ""),
      };
    };

    const matchesOf = (competitionId: string): Match[] =>
      state.matches.filter((m) => m.competitionId === competitionId);

    const competitions = [...state.competitions].sort((a, b) => {
      const rank = (c: Competition) =>
        c.status === "in_progress" ? 0 : c.status === "draft" ? 1 : 2;
      return rank(a) - rank(b) || b.createdAt - a.createdAt;
    });

    const rows: MbCompetitionRow[] = competitions.map((c) => {
      const matches = matchesOf(c.id);
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
      const completed = matches.filter((m) => m.status === "completed");
      const live = matches.filter((m) => m.status === "in_progress");
      const pending = matches.filter((m) => m.status === "pending");
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
            .map((m) => ({
              home: m.homeTeamId ? refFor(m.homeTeamId) : null,
              away: m.awayTeamId ? refFor(m.awayTeamId) : null,
              homeScore: m.homeScore,
              awayScore: m.awayScore,
              homeWon: m.winnerId === m.homeTeamId && m.status === "completed",
              awayWon: m.winnerId === m.awayTeamId && m.status === "completed",
              live: m.status === "in_progress",
              pending: m.status === "pending",
            }));
          if (cells.length > 0) {
            bracket.push({ label: roundLabel(round, maxRound, cells.length), cells });
          }
        }
        bracket = bracket.slice(0, 4);
      }

      const standings = !isElimination
        ? calculateStandings(competition.teamIds, matches, competition.config).map(
            (s) => ({
              team: refFor(s.teamId),
              won: s.won,
              lost: s.lost,
              pct:
                s.played > 0
                  ? (s.won / s.played).toFixed(3).replace(/^0/, "")
                  : "—",
              pointsFor: s.pointsFor,
              pointsAgainst: s.pointsAgainst,
              diff: `${s.pointsDiff >= 0 ? "+" : ""}${s.pointsDiff}`,
            })
          )
        : [];

      selected = {
        competition,
        typeLabel: COMPETITION_TYPE_LABELS[competition.type],
        isElimination,
        teamCount: competition.teamIds.length,
        matchTotal: matches.length,
        matchesCompleted: completed.length,
        completionPct:
          matches.length > 0
            ? Math.round((completed.length / matches.length) * 100)
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
    };
  }, [state, manualSelectedId, deleteCompetition]);
};
