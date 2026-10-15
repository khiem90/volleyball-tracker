import { ReversedCommandError } from "@/lib/commandErrors";
import { EngineError } from "@/lib/engine";
import type { UndoEntry } from "@/types/undo";

/**
 * Generate a unique ID for undo entries
 */
export const generateUndoId = (): string => {
  return `undo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

/** The stack without the entries for one result. */
const withoutResult = (stack: UndoEntry[], tournamentId: string, matchId: string): UndoEntry[] =>
  stack.filter((entry) => !(entry.tournamentId === tournamentId && entry.matchId === matchId));

/**
 * The stack once a result's write has failed, whatever the failure: the
 * server took the result back because another scorer got to its court
 * first, the rules refused it, the scorer link had gone stale, or the
 * write was dropped. In every case the result has been rolled back on
 * this phone and no longer exists, so its entry goes: nobody is offered
 * an undo of it.
 */
export const stackAfterFailure = (
  stack: UndoEntry[],
  tournamentId: string,
  matchId: string,
): UndoEntry[] => withoutResult(stack, tournamentId, matchId);

/**
 * Whether an undo is over and done with, whatever the toast heard back:
 * nothing (it applied), the engine's refusal because the court has moved
 * on, or a reversal because the win it was queued behind was taken back.
 * None of those can apply later. Any other failure can.
 */
const undoSpent = (error: unknown): boolean =>
  error === null || error instanceof EngineError || error instanceof ReversedCommandError;

/**
 * The stack once an undo of `entry` has been applied on this phone
 * (`error` null) or failed with `error`. A spent undo takes its entry
 * with it; one that can be tried again leaves it.
 */
export const stackAfterUndo = (stack: UndoEntry[], entry: UndoEntry, error: unknown): UndoEntry[] =>
  undoSpent(error) ? stack.filter((candidate) => candidate.id !== entry.id) : stack;
