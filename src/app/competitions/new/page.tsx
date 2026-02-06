"use client";

import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { PageLoadingSpinner } from "@/components/shared";
import { useNewCompetitionPage } from "@/hooks/useNewCompetitionPage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { StepIndicator } from "@/components/competitions/new/StepIndicator";
import { FormatStep } from "@/components/competitions/new/FormatStep";
import { TeamsStep } from "@/components/competitions/new/TeamsStep";
import { NameStep } from "@/components/competitions/new/NameStep";

export default function NewCompetitionPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const {
    competitionName,
    currentFormat,
    formatOptions,
    handleToggleSelectAll,
    handleBack,
    handleBackToCompetitions,
    handleCompetitionNameChange,
    handleCreateCompetition,
    handleFormatSelect,
    handleNext,
    handleQuickCreateTeam,
    handleTeamToggle,
    maxCourts,
    matchSeriesLength,
    nameError,
    numberOfCourts,
    instantWinEnabled,
    allSelected,
    selectedFormat,
    selectedTeamIds,
    setMatchSeriesLength,
    setNumberOfCourts,
    setInstantWinEnabled,
    step,
    teamValidation,
    teams,
    teamsCount,
    advancedSettings,
    advancedSettingsHandlers,
  } = useNewCompetitionPage();

  // Show loading state while checking auth
  if (isLoading || !isAuthenticated) {
    return <PageLoadingSpinner maxWidth="max-w-4xl" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Button
          variant="ghost"
          onClick={handleBackToCompetitions}
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Competitions
        </Button>

        {/* Step Indicator */}
        <StepIndicator step={step} />

        {/* Step Content */}
        {step === "format" && (
          <FormatStep
            formatOptions={formatOptions}
            selectedFormat={selectedFormat}
            onSelectFormat={handleFormatSelect}
            onNext={handleNext}
          />
        )}
        {step === "teams" && (
          <TeamsStep
            teams={teams}
            teamsCount={teamsCount}
            currentFormatLabel={currentFormat?.label}
            teamValidation={teamValidation}
            selectedTeamIds={selectedTeamIds}
            allSelected={allSelected}
            onToggleTeam={handleTeamToggle}
            onToggleSelectAll={handleToggleSelectAll}
            onQuickCreateTeam={handleQuickCreateTeam}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {step === "name" && (
          <NameStep
            competitionName={competitionName}
            currentFormat={currentFormat}
            selectedFormat={selectedFormat}
            selectedTeamIds={selectedTeamIds}
            maxCourts={maxCourts}
            numberOfCourts={numberOfCourts}
            matchSeriesLength={matchSeriesLength}
            instantWinEnabled={instantWinEnabled}
            nameError={nameError}
            onNameChange={handleCompetitionNameChange}
            onBack={handleBack}
            onCreateCompetition={handleCreateCompetition}
            onSelectCourts={setNumberOfCourts}
            onSelectSeriesLength={setMatchSeriesLength}
            onSelectInstantWin={setInstantWinEnabled}
            advancedSettings={advancedSettings}
            advancedSettingsHandlers={advancedSettingsHandlers}
          />
        )}
      </main>
    </div>
  );
}
