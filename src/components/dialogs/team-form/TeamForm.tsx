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
import { MbIcon } from "@/components/matchbook/MbIcon";
import { TEAM_COLORS } from "@/lib/roster";
import type { PersistentTeam } from "@/types/game";
import { useTeamForm } from "./useTeamForm";

interface ColorSwatchesProps {
  value: string;
  onChange: (color: string) => void;
}

/**
 * The team colors as 44px navy-bordered squares, the chosen one carrying the
 * sprite's check in navy on a small paper-bright disc, so it reads on the
 * light swatches too. The form is the only place these are picked, so the
 * swatches live here rather than in a shared primitive.
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
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-[1.5px] border-mb-navy"
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        >
          {isSelected && (
            <span className="flex size-7 items-center justify-center rounded-full bg-mb-paper-bright text-mb-navy">
              <MbIcon id="check" size={20} />
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
 * The team form: a matchbook name field, the color swatches, and a flat
 * preview block of the team color carrying the name, like the add strip
 * beside it on the Teams page.
 */
export const TeamForm = ({ open, onOpenChange, team, onSubmit }: TeamFormProps) => {
  const {
    name,
    color,
    error,
    isEditing,
    previewInitial,
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
            <MbIcon id="teams" size={18} className="shrink-0" />
            {isEditing ? "Edit Team" : "Create Team"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your team's name and color."
              : "Give your team a name and pick a color."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Team name. The wrapper turns red with the message, focused or not. */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="team-name" className="mb-kicker">
              Team Name
            </label>
            <span className={error ? "mb-input border-mb-red" : "mb-input"}>
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
              <p id="team-name-error" className="text-sm text-mb-red">
                {error}
              </p>
            )}
          </div>

          {/* Team color */}
          <div className="flex flex-col gap-1.5">
            <span className="mb-kicker">Team Color</span>
            <ColorSwatches value={color} onChange={handleColorSelect} />
          </div>

          {/* Preview: a flat block of the team color with the name on it. */}
          <div className="flex flex-col gap-1.5">
            <span className="mb-kicker">Preview</span>
            <div
              className="flex items-center gap-3 rounded-[4px] border-[1.5px] border-mb-navy p-3 text-white"
              style={{ backgroundColor: color }}
            >
              <span className="matchbook-display flex size-11 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] border-mb-paper-bright/70 text-xl font-bold">
                {previewInitial}
              </span>
              <span className="matchbook-display min-w-0 truncate text-lg font-bold">
                {previewName}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="sm:flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="sm:flex-1">
            <MbIcon id="check" size={14} />
            {isEditing ? "Save Changes" : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
