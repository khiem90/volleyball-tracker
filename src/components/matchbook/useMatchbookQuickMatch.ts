import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { abandonedQuickMatches } from "@/lib/quickMatches";
import { buildTeamTallies, recentForm, type TeamTally } from "./teamStats";
import { crestForTeam, type MbFormResult, type MbTeam } from "./types";

export interface MbQuickMatchRow {
  date: string;
  home: MbTeam;
  homeScore: number;
  awayScore: number;
  away: MbTeam;
  homeWon: boolean;
}

/** A quick match left mid-way, offered to resume or discard. */
export interface MbAbandonedMatchRow {
  id: string;
  home: MbTeam;
  homeScore: number;
  awayScore: number;
  away: MbTeam;
  /** When the match was set up, such as "Sep 27, 7:42 PM". */
  started: string;
  /** False once a team has left the roster, since the scoring page cannot show the match then. */
  resumable: boolean;
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
  /** Quick matches left mid-way, the most recently started first. */
  abandonedQuickMatches: MbAbandonedMatchRow[];
  summaryFor: (teamId: string | null) => MbTeamFormSummary | null;
}

const shortDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "TBD";

const dateAndTime = (ts: number) =>
  new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const useMatchbookQuickMatch = (): MbQuickMatchData => {
  const { state } = useApp();

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

    const quickMatches = state.matches.filter((m) => m.tournamentId === null);

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

    const onRoster = (teamId: string) => state.teams.some((t) => t.id === teamId);
    const abandoned = abandonedQuickMatches(state.matches).map((m) => ({
      id: m.id,
      home: refFor(m.homeTeamId),
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      away: refFor(m.awayTeamId),
      started: dateAndTime(m.createdAt),
      resumable: onRoster(m.homeTeamId) && onRoster(m.awayTeamId),
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

    return {
      dateLine,
      matchesCompleted: completed.length,
      nextMatchNumber: quickMatches.length + 1,
      recentQuickMatches,
      abandonedQuickMatches: abandoned,
      summaryFor,
    };
  }, [state]);
};
