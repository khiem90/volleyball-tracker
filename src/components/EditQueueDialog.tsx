"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Users,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Clock,
} from "lucide-react";
import type { PersistentTeam, Competition } from "@/types/game";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import { useTeamsOnCourt } from "@/hooks/useTeamsOnCourt";

interface EditQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: Competition | null;
  teams: PersistentTeam[];
}

export const EditQueueDialog = ({
  open,
  onOpenChange,
  competition,
  teams,
}: EditQueueDialogProps) => {
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

    // Filter out any teams that are currently on court (safety check)
    return queueData.filter((teamId) => !teamsOnCourt.has(teamId));
  }, [competition, teamsOnCourt]);

  // Reset queue when dialog opens or queue changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setQueue([...currentQueue]);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }, [open, currentQueue]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Check if queue has changed
  const hasChanges = useMemo(() => {
    if (queue.length !== currentQueue.length) return true;
    return queue.some((teamId, index) => teamId !== currentQueue[index]);
  }, [queue, currentQueue]);

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newQueue = [...queue];
    [newQueue[index - 1], newQueue[index]] = [
      newQueue[index],
      newQueue[index - 1],
    ];
    setQueue(newQueue);
  };

  const handleMoveDown = (index: number) => {
    if (index >= queue.length - 1) return;
    const newQueue = [...queue];
    [newQueue[index], newQueue[index + 1]] = [
      newQueue[index + 1],
      newQueue[index],
    ];
    setQueue(newQueue);
  };

  // Drag and drop handlers
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    // Add a slight delay before adding dragging styles
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = "0.4";
      }
    }, 0);
  };

  const handleDragEnter = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = () => {
    // Don't clear immediately to prevent flicker
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    dropIndex: number
  ) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newQueue = [...queue];
    const [draggedItem] = newQueue.splice(draggedIndex, 1);
    newQueue.splice(dropIndex, 0, draggedItem);
    setQueue(newQueue);
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "1";
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const handleSave = () => {
    if (!competition || !hasChanges) return;
    // Filter out any teams on court before saving (safety check)
    const safeQueue = queue.filter((teamId) => !teamsOnCourt.has(teamId));
    reorderQueue(competition.id, safeQueue);
    onOpenChange(false);
  };

  const handleReset = () => {
    setQueue([...currentQueue]);
  };

  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Edit Queue Order
          </DialogTitle>
          <DialogDescription>
            Drag teams or use arrows to reorder. The team at the top plays next.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No teams in queue</p>
              <p className="text-xs mt-1">All teams are currently on court</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto pr-2">
              {queue.map((teamId, index) => (
                <div
                  key={teamId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg bg-card border transition-all duration-150 cursor-grab active:cursor-grabbing
                    ${
                      dragOverIndex === index && draggedIndex !== index
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-border/50 hover:border-primary/30"
                    }
                    ${draggedIndex === index ? "opacity-40" : ""}
                  `}
                >
                  {/* Drag Handle */}
                  <div className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Position */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      index === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>

                  {/* Team */}
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${getTeamColor(
                        teamId
                      )}, ${getTeamColor(teamId)}cc)`,
                    }}
                  >
                    <Users className="w-3 h-3 text-white" />
                  </div>
                  <span className="font-medium text-sm flex-1 truncate">
                    {getTeamName(teamId)}
                  </span>

                  {/* Move Controls - Simple Up/Down */}
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveUp(index);
                      }}
                      disabled={index === 0}
                      aria-label={`Move ${getTeamName(teamId)} up`}
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveDown(index);
                      }}
                      disabled={index === queue.length - 1}
                      aria-label={`Move ${getTeamName(teamId)} down`}
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Next Up Indicator */}
          {queue.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary font-medium mb-1">
                Next to Play
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${getTeamColor(
                      queue[0]
                    )}, ${getTeamColor(queue[0])}cc)`,
                  }}
                >
                  <Users className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold">{getTeamName(queue[0])}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!hasChanges}
            className="text-muted-foreground"
          >
            Reset
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
            Save Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
