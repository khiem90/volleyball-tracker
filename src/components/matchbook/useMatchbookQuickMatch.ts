import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
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
  summaryFor: (teamId: string | null) => MbTeamFormSummary | null;
}

const shortDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "TBD";

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

    const quickMatches = state.matches.filter((m) => m.competitionId === null);

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
      summaryFor,
    };
  }, [state]);
};
