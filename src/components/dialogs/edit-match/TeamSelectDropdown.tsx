"use client";

import type { PersistentTeam } from "@/types/game";

interface TeamSelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  teams: PersistentTeam[];
  teamColor: string;
  isTeamPlaying: (teamId: string) => boolean;
  label: string;
}

export const TeamSelectDropdown = ({
  value,
  onChange,
  teams,
  teamColor,
  isTeamPlaying,
  label,
}: TeamSelectDropdownProps) => {
  return (
    <div className="flex-1">
      <div className="relative">
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
          style={{ backgroundColor: teamColor }}
        />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 pl-8 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          aria-label={label}
        >
          <option value="">Select team...</option>
          {teams.map((team) => {
            const playing = isTeamPlaying(team.id);
            return (
              <option
                key={team.id}
                value={team.id}
                disabled={playing}
              >
                {team.name}
                {playing ? " (Playing)" : ""}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
};
