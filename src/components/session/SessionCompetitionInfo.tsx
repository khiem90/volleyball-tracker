"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Play, Trophy, Users } from "lucide-react";
import type { Competition } from "@/types/game";

interface SessionCompetitionInfoProps {
  competition: Competition;
  teamsCount: number;
}

export const SessionCompetitionInfo = ({
  competition,
  teamsCount,
}: SessionCompetitionInfoProps) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            {competition.name}
          </CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="capitalize">
              {competition.type.replace(/_/g, " ")}
            </Badge>
            <Badge
              variant={
                competition.status === "completed"
                  ? "default"
                  : competition.status === "in_progress"
                  ? "secondary"
                  : "outline"
              }
              className="gap-1"
            >
              {competition.status === "completed" && (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {competition.status === "in_progress" && (
                <Play className="w-3 h-3" />
              )}
              {competition.status === "draft" && <Clock className="w-3 h-3" />}
              {competition.status}
            </Badge>
          </CardDescription>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {teamsCount} teams
          </div>
        </div>
      </div>
    </CardHeader>
  </Card>
);
