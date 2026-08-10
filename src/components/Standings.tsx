"use client";

import { useMemo } from "react";
import { MbStandingsTable } from "@/components/matchbook/StandingsTable";
import { createTeamRef } from "@/components/matchbook/useMatchbookCompetitionDetail";
import { buildTeamTallies, recentForm } from "@/components/matchbook/teamStats";
import { assignRanks } from "@/lib/standings";
import type { Match, PersistentTeam, RoundRobinStanding } from "@/types/game";

/**
 * The round-robin table, as `MbStandingsTable`.
 *
 * What this file used to be: nine `<th>`s with no `scope`, no `<caption>`,
 * lucide `Trophy`/`Medal` glyphs tinted `amber-500`/`slate-400`/`amber-700` for
 * the top three, `emerald-500` win counts, and no `truncate` on the team cell —
 * so at 390px long names wrapped to four lines and **Pts** fell off the right
 * edge behind an unsignalled scroll (BUG-11).
 *
 * It now renders whatever order it is handed, but numbers it with `assignRanks`
 * so joint positions are real rather than `index + 1`. Callers that want the
 * canonical order pass `rankTeams()` output straight through.
 */
export const Standings = ({
  standings,
  teams,
  matches = [],
  caption = "Standings",
  highlightTeamId,
}: {
  standings: RoundRobinStanding[];
  teams: PersistentTeam[];
  /** Used only for the form squares. Omit and the Form column reads "—". */
  matches?: Match[];
  caption?: string;
  highlightTeamId?: string;
}) => {
  const rows = useMemo(() => {
    const refFor = createTeamRef(teams);
    const tallies = buildTeamTallies(
      [...matches]
        .filter((m) => m.status === "completed")
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    );
    return assignRanks(standings).map((row) => ({
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
  }, [standings, teams, matches]);

  return (
    <MbStandingsTable rows={rows} caption={caption} highlightTeamId={highlightTeamId} />
  );
};
