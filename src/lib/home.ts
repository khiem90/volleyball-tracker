import { isRotationFormat } from "@/lib/formats";
import { ledgerRows, type LedgerRow } from "@/lib/history";
import type { Match, PersistentTeam, Tournament } from "@/types/game";

/**
 * Home, the pure part: the live tournaments to resume and the latest
 * results, worked out from the account's tournaments and matches. Nothing
 * in here touches the database or React.
 */

// ============================================
// Live tournaments
// ============================================

export interface LiveTournament {
  tournament: Tournament;
  /** Teams still in it. A team that withdrew is out, though its results stay. */
  teams: number;
  /** Matches with a result. A bye is not a match played. */
  played: number;
  /**
   * Every match the tournament will play, byes left out. Null for the
   * rotation formats, which keep scheduling until the owner ends them.
   */
  total: number | null;
  /** Matches being scored right now. */
  inPlay: number;
}

const startedAt = (tournament: Tournament) => tournament.startedAt ?? tournament.createdAt;

/** The live tournaments, the most recently started first, so rows stay put while courts score. */
export const liveTournaments = (tournaments: Tournament[], matches: Match[]): LiveTournament[] => {
  const byTournament = new Map<string, Match[]>();
  for (const match of matches) {
    if (!match.tournamentId || match.isBye) continue;
    const list = byTournament.get(match.tournamentId) ?? [];
    list.push(match);
    byTournament.set(match.tournamentId, list);
  }

  return tournaments
    .filter((tournament) => tournament.status === "live")
    .sort((a, b) => startedAt(b) - startedAt(a))
    .map((tournament) => {
      const own = byTournament.get(tournament.id) ?? [];
      return {
        tournament,
        teams: tournament.entries.filter((entry) => entry.withdrawnAt === undefined).length,
        played: own.filter((m) => m.status === "completed").length,
        total: isRotationFormat(tournament.format) ? null : own.length,
        inPlay: own.filter((m) => m.status === "in_progress").length,
      };
    });
};

// ============================================
// Recent results
// ============================================

/** A result on Home: a ledger row a tap can open. */
export type RecentResult = LedgerRow & { href: string };

/**
 * The latest matches played, newest first, at most `limit` of them: the
 * ledger's rows, less the ones Home leaves out. Forfeits go, because one
 * withdrawal forfeits every match a round robin had left for the team at
 * once. So does a row nothing could open: a quick match whose team has
 * left the roster, which the scoring page cannot show.
 */
export const recentResults = (
  tournaments: Tournament[],
  matches: Match[],
  roster: PersistentTeam[],
  limit = 5,
): RecentResult[] =>
  ledgerRows(tournaments, matches, roster)
    .filter(
      (row): row is RecentResult => row.href !== undefined && row.match.forfeitedBy === undefined,
    )
    .slice(0, limit);
