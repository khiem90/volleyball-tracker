import { describe, expect, it } from "vitest";
import { listTournamentRows } from "@/lib/rsvpList";
import type { TournamentStatus } from "@/types/game";

const tournament = (id: string, status: TournamentStatus, name = `Tournament ${id}`) => ({
  id,
  name,
  status,
});

describe("listTournamentRows", () => {
  it("offers Watch for a live tournament, opening its console", () => {
    expect(listTournamentRows([tournament("t1", "live", "Friday pickup")])).toEqual([
      { id: "t1", name: "Friday pickup", isLive: true, action: "Watch", href: "/competitions/t1" },
    ]);
  });

  it("offers See results for a completed tournament", () => {
    expect(listTournamentRows([tournament("t1", "completed", "Friday pickup")])).toEqual([
      {
        id: "t1",
        name: "Friday pickup",
        isLive: false,
        action: "See results",
        href: "/competitions/t1",
      },
    ]);
  });

  it("gives nothing for a draft, which only its owner can read", () => {
    expect(listTournamentRows([tournament("t1", "draft")])).toEqual([]);
  });

  it("gives nothing for a list with no tournament the viewer can read", () => {
    expect(listTournamentRows([])).toEqual([]);
  });

  it("puts the live tournaments first, and keeps the order they were imported in within each", () => {
    const rows = listTournamentRows([
      tournament("first", "completed"),
      tournament("second", "live"),
      tournament("third", "draft"),
      tournament("fourth", "completed"),
      tournament("fifth", "live"),
    ]);
    expect(rows.map((row) => [row.id, row.action])).toEqual([
      ["second", "Watch"],
      ["fifth", "Watch"],
      ["first", "See results"],
      ["fourth", "See results"],
    ]);
  });
});
