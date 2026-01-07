"use client";

import { useState, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import type { Team, TeamId } from "@/types/game";

interface ScorePanelProps {
  team: Team;
  variant: "blue" | "orange";
  isFullscreen?: boolean;
  onAddPoint: (teamId: TeamId) => void;
  onDeductPoint: (teamId: TeamId) => void;
  onNameChange: (teamId: TeamId, name: string) => void;
}

export const ScorePanel = ({
  team,
  variant,
  isFullscreen = false,
  onAddPoint,
  onDeductPoint,
  onNameChange,
}: ScorePanelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(team.name);

  const handleAddClick = useCallback(() => {
    onAddPoint(team.id);
  }, [onAddPoint, team.id]);

  const handleMinusClick = useCallback(() => {
    onDeductPoint(team.id);
  }, [onDeductPoint, team.id]);

  const handleNameClick = useCallback(() => {
    if (!isFullscreen) {
      setIsEditing(true);
    }
  }, [isFullscreen]);

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
      if (e.key === "Enter") {
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        setTempName(team.name);
        setIsEditing(false);
      }
    },
    [team.name]
  );

  const gradientClass = variant === "blue" ? "team-blue-gradient" : "team-orange-gradient";
  
  const buttonStyle = variant === "blue" 
    ? "bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-lg shadow-black/20"
    : "bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-lg shadow-black/20";

  const scoreSize = isFullscreen
    ? "text-[8rem] md:text-[14rem] lg:text-[18rem]"
    : "text-[5rem] md:text-[10rem] lg:text-[12rem]";

  const buttonSize = isFullscreen
    ? "h-14 w-14 md:h-18 md:w-18"
    : "h-12 w-12 md:h-14 md:w-14";

  const iconSize = isFullscreen ? "h-7 w-7 md:h-8 md:w-8" : "h-5 w-5 md:h-6 md:w-6";

  return (
    <div
      className={`
        relative flex flex-1 flex-col items-center justify-center
        ${gradientClass}
        select-none
        transition-all duration-300 ease-out
        min-h-0
        overflow-hidden
        py-4
      `}
    >
      {/* Decorative glass orbs */}
      <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-radial from-white/5 to-transparent opacity-50" />

      {/* Team name */}
      <div className="relative z-10 mb-2 md:mb-4" onClick={handleNameClick}>
        {isEditing && !isFullscreen ? (
          <input
            type="text"
            value={tempName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            autoFocus
            className="
              bg-white/10 backdrop-blur-md text-white text-center
              text-lg md:text-xl font-semibold
              px-4 py-2 rounded-xl
              border border-white/20
              outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20
              w-40 md:w-56
              transition-all duration-200
            "
            aria-label="Edit team name"
          />
        ) : (
          <h2
            className={`
              text-white/90 text-lg md:text-xl font-semibold
              px-4 py-2 rounded-xl
              ${!isFullscreen ? "hover:bg-white/10 cursor-text" : ""}
              transition-all duration-200 tracking-wide
            `}
            title={!isFullscreen ? "Click to edit team name" : undefined}
          >
            {team.name}
          </h2>
        )}
      </div>

      {/* Score with plus/minus buttons */}
      <div className="relative z-10 flex items-center gap-4 md:gap-8">
        {/* Minus button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleMinusClick}
          aria-label={`Deduct point from ${team.name}`}
          className={`${buttonStyle} ${buttonSize} rounded-full transition-all duration-200 hover:scale-110 active:scale-95`}
        >
          <Minus className={iconSize} />
        </Button>

        {/* Score */}
        <span
          className={`
            text-white font-black
            ${scoreSize}
            leading-none tracking-tighter
            transition-all duration-300
            min-w-[1.2ch] text-center
            drop-shadow-2xl
          `}
          style={{
            textShadow: "0 4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(255,255,255,0.1)",
          }}
        >
          {team.score}
        </span>

        {/* Plus button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleAddClick}
          aria-label={`Add point to ${team.name}`}
          className={`${buttonStyle} ${buttonSize} rounded-full transition-all duration-200 hover:scale-110 active:scale-95`}
        >
          <Plus className={iconSize} />
        </Button>
      </div>
    </div>
  );
};
