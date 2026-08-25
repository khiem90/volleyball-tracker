"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { UndoToast } from "@/components/UndoToast";
import { MbOfflineBanner } from "@/components/matchbook/Offline";
import { ToastHost, dismissToast, toast } from "@/components/matchbook/Toast";
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
  /* The one live rollback acknowledgment (C16). A second undo retracts the
     previous strip before speaking, so five Ctrl+Zs read as one strip whose
     sentence updates rather than a five-high stack of stale confirmations. */
  const ackToastId = useRef<string | null>(null);

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

      /* ----------------------------------------------------------------
         THE VISIBLE ROLLBACK (C16). SKIN, after the restore: the three-step
         order above and the stack semantics are the byte-frozen contract
         (H9) and nothing here touches them — this only SAYS what they just
         did. Without it the only evidence an undo fired was the strip
         disappearing, which is indistinguishable from dismissing it; with a
         match snapshot the sentence carries the exact score the numerals
         cross-faded back to, so the toast and the flash describe one event.
         `–` between figures, as every scoreline in the app prints.
         ---------------------------------------------------------------- */
      if (ackToastId.current) dismissToast(ackToastId.current);
      ackToastId.current = toast({
        tone: "info",
        icon: "undo",
        message: snapshot.match
          ? `"${currentEntry.description}" undone — score back to ${snapshot.match.homeScore}–${snapshot.match.awayScore}`
          : `"${currentEntry.description}" undone`,
      });
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

  /* ---------------------------------------------------------------------
     THE GLOBAL FEEDBACK MOUNT (charter §2.3, W2 / P2b)

     `AnimatePresence` is gone: framer-motion is banned on converted screens
     (design language §9), and it was only ever wrapping an exit animation that
     `.mb-toast` does not have. Nothing about the undo contract touches it —
     `pushUndo`, `performUndo`, `clearUndo`, MAX_UNDO_STACK_SIZE, the Ctrl+Z
     listener and the three-step restore order above are byte-identical (H9).

     WHY THE OTHER TWO LAYERS MOUNT HERE. `ToastHost` and `MbOfflineBanner`
     each need exactly one app-wide mount, and this component is already it:
     it is the single node `Providers` wraps every route in, and it is already
     named for the job it does — rendering a toast at the root. The alternative
     was editing `Providers.tsx`, which a sibling workstream holds this phase.

     When `MatchbookShell` lands (W2/P2a) both lines move into it and this file
     goes back to owning the undo stack alone. Until then, moving them is a
     one-line change and leaving them out would mean shipping a toast system
     with no host and an offline banner nothing renders.
     --------------------------------------------------------------------- */
  return (
    <UndoContext.Provider value={contextValue}>
      {children}
      <MbOfflineBanner />
      <ToastHost
        pinned={
          currentEntry && (
            <UndoToast
              entry={currentEntry}
              additionalUndos={stackSize - 1}
              onUndo={performUndo}
              onDismiss={handleDismiss}
              isUndoing={isUndoing}
            />
          )
        }
      />
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
