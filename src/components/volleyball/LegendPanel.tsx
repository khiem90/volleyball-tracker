"use client";

import { memo } from "react";
import type { PlayerPosition, RotationNumber, GameMode } from "@/lib/volleyball/types";
import { PLAYER_INFO } from "@/lib/volleyball/constants";
import { isSetterFrontRow } from "@/lib/volleyball/rotations";

type LegendPanelProps = {
  players: PlayerPosition[];
  rotation: RotationNumber;
  mode: GameMode;
  selectedPlayer: string | null;
  onPlayerSelect: (role: string | null) => void;
};

export const LegendPanel = memo(
  ({
    players,
    rotation,
    mode,
    selectedPlayer,
    onPlayerSelect,
  }: LegendPanelProps) => {
    // Get unique roles currently on court
    const activeRoles = [...new Set(players.map((p) => p.role))];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Players</h3>
          <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-accent">
            R{rotation} • {mode === "serving" ? "Serve" : "Receive"}
          </span>
        </div>

        {/* Rotation info */}
        <div className="p-3 rounded-lg bg-accent/50 border border-border">
          <div className="text-sm">
            <span className="font-medium">Setter position: </span>
            <span className={isSetterFrontRow(rotation) ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}>
              {isSetterFrontRow(rotation) ? "Front Row" : "Back Row"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {isSetterFrontRow(rotation)
              ? "2 front-row attackers available"
              : "3 front-row attackers available"}
          </div>
        </div>

        {/* Player legend */}
        <div className="space-y-2">
          {activeRoles.map((role) => {
            const info = PLAYER_INFO[role];
            const player = players.find((p) => p.role === role);
            const isSelected = selectedPlayer === role;

            return (
              <button
                key={role}
                type="button"
                onClick={() => onPlayerSelect(isSelected ? null : role)}
                className={`
                  w-full p-3 rounded-xl text-left transition-all duration-200
                  border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                  ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-transparent bg-accent/30 hover:bg-accent/50 hover:border-primary/20"
                  }
                `}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3">
                  {/* Color indicator */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0"
                    style={{ backgroundColor: info.color }}
                  >
                    {info.shortName}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {info.fullName}
                      </span>
                      {player?.isBackRow && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium">
                          Back
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {info.description}
                    </div>
                    {player && (
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                        Zone {player.zone}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick reference */}
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-400"></div>
              <span>Back row player indicator</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500/50"></div>
              <span>Libero (replaces back-row MB)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
LegendPanel.displayName = "LegendPanel";
