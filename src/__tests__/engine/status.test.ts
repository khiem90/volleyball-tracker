import { describe, expect, it } from "vitest";
import type { TournamentFormat } from "@/types/game";
import { draftWorld, NOW, playable, playThrough, run, started, win, type World } from "./helpers";

const FORMATS: TournamentFormat[] = [
  "round_robin",
  "single_elimination",
  "double_elimination",
  "win2out",
  "two_match_rotation",
];

/** A live tournament with one result recorded, so ending it has something to freeze. */
const liveWithOneResult = (format: TournamentFormat): World => {
  const live = started(format, 4);
  const first = playable(live)[0];
  return win(live, first.id, first.homeTeamId);
};

describe.each(FORMATS)("%s status", (format) => {
  it("is a draft until start, live until end, then completed", () => {
    const draft = draftWorld(format, 4);
    expect(draft.tournament.status).toBe("draft");
    expect(draft.tournament.startedAt).toBeUndefined();

    const live = run(draft, { type: "start" });
    expect(live.tournament.status).toBe("live");
    expect(live.tournament.startedAt).toBe(NOW);
    expect(live.tournament.completedAt).toBeUndefined();

    const ended = run(live, { type: "end" });
    expect(ended.tournament.status).toBe("completed");
    expect(ended.tournament.completedAt).toBe(NOW);
  });

  it("end leaves every match, including one in progress, and the standings as they stand", () => {
    const live = liveWithOneResult(format);
    const open = playable(live).find((m) => m.status === "pending");
    if (!open) throw new Error("expected a pending match");
    // A match mid-play, as the scoring page leaves it: points on the board, no result.
    const scoring: World = {
      ...live,
      matches: live.matches.map((m) =>
        m.id === open.id ? { ...m, status: "in_progress", homeScore: 7, awayScore: 5 } : m,
      ),
    };

    const ended = run(scoring, { type: "end" });

    expect(ended.matches).toEqual(scoring.matches);
    expect(ended.tournament).toEqual({
      ...scoring.tournament,
      status: "completed",
      completedAt: NOW,
    });
  });

  it("refuses to start again once live or completed, and to end a draft or a completed tournament", () => {
    const draft = draftWorld(format, 4);
    const live = run(draft, { type: "start" });
    const ended = run(live, { type: "end" });

    expect(() => run(live, { type: "start" })).toThrow(/draft/);
    expect(() => run(ended, { type: "start" })).toThrow(/draft/);
    expect(() => run(draft, { type: "end" })).toThrow(/live/);
    expect(() => run(ended, { type: "end" })).toThrow(/live/);
  });

  it("refuses results, instant wins, and undo once completed", () => {
    const ended = run(liveWithOneResult(format), { type: "end" });
    const open = playable(ended)[0];
    const played = ended.matches.find((m) => m.status === "completed");
    if (!played) throw new Error("expected a completed match");

    expect(() => win(ended, open.id, open.homeTeamId)).toThrow(/live/);
    expect(() =>
      run(ended, { type: "instant_win", matchId: open.id, winnerId: open.homeTeamId }),
    ).toThrow(/live/);
    expect(() => run(ended, { type: "undo_result", matchId: played.id })).toThrow(/live/);
  });
});

describe("how a tournament completes", () => {
  it.each(["round_robin", "single_elimination", "double_elimination"] as TournamentFormat[])(
    "%s completes on its own when its last match is played, and cannot be ended after",
    (format) => {
      const done = playThrough(started(format, 4));

      expect(done.tournament.status).toBe("completed");
      expect(done.tournament.completedAt).toBe(NOW);
      expect(done.tournament.winnerId).toBe("t1");
      expect(() => run(done, { type: "end" })).toThrow(/live/);
    },
  );

  it.each(["win2out", "two_match_rotation"] as TournamentFormat[])(
    "%s stays live however many results are recorded; only end finishes it",
    (format) => {
      let world = started(format, 5, { courts: 2 });
      for (let i = 0; i < 40; i++) {
        const open = playable(world)[0];
        world = win(world, open.id, i % 2 === 0 ? open.homeTeamId : open.awayTeamId);
      }

      expect(world.tournament.status).toBe("live");
      expect(world.matches.filter((m) => m.status === "completed")).toHaveLength(40);

      const ended = run(world, { type: "end" });
      expect(ended.tournament.status).toBe("completed");
      expect(ended.matches).toEqual(world.matches);
    },
  );
});
