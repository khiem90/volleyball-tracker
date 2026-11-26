// @vitest-environment node
import { describe, expect, it } from "vitest";
import { matchLine } from "@/lib/scoreLine";
import type { Match } from "@/types/game";

const match = (over: Partial<Match>): Match => ({
  id: "m1",
  ownerId: "owner",
  tournamentId: "t1",
  homeTeamId: "reds",
  awayTeamId: "blues",
  homeScore: 0,
  awayScore: 0,
  status: "pending",
  round: 1,
  position: 1,
  createdAt: 0,
  ...over,
});

describe("what a match shows on its score line", () => {
  it("is both scores and the winner once the match is completed", () => {
    expect(
      matchLine(match({ status: "completed", homeScore: 18, awayScore: 21, winnerId: "blues" })),
    ).toEqual({ homeScore: 18, awayScore: 21, winner: "away", decidedBy: null, live: false });
  });

  /* A match holds 0 and 0 from the moment it is made, and those are not a score yet. */
  it("is no score while the match is waiting to be played", () => {
    expect(matchLine(match({ status: "pending" }))).toEqual({
      homeScore: null,
      awayScore: null,
      winner: null,
      decidedBy: null,
      live: false,
    });
  });

  /* The side ahead is bold through boldSide, so a match in play names no winner. */
  it("is the running score, marked live, while the match is in play", () => {
    expect(matchLine(match({ status: "in_progress", homeScore: 7, awayScore: 5 }))).toEqual({
      homeScore: 7,
      awayScore: 5,
      winner: null,
      decidedBy: null,
      live: true,
    });
  });

  it("is the winner with no score when a team forfeited", () => {
    expect(
      matchLine(match({ status: "completed", winnerId: "reds", forfeitedBy: "blues" })),
    ).toEqual({ homeScore: null, awayScore: null, winner: "home", decidedBy: "forfeit", live: false });
  });

  /* Nobody lost a bye, so neither side is dimmed. */
  it("is a bye with no score and no winner when a bye decided it", () => {
    expect(
      matchLine(match({ status: "completed", awayTeamId: "", winnerId: "reds", isBye: true })),
    ).toEqual({ homeScore: null, awayScore: null, winner: null, decidedBy: "bye", live: false });
  });
});
