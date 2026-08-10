"use client";

import { useId, useState } from "react";
import type {
  FormationValidationError,
  FormationVisibility,
  PlayerRole,
} from "@/lib/volleyball/types";
import { MbButton } from "@/components/matchbook/Button";
import { MbIconButton } from "@/components/matchbook/IconButton";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbNotice } from "@/components/matchbook/Notice";
import { PanelEmpty } from "@/components/matchbook/Panel";
import { MbSegmented } from "@/components/matchbook/Segmented";
import {
  MbField,
  MbSelect,
  MbTagInput,
  MbTextArea,
  MbTextInput,
} from "@/components/matchbook/form";
import { MbRoleChip } from "@/components/matchbook/court/MbPlayerToken";

/* ===========================================================================
   EDITOR TOOL PANELS

   `ArrowControls`, `QuickActions`, `FormationDetails` and `ValidationPanel`,
   rebuilt on the kit. Two behavioural fixes travel with the restyle:

     THE VALIDATION LIST IS COMPLETE. It capped at 3 errors and 5 warnings with
     "…and N more" and no way to reach the rest, which leaves a user unable to
     fix what they cannot see. It now shows a summary and a full, scrollable
     list behind one disclosure.

     THE ARROW REMOVE KEY IS A REAL TARGET. It was `p-0.5` around a 12px glyph.
     =========================================================================== */

/* ------------------------------------------------------------ frame actions */

export const FrameActions = ({
  onCopy,
  onPaste,
  onReset,
  onApplyAll,
  hasCopiedFrame,
}: {
  onCopy: () => void;
  onPaste: () => void;
  onReset: () => void;
  onApplyAll: () => void;
  hasCopiedFrame: boolean;
}) => (
  <div className="grid grid-cols-2 gap-2 p-4">
    <MbButton variant="outline-navy" icon="copy" onClick={onCopy}>
      Copy Frame
    </MbButton>
    <MbButton
      variant="outline-navy"
      icon="clipboard"
      onClick={onPaste}
      disabled={!hasCopiedFrame}
    >
      Paste Frame
    </MbButton>
    <MbButton variant="outline-navy" icon="grid" onClick={onApplyAll}>
      Apply To All 6
    </MbButton>
    <MbButton variant="outline-navy" icon="undo" onClick={onReset}>
      Reset Rotation
    </MbButton>
  </div>
);

/* -------------------------------------------------------------------- arrows */

export const ArrowsPanel = ({
  arrows,
  isDrawing,
  arrowStartRole,
  onStartDrawing,
  onStopDrawing,
  onCancel,
  onRemove,
  backRow,
}: {
  arrows: PlayerRole[];
  isDrawing: boolean;
  arrowStartRole: PlayerRole | null;
  onStartDrawing: () => void;
  onStopDrawing: () => void;
  onCancel: () => void;
  onRemove: (role: PlayerRole) => void;
  /** Row lookup, so the chips draw the same token the court does. */
  backRow: (role: PlayerRole) => boolean;
}) => (
  <div className="flex flex-col gap-3 p-4">
    {isDrawing ? (
      <>
        {/* A static instruction, not the old `animate-pulse` chip: an infinite
            animation is banned outright except for the live dot (invariant 45). */}
        <MbNotice tone="info" icon="arrow-move">
          {arrowStartRole
            ? `Tap where ${arrowStartRole} should end up. Escape cancels.`
            : "Tap the player who moves, then tap the spot they move to."}
        </MbNotice>
        <div className="grid grid-cols-2 gap-2">
          <MbButton variant="navy" icon="check" onClick={onStopDrawing}>
            Done
          </MbButton>
          <MbButton variant="outline-navy" icon="close" onClick={onCancel}>
            Cancel
          </MbButton>
        </div>
      </>
    ) : (
      <MbButton variant="outline-navy" icon="arrow-move" onClick={onStartDrawing} fullWidth>
        Draw Movement Arrow
      </MbButton>
    )}

    {arrows.length === 0 ? (
      <p className="text-[0.74rem] leading-snug text-mb-ink-muted">
        No arrows exist on this frame yet — draw one to show where a player
        moves after serve contact.
      </p>
    ) : (
      <ul className="flex flex-col divide-y divide-mb-rule border-y border-mb-rule">
        {arrows.map((role) => (
          <li key={role} className="flex items-center gap-2.5 py-1.5">
            <MbRoleChip role={role} row={backRow(role) ? "back" : "front"} size={26} />
            <span className="matchbook-display min-w-0 flex-1 truncate text-[0.78rem] font-bold tracking-[0.04em]">
              {role}
            </span>
            <MbIconButton
              icon="trash"
              label={`Remove the ${role} arrow`}
              onClick={() => onRemove(role)}
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);

/* ------------------------------------------------------------------- details */

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "unlisted", label: "Link Only" },
];

export const DetailsPanel = ({
  name,
  description,
  tags,
  visibility,
  onNameChange,
  onDescriptionChange,
  onTagsChange,
  onVisibilityChange,
  nameError,
}: {
  name: string;
  description: string;
  tags: string[];
  visibility: FormationVisibility;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTagsChange: (value: string[]) => void;
  onVisibilityChange: (value: FormationVisibility) => void;
  nameError?: string;
}) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-4 p-4">
      <MbField label="Name" htmlFor={`${id}-name`} required error={nameError}>
        <MbTextInput
          id={`${id}-name`}
          value={name}
          maxLength={80}
          placeholder="Friday night 5-1"
          onChange={(event) => onNameChange(event.target.value)}
        />
      </MbField>

      <MbField
        label="Description"
        htmlFor={`${id}-description`}
        hint="What this shape is for, in one line."
      >
        <MbTextArea
          id={`${id}-description`}
          rows={3}
          maxLength={280}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
      </MbField>

      {/* No `hint` — `MbTagInput` prints its own "Enter or comma adds a tag."
          under the field, and an `MbField` hint saying the same thing rendered
          the sentence twice. */}
      <MbField label="Tags" htmlFor={`${id}-tags`}>
        <MbTagInput id={`${id}-tags`} value={tags} onChange={onTagsChange} max={8} />
      </MbField>

      <MbField
        label="Visibility"
        htmlFor={`${id}-visibility`}
        hint="Link only creates a share link. It never appears in search."
      >
        <MbSegmented
          name={`${id}-visibility`}
          aria-labelledby={`${id}-visibility`}
          value={visibility}
          onChange={(value) => onVisibilityChange(value as FormationVisibility)}
          options={VISIBILITY_OPTIONS}
          columns={{ base: 2, sm: 2 }}
        />
      </MbField>
    </div>
  );
};

/* ---------------------------------------------------------------- validation */

const errorLine = (error: FormationValidationError) =>
  [
    error.rotation ? `R${error.rotation}` : null,
    error.mode ? (error.mode === "serving" ? "Serving" : "Receiving") : null,
    error.role,
  ]
    .filter(Boolean)
    .join(" · ");

export const ValidationPanel = ({
  blockingErrors,
  overlapWarnings,
}: {
  blockingErrors: FormationValidationError[];
  overlapWarnings: FormationValidationError[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const total = blockingErrors.length + overlapWarnings.length;

  if (total === 0) {
    return (
      <div className="flex items-center gap-2.5 p-4">
        <MbIcon id="check" size={16} className="shrink-0 text-mb-green" />
        <p className="text-[0.78rem] text-mb-ink-muted">
          All twelve frames are complete and inside the court.
        </p>
      </div>
    );
  }

  const rows = [
    ...blockingErrors.map((error) => ({ error, blocking: true })),
    ...overlapWarnings.map((error) => ({ error, blocking: false })),
  ];
  const shown = expanded ? rows : rows.slice(0, 4);

  return (
    <div className="flex flex-col">
      <dl className="grid grid-cols-2 border-b border-mb-rule">
        <div className="border-r border-mb-rule px-4 py-2.5">
          <dt className="mb-kicker">Blocking</dt>
          <dd className="matchbook-display text-[1.15rem] font-bold tabular-nums">
            {blockingErrors.length}
          </dd>
        </div>
        <div className="px-4 py-2.5">
          <dt className="mb-kicker">Warnings</dt>
          <dd className="matchbook-display text-[1.15rem] font-bold tabular-nums">
            {overlapWarnings.length}
          </dd>
        </div>
      </dl>

      <ul id={listId} className="flex max-h-[18rem] flex-col overflow-y-auto">
        {shown.map(({ error, blocking }, index) => (
          <li
            key={`${error.type}-${index}`}
            className="flex items-start gap-2.5 border-b border-mb-rule px-4 py-2"
          >
            <MbIcon
              id={blocking ? "warning" : "help"}
              size={13}
              className={`mt-[3px] shrink-0 ${blocking ? "text-mb-red" : "text-mb-gold-ink"}`}
            />
            <span className="min-w-0">
              <span className="mb-kicker block tabular-nums">
                {blocking ? "Blocking" : "Warning"}
                {errorLine(error) ? ` · ${errorLine(error)}` : ""}
              </span>
              <span className="block text-[0.74rem] leading-snug text-mb-ink-muted">
                {error.message}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {rows.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="mb-btn-touch mb-row-hover flex items-center justify-center gap-1.5 px-4 py-2"
        >
          <span className="mb-kicker tabular-nums">
            {expanded ? "Show fewer" : `Show all ${rows.length}`}
          </span>
          <MbIcon id={expanded ? "collapse" : "expand"} size={12} />
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ starters */

export const StarterPicker = ({
  templates,
  value,
  onChange,
  id,
}: {
  templates: { id: string; name: string; description: string }[];
  value: string;
  onChange: (value: string) => void;
  id: string;
}) => {
  if (templates.length === 0) {
    return <PanelEmpty message="No starters exist yet — the template pack failed to load." />;
  }
  return (
    <div className="p-4">
      <MbField label="Start From" htmlFor={id} hint="Applies to a new formation only.">
        <MbSelect
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          options={templates.map((template) => ({
            value: template.id,
            label: template.name,
          }))}
        />
      </MbField>
    </div>
  );
};
