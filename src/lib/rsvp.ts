/**
 * RSVPs, the pure part that needs no list: how times are entered and shown
 * across time zones, the RSVP form, who is confirmed and who is waiting,
 * and notices. A list's settings and page state are in src/lib/rsvpList.ts.
 * Nothing in here touches the database or React. See GLOSSARY.md under
 * "RSVP" and ADR-0004.
 */

import type { Notice, Rsvp, ServerTime } from "@/types/game";

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
 * Why a list the owner closed, or one whose RSVP link is off, takes no
 * RSVPs. The list's page shows it in place of the RSVP button, and a
 * refused RSVP is answered with it.
 */
export const refusedRsvpMessage = (state: { kind: "closed" | "link_off" }): string =>
  state.kind === "closed" ? "The owner has closed RSVPs." : "This RSVP link is off.";

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
export interface RsvpSplit<T extends Arrival = Rsvp> {
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
 * next person the moment the RSVPs or the list's capacity change. The sort is
 * done here rather than trusted from the subscription, with the document
 * id breaking a tie, so every phone works out the same split.
 */
export const splitRsvps = <T extends Arrival>(rsvps: T[], capacity: number): RsvpSplit<T> => {
  const ordered = [...rsvps].sort(byArrival);
  const cut = Math.max(0, capacity);
  return {
    confirmed: ordered.slice(0, cut).map((rsvp, index) => ({ ...rsvp, position: index + 1 })),
    waitlisted: ordered.slice(cut).map((rsvp, index) => ({ ...rsvp, position: index + 1 })),
  };
};

/** Where one account stands on a list. */
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
  list: RsvpSplit<T>,
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

/**
 * Whether a notice is new to an account that last opened the RSVP page at
 * `readAt`: the newest of `notices`, in any order, was posted after it. To
 * an account that has never opened the page, any notice is new.
 */
export const hasNewNotice = (notices: Notice[], readAt: ServerTime | undefined): boolean => {
  const latest = newest(notices);
  return latest !== null && (!readAt || isAfter(latest.createdAt, readAt));
};
