import { describe, expect, it } from "vitest";
import {
  countdown,
  epochToWallClock,
  millisOf,
  NOT_OPEN_YET,
  noticeProblem,
  prefillName,
  refusedRsvpMessage,
  rsvpEntryProblems,
  timeLabel,
  wallClockToEpoch,
} from "@/lib/rsvp";


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

describe("a refused RSVP", () => {
  it("names a list the owner closed and a link turned off", () => {
    expect(refusedRsvpMessage({ kind: "closed" })).toBe("The owner has closed RSVPs.");
    expect(refusedRsvpMessage({ kind: "link_off" })).toBe("This RSVP link is off.");
  });

  it("reads as not open yet when only the server's clock stood in the way", () => {
    expect(NOT_OPEN_YET).toBe("Not open yet");
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
