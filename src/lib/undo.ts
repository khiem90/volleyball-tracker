import { ReversedCommandError } from "@/lib/commandQueue";
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
 * The stack once a result's write has failed. A result the server took
 * back, because another scorer got to its court first, no longer exists,
 * so its entry goes: nobody is offered an undo of it. Any other failure
 * leaves the result in place on this phone, and its entry with it.
 */
export const stackAfterFailure = (
  stack: UndoEntry[],
  tournamentId: string,
  matchId: string,
  error: unknown,
): UndoEntry[] =>
  error instanceof ReversedCommandError ? withoutResult(stack, tournamentId, matchId) : stack;

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
