import { describe, expect, it } from "vitest";
import {
  QUICK_MATCHES,
  filterLedger,
  historyItems,
  ledgerCsv,
  ledgerDays,
  ledgerFileName,
  ledgerFilterOptions,
  ledgerRows,
  type LedgerFilters,
} from "@/lib/history";
import type { Match, PersistentTeam } from "@/types/game";
import {
  NOW,
  OWNER,
  draftWorld,
  playThrough,
  run,
  playable,
  started,
  together,
  win,
  withId,
  withdraw,
  type World,
} from "../engine/helpers";

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

const HOUR = 3_600_000;

/** Complete a match, the given team winning, and stamp its result at `at`. */
const playAt = (world: World, matchId: string, winnerId: string, at: number): World => {
  const played = win(world, matchId, winnerId);
  return {
    ...played,
    matches: played.matches.map((m) => (m.id === matchId ? { ...m, completedAt: at } : m)),
  };
};

/** The first match a scorer could open, won by its home team at `at`. */
const playNext = (world: World, at: number): World => {
  const [next] = playable(world);
  return playAt(world, next.id, next.homeTeamId, at);
};

describe("historyItems", () => {
  it("lists completed tournaments and past quick matches newest first, each opening where it was played", () => {
    const older = withId(playThrough(started("round_robin", 4)), "older", {
      completedAt: NOW,
    });
    const newer = withId(playThrough(started("single_elimination", 4)), "newer", {
      completedAt: NOW + 2 * HOUR,
    });
    const quick = quickResult({ completedAt: NOW + HOUR });
    const live = withId(started("round_robin", 3), "live");
    const draft = withId(draftWorld("round_robin", 3), "draft");
    const { tournaments, matches } = together(older, newer, live, draft);

    const items = historyItems(tournaments, [...matches, quick], roster);

    expect(items.map((item) => [item.kind, item.href])).toEqual([
      ["tournament", "/competitions/newer"],
      ["quick_match", "/match/quick-1"],
      ["tournament", "/competitions/older"],
    ]);
  });

  it("labels an elimination tournament by its real format, with the teams entered, matches played, and winner as it showed them", () => {
    const single = withId(playThrough(started("single_elimination", 5)), "single");
    const double = withId(playThrough(started("double_elimination", 4)), "double", {
      completedAt: NOW + HOUR,
    });
    const { tournaments, matches } = together(single, double);

    const [fromDouble, fromSingle] = historyItems(tournaments, matches, roster);

    expect(fromDouble).toMatchObject({ kind: "tournament", format: "Double Elimination", entered: 4 });
    // Five teams need four matches to leave one standing; the byes are not matches played.
    expect(fromSingle).toMatchObject({
      kind: "tournament",
      format: "Single Elimination",
      entered: 5,
      played: 4,
    });
    // A completed tournament keeps the names it had, not the roster's names now.
    const winner = single.tournament.winnerId!;
    expect(fromSingle.kind === "tournament" && fromSingle.winner).toEqual(
      expect.objectContaining({ id: winner, name: `Team ${winner}` }),
    );
  });

  it("gives a rotation tournament the owner ended no winner", () => {
    const world = run(started("win2out", 5), { type: "end" });
    expect(world.tournament.status).toBe("completed");

    const [item] = historyItems([world.tournament], world.matches, roster);

    expect(item).toMatchObject({ format: "Win 2 & Out", played: 0, winner: null });
  });

  it("names a quick match's teams as the roster names them", () => {
    const [item] = historyItems([], [quickResult()], roster);

    expect(item.kind === "quick_match" && [item.home.name, item.away.name]).toEqual([
      "Roster t1",
      "Roster t2",
    ]);
  });

  it("leaves out a quick match left mid-way, and one whose team has left the roster, since its page cannot show it", () => {
    const midWay = quickResult({
      id: "mid-way",
      status: "in_progress",
      winnerId: undefined,
      completedAt: undefined,
    });
    const orphan = quickResult({ id: "orphan", awayTeamId: "deleted-team" });

    expect(historyItems([], [midWay, orphan], roster)).toEqual([]);
  });
});

describe("ledgerRows", () => {
  it("lists every result from live and completed tournaments and quick matches, newest first, leaving out byes", () => {
    const tonight = playNext(withId(started("round_robin", 4), "tonight"), NOW + 2 * HOUR);
    const bracket = playNext(withId(started("single_elimination", 5), "bracket"), NOW + HOUR);
    expect(bracket.matches.some((m) => m.isBye && m.status === "completed")).toBe(true);
    const quick = quickResult({ completedAt: NOW + 3 * HOUR });
    const { tournaments, matches } = together(tonight, bracket);

    const rows = ledgerRows(tournaments, [...matches, quick], roster);

    const [fromTonight] = tonight.matches.filter((m) => m.status === "completed");
    const [fromBracket] = bracket.matches.filter((m) => m.status === "completed" && !m.isBye);
    expect(rows.map((row) => row.match.id)).toEqual([quick.id, fromTonight.id, fromBracket.id]);
  });

  it("names each row's teams as the place it was played shows them, and opens that place", () => {
    const done = withId(playThrough(started("single_elimination", 4)), "done");
    const final = done.matches.find((m) => m.round === 2)!;
    const live = playNext(withId(started("round_robin", 4), "live"), NOW + HOUR);
    const quick = quickResult({ completedAt: NOW + 2 * HOUR });
    const doneFinal = { ...final, completedAt: NOW - HOUR };

    const rows = ledgerRows(
      [done.tournament, live.tournament],
      [doneFinal, ...live.matches, quick],
      roster,
    );

    const [fromQuick, fromLive, fromDone] = rows;
    expect(fromQuick).toMatchObject({ tournament: null, href: "/match/quick-1" });
    expect([fromQuick.home.name, fromQuick.away.name]).toEqual(["Roster t1", "Roster t2"]);
    expect(fromLive).toMatchObject({ tournament: { id: "live" }, href: "/competitions/live" });
    expect(fromLive.home.name).toBe(`Roster ${fromLive.match.homeTeamId}`);
    expect(fromDone).toMatchObject({ tournament: { id: "done" }, href: "/competitions/done" });
    expect(fromDone.home.name).toBe(`Team ${final.homeTeamId}`);
  });

  it("keeps forfeits, which the list of recent results on Home leaves out", () => {
    const world = withdraw(withId(started("round_robin", 4), "tonight"), "t4");

    const rows = ledgerRows([world.tournament], world.matches, roster);

    // t4 had three matches to play, one against each other team.
    expect(rows.filter((row) => row.match.forfeitedBy === "t4")).toHaveLength(3);
  });

  it("keeps a quick match whose team has left the roster, naming that team Deleted team, with nothing to open", () => {
    const [row] = ledgerRows([], [quickResult({ awayTeamId: "deleted-team" })], roster);

    expect(row.away.name).toBe("Deleted team");
    expect(row.href).toBeUndefined();
  });

  it("leaves out a match whose tournament is gone", () => {
    const gone = playNext(withId(started("round_robin", 4), "gone"), NOW);

    expect(ledgerRows([], gone.matches, roster)).toEqual([]);
  });
});

describe("filterLedger", () => {
  // Built from local dates, so the day each result lands on holds in any time zone.
  const JULY = new Date(2026, 6, 12, 19, 30).getTime();
  const JUNE = new Date(2026, 5, 3, 20, 0).getTime();

  const tonight = playNext(withId(started("round_robin", 4), "tonight", { name: "Tuesday Ladder" }), JULY);
  const quick = quickResult({ completedAt: JUNE });
  const rows = ledgerRows([tonight.tournament], [...tonight.matches, quick], roster);
  const [fromTonight, fromQuick] = rows;

  const ALL: LedgerFilters = { tournamentId: "", teamId: "", query: "" };
  const ids = (filters: Partial<LedgerFilters>) =>
    filterLedger(rows, { ...ALL, ...filters }).map((row) => row.match.id);

  it("keeps every row with no filter set", () => {
    expect(ids({})).toEqual([fromTonight.match.id, fromQuick.match.id]);
  });

  it("narrows to one tournament, or to the quick matches", () => {
    expect(ids({ tournamentId: "tonight" })).toEqual([fromTonight.match.id]);
    expect(ids({ tournamentId: QUICK_MATCHES })).toEqual([fromQuick.match.id]);
  });

  it("narrows to the matches one team played, home or away", () => {
    const { homeTeamId, awayTeamId } = fromTonight.match;
    expect(ids({ teamId: homeTeamId })).toContain(fromTonight.match.id);
    expect(ids({ teamId: awayTeamId })).toContain(fromTonight.match.id);
    expect(ids({ teamId: "t2" })).toContain(fromQuick.match.id);
    expect(ids({ teamId: "t5" })).toEqual([]);
  });

  it("searches team names, the tournament's name, and the day played, ignoring case", () => {
    expect(ids({ query: "tuesday ladder" })).toEqual([fromTonight.match.id]);
    expect(ids({ query: "quick" })).toEqual([fromQuick.match.id]);
    expect(ids({ query: "roster t2" })).toContain(fromQuick.match.id);
    expect(ids({ query: "July" })).toEqual([fromTonight.match.id]);
    expect(ids({ query: "june 3" })).toEqual([fromQuick.match.id]);
  });

  it("applies every filter together", () => {
    expect(ids({ tournamentId: QUICK_MATCHES, query: "july" })).toEqual([]);
  });
});

describe("ledgerFilterOptions", () => {
  it("offers each tournament with a result once, newest first, then the quick matches", () => {
    const older = playNext(withId(started("round_robin", 3), "older", { name: "Older" }), NOW);
    const newer = playNext(
      playNext(withId(started("round_robin", 4), "newer", { name: "Newer" }), NOW + HOUR),
      NOW + 3 * HOUR,
    );
    const quiet = withId(started("round_robin", 3), "quiet", { name: "Nothing played" });
    const quick = quickResult({ completedAt: NOW + 2 * HOUR });
    const { tournaments, matches } = together(older, newer, quiet);

    const options = ledgerFilterOptions(ledgerRows(tournaments, [...matches, quick], roster));

    expect(options.tournaments).toEqual([
      { id: "newer", name: "Newer" },
      { id: "older", name: "Older" },
      { id: QUICK_MATCHES, name: "Quick matches" },
    ]);
  });

  it("offers each team that played once, by name, named as its latest result names it", () => {
    const done = withId(playThrough(started("single_elimination", 2)), "done");
    const quick = quickResult({ homeTeamId: "t2", awayTeamId: "t3", completedAt: NOW + HOUR });

    const options = ledgerFilterOptions(ledgerRows([done.tournament], [...done.matches, quick], roster));

    // t2 was "Team t2" in the completed tournament and is "Roster t2" now.
    expect(options.teams).toEqual([
      { id: "t2", name: "Roster t2" },
      { id: "t3", name: "Roster t3" },
      { id: "t1", name: "Team t1" },
    ]);
  });

  it("leaves teams the roster no longer has out of the team filter, where each would read Deleted team", () => {
    const matches = [
      quickResult({ id: "a", awayTeamId: "gone-1" }),
      quickResult({ id: "b", awayTeamId: "gone-2" }),
    ];

    const options = ledgerFilterOptions(ledgerRows([], matches, roster));

    expect(options.teams).toEqual([{ id: "t1", name: "Roster t1" }]);
  });
});

describe("ledgerDays", () => {
  it("heads the rows by the local day they were played, newest day first", () => {
    const late = new Date(2026, 6, 11, 23, 30).getTime();
    const afterMidnight = new Date(2026, 6, 12, 0, 30).getTime();
    const evening = new Date(2026, 6, 12, 19, 0).getTime();
    const matches = [
      quickResult({ id: "late", completedAt: late }),
      quickResult({ id: "after-midnight", completedAt: afterMidnight }),
      quickResult({ id: "evening", completedAt: evening }),
    ];

    const days = ledgerDays(ledgerRows([], matches, roster));

    expect(days.map((day) => [day.label, day.rows.map((row) => row.match.id)])).toEqual([
      ["Sunday, July 12, 2026", ["evening", "after-midnight"]],
      ["Saturday, July 11, 2026", ["late"]],
    ]);
  });
});

describe("ledgerCsv", () => {
  const EVENING = new Date(2026, 6, 12, 19, 5).getTime();
  const HEADER =
    '"Date","Time","Tournament","Home","Away","Home Score","Away Score","Home Games","Away Games","Winner","Forfeited By"';
  const lines = (csv: string) => csv.split("\r\n");

  it("writes a header, then one line per row with the local date and time, where it was played, and the result", () => {
    const rows = ledgerRows([], [quickResult({ completedAt: EVENING })], roster);

    expect(lines(ledgerCsv(rows))).toEqual([
      HEADER,
      '"2026-07-12","19:05","Quick match","Roster t1","Roster t2","21","15","","","Roster t1",""',
    ]);
  });

  it("leaves a forfeit's score empty and names the team that forfeited", () => {
    const world = withdraw(withId(started("round_robin", 3), "tonight", { name: "Ladder" }), "t3");
    const rows = ledgerRows([world.tournament], world.matches, roster);
    const forfeit = rows.find((row) => row.match.forfeitedBy === "t3")!;

    const [, line] = lines(ledgerCsv([forfeit]));

    const cells = line.split(",").slice(2);
    expect(cells[0]).toBe('"Ladder"');
    expect(cells.slice(3, 7)).toEqual(['""', '""', '""', '""']);
    expect(cells.at(-1)).toBe('"Roster t3"');
  });

  it("gives a best-of's games won beside the deciding game's points", () => {
    const world = started("round_robin", 3, { seriesLength: 3 });
    const [first] = world.matches;
    const played = win(win(world, first.id, first.homeTeamId), first.id, first.homeTeamId);
    const rows = ledgerRows([played.tournament], played.matches, roster);

    const [, line] = lines(ledgerCsv(rows));

    // Won 2 games to 0; the deciding game went 25 to 20.
    expect(line.split(",").slice(5, 9)).toEqual(['"25"', '"20"', '"2"', '"0"']);
  });

  it("quotes every cell, and keeps a spreadsheet from running a team name as a formula", () => {
    const named: PersistentTeam[] = [
      { id: "t1", name: 'The "Aces", Tuesdays', createdAt: 0 },
      { id: "t2", name: '=HYPERLINK("x")', createdAt: 1 },
    ];
    const rows = ledgerRows([], [quickResult({ completedAt: EVENING })], named);

    const [, line] = lines(ledgerCsv(rows));

    expect(line).toContain(`"The ""Aces"", Tuesdays","'=HYPERLINK(""x"")"`);
  });
});

describe("ledgerFileName", () => {
  it("names the file for the local day it was exported", () => {
    expect(ledgerFileName(new Date(2026, 6, 12, 23, 59).getTime())).toBe("history-2026-07-12.csv");
  });
});
