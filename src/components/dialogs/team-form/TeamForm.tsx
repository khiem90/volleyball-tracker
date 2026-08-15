"use client";

import { useMemo, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbNotice } from "@/components/matchbook/Notice";
import { TeamMark } from "@/components/matchbook/Panel";
import {
  MB_FIELD_LABEL,
  MbField,
  MbSwatchPicker,
  MbTextInput,
} from "@/components/matchbook/form";
import { crestForTeam } from "@/components/matchbook/types";
import type { PersistentTeam } from "@/types/game";
import { TEAM_NAME_MAX, useTeamForm } from "./useTeamForm";

/* ===========================================================================
   NEW / EDIT TEAM

   The preview is the change worth naming: it used to be a gradient banner with
   a white initial on it — a mark the app renders nowhere else. It is now the
   real matchbook team row, crest and all, so what the dialog shows is what
   `/teams`, the wizard and every scoreboard will draw. The colour is a 3px bar
   beside the crest and nothing more (charter D-9).
   =========================================================================== */

/**
 * The one name this action answers to, exported so no caller has to retype it.
 *
 * It had three. The masthead key on `/teams` said **ADD TEAM**, the empty
 * states said **CREATE A TEAM**, and the wizard's team step said "Create a
 * team" until the first team existed and then silently became "Add team" — the
 * same button, renamed ninety seconds into a first session, which is what a
 * first-run reader hit.
 *
 * "New team" rather than either of them, for two reasons. **Add** is already
 * spent: `AddEntrantsDialog` and the competition roster use "Add teams" to mean
 * *enter teams that already exist into this competition*, which is a different
 * action on the same nouns. And "Create a team" reads as a first-run
 * instruction — it is odd wording on the twelfth team, which is precisely how
 * the drift started. "New team" is true on the first and the fiftieth.
 *
 * The commit button inside the sheet stays a verb ("Create team"): a trigger
 * names where it goes, a commit names what it does. What must never differ
 * again is the trigger and the sheet it opens.
 */
export const TEAM_CREATE_LABEL = "New team";

interface TeamFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: PersistentTeam | null;
  onSubmit: (name: string, color: string) => void;
}

export const TeamForm = ({ open, onOpenChange, team, onSubmit }: TeamFormProps) => {
  const { state } = useApp();
  const nameRef = useRef<HTMLInputElement | null>(null);

  const existingNames = useMemo(
    () => state.teams.map((entry) => entry.name),
    [state.teams]
  );

  const {
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
  } = useTeamForm({
    open,
    team,
    existingNames,
    onSubmit,
    onClose: () => onOpenChange(false),
  });

  const previewTeam = {
    name: previewName,
    crest: crestForTeam(team?.id ?? previewName, previewName),
  };

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit team" : TEAM_CREATE_LABEL}
      icon="teams"
      kicker="Team directory"
      size="md"
      initialFocus={nameRef}
    >
      <MbDialogBody className="flex flex-col gap-5">
        {/* A callback ref on the wrapper, not on `MbTextInput`: `form.tsx` is
            W1's file and its inputs do not forward a ref. Refs attach in the
            commit phase, ahead of Radix's own focus effect, so `initialFocus`
            still lands on the field rather than on the close button. */}
        <div
          ref={(node) => {
            nameRef.current = node?.querySelector("input") ?? null;
          }}
        >
          <MbField
            label="Team name"
            htmlFor="team-name"
            hint="Shown on every scoreboard and standings table."
            error={error || undefined}
            required
          >
            <MbTextInput
              id="team-name"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Coastal Comets"
              maxLength={TEAM_NAME_MAX}
              autoComplete="off"
              icon="teams"
            />
          </MbField>
        </div>

        {duplicate && (
          <MbNotice tone="warn" title="A team already has this name">
            Two teams with the same name are hard to tell apart in a bracket.
            You can still save it.
          </MbNotice>
        )}

        {/* `MB_FIELD_LABEL`, not `.mb-kicker`. Both blocks below are *fields* —
            a colour choice and the row it produces — and a kicker is an eyebrow
            (design language §2.2). Left as kickers they set the two lower
            labels at 9.92px muted under a 13.6px navy "Team name", so the sheet
            read as one field plus two captions. */}
        <div className="flex flex-col gap-2.5">
          <span className={MB_FIELD_LABEL.className} style={MB_FIELD_LABEL.style}>
            Team colour
          </span>
          <MbSwatchPicker
            value={color}
            onChange={handleColorSelect}
            allowCustom
            label="Team colour"
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-mb-rule pt-4">
          <span className={MB_FIELD_LABEL.className} style={MB_FIELD_LABEL.style}>
            Preview
          </span>
          <div className="flex min-h-[44px] items-center gap-3">
            <TeamMark
              team={previewTeam}
              accent={color}
              size="lg"
              wrap
              className="min-w-0 flex-1"
            />
          </div>
        </div>
      </MbDialogBody>

      <MbDialogFooter>
        <MbButton variant="outline-navy" size="lg" onClick={handleCancel}>
          Cancel
        </MbButton>
        <MbButton variant="coral" size="lg" icon="check" onClick={handleSubmit}>
          {isEditing ? "Save changes" : "Create team"}
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
};
