import type { Match, Competition } from "@/types/game";

/**
 * Maximum number of undo entries to keep in the stack
 */
export const MAX_UNDO_STACK_SIZE = 5;

/**
 * Types of actions that can be undone in competition mode
 */
export type UndoActionType = "instant_win" | "match_complete" | "match_start";

/**
 * Snapshot of state before an undoable action
 */
export interface UndoSnapshot {
  /** The match state before modification */
  match: Match | null;
  /** Competition state before modification (includes win2outState/twoMatchRotationState) */
  competition: Competition | null;
  /** ID of newly created match that should be deleted on undo */
  newMatchId: string | null;
}

/**
 * Undo entry containing snapshot and metadata
 */
export interface UndoEntry {
  /** Unique identifier for this undo entry */
  id: string;
  /** Type of action that was performed */
  actionType: UndoActionType;
  /** Human-readable description of the action */
  description: string;
  /** State snapshot to restore */
  snapshot: UndoSnapshot;
  /** Timestamp when action was performed */
  timestamp: number;
}

/**
 * Props for UndoToast component
 */
export interface UndoToastProps {
  /** The most recent undo entry to display */
  entry: UndoEntry | null;
  /** Number of additional undos available after the current one */
  additionalUndos: number;
  /** Callback when undo button is clicked */
  onUndo: () => void;
  /** Callback when toast is dismissed */
  onDismiss: () => void;
  /** Whether undo is in progress */
  isUndoing?: boolean;
}

/**
 * Context value for global undo management
 */
export interface UndoContextValue {
  /** Push a new undoable action */
  pushUndo: (entry: Omit<UndoEntry, "id" | "timestamp">) => void;
  /** Clear all undo entries */
  clearUndo: () => void;
  /** Stack of undo entries (most recent first) */
  undoStack: UndoEntry[];
  /** Number of available undos in the stack */
  stackSize: number;
}
