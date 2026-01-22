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
import { generateUndoId } from "@/lib/undo";
import type { UndoEntry, UndoContextValue } from "@/types/undo";
import { MAX_UNDO_STACK_SIZE } from "@/types/undo";

const UndoContext = createContext<UndoContextValue | null>(null);

interface GlobalUndoToastProps {
  children: ReactNode;
}

export const GlobalUndoToast = ({ children }: GlobalUndoToastProps) => {
  const { updateMatch, updateCompetition, deleteMatch } = useApp();
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

  const performUndo = useCallback(() => {
    if (!currentEntry || isUndoing) return;

    setIsUndoing(true);

    try {
      const { snapshot } = currentEntry;

      // 1. Delete the newly created match first (if any)
      if (snapshot.newMatchId) {
        deleteMatch(snapshot.newMatchId);
      }

      // 2. Restore the original match state
      if (snapshot.match) {
        updateMatch(snapshot.match.id, {
          status: snapshot.match.status,
          winnerId: snapshot.match.winnerId,
          homeScore: snapshot.match.homeScore,
          awayScore: snapshot.match.awayScore,
          completedAt: snapshot.match.completedAt,
          homeWins: snapshot.match.homeWins,
          awayWins: snapshot.match.awayWins,
          seriesGame: snapshot.match.seriesGame,
        });
      }

      // 3. Restore competition state (courts, queue, team statuses)
      if (snapshot.competition) {
        updateCompetition(snapshot.competition);
      }

      // Pop the current entry from the stack
      setUndoStack((prev) => prev.slice(1));
    } catch (error) {
      console.error("Undo failed:", error);
    } finally {
      setIsUndoing(false);
    }
  }, [currentEntry, isUndoing, updateMatch, updateCompetition, deleteMatch]);

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
