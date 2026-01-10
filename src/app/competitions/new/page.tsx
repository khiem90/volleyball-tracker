"use client";

import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Trophy,
  Users,
} from "lucide-react";
import { useNewCompetitionPage } from "@/hooks/useNewCompetitionPage";

export default function NewCompetitionPage() {
  const {
    competitionName,
    currentFormat,
    formatOptions,
    handleBack,
    handleCreateCompetition,
    handleFormatSelect,
    handleNext,
    handleQuickCreateTeam,
    handleTeamToggle,
    maxCourts,
    nameError,
    numberOfCourts,
    selectedFormat,
    selectedTeamIds,
    setCompetitionName,
    setNameError,
    setNumberOfCourts,
    step,
    teamValidation,
    teams,
    teamsCount,
  } = useNewCompetitionPage();

  const renderStepIndicator = () => {
    const steps = ["format", "teams", "name"] as const;

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, idx) => {
          const isActive = s === step;
          const isPast =
            (s === "format" && (step === "teams" || step === "name")) ||
            (s === "teams" && step === "name");
          const labels = ["Format", "Teams", "Name"];

          return (
            <div key={s} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-300
                    ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : ""}
                    ${isPast ? "bg-emerald-500 text-white" : ""}
                    ${!isActive && !isPast ? "bg-card border border-border/50 text-muted-foreground" : ""}
                  `}
                >
                  {isPast ? <Check className="w-5 h-5" /> : idx + 1}
                </div>
                <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {labels[idx]}
                </span>
              </div>
              {idx < 2 && (
                <div
                  className={`w-12 h-0.5 mb-5 ${isPast ? "bg-emerald-500" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFormatStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose Format</h2>
        <p className="text-muted-foreground">Select how teams will compete against each other</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {formatOptions.map((option) => {
          const isSelected = selectedFormat === option.type;

          return (
            <Card
              key={option.type}
              className={`
                cursor-pointer transition-all duration-300 overflow-hidden
                ${isSelected
                  ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                  : "border-border/40 bg-card/50 hover:bg-card hover:border-primary/30"
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
              {isSelected && <div className={`h-1 w-full bg-linear-to-r ${option.gradient}`} />}
              <CardHeader className="text-center pb-2">
                <div
                  className={`
                    w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4
                    transition-all duration-300 shadow-lg
                    ${isSelected
                      ? `bg-linear-to-br ${option.gradient} text-white`
                      : `bg-linear-to-br ${option.gradient} opacity-60 text-white`
                    }
                  `}
                >
                  {option.icon}
                </div>
                <CardTitle className="text-lg">{option.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-sm">
                  {option.description}
                </CardDescription>
                <div className="flex justify-center mt-3">
                  <Badge variant="secondary" className="text-xs">
                    Min {option.minTeams} teams{option.requiresPowerOf2 && " (power of 2)"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={!selectedFormat}
          className="gap-2 shadow-lg shadow-primary/20"
          size="lg"
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
      {teamsCount === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-muted/50 flex items-center justify-center">
            <Users className="w-10 h-10 text-muted-foreground/40" />
          </div>
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
            <Badge 
              variant={teamValidation.valid ? "default" : "secondary"}
              className={teamValidation.valid ? "bg-emerald-500" : ""}
            >
              {teamValidation.message}
            </Badge>
            <Button onClick={handleQuickCreateTeam} variant="ghost" size="sm" className="gap-2">
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
                    ${isSelected
                      ? "ring-2 ring-primary shadow-md"
                      : "border-border/40 bg-card/30 hover:bg-card/60 hover:border-primary/30"
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
                  {isSelected && (
                    <div className="h-1 w-full" style={{ backgroundColor: teamColor }} />
                  )}
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
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
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

  const renderNameStep = () => (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Name Your Competition</h2>
        <p className="text-muted-foreground">Give your competition a memorable name</p>
      </div>

      {/* Summary */}
      <Card className="border-border/40 bg-card/30 overflow-hidden">
        <div className={`h-1 w-full bg-linear-to-r ${currentFormat?.gradient}`} />
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${currentFormat?.gradient} flex items-center justify-center shadow-lg`}>
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-semibold text-lg">{currentFormat?.label}</p>
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
        <Input
          id="competition-name"
          type="text"
          value={competitionName}
          onChange={(e) => {
            setCompetitionName(e.target.value);
            setNameError("");
          }}
          placeholder="e.g., Summer Tournament 2025"
          autoFocus
          className={nameError ? "border-destructive focus-visible:ring-destructive" : ""}
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

      {/* Number of Courts - For Win 2 & Out and 2 Match Rotation */}
      {(selectedFormat === "two_match_rotation" || selectedFormat === "win2out") && maxCourts > 1 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">
            Number of Courts
          </label>
          <p className="text-xs text-muted-foreground">
            Run multiple games simultaneously. More courts = faster rotation.
          </p>
          <div className="flex gap-2">
            {Array.from({ length: Math.min(maxCourts, 4) }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setNumberOfCourts(num)}
                className={`
                  flex-1 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer
                  ${numberOfCourts === num
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card border border-border/40 hover:border-primary/30"
                  }
                `}
              >
                {num} Court{num > 1 ? "s" : ""}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {numberOfCourts * 2} teams play at once, {selectedTeamIds.length - numberOfCourts * 2} in queue
          </p>
        </div>
      )}

      <Separator />

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleCreateCompetition}
          disabled={!competitionName.trim()}
          className="gap-2 shadow-lg shadow-primary/20"
          size="lg"
        >
          <Trophy className="w-5 h-5" />
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
