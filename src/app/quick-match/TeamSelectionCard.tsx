"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { UserGroupIcon, CheckIcon } from "@heroicons/react/24/outline";
import { MotionDiv, springSmooth } from "@/components/motion";
import type { PersistentTeam } from "@/types/game";

type TeamSelectionCardProps = {
  title: string;
  description: string;
  iconColorClass: string;
  selectedTeamId: string;
  disabledTeamId: string;
  teams: PersistentTeam[];
  defaultColor: string;
  onSelect: (id: string) => void;
  animationDirection: "left" | "right";
  animationDelay: number;
};

export const TeamSelectionCard = memo(function TeamSelectionCard({
  title,
  description,
  iconColorClass,
  selectedTeamId,
  disabledTeamId,
  teams,
  defaultColor,
  onSelect,
  animationDirection,
  animationDelay,
}: TeamSelectionCardProps) {
  const xOffset = animationDirection === "left" ? -20 : 20;

  return (
    <MotionDiv
      initial={{ opacity: 0, x: xOffset }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay }}
    >
      <GlassCard hover={false}>
        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="text-lg flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${iconColorClass} flex items-center justify-center`}>
              <UserGroupIcon className="w-4 h-4" />
            </div>
            {title}
          </GlassCardTitle>
          <GlassCardDescription>{description}</GlassCardDescription>
        </GlassCardHeader>
        <div className="h-px bg-border/30 mx-5" />
        <GlassCardContent className="pt-4">
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
            {teams.map((team) => {
              const isSelected = team.id === selectedTeamId;
              const isDisabled = team.id === disabledTeamId;
              const teamColor = team.color || defaultColor;

              return (
                <motion.button
                  key={team.id}
                  type="button"
                  onClick={() => onSelect(team.id)}
                  disabled={isDisabled}
                  whileHover={!isDisabled ? { scale: 1.01 } : undefined}
                  whileTap={!isDisabled ? { scale: 0.99 } : undefined}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200
                    ${isSelected
                      ? "bg-primary/20 ring-2 ring-primary shadow-lg"
                      : "bg-accent/20 hover:bg-accent/40 border border-border/20 hover:border-primary/30"
                    }
                    ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  aria-pressed={isSelected}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${teamColor}, ${teamColor}99)`,
                    }}
                  >
                    <span className="text-sm font-bold text-white">
                      {team.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium truncate flex-1">{team.name}</span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springSmooth}
                    >
                      <CheckIcon className="w-5 h-5 text-primary shrink-0" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </GlassCardContent>
      </GlassCard>
    </MotionDiv>
  );
});
