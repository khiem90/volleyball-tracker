import { entryTeams } from "@/lib/entries";
import { isRotationFormat } from "@/lib/formats";
import { scoringHref } from "@/lib/scoring";
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

export interface RecentResult {
  match: Match;
  home: PersistentTeam;
  away: PersistentTeam;
  /** The tournament the match was played in, or null for a quick match. */
  tournament: Tournament | null;
  /** Where a tap goes: the tournament's console, or the quick match's own page. */
  href: string;
}

/**
 * The latest matches played, newest first, at most `limit` of them. Byes
 * and forfeits are left out: nobody played them, and one withdrawal
 * forfeits every match a round robin had left for the team at once. A
 * tournament match names its teams as the tournament shows them, so a
 * completed tournament keeps the names it had; a quick match names them
 * from the roster.
 */
export const recentResults = (
  tournaments: Tournament[],
  matches: Match[],
  roster: PersistentTeam[],
  limit = 5,
): RecentResult[] => {
  const tournamentsById = new Map(tournaments.map((t) => [t.id, t]));
  const rosterTeams = new Map(roster.map((team) => [team.id, team]));
  const teamsOf = new Map<string, Map<string, PersistentTeam>>();
  const tournamentTeams = (tournament: Tournament) => {
    let teams = teamsOf.get(tournament.id);
    if (!teams) {
      teams = new Map(entryTeams(tournament, roster).map((team) => [team.id, team]));
      teamsOf.set(tournament.id, teams);
    }
    return teams;
  };

  // A row goes where a tap would land, so a match nothing could open is
  // left out: one whose tournament is gone, or a quick match whose team
  // has left the roster, which the scoring page cannot show.
  const results: RecentResult[] = [];
  const completed = matches
    .filter((m) => m.status === "completed" && !m.isBye && m.forfeitedBy === undefined)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  for (const match of completed) {
    if (results.length === limit) break;
    const tournament = match.tournamentId ? tournamentsById.get(match.tournamentId) : null;
    if (tournament === undefined) continue;
    const teams = tournament ? tournamentTeams(tournament) : rosterTeams;
    const home = teams.get(match.homeTeamId);
    const away = teams.get(match.awayTeamId);
    if (!home || !away) continue;
    results.push({
      match,
      home,
      away,
      tournament,
      href: tournament ? `/competitions/${tournament.id}` : scoringHref(match),
    });
  }
  return results;
};
