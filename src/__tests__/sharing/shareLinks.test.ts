import { describe, expect, it } from "vitest";
import {
  forgetScorerLink,
  memoryLinkStore,
  recordScorerLink,
  recordedScorerLinks,
  scorerKeyIn,
  scorerLink,
  spectatorLink,
  type LinkStore,
} from "@/lib/shareLinks";

describe("the links", () => {
  it("the spectator link is the tournament's page", () => {
    expect(spectatorLink("https://tt.example", "abc123")).toBe(
      "https://tt.example/competitions/abc123",
    );
  });

  it("the scorer link is the same page carrying the key", () => {
    expect(scorerLink("https://tt.example", "abc123", "k_9x")).toBe(
      "https://tt.example/competitions/abc123?scorer=k_9x",
    );
  });

  it("reads the key from the page's query, and nothing from a page without one", () => {
    expect(scorerKeyIn(new URLSearchParams("scorer=k_9x"))).toBe("k_9x");
    expect(scorerKeyIn(new URLSearchParams(""))).toBeNull();
    expect(scorerKeyIn(new URLSearchParams("scorer="))).toBeNull();
  });
});

describe("the phone's record of scorer links", () => {
  const memoryStore = memoryLinkStore;

  it("remembers the key per tournament and hands the whole record back", () => {
    const store = memoryStore();
    recordScorerLink(store, "tourn-1", "k1");
    const record = recordScorerLink(store, "tourn-2", "k2");

    expect(record).toEqual({ "tourn-1": "k1", "tourn-2": "k2" });
    expect(recordedScorerLinks(store)).toEqual({ "tourn-1": "k1", "tourn-2": "k2" });
  });

  it("a newer link for the same tournament replaces the old one", () => {
    const store = memoryStore();
    recordScorerLink(store, "tourn-1", "k1");
    recordScorerLink(store, "tourn-1", "k2");

    expect(recordedScorerLinks(store)).toEqual({ "tourn-1": "k2" });
  });

  it("forgets one tournament and keeps the rest", () => {
    const store = memoryStore();
    recordScorerLink(store, "tourn-1", "k1");
    recordScorerLink(store, "tourn-2", "k2");

    expect(forgetScorerLink(store, "tourn-1")).toEqual({ "tourn-2": "k2" });
    expect(recordedScorerLinks(store)).toEqual({ "tourn-2": "k2" });
  });

  it("reads an empty record from an empty or unreadable store", () => {
    expect(recordedScorerLinks(memoryStore())).toEqual({});

    const corrupt = memoryStore();
    corrupt.setItem("tournament-tracker.scorerLinks", "{not json");
    expect(recordedScorerLinks(corrupt)).toEqual({});

    const wrongShape = memoryStore();
    wrongShape.setItem("tournament-tracker.scorerLinks", JSON.stringify(["k1"]));
    expect(recordedScorerLinks(wrongShape)).toEqual({});

    const throwing: LinkStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(recordedScorerLinks(throwing)).toEqual({});
    expect(recordScorerLink(throwing, "tourn-1", "k1")).toEqual({ "tourn-1": "k1" });
  });
});
