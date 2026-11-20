import { describe, expect, it } from "vitest";
import {
  importList,
  importReadiness,
  matchRosterTeams,
  nameClashes,
  renameImportedTeam,
  rsvpsToImport,
} from "@/lib/rsvpImport";
import type { PersistentTeam, Rsvp, RsvpList } from "@/types/game";

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;

/** A by-team list scheduled for an hour from now unless changed. */
const list = (changes: { takes?: "people" | "teams"; closed?: boolean; scheduledAt?: number } = {}) => ({
  takes: "teams" as const,
  closed: false,
  scheduledAt: NOW + HOUR,
  ...changes,
});

describe("whether a list can be imported yet", () => {
  it("is ready once the owner has closed it", () => {
    expect(importReadiness(list({ closed: true }), NOW)).toEqual({ kind: "ready" });
  });

  it("is not ready while the list is open, so the owner is offered a close first", () => {
    expect(importReadiness(list(), NOW)).toEqual({ kind: "open" });
  });

  it("is ready once the scheduled time has passed, closed or not", () => {
    expect(importReadiness(list({ scheduledAt: NOW }), NOW)).toEqual({ kind: "ready" });
    expect(importReadiness(list({ scheduledAt: NOW - HOUR, closed: true }), NOW)).toEqual({
      kind: "ready",
    });
  });

  it("treats a list with no scheduled time as open until it is closed", () => {
    expect(importReadiness(list({ scheduledAt: undefined }), NOW)).toEqual({ kind: "open" });
    expect(importReadiness(list({ scheduledAt: undefined, closed: true }), NOW)).toEqual({
      kind: "ready",
    });
  });

  it("cannot import a by-person list yet, whatever its state", () => {
    expect(importReadiness(list({ takes: "people", closed: true }), NOW)).toEqual({
      kind: "by_person",
    });
    expect(importReadiness(list({ takes: "people" }), NOW)).toEqual({ kind: "by_person" });
  });
});

/** An RSVP that arrived `second` seconds in, from an account unless `held`. */
const rsvp = (id: string, name: string, second: number, held = false): Rsvp => ({
  id,
  uid: held ? null : id,
  ...(held && { held: true as const }),
  name,
  createdAt: { seconds: second, nanoseconds: 0 },
});

const fridayTeams: RsvpList = {
  id: "list-1",
  ownerId: "owner-uid",
  name: "Friday teams",
  takes: "teams",
  capacity: 3,
  scheduledAt: NOW + HOUR,
  opensAt: NOW - HOUR,
  enabled: true,
  closed: true,
  tournamentIds: [],
  createdAt: NOW - 2 * HOUR,
  updatedAt: NOW - 2 * HOUR,
};

describe("the RSVPs an import takes", () => {
  it("takes the confirmed RSVPs in arrival order and leaves the waitlist out", () => {
    const rsvps = [
      rsvp("c", "Chasers", 3),
      rsvp("a", "Aces", 1),
      rsvp("d", "Diggers", 4),
      rsvp("b", "Blockers", 2),
    ];

    expect(rsvpsToImport(rsvps, 3).map((r) => r.name)).toEqual(["Aces", "Blockers", "Chasers"]);
  });

  it("takes a held spot like any other RSVP", () => {
    const rsvps = [rsvp("a", "Aces", 1), rsvp("held-1", "Walk-ins", 2, true), rsvp("c", "Chasers", 3)];

    expect(rsvpsToImport(rsvps, 2).map((r) => r.name)).toEqual(["Aces", "Walk-ins"]);
  });
});

describe("importing a by-team list", () => {
  it("gives one team per confirmed RSVP, in arrival order, under the RSVP's name", () => {
    const imported = importList(fridayTeams, [
      rsvp("b", "Blockers", 2),
      rsvp("a", "Aces", 1),
      rsvp("held-1", "Walk-ins", 3, true),
      rsvp("d", "Diggers", 4),
    ]);

    expect(imported).toEqual({
      listId: "list-1",
      listName: "Friday teams",
      takes: "teams",
      teams: [
        { id: "a", name: "Aces" },
        { id: "b", name: "Blockers" },
        { id: "held-1", name: "Walk-ins" },
      ],
    });
  });

  it("refuses a by-person list for now", () => {
    expect(() => importList({ ...fridayTeams, takes: "people" }, [rsvp("a", "Ana", 1)])).toThrow(
      "A by-person list cannot be imported yet.",
    );
  });
});

describe("renaming an imported team", () => {
  const imported = importList(fridayTeams, [rsvp("a", "Spikers", 1), rsvp("b", "spikers", 2)]);

  it("changes that team's name and leaves its id, its place, and the others alone", () => {
    expect(renameImportedTeam(imported, "b", "Spikers B").teams).toEqual([
      { id: "a", name: "Spikers" },
      { id: "b", name: "Spikers B" },
    ]);
  });

  it("keeps the name as typed, so a space typed mid-name survives the next keystroke", () => {
    expect(renameImportedTeam(imported, "b", "Spikers ").teams[1].name).toBe("Spikers ");
  });
});

describe("clashes among team names", () => {
  it("finds two teams under the same name, ignoring case and outer spaces", () => {
    expect(nameClashes(["Spikers", "Aces", " spikers "])).toEqual([
      { name: "Spikers", indexes: [0, 2] },
    ]);
  });

  it("finds none when every name is its own", () => {
    expect(nameClashes(["Spikers", "Aces", "Spikers B"])).toEqual([]);
  });

  it("reports each clash once, however many teams share the name", () => {
    expect(nameClashes(["Aces", "ACES", "Diggers", "aces", "diggers"])).toEqual([
      { name: "Aces", indexes: [0, 1, 3] },
      { name: "Diggers", indexes: [2, 4] },
    ]);
  });

  it("does not call two blank names a clash", () => {
    expect(nameClashes(["", "  "])).toEqual([]);
  });
});

describe("matching team names to the roster", () => {
  const roster: PersistentTeam[] = [
    { id: "t1", name: "Aces", color: "#ef4444", createdAt: 1 },
    { id: "t2", name: "Blockers", color: "#3b82f6", createdAt: 2 },
  ];

  it("matches a name to the roster team with that name, ignoring case and outer spaces", () => {
    expect(matchRosterTeams(["ACES", " blockers "], roster)).toEqual([roster[0], roster[1]]);
  });

  it("gives null for a name the roster does not have", () => {
    expect(matchRosterTeams(["Aces", "Chasers"], roster)).toEqual([roster[0], null]);
  });

  it("matches the earlier roster team when two share a name", () => {
    const twin: PersistentTeam = { id: "t3", name: "aces", createdAt: 3 };

    expect(matchRosterTeams(["Aces"], [...roster, twin])).toEqual([roster[0]]);
  });
});
