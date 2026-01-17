"use client";

import { ArrowLeft, ArrowRight, Check, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PersistentTeam } from "@/types/game";

interface TeamValidation {
  valid: boolean;
  message: string;
}

interface TeamsStepProps {
  teams: PersistentTeam[];
  teamsCount: number;
  currentFormatLabel?: string;
  teamValidation: TeamValidation;
  selectedTeamIds: string[];
  allSelected: boolean;
  onToggleTeam: (teamId: string) => void;
  onToggleSelectAll: () => void;
  onQuickCreateTeam: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const TeamsStep = ({
  teams,
  teamsCount,
  currentFormatLabel,
  teamValidation,
  selectedTeamIds,
  allSelected,
  onToggleTeam,
  onToggleSelectAll,
  onQuickCreateTeam,
  onNext,
  onBack,
}: TeamsStepProps) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold mb-2">Select Teams</h2>
      <p className="text-muted-foreground">
        Choose which teams will participate in this{" "}
        {currentFormatLabel?.toLowerCase()}
      </p>
    </div>

    {teamsCount === 0 ? (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-muted/50 flex items-center justify-center">
          <Users className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No teams available</h3>
        <p className="text-muted-foreground mb-4">
          Create some teams first to build a competition.
        </p>
        <Button
          onClick={onQuickCreateTeam}
          variant="outline"
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          Quick Create Team
        </Button>
      </div>
    ) : (
      <>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Badge
            variant={teamValidation.valid ? "default" : "secondary"}
            className={teamValidation.valid ? "bg-emerald-500" : ""}
          >
            {teamValidation.message}
          </Badge>
          <Button
            onClick={onToggleSelectAll}
            variant="outline"
            size="sm"
            aria-pressed={allSelected}
          >
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
          <Button
            onClick={onQuickCreateTeam}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <Users className="w-4 h-4" />
            Quick Add Team
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {teams.map((team) => {
            const isSelected = selectedTeamIds.includes(team.id);
            const teamColor = team.color || "#3b82f6";

            return (
              <Card
                key={team.id}
                className={`
                  cursor-pointer transition-all duration-200 overflow-hidden
                  ${
                    isSelected
                      ? "ring-2 ring-primary shadow-md"
                      : "border-border/40 bg-card/30 hover:bg-card/60 hover:border-primary/30"
                  }
                `}
                onClick={() => onToggleTeam(team.id)}
                role="checkbox"
                tabIndex={0}
                aria-checked={isSelected}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggleTeam(team.id);
                  }
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-md relative"
                      style={{
                        background: `linear-gradient(135deg, ${teamColor}, ${teamColor}99)`,
                      }}
                    >
                      {isSelected ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {team.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="font-medium truncate">{team.name}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </>
    )}

    <div className="flex justify-between pt-4">
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
      <Button
        onClick={onNext}
        disabled={!teamValidation.valid}
        className="gap-2 shadow-lg shadow-primary/20"
        size="lg"
      >
        Next
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  </div>
);
