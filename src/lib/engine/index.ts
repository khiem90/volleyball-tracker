import type { Match, MatchDraft, MatchProgress, Tournament } from "@/types/game";
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
import {
  canUndo,
  recordResult,
  applyUndo,
  type RotationStateLike,
} from "./rotation";
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
  | { type: "instant_win"; matchId: string; winnerId: string }
  | { type: "undo_result"; matchId: string }
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
  | "not_in_match"
  | "tie"
  | "unsupported_format"
  | "nothing_to_undo"
  | "court_moved_on";

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
    case "instant_win":
      instantWin(working, command);
      break;
    case "undo_result":
      undoResult(working, command);
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

  settle(working, completed, match);
};

/** The score an instant win records for the winner. The loser gets zero. */
const INSTANT_WIN_SCORE = 25;

/**
 * Instant win: the scorer taps the winner instead of entering points. The
 * result is recorded as a full-score win and settled like any other.
 */
const instantWin = (
  working: Working,
  command: Extract<EngineCommand, { type: "instant_win" }>,
) => {
  const match = working.matches.get(command.matchId);
  if (!match) {
    throw new EngineError("match_not_found", "That match is not in this tournament.");
  }
  if (command.winnerId !== match.homeTeamId && command.winnerId !== match.awayTeamId) {
    throw new EngineError("not_in_match", "That team is not playing this match.");
  }
  const homeWon = command.winnerId === match.homeTeamId;
  completeMatch(working, {
    type: "complete_match",
    matchId: command.matchId,
    homeScore: homeWon ? INSTANT_WIN_SCORE : 0,
    awayScore: homeWon ? 0 : INSTANT_WIN_SCORE,
  });
};

/**
 * After a result: schedule whatever comes next and finish the tournament if
 * its final has been played. `previous` is the match as it stood before the
 * result; the rotation formats keep it so the result can be undone.
 */
const settle = (working: Working, completed: Match, previous: MatchProgress) => {
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
      const before = tournament.win2outState;
      if (!before) return;
      const { updatedState, nextMatch } = processWin2OutResult(before, completed);
      const placed = nextMatch ? place(working, nextMatch) : null;
      working.tournament = {
        ...tournament,
        win2outState: recordResult(before, updatedState, completed, previous, placed),
      };
      return;
    }

    case "two_match_rotation": {
      const before = tournament.twoMatchRotationState;
      if (!before) return;
      const { updatedState, nextMatch } = processRotationResult(before, completed);
      const placed = nextMatch ? place(working, nextMatch) : null;
      working.tournament = {
        ...tournament,
        twoMatchRotationState: recordResult(before, updatedState, completed, previous, placed),
      };
      return;
    }
  }
};

// ============================================
// Undo result
// ============================================

/**
 * Take back the last result on a court in a rotation format. The match goes
 * back to how it stood, the match the result scheduled is removed, and the
 * teams the result moved go back where they were, leaving the other courts
 * alone. Refused once the court has moved on: its next match has points or a
 * result, or a team the result queued has since been pulled onto a court.
 */
const undoResult = (
  working: Working,
  command: Extract<EngineCommand, { type: "undo_result" }>,
) => {
  const { tournament } = working;
  if (tournament.status !== "live") {
    throw new EngineError("not_live", "Only a live tournament can undo a result.");
  }

  switch (tournament.format) {
    case "win2out": {
      if (!tournament.win2outState) throw nothingToUndo();
      const { state, record } = undoOn(working, tournament.win2outState, command.matchId);
      working.tournament = {
        ...tournament,
        win2outState: { ...state, currentChampionId: record.court.currentChampionId },
      };
      return;
    }
    case "two_match_rotation": {
      if (!tournament.twoMatchRotationState) throw nothingToUndo();
      const { state } = undoOn(working, tournament.twoMatchRotationState, command.matchId);
      working.tournament = { ...tournament, twoMatchRotationState: state };
      return;
    }
    default:
      throw new EngineError(
        "unsupported_format",
        "Only Win 2 & Out and Two Match Rotation results can be undone.",
      );
  }
};

const nothingToUndo = () =>
  new EngineError("nothing_to_undo", "That result can no longer be undone.");

/**
 * Find the court's record of the result, make sure the court has not moved
 * on, revert the state, and put the matches back.
 */
const undoOn = <State extends RotationStateLike>(
  working: Working,
  state: State,
  matchId: string,
): { state: State; record: NonNullable<State["undoRecords"]>[number] } => {
  const record = state.undoRecords?.find((r) => r.matchId === matchId);
  const match = working.matches.get(matchId);
  if (!record || !match || match.status !== "completed") throw nothingToUndo();

  const next = record.nextMatchId ? working.matches.get(record.nextMatchId) : undefined;
  const nextHasMovedOn =
    (record.nextMatchId !== undefined && !next) ||
    (next !== undefined &&
      (next.status === "completed" || next.homeScore > 0 || next.awayScore > 0));
  if (nextHasMovedOn || !canUndo(state, record, next)) {
    throw new EngineError(
      "court_moved_on",
      "That result cannot be undone any more: the court has moved on.",
    );
  }

  if (next) working.matches.delete(next.id);
  working.matches.set(match.id, {
    ...match,
    ...record.match,
    winnerId: undefined,
    completedAt: undefined,
  });

  return { state: applyUndo(state, record), record };
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
