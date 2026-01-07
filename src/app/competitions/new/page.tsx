"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Trophy,
  Users,
  RefreshCw,
  Brackets,
  Layers,
  Crown,
} from "lucide-react";
import type { CompetitionType, PersistentTeam } from "@/types/game";

type Step = "format" | "teams" | "name";

interface FormatOption {
  type: CompetitionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  minTeams: number;
  requiresPowerOf2?: boolean;
}

const formatOptions: FormatOption[] = [
  {
    type: "round_robin",
    label: "Round Robin",
    description: "Every team plays against every other team once. Best for leagues.",
    icon: <RefreshCw className="w-8 h-8" />,
    minTeams: 3,
  },
  {
    type: "single_elimination",
    label: "Single Elimination",
    description: "Lose once and you're out. Fast and exciting tournament format.",
    icon: <Brackets className="w-8 h-8" />,
    minTeams: 2,
    requiresPowerOf2: true,
  },
  {
    type: "double_elimination",
    label: "Double Elimination",
    description: "Must lose twice to be eliminated. More forgiving tournament format.",
    icon: <Layers className="w-8 h-8" />,
    minTeams: 4,
    requiresPowerOf2: true,
  },
  {
    type: "win2out",
    label: "Win 2 & Out",
    description: "Endless mode! Winner stays, loser goes to back of queue. Win 2 in a row = champion!",
    icon: <Crown className="w-8 h-8" />,
    minTeams: 3,
  },
];

export default function NewCompetitionPage() {
  const router = useRouter();
  const { state, addTeam } = useApp();
  const [step, setStep] = useState<Step>("format");
  const [selectedFormat, setSelectedFormat] = useState<CompetitionType | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [competitionName, setCompetitionName] = useState("");
  const [nameError, setNameError] = useState("");

  const { createCompetition, addMatches, startCompetition } = useApp();

  const currentFormat = useMemo(
    () => formatOptions.find((f) => f.type === selectedFormat),
    [selectedFormat]
  );

  const isPowerOf2 = useCallback((n: number) => {
    return n > 0 && (n & (n - 1)) === 0;
  }, []);

  const nextPowerOf2 = useCallback((n: number) => {
    let power = 1;
    while (power < n) power *= 2;
    return power;
  }, []);

  const teamValidation = useMemo(() => {
    if (!currentFormat) return { valid: false, message: "" };

    const count = selectedTeamIds.length;
    if (count < currentFormat.minTeams) {
      return {
        valid: false,
        message: `Select at least ${currentFormat.minTeams} teams`,
      };
    }

    if (currentFormat.requiresPowerOf2 && !isPowerOf2(count)) {
      const next = nextPowerOf2(count);
      return {
        valid: false,
        message: `Select ${next} teams for a balanced bracket (power of 2)`,
      };
    }

    return { valid: true, message: `${count} teams selected` };
  }, [currentFormat, selectedTeamIds, isPowerOf2, nextPowerOf2]);

  const handleFormatSelect = useCallback((type: CompetitionType) => {
    setSelectedFormat(type);
  }, []);

  const handleTeamToggle = useCallback((teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  }, []);

  const handleNext = useCallback(() => {
    if (step === "format" && selectedFormat) {
      setStep("teams");
    } else if (step === "teams" && teamValidation.valid) {
      setStep("name");
    }
  }, [step, selectedFormat, teamValidation.valid]);

  const handleBack = useCallback(() => {
    if (step === "teams") {
      setStep("format");
    } else if (step === "name") {
      setStep("teams");
    }
  }, [step]);

  const handleCreateCompetition = useCallback(() => {
    const trimmedName = competitionName.trim();
    if (!trimmedName) {
      setNameError("Competition name is required");
      return;
    }
    if (!selectedFormat) return;

    // Create competition
    createCompetition(trimmedName, selectedFormat, selectedTeamIds);

    // Get the newly created competition (it will be the last one)
    // We need to generate matches based on format type
    // This will be handled in the competition detail page

    router.push("/competitions");
  }, [competitionName, selectedFormat, selectedTeamIds, createCompetition, router]);

  const handleQuickCreateTeam = useCallback(() => {
    const teamNumber = state.teams.length + 1;
    addTeam(`Team ${teamNumber}`);
  }, [state.teams.length, addTeam]);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {["format", "teams", "name"].map((s, idx) => {
        const isActive = s === step;
        const isPast =
          (s === "format" && (step === "teams" || step === "name")) ||
          (s === "teams" && step === "name");

        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                transition-all duration-300
                ${isActive ? "bg-primary text-primary-foreground" : ""}
                ${isPast ? "bg-emerald-500 text-white" : ""}
                ${!isActive && !isPast ? "bg-card border border-border/50 text-muted-foreground" : ""}
              `}
            >
              {isPast ? <Check className="w-4 h-4" /> : idx + 1}
            </div>
            {idx < 2 && (
              <div
                className={`w-12 h-0.5 ${isPast ? "bg-emerald-500" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderFormatStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose Format</h2>
        <p className="text-muted-foreground">Select how teams will compete against each other</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {formatOptions.map((option) => {
          const isSelected = selectedFormat === option.type;

          return (
            <Card
              key={option.type}
              className={`
                cursor-pointer transition-all duration-300
                ${isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border/50 bg-card/50 hover:bg-card hover:border-primary/30"
                }
              `}
              onClick={() => handleFormatSelect(option.type)}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleFormatSelect(option.type);
                }
              }}
            >
              <CardHeader className="text-center pb-2">
                <div
                  className={`
                    w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-4
                    transition-all duration-300
                    ${isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-gradient-to-br from-violet-500/20 to-purple-600/20 text-violet-400"
                    }
                  `}
                >
                  {option.icon}
                </div>
                <CardTitle className="text-lg">{option.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  {option.description}
                </CardDescription>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Min {option.minTeams} teams
                  {option.requiresPowerOf2 && " (power of 2)"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={!selectedFormat}
          className="gap-2"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderTeamsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Select Teams</h2>
        <p className="text-muted-foreground">
          Choose which teams will participate in this {currentFormat?.label.toLowerCase()}
        </p>
      </div>

      {/* Team Selection */}
      {state.teams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-2">No teams available</h3>
          <p className="text-muted-foreground mb-4">Create some teams first to build a competition.</p>
          <Button onClick={handleQuickCreateTeam} variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            Quick Create Team
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p
              className={`text-sm ${teamValidation.valid ? "text-emerald-500" : "text-muted-foreground"}`}
            >
              {teamValidation.message}
            </p>
            <Button onClick={handleQuickCreateTeam} variant="ghost" size="sm" className="gap-2">
              <Users className="w-4 h-4" />
              Quick Add Team
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {state.teams.map((team) => {
              const isSelected = selectedTeamIds.includes(team.id);
              const teamColor = team.color || "#3b82f6";

              return (
                <Card
                  key={team.id}
                  className={`
                    cursor-pointer transition-all duration-200
                    ${isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border/50 bg-card/30 hover:bg-card/60"
                    }
                  `}
                  onClick={() => handleTeamToggle(team.id)}
                  role="checkbox"
                  tabIndex={0}
                  aria-checked={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTeamToggle(team.id);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${teamColor}, ${teamColor}99)`,
                        }}
                      >
                        {isSelected ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <Users className="w-5 h-5 text-white/70" />
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
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!teamValidation.valid}
          className="gap-2"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const renderNameStep = () => (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Name Your Competition</h2>
        <p className="text-muted-foreground">Give your competition a memorable name</p>
      </div>

      {/* Summary */}
      <Card className="border-border/50 bg-card/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium">{currentFormat?.label}</p>
              <p className="text-sm text-muted-foreground">
                {selectedTeamIds.length} teams competing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name Input */}
      <div className="space-y-2">
        <label htmlFor="competition-name" className="text-sm font-medium">
          Competition Name
        </label>
        <input
          id="competition-name"
          type="text"
          value={competitionName}
          onChange={(e) => {
            setCompetitionName(e.target.value);
            setNameError("");
          }}
          placeholder="e.g., Summer Tournament 2025"
          autoFocus
          className={`
            w-full px-4 py-3 rounded-lg text-lg
            bg-card border transition-all duration-200
            outline-none focus:ring-2
            ${nameError
              ? "border-destructive focus:ring-destructive/30"
              : "border-border/50 focus:border-primary focus:ring-primary/30"
            }
          `}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCreateCompetition();
            }
          }}
        />
        {nameError && (
          <p className="text-sm text-destructive">{nameError}</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleCreateCompetition}
          disabled={!competitionName.trim()}
          className="gap-2"
        >
          <Trophy className="w-4 h-4" />
          Create Competition
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Button
          variant="ghost"
          onClick={() => router.push("/competitions")}
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Competitions
        </Button>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        {step === "format" && renderFormatStep()}
        {step === "teams" && renderTeamsStep()}
        {step === "name" && renderNameStep()}
      </main>
    </div>
  );
}

