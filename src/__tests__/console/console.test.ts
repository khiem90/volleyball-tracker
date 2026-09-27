import { describe, expect, it } from "vitest";
import {
  bracketView,
  consoleAccess,
  courtsView,
  roleFor,
  scheduleView,
  standingsView,
  teamsView,
} from "@/lib/console";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import type { Match } from "@/types/game";
import { draftWorld, find, openOn, started, win } from "../engine/helpers";

const sorted = (ids: readonly string[]) => [...ids].sort();

describe("roleFor", () => {
  it("makes the owning account the owner and everyone else, signed in or not, a spectator", () => {
    expect(roleFor("owner-uid", "owner-uid")).toBe("owner");
    expect(roleFor("owner-uid", "other-uid")).toBe("spectator");
    expect(roleFor("owner-uid", null)).toBe("spectator");
    expect(roleFor("owner-uid", undefined)).toBe("spectator");
    expect(roleFor(undefined, "owner-uid")).toBe("spectator");
  });

  it("makes whoever holds the scorer link a scorer, unless they own the tournament", () => {
    expect(roleFor("owner-uid", "phone-uid", true)).toBe("scorer");
    expect(roleFor("owner-uid", null, true)).toBe("scorer");
    expect(roleFor("owner-uid", "owner-uid", true)).toBe("owner");
    expect(roleFor("owner-uid", "phone-uid", false)).toBe("spectator");
  });
});

describe("consoleAccess", () => {
  it("lets the owner of a draft start, rename, duplicate, or delete it, and nothing else", () => {
    expect(consoleAccess("owner", "draft")).toEqual({
      canStart: true,
      canScore: false,
      canEditCourts: false,
      canManage: false,
      canRename: true,
      canDuplicate: true,
      canDelete: true,
      canShare: true,
    });
  });

  it("lets the owner of a live tournament score, arrange courts, manage, rename, duplicate, and delete it", () => {
    expect(consoleAccess("owner", "live")).toEqual({
      canStart: false,
      canScore: true,
      canEditCourts: true,
      canManage: true,
      canRename: true,
      canDuplicate: true,
      canDelete: true,
      canShare: true,
    });
  });

  it("makes a completed tournament read-only for its owner, who can still duplicate or delete it", () => {
    expect(consoleAccess("owner", "completed")).toEqual({
      canStart: false,
      canScore: false,
      canEditCourts: false,
      canManage: false,
      canRename: false,
      canDuplicate: true,
      canDelete: true,
      canShare: true,
    });
  });

  it("lets a scorer score and arrange courts on a live tournament but nothing an owner does", () => {
    expect(consoleAccess("scorer", "live")).toEqual({
      canStart: false,
      canScore: true,
      canEditCourts: true,
      canManage: false,
      canRename: false,
      canDuplicate: false,
      canDelete: false,
      canShare: false,
    });
  });

  it("gives a scorer nothing on a draft or a completed tournament", () => {
    expect(consoleAccess("scorer", "draft").canScore).toBe(false);
    expect(consoleAccess("scorer", "draft").canStart).toBe(false);
    expect(consoleAccess("scorer", "completed").canScore).toBe(false);
  });

  it("gives a spectator nothing in any status", () => {
    for (const status of ["draft", "live", "completed"] as const) {
      expect(consoleAccess("spectator", status)).toEqual({
        canStart: false,
        canScore: false,
        canEditCourts: false,
        canManage: false,
        canRename: false,
        canDuplicate: false,
        canDelete: false,
        canShare: false,
      });
    }
  });
});

describe("courtsView for rotation formats", () => {
  it("shows one court per court in play, each with its open match, and the queue behind them", () => {
    const world = started("win2out", 5, { courts: 2 });

    const view = courtsView(world.tournament, world.matches);

    expect(view.kind).toBe("rotation");
    if (view.kind !== "rotation") return;
    expect(view.courts.map((c) => c.court)).toEqual([1, 2]);
    for (const court of view.courts) {
      expect(court.match?.status).toBe("pending");
      expect(court.match?.court).toBe(court.court);
      expect(sorted(court.match ? [court.match.homeTeamId, court.match.awayTeamId] : [])).toEqual(
        sorted(court.teamIds),
      );
    }
    expect(view.queue).toEqual(["t5"]);
  });

  it("moves with a result: the winner stays, the loser joins the queue, and the next team comes on", () => {
    const before = started("win2out", 5, { courts: 2 });
    const first = openOn(before, 1);
    const after = win(before, first.id, "t1");

    const view = courtsView(after.tournament, after.matches);

    if (view.kind !== "rotation") throw new Error("expected rotation courts");
    const court1 = view.courts[0];
    expect(court1.match?.id).not.toBe(first.id);
    expect(sorted(court1.teamIds)).toEqual(["t1", "t5"]);
    expect(view.queue).toEqual(["t2"]);
  });

  it("has no courts and an empty queue before the tournament starts", () => {
    const draft = draftWorld("two_match_rotation", 4);

    expect(courtsView(draft.tournament, draft.matches)).toEqual({
      kind: "rotation",
      courts: [],
      queue: [],
    });
  });
});

describe("courtsView for round robin and brackets", () => {
  it("lists a round robin's live matches first and its pending ones in round order", () => {
    const world = started("round_robin", 4);
    const [first, ...rest] = world.matches;
    const matches = [{ ...first, status: "in_progress" as const, homeScore: 3 }, ...rest.reverse()];

    const view = courtsView(world.tournament, matches);

    expect(view.kind).toBe("matches");
    if (view.kind !== "matches") return;
    expect(view.live.map((m) => m.id)).toEqual([first.id]);
    expect(view.pending).toHaveLength(5);
    const order = view.pending.map((m) => [m.round, m.position]);
    expect(order).toEqual([...order].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  });

  it("leaves out bracket slots that are still waiting for a team and byes", () => {
    const world = started("single_elimination", 5);

    const view = courtsView(world.tournament, world.matches);

    if (view.kind !== "matches") throw new Error("expected matches");
    expect(view.pending.length).toBeGreaterThan(0);
    for (const match of view.pending) {
      expect(match.homeTeamId).not.toBe("");
      expect(match.awayTeamId).not.toBe("");
      expect(match.isBye).not.toBe(true);
    }
    expect(view.pending.length).toBeLessThan(world.matches.length);
  });

  it("orders a double elimination's pending matches winners first, then losers", () => {
    const world = started("double_elimination", 4);
    // Both winners semi-finals played: the final and the losers bracket are ready.
    const afterFirst = win(
      world,
      find(world, { bracket: "winners", round: 1, position: 1 }).id,
      "t1",
    );
    const afterBoth = win(
      afterFirst,
      find(afterFirst, { bracket: "winners", round: 1, position: 2 }).id,
      "t3",
    );

    const view = courtsView(afterBoth.tournament, afterBoth.matches);

    if (view.kind !== "matches") throw new Error("expected matches");
    expect(view.pending.map((m) => m.bracket)).toEqual(["winners", "losers"]);
    expect(view.pending.every((m) => m.homeTeamId !== "" && m.awayTeamId !== "")).toBe(true);
  });
});

describe("scheduleView", () => {
  it("lists every round robin match in play order with its round", () => {
    const world = started("round_robin", 4);
    const shuffled = [...world.matches].reverse();

    const rows = scheduleView(world.tournament, shuffled);

    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.label)).toEqual([
      "Round 1", "Round 1", "Round 2", "Round 2", "Round 3", "Round 3",
    ]);
    expect(rows.map((row) => row.match.position)).toEqual([1, 2, 1, 2, 1, 2]);
  });

  it("names bracket rounds and keeps a completed match in its place", () => {
    const world = started("single_elimination", 4);
    const semi = find(world, { round: 1, position: 1 });
    const played = win(world, semi.id, "t1");

    const rows = scheduleView(played.tournament, played.matches);

    expect(rows.map((row) => row.label)).toEqual(["Semi-Finals", "Semi-Finals", "Finals"]);
    expect(rows[0].match.status).toBe("completed");
  });

  it("walks a double elimination through winners, losers, and the grand final", () => {
    const world = started("double_elimination", 4);

    const labels = scheduleView(world.tournament, world.matches).map((row) => row.label);

    expect(labels[0]).toBe("Winners Semi-Finals");
    expect(labels).toContain("Losers Round 1");
    expect(labels.at(-1)).toBe("Grand Finals");
  });

  it("labels rotation matches by their court, using the tournament's word for it", () => {
    const world = started("two_match_rotation", 5, {
      courts: 2,
      terminology: { ...DEFAULT_TERMINOLOGY, venue: "field", venuePlural: "fields" },
    });
    const played = win(world, openOn(world, 1).id, "t1");

    const rows = scheduleView(played.tournament, played.matches);

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.label).sort()).toEqual(["Field 1", "Field 1", "Field 2"]);
    expect(rows.filter((row) => row.match.status === "completed")).toHaveLength(1);
  });
});

describe("teamsView", () => {
  it("gives each entry its record in this tournament, in entry order", () => {
    const world = started("round_robin", 4);
    const played = win(world, find(world, { homeTeamId: "t1", awayTeamId: "t2" }).id, "t1");
    const roster = played.tournament.entries.map((entry) => ({
      id: entry.teamId,
      name: entry.name.toUpperCase(),
      createdAt: 0,
    }));

    const rows = teamsView(played.tournament, played.matches, roster);

    expect(rows.map((row) => row.teamId)).toEqual(["t1", "t2", "t3", "t4"]);
    expect(rows[0]).toMatchObject({ name: "TEAM T1", played: 1, won: 1, lost: 0, withdrawn: false });
    expect(rows[1]).toMatchObject({ played: 1, won: 0, lost: 1 });
    expect(rows[2]).toMatchObject({ played: 0, won: 0, lost: 0 });
  });

  it("counts a forfeit as a win and a loss, marks a withdrawn entry, and falls back to the entry's name", () => {
    const world = started("round_robin", 3);
    const match = find(world, { homeTeamId: "t1", awayTeamId: "t2" });
    const forfeited: Match = {
      ...match,
      status: "completed",
      winnerId: "t1",
      forfeitedBy: "t2",
    };
    const tournament = {
      ...world.tournament,
      entries: world.tournament.entries.map((entry) =>
        entry.teamId === "t2" ? { ...entry, withdrawnAt: 5 } : entry,
      ),
    };

    const rows = teamsView(tournament, [forfeited], []);

    expect(rows[0]).toMatchObject({ name: "Team t1", won: 1, lost: 0 });
    expect(rows[1]).toMatchObject({ name: "Team t2", won: 0, lost: 1, withdrawn: true });
  });
});

describe("standingsView", () => {
  it("ranks a round robin's teams by points, then difference", () => {
    const world = started("round_robin", 4);
    let played = win(world, find(world, { homeTeamId: "t1", awayTeamId: "t2" }).id, "t1");
    played = win(played, find(played, { homeTeamId: "t3", awayTeamId: "t4" }).id, "t4");

    const view = standingsView(played.tournament, played.matches);

    expect(view.kind).toBe("round_robin");
    if (view.kind !== "round_robin") return;
    expect(view.rows.slice(0, 2).map((row) => row.teamId).sort()).toEqual(["t1", "t4"]);
    expect(view.rows[0]).toMatchObject({ won: 1, lost: 0, competitionPoints: 3 });
    expect(view.rows[3]).toMatchObject({ won: 0, lost: 1 });
  });

  it("ranks Win 2 & Out teams by times champion and says where each one is", () => {
    const world = started("win2out", 5, { courts: 2 });
    const first = win(world, openOn(world, 1).id, "t1");
    const champion = win(first, openOn(first, 1).id, "t1");

    const view = standingsView(champion.tournament, champion.matches);

    expect(view.kind).toBe("win2out");
    if (view.kind !== "win2out") return;
    expect(view.rows).toHaveLength(5);
    expect(view.rows[0]).toMatchObject({ teamId: "t1", championCount: 1, matchesPlayed: 2 });
    expect(view.rows[0].queuePosition).toBe(1);
    expect(view.rows[0].court).toBeUndefined();
    const onCourt2 = view.rows.filter((row) => row.court === 2);
    expect(onCourt2).toHaveLength(2);
  });

  it("ranks Two Match Rotation teams by wins and keeps teams that have not played yet", () => {
    const world = started("two_match_rotation", 4);
    const played = win(world, openOn(world, 1).id, "t1");

    const view = standingsView(played.tournament, played.matches);

    expect(view.kind).toBe("two_match");
    if (view.kind !== "two_match") return;
    expect(view.rows).toHaveLength(4);
    expect(view.rows[0]).toMatchObject({ teamId: "t1", won: 1, lost: 0, played: 1, court: 1 });
    expect(view.rows.find((row) => row.teamId === "t2")).toMatchObject({ won: 0, lost: 1 });
    expect(view.rows.filter((row) => row.played === 0)).toHaveLength(2);
  });

  it("has no table for a bracket format", () => {
    const world = started("single_elimination", 4);

    expect(standingsView(world.tournament, world.matches)).toEqual({ kind: "bracket" });
  });
});

describe("bracketView", () => {
  it("lays a single elimination out round by round", () => {
    const world = started("single_elimination", 4);

    const view = bracketView(world.tournament, world.matches);

    expect(view.sections).toHaveLength(1);
    expect(view.sections[0].title).toBeNull();
    expect(view.sections[0].rounds.map((round) => round.label)).toEqual(["Semi-Finals", "Finals"]);
    expect(view.sections[0].rounds.map((round) => round.matches.length)).toEqual([2, 1]);
  });

  it("places every match of a five-team bracket exactly once", () => {
    const world = started("single_elimination", 5);

    const view = bracketView(world.tournament, world.matches);

    const placed = view.sections.flatMap((s) => s.rounds.flatMap((r) => r.matches.map((m) => m.id)));
    expect(placed.sort()).toEqual(world.matches.map((m) => m.id).sort());
    expect(view.sections[0].rounds).toHaveLength(3);
  });

  it("splits a double elimination into winners, losers, and the grand final", () => {
    const world = started("double_elimination", 4);

    const view = bracketView(world.tournament, world.matches);

    expect(view.sections.map((s) => s.title)).toEqual(["Winners", "Losers", "Grand Final"]);
    expect(view.sections[0].rounds.map((r) => r.label)).toEqual([
      "Winners Semi-Finals",
      "Winners Finals",
    ]);
    expect(view.sections[1].rounds.length).toBeGreaterThan(0);
    expect(view.sections[2].rounds[0].matches).toHaveLength(1);
  });

  it("is empty for a format without a bracket", () => {
    const world = started("round_robin", 4);

    expect(bracketView(world.tournament, world.matches)).toEqual({ sections: [] });
  });
});
