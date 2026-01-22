"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Clock } from "lucide-react";
import type { PersistentTeam, Competition } from "@/types/game";
import { useEditQueueDialog } from "./useEditQueueDialog";
import { QueueTeamItem } from "./QueueTeamItem";
import { NextUpIndicator } from "./NextUpIndicator";

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
  const {
    queue,
    draggedIndex,
    dragOverIndex,
    hasChanges,
    canEdit,
    getTeamName,
    getTeamColor,
    handleMoveUp,
    handleMoveDown,
    handleDragStart,
    handleDragEnter,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleSave,
    handleReset,
  } = useEditQueueDialog({
    open,
    competition,
    teams,
    onClose: () => onOpenChange(false),
  });

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
                <QueueTeamItem
                  key={teamId}
                  teamId={teamId}
                  index={index}
                  totalCount={queue.length}
                  teamName={getTeamName(teamId)}
                  teamColor={getTeamColor(teamId)}
                  isDragged={draggedIndex === index}
                  isDragOver={dragOverIndex === index}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}

          {queue.length > 0 && (
            <NextUpIndicator
              teamId={queue[0]}
              teamName={getTeamName(queue[0])}
              teamColor={getTeamColor(queue[0])}
            />
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
