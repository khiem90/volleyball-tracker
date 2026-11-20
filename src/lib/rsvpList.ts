/**
 * RSVP lists, the pure part: what the owner enters for a list, what is wrong
 * with it, and the order the RSVP tab shows lists in. Nothing in here touches
 * the database or React. See GLOSSARY.md under "RSVP" and ADR-0005.
 */

import { NOT_OPEN_YET, refusedRsvpMessage } from "@/lib/rsvp";
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

/** How the owner's choice of what a list takes reads on a button and in a row. */
export const TAKES_LABEL: Record<RsvpTakes, string> = {
  people: "By person",
  teams: "By team",
};

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

/**
 * What a duplicate of `source` starts from: the same by-person or by-team
 * choice and the same capacity, named as its duplicate. Next week's list
 * has its own times, so it has none yet and its RSVP link is off.
 */
export const duplicateListSetup = (source: Pick<RsvpList, "name" | "takes" | "capacity">): ListSetup => ({
  name: `${source.name} (duplicate)`,
  takes: source.takes,
  capacity: source.capacity,
  scheduledAt: null,
  opensAt: null,
  enabled: false,
});

/** Why a list setup cannot be saved yet, by field. Empty when it can. */
export interface ListSetupProblems {
  /** The list is over, so none of its settings can change. No other problem comes with it. */
  over?: string;
  name?: string;
  scheduledAt?: string;
  opensAt?: string;
  capacity?: string;
}

/**
 * What a stored list already holds, which limits how its settings may
 * change. A list being created holds nothing, and has no locks.
 */
export interface ListLocks {
  /** The settings as stored. */
  stored: ListSetup;
  /** How many RSVPs are confirmed at the stored capacity. Capacity cannot go below it. */
  confirmed: number;
  /** How many RSVPs have arrived, held spots included. The first one locks the open time. */
  arrivals: number;
  /** True once the scheduled time has passed. No setting changes after it. */
  isOver: boolean;
}

/**
 * The locks on a stored list with `rsvpCount` RSVPs on it, held spots
 * included, at `now`. On a page `now` is the phone's clock.
 */
export const listLocks = (list: RsvpList, rsvpCount: number, now: number): ListLocks => ({
  stored: listSetupOf(list),
  confirmed: Math.min(rsvpCount, list.capacity),
  arrivals: rsvpCount,
  isOver: isListOver(list, now),
});

/** Whether two setups hold the same settings. */
export const sameListSetup = (a: ListSetup, b: ListSetup): boolean =>
  a.name === b.name &&
  a.takes === b.takes &&
  a.capacity === b.capacity &&
  a.scheduledAt === b.scheduledAt &&
  a.opensAt === b.opensAt &&
  a.enabled === b.enabled;

/** The open time's problem once it is locked. The form also shows it under the read-only field. */
export const LIST_OPEN_TIME_LOCKED = "The list has RSVPs, so the open time cannot change.";

/** Why no setting of a list that is over can change. */
export const LIST_SETTINGS_LOCKED = "This list is over, so its settings cannot change.";

/**
 * The problems with a list setup. A list needs a name, since the RSVP page
 * says what people are saying yes to. The link cannot go on without both
 * times, since the page could not say when. A list with the link off may
 * leave them unset. An open time after the scheduled time and a capacity
 * below one are wrong either way.
 *
 * Against the `locks` of a stored list there are three more. The capacity
 * cannot drop below the confirmed count, so nobody loses a spot to the
 * stepper. The open time cannot change once an RSVP has arrived, so nobody
 * who already answered is confused. And once the list is over no setting
 * can change, so the record of who came stops moving.
 */
export const listSetupProblems = (setup: ListSetup, locks?: ListLocks): ListSetupProblems => {
  if (locks?.isOver) return sameListSetup(setup, locks.stored) ? {} : { over: LIST_SETTINGS_LOCKED };

  const problems: ListSetupProblems = {};
  if (setup.name.trim().length === 0) problems.name = "Give the list a name.";
  if (!(setup.capacity >= 1)) {
    problems.capacity = "Capacity must be at least 1.";
  } else if (locks && setup.capacity < locks.confirmed) {
    problems.capacity = `${locks.confirmed} RSVPs are confirmed, so capacity cannot go below ${locks.confirmed}.`;
  }
  if (setup.enabled && setup.scheduledAt === null) {
    problems.scheduledAt = "Set the scheduled time before turning the RSVP link on.";
  }
  if (locks && locks.arrivals > 0 && setup.opensAt !== locks.stored.opensAt) {
    problems.opensAt = LIST_OPEN_TIME_LOCKED;
  } else if (setup.enabled && setup.opensAt === null) {
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
  problems.over ?? problems.name ?? problems.capacity ?? problems.scheduledAt ?? problems.opensAt;

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

// ============================================
// The list's page
// ============================================

/** Where a list stands for someone looking at its page. */
export type ListPageState =
  /** The owner has the RSVP link off. Anyone else gets not found. */
  | { kind: "link_off" }
  /** RSVPs open at `opensAt`, and the page counts down to it. */
  | { kind: "not_open"; opensAt: number }
  | { kind: "open" }
  /** Open, with every spot taken. A new RSVP joins the waitlist. */
  | { kind: "full" }
  /** The owner closed the list before its scheduled time. */
  | { kind: "closed" }
  /** The scheduled time has passed. The page is read-only. */
  | { kind: "over" };

/** What the page state reads off a list. */
type ListForPage = Pick<RsvpList, "enabled" | "closed" | "capacity" | "opensAt" | "scheduledAt">;

/**
 * The page state of a list at `now`, with `rsvpCount` RSVPs on it, held
 * spots included. On the page `now` is the phone's clock, which is right
 * for a countdown and nothing more. The rules judge both times by the
 * server's clock. The link being off comes first, then the scheduled time,
 * so a closed list reads as over once its time passes. A list at capacity
 * is full and still takes RSVPs, onto the waitlist.
 */
export const listPageState = (list: ListForPage, now: number, rsvpCount = 0): ListPageState => {
  if (!list.enabled) return { kind: "link_off" };
  if (isListOver(list, now)) return { kind: "over" };
  if (list.closed) return { kind: "closed" };
  // The rules refuse the link on without an open time, so a missing one is
  // a document written around them. It reads as not open.
  const opensAt = list.opensAt ?? Number.POSITIVE_INFINITY;
  if (now < opensAt) return { kind: "not_open", opensAt };
  if (rsvpCount >= list.capacity) return { kind: "full" };
  return { kind: "open" };
};

/**
 * Whether a page state still takes RSVPs: the list is open now, or opens at
 * its open time, or is full and takes them onto the waitlist. The RSVP
 * button shows in these states.
 */
export const listTakesRsvps = (
  state: ListPageState,
): state is Extract<ListPageState, { kind: "not_open" | "open" | "full" }> =>
  state.kind === "not_open" || state.kind === "open" || state.kind === "full";

/** What a person reads once the scheduled time has passed. */
export const LIST_IS_OVER = "This list is over.";

/**
 * Why a list takes no RSVPs, as the page says it in place of the RSVP
 * button. Null for a list that takes them. The closed and link-off wording
 * is the tournament RSVP page's own.
 */
export const listShutMessage = (state: ListPageState): string | null => {
  switch (state.kind) {
    case "closed":
    case "link_off":
      return refusedRsvpMessage(state);
    case "over":
      return LIST_IS_OVER;
    default:
      return null;
  }
};

/**
 * Why the rules refused an RSVP, from the list as the server has it just
 * after the refusal, or null when the account can no longer read it, which
 * is how a link turned off looks. A list this phone's clock still reads as
 * taking RSVPs was refused for time, which only the server's clock can do.
 * The server is then on the far side of the open time or of the scheduled
 * time, and the nearer of the two says which.
 */
export const refusedListRsvpMessage = (list: ListForPage | null, now: number): string => {
  if (list === null) return refusedRsvpMessage({ kind: "link_off" });
  const state = listPageState(list, now);
  const shut = listShutMessage(state);
  if (shut !== null) return shut;
  if (list.opensAt === undefined || list.scheduledAt === undefined) return NOT_OPEN_YET;
  return list.scheduledAt - now < now - list.opensAt ? LIST_IS_OVER : NOT_OPEN_YET;
};

/**
 * What the delete confirmation says will go. It names the RSVPs on the
 * list when there are any, held spots included, so a list people are
 * counting on is not deleted by accident. A null count is a list whose
 * RSVPs could not be read, which gets the warning without a number.
 */
export const deleteListDescription = (name: string, rsvpCount: number | null): string => {
  if (rsvpCount === 0) return `This removes "${name}". It cannot be undone.`;
  const rsvps =
    rsvpCount === null ? "every RSVP" : rsvpCount === 1 ? "the 1 RSVP" : `the ${rsvpCount} RSVPs`;
  return `This removes "${name}" and ${rsvps} on it. It cannot be undone.`;
};
