"use client";

import { ArrowLeft, Trophy, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { CompetitionType } from "@/types/game";
import type { FormatOption } from "@/hooks/useNewCompetitionPage";

interface NameStepProps {
  competitionName: string;
  currentFormat: FormatOption | undefined;
  selectedFormat: CompetitionType | null;
  selectedTeamIds: string[];
  maxCourts: number;
  numberOfCourts: number;
  matchSeriesLength: number;
  instantWinEnabled: boolean;
  nameError: string;
  onNameChange: (value: string) => void;
  onBack: () => void;
  onCreateCompetition: () => void;
  onSelectCourts: (count: number) => void;
  onSelectSeriesLength: (count: number) => void;
  onSelectInstantWin: (enabled: boolean) => void;
  // Advanced settings
  showAdvancedSettings: boolean;
  onToggleAdvancedSettings: () => void;
  pointsForWin: number;
  onPointsForWinChange: (value: number) => void;
  pointsForTie: number;
  onPointsForTieChange: (value: number) => void;
  pointsForLoss: number;
  onPointsForLossChange: (value: number) => void;
  allowTies: boolean;
  onAllowTiesChange: (value: boolean) => void;
  venueName: string;
  onVenueNameChange: (value: string) => void;
}

export const NameStep = ({
  competitionName,
  currentFormat,
  selectedFormat,
  selectedTeamIds,
  maxCourts,
  numberOfCourts,
  matchSeriesLength,
  instantWinEnabled,
  nameError,
  onNameChange,
  onBack,
  onCreateCompetition,
  onSelectCourts,
  onSelectSeriesLength,
  onSelectInstantWin,
  showAdvancedSettings,
  onToggleAdvancedSettings,
  pointsForWin,
  onPointsForWinChange,
  pointsForTie,
  onPointsForTieChange,
  pointsForLoss,
  onPointsForLossChange,
  allowTies,
  onAllowTiesChange,
  venueName,
  onVenueNameChange,
}: NameStepProps) => (
  <div className="space-y-6 max-w-md mx-auto">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold mb-2">Name Your Competition</h2>
      <p className="text-muted-foreground">
        Give your competition a memorable name
      </p>
    </div>

    <Card className="border-border/40 bg-card/30 overflow-hidden">
      <div className={`h-1 w-full bg-linear-to-r ${currentFormat?.gradient}`} />
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl bg-linear-to-br ${currentFormat?.gradient} flex items-center justify-center shadow-lg`}
          >
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

    <div className="space-y-2">
      <label htmlFor="competition-name" className="text-sm font-medium">
        Competition Name
      </label>
      <Input
        id="competition-name"
        type="text"
        value={competitionName}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="e.g., Summer Tournament 2025"
        autoFocus
        className={nameError ? "border-destructive focus-visible:ring-destructive" : ""}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onCreateCompetition();
          }
        }}
      />
      {nameError && <p className="text-sm text-destructive">{nameError}</p>}
    </div>

    {(selectedFormat === "two_match_rotation" || selectedFormat === "win2out") &&
      maxCourts > 1 && (
        <div className="space-y-3">
          <label className="text-sm font-medium">Number of {venueName}s</label>
          <p className="text-xs text-muted-foreground">
            Run multiple games simultaneously. More {venueName}s = faster rotation.
          </p>
          <div className="flex gap-2">
            {Array.from({ length: Math.min(maxCourts, 4) }, (_, i) => i + 1).map(
              (num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onSelectCourts(num)}
                  className={`
                    flex-1 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer
                    ${
                      numberOfCourts === num
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-card border border-border/40 hover:border-primary/30"
                    }
                  `}
                >
                  {num} {venueName}{num > 1 ? "s" : ""}
                </button>
              )
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {numberOfCourts * 2} teams play at once,{" "}
            {selectedTeamIds.length - numberOfCourts * 2} in queue
          </p>
        </div>
      )}

    {(selectedFormat === "two_match_rotation" || selectedFormat === "win2out") && (
      <div className="space-y-3">
        <label className="text-sm font-medium">Scoring Mode</label>
        <p className="text-xs text-muted-foreground">
          Choose how match winners are determined.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSelectInstantWin(false)}
            className={`
              flex-1 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer
              ${
                !instantWinEnabled
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card border border-border/40 hover:border-primary/30"
              }
            `}
          >
            Score Points
          </button>
          <button
            type="button"
            onClick={() => onSelectInstantWin(true)}
            className={`
              flex-1 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer
              ${
                instantWinEnabled
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card border border-border/40 hover:border-primary/30"
              }
            `}
          >
            Instant Win
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {instantWinEnabled
            ? "Tap a team to instantly declare them winner"
            : "Track points and complete matches manually"}
        </p>
      </div>
    )}

    {(selectedFormat === "round_robin" ||
      selectedFormat === "single_elimination" ||
      selectedFormat === "double_elimination") && (
      <div className="space-y-3">
        <label className="text-sm font-medium">Matches per Matchup</label>
        <p className="text-xs text-muted-foreground">
          Choose how many games teams play to decide a winner (best of).
        </p>
        <div className="flex gap-2">
          {[1, 3, 5, 7].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onSelectSeriesLength(count)}
              className={`
                flex-1 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer
                ${
                  matchSeriesLength === count
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card border border-border/40 hover:border-primary/30"
                }
              `}
            >
              {count === 1 ? "Single Game" : `Best of ${count}`}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Advanced Settings - Show for formats that need customization */}
    {(selectedFormat === "round_robin" ||
      selectedFormat === "two_match_rotation" ||
      selectedFormat === "win2out") && (
      <>
        <Separator />
        <div className="space-y-4">
          <button
            type="button"
            onClick={onToggleAdvancedSettings}
            className="w-full flex items-center justify-between py-2 px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Advanced Settings
            </span>
            {showAdvancedSettings ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showAdvancedSettings && (
            <div className="space-y-4 p-4 rounded-xl bg-card/30 border border-border/40">
              {/* Standings Points - Only for Round Robin */}
              {selectedFormat === "round_robin" && (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Standings Points</label>
                    <p className="text-xs text-muted-foreground">
                      Configure points awarded for wins, ties, and losses.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Win</label>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={pointsForWin}
                          onChange={(e) => onPointsForWinChange(Number(e.target.value))}
                          className="text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Tie</label>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={pointsForTie}
                          onChange={(e) => onPointsForTieChange(Number(e.target.value))}
                          className="text-center"
                          disabled={!allowTies}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Loss</label>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={pointsForLoss}
                          onChange={(e) => onPointsForLossChange(Number(e.target.value))}
                          className="text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Allow Ties */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Allow Ties</label>
                      <p className="text-xs text-muted-foreground">
                        Enable if matches can end in a draw
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAllowTiesChange(!allowTies)}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer
                        ${allowTies ? "bg-primary" : "bg-muted"}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${allowTies ? "translate-x-6" : "translate-x-1"}
                        `}
                      />
                    </button>
                  </div>
                </>
              )}

              {/* Venue Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Venue Name</label>
                <p className="text-xs text-muted-foreground">
                  Customize terminology (e.g., court, field, table)
                </p>
                <Input
                  type="text"
                  value={venueName}
                  onChange={(e) => onVenueNameChange(e.target.value)}
                  placeholder="court"
                />
              </div>
            </div>
          )}
        </div>
      </>
    )}

    <Separator />

    <div className="flex justify-between pt-2">
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
      <Button
        onClick={onCreateCompetition}
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
