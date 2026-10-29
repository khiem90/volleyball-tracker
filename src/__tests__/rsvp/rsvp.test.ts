import { describe, expect, it } from "vitest";
import {
  countdown,
  DEFAULT_CAPACITY,
  epochToWallClock,
  millisOf,
  NOT_OPEN_YET,
  noticeProblem,
  prefillName,
  refusedRsvpMessage,
  takesRsvps,
  rsvpEntryProblems,
  rsvpPageState,
  rsvpProblems,
  rsvpSetupOf,
  timeLabel,
  wallClockToEpoch,
  watchView,
  type RsvpSetup,
} from "@/lib/rsvp";
import type { RsvpSettings, Tournament, TournamentStatus } from "@/types/game";

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
  it("finds nothing wrong with a tournament that has its times, opens before it starts, and takes at least one", () => {
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

  it("lets a tournament with the link off go without its times", () => {
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
  it("reads a tournament from before RSVPs as having the link off, no times, and the default capacity", () => {
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

describe("rsvpPageState", () => {
  const opensAt = thursday6pm;
  const rsvpTournament = (
    changes: { status?: TournamentStatus; rsvp?: Partial<RsvpSettings> | null } = {},
  ): Pick<Tournament, "status" | "rsvp"> => ({
    status: changes.status ?? "draft",
    rsvp:
      changes.rsvp === null
        ? undefined
        : { enabled: true, capacity: 12, opensAt, closed: false, ...changes.rsvp },
  });

  it("counts down to the open time before it, and is open from that instant", () => {
    expect(rsvpPageState(rsvpTournament(), opensAt - 1)).toEqual({ kind: "not_open", opensAt });
    expect(rsvpPageState(rsvpTournament(), opensAt)).toEqual({ kind: "open" });
    expect(rsvpPageState(rsvpTournament(), opensAt + 86_400_000)).toEqual({ kind: "open" });
  });

  it("reads a link that is off, or a tournament from before RSVPs, as the link off", () => {
    expect(rsvpPageState(rsvpTournament({ rsvp: { enabled: false } }), opensAt)).toEqual({ kind: "link_off" });
    expect(rsvpPageState(rsvpTournament({ rsvp: null }), opensAt)).toEqual({ kind: "link_off" });
    expect(rsvpPageState(rsvpTournament({ status: "live", rsvp: { enabled: false } }), opensAt)).toEqual({
      kind: "link_off",
    });
  });

  it("is closed once the owner closes the list, before or after the open time", () => {
    expect(rsvpPageState(rsvpTournament({ rsvp: { closed: true } }), opensAt)).toEqual({ kind: "closed" });
    expect(rsvpPageState(rsvpTournament({ rsvp: { closed: true } }), opensAt - 1)).toEqual({ kind: "closed" });
  });

  it("is live once the tournament is live and completed once it ends, closed or not", () => {
    expect(rsvpPageState(rsvpTournament({ status: "live" }), opensAt)).toEqual({ kind: "live" });
    expect(rsvpPageState(rsvpTournament({ status: "live", rsvp: { closed: true } }), opensAt - 1)).toEqual({
      kind: "live",
    });
    expect(rsvpPageState(rsvpTournament({ status: "completed" }), opensAt)).toEqual({ kind: "completed" });
  });
});

describe("watchView", () => {
  const rsvpTournament = (status: TournamentStatus): Pick<Tournament, "status" | "rsvp"> => ({
    status,
    rsvp: { enabled: true, capacity: 12, opensAt: thursday6pm, closed: false },
  });

  it("offers Watch into the console once the tournament is live, with the list closed", () => {
    expect(watchView(rsvpPageState(rsvpTournament("live"), friday7pm))).toEqual({
      kind: "live",
      status: "Live",
      action: "Watch",
      note: "The list closed when the tournament started.",
    });
  });

  it("says Completed once it ends, and still offers the results, with the list as it stood", () => {
    expect(watchView(rsvpPageState(rsvpTournament("completed"), friday7pm))).toEqual({
      kind: "completed",
      status: "Completed",
      action: "See results",
      note: "The list stays as it was when the tournament started.",
    });
  });

  it("offers nothing to watch before the start, or with the link off", () => {
    expect(watchView({ kind: "not_open", opensAt: thursday6pm })).toBeNull();
    expect(watchView({ kind: "open" })).toBeNull();
    expect(watchView({ kind: "closed" })).toBeNull();
    expect(watchView({ kind: "link_off" })).toBeNull();
  });
});

describe("takesRsvps", () => {
  it("takes RSVPs before the open time, once open, and onto the waitlist when full", () => {
    expect(takesRsvps({ kind: "not_open", opensAt: thursday6pm })).toBe(true);
    expect(takesRsvps({ kind: "open" })).toBe(true);
    expect(takesRsvps({ kind: "full" })).toBe(true);
  });

  it("takes none once the list is closed, the tournament is live or completed, or the link is off", () => {
    expect(takesRsvps({ kind: "closed" })).toBe(false);
    expect(takesRsvps({ kind: "live" })).toBe(false);
    expect(takesRsvps({ kind: "completed" })).toBe(false);
    expect(takesRsvps({ kind: "link_off" })).toBe(false);
  });
});

describe("countdown", () => {
  it("shows hours, minutes, and seconds within a day, rounding a part second up so it never reads zero early", () => {
    expect(countdown(3 * 3_600_000 + 4 * 60_000 + 5_000)).toBe("3:04:05");
    expect(countdown(59_000)).toBe("0:00:59");
    expect(countdown(400)).toBe("0:00:01");
  });

  it("names the days ahead of the clock once it is a day or more away", () => {
    expect(countdown(86_400_000)).toBe("1d 0:00:00");
    expect(countdown(2 * 86_400_000 + 3_600_000 + 1)).toBe("2d 1:00:01");
  });

  it("stops at zero", () => {
    expect(countdown(0)).toBe("0:00:00");
    expect(countdown(-5_000)).toBe("0:00:00");
  });
});

describe("refusedRsvpMessage", () => {
  it("says not open yet when the server refused a tap the phone's clock thought was open", () => {
    expect(refusedRsvpMessage({ kind: "open" })).toBe(NOT_OPEN_YET);
    expect(refusedRsvpMessage({ kind: "not_open", opensAt: thursday6pm })).toBe(NOT_OPEN_YET);
    expect(NOT_OPEN_YET).toBe("Not open yet");
  });

  it("names a closed list, a started or finished tournament, and a link turned off", () => {
    expect(refusedRsvpMessage({ kind: "closed" })).toBe("The owner has closed RSVPs.");
    expect(refusedRsvpMessage({ kind: "live" })).toBe(
      "This tournament has started, so RSVPs are closed.",
    );
    expect(refusedRsvpMessage({ kind: "completed" })).toBe("This tournament is over.");
    expect(refusedRsvpMessage({ kind: "link_off" })).toBe("This RSVP link is off.");
  });
});

describe("the RSVP form", () => {
  it("prefills the remembered name, then the account's display name, then nothing", () => {
    expect(prefillName("Dan from Tuesdays", "Daniel Smith")).toBe("Dan from Tuesdays");
    expect(prefillName(null, "Daniel Smith")).toBe("Daniel Smith");
    expect(prefillName(undefined, null)).toBe("");
    expect(prefillName("", "  Daniel  ")).toBe("Daniel");
  });

  it("cuts a long display name to the forty characters an RSVP takes", () => {
    expect(prefillName(null, "x".repeat(50))).toBe("x".repeat(40));
  });

  it("needs a name of one to forty characters and a note of at most 140", () => {
    expect(rsvpEntryProblems({ name: "Dan", note: "" })).toEqual({});
    expect(rsvpEntryProblems({ name: "x".repeat(40), note: "x".repeat(140) })).toEqual({});
    expect(rsvpEntryProblems({ name: "   ", note: "" })).toEqual({
      name: "Enter the name the owner will see.",
    });
    expect(rsvpEntryProblems({ name: "x".repeat(41), note: "x".repeat(141) })).toEqual({
      name: "Keep the name to 40 characters.",
      note: "Keep the note to 140 characters.",
    });
  });

  it("judges the name as it will be saved, without the spaces around it", () => {
    expect(rsvpEntryProblems({ name: ` ${"x".repeat(40)} `, note: "" })).toEqual({});
  });
});

describe("a notice", () => {
  it("takes one to five hundred characters, judged as it will be saved, trimmed", () => {
    expect(noticeProblem("We moved to 7:30.")).toBeNull();
    expect(noticeProblem(` ${"x".repeat(500)} `)).toBeNull();
    expect(noticeProblem("  \n ")).toBe("Write the notice first.");
    expect(noticeProblem("x".repeat(501))).toBe("Keep the notice to 500 characters.");
  });

  it("is shown at the time the server posted it, to the millisecond", () => {
    expect(millisOf({ seconds: 1_800_000_000, nanoseconds: 123_456_789 })).toBe(1_800_000_000_123);
  });
});
