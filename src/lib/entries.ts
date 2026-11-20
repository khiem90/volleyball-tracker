import type { Entry, PersistentTeam, Tournament } from "@/types/game";

/**
 * Entries: a team's place in each tournament. An entry copies the team's name
 * and color from the roster. While a tournament is a draft or live the copy
 * follows the roster, so a rename reaches the standings of tonight's
 * tournament; once the tournament is completed the copy stays as it was, so
 * history does not rewrite itself. Nothing in here touches the database.
 *
 * A mixed team has no roster team (ADR-0006). Its entry carries an id no
 * roster team has, so every lookup below falls through to the entry itself
 * in every status, and a roster rename, recolor, or delete never matches it.
 */

/** Completed tournaments are history and never change; the other two can. */
const isDraftOrLive = (tournament: Tournament) => tournament.status !== "completed";

const enters = (tournament: Tournament, teamId: string) =>
  tournament.entries.some((entry) => entry.teamId === teamId);

/** Draft and live tournaments that any of the teams is entered in. */
export const draftOrLiveTournamentsWith = (
  teamIds: string[],
  tournaments: Tournament[],
): Tournament[] =>
  tournaments.filter(
    (tournament) =>
      isDraftOrLive(tournament) && teamIds.some((teamId) => enters(tournament, teamId)),
  );

/**
 * The teams of a tournament as they should be shown. While a tournament is a
 * draft or live an entry shows the roster team's current name and color; once
 * it is completed the entry keeps them as they were. A team that has left the
 * roster shows its entry snapshot either way, so it never becomes "Unknown".
 * The roster write keeps draft and live entries in step (see
 * fanOutTeamChange); this lookup covers the moment before that write lands,
 * and a rename made with no signal, whose entries wait for the next one.
 */
export const entryTeams = (
  tournament: Tournament,
  roster: PersistentTeam[]
): PersistentTeam[] => {
  const rosterById = new Map(roster.map((team) => [team.id, team]));
  return tournament.entries.map((entry) => {
    const current = isDraftOrLive(tournament) ? rosterById.get(entry.teamId) : undefined;
    return {
      id: entry.teamId,
      name: current?.name ?? entry.name,
      createdAt: current?.createdAt ?? tournament.createdAt,
      ...((current?.color ?? entry.color) !== undefined && {
        color: current?.color ?? entry.color,
      }),
    };
  });
};

// ============================================
// Rename and recolor
// ============================================

/** A roster team's new name and, when it changed, its new color. */
export interface TeamChange {
  name: string;
  /** Left out when the color is staying as it is. */
  color?: string;
}

/** The entries and team ids a tournament should carry after a roster change. */
export interface EntriesUpdate {
  tournamentId: string;
  entries: Entry[];
  teamIds: string[];
}

const entryAfter = (entry: Entry, change: TeamChange): Entry => {
  const color = change.color ?? entry.color;
  return {
    ...entry,
    name: change.name,
    ...(color !== undefined && { color }),
  };
};

const sameEntry = (a: Entry, b: Entry) => a.name === b.name && a.color === b.color;

/**
 * Which tournaments a rename or recolor reaches: every draft or live
 * tournament the team is entered in whose entry does not already match. Each
 * update carries the tournament's entries with the team's one brought up to
 * date and every other entry, withdrawn marks included, as it was.
 */
export const fanOutTeamChange = (
  teamId: string,
  change: TeamChange,
  tournaments: Tournament[],
): EntriesUpdate[] => {
  const updates: EntriesUpdate[] = [];
  for (const tournament of draftOrLiveTournamentsWith([teamId], tournaments)) {
    const entries = tournament.entries.map((entry) =>
      entry.teamId === teamId ? entryAfter(entry, change) : entry,
    );
    const changed = entries.some((entry, i) => !sameEntry(entry, tournament.entries[i]));
    if (!changed) continue;
    updates.push({ tournamentId: tournament.id, entries, teamIds: tournament.teamIds });
  }
  return updates;
};

// ============================================
// Delete
// ============================================

/** A team kept on the roster because these live tournaments still have it. */
export interface KeptTeam {
  teamId: string;
  tournaments: Tournament[];
}

export interface TeamDeletionPlan {
  /** Teams that can go: none of them is in a live tournament. */
  deletable: string[];
  /** Teams kept back because a live tournament still has them. */
  kept: KeptTeam[];
  /** Draft tournaments to write, with the deletable teams taken out. */
  draftUpdates: EntriesUpdate[];
}

/**
 * What deleting these roster teams would do. A team in a live tournament is
 * kept, because deleting it mid-tournament would leave its matches pointing
 * at a team that no longer exists; Withdraw is the way to take it out. The
 * others go, and every draft that had one of them loses that entry.
 * Completed tournaments are never touched.
 */
export const planTeamDeletion = (teamIds: string[], tournaments: Tournament[]): TeamDeletionPlan => {
  const live = tournaments.filter((tournament) => tournament.status === "live");
  const kept: KeptTeam[] = [];
  const deletable: string[] = [];
  for (const teamId of teamIds) {
    const liveWithTeam = live.filter((tournament) => enters(tournament, teamId));
    if (liveWithTeam.length > 0) kept.push({ teamId, tournaments: liveWithTeam });
    else deletable.push(teamId);
  }

  const going = new Set(deletable);
  const draftUpdates: EntriesUpdate[] = tournaments
    .filter(
      (tournament) =>
        tournament.status === "draft" && tournament.entries.some((entry) => going.has(entry.teamId)),
    )
    .map((tournament) => ({
      tournamentId: tournament.id,
      entries: tournament.entries.filter((entry) => !going.has(entry.teamId)),
      teamIds: tournament.teamIds.filter((teamId) => !going.has(teamId)),
    }));

  return { deletable, kept, draftUpdates };
};

// ============================================
// Mixed teams
// ============================================

/**
 * A player on a mixed team as the owner's screen showed them. Players are
 * names with no id, so the place tells two players of one name apart, and
 * the name finds the player again when the team changed in between.
 */
export interface PlayerRef {
  name: string;
  /** Where the player sat on the team, from 0. */
  index: number;
}

/** One change the owner makes to a mixed team from the Teams tab. */
export type MixedTeamEdit =
  | { kind: "rename"; teamId: string; name: string }
  | { kind: "add_player"; teamId: string; name: string }
  | { kind: "remove_player"; teamId: string; player: PlayerRef }
  /** `teamId` is the team the player is on, `toTeamId` the mixed team they go to. */
  | { kind: "move_player"; teamId: string; player: PlayerRef; toTeamId: string };

export const TEAM_NEEDS_A_NAME = "A team needs a name.";
export const PLAYER_NEEDS_A_NAME = "A player needs a name.";
export const NOT_A_MIXED_TEAM = "Only a mixed team can be edited here.";
export const PLAYER_HAS_GONE = "That player is no longer on the team.";

type MixedEntry = Entry & { players: string[] };

/** The mixed team with this id. A roster team's entry and a missing one are both refused. */
const mixedTeamIn = (entries: Entry[], teamId: string): MixedEntry => {
  const entry = entries.find((e) => e.teamId === teamId);
  if (entry?.players === undefined) throw new Error(NOT_A_MIXED_TEAM);
  return entry as MixedEntry;
};

/** Where the player sits now: the place given when the name still matches, else the first of that name. */
const placeOf = (players: string[], player: PlayerRef): number => {
  const place = players[player.index] === player.name ? player.index : players.indexOf(player.name);
  if (place === -1) throw new Error(PLAYER_HAS_GONE);
  return place;
};

const named = (name: string, problem: string): string => {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new Error(problem);
  return trimmed;
};

/**
 * The entries after one edit to a mixed team (ADR-0006). The edit changes
 * the team's name or its players' names and nothing else, so every other
 * entry, the order, and a withdrawal stay as they were, and no match is
 * involved. A moved player joins the end of the other team. A team whose
 * last player goes stays in as a mixed team with nobody on it, since its
 * matches still need it. Throws when the edit cannot be made: an empty
 * name, a team that is not a mixed team in these entries, or a player who
 * has since left the team.
 */
export const editMixedTeam = (entries: Entry[], edit: MixedTeamEdit): Entry[] => {
  const team = mixedTeamIn(entries, edit.teamId);
  const withTeam = (changes: Partial<Entry>): Entry[] =>
    entries.map((entry) => (entry.teamId === team.teamId ? { ...entry, ...changes } : entry));

  switch (edit.kind) {
    case "rename":
      return withTeam({ name: named(edit.name, TEAM_NEEDS_A_NAME) });
    case "add_player":
      return withTeam({ players: [...team.players, named(edit.name, PLAYER_NEEDS_A_NAME)] });
    case "remove_player": {
      const place = placeOf(team.players, edit.player);
      return withTeam({ players: team.players.filter((_, i) => i !== place) });
    }
    case "move_player": {
      const to = mixedTeamIn(entries, edit.toTeamId);
      const place = placeOf(team.players, edit.player);
      if (to.teamId === team.teamId) return entries;
      return entries.map((entry) => {
        if (entry.teamId === team.teamId) {
          return { ...entry, players: team.players.filter((_, i) => i !== place) };
        }
        if (entry.teamId === to.teamId) {
          return { ...entry, players: [...to.players, team.players[place]] };
        }
        return entry;
      });
    }
  }
};
