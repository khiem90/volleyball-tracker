import type { Match, MatchDraft, Tournament } from "@/types/game";
import { calculateStandings, generateRoundRobinSchedule } from "@/lib/roundRobin";
import { generateSingleEliminationBracket } from "@/lib/singleElimination";
import { generateDoubleEliminationBracket } from "@/lib/doubleElimination";
import {
  generateInitialMatches as win2outInitialMatches,
  initializeWin2OutState,
  processMatchResult as processWin2OutResult,
} from "@/lib/win2out";
import {
  generateInitialMatches as rotationInitialMatches,
  initializeTwoMatchRotationState,
  processMatchResult as processRotationResult,
} from "@/lib/twoMatchRotation";
import { formatLabel, isBracketFormat, isRotationFormat, minimumTeams } from "@/lib/formats";
import { advance, bracketChampion, resolveByes } from "./brackets";
import { diffMatchWrites, type MatchWrite } from "./writes";

export type { MatchWrite } from "./writes";

/**
 * The tournament engine. A command plus the current tournament and its matches
 * produce the next tournament and the match writes to apply. Nothing in here
 * touches the database, so every format rule can be tested with plain values.
 */

export type EngineCommand =
  | { type: "start"; byeTeamIds?: string[] }
  | {
      type: "complete_match";
      matchId: string;
      homeScore: number;
      awayScore: number;
    }
  | { type: "end" };

export interface EngineContext {
  tournament: Tournament;
  matches: Match[];
}

export interface EngineOptions {
  /** The moment the command is applied; stamps startedAt, completedAt, createdAt. */
  now: number;
  /** Produces the id for each match the engine creates. */
  newId: () => string;
}

export interface EngineResult {
  tournament: Tournament;
  matchWrites: MatchWrite[];
}

export type EngineErrorCode =
  | "not_draft"
  | "not_live"
  | "too_few_teams"
  | "match_not_found"
  | "match_completed"
  | "match_not_ready"
  | "tie";

export class EngineError extends Error {
  readonly code: EngineErrorCode;

  constructor(code: EngineErrorCode, message: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }
}

/** The engine's scratch space: the tournament and a mutable copy of its matches. */
interface Working {
  tournament: Tournament;
  matches: Map<string, Match>;
  options: EngineOptions;
}

export const applyCommand = (
  context: EngineContext,
  command: EngineCommand,
  options: EngineOptions,
): EngineResult => {
  const working: Working = {
    tournament: { ...context.tournament },
    matches: new Map(context.matches.map((m) => [m.id, { ...m }])),
    options,
  };

  switch (command.type) {
    case "start":
      start(working, command.byeTeamIds);
      break;
    case "complete_match":
      completeMatch(working, command);
      break;
    case "end":
      end(working);
      break;
  }

  return {
    tournament: working.tournament,
    matchWrites: diffMatchWrites(context.matches, working.matches),
  };
};

// ============================================
// Start
// ============================================

const start = (working: Working, byeTeamIds?: string[]) => {
  const { tournament, options } = working;
  if (tournament.status !== "draft") {
    throw new EngineError("not_draft", "Only a draft tournament can be started.");
  }
  const teamIds = activeTeamIds(tournament);
  const minimum = minimumTeams(tournament.format, tournament.settings.courts);
  if (teamIds.length < minimum) {
    throw new EngineError(
      "too_few_teams",
      `${formatLabel(tournament.format)} needs at least ${minimum} teams.`,
    );
  }

  let drafts: MatchDraft[];
  let next: Tournament = { ...tournament, status: "live", startedAt: options.now };

  switch (tournament.format) {
    case "round_robin":
      drafts = generateRoundRobinSchedule(teamIds);
      break;
    case "single_elimination":
      drafts = generateSingleEliminationBracket(teamIds, byeTeamIds);
      break;
    case "double_elimination":
      drafts = generateDoubleEliminationBracket(teamIds, byeTeamIds);
      break;
    case "win2out":
      next = { ...next, win2outState: initializeWin2OutState(teamIds, tournament.settings.courts) };
      drafts = win2outInitialMatches(teamIds, tournament.settings.courts);
      break;
    case "two_match_rotation":
      next = {
        ...next,
        twoMatchRotationState: initializeTwoMatchRotationState(teamIds, tournament.settings.courts),
      };
      drafts = rotationInitialMatches(teamIds, tournament.settings.courts);
      break;
  }

  for (const draft of withSeries(drafts, tournament)) place(working, draft);
  working.tournament = next;

  if (isBracketFormat(tournament.format)) {
    resolveByes(working.matches, options.now);
    finishIfDecided(working);
  }
};

// ============================================
// Complete match
// ============================================

const completeMatch = (
  working: Working,
  command: Extract<EngineCommand, { type: "complete_match" }>,
) => {
  const { tournament, options } = working;
  if (tournament.status !== "live") {
    throw new EngineError("not_live", "Only a live tournament can record results.");
  }
  const match = working.matches.get(command.matchId);
  if (!match) {
    throw new EngineError("match_not_found", "That match is not in this tournament.");
  }
  if (match.status === "completed") {
    throw new EngineError("match_completed", "That match has already been completed.");
  }
  if (!match.homeTeamId || !match.awayTeamId) {
    throw new EngineError("match_not_ready", "Both teams must be known before a match can end.");
  }
  if (command.homeScore === command.awayScore) {
    throw new EngineError("tie", "A match cannot end in a tie.");
  }

  const gameWinnerId = command.homeScore > command.awayScore ? match.homeTeamId : match.awayTeamId;

  // A best-of series only ends once one side has the games it needs.
  const seriesLength = match.seriesLength ?? 1;
  if (seriesLength > 1) {
    const homeWins = (match.homeWins ?? 0) + (gameWinnerId === match.homeTeamId ? 1 : 0);
    const awayWins = (match.awayWins ?? 0) + (gameWinnerId === match.awayTeamId ? 1 : 0);
    const winsNeeded = Math.ceil(seriesLength / 2);
    if (homeWins < winsNeeded && awayWins < winsNeeded) {
      working.matches.set(match.id, {
        ...match,
        status: "in_progress",
        homeWins,
        awayWins,
        seriesGame: (match.seriesGame ?? 1) + 1,
        homeScore: 0,
        awayScore: 0,
      });
      return;
    }
    match.homeWins = homeWins;
    match.awayWins = awayWins;
  }

  const completed: Match = {
    ...match,
    status: "completed",
    winnerId: gameWinnerId,
    homeScore: command.homeScore,
    awayScore: command.awayScore,
    completedAt: options.now,
  };
  working.matches.set(match.id, completed);

  settle(working, completed);
};

/**
 * After a result: schedule whatever comes next and finish the tournament if
 * its final has been played.
 */
const settle = (working: Working, completed: Match) => {
  const { tournament, options } = working;

  switch (tournament.format) {
    case "round_robin":
      finishIfDecided(working);
      return;

    case "single_elimination":
    case "double_elimination":
      advance(working.matches, completed);
      resolveByes(working.matches, options.now);
      finishIfDecided(working);
      return;

    case "win2out": {
      if (!tournament.win2outState) return;
      const { updatedState, nextMatch } = processWin2OutResult(tournament.win2outState, completed);
      working.tournament = { ...tournament, win2outState: updatedState };
      if (nextMatch) place(working, nextMatch);
      return;
    }

    case "two_match_rotation": {
      if (!tournament.twoMatchRotationState) return;
      const { updatedState, nextMatch } = processRotationResult(
        tournament.twoMatchRotationState,
        completed,
      );
      working.tournament = { ...tournament, twoMatchRotationState: updatedState };
      if (nextMatch) place(working, nextMatch);
      return;
    }
  }
};

/**
 * Round robin ends when every match has, with the standings leader as winner.
 * A bracket ends when its final has been played. Rotation formats only end
 * through the End command.
 */
const finishIfDecided = (working: Working) => {
  const { tournament, options } = working;
  const matches = [...working.matches.values()];

  let winnerId: string | undefined;
  if (tournament.format === "round_robin") {
    if (!matches.every((m) => m.status === "completed")) return;
    winnerId = calculateStandings(activeTeamIds(tournament), matches, tournament.settings)[0]?.teamId;
  } else if (isBracketFormat(tournament.format)) {
    winnerId = bracketChampion(matches);
    if (!winnerId) return;
  } else {
    return;
  }

  working.tournament = {
    ...tournament,
    status: "completed",
    completedAt: options.now,
    ...(winnerId ? { winnerId } : {}),
  };
};

// ============================================
// End
// ============================================

/** The owner's End: the tournament is over as it stands. */
const end = (working: Working) => {
  const { tournament, options } = working;
  if (tournament.status !== "live") {
    throw new EngineError("not_live", "Only a live tournament can be ended.");
  }
  working.tournament = { ...tournament, status: "completed", completedAt: options.now };
};

// ============================================
// Helpers
// ============================================

const activeTeamIds = (tournament: Tournament): string[] =>
  tournament.entries.filter((e) => !e.withdrawnAt).map((e) => e.teamId);

/** Give every played match the series fields when the tournament is a best-of. */
const withSeries = (drafts: MatchDraft[], tournament: Tournament): MatchDraft[] => {
  const { seriesLength } = tournament.settings;
  if (seriesLength <= 1 || isRotationFormat(tournament.format)) return drafts;
  return drafts.map((draft) =>
    draft.isBye ? draft : { ...draft, seriesLength, homeWins: 0, awayWins: 0, seriesGame: 1 },
  );
};

const place = (working: Working, draft: MatchDraft): Match => {
  const match: Match = {
    ...draft,
    id: working.options.newId(),
    ownerId: working.tournament.ownerId,
    tournamentId: working.tournament.id,
    createdAt: working.options.now,
  };
  working.matches.set(match.id, match);
  return match;
};
