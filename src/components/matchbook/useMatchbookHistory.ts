import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Match } from "@/types/game";
import { buildTeamTallies } from "./teamStats";
import { crestForTeam, type MbTeam } from "./types";

export interface MbLedgerEntry {
  id: string;
  time: string;
  home: MbTeam;
  away: MbTeam;
  homeScore: number;
  awayScore: number;
  competition: string;
  winner: MbTeam;
  homeWon: boolean;
}

export interface MbLedgerDay {
  label: string;
  entries: MbLedgerEntry[];
}

export interface MbMatchReport {
  entry: MbLedgerEntry;
  date: string;
  homeRecord: string;
  awayRecord: string;
  homePoints: number;
  awayPoints: number;
}

export interface MbMatchup {
  a: MbTeam;
  b: MbTeam;
  leader: string;
  pct: string;
  played: number;
}

export interface MbRecentCompetition {
  id: string;
  name: string;
  range: string;
  matches: number;
}

export interface MbHistoryData {
  dateLine: string;
  totalResults: number;
  filteredCount: number;
  days: MbLedgerDay[];
  report: MbMatchReport | null;
  selectMatch: (id: string | null) => void;
  selectedId: string | null;
  summary: { matches: number; points: number; teams: number; avgPoints: string };
  matchups: MbMatchup[];
  competitions: MbRecentCompetition[];
  filterOptions: {
    competitions: { id: string; name: string }[];
    teams: { id: string; name: string }[];
  };
  downloadCsv: () => void;
}

const shortDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "TBD";

export const useMatchbookHistory = (filters: {
  competitionId: string;
  teamId: string;
  query: string;
}): MbHistoryData => {
  const { state } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return useMemo(() => {
    const dateLine = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const teamName = (id: string) =>
      state.teams.find((t) => t.id === id)?.name ?? "Unknown";
    const refFor = (id: string): MbTeam => ({
      name: teamName(id),
      crest: crestForTeam(id, teamName(id)),
    });
    const compName = (id: string | null) =>
      state.competitions.find((c) => c.id === id)?.name ?? "Quick Match";

    const completed = state.matches
      .filter((m) => m.status === "completed" && !m.isBye)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

    const query = filters.query.trim().toLowerCase();
    const filtered = completed.filter((m) => {
      if (filters.competitionId && (m.competitionId ?? "quick") !== filters.competitionId)
        return false;
      if (filters.teamId && m.homeTeamId !== filters.teamId && m.awayTeamId !== filters.teamId)
        return false;
      if (query) {
        const haystack =
          `${teamName(m.homeTeamId)} ${teamName(m.awayTeamId)} ${compName(m.competitionId)}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const toEntry = (m: Match): MbLedgerEntry => {
      const homeWon = m.winnerId === m.homeTeamId;
      return {
        id: m.id,
        time: m.completedAt
          ? new Date(m.completedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : "",
        home: refFor(m.homeTeamId),
        away: refFor(m.awayTeamId),
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        competition: compName(m.competitionId),
        winner: refFor(homeWon ? m.homeTeamId : m.awayTeamId),
        homeWon,
      };
    };

    const shown = filtered.slice(0, 25);
    const days: MbLedgerDay[] = [];
    for (const m of shown) {
      const label = m.completedAt
        ? new Date(m.completedAt).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "Unknown date";
      const day = days.find((d) => d.label === label);
      const entry = toEntry(m);
      if (day) day.entries.push(entry);
      else days.push({ label, entries: [entry] });
    }

    const tallies = buildTeamTallies(completed);
    const reportMatch =
      filtered.find((m) => m.id === selectedId) ?? shown[0] ?? null;
    const report: MbMatchReport | null = reportMatch
      ? {
          entry: toEntry(reportMatch),
          date: new Date(reportMatch.completedAt ?? 0).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          homeRecord: `${tallies.get(reportMatch.homeTeamId)?.won ?? 0}–${tallies.get(reportMatch.homeTeamId)?.lost ?? 0}`,
          awayRecord: `${tallies.get(reportMatch.awayTeamId)?.won ?? 0}–${tallies.get(reportMatch.awayTeamId)?.lost ?? 0}`,
          homePoints: tallies.get(reportMatch.homeTeamId)?.pointsFor ?? 0,
          awayPoints: tallies.get(reportMatch.awayTeamId)?.pointsFor ?? 0,
        }
      : null;

    const totalPoints = completed.reduce((s, m) => s + m.homeScore + m.awayScore, 0);
    const summary = {
      matches: completed.length,
      points: totalPoints,
      teams: state.teams.length,
      avgPoints:
        completed.length > 0 ? (totalPoints / completed.length).toFixed(1) : "0",
    };

    // Head-to-head win percentages, most played pairs first.
    const pairs = new Map<string, { a: string; b: string; aWins: number; bWins: number }>();
    for (const m of completed) {
      const [a, b] = [m.homeTeamId, m.awayTeamId].sort();
      const key = `${a}|${b}`;
      const rec = pairs.get(key) ?? { a, b, aWins: 0, bWins: 0 };
      if (m.winnerId === a) rec.aWins += 1;
      else if (m.winnerId === b) rec.bWins += 1;
      pairs.set(key, rec);
    }
    const matchups: MbMatchup[] = [...pairs.values()]
      .map((p) => {
        const played = p.aWins + p.bWins;
        const lead = Math.max(p.aWins, p.bWins);
        const leaderId = p.aWins >= p.bWins ? p.a : p.b;
        return {
          a: refFor(p.a),
          b: refFor(p.b),
          leader: `${teamName(leaderId)} leads ${Math.max(p.aWins, p.bWins)}–${Math.min(p.aWins, p.bWins)}`,
          pct: played > 0 ? `${((lead / played) * 100).toFixed(1)}%` : "—",
          played,
        };
      })
      .sort((x, y) => y.played - x.played)
      .slice(0, 4);

    const competitions: MbRecentCompetition[] = [...state.competitions]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 4)
      .map((c) => {
        const ms = completed.filter((m) => m.competitionId === c.id);
        const times = ms.map((m) => m.completedAt ?? 0).filter(Boolean);
        const range =
          times.length > 0
            ? `${shortDate(Math.min(...times))} – ${shortDate(Math.max(...times))}`
            : shortDate(c.createdAt);
        return { id: c.id, name: c.name, range, matches: ms.length };
      });

    const downloadCsv = () => {
      const rows = [
        ["Date", "Home", "Away", "Home Score", "Away Score", "Winner", "Competition"],
        ...filtered.map((m) => [
          m.completedAt ? new Date(m.completedAt).toISOString() : "",
          teamName(m.homeTeamId),
          teamName(m.awayTeamId),
          String(m.homeScore),
          String(m.awayScore),
          teamName(m.winnerId ?? ""),
          compName(m.competitionId),
        ]),
      ];
      const csv = rows
        .map((r) => r.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
        .join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "match-archive.csv";
      link.click();
      URL.revokeObjectURL(url);
    };

    return {
      dateLine,
      totalResults: completed.length,
      filteredCount: filtered.length,
      days,
      report,
      selectMatch: setSelectedId,
      selectedId: reportMatch?.id ?? null,
      summary,
      matchups,
      competitions,
      filterOptions: {
        competitions: [
          ...state.competitions.map((c) => ({ id: c.id, name: c.name })),
          { id: "quick", name: "Quick Matches" },
        ],
        teams: state.teams.map((t) => ({ id: t.id, name: t.name })),
      },
      downloadCsv,
    };
  }, [state, filters.competitionId, filters.teamId, filters.query, selectedId]);
};
