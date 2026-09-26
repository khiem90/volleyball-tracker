import { describe, expect, it } from "vitest";
import {
  afterSnapshot,
  backHref,
  backLabel,
  blockMessage,
  canComplete,
  fullscreenSupported,
  keepsScreenAwake,
  latestScore,
  scoringAccess,
  seriesInfo,
  statusLabel,
  tapped,
  winnerSide,
} from "@/lib/scoring";
import type { Match } from "@/types/game";
import { find, playable, run, started, win, type World } from "../engine/helpers";

/** A quick match: no tournament, two roster teams. */
const quickMatch = (overrides: Partial<Match> = {}): Match => ({
  id: "q1",
  ownerId: "owner-uid",
  tournamentId: null,
  homeTeamId: "t1",
  awayTeamId: "t2",
  homeScore: 0,
  awayScore: 0,
  status: "in_progress",
  round: 1,
  position: 1,
  createdAt: 1,
  ...overrides,
});

const liveRoundRobin = (): { world: World; match: Match } => {
  const world = started("round_robin", 4);
  return { world, match: playable(world)[0] };
};

const completedRoundRobin = (): { world: World; match: Match } => {
  const { world: before, match } = liveRoundRobin();
  const world = win(before, match.id, match.homeTeamId);
  return { world, match: find(world, { id: match.id }) };
};

/** A Win 2 & Out its owner has ended, which leaves the court's next match pending. */
const completedRotation = (): { world: World; match: Match } => {
  const world = run(started("win2out", 4), { type: "end" });
  return { world, match: find(world, { status: "pending" }) };
};

describe("scoringAccess", () => {
  it("lets the owner score a playable match of a live tournament", () => {
    const { world, match } = liveRoundRobin();
    expect(scoringAccess("owner", match, world.tournament)).toEqual({ canScore: true });
  });

  it("lets a scorer score it too", () => {
    const { world, match } = liveRoundRobin();
    expect(scoringAccess("scorer", match, world.tournament)).toEqual({ canScore: true });
  });

  it("only lets a spectator watch", () => {
    const { world, match } = liveRoundRobin();
    expect(scoringAccess("spectator", match, world.tournament)).toEqual({
      canScore: false,
      reason: "watch_only",
    });
  });

  it("refuses a completed match, whoever asks", () => {
    const { world, match } = completedRoundRobin();
    expect(scoringAccess("owner", match, world.tournament)).toEqual({
      canScore: false,
      reason: "match_completed",
    });
    expect(scoringAccess("spectator", match, world.tournament)).toEqual({
      canScore: false,
      reason: "match_completed",
    });
  });

  it("refuses the pending match a court was left with when the tournament was completed", () => {
    const { world, match } = completedRotation();
    expect(world.tournament.status).toBe("completed");
    expect(scoringAccess("owner", match, world.tournament)).toEqual({
      canScore: false,
      reason: "tournament_completed",
    });
  });

  it("refuses a bracket match still waiting for a team, so opening its page starts nothing", () => {
    const world = started("single_elimination", 4);
    const final = find(world, { round: 2 });
    expect(final.homeTeamId).toBe("");
    expect(scoringAccess("owner", final, world.tournament)).toEqual({
      canScore: false,
      reason: "not_ready",
    });
  });

  it("lets a signed-in account score its own quick match", () => {
    expect(scoringAccess("owner", quickMatch(), null)).toEqual({ canScore: true });
  });

  it("refuses a completed quick match and a quick match someone only watches", () => {
    expect(scoringAccess("owner", quickMatch({ status: "completed" }), null)).toEqual({
      canScore: false,
      reason: "match_completed",
    });
    expect(scoringAccess("spectator", quickMatch(), null)).toEqual({
      canScore: false,
      reason: "watch_only",
    });
  });
});

describe("blockMessage", () => {
  it("says a tournament match is over and where its result can be corrected", () => {
    expect(blockMessage("match_completed", "tournament")).toBe(
      "This match is over, so taps here do nothing. The owner can correct its result from the console's Schedule tab.",
    );
  });

  it("says a quick match is over and where its result went", () => {
    expect(blockMessage("match_completed", "quick")).toBe(
      "This match is over, so taps here do nothing. Its result is in your history.",
    );
  });

  it("tells a guest to play again", () => {
    expect(blockMessage("match_completed", "guest")).toBe(
      "This match is over, so taps here do nothing. Play again to start a fresh one.",
    );
  });

  it("says the tournament is completed", () => {
    expect(blockMessage("tournament_completed", "tournament")).toBe(
      "This tournament is completed, so this match cannot be scored.",
    );
  });

  it("says a bracket slot is still waiting for its teams", () => {
    expect(blockMessage("not_ready", "tournament")).toBe(
      "This match is waiting for its teams, so it cannot be scored yet.",
    );
  });

  it("says the visitor can only watch", () => {
    expect(blockMessage("watch_only", "tournament")).toBe(
      "You can watch this match, but only a scorer can change the score.",
    );
  });
});

describe("backHref and backLabel", () => {
  it("returns a tournament match to its console", () => {
    const { match } = liveRoundRobin();
    expect(backHref(match)).toBe("/competitions/tournament-1");
    expect(backLabel(match)).toBe("Console");
  });

  it("returns a quick match to the Quick page", () => {
    expect(backHref(quickMatch())).toBe("/quick-match");
    expect(backLabel(quickMatch())).toBe("Quick match");
  });
});

describe("statusLabel", () => {
  it("says Completed once the match is over, Live while it is played, and Not started before", () => {
    expect(statusLabel(completedRoundRobin().match)).toBe("Completed");
    expect(statusLabel(quickMatch({ status: "in_progress" }))).toBe("Live");
    expect(statusLabel(quickMatch({ status: "pending" }))).toBe("Not started");
  });
});

describe("winnerSide", () => {
  it("names the side that won, and nobody before there is a winner", () => {
    const { match } = completedRoundRobin();
    expect(match.winnerId).toBe(match.homeTeamId);
    expect(winnerSide(match)).toBe("home");
    expect(winnerSide({ ...match, winnerId: match.awayTeamId })).toBe("away");
    expect(winnerSide(liveRoundRobin().match)).toBeNull();
  });
});

describe("seriesInfo", () => {
  it("treats a single-game match as game one of one", () => {
    const { match } = liveRoundRobin();
    expect(seriesInfo(match)).toEqual({
      isSeries: false,
      seriesLength: 1,
      homeWins: 0,
      awayWins: 0,
      winsNeeded: 1,
      gameNumber: 1,
    });
  });

  it("counts the games of a best-of and names the one being played", () => {
    const world = started("round_robin", 3, { seriesLength: 3 });
    const first = playable(world)[0];
    const afterOne = win(world, first.id, first.homeTeamId);
    const match = find(afterOne, { id: first.id });
    expect(match.status).toBe("in_progress");
    expect(seriesInfo(match)).toEqual({
      isSeries: true,
      seriesLength: 3,
      homeWins: 1,
      awayWins: 0,
      winsNeeded: 2,
      gameNumber: 2,
    });
  });

  it("names the last game once a best-of is decided", () => {
    const world = started("round_robin", 3, { seriesLength: 3 });
    const first = playable(world)[0];
    const decided = win(win(world, first.id, first.homeTeamId), first.id, first.homeTeamId);
    const match = find(decided, { id: first.id });
    expect(match.status).toBe("completed");
    expect(seriesInfo(match).gameNumber).toBe(2);
  });
});

describe("canComplete", () => {
  it("needs a scorer and a score that is not tied", () => {
    expect(canComplete({ home: 3, away: 1 }, { canScore: true })).toBe(true);
    expect(canComplete({ home: 2, away: 2 }, { canScore: true })).toBe(false);
    expect(canComplete({ home: 3, away: 1 }, { canScore: false, reason: "watch_only" })).toBe(
      false,
    );
  });
});

describe("taps that have not come back yet", () => {
  const one = { home: 1, away: 0 };
  const two = { home: 2, away: 0 };

  it("builds the next tap on the last write, or on the snapshot when nothing is pending", () => {
    expect(latestScore([], { home: 5, away: 3 })).toEqual({ home: 5, away: 3 });
    expect(latestScore([one, two], { home: 0, away: 0 })).toEqual(two);
  });

  it("drops the writes up to the one the snapshot shows", () => {
    expect(afterSnapshot([one, two], one)).toEqual([two]);
    expect(afterSnapshot([one, two], two)).toEqual([]);
  });

  it("drops every write when the snapshot is another device's, so the next tap builds on it", () => {
    expect(afterSnapshot([one, two], { home: 7, away: 0 })).toEqual([]);
  });

  it("adds a point to one side, or takes one off it and never below zero", () => {
    expect(tapped(one, "away", 1)).toEqual({ home: 1, away: 1 });
    expect(tapped(one, "home", -1)).toEqual({ home: 0, away: 0 });
    expect(tapped(one, "away", -1)).toEqual(one);
  });
});

describe("fullscreenSupported", () => {
  const request = () => Promise.resolve();

  it("is true when the standard API is there", () => {
    expect(
      fullscreenSupported({ fullscreenEnabled: true, documentElement: { requestFullscreen: request } }),
    ).toBe(true);
  });

  it("is true when only the webkit-prefixed API is there, as on an iPad", () => {
    expect(
      fullscreenSupported({
        webkitFullscreenEnabled: true,
        documentElement: { webkitRequestFullscreen: request },
      }),
    ).toBe(true);
  });

  it("is false on an iPhone, which has neither, and when the API says it is off", () => {
    expect(fullscreenSupported({ documentElement: {} })).toBe(false);
    expect(
      fullscreenSupported({
        fullscreenEnabled: false,
        documentElement: { requestFullscreen: request },
      }),
    ).toBe(false);
    expect(fullscreenSupported({ fullscreenEnabled: true, documentElement: {} })).toBe(false);
  });
});

describe("keepsScreenAwake", () => {
  it("holds the screen while the match is still to be played and lets go once it is over", () => {
    expect(keepsScreenAwake(quickMatch({ status: "pending" }))).toBe(true);
    expect(keepsScreenAwake(quickMatch({ status: "in_progress" }))).toBe(true);
    expect(keepsScreenAwake(quickMatch({ status: "completed" }))).toBe(false);
  });
});
