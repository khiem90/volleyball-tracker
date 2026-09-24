import { applyCommand, type EngineCommand } from "@/lib/engine";
import { applyMatchWrites } from "@/lib/engine/writes";
import {
  DEFAULT_POINTS_FOR_LOSS,
  DEFAULT_POINTS_FOR_WIN,
  DEFAULT_TERMINOLOGY,
} from "@/types/competition-config";
import type {
  Match,
  Tournament,
  TournamentFormat,
  TournamentSettings,
} from "@/types/game";

export const OWNER = "owner-uid";
export const NOW = 1_700_000_000_000;

export const teamIds = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `t${i + 1}`);

export const defaultSettings = (
  overrides: Partial<TournamentSettings> = {},
): TournamentSettings => ({
  courts: 1,
  seriesLength: 1,
  instantWin: false,
  pointsForWin: DEFAULT_POINTS_FOR_WIN,
  pointsForLoss: DEFAULT_POINTS_FOR_LOSS,
  terminology: DEFAULT_TERMINOLOGY,
  ...overrides,
});

/** A tournament and its matches, as the engine sees them. */
export interface World {
  tournament: Tournament;
  matches: Match[];
}

export const draftWorld = (
  format: TournamentFormat,
  teamCount: number,
  settings: Partial<TournamentSettings> = {},
): World => {
  const ids = teamIds(teamCount);
  return {
    tournament: {
      id: "tournament-1",
      ownerId: OWNER,
      name: "Test night",
      format,
      status: "draft",
      entries: ids.map((teamId) => ({ teamId, name: `Team ${teamId}`, color: "#3b82f6" })),
      teamIds: ids,
      settings: defaultSettings(settings),
      spectatorEnabled: false,
      revision: "r0",
      createdAt: NOW,
      updatedAt: NOW,
    },
    matches: [],
  };
};

let nextId = 0;
const newId = () => `m${++nextId}`;

/** Apply one command and fold its writes back into the world. */
export const run = (world: World, command: EngineCommand): World => {
  const result = applyCommand(world, command, { now: NOW, newId });
  return {
    tournament: result.tournament,
    matches: applyMatchWrites(world.matches, result.matchWrites),
  };
};

export const started = (
  format: TournamentFormat,
  teamCount: number,
  settings: Partial<TournamentSettings> = {},
): World => run(draftWorld(format, teamCount, settings), { type: "start" });

/** Matches a scorer could open: pending or live, with both teams known. */
export const playable = (world: World): Match[] =>
  world.matches.filter(
    (m) => m.status !== "completed" && m.homeTeamId !== "" && m.awayTeamId !== "",
  );

export const find = (world: World, where: Partial<Match>): Match => {
  const match = world.matches.find((m) =>
    Object.entries(where).every(([key, value]) => m[key as keyof Match] === value),
  );
  if (!match) throw new Error(`No match matches ${JSON.stringify(where)}`);
  return match;
};

/** Complete a match with the given winner; the loser gets one point fewer. */
export const win = (world: World, matchId: string, winnerId: string): World => {
  const match = world.matches.find((m) => m.id === matchId);
  if (!match) throw new Error(`No match ${matchId}`);
  const homeWins = match.homeTeamId === winnerId;
  return run(world, {
    type: "complete_match",
    matchId,
    homeScore: homeWins ? 25 : 20,
    awayScore: homeWins ? 20 : 25,
  });
};

/**
 * Keep completing playable matches until none remain. `pickWinner` chooses
 * the winner of each; by default the home team wins. `pickMatch` chooses
 * which playable match is played next; by default the first in the list.
 */
export const playThrough = (
  world: World,
  pickWinner: (match: Match) => string = (m) => m.homeTeamId,
  pickMatch: (open: Match[]) => Match = (open) => open[0],
): World => {
  let current = world;
  for (let guard = 0; guard < 500; guard++) {
    const open = playable(current);
    if (open.length === 0) return current;
    const next = pickMatch(open);
    current = win(current, next.id, pickWinner(next));
  }
  throw new Error("playThrough did not finish");
};
