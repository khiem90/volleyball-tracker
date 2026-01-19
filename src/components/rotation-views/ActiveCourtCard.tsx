"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Flame, Play, Pencil, Zap } from "lucide-react";
import type { ActiveCourtCardProps } from "./types";

export const ActiveCourtCard = memo(function ActiveCourtCard({
  match,
  courtNumber,
  venueName = "Court",
  homeStreak = 0,
  awayStreak = 0,
  homeChampionCount = 0,
  awayChampionCount = 0,
  getTeamName,
  getTeamColor,
  canEdit,
  canPlayMatch,
  instantWinEnabled,
  onMatchClick,
  onEditMatch,
  onInstantWin,
}: ActiveCourtCardProps) {
  // Capitalize venue name for display
  const displayVenueName = venueName.charAt(0).toUpperCase() + venueName.slice(1);
  const handleMatchClick = () => {
    if (canPlayMatch && onMatchClick) {
      onMatchClick(match);
    }
  };

  return (
    <Card className="border-primary/30 bg-linear-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            {displayVenueName} {courtNumber}
          </div>
          {canEdit && match.status === "pending" && onEditMatch && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEditMatch(match);
              }}
              aria-label="Edit match assignment"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Instant win indicator */}
        {instantWinEnabled && canEdit && (
          <div className="flex items-center justify-center gap-1 text-xs text-primary mb-2">
            <Zap className="w-3 h-3" />
            Tap team to win
          </div>
        )}
        <div
          className={`flex items-center justify-center gap-4 py-4 ${
            canPlayMatch && !instantWinEnabled
              ? "cursor-pointer hover:opacity-80 transition-opacity"
              : ""
          }`}
          onClick={canPlayMatch && !instantWinEnabled ? handleMatchClick : undefined}
          role={canPlayMatch && !instantWinEnabled ? "button" : undefined}
          tabIndex={canPlayMatch && !instantWinEnabled ? 0 : undefined}
          onKeyDown={
            canPlayMatch && !instantWinEnabled
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleMatchClick();
                  }
                }
              : undefined
          }
          aria-label={
            canPlayMatch && !instantWinEnabled ? `Click to play match on ${displayVenueName} ${courtNumber}` : undefined
          }
        >
          {/* Home Team */}
          <div
            className={`text-center flex-1 ${
              instantWinEnabled && canEdit
                ? "cursor-pointer hover:scale-105 active:scale-95 transition-transform rounded-xl p-2 hover:bg-primary/10"
                : ""
            }`}
            onClick={
              instantWinEnabled && canEdit
                ? (e) => {
                    e.stopPropagation();
                    onInstantWin?.(match.homeTeamId);
                  }
                : undefined
            }
            role={instantWinEnabled && canEdit ? "button" : undefined}
            tabIndex={instantWinEnabled && canEdit ? 0 : undefined}
            onKeyDown={
              instantWinEnabled && canEdit
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      onInstantWin?.(match.homeTeamId);
                    }
                  }
                : undefined
            }
            aria-label={
              instantWinEnabled && canEdit
                ? `Declare ${getTeamName(match.homeTeamId)} as winner`
                : undefined
            }
          >
            <div
              className="w-14 h-14 mx-auto mb-2 rounded-xl flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, ${getTeamColor(
                  match.homeTeamId
                )}, ${getTeamColor(match.homeTeamId)}cc)`,
              }}
            >
              <Users className="w-7 h-7 text-white" />
              {homeStreak > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <p className="font-semibold text-sm">
              {getTeamName(match.homeTeamId)}
            </p>
            {homeStreak > 0 && (
              <p className="text-xs text-amber-500 font-medium">
                🔥 {homeStreak} win - 1 more = crown!
              </p>
            )}
            {homeChampionCount > 0 && (
              <p className="text-xs text-muted-foreground">
                👑 ×{homeChampionCount}
              </p>
            )}
          </div>

          {/* VS / Score */}
          <div className="text-center">
            {match.status === "in_progress" ? (
              <>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-3xl font-bold tabular-nums text-primary">
                    {match.homeScore}
                  </span>
                  <span className="text-lg text-muted-foreground">:</span>
                  <span className="text-3xl font-bold tabular-nums text-primary">
                    {match.awayScore}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-amber-500 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Live
                </div>
                {canPlayMatch && !instantWinEnabled && (
                  <Button size="sm" className="gap-1">
                    <Play className="w-4 h-4" />
                    Continue
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-muted-foreground">VS</div>
                {canPlayMatch && !instantWinEnabled && (
                  <Button size="sm" className="mt-2 gap-1">
                    <Play className="w-4 h-4" />
                    Play
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Away Team */}
          <div
            className={`text-center flex-1 ${
              instantWinEnabled && canEdit
                ? "cursor-pointer hover:scale-105 active:scale-95 transition-transform rounded-xl p-2 hover:bg-primary/10"
                : ""
            }`}
            onClick={
              instantWinEnabled && canEdit
                ? (e) => {
                    e.stopPropagation();
                    onInstantWin?.(match.awayTeamId);
                  }
                : undefined
            }
            role={instantWinEnabled && canEdit ? "button" : undefined}
            tabIndex={instantWinEnabled && canEdit ? 0 : undefined}
            onKeyDown={
              instantWinEnabled && canEdit
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      onInstantWin?.(match.awayTeamId);
                    }
                  }
                : undefined
            }
            aria-label={
              instantWinEnabled && canEdit
                ? `Declare ${getTeamName(match.awayTeamId)} as winner`
                : undefined
            }
          >
            <div
              className="w-14 h-14 mx-auto mb-2 rounded-xl flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, ${getTeamColor(
                  match.awayTeamId
                )}, ${getTeamColor(match.awayTeamId)}cc)`,
              }}
            >
              <Users className="w-7 h-7 text-white" />
              {awayStreak > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <p className="font-semibold text-sm">
              {getTeamName(match.awayTeamId)}
            </p>
            {awayStreak > 0 && (
              <p className="text-xs text-amber-500 font-medium">
                🔥 {awayStreak} win - 1 more = crown!
              </p>
            )}
            {awayChampionCount > 0 && (
              <p className="text-xs text-muted-foreground">
                👑 ×{awayChampionCount}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
