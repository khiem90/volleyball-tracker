"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Users } from "lucide-react";
import type { PersistentTeam } from "@/types/game";

interface CompetitionDraftTeamsProps {
  teams: PersistentTeam[];
}

export const CompetitionDraftTeams = ({ teams }: CompetitionDraftTeamsProps) => (
  <Card className="border-border/40 bg-card/30">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        Participating Teams
      </CardTitle>
    </CardHeader>
    <Separator />
    <CardContent className="pt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
              style={{
                background: `linear-gradient(135deg, ${
                  team.color || "#3b82f6"
                }, ${team.color || "#3b82f6"}99)`,
              }}
            >
              <span className="text-sm font-bold text-white">
                {team.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-medium truncate">{team.name}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
