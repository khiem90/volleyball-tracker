"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { PersistentTeam, Competition } from "@/types/game";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import { useTeamsOnCourt } from "@/hooks/useTeamsOnCourt";

interface UseEditQueueDialogProps {
  open: boolean;
  competition: Competition | null;
  teams: PersistentTeam[];
  onClose: () => void;
}

export const useEditQueueDialog = ({
  open,
  competition,
  teams,
  onClose,
}: UseEditQueueDialogProps) => {
  const { reorderQueue, canEdit } = useApp();
  const { getTeamName, getTeamColor } = useTeamsMap(teams);
  const teamsOnCourt = useTeamsOnCourt(competition);

  const [queue, setQueue] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  // Get the current queue from competition state (filtering out teams on court)
  const currentQueue = useMemo(() => {
    if (!competition) return [];
    let queueData: string[] = [];

    if (competition.win2outState) {
      queueData = competition.win2outState.queue;
    }
    if (competition.twoMatchRotationState) {
      queueData = competition.twoMatchRotationState.queue;
    }

    return queueData.filter((teamId) => !teamsOnCourt.has(teamId));
  }, [competition, teamsOnCourt]);

  // Reset queue when dialog opens or queue changes
  useEffect(() => {
    if (open) {
      setQueue([...currentQueue]);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }, [open, currentQueue]);

  // Check if queue has changed
  const hasChanges = useMemo(() => {
    if (queue.length !== currentQueue.length) return true;
    return queue.some((teamId, index) => teamId !== currentQueue[index]);
  }, [queue, currentQueue]);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setQueue((prev) => {
      const newQueue = [...prev];
      [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
      return newQueue;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setQueue((prev) => {
      if (index >= prev.length - 1) return prev;
      const newQueue = [...prev];
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
      return newQueue;
    });
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDraggedIndex(index);
      dragNodeRef.current = e.currentTarget;
      e.dataTransfer.effectAllowed = "move";
      setTimeout(() => {
        if (dragNodeRef.current) {
          dragNodeRef.current.style.opacity = "0.4";
        }
      }, 0);
    },
    []
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;
      setDragOverIndex(index);
    },
    [draggedIndex]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) return;

      setQueue((prev) => {
        const newQueue = [...prev];
        const [draggedItem] = newQueue.splice(draggedIndex, 1);
        newQueue.splice(dropIndex, 0, draggedItem);
        return newQueue;
      });
    },
    [draggedIndex]
  );

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, []);

  const handleSave = useCallback(() => {
    if (!competition || !hasChanges) return;
    const safeQueue = queue.filter((teamId) => !teamsOnCourt.has(teamId));
    reorderQueue(competition.id, safeQueue);
    onClose();
  }, [competition, hasChanges, queue, teamsOnCourt, reorderQueue, onClose]);

  const handleReset = useCallback(() => {
    setQueue([...currentQueue]);
  }, [currentQueue]);

  return {
    // State
    queue,
    draggedIndex,
    dragOverIndex,
    hasChanges,
    canEdit,

    // Helpers
    getTeamName,
    getTeamColor,

    // Actions
    handleMoveUp,
    handleMoveDown,
    handleDragStart,
    handleDragEnter,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleSave,
    handleReset,
  };
};
