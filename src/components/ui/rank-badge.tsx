import * as React from "react";
import { cn } from "@/lib/utils";

const rankConfig = {
  1: "bg-amber-500 text-white",
  2: "bg-slate-400 text-white",
  3: "bg-amber-700 text-white",
  default: "bg-card text-muted-foreground",
} as const;

const sizeConfig = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
} as const;

interface RankBadgeProps {
  rank: number;
  size?: keyof typeof sizeConfig;
  hasAchievement?: boolean;
  className?: string;
}

const RankBadge = React.memo(function RankBadge({
  rank,
  size = "md",
  hasAchievement = true,
  className,
}: RankBadgeProps) {
  const rankStyle =
    hasAchievement && rank in rankConfig
      ? rankConfig[rank as keyof typeof rankConfig]
      : rankConfig.default;
  const sizeStyle = sizeConfig[size];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold shrink-0",
        sizeStyle,
        rankStyle,
        className
      )}
    >
      {rank}
    </div>
  );
});

RankBadge.displayName = "RankBadge";

export { RankBadge };
