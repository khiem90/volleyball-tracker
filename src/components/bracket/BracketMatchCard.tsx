"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { Match } from "@/types/game";

interface BracketMatchCardProps {
  match: Match;
  height: number;
  round: number;
  totalRounds: number;
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
  canEdit: boolean;
  onMatchClick?: (match: Match) => void;
  onEditMatch?: (match: Match) => void;
}

export const BracketMatchCard = memo(function BracketMatchCard({
  match,
  height,
  round,
  totalRounds,
  getTeamName,
  getTeamColor,
  canEdit,
  onMatchClick,
  onEditMatch,
}: BracketMatchCardProps) {
  const isClickable = match.homeTeamId && match.awayTeamId;
  const isPlayable = isClickable && match.status !== "completed";
  const isCompleted = match.status === "completed";
  const homeWon = match.winnerId === match.homeTeamId;
  const awayWon = match.winnerId === match.awayTeamId;
  const actionLabel = match.status === "in_progress" ? "Continue" : "Start";

  const handleClick = () => {
    if (onMatchClick && isPlayable) {
      onMatchClick(match);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isPlayable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute top-1/2 -translate-y-1/2 w-full">
        <Card
          className={`
            group relative w-56 overflow-hidden border-border/40 bg-card/40 py-0 gap-0
            transition-[border-color,box-shadow,transform]
            ${
              isPlayable
                ? "cursor-pointer hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5"
                : "opacity-60"
            }
          `}
          onClick={handleClick}
          role={isPlayable ? "button" : undefined}
          tabIndex={isPlayable ? 0 : undefined}
          onKeyDown={handleKeyDown}
        >
          {/* Home Team */}
          <div
            className={`
              flex items-center justify-between px-4 py-3 border-b border-border/30
              ${isPlayable ? "group-hover:bg-primary/5" : ""}
              ${homeWon ? "bg-emerald-500/10" : ""}
              ${isCompleted && !homeWon ? "opacity-50" : ""}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getTeamColor(match.homeTeamId) }}
              />
              <span
                className={`text-[13px] truncate ${
                  homeWon ? "font-semibold text-emerald-500" : ""
                }`}
              >
                {getTeamName(match.homeTeamId)}
              </span>
            </div>
            {isCompleted && (
              <span
                className={`text-[13px] font-bold tabular-nums ${
                  homeWon ? "text-emerald-500" : ""
                }`}
              >
                {match.homeScore}
              </span>
            )}
          </div>

          {/* Away Team */}
          <div
            className={`
              flex items-center justify-between px-4 py-3
              ${isPlayable ? "group-hover:bg-primary/5" : ""}
              ${awayWon ? "bg-emerald-500/10" : ""}
              ${isCompleted && !awayWon ? "opacity-50" : ""}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getTeamColor(match.awayTeamId) }}
              />
              <span
                className={`text-[13px] truncate ${
                  awayWon ? "font-semibold text-emerald-500" : ""
                }`}
              >
                {getTeamName(match.awayTeamId)}
              </span>
            </div>
            {isCompleted && (
              <span
                className={`text-[13px] font-bold tabular-nums ${
                  awayWon ? "text-emerald-500" : ""
                }`}
              >
                {match.awayScore}
              </span>
            )}
          </div>

          {/* Status Indicator */}
          {match.status === "in_progress" && (
            <Badge className="status-live absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider">
              Live
            </Badge>
          )}

          {/* Match Pairing Indicator */}
          {isClickable && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/70">
              <span className="h-px w-6 bg-border/40" />
              <span className="rounded-full border border-border/40 bg-background/70 px-1.5 py-0.5">
                vs
              </span>
              <span className="h-px w-6 bg-border/40" />
            </div>
          )}

          {/* Hover Action */}
          {isPlayable && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
              <span className="text-[10px] uppercase tracking-wider text-primary/80 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                {actionLabel}
              </span>
            </div>
          )}

          {/* Edit Button */}
          {canEdit && onEditMatch && match.status === "pending" && isClickable && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -left-2 h-6 w-6 bg-background border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditMatch(match);
              }}
              aria-label="Edit match assignment"
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </Card>

        {/* Connector Lines */}
        {round < totalRounds && (
          <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-border/50" />
        )}
      </div>
    </div>
  );
});
