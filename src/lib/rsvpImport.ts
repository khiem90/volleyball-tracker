/**
 * Import, the pure part: turning an RSVP list into the teams a tournament
 * enters. Nothing in here touches the database or React, and nothing reads
 * `Math.random`: a deal takes its randomness as an argument. See GLOSSARY.md
 * under "Import" and "Mixed team", ADR-0005, and ADR-0006.
 */

import { splitRsvps, type Placed } from "@/lib/rsvp";
import { isListOver } from "@/lib/rsvpList";
import { nameKey } from "@/lib/utils";
import type { PersistentTeam, Rsvp, RsvpList, RsvpTakes } from "@/types/game";

// ============================================
// Whether a list can be imported
// ============================================

/** Whether a list can be imported yet. */
export type ImportReadiness =
  /** Closed, or past its scheduled time, so nobody new arrives while the owner arranges teams. */
  | { kind: "ready" }
  /** Still taking RSVPs, or able to. The owner is offered a close first. */
  | { kind: "open" };

/**
 * Whether a list can be imported at `now`: its owner has closed it, or its
 * scheduled time has passed. A list with no scheduled time is never over,
 * so it has to be closed. By-person and by-team lists are judged alike.
 * On a page `now` is the phone's clock.
 */
export const importReadiness = (
  list: Pick<RsvpList, "closed" | "scheduledAt">,
  now: number,
): ImportReadiness =>
  list.closed || isListOver(list, now) ? { kind: "ready" } : { kind: "open" };

const LIST_PARAM = "list";

/** The creation page with this list chosen, which is where a list's Create tournament goes. */
export const importHref = (listId: string): string =>
  `/competitions/new?${LIST_PARAM}=${encodeURIComponent(listId)}`;

/** The list the creation page was opened for, from its query, or null when it was opened plainly. */
export const listToImportIn = (query: Pick<URLSearchParams, "get">): string | null =>
  query.get(LIST_PARAM) || null;

// ============================================
// What an import takes
// ============================================

/**
 * The RSVPs an import takes: the confirmed ones, in arrival order, held
 * spots included. The waitlist stays behind, so capacity means the same in
 * the tournament as on the list.
 */
export const rsvpsToImport = <T extends Pick<Rsvp, "id" | "createdAt">>(
  rsvps: T[],
  capacity: number,
): Placed<T>[] => splitRsvps(rsvps, capacity).confirmed;

/** A person on a by-person list, as an import deals them into a team. */
export interface ImportedPerson {
  /** The RSVP's id, which tells two people of one name apart. */
  id: string;
  name: string;
}

/** A team an import brings to the creation page. */
export interface ImportedTeam {
  /**
   * Stays the same through a rename and a move. On a by-team list it is the
   * RSVP's id. A mixed team gets one from the deal.
   */
  id: string;
  /** The team's name, as the owner last left it. */
  name: string;
  /** The people on a mixed team, in the order they were dealt or moved in. Absent on a team from a by-team list. */
  players?: ImportedPerson[];
}

/** A mixed team as a deal makes it. It always holds its people. */
export type DealtTeam = ImportedTeam & { players: ImportedPerson[] };

// ============================================
// Dealing people into mixed teams
// ============================================

/**
 * A source of randomness: each call gives a number from 0 up to but not
 * including 1, as `Math.random` does. A deal takes one as an argument, so
 * the same source gives the same deal.
 */
export type Random = () => number;

/** The people in a random order, by a Fisher-Yates shuffle. The array given is left alone. */
const shuffled = <T>(items: T[], random: Random): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Deal people into mixed teams no larger than `size`. The deal makes the
 * fewest teams that keep every team at or under the size, then hands the
 * shuffled people round them one at a time, so sizes differ by at most
 * one: fourteen people at size four gives 4, 4, 3, and 3. The teams are
 * named "Team 1", "Team 2", and so on. At a size of one each person is a
 * team under their own name. A size below one counts as one.
 */
export const dealTeams = (
  people: ImportedPerson[],
  size: number,
  random: Random,
): DealtTeam[] => {
  const cap = Math.max(1, Math.floor(size));
  const teamCount = Math.ceil(people.length / cap);
  const players: ImportedPerson[][] = Array.from({ length: teamCount }, () => []);
  shuffled(people, random).forEach((person, index) => players[index % teamCount].push(person));
  return players.map((onTeam, index) => ({
    id: `mixed-${index + 1}`,
    name: cap === 1 ? onTeam[0].name : `Team ${index + 1}`,
    players: onTeam,
  }));
};

// ============================================
// The import as the owner arranges it
// ============================================

/**
 * An import as the creation page holds it: a copy of the list taken when
 * the owner chose it (ADR-0005). The owner arranges `teams` before saving,
 * and nothing that happens to the list afterwards reaches them. What the
 * list took says what kind of teams these are, and only a by-person import
 * has people to deal.
 */
export type ListImport = ByTeamImport | ByPersonImport;

interface ImportOfList {
  listId: string;
  listName: string;
}

/** The import of a by-team list. */
export interface ByTeamImport extends ImportOfList {
  takes: "teams";
  /** The teams in arrival order, which is the order they enter. */
  teams: ImportedTeam[];
}

/** The import of a by-person list. */
export interface ByPersonImport extends ImportOfList {
  takes: "people";
  /** The mixed teams in number order, which is the order they enter. */
  teams: DealtTeam[];
  /** The confirmed people in arrival order, kept so they can be dealt again. */
  people: ImportedPerson[];
  /** The size no dealt team goes over. */
  teamSize: number;
}

/** The team size a by-person import starts at. */
export const DEFAULT_TEAM_SIZE = 4;

/**
 * Import a list with these RSVPs on it. A by-team list gives one team per
 * confirmed RSVP, in arrival order, under the name it was RSVP'd with. A
 * by-person list has its confirmed people dealt into mixed teams of the
 * default size, and `random` decides the deal. A by-team import never
 * reads it.
 */
export const importList = (
  list: Pick<RsvpList, "id" | "name" | "takes" | "capacity">,
  rsvps: Rsvp[],
  random: Random,
): ListImport => {
  const confirmed: ImportedPerson[] = rsvpsToImport(rsvps, list.capacity).map((rsvp) => ({
    id: rsvp.id,
    name: rsvp.name,
  }));
  const imported = { listId: list.id, listName: list.name };
  if (list.takes === "teams") return { ...imported, takes: "teams", teams: confirmed };
  return {
    ...imported,
    takes: "people",
    teams: dealTeams(confirmed, DEFAULT_TEAM_SIZE, random),
    people: confirmed,
    teamSize: DEFAULT_TEAM_SIZE,
  };
};

/** The largest team size worth offering: everyone on one team, and never below one. */
export const largestTeamSize = (imported: ByPersonImport): number =>
  Math.max(1, imported.people.length);

/**
 * A by-person import dealt again at a new team size, kept between one and
 * the number of people. A new deal starts over: the names go back to
 * "Team 1" and so on, and every move is forgotten. A by-team import comes
 * back as it was.
 */
export const changeTeamSize = <Import extends ListImport>(
  imported: Import,
  size: number,
  random: Random,
): Import => {
  if (imported.takes === "teams") return imported;
  const teamSize = Math.min(largestTeamSize(imported), Math.max(1, Math.floor(size)));
  return { ...imported, teamSize, teams: dealTeams(imported.people, teamSize, random) };
};

/** A by-person import dealt again at the size it has, which is what Shuffle does. */
export const shuffleImport = <Import extends ListImport>(imported: Import, random: Random): Import =>
  imported.takes === "teams" ? imported : changeTeamSize(imported, imported.teamSize, random);

/**
 * The import with one person moved to the end of another team. The owner
 * decides here, so a move may take a team past the team size. A team left
 * with nobody is dropped. A person or team the import does not have
 * changes nothing, and neither does a move to the team the person is on. A
 * by-team import has no people to move.
 */
export const movePerson = <Import extends ListImport>(
  imported: Import,
  personId: string,
  toTeamId: string,
): Import => {
  if (imported.takes === "teams") return imported;
  const from = imported.teams.find((team) => team.players.some((p) => p.id === personId));
  const to = imported.teams.find((team) => team.id === toTeamId);
  const person = from?.players.find((p) => p.id === personId);
  if (!from || !person || !to || from.id === to.id) return imported;
  const staying = from.players.filter((p) => p.id !== personId);
  const joined = [...to.players, person];
  return {
    ...imported,
    teams: imported.teams.flatMap((team) => {
      if (team.id === to.id) return { ...team, players: joined };
      if (team.id !== from.id) return team;
      return staying.length > 0 ? { ...team, players: staying } : [];
    }),
  };
};

/**
 * The import with one team renamed. The name is kept as typed, so the
 * field it is typed into never fights the keyboard. Names are trimmed when
 * they are compared and when the tournament is saved.
 */
export const renameImportedTeam = <Import extends ListImport>(
  imported: Import,
  teamId: string,
  name: string,
): Import => ({
  ...imported,
  teams: imported.teams.map((team) => (team.id === teamId ? { ...team, name } : team)),
});

// ============================================
// Names
// ============================================

/** Several teams under one name. */
export interface NameClash {
  /** The name as the first of them has it, trimmed. */
  name: string;
  /** Where the teams sharing it sit in the names given. */
  indexes: number[];
}

/**
 * The clashes in a set of team names: every name that more than one team
 * has, ignoring case and outer spaces, in the order each first appears. A
 * by-team list cannot refuse a second team under a taken name (ADR-0005),
 * so import finds them here. A blank name clashes with nothing.
 */
export const nameClashes = (names: string[]): NameClash[] => {
  const byKey = new Map<string, NameClash>();
  names.forEach((name, index) => {
    const key = nameKey(name);
    if (key.length === 0) return;
    const sharing = byKey.get(key);
    if (sharing) sharing.indexes.push(index);
    else byKey.set(key, { name: name.trim(), indexes: [index] });
  });
  return [...byKey.values()].filter((clash) => clash.indexes.length > 1);
};

/**
 * The roster team each name belongs to, ignoring case and outer spaces, or
 * null for a name the roster does not have. An imported team that matches
 * enters as that roster team, so it keeps its record from week to week.
 * When two roster teams share a name the earlier one matches.
 */
export const matchRosterTeams = (
  names: string[],
  roster: PersistentTeam[],
): (PersistentTeam | null)[] => {
  const byKey = new Map<string, PersistentTeam>();
  for (const team of roster) {
    if (!byKey.has(nameKey(team.name))) byKey.set(nameKey(team.name), team);
  }
  return names.map((name) => byKey.get(nameKey(name)) ?? null);
};

/** An imported team as the creation page shows it. */
export interface ImportedTeamRow {
  team: ImportedTeam;
  /**
   * The roster team it enters as. Null when its name is new and it joins the
   * roster, and always null for a mixed team, which never does.
   */
  rosterTeam: PersistentTeam | null;
  /** Whether another team entering has the same name, so one of them needs a rename. */
  clashes: boolean;
}

/**
 * The ticked roster team that a mixed team's name runs into, ignoring case
 * and outer spaces, or undefined when there is none. A mixed team is never
 * the roster team of its name (ADR-0006), so both would enter and the
 * schedule could not tell them apart. A team from a by-team list never
 * runs into one, since it enters as the roster team of its name.
 */
export const tickedTeamNamed = (
  imported: ListImport,
  name: string,
  ticked: PersistentTeam[],
): PersistentTeam | undefined =>
  imported.takes === "people"
    ? ticked.find((team) => nameKey(team.name) === nameKey(name))
    : undefined;

/**
 * The import's teams in order, each with its roster match and whether its
 * name clashes. A mixed team matches no roster team, whatever it is called,
 * since it never joins the roster (ADR-0006). `ticked` holds the roster
 * teams the owner ticked to enter beside the import, and a mixed team under
 * the name of one clashes with it.
 */
export const importedTeamRows = (
  imported: ListImport,
  roster: PersistentTeam[],
  ticked: PersistentTeam[],
): ImportedTeamRow[] => {
  const names = imported.teams.map((team) => team.name);
  const matches = matchRosterTeams(names, imported.takes === "teams" ? roster : []);
  const clashing = new Set(nameClashes(names).flatMap((clash) => clash.indexes));
  return imported.teams.map((team, index) => ({
    team,
    rosterTeam: matches[index],
    clashes: clashing.has(index) || tickedTeamNamed(imported, team.name, ticked) !== undefined,
  }));
};
