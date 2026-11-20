/**
 * RSVP lists, the pure part: what the owner enters for a list, what is wrong
 * with it, and the order the RSVP tab shows lists in. Nothing in here touches
 * the database or React. See GLOSSARY.md under "RSVP" and ADR-0005.
 */

import {
  hasNewNotice,
  NOT_OPEN_YET,
  prefillName,
  refusedRsvpMessage,
  splitRsvps,
  standingIn,
  type RsvpStanding,
} from "@/lib/rsvp";
import type { Notice, Rsvp, RsvpList, RsvpTakes } from "@/types/game";

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
  takes?: string;
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
  /**
   * How many RSVPs have arrived, held spots included. The first one locks
   * the open time and the by-person or by-team choice.
   */
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

/** The by-person or by-team choice's problem once it is locked. The form also shows it under the read-only choice. */
export const LIST_TAKES_LOCKED = "The list has RSVPs, so its by-person or by-team choice cannot change.";

/** Why no setting of a list that is over can change. */
export const LIST_SETTINGS_LOCKED = "This list is over, so its settings cannot change.";

/**
 * The problems with a list setup. A list needs a name, since the RSVP page
 * says what people are saying yes to. The link cannot go on without both
 * times, since the page could not say when. A list with the link off may
 * leave them unset. An open time after the scheduled time and a capacity
 * below one are wrong either way.
 *
 * Against the `locks` of a stored list there are four more. The capacity
 * cannot drop below the confirmed count, so nobody loses a spot to the
 * stepper. The open time cannot change once an RSVP has arrived, so nobody
 * who already answered is confused. Nor can the by-person or by-team
 * choice, so eight people do not turn into eight teams named after
 * people. And once the list is over no setting can change, so the record
 * of who came stops moving.
 */
export const listSetupProblems = (setup: ListSetup, locks?: ListLocks): ListSetupProblems => {
  if (locks?.isOver) return sameListSetup(setup, locks.stored) ? {} : { over: LIST_SETTINGS_LOCKED };

  const problems: ListSetupProblems = {};
  if (setup.name.trim().length === 0) problems.name = "Give the list a name.";
  if (locks && locks.arrivals > 0 && setup.takes !== locks.stored.takes) {
    problems.takes = LIST_TAKES_LOCKED;
  }
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
  problems.over ??
  problems.name ??
  problems.takes ??
  problems.capacity ??
  problems.scheduledAt ??
  problems.opensAt;

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
 * The names an account last RSVP'd under, one for each kind of list. Each
 * is null before the account's first RSVP of that kind.
 */
export interface RememberedNames {
  /** The name it last gave on a by-person list. */
  person: string | null;
  /** The team name it last gave on a by-team list. */
  team: string | null;
}

/**
 * The name the RSVP form starts with on a list that takes `takes`. A
 * by-person list offers the remembered person name, then the account's
 * display name. A by-team list offers the remembered team name and nothing
 * else, since a team is not called after its captain. Either is cut to
 * what an RSVP takes.
 */
export const prefillListName = (
  takes: RsvpTakes,
  remembered: RememberedNames | null | undefined,
  displayName: string | null | undefined,
): string =>
  takes === "teams"
    ? prefillName(remembered?.team, null)
    : prefillName(remembered?.person, displayName);

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

// ============================================
// Wording
// ============================================

/** Where an account on a list stands: in at a position, or waiting at one. */
type OnTheList = Exclude<RsvpStanding, { kind: "none" }>;

/**
 * What a list's pages say that depends on what the list takes. A by-person
 * list speaks to a person about themselves. A by-team list speaks to a
 * captain about their team.
 */
export interface ListWording {
  /** A number of what the list takes: "1 person", "12 people", "8 teams". */
  count: (count: number) => string;
  /** The heading over everyone on the list. */
  heading: string;
  /** What the list says while nobody is on it. */
  empty: string;
  /** The badge on the viewer's own row. */
  mine: string;
  /**
   * Where the viewer stands, in one line, under the name they RSVP'd with.
   * `canMoveUp` is false once the list is over, when the waitlist stops moving.
   */
  standing: (standing: OnTheList, name: string, capacity: number, canMoveUp: boolean) => string;
  /**
   * What a full list says above its RSVP button. `position` is the place
   * on the waitlist a new RSVP would take, or null until the RSVPs arrive.
   */
  full: (position: number | null) => string;
  /** The standing on Home's row for the list. */
  homeStanding: (standing: OnTheList) => string;
  /** The RSVP dialog. */
  dialog: {
    /** The label of the name field. */
    nameLabel: string;
    /** Under the title of a new RSVP to the list called `listName`. */
    fresh: (listName: string) => string;
    /** The same on a full list, where a new RSVP joins the waitlist. */
    waitlist: (listName: string) => string;
    /** Under the title when the dialog changes an RSVP already on the list. */
    edit: string;
    /** What withdrawing does, asked before it happens. */
    withdraw: (listName: string) => string;
    /** The button that backs out of a withdrawal. */
    keep: string;
  };
  /** The owner's box for a held spot. */
  heldSpot: { label: string; placeholder: string; help: string };
  /** Under the capacity stepper on the setup form. */
  capacityNote: string;
  /** What Close does, under the owner's button. */
  closeNote: string;
  /** What a closed list means, under the owner's Reopen button. */
  closedNote: string;
}

const HELD_SPOT_PLACE = "It takes the next place in line, so on a full list it joins the waitlist.";

const PEOPLE_WORDING: ListWording = {
  count: (count) => (count === 1 ? "1 person" : `${count} people`),
  heading: "Who's coming",
  empty: "Nobody has RSVP'd yet.",
  mine: "You",
  standing: (standing, name, capacity, canMoveUp) =>
    standing.kind === "confirmed"
      ? `You're in as ${name}, spot ${standing.position} of ${capacity}.`
      : `You're waiting as ${name}, number ${standing.position} on the waitlist.${
          canMoveUp ? " You move up on your own when a spot frees." : ""
        }`,
  full: (position) =>
    `Every spot is taken. RSVP now and you join the waitlist${
      position === null ? "" : ` at number ${position}`
    }.`,
  homeStanding: (standing) =>
    standing.kind === "confirmed" ? "You're in" : `Waitlist #${standing.position}`,
  dialog: {
    nameLabel: "Your name",
    fresh: (listName) =>
      `You are telling the owner of ${listName} that you will play. Everyone on the list sees your name.`,
    waitlist: (listName) =>
      `Every spot in ${listName} is taken, so you join the waitlist and move up on your own when a spot frees. Everyone on the list sees your name.`,
    edit: "Change your name or note. You keep your place on the list.",
    withdraw: (listName) =>
      `You come off the list for ${listName}, and the first person waiting takes your place. If you RSVP again, you go to the back of the line.`,
    keep: "Keep my place",
  },
  heldSpot: {
    label: "Add held spot",
    placeholder: "Walk-in Sam",
    help: `For someone without an account. ${HELD_SPOT_PLACE}`,
  },
  capacityNote: "People past this number join the waitlist in the order they answered.",
  closeNote:
    "Stops new RSVPs. People on the list can still withdraw, and you can reopen it until the scheduled time.",
  closedNote:
    "The list is closed. Nobody new can RSVP, and people on it can still withdraw. Reopen it any time before the scheduled time.",
};

const TEAMS_WORDING: ListWording = {
  count: (count) => (count === 1 ? "1 team" : `${count} teams`),
  heading: "Teams coming",
  empty: "No team has RSVP'd yet.",
  mine: "Your team",
  standing: (standing, name, capacity, canMoveUp) =>
    standing.kind === "confirmed"
      ? `Your team is in as ${name}, spot ${standing.position} of ${capacity}.`
      : `Your team is waiting as ${name}, number ${standing.position} on the waitlist.${
          canMoveUp ? " It moves up on its own when a spot frees." : ""
        }`,
  full: (position) =>
    `Every spot is taken. RSVP now and your team joins the waitlist${
      position === null ? "" : ` at number ${position}`
    }.`,
  homeStanding: (standing) =>
    standing.kind === "confirmed" ? "Team is in" : `Team waitlist #${standing.position}`,
  dialog: {
    nameLabel: "Team name",
    fresh: (listName) =>
      `You are telling the owner of ${listName} that your team will play. One RSVP covers the whole team, and everyone on the list sees its name.`,
    waitlist: (listName) =>
      `Every spot in ${listName} is taken, so your team joins the waitlist and moves up on its own when a spot frees. Everyone on the list sees its name.`,
    edit: "Change your team's name or note. Your team keeps its place on the list.",
    withdraw: (listName) =>
      `Your team comes off the list for ${listName}, and the first team waiting takes its place. If you RSVP again, your team goes to the back of the line.`,
    keep: "Keep our place",
  },
  heldSpot: {
    label: "Add held spot for a team",
    placeholder: "Team name",
    help: `For a team whose captain has no account. ${HELD_SPOT_PLACE}`,
  },
  capacityNote: "Teams past this number join the waitlist in the order they answered.",
  closeNote:
    "Stops new RSVPs. Teams on the list can still withdraw, and you can reopen it until the scheduled time.",
  closedNote:
    "The list is closed. No new team can RSVP, and teams on it can still withdraw. Reopen it any time before the scheduled time.",
};

/**
 * The wording for a list that takes people or teams. Every page that shows
 * a list reads its people-or-teams words from here: the list's own page,
 * the RSVP dialog, the setup form, and Home's row.
 */
export const listWording = (takes: RsvpTakes): ListWording =>
  takes === "teams" ? TEAMS_WORDING : PEOPLE_WORDING;

// ============================================
// Home
// ============================================

/** One of an account's own RSVPs, with the list it sits under, as Home's query finds it. */
export type AccountListRsvp = Rsvp & { listId: string };

/**
 * What Home has read about the lists an account has RSVP'd to. Each record
 * is keyed by list id. A key is absent while that read is on its way, and
 * once the rules refuse it or the list is gone.
 */
export interface AccountLists {
  /** The account's own RSVPs, across every list. */
  mine: AccountListRsvp[];
  lists: Record<string, RsvpList>;
  /** Each list's RSVPs, held spots included. The account's standing is worked out from them. */
  rsvps: Record<string, Rsvp[]>;
  /** Each list's notices in any order. Only the newest counts. */
  notices: Record<string, Notice[]>;
}

/** A row on Home: a list the account is on. */
export interface HomeListRow {
  list: RsvpList;
  /** In at a position, or waiting at one. */
  standing: Exclude<RsvpStanding, { kind: "none" }>;
  /** Whether a notice arrived after the account last opened the list's page. */
  unread: boolean;
  /** The list's page. */
  href: string;
}

/** How long Home keeps a list after its scheduled time: a day, in milliseconds. */
export const HOME_KEEPS_A_LIST_FOR = 24 * 60 * 60 * 1000;

/**
 * Whether Home has let go of a list at `now`: its scheduled time is 24
 * hours back or more. A list with no scheduled time is never let go.
 */
const isOffHome = (list: Pick<RsvpList, "scheduledAt">, now: number): boolean =>
  list.scheduledAt !== undefined && now >= list.scheduledAt + HOME_KEEPS_A_LIST_FOR;

/**
 * The lists `uid` is on that Home shows at `now`, soonest first, with a
 * list that has no scheduled time last. A list stays for 24 hours after its
 * scheduled time, so its page is one tap away while people play. Home
 * leaves out a list whose RSVP link is off and one the rules no longer let
 * the account read, since either page would show not found. A list waits
 * for its RSVPs, since the standing comes from them, and leaves once the
 * account's own RSVP is gone. On Home `now` is the phone's clock.
 */
export const homeListRows = (uid: string, read: AccountLists, now: number): HomeListRow[] => {
  const rows: HomeListRow[] = [];
  for (const mine of read.mine) {
    const list = read.lists[mine.listId];
    const rsvps = read.rsvps[mine.listId];
    if (!list || !rsvps || !list.enabled) continue;
    if (isOffHome(list, now)) continue;
    const standing = standingIn(splitRsvps(rsvps, list.capacity), uid);
    if (standing.kind === "none") continue;
    const unread = hasNewNotice(read.notices[mine.listId] ?? [], mine.noticesReadAt);
    rows.push({ list, standing, unread, href: `/rsvp/${list.id}` });
  }
  return rows.sort(
    (a, b) =>
      (a.list.scheduledAt ?? Number.POSITIVE_INFINITY) -
        (b.list.scheduledAt ?? Number.POSITIVE_INFINITY) || byId(a.list, b.list),
  );
};
