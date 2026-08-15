"use client";

import { useCallback, useState, type KeyboardEvent, type ChangeEvent } from "react";
import type { PersistentTeam } from "@/types/game";
import {
  DEFAULT_TEAM_COLOR,
  nextTeamColor,
  normalizeTeamColor,
  teamColorCss,
  teamColorHex,
  teamColorName,
} from "@/lib/teamColor";

const MIN_NAME_LENGTH = 2;
export const TEAM_NAME_MAX = 40;

interface UseTeamFormProps {
  open: boolean;
  team?: PersistentTeam | null;
  /** Every other team's name, for the non-blocking duplicate warning. */
  existingNames?: string[];
  /**
   * Every other team's stored colour. The default for a new team is the ink
   * this roster is using least (`nextTeamColor`), so it is deterministic and
   * so the first six teams of an account are six different colours.
   */
  existingColors?: Array<string | undefined>;
  onSubmit: (name: string, color: string) => void;
  onClose: () => void;
}

export const useTeamForm = ({
  open,
  team,
  existingNames = [],
  existingColors = [],
  onSubmit,
  onClose,
}: UseTeamFormProps) => {
  const [name, setName] = useState("");
  /**
   * Holds the STORED form — an ink id like `"rose"`, or a hex for a hand-mixed
   * colour — not the CSS the swatch paints. `handleColorSelect` normalises on
   * the way in and `colorCss` resolves on the way out, so the value this hook
   * hands to `onSubmit` is the value that belongs in `PersistentTeam.color`.
   */
  const [color, setColor] = useState<string>(DEFAULT_TEAM_COLOR);
  const [error, setError] = useState("");

  const isEditing = !!team;

  // Reset form when dialog opens (render-time state adjustment)
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (team) {
        /* Normalised on the way in, so a team saved before the palette had ids
           — `color-mix(in oklab, var(--mb-plum) 50%, var(--mb-red))` — opens
           with Rose already selected instead of with nothing selected, and
           saving it again writes the id rather than the expression. */
        setName(team.name);
        setColor(normalizeTeamColor(team.color) || DEFAULT_TEAM_COLOR);
      } else {
        setName("");
        setColor(nextTeamColor(existingColors));
      }
      setError("");
    }
  }

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError("");
  }, []);

  /* `MbSwatchPicker` speaks CSS — its chips ARE the paint. Normalising here is
     the boundary where a paint value becomes a stored value, and it is the
     reason `onSubmit` can no longer hand a `color-mix()` to the reducer. */
  const handleColorSelect = useCallback((selectedColor: string) => {
    setColor(normalizeTeamColor(selectedColor));
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
    /** The stored form. Give this to `onSubmit`, never to a `style`. */
    color,
    /** The paint. Give this to `MbSwatchPicker` and to the preview's accent. */
    colorCss: teamColorCss(color),
    /** The word. "Rose", or "Custom" for a hand-mixed hex. */
    colorName: teamColorName(color),
    /** Set only for a hand-mixed colour, which has no name to print. */
    colorHex: teamColorHex(color),
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
