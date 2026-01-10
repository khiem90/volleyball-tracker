"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Plus, Minus } from "lucide-react";
import type { ScoreEvent } from "@/types/game";

interface HistoryProps {
  events: ScoreEvent[];
  onUndo: () => void;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export const History = ({ events, onUndo }: HistoryProps) => {
  const canUndo = events.length > 0;
  const recentEvents = useMemo(() => events.slice(0, 8), [events]);

  return (
    <div className="flex-shrink-0 glass border-t border-border/50 px-4 py-3 h-40">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Score History
          </h3>
          <Button
            variant={canUndo ? "secondary" : "ghost"}
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo last action"
            className={`gap-1.5 h-7 text-xs ${canUndo ? "hover:bg-primary/20 hover:text-primary" : ""}`}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </Button>
        </div>

        {/* Events List */}
        {recentEvents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              No score changes yet. Tap +/- to add points!
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
            {recentEvents.map((event, index) => (
              <div
                key={event.id}
                className={`
                  flex items-center justify-between
                  px-3 py-1.5 rounded-lg
                  ${index === 0 
                    ? "bg-card/80 border border-border/50" 
                    : "bg-card/40"
                  }
                  transition-all duration-200
                `}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      w-5 h-5 rounded-full flex items-center justify-center
                      ${event.action === "add"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-destructive/20 text-destructive"
                      }
                    `}
                  >
                    {event.action === "add" 
                      ? <Plus className="h-3 w-3" /> 
                      : <Minus className="h-3 w-3" />
                    }
                  </div>
                  <span className="text-foreground text-sm font-medium">
                    {event.teamName}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {event.previousScore} → {event.newScore}
                  </span>
                </div>
                <span className="text-muted-foreground/60 text-xs font-mono">
                  {formatTime(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}

        {events.length > 8 && (
          <p className="text-muted-foreground/60 text-xs text-center mt-1 flex-shrink-0">
            Showing 8 of {events.length} events
          </p>
        )}
      </div>
    </div>
  );
};
