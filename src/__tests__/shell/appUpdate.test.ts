import { describe, expect, it } from "vitest";
import { nextUpdate } from "@/lib/appUpdate";

describe("nextUpdate", () => {
  it("offers a new version that is waiting, and does nothing else", () => {
    expect(nextUpdate("current", { type: "waiting", controlled: true })).toEqual({
      status: "ready",
      effect: null,
    });
  });

  it("offers nothing to a page no service worker runs, since it came from the network", () => {
    expect(nextUpdate("current", { type: "waiting", controlled: false })).toEqual({
      status: "current",
      effect: null,
    });
  });

  it("lets the waiting version in on Reload, and reloads once it has taken over", () => {
    const tapped = nextUpdate("ready", { type: "reload" });
    expect(tapped).toEqual({ status: "switching", effect: "activate" });
    expect(nextUpdate(tapped.status, { type: "took-over", hadController: true })).toEqual({
      status: "switching",
      effect: "reload",
    });
  });

  it("never reloads when another tab let the new version in, and offers it instead", () => {
    for (const status of ["current", "ready"] as const) {
      expect(nextUpdate(status, { type: "took-over", hadController: true })).toEqual({
        status: "outdated",
        effect: null,
      });
    }
  });

  it("reloads straight away on Reload once another tab has let the new version in", () => {
    expect(nextUpdate("outdated", { type: "reload" })).toEqual({
      status: "switching",
      effect: "reload",
    });
  });

  it("offers nothing when the first service worker takes over a page, since that is no update", () => {
    expect(nextUpdate("current", { type: "took-over", hadController: false })).toEqual({
      status: "current",
      effect: null,
    });
  });
});
