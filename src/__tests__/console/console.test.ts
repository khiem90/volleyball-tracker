import { describe, expect, it } from "vitest";
import { ReversedCommandError } from "@/lib/commandErrors";
import {
  bracketView,
  consoleAccess,
  courtsView,
  failureNotice,
  roleFor,
  scheduleView,
  standingsView,
  completesTournament,
  scheduleInstantWin,
  takesInstantWin,
  teamsView,
  WIN_TAP_GUARD_MS,
  winTapGuard,
} from "@/lib/console";
import { EngineError } from "@/lib/engine";
import { stackAfterFailure, stackAfterUndo } from "@/lib/undo";
import { DEFAULT_TERMINOLOGY } from "@/types/competition-config";
import type { Match, Tournament } from "@/types/game";
import type { UndoEntry } from "@/types/undo";
import { draftWorld, find, openOn, started, win } from "../engine/helpers";

const sorted = (ids: readonly string[]) => [...ids].sort();

/** A win taken back because another phone recorded `court` first. */
const reversed = (court: number | undefined) =>
  new ReversedCommandError(
    new EngineError("match_completed", "That match has already been completed."),
    court,
  );

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

describe("winTapGuard", () => {
  it("ignores a second tap on the same court inside the guard window", () => {
    const guard = winTapGuard();

    expect(guard.accept(1, 1000)).toBe(true);
    expect(guard.accept(1, 1000 + WIN_TAP_GUARD_MS / 2)).toBe(false);
  });

  it("records a tap on another court inside the window", () => {
    const guard = winTapGuard();

    guard.accept(1, 1000);

    expect(guard.accept(2, 1000 + WIN_TAP_GUARD_MS / 2)).toBe(true);
  });

  it("records a tap on the same court once the window has passed", () => {
    const guard = winTapGuard();

    guard.accept(1, 1000);

    expect(guard.accept(1, 1000 + WIN_TAP_GUARD_MS + 1)).toBe(true);
  });

  it("records a tap exactly one window after the last one: the window is half-open", () => {
    const guard = winTapGuard();

    guard.accept(1, 1000);

    expect(guard.accept(1, 1000 + WIN_TAP_GUARD_MS)).toBe(true);
  });

  it("measures the window from the last accepted tap, not from an ignored one", () => {
    const guard = winTapGuard();

    guard.accept(1, 1000);
    guard.accept(1, 1000 + WIN_TAP_GUARD_MS - 1);

    expect(guard.accept(1, 1000 + WIN_TAP_GUARD_MS)).toBe(true);
  });
});

describe("failureNotice", () => {
  const tournament = started("win2out", 6, { courts: 2 }).tournament;
  const onFields: Tournament = {
    ...tournament,
    settings: {
      ...tournament.settings,
      terminology: { ...DEFAULT_TERMINOLOGY, venue: "field", venuePlural: "fields" },
    },
  };
  it("says which court another scorer recorded first when a win was taken back", () => {
    expect(failureNotice(tournament, reversed(2), "The result could not be recorded.")).toBe(
      "Court 2 was already recorded by another scorer.",
    );
  });

  it("names the court in the tournament's own words", () => {
    expect(failureNotice(onFields, reversed(1), "The result could not be recorded.")).toBe(
      "Field 1 was already recorded by another scorer.",
    );
  });

  it("falls back to the error's own message for a reversed change that concerned no court", () => {
    const error = reversed(undefined);

    expect(failureNotice(tournament, error, "The change could not be made.")).toBe(error.message);
  });

  it("keeps the wording of every other failure: the error's message, or the fallback when it has none", () => {
    expect(failureNotice(tournament, new Error("No signal."), "The result could not be recorded.")).toBe(
      "No signal.",
    );
    expect(failureNotice(tournament, "nope", "The result could not be recorded.")).toBe(
      "The result could not be recorded.",
    );
  });
});

describe("the undo stack", () => {
  const entry = (id: string, tournamentId: string, matchId: string): UndoEntry => ({
    id,
    actionType: "instant_win",
    description: `${id} won`,
    tournamentId,
    matchId,
    timestamp: 1,
  });
  // Newest first, as the toast keeps it: a win on court 2, then court 1, then
  // court 1 again in another tournament.
  const stack = [entry("u3", "tour-a", "m-court2"), entry("u2", "tour-a", "m-court1"), entry("u1", "tour-b", "m-court1")];

  describe("stackAfterFailure", () => {
    it("drops the entry of a win whose write failed, whatever the failure, since the result has been rolled back, and keeps the others", () => {
      expect(stackAfterFailure(stack, "tour-a", "m-court1").map((e) => e.id)).toEqual([
        "u3",
        "u1",
      ]);
    });

    it("leaves the stack alone when the failed result has no entry", () => {
      expect(stackAfterFailure(stack, "tour-a", "m-court9")).toEqual(stack);
    });
  });

  describe("stackAfterUndo", () => {
    const undone = stack[1];

    it("drops the entry once its undo has been applied on this phone", () => {
      expect(stackAfterUndo(stack, undone, null).map((e) => e.id)).toEqual(["u3", "u1"]);
    });

    it("drops the entry when the engine refused the undo because the court moved on, since it can never apply later", () => {
      const refused = new EngineError("court_moved_on", "That result cannot be undone any more.");

      expect(stackAfterUndo(stack, undone, refused).map((e) => e.id)).toEqual(["u3", "u1"]);
    });

    it("drops the entry when the undo was taken back with the win it was queued behind", () => {
      expect(stackAfterUndo(stack, undone, reversed(1)).map((e) => e.id)).toEqual(["u3", "u1"]);
    });

    it("keeps the entry after any other failure, so the undo can be tried again", () => {
      expect(stackAfterUndo(stack, undone, new Error("No signal."))).toBe(stack);
    });
  });
});

describe("completesTournament", () => {
  const liveRoundRobin = (settings = {}) => started("round_robin", 3, { instantWin: true, ...settings });

  it("is true for the last unplayed match of a single-game round robin", () => {
    let world = liveRoundRobin();
    const [first, second, third] = world.matches;
    world = win(world, first.id, first.homeTeamId);
    world = win(world, second.id, second.homeTeamId);

    expect(completesTournament(world.tournament, world.matches, third, third.homeTeamId)).toBe(true);
    expect(completesTournament(world.tournament, world.matches, third, third.awayTeamId)).toBe(true);
  });

  it("is false while another match is still to be played", () => {
    const world = liveRoundRobin();
    const [first] = world.matches;

    expect(completesTournament(world.tournament, world.matches, first, first.homeTeamId)).toBe(false);
  });

  it("in a best-of, is true only for the tap that decides the last match", () => {
    let world = liveRoundRobin({ seriesLength: 3 });
    const [first, second, third] = world.matches;
    for (const m of [first, second]) {
      world = win(world, m.id, m.homeTeamId);
      world = win(world, m.id, m.homeTeamId);
    }
    expect(completesTournament(world.tournament, world.matches, third, third.homeTeamId)).toBe(false);

    world = win(world, third.id, third.homeTeamId);
    const live = find(world, { id: third.id });
    expect(completesTournament(world.tournament, world.matches, live, live.homeTeamId)).toBe(true);
    expect(completesTournament(world.tournament, world.matches, live, live.awayTeamId)).toBe(false);
  });

  it("is never true outside Round Robin", () => {
    const world = started("win2out", 3, { instantWin: true });
    const match = world.matches[0];

    expect(completesTournament(world.tournament, world.matches, match, match.homeTeamId)).toBe(false);
  });
});

describe("scheduleInstantWin and takesInstantWin", () => {
  it("offers the buttons on a live Round Robin with Instant win on, to a role that may score", () => {
    const world = started("round_robin", 3, { instantWin: true });
    const scorer = consoleAccess("scorer", "live");
    const spectator = consoleAccess("spectator", "live");

    expect(scheduleInstantWin(world.tournament, scorer)).toBe(true);
    expect(scheduleInstantWin(world.tournament, spectator)).toBe(false);
    expect(scheduleInstantWin({ ...world.tournament, settings: { ...world.tournament.settings, instantWin: false } }, scorer)).toBe(false);
    expect(scheduleInstantWin(started("win2out", 3, { instantWin: true }).tournament, scorer)).toBe(false);
    expect(scheduleInstantWin({ ...world.tournament, status: "completed" }, scorer)).toBe(false);
  });

  it("puts the buttons on pending and live rows, not on completed ones", () => {
    const world = started("round_robin", 3, { instantWin: true, seriesLength: 3 });
    const match = world.matches[0];
    expect(takesInstantWin(match)).toBe(true);

    const mid = win(world, match.id, match.homeTeamId);
    expect(takesInstantWin(find(mid, { id: match.id }))).toBe(true);

    const done = win(mid, match.id, match.homeTeamId);
    expect(takesInstantWin(find(done, { id: match.id }))).toBe(false);
  });
});
