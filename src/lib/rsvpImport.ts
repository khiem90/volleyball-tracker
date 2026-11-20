/**
 * Import, the pure part: turning an RSVP list into the teams a tournament
 * enters. Nothing in here touches the database or React. See GLOSSARY.md
 * under "Import" and ADR-0005.
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
  | { kind: "open" }
  /** A by-person list. Import takes only by-team lists for now. */
  | { kind: "by_person" };

/**
 * Whether a list can be imported at `now`: its owner has closed it, or its
 * scheduled time has passed. A list with no scheduled time is never over,
 * so it has to be closed. On a page `now` is the phone's clock.
 */
export const importReadiness = (
  list: Pick<RsvpList, "takes" | "closed" | "scheduledAt">,
  now: number,
): ImportReadiness => {
  if (list.takes !== "teams") return { kind: "by_person" };
  return list.closed || isListOver(list, now) ? { kind: "ready" } : { kind: "open" };
};

/** What the creation page says about a by-person list. */
export const BY_PERSON_NOT_YET = "A by-person list cannot be imported yet.";

// ============================================
// The import
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

/** A team an import brings to the creation page. */
export interface ImportedTeam {
  /** Stays the same through a rename. On a by-team list it is the RSVP's id. */
  id: string;
  /** The team's name, as the owner last left it. */
  name: string;
}

/**
 * An import as the creation page holds it: a copy of the list taken when
 * the owner chose it (ADR-0005). The owner arranges `teams` before saving,
 * and nothing that happens to the list afterwards reaches them.
 */
export interface ListImport {
  listId: string;
  listName: string;
  /** What the list took, which says what kind of teams these are. */
  takes: RsvpTakes;
  /** The teams in the order they enter: arrival order on a by-team list. */
  teams: ImportedTeam[];
}

/**
 * Import a list with these RSVPs on it. A by-team list gives one team per
 * confirmed RSVP, in arrival order, under the name the captain gave. A
 * by-person list cannot be imported yet and throws.
 */
export const importList = (
  list: Pick<RsvpList, "id" | "name" | "takes" | "capacity">,
  rsvps: Rsvp[],
): ListImport => {
  if (list.takes !== "teams") throw new Error(BY_PERSON_NOT_YET);
  return {
    listId: list.id,
    listName: list.name,
    takes: list.takes,
    teams: rsvpsToImport(rsvps, list.capacity).map((rsvp) => ({ id: rsvp.id, name: rsvp.name })),
  };
};

/**
 * The import with one team renamed. The name is kept as typed, so the
 * field it is typed into never fights the keyboard. Names are trimmed when
 * they are compared and when the tournament is saved.
 */
export const renameImportedTeam = (
  imported: ListImport,
  teamId: string,
  name: string,
): ListImport => ({
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
