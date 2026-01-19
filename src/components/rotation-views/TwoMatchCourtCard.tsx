"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Play, Pencil, Zap } from "lucide-react";
import type { Match } from "@/types/game";

interface TwoMatchCourtCardProps {
  match: Match;
  courtNumber: number;
  isFirstMatch?: boolean;
  homeSessionDisplay: string;
  awaySessionDisplay: string;
  getTeamName: (teamId: string) => string;
  getTeamColor: (teamId: string) => string;
  canEdit: boolean;
  canPlayMatch: boolean;
  instantWinEnabled?: boolean;
  onMatchClick?: (match: Match) => void;
  onEditMatch?: (match: Match) => void;
  onInstantWin?: (winnerId: string) => void;
}

export const TwoMatchCourtCard = memo(function TwoMatchCourtCard({
  match,
  courtNumber,
  isFirstMatch = false,
  homeSessionDisplay,
  awaySessionDisplay,
  getTeamName,
  getTeamColor,
  canEdit,
  canPlayMatch,
  instantWinEnabled,
  onMatchClick,
  onEditMatch,
  onInstantWin,
}: TwoMatchCourtCardProps) {
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
            Court {courtNumber}
          </div>
          <div className="flex items-center gap-2">
            {isFirstMatch && (
              <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full">
                First Match
              </span>
            )}
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
          </div>
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
            canPlayMatch && !instantWinEnabled ? `Click to play match on Court ${courtNumber}` : undefined
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
              className="w-14 h-14 mx-auto mb-2 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${getTeamColor(
                  match.homeTeamId
                )}, ${getTeamColor(match.homeTeamId)}cc)`,
              }}
            >
              <Users className="w-7 h-7 text-white" />
            </div>
            <p className="font-semibold text-sm">
              {getTeamName(match.homeTeamId)}
            </p>
            <p className="text-xs text-muted-foreground">{homeSessionDisplay}</p>
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
              className="w-14 h-14 mx-auto mb-2 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${getTeamColor(
                  match.awayTeamId
                )}, ${getTeamColor(match.awayTeamId)}cc)`,
              }}
            >
              <Users className="w-7 h-7 text-white" />
            </div>
            <p className="font-semibold text-sm">
              {getTeamName(match.awayTeamId)}
            </p>
            <p className="text-xs text-muted-foreground">{awaySessionDisplay}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
