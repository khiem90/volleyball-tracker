"use client";

import { useState, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import type { Team, TeamId } from "@/types/game";

interface ScorePanelProps {
  team: Team;
  variant: "blue" | "orange";
  onAddPoint: (teamId: TeamId) => void;
  onDeductPoint: (teamId: TeamId) => void;
  onNameChange: (teamId: TeamId, name: string) => void;
}

export const ScorePanel = ({
  team,
  variant,
  onAddPoint,
  onDeductPoint,
  onNameChange,
}: ScorePanelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(team.name);

  const handlePanelClick = useCallback(() => {
    if (!isEditing) {
      onAddPoint(team.id);
    }
  }, [isEditing, onAddPoint, team.id]);

  const handlePanelKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isEditing) {
          onAddPoint(team.id);
        }
      }
    },
    [isEditing, onAddPoint, team.id]
  );

  const handleMinusClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDeductPoint(team.id);
    },
    [onDeductPoint, team.id]
  );

  const handleMinusKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onDeductPoint(team.id);
      }
    },
    [onDeductPoint, team.id]
  );

  const handleNameClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTempName(e.target.value);
  }, []);

  const handleNameBlur = useCallback(() => {
    setIsEditing(false);
    if (tempName.trim()) {
      onNameChange(team.id, tempName.trim());
    } else {
      setTempName(team.name);
    }
  }, [tempName, team.id, team.name, onNameChange]);

  const handleNameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        setTempName(team.name);
        setIsEditing(false);
      }
    },
    [team.name]
  );

  const bgGradient =
    variant === "blue"
      ? "from-blue-600 via-blue-700 to-blue-900"
      : "from-orange-500 via-orange-600 to-orange-800";

  const hoverBg =
    variant === "blue"
      ? "hover:from-blue-500 hover:via-blue-600 hover:to-blue-800"
      : "hover:from-orange-400 hover:via-orange-500 hover:to-orange-700";

  const accentColor = variant === "blue" ? "bg-blue-400" : "bg-orange-300";
  const buttonBg =
    variant === "blue"
      ? "bg-blue-800/50 hover:bg-blue-700/70"
      : "bg-orange-700/50 hover:bg-orange-600/70";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${team.name} score: ${team.score}. Click to add point.`}
      onClick={handlePanelClick}
      onKeyDown={handlePanelKeyDown}
      className={`
        relative flex flex-1 flex-col items-center justify-center
        bg-gradient-to-br ${bgGradient} ${hoverBg}
        cursor-pointer select-none
        transition-all duration-200 ease-out
        active:scale-[0.98] active:brightness-110
        min-h-[40vh] md:min-h-[50vh]
        overflow-hidden
      `}
    >
      {/* Decorative elements */}
      <div
        className={`absolute top-0 left-0 w-32 h-32 ${accentColor} opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2`}
      />
      <div
        className={`absolute bottom-0 right-0 w-48 h-48 ${accentColor} opacity-10 rounded-full translate-x-1/4 translate-y-1/4`}
      />

      {/* Team name */}
      <div className="relative z-10 mb-4" onClick={handleNameClick}>
        {isEditing ? (
          <input
            type="text"
            value={tempName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="
              bg-white/20 backdrop-blur-sm text-white text-center
              text-xl md:text-2xl font-semibold
              px-4 py-2 rounded-lg
              border-2 border-white/30
              outline-none focus:border-white/60
              w-48 md:w-64
            "
            aria-label="Edit team name"
          />
        ) : (
          <h2
            className="
              text-white/90 text-xl md:text-2xl font-semibold
              px-4 py-2 rounded-lg
              hover:bg-white/10 transition-colors cursor-text
              tracking-wide
            "
            title="Click to edit team name"
          >
            {team.name}
          </h2>
        )}
      </div>

      {/* Score */}
      <div className="relative z-10">
        <span
          className="
            text-white font-black
            text-[8rem] md:text-[12rem] lg:text-[14rem]
            leading-none tracking-tight
            drop-shadow-2xl
            transition-transform duration-150
          "
          style={{
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          {team.score}
        </span>
      </div>

      {/* Deduct button */}
      <button
        type="button"
        onClick={handleMinusClick}
        onKeyDown={handleMinusKeyDown}
        aria-label={`Deduct point from ${team.name}`}
        className={`
          absolute bottom-6 left-1/2 -translate-x-1/2
          ${buttonBg}
          text-white/90 font-bold text-2xl
          w-14 h-14 rounded-full
          flex items-center justify-center
          transition-all duration-150
          hover:scale-110 active:scale-95
          backdrop-blur-sm
          border border-white/20
          z-20
        `}
      >
        −
      </button>

      {/* Tap hint */}
      <p className="absolute bottom-6 right-6 text-white/40 text-sm font-medium z-10">
        Tap to +1
      </p>
    </div>
  );
};

