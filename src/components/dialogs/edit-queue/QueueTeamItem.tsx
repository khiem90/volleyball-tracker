"use client";

import { Button } from "@/components/ui/button";
import { Users, ChevronUp, ChevronDown, GripVertical } from "lucide-react";

interface QueueTeamItemProps {
  teamId: string;
  index: number;
  totalCount: number;
  teamName: string;
  teamColor: string;
  isDragged: boolean;
  isDragOver: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
}

export const QueueTeamItem = ({
  teamId,
  index,
  totalCount,
  teamName,
  teamColor,
  isDragged,
  isDragOver,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
}: QueueTeamItemProps) => {
  return (
    <div
      key={teamId}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`
        flex items-center gap-2 p-3 rounded-lg bg-card border transition-all duration-150 cursor-grab active:cursor-grabbing
        ${isDragOver && !isDragged ? "border-primary bg-primary/10 scale-[1.02]" : "border-border/50 hover:border-primary/30"}
        ${isDragged ? "opacity-40" : ""}
      `}
    >
      {/* Drag Handle */}
      <div className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Position */}
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {index + 1}
      </span>

      {/* Team */}
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)`,
        }}
      >
        <Users className="w-3 h-3 text-white" />
      </div>
      <span className="font-medium text-sm flex-1 truncate">{teamName}</span>

      {/* Move Controls */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp(index);
          }}
          disabled={index === 0}
          aria-label={`Move ${teamName} up`}
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
            onMoveDown(index);
          }}
          disabled={index === totalCount - 1}
          aria-label={`Move ${teamName} down`}
          title="Move down"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
