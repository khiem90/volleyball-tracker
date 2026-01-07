"use client";

import { useMemo } from "react";
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

  const recentEvents = useMemo(() => events.slice(0, 10), [events]);

  return (
    <div className="bg-slate-900/95 border-t border-slate-700/50 px-4 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Score History
          </h3>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo last action"
            className={`
              px-3 py-1.5 rounded-lg
              text-sm font-medium
              transition-all duration-150
              flex items-center gap-2
              ${
                canUndo
                  ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 active:scale-95"
                  : "bg-slate-800 text-slate-600 cursor-not-allowed"
              }
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z"
                clipRule="evenodd"
              />
            </svg>
            Undo
          </button>
        </div>

        {/* Events List */}
        {recentEvents.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            No score changes yet. Tap a panel to add points!
          </p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {recentEvents.map((event, index) => (
              <div
                key={event.id}
                className={`
                  flex items-center justify-between
                  px-3 py-2 rounded-lg
                  ${index === 0 ? "bg-slate-800/80" : "bg-slate-800/40"}
                  transition-all duration-200
                `}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center
                      text-xs font-bold
                      ${
                        event.action === "add"
                          ? "bg-emerald-600/30 text-emerald-400"
                          : "bg-red-600/30 text-red-400"
                      }
                    `}
                    aria-hidden="true"
                  >
                    {event.action === "add" ? "+" : "−"}
                  </span>
                  <span className="text-slate-300 text-sm font-medium">
                    {event.teamName}
                  </span>
                  <span className="text-slate-500 text-sm">
                    {event.previousScore} → {event.newScore}
                  </span>
                </div>
                <span className="text-slate-600 text-xs font-mono">
                  {formatTime(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}

        {events.length > 10 && (
          <p className="text-slate-600 text-xs text-center mt-2">
            Showing 10 of {events.length} events
          </p>
        )}
      </div>
    </div>
  );
};

