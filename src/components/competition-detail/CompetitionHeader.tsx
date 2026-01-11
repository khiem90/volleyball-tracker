"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareSession";
import type { Competition } from "@/types/game";
import {
  Calendar,
  Globe,
  Play,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

interface CompetitionHeaderProps {
  competition: Competition;
  typeLabel: string;
  isSharedMode: boolean;
  isCreator: boolean;
  onShowStartConfirm: () => void;
  onShowCreateSession: () => void;
  onShowEndConfirm: () => void;
}

export const CompetitionHeader = ({
  competition,
  typeLabel,
  isSharedMode,
  isCreator,
  onShowStartConfirm,
  onShowCreateSession,
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
            ${competition.status === "in_progress" ? "status-active" : ""}
            ${competition.status === "completed" ? "status-complete" : ""}
          `}
        >
          {competition.status === "draft" && "Draft"}
          {competition.status === "in_progress" && "Live"}
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
          {competition.teamIds.length} teams
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {new Date(competition.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>

    <div className="flex items-center gap-3">
      {competition.status === "draft" && (
        <Button
          onClick={onShowStartConfirm}
          className="gap-2 shadow-lg shadow-primary/20"
          size="lg"
        >
          <Play className="w-5 h-5" />
          Start Competition
        </Button>
      )}

      {competition.status === "in_progress" &&
        (isSharedMode ? (
          <>
            {isCreator && (
              <Button
                variant="destructive"
                onClick={onShowEndConfirm}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                End Competition
              </Button>
            )}
            <ShareButton />
          </>
        ) : (
          <Button
            onClick={onShowCreateSession}
            variant="outline"
            className="gap-2 cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            Share Live
          </Button>
        ))}
    </div>
  </div>
);
