"use client";

import { useState, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import type { PersistentTeam } from "@/types/game";
import { DEFAULT_TEAM_COLORS } from "@/components/ui/color-picker";

interface UseTeamFormProps {
  open: boolean;
  team?: PersistentTeam | null;
  onSubmit: (name: string, color: string) => void;
  onClose: () => void;
}

export const useTeamForm = ({ open, team, onSubmit, onClose }: UseTeamFormProps) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_TEAM_COLORS[0]);
  const [error, setError] = useState("");

  const isEditing = !!team;

  // Reset form when dialog opens/closes or team changes
  useEffect(() => {
    if (open) {
      if (team) {
        setName(team.name);
        setColor(team.color || DEFAULT_TEAM_COLORS[0]);
      } else {
        setName("");
        setColor(DEFAULT_TEAM_COLORS[Math.floor(Math.random() * DEFAULT_TEAM_COLORS.length)]);
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
    onClose();
  }, [name, color, onSubmit, onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Preview data
  const previewInitial = name.trim().charAt(0).toUpperCase() || "T";
  const previewName = name.trim() || "Team Name";

  return {
    // State
    name,
    color,
    error,
    isEditing,

    // Preview data
    previewInitial,
    previewName,

    // Actions
    handleNameChange,
    handleColorSelect,
    handleSubmit,
    handleKeyDown,
    handleCancel,
  };
};
