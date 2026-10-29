/**
 * RSVPs, the pure part: what is wrong with a night's RSVP setup, and how
 * its times are entered and shown across time zones. Nothing in here
 * touches the database or React. See CONTEXT.md under "RSVP" and ADR-0004.
 */

import type { Notice, Rsvp, ServerTime, Tournament } from "@/types/game";

// ============================================
// Setup
// ============================================

/** The RSVP settings as the creation page and the console's RSVP tab edit them. */
export interface RsvpSetup {
  /** Whether the RSVP link is on. */
  enabled: boolean;
  capacity: number;
  /** The scheduled time in epoch milliseconds, or null while unset. */
  scheduledAt: number | null;
  /** The open time in epoch milliseconds, or null while unset. */
  opensAt: number | null;
}

/** The capacity offered before the owner changes it. */
export const DEFAULT_CAPACITY = 12;

/**
 * A tournament's RSVP settings as the RSVP tab edits them. A tournament
 * from before RSVPs has no RSVP map and reads as the link off.
 */
export const rsvpSetupOf = (tournament: Pick<Tournament, "scheduledAt" | "rsvp">): RsvpSetup => ({
  enabled: tournament.rsvp?.enabled ?? false,
  capacity: tournament.rsvp?.capacity ?? DEFAULT_CAPACITY,
  scheduledAt: tournament.scheduledAt ?? null,
  opensAt: tournament.rsvp?.opensAt ?? null,
});

/** Why an RSVP setup cannot be saved yet, by field. Empty when it can. */
export interface RsvpProblems {
  scheduledAt?: string;
  opensAt?: string;
  capacity?: string;
}

/**
 * What a night's list already holds, which limits how its setup may change
 * from the console. A night being created has no list, and nothing here.
 */
export interface ListSoFar {
  /** How many are confirmed at the stored capacity. Capacity cannot go below it. */
  confirmed: number;
  /** How many RSVPs and held spots have arrived. The first one locks the open time. */
  arrivals: number;
  /** The open time as stored, which stays once anyone has arrived. */
  storedOpensAt: number | null;
}

/** The list so far for a tournament's stored settings and its RSVPs, held spots included. */
export const listSoFar = (
  tournament: Pick<Tournament, "rsvp">,
  rsvps: Arrival[],
): ListSoFar => ({
  confirmed: splitRsvps(rsvps, tournament.rsvp?.capacity ?? DEFAULT_CAPACITY).confirmed.length,
  arrivals: rsvps.length,
  storedOpensAt: tournament.rsvp?.opensAt ?? null,
});

/** The open time's problem once it is locked, which the console also shows beside the read-only field. */
export const OPEN_TIME_LOCKED = "People have RSVP'd, so the open time cannot change.";

/**
 * The problems with an RSVP setup. The link cannot go on without both
 * times, since the page could not say when; a night with the link off may
 * leave them unset. An open time after the scheduled time and a capacity
 * below one are wrong either way. Against a list that already has people
 * on it, the capacity cannot drop below the confirmed count, so nobody
 * loses a spot to the stepper, and the open time cannot change at all,
 * so nobody who already answered is confused.
 */
export const rsvpProblems = (setup: RsvpSetup, list?: ListSoFar): RsvpProblems => {
  const problems: RsvpProblems = {};
  if (setup.enabled && setup.scheduledAt === null) {
    problems.scheduledAt = "Set the scheduled time before turning the RSVP link on.";
  }
  if (list && list.arrivals > 0 && setup.opensAt !== list.storedOpensAt) {
    problems.opensAt = OPEN_TIME_LOCKED;
  } else if (setup.enabled && setup.opensAt === null) {
    problems.opensAt = "Set when RSVPs open before turning the RSVP link on.";
  } else if (
    setup.opensAt !== null &&
    setup.scheduledAt !== null &&
    setup.opensAt > setup.scheduledAt
  ) {
    problems.opensAt = "RSVPs must open before the scheduled time.";
  }
  if (!(setup.capacity >= 1)) {
    problems.capacity = "Capacity must be at least 1.";
  } else if (list && setup.capacity < list.confirmed) {
    problems.capacity = `${list.confirmed} people are confirmed, so capacity cannot go below ${list.confirmed}.`;
  }
  return problems;
};

// ============================================
// Time zones
// ============================================

/** The phone's own IANA zone, which the owner's times are entered in. */
export const deviceZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The wall clock in `zone` at `ms`, as its numeric parts. */
const wallClockParts = (ms: number, zone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(ms);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
  };
};

/** How far `zone`'s wall clock is ahead of UTC at `ms`, in milliseconds. */
const zoneOffset = (ms: number, zone: string): number => {
  const wall = wallClockParts(ms, zone);
  const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  return wallAsUtc - Math.floor(ms / 60_000) * 60_000;
};

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * The instant a date-time field's value names in `zone`: "2026-11-06T19:00"
 * in New York is 7 PM there. Null for an empty or half-typed value. The
 * offset is looked up twice so a time on the far side of a daylight-saving
 * change still lands on the wall clock asked for.
 */
export const wallClockToEpoch = (value: string, zone: string): number | null => {
  const match = WALL_CLOCK.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const guess = asUtc - zoneOffset(asUtc, zone);
  return asUtc - zoneOffset(guess, zone);
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Intl puts a narrow no-break space before AM and PM; a plain space reads the same and compares simply. */
const plainSpaces = (text: string) => text.replace(/[  ]/g, " ");

const format = (ms: number, zone: string, options: Intl.DateTimeFormatOptions) =>
  plainSpaces(new Intl.DateTimeFormat("en-US", { timeZone: zone, ...options }).format(ms));

/** A time as a viewer reads it, and the owner's wall clock when that reads differently. */
export interface TimeLabel {
  /** In the viewer's zone: "Fri, Nov 6, 7:00 PM". */
  viewer: string;
  /** The owner's wall clock and zone, "7:00 PM EST", or "Fri 7:00 PM EST" on another day; null when the clocks agree. */
  owner: string | null;
}

/**
 * A stored time for a viewer in `viewerZone`, with the owner's own wall
 * clock beside it when the owner's zone shows a different time at that
 * moment, so "7 PM" means the owner's 7 PM to someone travelling.
 */
export const timeLabel = (
  ms: number,
  ownerZone: string | undefined,
  viewerZone: string,
): TimeLabel => {
  const viewer = format(ms, viewerZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (ownerZone === undefined || zoneOffset(ms, ownerZone) === zoneOffset(ms, viewerZone)) {
    return { viewer, owner: null };
  }
  const sameDay =
    format(ms, ownerZone, { dateStyle: "short" }) === format(ms, viewerZone, { dateStyle: "short" });
  const owner = format(ms, ownerZone, {
    ...(sameDay ? {} : { weekday: "short" }),
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return { viewer, owner: owner.replace(",", "") };
};

/** A stored instant as a date-time field's value in `zone`, the inverse of wallClockToEpoch. */
export const epochToWallClock = (ms: number, zone: string): string => {
  const wall = wallClockParts(ms, zone);
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
};

// ============================================
// The RSVP page
// ============================================

/** Where a night stands for someone holding its RSVP link. */
export type RsvpPageState =
  /** The owner has the link off, or the tournament never had one. The page shows not found. */
  | { kind: "link_off" }
  /** RSVPs open at `opensAt`; the page counts down to it. */
  | { kind: "not_open"; opensAt: number }
  | { kind: "open" }
  /** Open, with every spot taken: a new RSVP joins the waitlist. */
  | { kind: "full" }
  /** The owner closed the list before the tournament started. */
  | { kind: "closed" }
  /** The tournament is live, which closes the list for good. */
  | { kind: "started" }
  | { kind: "completed" };

/**
 * The RSVP page's state for a tournament at `now`. On the page, `now` is
 * the phone's clock, which is right for showing a countdown and nothing
 * more: the rules judge the open time by the server's clock. Starting the
 * tournament needs no write to the RSVP settings, since a tournament that
 * has left draft is past RSVPs by definition. An open night whose list
 * of `rsvpCount` has reached capacity is full, and still takes RSVPs onto
 * the waitlist; a raised capacity opens it again.
 */
export const rsvpPageState = (
  tournament: Pick<Tournament, "status" | "rsvp">,
  now: number,
  rsvpCount = 0,
): RsvpPageState => {
  const rsvp = tournament.rsvp;
  if (!rsvp?.enabled) return { kind: "link_off" };
  if (tournament.status === "completed") return { kind: "completed" };
  if (tournament.status === "live") return { kind: "started" };
  if (rsvp.closed) return { kind: "closed" };
  // The rules refuse the link on without an open time, so a missing one
  // is a document written around them; it reads as not open.
  const opensAt = rsvp.opensAt ?? Number.POSITIVE_INFINITY;
  if (now < opensAt) return { kind: "not_open", opensAt };
  if (rsvpCount >= rsvp.capacity) return { kind: "full" };
  return { kind: "open" };
};

/** What the RSVP page shows in place of the RSVP button once the tournament has started. */
export interface WatchView {
  /** Where the night stands. */
  status: "Live" | "Completed";
  /** The label of the button into the console. */
  action: string;
  /** A line about the list, which nobody changes from the RSVP page any more. */
  note: string;
}

/**
 * The way into the console for someone holding the RSVP link, once the
 * tournament is live or completed. The rules let any real account read the
 * tournament and its matches while the link is on, so the console takes
 * them as a spectator. Null before the start and with the link off.
 */
export const watchView = (state: RsvpPageState): WatchView | null => {
  if (state.kind === "started") {
    return { status: "Live", action: "Watch", note: "The list closed when the tournament started." };
  }
  if (state.kind === "completed") {
    return {
      status: "Completed",
      action: "See results",
      note: "The list stays as it was when the tournament started.",
    };
  }
  return null;
};

const DAY = 86_400_000;

/**
 * The time left before RSVPs open, as "3:04:05", or "2d 3:04:05" a day or
 * more out. A part second rounds up, so the countdown never reads zero
 * while RSVPs are still shut by the phone's own clock.
 */
export const countdown = (msLeft: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(msLeft / 1000));
  const days = Math.floor(totalSeconds / (DAY / 1000));
  const hours = Math.floor((totalSeconds % (DAY / 1000)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
};

/** What a phone shows when the server refuses an RSVP its own clock thought was open. */
export const NOT_OPEN_YET = "Not open yet";

/**
 * Why the rules refused an RSVP, from the tournament as the server has it
 * just after the refusal. A night that still reads as open on this phone's
 * clock was refused for time, which only the server's clock can do, so it
 * is "Not open yet" too: the phone's clock is ahead.
 */
export const refusedRsvpMessage = (state: RsvpPageState): string => {
  switch (state.kind) {
    case "open":
    case "full":
    case "not_open":
      return NOT_OPEN_YET;
    case "closed":
      return "The owner has closed RSVPs.";
    case "started":
      return "This tournament has started, so RSVPs are closed.";
    case "completed":
      return "This tournament is over.";
    case "link_off":
      return "This RSVP link is off.";
  }
};

/** The longest name an RSVP takes. The rules hold the same limit. */
export const RSVP_NAME_MAX = 40;
/** The longest note an RSVP takes. The rules hold the same limit. */
export const RSVP_NOTE_MAX = 140;

/**
 * The name the RSVP form starts with: the name this account last RSVP'd
 * under, then its display name, then nothing, cut to what an RSVP takes.
 */
export const prefillName = (
  remembered: string | null | undefined,
  displayName: string | null | undefined,
): string => (remembered?.trim() || displayName?.trim() || "").slice(0, RSVP_NAME_MAX);

/** What the person types into the RSVP form. */
export interface RsvpEntry {
  name: string;
  note: string;
}

/** Why an RSVP form cannot be sent yet, by field. Empty when it can. */
export interface RsvpEntryProblems {
  name?: string;
  note?: string;
}

/** The problems with an RSVP form, judged on the name as it is saved, trimmed. */
export const rsvpEntryProblems = (entry: RsvpEntry): RsvpEntryProblems => {
  const problems: RsvpEntryProblems = {};
  const name = entry.name.trim();
  if (name.length === 0) problems.name = "Enter the name the owner will see.";
  else if (name.length > RSVP_NAME_MAX) problems.name = `Keep the name to ${RSVP_NAME_MAX} characters.`;
  if (entry.note.trim().length > RSVP_NOTE_MAX) {
    problems.note = `Keep the note to ${RSVP_NOTE_MAX} characters.`;
  }
  return problems;
};

// ============================================
// Confirmed and waitlisted (ADR-0004)
// ============================================

/** An RSVP with its place in its section: first confirmed is 1, first waiting is 1. */
export type Placed<T> = T & { position: number };

/** What the split needs of an RSVP: its id for a tie, and its arrival time. */
type Arrival = Pick<Rsvp, "id" | "createdAt">;

/** The list split by capacity, each section in arrival order. */
export interface RsvpList<T extends Arrival = Rsvp> {
  confirmed: Placed<T>[];
  waitlisted: Placed<T>[];
}

/** Earlier arrival first, to the nanosecond, then document id for an exact tie. */
const byArrival = (a: Arrival, b: Arrival): number =>
  a.createdAt.seconds - b.createdAt.seconds ||
  a.createdAt.nanoseconds - b.createdAt.nanoseconds ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Who is confirmed and who is waiting, from the RSVPs and the capacity.
 * Nothing stores this: the first `capacity` arrivals are confirmed and the
 * rest wait in order, so a withdrawal or a raised capacity promotes the
 * next person the moment the list or the tournament changes. The sort is
 * done here rather than trusted from the subscription, with the document
 * id breaking a tie, so every phone works out the same split.
 */
export const splitRsvps = <T extends Arrival>(rsvps: T[], capacity: number): RsvpList<T> => {
  const ordered = [...rsvps].sort(byArrival);
  const cut = Math.max(0, capacity);
  return {
    confirmed: ordered.slice(0, cut).map((rsvp, index) => ({ ...rsvp, position: index + 1 })),
    waitlisted: ordered.slice(cut).map((rsvp, index) => ({ ...rsvp, position: index + 1 })),
  };
};

/** Where one account stands on a night's list. */
export type RsvpStanding =
  | { kind: "none" }
  /** In, at `position` among the confirmed. */
  | { kind: "confirmed"; position: number }
  /** Waiting, `position` 1 being the next to move up. */
  | { kind: "waitlisted"; position: number };

/**
 * Where the account `uid` stands on a split list: not on it, confirmed, or
 * waiting at a position. A held spot has no uid, so it is nobody's
 * standing; without an account, nobody is on the list.
 */
export const standingIn = <T extends Arrival & { uid: string | null }>(
  list: RsvpList<T>,
  uid: string | null,
): RsvpStanding => {
  if (uid === null) return { kind: "none" };
  const confirmed = list.confirmed.find((rsvp) => rsvp.uid === uid);
  if (confirmed) return { kind: "confirmed", position: confirmed.position };
  const waiting = list.waitlisted.find((rsvp) => rsvp.uid === uid);
  if (waiting) return { kind: "waitlisted", position: waiting.position };
  return { kind: "none" };
};

// ============================================
// Notices
// ============================================

/** The longest notice the owner can post. The rules hold the same limit. */
export const NOTICE_BODY_MAX = 500;

/** Why a notice cannot be posted yet, judged on the body as it is saved, trimmed; null when it can. */
export const noticeProblem = (body: string): string | null => {
  const trimmed = body.trim();
  if (trimmed.length === 0) return "Write the notice first.";
  if (trimmed.length > NOTICE_BODY_MAX) return `Keep the notice to ${NOTICE_BODY_MAX} characters.`;
  return null;
};

/** A time the server wrote, in epoch milliseconds, for showing it on a clock. */
export const millisOf = (time: ServerTime): number =>
  time.seconds * 1000 + Math.floor(time.nanoseconds / 1_000_000);

// ============================================
// Home
// ============================================

/** One of an account's own RSVPs, with the tournament it sits under, as Home's query finds it. */
export type AccountRsvp = Rsvp & { tournamentId: string };

/**
 * What Home has read about the nights an account has RSVP'd to. Each
 * record is keyed by tournament id, and a key is absent while that read is
 * on its way, or once the rules refuse it or the tournament is gone.
 */
export interface AccountNights {
  /** The account's own RSVPs, across every tournament. */
  mine: AccountRsvp[];
  tournaments: Record<string, Tournament>;
  /** Each tournament's whole list, which the account's standing is worked out from. */
  lists: Record<string, Rsvp[]>;
  /** Each tournament's notices in any order; only the newest counts. */
  notices: Record<string, Notice[]>;
}

/** A night on Home: a tournament the account is on the list for. */
export interface HomeRsvpRow {
  tournament: Tournament;
  /** In at a position, or waiting at one. */
  standing: Exclude<RsvpStanding, { kind: "none" }>;
  /** Whether a notice arrived after the account last opened the RSVP page. */
  unread: boolean;
  /** The RSVP page. */
  href: string;
}

/** Whether server time `a` is after `b`, to the nanosecond. */
const isAfter = (a: ServerTime, b: ServerTime): boolean =>
  a.seconds > b.seconds || (a.seconds === b.seconds && a.nanoseconds > b.nanoseconds);

/** The latest-posted notice, or null when there are none. */
const newest = (notices: Notice[]): Notice | null =>
  notices.reduce<Notice | null>(
    (latest, notice) =>
      latest === null || isAfter(notice.createdAt, latest.createdAt) ? notice : latest,
    null,
  );

const scheduledOrLast = (row: HomeRsvpRow) =>
  row.tournament.scheduledAt ?? Number.POSITIVE_INFINITY;

/**
 * The nights `uid` has RSVP'd to that Home lists, soonest first, with a
 * night that has no scheduled time last. A completed tournament is left
 * out, and so is one whose RSVP page would show not found: a tournament the
 * rules no longer let the account read, or one whose link is off. A night
 * waits for its list, since the standing comes from it, and leaves Home
 * once the account's RSVP is gone. A notice is new when it was posted
 * after the account last opened the RSVP page, or at all when it never has.
 */
export const homeRsvpRows = (uid: string, nights: AccountNights): HomeRsvpRow[] => {
  const rows: HomeRsvpRow[] = [];
  for (const mine of nights.mine) {
    const tournament = nights.tournaments[mine.tournamentId];
    const list = nights.lists[mine.tournamentId];
    if (!tournament || !list || !tournament.rsvp?.enabled) continue;
    if (tournament.status === "completed") continue;

    const standing = standingIn(splitRsvps(list, tournament.rsvp.capacity), uid);
    if (standing.kind === "none") continue;

    const latest = newest(nights.notices[mine.tournamentId] ?? []);
    const unread =
      latest !== null && (!mine.noticesReadAt || isAfter(latest.createdAt, mine.noticesReadAt));
    rows.push({ tournament, standing, unread, href: `/competitions/${tournament.id}/rsvp` });
  }
  // Two nights without a time compare as NaN, which falls through to the id.
  return rows.sort(
    (a, b) =>
      scheduledOrLast(a) - scheduledOrLast(b) ||
      (a.tournament.id < b.tournament.id ? -1 : a.tournament.id > b.tournament.id ? 1 : 0),
  );
};
