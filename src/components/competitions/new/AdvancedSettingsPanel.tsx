"use client";

import { memo } from "react";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { TournamentFormat } from "@/types/game";
import type { AdvancedSettings, AdvancedSettingsHandlers } from "@/hooks/useNewCompetitionPage";

type AdvancedSettingsPanelProps = {
  selectedFormat: TournamentFormat | null;
  settings: AdvancedSettings;
  handlers: AdvancedSettingsHandlers;
};

export const AdvancedSettingsPanel = memo(function AdvancedSettingsPanel({
  selectedFormat,
  settings,
  handlers,
}: AdvancedSettingsPanelProps) {
  const showPanel =
    selectedFormat === "round_robin" ||
    selectedFormat === "two_match_rotation" ||
    selectedFormat === "win2out";

  if (!showPanel) return null;

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <button
          type="button"
          onClick={handlers.onToggleAdvancedSettings}
          className="w-full flex items-center justify-between py-2 px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-expanded={settings.showAdvancedSettings}
          aria-controls="advanced-settings-content"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Advanced Settings
          </span>
          {settings.showAdvancedSettings ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {settings.showAdvancedSettings && (
          <div
            id="advanced-settings-content"
            className="space-y-4 p-4 rounded-xl bg-card/30 border border-border/40"
          >
            {/* Standings Points - Only for Round Robin */}
            {selectedFormat === "round_robin" && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Standings Points</label>
                <p className="text-xs text-muted-foreground">
                  Points awarded for a win and a loss. Matches cannot end in a tie.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Win</label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={settings.pointsForWin}
                      onChange={(e) => handlers.onPointsForWinChange(Number(e.target.value))}
                      className="text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Loss</label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={settings.pointsForLoss}
                      onChange={(e) => handlers.onPointsForLossChange(Number(e.target.value))}
                      className="text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Venue Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Venue Name</label>
              <p className="text-xs text-muted-foreground">
                Customize terminology (e.g., court, field, table)
              </p>
              <Input
                type="text"
                value={settings.venueName}
                onChange={(e) => handlers.onVenueNameChange(e.target.value)}
                placeholder="court"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
});
