"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/shared/Icon";
import { TeamMark } from "@/components/shared/TeamMark";
import { TEAM_COLORS } from "@/lib/roster";
import type { PersistentTeam } from "@/types/game";
import { useTeamForm } from "./useTeamForm";

/* The small label over a field. */
const LABEL = "text-caption font-medium text-ink-soft";

interface ColorSwatchesProps {
  value: string;
  onChange: (color: string) => void;
}

/**
 * The team colors as 44px tiles, the chosen one carrying the sprite's check
 * in ink on a small white disc, so it reads on the light colors and the dark
 * ones alike. The form is the only place these are picked, so the swatches
 * live here and not in a shared piece.
 */
const ColorSwatches = ({ value, onChange }: ColorSwatchesProps) => (
  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color selection">
    {TEAM_COLORS.map((color) => {
      const isSelected = value === color;
      return (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={isSelected}
          onClick={() => onChange(color)}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-tile"
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        >
          {isSelected && (
            <span className="flex size-7 items-center justify-center rounded-full bg-surface text-ink">
              <Icon id="check" size={20} />
            </span>
          )}
        </button>
      );
    })}
  </div>
);

interface TeamFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: PersistentTeam | null;
  onSubmit: (name: string, color: string) => void;
}

/**
 * The team form: the name field, the color swatches, and a preview of the
 * team as every screen draws it, its mark in the chosen color beside its name.
 */
export const TeamForm = ({ open, onOpenChange, team, onSubmit }: TeamFormProps) => {
  const {
    name,
    color,
    error,
    isEditing,
    previewName,
    handleNameChange,
    handleColorSelect,
    handleSubmit,
    handleKeyDown,
    handleCancel,
  } = useTeamForm({
    open,
    team,
    onSubmit,
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Icon id="teams" size={18} className="shrink-0" />
            {isEditing ? "Edit Team" : "Create Team"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your team's name and color."
              : "Give your team a name and pick a color."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Team name. The box turns red with the message, focused or not. */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="team-name" className={LABEL}>
              Team Name
            </label>
            <span className={error ? "field border-danger" : "field"}>
              <input
                id="team-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter team name"
                autoFocus
                aria-describedby={error ? "team-name-error" : undefined}
                aria-invalid={!!error}
              />
            </span>
            {error && (
              <p
                id="team-name-error"
                role="alert"
                className="text-caption font-medium text-danger"
              >
                {error}
              </p>
            )}
          </div>

          {/* Team color */}
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>Team Color</span>
            <ColorSwatches value={color} onChange={handleColorSelect} />
          </div>

          {/*
           * Preview: the team's mark in the chosen color, with its initial.
           * The mark picks ink or white for the letter, so yellow reads too.
           */}
          <div className="flex flex-col gap-1.5">
            <span className={LABEL}>Preview</span>
            <div className="flex items-center gap-3 rounded-tile bg-fill p-3">
              <TeamMark name={previewName} color={color} size={44} />
              <span className="min-w-0 truncate text-title font-bold">{previewName}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="sm:flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="sm:flex-1">
            <Icon id="check" size={14} />
            {isEditing ? "Save Changes" : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
