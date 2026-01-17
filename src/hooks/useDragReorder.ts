"use client";

import { useState, useCallback, useRef } from "react";

interface UseDragReorderReturn<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => void;
  handleDragEnd: () => void;
  handleMoveUp: (index: number) => void;
  handleMoveDown: (index: number) => void;
  resetDragState: () => void;
}

export const useDragReorder = <T>(
  initialItems: T[] = []
): UseDragReorderReturn<T> => {
  const [items, setItems] = useState<T[]>(initialItems);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setItems((prev) => {
      const newItems = [...prev];
      [newItems[index - 1], newItems[index]] = [
        newItems[index],
        newItems[index - 1],
      ];
      return newItems;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const newItems = [...prev];
      [newItems[index], newItems[index + 1]] = [
        newItems[index + 1],
        newItems[index],
      ];
      return newItems;
    });
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDraggedIndex(index);
      dragNodeRef.current = e.currentTarget;
      e.dataTransfer.effectAllowed = "move";
      // Add a slight delay before adding dragging styles
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
      setDraggedIndex((current) => {
        if (current === null || current === index) return current;
        setDragOverIndex(index);
        return current;
      });
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragLeave = useCallback(() => {
    // Don't clear immediately to prevent flicker
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();
      setDraggedIndex((currentDraggedIndex) => {
        if (currentDraggedIndex === null || currentDraggedIndex === dropIndex) {
          return currentDraggedIndex;
        }

        setItems((prev) => {
          const newItems = [...prev];
          const [draggedItem] = newItems.splice(currentDraggedIndex, 1);
          newItems.splice(dropIndex, 0, draggedItem);
          return newItems;
        });

        return currentDraggedIndex;
      });
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, []);

  const resetDragState = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, []);

  return {
    items,
    setItems,
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleMoveUp,
    handleMoveDown,
    resetDragState,
  };
};
