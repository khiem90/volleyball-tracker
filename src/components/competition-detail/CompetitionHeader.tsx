"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tournament } from "@/types/game";
import { Calendar, Play, Square, Trophy, Users } from "lucide-react";

interface CompetitionHeaderProps {
  competition: Tournament;
  typeLabel: string;
  canEdit: boolean;
  isStarting: boolean;
  onShowStartConfirm: () => void;
  onShowEndConfirm: () => void;
}

export const CompetitionHeader = ({
  competition,
  typeLabel,
  canEdit,
  isStarting,
  onShowStartConfirm,
  onShowEndConfirm,
}: CompetitionHeaderProps) => (
  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight">
          {competition.name}
        </h1>
        <Badge
          className={`
            ${competition.status === "draft" ? "status-draft" : ""}
            ${competition.status === "live" ? "status-active" : ""}
            ${competition.status === "completed" ? "status-complete" : ""}
          `}
        >
          {competition.status === "draft" && "Draft"}
          {competition.status === "live" && "Live"}
          {competition.status === "completed" && "Completed"}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-primary" />
          {typeLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          {competition.entries.length} teams
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {new Date(competition.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>

    {canEdit && (
      <div className="flex items-center gap-3">
        {competition.status === "draft" && (
          <Button
            onClick={onShowStartConfirm}
            disabled={isStarting}
            className="gap-2 shadow-lg shadow-primary/20"
            size="lg"
          >
            <Play className="w-5 h-5" />
            {isStarting ? "Starting..." : "Start Competition"}
          </Button>
        )}

        {competition.status === "live" && (
          <Button variant="destructive" onClick={onShowEndConfirm} className="gap-2">
            <Square className="w-4 h-4" />
            End Competition
          </Button>
        )}
      </div>
    )}
  </div>
);
