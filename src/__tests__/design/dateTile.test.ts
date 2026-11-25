// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dateTileParts } from "@/lib/dateTile";

/* The two lines of a date tile: a short month over the day of the month. */
describe("a date tile's month and day", () => {
  /* 2026-11-29 18:00 in New York, the "Sunday Doubles" of the chosen picture. */
  const sundayEvening = Date.UTC(2026, 10, 29, 23, 0);

  it("reads a time as a short month and a day number", () => {
    expect(dateTileParts(sundayEvening, "America/New_York")).toEqual({ month: "Nov", day: "29" });
  });

  it("writes a single-digit day without a leading zero", () => {
    expect(dateTileParts(Date.UTC(2026, 11, 3, 20, 0), "America/New_York")).toEqual({
      month: "Dec",
      day: "3",
    });
  });

  /* The same instant is already Monday the 30th in Sydney. */
  it("reads the day in the viewer's zone, not in UTC", () => {
    expect(dateTileParts(sundayEvening, "Australia/Sydney")).toEqual({ month: "Nov", day: "30" });
  });

  /* 04:30 UTC on December 1st is still November 30th in Los Angeles. */
  it("takes the month from the viewer's zone as well", () => {
    const firstOfDecember = Date.UTC(2026, 11, 1, 4, 30);
    expect(dateTileParts(firstOfDecember, "UTC")).toEqual({ month: "Dec", day: "1" });
    expect(dateTileParts(firstOfDecember, "America/Los_Angeles")).toEqual({ month: "Nov", day: "30" });
  });
});
