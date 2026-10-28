/**
 * RSVPs, the pure part: what is wrong with a night's RSVP setup, and how
 * its times are entered and shown across time zones. Nothing in here
 * touches the database or React. See CONTEXT.md under "RSVP" and ADR-0004.
 */

import type { Tournament } from "@/types/game";

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
 * The problems with an RSVP setup. The link cannot go on without both
 * times, since the page could not say when; a night with the link off may
 * leave them unset. An open time after the scheduled time and a capacity
 * below one are wrong either way.
 */
export const rsvpProblems = (setup: RsvpSetup): RsvpProblems => {
  const problems: RsvpProblems = {};
  if (setup.enabled && setup.scheduledAt === null) {
    problems.scheduledAt = "Set the scheduled time before turning the RSVP link on.";
  }
  if (setup.enabled && setup.opensAt === null) {
    problems.opensAt = "Set when RSVPs open before turning the RSVP link on.";
  } else if (
    setup.opensAt !== null &&
    setup.scheduledAt !== null &&
    setup.opensAt > setup.scheduledAt
  ) {
    problems.opensAt = "RSVPs must open before the scheduled time.";
  }
  if (!(setup.capacity >= 1)) problems.capacity = "Capacity must be at least 1.";
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
