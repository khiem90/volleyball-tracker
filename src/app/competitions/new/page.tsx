"use client";

import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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
    // Advanced settings
    showAdvancedSettings,
    setShowAdvancedSettings,
    pointsForWin,
    setPointsForWin,
    pointsForTie,
    setPointsForTie,
    pointsForLoss,
    setPointsForLoss,
    allowTies,
    setAllowTies,
    venueName,
    setVenueName,
  } = useNewCompetitionPage();

  // Show loading state while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        </main>
      </div>
    );
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
            showAdvancedSettings={showAdvancedSettings}
            onToggleAdvancedSettings={() => setShowAdvancedSettings(!showAdvancedSettings)}
            pointsForWin={pointsForWin}
            onPointsForWinChange={setPointsForWin}
            pointsForTie={pointsForTie}
            onPointsForTieChange={setPointsForTie}
            pointsForLoss={pointsForLoss}
            onPointsForLossChange={setPointsForLoss}
            allowTies={allowTies}
            onAllowTiesChange={setAllowTies}
            venueName={venueName}
            onVenueNameChange={setVenueName}
          />
        )}
      </main>
    </div>
  );
}
