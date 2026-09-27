import { describe, expect, it } from "vitest";
import { liveTournaments, recentResults } from "@/lib/home";
import type { Match, PersistentTeam, Tournament } from "@/types/game";
import {
  NOW,
  OWNER,
  draftWorld,
  openOn,
  playThrough,
  started,
  win,
  withdraw,
  type World,
} from "../engine/helpers";

/** A world's tournament under another id, its matches going with it. */
const withId = (world: World, id: string, changes: Partial<Tournament> = {}): World => ({
  tournament: { ...world.tournament, id, ...changes },
  matches: world.matches.map((m) => ({ ...m, tournamentId: id })),
});

const together = (...worlds: World[]) => ({
  tournaments: worlds.map((w) => w.tournament),
  matches: worlds.flatMap((w) => w.matches),
});

describe("liveTournaments", () => {
  it("lists only live tournaments, the most recently started first", () => {
    const early = withId(started("round_robin", 4), "early", { startedAt: NOW });
    const late = withId(started("win2out", 5), "late", { startedAt: NOW + 60_000 });
    const draft = withId(draftWorld("round_robin", 3), "draft");
    const done = withId(playThrough(started("single_elimination", 4)), "done");
    expect(done.tournament.status).toBe("completed");
    const { tournaments, matches } = together(early, draft, done, late);

    expect(liveTournaments(tournaments, matches).map((row) => row.tournament.id)).toEqual([
      "late",
      "early",
    ]);
  });

  it("counts a round robin's matches played out of all it will play, and the ones being scored now", () => {
    const world = started("round_robin", 4);
    const [first, second] = world.matches;
    const afterOne = win(world, first.id, first.homeTeamId);
    const scoring = {
      ...afterOne,
      matches: afterOne.matches.map((m) =>
        m.id === second.id ? { ...m, status: "in_progress" as const, homeScore: 4 } : m,
      ),
    };

    const [row] = liveTournaments([scoring.tournament], scoring.matches);

    // Four teams meet each other once: six matches.
    expect(row).toMatchObject({ played: 1, total: 6, inPlay: 1 });
  });

  it("leaves a bracket's byes out of its count", () => {
    const world = started("single_elimination", 5);

    const [row] = liveTournaments([world.tournament], world.matches);

    // Five teams need four matches to leave one standing.
    expect(row).toMatchObject({ played: 0, total: 4, inPlay: 0 });
  });

  it("gives a rotation tournament no total, since it keeps scheduling until the owner ends it", () => {
    const world = started("win2out", 5, { courts: 2 });
    const afterOne = win(world, openOn(world, 1).id, "t1");

    const [row] = liveTournaments([afterOne.tournament], afterOne.matches);

    expect(row).toMatchObject({ played: 1, total: null, inPlay: 0 });
  });

  it("counts the teams still in a tournament, leaving out one that withdrew", () => {
    const world = withdraw(started("round_robin", 4), "t4");

    const [row] = liveTournaments([world.tournament], world.matches);

    expect(row.teams).toBe(3);
  });
});

const roster: PersistentTeam[] = ["t1", "t2", "t3", "t4", "t5"].map((id, i) => ({
  id,
  name: `Roster ${id}`,
  createdAt: i,
}));

/** A quick match between two roster teams, with a result. */
const quickResult = (overrides: Partial<Match> = {}): Match => ({
  id: "quick-1",
  ownerId: OWNER,
  tournamentId: null,
  homeTeamId: "t1",
  awayTeamId: "t2",
  homeScore: 21,
  awayScore: 15,
  status: "completed",
  winnerId: "t1",
  round: 1,
  position: 1,
  createdAt: NOW,
  completedAt: NOW,
  ...overrides,
});

/** Play a world's first matches, the home team winning each, one second apart. */
const playFirst = (world: World, count: number): World => {
  let played = world;
  for (const match of world.matches.slice(0, count)) {
    played = win(played, match.id, match.homeTeamId);
  }
  const order = world.matches.slice(0, count).map((m) => m.id);
  return {
    ...played,
    matches: played.matches.map((m) =>
      order.includes(m.id) ? { ...m, completedAt: NOW + order.indexOf(m.id) * 1000 } : m,
    ),
  };
};

describe("recentResults", () => {
  it("lists the latest results newest first, up to the limit, each opening its tournament's console", () => {
    const tonight = playFirst(withId(started("round_robin", 4), "tonight"), 3);
    const [, second, third] = tonight.matches;
    const quick = quickResult({ completedAt: NOW + 1500 });

    const results = recentResults(
      [tonight.tournament],
      [...tonight.matches, quick],
      roster,
      3,
    );

    expect(results.map((r) => r.match.id)).toEqual([third.id, quick.id, second.id]);
    expect(results[0]).toMatchObject({ href: "/competitions/tonight", tournament: { id: "tonight" } });
  });

  it("opens a quick match on its own page, with its teams as the roster names them", () => {
    const [result] = recentResults([], [quickResult()], roster);

    expect(result.href).toBe("/match/quick-1");
    expect(result.tournament).toBeNull();
    expect([result.home.name, result.away.name]).toEqual(["Roster t1", "Roster t2"]);
  });

  it("names a completed tournament's teams as they were, and a live one's as the roster names them now", () => {
    const live = playFirst(withId(started("round_robin", 4), "live"), 1);
    const done = withId(playThrough(started("single_elimination", 4)), "done");
    const final = done.matches.find((m) => m.round === 2)!;

    const results = recentResults(
      [live.tournament, done.tournament],
      [...live.matches, { ...final, completedAt: NOW + 10_000 }],
      roster,
    );

    const [fromDone, fromLive] = results;
    expect(fromDone.tournament?.id).toBe("done");
    expect(fromDone.home.name).toBe(`Team ${final.homeTeamId}`);
    expect(fromLive.tournament?.id).toBe("live");
    expect(fromLive.home.name).toBe(`Roster ${fromLive.match.homeTeamId}`);
  });

  it("leaves out byes, which are not results", () => {
    const bracket = withId(started("single_elimination", 5), "bracket");
    expect(bracket.matches.some((m) => m.isBye && m.status === "completed")).toBe(true);

    expect(recentResults([bracket.tournament], bracket.matches, roster)).toEqual([]);
  });

  it("leaves out forfeits, which nobody played, so one withdrawal cannot fill the list", () => {
    const tonight = playFirst(withId(started("round_robin", 4), "tonight"), 1);
    const [played] = tonight.matches;
    const world = withdraw(tonight, "t4");
    expect(world.matches.filter((m) => m.forfeitedBy === "t4").length).toBeGreaterThan(0);

    const results = recentResults([world.tournament], world.matches, roster);

    expect(results.map((r) => r.match.id)).toEqual([played.id]);
  });

  it("leaves out what a tap could not open: a quick match whose team has left the roster, or a match whose tournament is gone", () => {
    const gone = playFirst(withId(started("round_robin", 4), "gone"), 1);
    const orphan = quickResult({ id: "orphan", awayTeamId: "deleted-team" });

    expect(recentResults([], [...gone.matches, orphan], roster)).toEqual([]);
  });
});
