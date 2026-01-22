"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColorPicker } from "@/components/ui/color-picker";
import { Users, Check } from "lucide-react";
import type { PersistentTeam } from "@/types/game";
import { useTeamForm } from "./useTeamForm";

interface TeamFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: PersistentTeam | null;
  onSubmit: (name: string, color: string) => void;
}

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
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {isEditing ? "Edit Team" : "Create Team"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your team's name and color."
              : "Give your team a name and pick a color."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Team Name Input */}
          <div className="space-y-2">
            <label htmlFor="team-name" className="text-sm font-medium">
              Team Name
            </label>
            <Input
              id="team-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter team name"
              autoFocus
              className={error ? "border-destructive focus-visible:ring-destructive" : ""}
              aria-describedby={error ? "team-name-error" : undefined}
              aria-invalid={!!error}
            />
            {error && (
              <p id="team-name-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Team Color</label>
            <ColorPicker value={color} onChange={handleColorSelect} />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <div
              className="p-4 rounded-xl flex items-center gap-4 text-white relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              }}
            >
              <div className="absolute inset-0 bg-white/5" />
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center relative z-10">
                <span className="text-2xl font-bold">{previewInitial}</span>
              </div>
              <span className="font-semibold text-lg relative z-10">{previewName}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1 gap-2 shadow-lg shadow-primary/20">
            <Check className="w-4 h-4" />
            {isEditing ? "Save Changes" : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
