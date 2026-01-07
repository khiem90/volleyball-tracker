"use client";

import { useState, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PersistentTeam } from "@/types/game";

const TEAM_COLORS = [
  "#3b82f6", // Blue
  "#f97316", // Orange
  "#22c55e", // Green
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#06b6d4", // Cyan
];

interface TeamFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: PersistentTeam | null;
  onSubmit: (name: string, color: string) => void;
}

export const TeamForm = ({ open, onOpenChange, team, onSubmit }: TeamFormProps) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [error, setError] = useState("");

  const isEditing = !!team;

  // Reset form when dialog opens/closes or team changes
  useEffect(() => {
    if (open) {
      if (team) {
        setName(team.name);
        setColor(team.color || TEAM_COLORS[0]);
      } else {
        setName("");
        setColor(TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)]);
      }
      setError("");
    }
  }, [open, team]);

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError("");
  }, []);

  const handleColorSelect = useCallback((selectedColor: string) => {
    setColor(selectedColor);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Team name is required");
      return;
    }
    if (trimmedName.length < 2) {
      setError("Team name must be at least 2 characters");
      return;
    }
    onSubmit(trimmedName, color);
    onOpenChange(false);
  }, [name, color, onSubmit, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Team" : "Create Team"}</DialogTitle>
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
            <input
              id="team-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter team name"
              autoFocus
              className={`
                w-full px-4 py-3 rounded-lg
                bg-card border transition-all duration-200
                outline-none focus:ring-2
                ${error
                  ? "border-destructive focus:ring-destructive/30"
                  : "border-border/50 focus:border-primary focus:ring-primary/30"
                }
              `}
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Team Color</label>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorSelect(c)}
                  className={`
                    w-10 h-10 rounded-lg transition-all duration-200
                    hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${color === c ? "ring-2 ring-offset-2 ring-white scale-110" : ""}
                  `}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                  aria-pressed={color === c}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <div
              className="p-4 rounded-xl flex items-center gap-3 text-white"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}99)`,
              }}
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-xl font-bold">
                  {name.trim().charAt(0).toUpperCase() || "T"}
                </span>
              </div>
              <span className="font-semibold text-lg">
                {name.trim() || "Team Name"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {isEditing ? "Save Changes" : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

