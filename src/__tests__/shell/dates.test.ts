// @vitest-environment node
import { describe, expect, it } from "vitest";
import { shortDate, todayLine } from "@/lib/dates";

/* Dates are read on the device's own clock, so each one here is built on it too. */
const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour);

describe("a short date in a list", () => {
  it("is the short month and the day", () => {
    expect(shortDate(at(2026, 9, 27).getTime())).toBe("Sep 27");
    expect(shortDate(at(2026, 12, 3, 23).getTime())).toBe("Dec 3");
  });

  it("is TBD for a time that is not set", () => {
    expect(shortDate(undefined)).toBe("TBD");
    expect(shortDate(0)).toBe("TBD");
  });
});

describe("today's line in a page header", () => {
  it("is the weekday, the month, and the day", () => {
    expect(todayLine({ now: at(2026, 11, 26) })).toBe("Thursday, November 26");
  });

  it("ends with the year where the page asks for it", () => {
    expect(todayLine({ year: true, now: at(2026, 11, 26) })).toBe("Thursday, November 26, 2026");
    expect(todayLine({ year: true, now: at(2027, 1, 1) })).toBe("Friday, January 1, 2027");
  });
});
