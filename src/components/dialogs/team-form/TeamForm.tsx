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
import { CREST_PACK_SIZE, crestNameFor } from "./crest";
import { TEAM_CREATE_LABEL } from "./labels";
import { TEAM_NAME_MAX, useTeamForm } from "./useTeamForm";

/* ===========================================================================
   NEW / EDIT TEAM

   The preview is the change worth naming: it used to be a gradient banner with
   a white initial on it — a mark the app renders nowhere else. It is now the
   real matchbook team row, crest and all, so what the dialog shows is what
   `/teams`, the wizard and every scoreboard will draw. The colour is a 3px bar
   beside the crest and nothing more (charter D-9).
   =========================================================================== */

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
  /** Feeds the deterministic default colour — see `nextTeamColor`. */
  const existingColors = useMemo(
    () => state.teams.map((entry) => entry.color),
    [state.teams]
  );

  const {
    name,
    colorCss,
    colorName,
    colorHex,
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
    existingColors,
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
          <span className={MB_FIELD_LABEL.className}>
            Team colour
          </span>
          {/* The picker speaks CSS; the hook stores an id. `colorCss` is the
              translation, so the chip that paints and the value that saves can
              never be the same string again. */}
          <MbSwatchPicker
            value={colorCss ?? ""}
            onChange={handleColorSelect}
            allowCustom
            label="Team colour"
          />
        </div>

        {/* THE PREVIEW AND THE READOUT NOW AGREE.

            They did not. At rest the picker said `SELECTED Rose` and the
            preview beside it drew a green shield with a gold star — the crest
            art, which is fixed by the pack and has nothing to do with the
            chosen ink (charter D-9: colour is a contained accent, it never
            tints or selects the crest). The only rose on screen was a 3px bar
            at the far left edge, which reads as part of the frame.

            Two changes, no new colour anywhere:

            1. The line under the mark NAMES the ink and says which 3px of the
               preview it is. Same word as the picker's readout, one step
               down the page.
            2. The crest is derived from the NAME now (`crestForTeam`), so the
               mark shown here is the mark the team will actually wear. It used
               to hash `previewName` while the created team hashed its
               generated id — a 7-in-8 chance that this preview was of a crest
               nobody was going to get. */}
        <div className="flex flex-col gap-2 border-t border-mb-rule pt-4">
          <span className={MB_FIELD_LABEL.className}>
            Preview
          </span>
          <div className="flex min-h-[44px] items-center gap-3">
            <TeamMark
              team={previewTeam}
              accent={colorCss}
              size="lg"
              wrap
              className="min-w-0 flex-1"
            />
          </div>
          {/* Two lines, not one sentence with a name embedded in it: at 390px
              the row wraps, and a wrapped sentence that begins "is the bar…"
              on its own line reads as a rendering fault. Each line here stands
              up alone wherever it breaks. */}
          <p className="mb-field-hint flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-[2px] border border-mb-navy"
              style={{ background: colorCss }}
            />
            <span className="font-semibold text-mb-navy">{colorName}</span>
            {colorHex && <span className="mb-code-chip tabular-nums">{colorHex}</span>}
            <span className="min-w-0">— the bar beside the crest.</span>
          </p>
          {/* WHAT DRIVES THE CREST, SAID EXACTLY (D2).

              "The crest comes from the pack, chosen by name" is true and still
              left the reader guessing: they pick Navy, a teal shield appears,
              and nothing on screen says whether that is their badge, a
              placeholder, or a fault. The pack is eight designs and the colour
              is forbidden from choosing among them (charter D-9: a contained
              accent, never a tint and never a selector), so the sheet has to
              name the design and name what moves it.

              It names the crest the team will actually wear — the same word for
              the same art everywhere in the app — and says the two operative
              facts in one line: rename to change it, the colour never will. */}
          <p className="mb-field-hint tabular-nums">
            <span className="font-semibold text-mb-navy">
              {crestNameFor(previewName)}
            </span>{" "}
            — one of {CREST_PACK_SIZE} crests, chosen by the name. Rename to
            change it; the colour never does.
          </p>
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
