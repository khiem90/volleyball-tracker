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
import { EngineError } from "@/lib/engine";
import { generateUndoId } from "@/lib/undo";
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

  // The engine takes the result back in one transaction: the match, the
  // match it scheduled, and the teams it moved. An entry is dropped once the
  // undo has been applied, and also when the engine refuses it because the
  // court has moved on, since that can never apply later. Any other failure
  // keeps the entry so the undo can be tried again.
  const performUndo = useCallback(async () => {
    if (!currentEntry || isUndoing) return;

    setIsUndoing(true);
    let spent = true;
    try {
      await undoResult(currentEntry.tournamentId, currentEntry.matchId);
    } catch (error) {
      console.error("Undo failed:", error);
      spent = error instanceof EngineError;
    } finally {
      if (spent) setUndoStack((prev) => prev.filter((entry) => entry.id !== currentEntry.id));
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
