import { describe, expect, it } from "vitest";
import { dealTeams, type ImportedPerson, type Random } from "@/lib/rsvpImport";

/** A source of randomness that gives the same numbers for the same seed. */
const seeded = (seed: number): Random => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Always picks the first of what is left. */
const alwaysFirst: Random = () => 0;
/** Always picks the last of what is left, which leaves the people in the order given. */
const alwaysLast: Random = () => 0.999999;

const people = (...names: string[]): ImportedPerson[] =>
  names.map((name) => ({ id: `rsvp-${name.toLowerCase()}`, name }));

const crowd = (count: number): ImportedPerson[] =>
  Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Person ${i + 1}` }));

const sizes = (teams: { players?: unknown[] }[]) => teams.map((team) => team.players?.length ?? 0);

describe("dealing people into mixed teams", () => {
  it("deals fourteen people at size four into teams of 4, 4, 3, and 3", () => {
    expect(sizes(dealTeams(crowd(14), 4, seeded(1)))).toEqual([4, 4, 3, 3]);
  });

  it("deals the people round the teams in the order the randomness leaves them", () => {
    const four = people("Ana", "Ben", "Cy", "Dee");

    expect(dealTeams(four, 2, alwaysLast).map((team) => team.players?.map((p) => p.name))).toEqual([
      ["Ana", "Cy"],
      ["Ben", "Dee"],
    ]);
    expect(dealTeams(four, 2, alwaysFirst).map((team) => team.players?.map((p) => p.name))).toEqual([
      ["Ben", "Dee"],
      ["Cy", "Ana"],
    ]);
  });

  it("names the teams Team 1, Team 2, and so on, in the order they enter", () => {
    expect(dealTeams(crowd(7), 3, seeded(2)).map((team) => team.name)).toEqual([
      "Team 1",
      "Team 2",
      "Team 3",
    ]);
  });

  it("puts every person on exactly one team", () => {
    for (const count of [1, 2, 5, 9, 14, 23]) {
      for (const size of [1, 2, 3, 4, 6]) {
        const dealt = dealTeams(crowd(count), size, seeded(count * 31 + size));
        const ids = dealt.flatMap((team) => team.players?.map((p) => p.id) ?? []);

        expect([...ids].sort()).toEqual(crowd(count).map((p) => p.id).sort());
      }
    }
  });

  it("makes the fewest teams that keep every team at or under the size, with sizes at most one apart", () => {
    for (const count of [1, 2, 5, 9, 14, 23]) {
      for (const size of [1, 2, 3, 4, 6]) {
        const dealt = sizes(dealTeams(crowd(count), size, seeded(count + size)));

        expect(dealt).toHaveLength(Math.ceil(count / size));
        expect(Math.max(...dealt)).toBeLessThanOrEqual(size);
        expect(Math.max(...dealt) - Math.min(...dealt)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("at a size of one, enters each person alone under their own name", () => {
    const dealt = dealTeams(people("Ana", "Ben", "Cy"), 1, alwaysLast);

    expect(dealt.map((team) => team.name)).toEqual(["Ana", "Ben", "Cy"]);
    expect(dealt.map((team) => team.players?.map((p) => p.name))).toEqual([["Ana"], ["Ben"], ["Cy"]]);
  });

  it("gives the same deal for the same randomness and another for different randomness", () => {
    const fourteen = crowd(14);

    expect(dealTeams(fourteen, 4, seeded(7))).toEqual(dealTeams(fourteen, 4, seeded(7)));
    expect(dealTeams(fourteen, 4, seeded(7))).not.toEqual(dealTeams(fourteen, 4, seeded(8)));
  });

  it("gives every team its own id", () => {
    const ids = dealTeams(crowd(9), 2, seeded(3)).map((team) => team.id);

    expect(new Set(ids).size).toBe(5);
  });

  it("treats a size below one as one, and deals nobody into no teams", () => {
    expect(sizes(dealTeams(crowd(3), 0, seeded(1)))).toEqual([1, 1, 1]);
    expect(dealTeams([], 4, seeded(1))).toEqual([]);
  });
});
