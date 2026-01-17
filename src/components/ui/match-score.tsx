import * as React from "react";
import { cn } from "@/lib/utils";

const sizeConfig = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-3xl",
} as const;

interface MatchScoreDisplayProps {
  homeScore: number;
  awayScore: number;
  winnerId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  size?: keyof typeof sizeConfig;
  showWinner?: boolean;
  className?: string;
}

const MatchScoreDisplay = React.memo(function MatchScoreDisplay({
  homeScore,
  awayScore,
  winnerId,
  homeTeamId,
  awayTeamId,
  size = "md",
  showWinner = true,
  className,
}: MatchScoreDisplayProps) {
  const sizeStyle = sizeConfig[size];
  const homeWon = showWinner && winnerId === homeTeamId;
  const awayWon = showWinner && winnerId === awayTeamId;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "font-bold tabular-nums",
          sizeStyle,
          homeWon && "text-emerald-500"
        )}
      >
        {homeScore}
      </span>
      <span className="text-muted-foreground">-</span>
      <span
        className={cn(
          "font-bold tabular-nums",
          sizeStyle,
          awayWon && "text-emerald-500"
        )}
      >
        {awayScore}
      </span>
    </div>
  );
});

MatchScoreDisplay.displayName = "MatchScoreDisplay";

export { MatchScoreDisplay };
