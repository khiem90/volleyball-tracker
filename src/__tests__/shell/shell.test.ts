import { describe, expect, it } from "vitest";
import { SHELL_TABS, tabFor, tabHref, type ShellTabId } from "@/lib/shell";

const tab = (id: ShellTabId) => SHELL_TABS.find((spec) => spec.id === id)!;

describe("tabFor", () => {
  it("puts each section's pages under its tab", () => {
    expect(tabFor("/")).toBe("home");
    expect(tabFor("/teams")).toBe("teams");
    expect(tabFor("/competitions")).toBe("tournaments");
    expect(tabFor("/competitions/new")).toBe("tournaments");
    expect(tabFor("/competitions/k3v9x2")).toBe("tournaments");
    expect(tabFor("/summaries")).toBe("history");
  });

  it("puts quick match and the tools under Home, which is where they are reached from", () => {
    expect(tabFor("/quick-match")).toBe("home");
    expect(tabFor("/tools")).toBe("home");
    expect(tabFor("/tools/volleyball-rotations/my-formations")).toBe("home");
  });

  it("puts sign-in and the scoring page under no tab", () => {
    expect(tabFor("/login")).toBeNull();
    expect(tabFor("/match/k3v9x2")).toBeNull();
    expect(tabFor("/match/guest")).toBeNull();
  });
});

describe("tabHref", () => {
  it("sends a guest to sign in before a tab that needs an account, and back to the tab after", () => {
    expect(tabHref(tab("teams"), true)).toBe("/login?redirect=%2Fteams");
    expect(tabHref(tab("tournaments"), true)).toBe("/login?redirect=%2Fcompetitions");
    expect(tabHref(tab("history"), true)).toBe("/login?redirect=%2Fsummaries");
    expect(tabHref(tab("home"), true)).toBe("/");
  });

  it("takes a signed-in account straight to every tab", () => {
    expect(SHELL_TABS.map((spec) => tabHref(spec, false))).toEqual([
      "/",
      "/teams",
      "/competitions",
      "/summaries",
    ]);
  });
});
