import { describe, expect, it } from "vitest";
import { liveTournaments, recentResults } from "@/lib/home";
import { homeRsvpRows, type AccountNights, type AccountRsvp } from "@/lib/rsvp";
import type { Match, Notice, PersistentTeam, Rsvp, Tournament } from "@/types/game";
import {
  NOW,
  OWNER,
  draftWorld,
  openOn,
  playThrough,
  started,
  together,
  win,
  withId,
  withdraw,
  type World,
} from "../engine/helpers";

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

describe("homeRsvpRows", () => {
  const me = "me-uid";
  const friday = NOW + 3 * 86_400_000;

  /** A world's tournament as a night taking RSVPs, under its own id. */
  const night = (id: string, world: World, changes: Partial<Tournament> = {}): Tournament =>
    withId(world, id, {
      name: `Night ${id}`,
      scheduledAt: friday,
      scheduledZone: "America/New_York",
      rsvp: { enabled: true, capacity: 2, opensAt: NOW - 86_400_000, closed: false },
      ...changes,
    }).tournament;

  /** A server time `seconds` after NOW, to the nanosecond. */
  const at = (seconds: number, nanoseconds = 0) => ({
    seconds: NOW / 1000 + seconds,
    nanoseconds,
  });

  const rsvpBy = (uid: string, seconds: number, changes: Partial<Rsvp> = {}): Rsvp => ({
    id: uid,
    uid,
    name: uid,
    createdAt: at(seconds),
    ...changes,
  });

  const notice = (id: string, seconds: number, nanoseconds = 0): Notice => ({
    id,
    body: `Notice ${id}`,
    createdAt: at(seconds, nanoseconds),
  });

  /**
   * Home's view of the account's nights: each tournament with its whole
   * list and its notices, and the account's own RSVP picked out of each list.
   */
  const nights = (
    ...entries: { tournament: Tournament; list: Rsvp[]; notices?: Notice[] }[]
  ): AccountNights => ({
    mine: entries.flatMap(({ tournament, list }) =>
      list
        .filter((r) => r.uid === me)
        .map((r): AccountRsvp => ({ ...r, tournamentId: tournament.id })),
    ),
    tournaments: Object.fromEntries(entries.map((e) => [e.tournament.id, e.tournament])),
    lists: Object.fromEntries(entries.map((e) => [e.tournament.id, e.list])),
    notices: Object.fromEntries(
      entries.filter((e) => e.notices).map((e) => [e.tournament.id, e.notices!]),
    ),
  });

  it("lists a night the account is in with its name, scheduled time, standing, and the RSVP page", () => {
    const tournament = night("friday", draftWorld("round_robin", 4));

    const rows = homeRsvpRows(me, nights({ tournament, list: [rsvpBy("dan", 1), rsvpBy(me, 2)] }));

    expect(rows).toEqual([
      {
        tournament,
        standing: { kind: "confirmed", position: 2 },
        unread: false,
        href: "/competitions/friday/rsvp",
      },
    ]);
    expect(rows[0].tournament).toMatchObject({ name: "Night friday", scheduledAt: friday });
  });

  it("shows a waiting account its place on the waitlist, counting held spots and arrival ties as the list does", () => {
    const tournament = night("full", draftWorld("round_robin", 4));
    const heldSpot = { ...rsvpBy("held-1", 2), uid: null, held: true } as unknown as Rsvp;
    const list = [
      rsvpBy("dan", 1),
      heldSpot,
      rsvpBy("eve", 3),
      // Same instant as Eve: the id breaks the tie, and "eve" < "me-uid".
      rsvpBy(me, 3),
    ];

    const [row] = homeRsvpRows(me, nights({ tournament, list }));

    expect(row.standing).toEqual({ kind: "waitlisted", position: 2 });
  });

  it("keeps a live night, and leaves out a completed one", () => {
    const live = night("live", started("round_robin", 4));
    const done = night("done", playThrough(started("single_elimination", 4)));
    expect(done.status).toBe("completed");

    const rows = homeRsvpRows(
      me,
      nights({ tournament: live, list: [rsvpBy(me, 1)] }, { tournament: done, list: [rsvpBy(me, 1)] }),
    );

    expect(rows.map((row) => row.tournament.id)).toEqual(["live"]);
  });

  it("leaves out a night whose tournament cannot be read, whose link is off, or whose list has not arrived", () => {
    const refused = night("refused", draftWorld("round_robin", 4));
    const off = night("off", draftWorld("round_robin", 4), {
      rsvp: { enabled: false, capacity: 2, opensAt: NOW, closed: false },
    });
    const waiting = night("waiting", draftWorld("round_robin", 4));
    const world = nights(
      { tournament: refused, list: [rsvpBy(me, 1)] },
      { tournament: off, list: [rsvpBy(me, 1)] },
      { tournament: waiting, list: [rsvpBy(me, 1)] },
    );
    delete world.tournaments.refused;
    delete world.lists.waiting;

    expect(homeRsvpRows(me, world)).toEqual([]);
  });

  it("leaves out a night the account has withdrawn from, even while its list still shows the old RSVP", () => {
    const withdrawn = night("withdrawn", draftWorld("round_robin", 4));
    const stale = night("stale", draftWorld("round_robin", 4));
    const world = nights(
      { tournament: withdrawn, list: [rsvpBy("dan", 1)] },
      { tournament: stale, list: [rsvpBy(me, 1)] },
    );
    world.mine = [];

    expect(homeRsvpRows(me, world)).toEqual([]);
  });

  it("marks a notice posted after the account last opened the page, to the nanosecond", () => {
    const read = at(100, 500);
    const unread = (notices: Notice[] | undefined, noticesReadAt: Rsvp["noticesReadAt"] = read) => {
      const tournament = night("n", draftWorld("round_robin", 4));
      const [row] = homeRsvpRows(
        me,
        nights({ tournament, list: [rsvpBy(me, 1, { noticesReadAt })], notices }),
      );
      return row.unread;
    };

    expect(unread([notice("new", 100, 501), notice("old", 50)])).toBe(true);
    // Newest first is how they arrive, but any order reads the same.
    expect(unread([notice("old", 50), notice("new", 101)])).toBe(true);
    expect(unread([notice("seen", 100, 500)])).toBe(false);
    expect(unread([notice("old", 99, 999_999_999)])).toBe(false);
    expect(unread([])).toBe(false);
    // Notices that have not arrived yet mark nothing.
    expect(unread(undefined)).toBe(false);
  });

  it("marks any notice as new to an account that has never opened the page since RSVPing", () => {
    const tournament = night("n", draftWorld("round_robin", 4));

    const [row] = homeRsvpRows(
      me,
      nights({ tournament, list: [rsvpBy(me, 1)], notices: [notice("first", 0)] }),
    );

    expect(row.unread).toBe(true);
  });

  it("puts the soonest night first, and a night without a scheduled time last", () => {
    const later = night("later", draftWorld("round_robin", 4), { scheduledAt: friday + 86_400_000 });
    const sooner = night("sooner", draftWorld("round_robin", 4), { scheduledAt: friday });
    const unscheduled = night("unscheduled", draftWorld("round_robin", 4), { scheduledAt: undefined });

    const rows = homeRsvpRows(
      me,
      nights(
        { tournament: unscheduled, list: [rsvpBy(me, 1)] },
        { tournament: later, list: [rsvpBy(me, 1)] },
        { tournament: sooner, list: [rsvpBy(me, 1)] },
      ),
    );

    expect(rows.map((row) => row.tournament.id)).toEqual(["sooner", "later", "unscheduled"]);
  });
});
