import { describe, expect, it } from "vitest";
import {
  changeTeamSize,
  DEFAULT_TEAM_SIZE,
  importedTeamRows,
  importList,
  largestTeamSize,
  movePerson,
  renameImportedTeam,
  shuffleImport,
  type ListImport,
  type Random,
} from "@/lib/rsvpImport";
import type { PersistentTeam, Rsvp, RsvpList } from "@/types/game";

/** Always picks the last of what is left, which leaves the people in arrival order. */
const inOrder: Random = () => 0.999999;
/** Always picks the first of what is left. */
const alwaysFirst: Random = () => 0;

/** An RSVP that arrived `second` seconds in, from an account unless `held`. */
const rsvp = (id: string, name: string, second: number, held = false): Rsvp => ({
  id,
  uid: held ? null : id,
  ...(held && { held: true as const }),
  name,
  createdAt: { seconds: second, nanoseconds: 0 },
});

const fridayPickup: Pick<RsvpList, "id" | "name" | "takes" | "capacity"> = {
  id: "list-1",
  name: "Friday pickup",
  takes: "people",
  capacity: 5,
};

/** Six people answered. The capacity of five leaves Fay on the waitlist. */
const answers = [
  rsvp("c", "Cy", 3),
  rsvp("a", "Ana", 1),
  rsvp("held-1", "Dee", 4, true),
  rsvp("b", "Ben", 2),
  rsvp("f", "Fay", 6),
  rsvp("e", "Eve", 5),
];

const names = (imported: ListImport) =>
  imported.teams.map((team) => team.players?.map((person) => person.name));

describe("importing a by-person list", () => {
  it("keeps the confirmed people in arrival order, held spots included, and leaves the waitlist out", () => {
    const imported = importList(fridayPickup, answers, inOrder);

    expect(imported.people).toEqual([
      { id: "a", name: "Ana" },
      { id: "b", name: "Ben" },
      { id: "c", name: "Cy" },
      { id: "held-1", name: "Dee" },
      { id: "e", name: "Eve" },
    ]);
  });

  it("deals them into mixed teams of the default size", () => {
    const imported = importList(fridayPickup, answers, inOrder);

    expect(DEFAULT_TEAM_SIZE).toBe(4);
    expect(imported).toMatchObject({
      listId: "list-1",
      listName: "Friday pickup",
      takes: "people",
      teamSize: 4,
    });
    expect(imported.teams.map((team) => team.name)).toEqual(["Team 1", "Team 2"]);
    expect(names(imported)).toEqual([
      ["Ana", "Cy", "Eve"],
      ["Ben", "Dee"],
    ]);
  });

  it("brings no teams from a list nobody is on", () => {
    expect(importList(fridayPickup, [], inOrder).teams).toEqual([]);
  });
});

describe("changing the team size", () => {
  const imported = importList(fridayPickup, answers, inOrder);

  it("deals everyone again at the new size", () => {
    const pairs = changeTeamSize(imported, 2, inOrder);

    expect(pairs.teamSize).toBe(2);
    expect(names(pairs)).toEqual([["Ana", "Dee"], ["Ben", "Eve"], ["Cy"]]);
  });

  it("at a size of one, enters each person alone under their own name", () => {
    const singles = changeTeamSize(imported, 1, inOrder);

    expect(singles.teams.map((team) => team.name)).toEqual(["Ana", "Ben", "Cy", "Dee", "Eve"]);
    expect(names(singles)).toEqual([["Ana"], ["Ben"], ["Cy"], ["Dee"], ["Eve"]]);
  });

  it("keeps the size between one and the number of people", () => {
    expect(largestTeamSize(imported)).toBe(5);
    expect(changeTeamSize(imported, 0, inOrder).teamSize).toBe(1);
    expect(changeTeamSize(imported, 9, inOrder).teamSize).toBe(5);
    expect(names(changeTeamSize(imported, 9, inOrder))).toEqual([["Ana", "Ben", "Cy", "Dee", "Eve"]]);
  });

  it("starts the names over, since the teams are new", () => {
    const renamed = renameImportedTeam(imported, "mixed-1", "Sharks");

    expect(changeTeamSize(renamed, 3, inOrder).teams.map((team) => team.name)).toEqual([
      "Team 1",
      "Team 2",
    ]);
  });
});

describe("shuffling", () => {
  it("deals the same people again at the same size", () => {
    const imported = importList(fridayPickup, answers, inOrder);
    const again = shuffleImport(imported, alwaysFirst);

    expect(again.teamSize).toBe(4);
    expect(again.people).toEqual(imported.people);
    expect(names(again)).toEqual([
      ["Ben", "Dee", "Ana"],
      ["Cy", "Eve"],
    ]);
  });

  it("leaves a by-team import as it was", () => {
    const teams: ListImport = {
      listId: "list-2",
      listName: "Friday teams",
      takes: "teams",
      teams: [{ id: "a", name: "Aces" }],
    };

    expect(shuffleImport(teams, alwaysFirst)).toBe(teams);
    expect(changeTeamSize(teams, 2, alwaysFirst)).toBe(teams);
  });
});

describe("moving a person between teams", () => {
  const imported = importList(fridayPickup, answers, inOrder);

  it("takes the person off their team and puts them at the end of the other", () => {
    expect(names(movePerson(imported, "c", "mixed-2"))).toEqual([
      ["Ana", "Eve"],
      ["Ben", "Dee", "Cy"],
    ]);
  });

  it("lets the owner take a team past the team size", () => {
    const three = changeTeamSize(imported, 3, inOrder);

    expect(names(movePerson(three, "b", "mixed-1"))).toEqual([["Ana", "Cy", "Eve", "Ben"], ["Dee"]]);
  });

  it("drops a team left with nobody, and keeps the other teams' names", () => {
    const pairs = changeTeamSize(imported, 2, inOrder);
    const moved = movePerson(pairs, "c", "mixed-1");

    expect(moved.teams.map((team) => team.name)).toEqual(["Team 1", "Team 2"]);
    expect(names(moved)).toEqual([
      ["Ana", "Dee", "Cy"],
      ["Ben", "Eve"],
    ]);
  });

  it("changes nothing for a person or a team the import does not have, or a move to the same team", () => {
    expect(movePerson(imported, "nobody", "mixed-2")).toBe(imported);
    expect(movePerson(imported, "a", "mixed-9")).toBe(imported);
    expect(movePerson(imported, "a", "mixed-1")).toBe(imported);
  });

  it("leaves the people and the team size alone", () => {
    const moved = movePerson(imported, "c", "mixed-2");

    expect(moved.people).toEqual(imported.people);
    expect(moved.teamSize).toBe(4);
  });
});

describe("renaming a mixed team", () => {
  it("changes its name and keeps its players", () => {
    const imported = importList(fridayPickup, answers, inOrder);
    const renamed = renameImportedTeam(imported, "mixed-2", "Sharks");

    expect(renamed.teams.map((team) => team.name)).toEqual(["Team 1", "Sharks"]);
    expect(names(renamed)).toEqual(names(imported));
  });
});

describe("mixed teams as the creation page shows them", () => {
  const roster: PersistentTeam[] = [{ id: "t1", name: "Sharks", color: "#ef4444", createdAt: 1 }];
  const imported = importList(fridayPickup, answers, inOrder);

  it("never matches a mixed team to a roster team, whatever it is called", () => {
    const renamed = renameImportedTeam(imported, "mixed-1", "sharks");

    expect(importedTeamRows(renamed, roster).map((row) => row.rosterTeam)).toEqual([null, null]);
  });

  it("flags two mixed teams under one name", () => {
    const renamed = renameImportedTeam(imported, "mixed-2", " team 1 ");

    expect(importedTeamRows(renamed, roster).map((row) => row.clashes)).toEqual([true, true]);
  });
});
