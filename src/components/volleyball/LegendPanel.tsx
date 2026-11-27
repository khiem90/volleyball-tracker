"use client";

import { memo } from "react";
import type { PlayerPosition, RotationNumber, GameMode } from "@/lib/volleyball/types";
import { PLAYER_COLORS, PLAYER_INFO } from "@/lib/volleyball/constants";
import { isSetterFrontRow } from "@/lib/volleyball/rotations";
import { Chip } from "@/components/shared/Chip";

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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-title font-bold">Players</h3>
          <Chip>
            R{rotation} • {mode === "serving" ? "Serve" : "Receive"}
          </Chip>
        </div>

        {/* Rotation info */}
        <div className="rounded-tile bg-fill p-3">
          <div className="text-label">
            <span className="font-medium">Setter position: </span>
            <span className="font-bold">
              {isSetterFrontRow(rotation) ? "Front Row" : "Back Row"}
            </span>
          </div>
          <div className="mt-1 text-caption text-ink-soft">
            {isSetterFrontRow(rotation)
              ? "2 front-row attackers available"
              : "3 front-row attackers available"}
          </div>
        </div>

        {/* Player legend */}
        <div className="flex flex-col gap-2">
          {activeRoles.map((role) => {
            const info = PLAYER_INFO[role];
            const player = players.find((p) => p.role === role);
            const isSelected = selectedPlayer === role;

            return (
              <button
                key={role}
                type="button"
                onClick={() => onPlayerSelect(isSelected ? null : role)}
                className={`w-full rounded-tile border bg-fill p-3 text-left transition-colors ${
                  isSelected ? "border-ink" : "border-transparent hover:border-ink-soft/75"
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3">
                  {/* Color indicator */}
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full text-label font-bold ${
                      info.textColor === "ink" ? "text-ink" : "text-white"
                    }`}
                    style={{ backgroundColor: info.color }}
                  >
                    {info.shortName}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-label font-semibold">
                        {info.fullName}
                      </span>
                      {player?.isBackRow && <Chip className="bg-surface py-0">Back</Chip>}
                    </div>
                    <div className="line-clamp-1 text-caption text-ink-soft">
                      {info.description}
                    </div>
                    {player && (
                      <div className="mt-0.5 text-caption text-ink-soft">
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
        <div className="flex flex-col gap-1 border-t border-line pt-3 text-caption text-ink-soft">
          <div className="flex items-center gap-2">
            <div className="w-4 border-t-2 border-dashed border-ink-soft"></div>
            <span>Back row player indicator</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: PLAYER_COLORS.L.bg }}
            ></div>
            <span>Libero (replaces back-row MB)</span>
          </div>
        </div>
      </div>
    );
  }
);
LegendPanel.displayName = "LegendPanel";
