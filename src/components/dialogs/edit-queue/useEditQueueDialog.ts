"use client";

import { useState, useMemo, useCallback } from "react";
import type { PersistentTeam, Competition } from "@/types/game";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import { useTeamsOnCourt } from "@/hooks/useTeamsOnCourt";
import { mbReorder } from "@/components/matchbook/ReorderList";

/**
 * Queue-order state for the reorder dialog.
 *
 * The five HTML5 drag handlers this used to own are gone. `draggable` /
 * `onDragStart` / `onDragEnter` / `onDrop` / `onDragEnd` do not fire on touch
 * devices at all (BUG-5), so on the device this app is actually used on the
 * queue could not be reordered — and the dialog's own copy still said "Drag
 * teams or use arrows". `MbReorderList` replaces them with pointer events, a
 * visible 44px up/down pair, `Alt+Arrow` keys and an `aria-live` announcement,
 * so this hook keeps only the part that is genuinely about the queue: which
 * teams are eligible, and writing the new order back.
 *
 * The court filter is preserved exactly: a team on court is never in the
 * reorderable list, and `handleSave` filters again before writing, because the
 * competition can advance while the dialog is open.
 */
export const useEditQueueDialog = ({
  open,
  competition,
  teams,
  onClose,
}: {
  open: boolean;
  competition: Competition | null;
  teams: PersistentTeam[];
  onClose: () => void;
}) => {
  const { reorderQueue, canEdit } = useApp();
  const { getTeamName } = useTeamsMap(teams);
  const teamsOnCourt = useTeamsOnCourt(competition);

  const [queue, setQueue] = useState<string[]>([]);

  const currentQueue = useMemo(() => {
    if (!competition) return [];
    const source =
      competition.win2outState?.queue ??
      competition.twoMatchRotationState?.queue ??
      [];
    return source.filter((teamId) => !teamsOnCourt.has(teamId));
  }, [competition, teamsOnCourt]);

  // Render-time state adjustment, unchanged: the queue resets on open.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setQueue([...currentQueue]);
  }

  const hasChanges = useMemo(
    () =>
      queue.length !== currentQueue.length ||
      queue.some((teamId, index) => teamId !== currentQueue[index]),
    [queue, currentQueue]
  );

  const handleReorder = useCallback((from: number, to: number) => {
    setQueue((prev) => mbReorder(prev, from, to));
  }, []);

  const handleSave = useCallback(() => {
    if (!competition || !hasChanges) return;
    reorderQueue(
      competition.id,
      queue.filter((teamId) => !teamsOnCourt.has(teamId))
    );
    onClose();
  }, [competition, hasChanges, queue, teamsOnCourt, reorderQueue, onClose]);

  const handleReset = useCallback(() => {
    setQueue([...currentQueue]);
  }, [currentQueue]);

  return {
    queue,
    hasChanges,
    canEdit,
    getTeamName,
    handleReorder,
    handleSave,
    handleReset,
  };
};
