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
  const isBye = match.isBye === true;
  const isClickable = match.homeTeamId && match.awayTeamId && !isBye;
  const isPlayable = isClickable && match.status !== "completed";
  const isCompleted = match.status === "completed";
  const homeWon = match.winnerId === match.homeTeamId;
  const awayWon = match.winnerId === match.awayTeamId;
  const actionLabel = match.status === "in_progress" ? "Continue" : "Start";

  // For bye matches, get the team that has an ID
  const getByeTeamName = (teamId: string) => {
    if (!teamId) return "BYE";
    return getTeamName(teamId);
  };

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
                : isBye
                  ? "opacity-50 border-dashed"
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
              ${isCompleted && !homeWon && !isBye ? "opacity-50" : ""}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              {match.homeTeamId ? (
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getTeamColor(match.homeTeamId) }}
                />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-border/50 border-dashed" />
              )}
              <span
                className={`text-[13px] truncate ${
                  homeWon ? "font-semibold text-emerald-500" : ""
                } ${!match.homeTeamId ? "text-muted-foreground/60 italic" : ""}`}
              >
                {isBye ? getByeTeamName(match.homeTeamId) : getTeamName(match.homeTeamId)}
              </span>
            </div>
            {isCompleted && !isBye && (
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
              ${isCompleted && !awayWon && !isBye ? "opacity-50" : ""}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              {match.awayTeamId ? (
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: getTeamColor(match.awayTeamId) }}
                />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-border/50 border-dashed" />
              )}
              <span
                className={`text-[13px] truncate ${
                  awayWon ? "font-semibold text-emerald-500" : ""
                } ${!match.awayTeamId ? "text-muted-foreground/60 italic" : ""}`}
              >
                {isBye ? getByeTeamName(match.awayTeamId) : getTeamName(match.awayTeamId)}
              </span>
            </div>
            {isCompleted && !isBye && (
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
          {(isClickable || isBye) && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/70">
              <span className="h-px w-6 bg-border/40" />
              <span className={`rounded-full border bg-background/70 px-1.5 py-0.5 ${isBye ? "border-dashed border-border/30 text-muted-foreground/50" : "border-border/40"}`}>
                {isBye ? "bye" : "vs"}
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
