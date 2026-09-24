import { UNDO_DEPTH } from "@/lib/engine/rotation";

/** How many entries the toast keeps: as many as the engine keeps undoable per court. */
export const MAX_UNDO_STACK_SIZE = UNDO_DEPTH;

/**
 * The actions the undo toast can take back. Both are results on a rotation
 * court; the engine's undo command puts the court back as it was.
 */
export type UndoActionType = "instant_win" | "match_complete";

/**
 * One result the undo toast offers to take back. The engine keeps what the
 * result moved, so an entry only needs to name the result.
 */
export interface UndoEntry {
  /** Unique identifier for this undo entry */
  id: string;
  /** Type of action that was performed */
  actionType: UndoActionType;
  /** Human-readable description of the action */
  description: string;
  tournamentId: string;
  /** The match whose result is undone */
  matchId: string;
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
