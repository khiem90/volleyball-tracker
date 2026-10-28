import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAPACITY,
  epochToWallClock,
  rsvpProblems,
  rsvpSetupOf,
  timeLabel,
  wallClockToEpoch,
  type RsvpSetup,
} from "@/lib/rsvp";

// Friday 6 November 2026, 19:00 in UTC.
const friday7pm = Date.UTC(2026, 10, 6, 19, 0);
const thursday6pm = Date.UTC(2026, 10, 5, 18, 0);

const setup = (changes: Partial<RsvpSetup> = {}): RsvpSetup => ({
  enabled: true,
  capacity: 12,
  scheduledAt: friday7pm,
  opensAt: thursday6pm,
  ...changes,
});

describe("rsvpProblems", () => {
  it("finds nothing wrong with a night that has its times, opens before it starts, and takes at least one", () => {
    expect(rsvpProblems(setup())).toEqual({});
    expect(rsvpProblems(setup({ capacity: 1 }))).toEqual({});
  });

  it("refuses to turn the link on without a scheduled time or an open time", () => {
    expect(rsvpProblems(setup({ scheduledAt: null }))).toEqual({
      scheduledAt: "Set the scheduled time before turning the RSVP link on.",
    });
    expect(rsvpProblems(setup({ opensAt: null }))).toEqual({
      opensAt: "Set when RSVPs open before turning the RSVP link on.",
    });
  });

  it("lets a night with the link off go without its times", () => {
    expect(rsvpProblems(setup({ enabled: false, scheduledAt: null, opensAt: null }))).toEqual({});
  });

  it("refuses an open time after the scheduled time, whether the link is on or off", () => {
    const late = { opensAt: friday7pm + 60_000 };
    const problem = { opensAt: "RSVPs must open before the scheduled time." };

    expect(rsvpProblems(setup(late))).toEqual(problem);
    expect(rsvpProblems(setup({ ...late, enabled: false }))).toEqual(problem);
    expect(rsvpProblems(setup({ opensAt: friday7pm }))).toEqual({});
  });

  it("refuses a capacity below one", () => {
    expect(rsvpProblems(setup({ capacity: 0 }))).toEqual({
      capacity: "Capacity must be at least 1.",
    });
    expect(rsvpProblems(setup({ enabled: false, capacity: -3 }))).toEqual({
      capacity: "Capacity must be at least 1.",
    });
  });
});

describe("rsvpSetupOf", () => {
  it("reads a tournament from before RSVPs as a night with the link off, no times, and the default capacity", () => {
    expect(rsvpSetupOf({})).toEqual({
      enabled: false,
      capacity: DEFAULT_CAPACITY,
      scheduledAt: null,
      opensAt: null,
    });
  });

  it("reads the stored settings back as the RSVP tab edits them", () => {
    expect(
      rsvpSetupOf({
        scheduledAt: friday7pm,
        rsvp: { enabled: true, capacity: 16, opensAt: thursday6pm, closed: false },
      }),
    ).toEqual({ enabled: true, capacity: 16, scheduledAt: friday7pm, opensAt: thursday6pm });
    expect(
      rsvpSetupOf({ rsvp: { enabled: false, capacity: 16, closed: false } }),
    ).toEqual({ enabled: false, capacity: 16, scheduledAt: null, opensAt: null });
  });
});

describe("entering a time in the owner's zone", () => {
  it("reads 7 PM on the date-time field as 7 PM where the owner is", () => {
    // New York is five hours behind UTC in November and four in July.
    expect(wallClockToEpoch("2026-11-06T19:00", "America/New_York")).toBe(
      Date.UTC(2026, 10, 7, 0, 0),
    );
    expect(wallClockToEpoch("2026-07-03T19:00", "America/New_York")).toBe(
      Date.UTC(2026, 6, 3, 23, 0),
    );
    expect(wallClockToEpoch("2026-11-06T19:00", "Asia/Ho_Chi_Minh")).toBe(
      Date.UTC(2026, 10, 6, 12, 0),
    );
  });

  it("writes a stored time back into the field as the owner's wall clock", () => {
    expect(epochToWallClock(Date.UTC(2026, 10, 7, 0, 0), "America/New_York")).toBe(
      "2026-11-06T19:00",
    );
    expect(epochToWallClock(Date.UTC(2026, 6, 3, 23, 0), "America/New_York")).toBe(
      "2026-07-03T19:00",
    );
  });

  it("shows a time in the viewer's zone, with the owner's wall clock and zone beside it when they differ", () => {
    const sevenPmInNewYork = Date.UTC(2026, 10, 7, 0, 0);

    expect(timeLabel(sevenPmInNewYork, "America/New_York", "America/New_York")).toEqual({
      viewer: "Fri, Nov 6, 7:00 PM",
      owner: null,
    });
    expect(timeLabel(sevenPmInNewYork, "America/New_York", "America/Chicago")).toEqual({
      viewer: "Fri, Nov 6, 6:00 PM",
      owner: "7:00 PM EST",
    });
    // Saigon is already into Saturday, so the owner's day is named too.
    expect(timeLabel(sevenPmInNewYork, "America/New_York", "Asia/Ho_Chi_Minh")).toEqual({
      viewer: "Sat, Nov 7, 7:00 AM",
      owner: "Fri 7:00 PM EST",
    });
  });

  it("does not repeat the owner's time for a zone that keeps the same clock, or when the owner's zone is unknown", () => {
    const sevenPmInNewYork = Date.UTC(2026, 10, 7, 0, 0);

    expect(timeLabel(sevenPmInNewYork, "America/New_York", "America/Toronto").owner).toBeNull();
    expect(timeLabel(sevenPmInNewYork, undefined, "America/Chicago")).toEqual({
      viewer: "Fri, Nov 6, 6:00 PM",
      owner: null,
    });
  });

  it("reads an empty or half-typed field as no time", () => {
    expect(wallClockToEpoch("", "America/New_York")).toBeNull();
    expect(wallClockToEpoch("2026-11-06", "America/New_York")).toBeNull();
  });
});
