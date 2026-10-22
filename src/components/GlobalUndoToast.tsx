"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { AnimatePresence } from "framer-motion";
import { UndoToast } from "@/components/UndoToast";
import { useApp } from "@/context/AppContext";
import { generateUndoId, stackAfterFailure, stackAfterUndo } from "@/lib/undo";
import type { UndoEntry, UndoContextValue } from "@/types/undo";
import { MAX_UNDO_STACK_SIZE } from "@/types/undo";

const UndoContext = createContext<UndoContextValue | null>(null);

interface GlobalUndoToastProps {
  children: ReactNode;
}

export const GlobalUndoToast = ({ children }: GlobalUndoToastProps) => {
  const { undoResult } = useApp();
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);

  const stackSize = undoStack.length;
  const currentEntry = undoStack.length > 0 ? undoStack[0] : null;

  const pushUndo = useCallback(
    (entry: Omit<UndoEntry, "id" | "timestamp">) => {
      const newEntry: UndoEntry = {
        ...entry,
        id: generateUndoId(),
        timestamp: Date.now(),
      };
      setUndoStack((prev) => {
        // Add new entry at the front, keep max 5 entries
        const newStack = [newEntry, ...prev];
        return newStack.slice(0, MAX_UNDO_STACK_SIZE);
      });
    },
    []
  );

  const clearUndo = useCallback(() => {
    setUndoStack([]);
  }, []);

  const resultFailed = useCallback((tournamentId: string, matchId: string) => {
    setUndoStack((prev) => stackAfterFailure(prev, tournamentId, matchId));
  }, []);

  // The engine takes the result back as one command: the match, the match
  // it scheduled, and the teams it moved. The court goes back from the
  // local cache the moment the command is applied on this phone, and that
  // is when the entry leaves the toast; the server's answer arrives later
  // and is reported in the background. An undo queued behind a win that
  // was taken back is taken back with it, which leaves nothing to show:
  // its entry is already gone. An undo the engine refuses because the
  // court has moved on can never apply later, so its entry goes too; any
  // other failure keeps the entry so the undo can be tried again.
  const performUndo = useCallback(async () => {
    if (!currentEntry || isUndoing) return;
    const entry = currentEntry;

    setIsUndoing(true);
    try {
      const { done } = await undoResult(entry.tournamentId, entry.matchId, entry.winnerId);
      setUndoStack((prev) => stackAfterUndo(prev, entry, null));
      done.catch((error: unknown) => {
        console.error("Undo was not accepted:", error);
      });
    } catch (error) {
      console.error("Undo failed:", error);
      setUndoStack((prev) => stackAfterUndo(prev, entry, error));
    } finally {
      setIsUndoing(false);
    }
  }, [currentEntry, isUndoing, undoResult]);

  // Keyboard shortcut handler (Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        if (currentEntry && !isUndoing) {
          e.preventDefault();
          performUndo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentEntry, isUndoing, performUndo]);

  const handleDismiss = useCallback(() => {
    setUndoStack([]);
  }, []);

  const contextValue: UndoContextValue = {
    pushUndo,
    clearUndo,
    resultFailed,
    undoStack,
    stackSize,
  };

  return (
    <UndoContext.Provider value={contextValue}>
      {children}
      <AnimatePresence>
        {currentEntry && (
          <UndoToast
            entry={currentEntry}
            additionalUndos={stackSize - 1}
            onUndo={performUndo}
            onDismiss={handleDismiss}
            isUndoing={isUndoing}
          />
        )}
      </AnimatePresence>
    </UndoContext.Provider>
  );
};

export const useUndo = (): UndoContextValue => {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error("useUndo must be used within a GlobalUndoToast provider");
  }
  return context;
};
