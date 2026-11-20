/**
 * RSVP lists, the pure part: what the owner enters for a list, what is wrong
 * with it, and the order the RSVP tab shows lists in. Nothing in here touches
 * the database or React. See GLOSSARY.md under "RSVP" and ADR-0005.
 */

import type { RsvpList, RsvpTakes } from "@/types/game";

// ============================================
// Setup
// ============================================

/** A list's settings as the new-list page and the list's own page edit them. */
export interface ListSetup {
  name: string;
  takes: RsvpTakes;
  capacity: number;
  /** The scheduled time in epoch milliseconds, or null while unset. */
  scheduledAt: number | null;
  /** The open time in epoch milliseconds, or null while unset. */
  opensAt: number | null;
  /** Whether the RSVP link is on. */
  enabled: boolean;
}

/** The capacity offered before the owner changes it. */
export const DEFAULT_LIST_CAPACITY = 12;

/** The longest name the form takes for a list. */
export const LIST_NAME_MAX = 80;

/** What the new-list page starts from: by person, private, with no times yet. */
export const emptyListSetup = (): ListSetup => ({
  name: "",
  takes: "people",
  capacity: DEFAULT_LIST_CAPACITY,
  scheduledAt: null,
  opensAt: null,
  enabled: false,
});

/** A stored list's settings as the form edits them. A time that was never set reads as null. */
export const listSetupOf = (list: RsvpList): ListSetup => ({
  name: list.name,
  takes: list.takes,
  capacity: list.capacity,
  scheduledAt: list.scheduledAt ?? null,
  opensAt: list.opensAt ?? null,
  enabled: list.enabled,
});

/** Why a list setup cannot be saved yet, by field. Empty when it can. */
export interface ListSetupProblems {
  name?: string;
  scheduledAt?: string;
  opensAt?: string;
  capacity?: string;
}

/**
 * The problems with a list setup. A list needs a name, since the RSVP page
 * says what people are saying yes to. The link cannot go on without both
 * times, since the page could not say when. A list with the link off may
 * leave them unset. An open time after the scheduled time and a capacity
 * below one are wrong either way.
 */
export const listSetupProblems = (setup: ListSetup): ListSetupProblems => {
  const problems: ListSetupProblems = {};
  if (setup.name.trim().length === 0) problems.name = "Give the list a name.";
  if (!(setup.capacity >= 1)) problems.capacity = "Capacity must be at least 1.";
  if (setup.enabled && setup.scheduledAt === null) {
    problems.scheduledAt = "Set the scheduled time before turning the RSVP link on.";
  }
  if (setup.enabled && setup.opensAt === null) {
    problems.opensAt = "Set the open time before turning the RSVP link on.";
  } else if (
    setup.opensAt !== null &&
    setup.scheduledAt !== null &&
    setup.opensAt > setup.scheduledAt
  ) {
    problems.opensAt = "The open time must come before the scheduled time.";
  }
  return problems;
};

/** The first problem to fix, in the order the form shows its fields. */
export const firstListProblem = (problems: ListSetupProblems): string | undefined =>
  problems.name ?? problems.capacity ?? problems.scheduledAt ?? problems.opensAt;

// ============================================
// The RSVP tab
// ============================================

/**
 * Whether a list is over at `now`: its scheduled time has come. A list with
 * no scheduled time is never over. On a page `now` is the phone's clock,
 * which only decides what to show.
 */
export const isListOver = (list: Pick<RsvpList, "scheduledAt">, now: number): boolean =>
  list.scheduledAt !== undefined && now >= list.scheduledAt;

/** An owner's lists as the RSVP tab shows them. */
export interface OwnLists {
  /** Lists still to come, soonest first, then the ones with no scheduled time yet. */
  upcoming: RsvpList[];
  /** Lists whose scheduled time has passed, latest first. */
  over: RsvpList[];
}

const byId = (a: RsvpList, b: RsvpList): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * An owner's lists in the order the RSVP tab shows them at `now`, so
 * Friday's list sits above last month's. A list with no scheduled time is
 * one the owner is still setting up. It stays with the upcoming ones, under
 * those that have a time, newest first. The id settles a tie.
 */
export const ownListsInOrder = (lists: RsvpList[], now: number): OwnLists => {
  const upcoming = lists.filter((list) => !isListOver(list, now));
  const over = lists.filter((list) => isListOver(list, now));
  const timed = upcoming.filter((list) => list.scheduledAt !== undefined);
  const untimed = upcoming.filter((list) => list.scheduledAt === undefined);
  return {
    upcoming: [
      ...timed.sort((a, b) => a.scheduledAt! - b.scheduledAt! || byId(a, b)),
      ...untimed.sort((a, b) => b.createdAt - a.createdAt || byId(a, b)),
    ],
    over: over.sort((a, b) => b.scheduledAt! - a.scheduledAt! || byId(a, b)),
  };
};
