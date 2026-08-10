"use client";

import { useCallback, useState, type KeyboardEvent, type ChangeEvent } from "react";
import type { PersistentTeam } from "@/types/game";
import { MB_SWATCH_PALETTE } from "@/components/matchbook/form";

/** Team colour is stored as a token reference so it keeps resolving through
 *  `--mb-*` wherever it is painted (invariant 10). `allowCustom` on the picker
 *  is the escape hatch that yields a literal hex for a club's own colour. */
export const TEAM_ACCENTS: readonly string[] = MB_SWATCH_PALETTE.map(
  (swatch) => swatch.value
);

const MIN_NAME_LENGTH = 2;
export const TEAM_NAME_MAX = 40;

interface UseTeamFormProps {
  open: boolean;
  team?: PersistentTeam | null;
  /** Every other team's name, for the non-blocking duplicate warning. */
  existingNames?: string[];
  onSubmit: (name: string, color: string) => void;
  onClose: () => void;
}

export const useTeamForm = ({
  open,
  team,
  existingNames = [],
  onSubmit,
  onClose,
}: UseTeamFormProps) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState(TEAM_ACCENTS[0]);
  const [error, setError] = useState("");

  const isEditing = !!team;

  // Reset form when dialog opens (render-time state adjustment)
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (team) {
        setName(team.name);
        setColor(team.color || TEAM_ACCENTS[0]);
      } else {
        setName("");
        // eslint-disable-next-line react-hooks/purity -- intentional random default color on dialog open
        setColor(TEAM_ACCENTS[Math.floor(Math.random() * TEAM_ACCENTS.length)]);
      }
      setError("");
    }
  }

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
    if (trimmedName.length < MIN_NAME_LENGTH) {
      setError("Team name must be at least 2 characters");
      return;
    }
    onSubmit(trimmedName, color);
    onClose();
  }, [name, color, onSubmit, onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Preview data
  const previewName = name.trim() || "Team name";

  /**
   * A warning, never a block. Two squads can legitimately share a name across
   * seasons, and the app has no uniqueness constraint — so the honest UI is to
   * say it and let the user decide (brief §1.3).
   */
  const duplicate =
    name.trim().length >= MIN_NAME_LENGTH &&
    existingNames.some(
      (existing) =>
        existing.trim().toLowerCase() === name.trim().toLowerCase() &&
        existing.trim().toLowerCase() !== team?.name.trim().toLowerCase()
    );

  return {
    name,
    color,
    error,
    isEditing,
    duplicate,
    previewName,
    handleNameChange,
    handleColorSelect,
    handleSubmit,
    handleKeyDown,
    handleCancel,
  };
};
