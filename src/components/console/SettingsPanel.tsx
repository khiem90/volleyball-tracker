"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/shared/Card";
import { Icon } from "@/components/shared/Icon";
import { courtsWord, type ConsoleAccess } from "@/lib/console";
import { formatLabel, isRotationFormat } from "@/lib/formats";
import type { Tournament } from "@/types/game";
import { ShareLinks } from "./ShareLinks";
import { LABEL, NOTE } from "./parts";
import type { ShareLinksView } from "./useConsole";

const longDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <dt className={LABEL}>{label}</dt>
    <dd className="text-body font-semibold wrap-break-word">{value}</dd>
  </div>
);

/**
 * The name field with its Save button. Save is offered once the field holds
 * a name that differs from the stored one. A rename that arrives from
 * elsewhere replaces the field unless it is being edited.
 */
const RenameForm = ({ name, onRename }: { name: string; onRename: (name: string) => void }) => {
  const [value, setValue] = useState(name);
  const [seen, setSeen] = useState(name);
  if (name !== seen) {
    setSeen(name);
    if (value === seen) setValue(name);
  }

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== name;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    setValue(trimmed);
    onRename(trimmed);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5 border-b border-line p-4">
      <label htmlFor="tournament-name" className={LABEL}>
        Name
      </label>
      <div className="flex gap-2">
        <span className="field min-w-0 flex-1">
          <input
            id="tournament-name"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={80}
            autoComplete="off"
            enterKeyHint="done"
          />
        </span>
        <button type="submit" className="btn btn-ink" disabled={!canSave}>
          Save
        </button>
      </div>
    </form>
  );
};

/**
 * The courts in play, with a button to close one and a button to open one.
 * Each tap is saved at once: a closing court sends its teams to the front
 * of the queue, and an opening court fills from the queue.
 */
const CourtsStepper = ({
  tournament,
  canAdd,
  canRemove,
  busy,
  onChange,
}: {
  tournament: Tournament;
  canAdd: boolean;
  canRemove: boolean;
  busy: boolean;
  onChange: (courts: number) => void;
}) => {
  const { courts } = tournament.settings;
  const word = courtsWord(tournament, 1);
  // A 44px round button that holds one glyph.
  const button = "btn btn-fill size-11 shrink-0 p-0";
  return (
    <div className="flex flex-col gap-2 border-b border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className={LABEL}>In play</span>
          <span className="text-body font-semibold">
            {courts} {courtsWord(tournament, courts)}
          </span>
        </div>
        <span className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange(courts - 1)}
            disabled={busy || !canRemove}
            aria-label={`Close a ${word}`}
            className={button}
          >
            <Icon id="minus" size={16} />
          </button>
          <button
            type="button"
            onClick={() => onChange(courts + 1)}
            disabled={busy || !canAdd}
            aria-label={`Open a ${word}`}
            className={button}
          >
            <Icon id="plus" size={16} />
          </button>
        </span>
      </div>
      <p className={NOTE}>
        Closing a {word} sends its teams to the front of the queue. Opening one fills it from the
        queue.
      </p>
    </div>
  );
};

/**
 * One owner action with the line that says what it does. An action that
 * ends or deletes the tournament is the quiet red button, and its dialog
 * holds the filled one.
 */
const Action = ({
  icon,
  label,
  note,
  onClick,
  disabled = false,
  kind = "fill",
}: {
  icon: string;
  label: string;
  note: string;
  onClick: () => void;
  disabled?: boolean;
  kind?: "fill" | "danger";
}) => (
  <div className="flex flex-col gap-1.5">
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn ${kind === "danger" ? "btn-danger-quiet" : "btn-fill"}`}
    >
      <Icon id={icon} size={16} />
      {label}
    </button>
    <p className={NOTE}>{note}</p>
  </div>
);

/**
 * The Settings tab, as a column of cards: the tournament as it was set up,
 * with Rename and the courts of a live rotation tournament, then the share
 * links, then Duplicate, End, and Delete. A scorer or spectator sees the
 * facts alone.
 */
export const SettingsPanel = ({
  tournament,
  access,
  onRename,
  onChangeCourts,
  canAddCourt,
  canRemoveCourt,
  isApplying,
  links,
  onToggleSpectator,
  onRegenerate,
  onCreateScorerLink,
  onDuplicate,
  isDuplicating,
  onEnd,
  onDelete,
}: {
  tournament: Tournament;
  access: ConsoleAccess;
  onRename: (name: string) => void;
  onChangeCourts: (courts: number) => void;
  canAddCourt: boolean;
  canRemoveCourt: boolean;
  /** True while a court change is being saved. */
  isApplying: boolean;
  /** The share links, for the owner; null for anyone else. */
  links: ShareLinksView | null;
  onToggleSpectator: () => void;
  onRegenerate: () => void;
  onCreateScorerLink: () => void;
  onDuplicate: () => void;
  isDuplicating: boolean;
  onEnd: () => void;
  onDelete: () => void;
}) => {
  const { settings } = tournament;
  const editableCourts = access.canManage && isRotationFormat(tournament.format);
  const facts: [string, string | null][] = [
    ["Format", formatLabel(tournament.format)],
    [
      "In play",
      editableCourts ? null : `${settings.courts} ${courtsWord(tournament, settings.courts)}`,
    ],
    [
      "Matches",
      settings.seriesLength > 1 ? `Best of ${settings.seriesLength}` : "One game each",
    ],
    ["Instant win", settings.instantWin ? "On" : "Off"],
    [
      "Standings points",
      `${settings.pointsForWin} for a win, ${settings.pointsForLoss} for a loss`,
    ],
    ["Created", longDate(tournament.createdAt)],
    ["Started", longDate(tournament.startedAt)],
    ["Completed", longDate(tournament.completedAt)],
  ];
  const hasActions = access.canDuplicate || access.canManage || access.canDelete;

  return (
    <div className="flex flex-col gap-3">
      <Card title="Settings" className="h-auto">
        {access.canRename && <RenameForm name={tournament.name} onRename={onRename} />}
        {editableCourts && (
          <CourtsStepper
            tournament={tournament}
            canAdd={canAddCourt}
            canRemove={canRemoveCourt}
            busy={isApplying}
            onChange={onChangeCourts}
          />
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
          {facts.map(([label, value]) =>
            value === null ? null : <Fact key={label} label={label} value={value} />,
          )}
        </dl>
      </Card>
      {links && (
        <ShareLinks
          links={links}
          courts={courtsWord(tournament, 2)}
          onToggleSpectator={onToggleSpectator}
          onRegenerate={onRegenerate}
          onCreateScorerLink={onCreateScorerLink}
        />
      )}
      {hasActions && (
        <Card className="h-auto">
          <div className="flex flex-col gap-4 p-4">
            {access.canDuplicate && (
              <Action
                icon="clipboard"
                label={isDuplicating ? "Duplicating..." : "Duplicate"}
                note="Makes a new draft with the same teams and settings and opens it."
                onClick={onDuplicate}
                disabled={isDuplicating}
              />
            )}
            {access.canManage && (
              <Action
                icon="warning"
                kind="danger"
                label="End tournament"
                note="Ends it as it stands. Standings freeze and no more matches can be scored."
                onClick={onEnd}
              />
            )}
            {access.canDelete && (
              <Action
                icon="trash"
                kind="danger"
                label="Delete tournament"
                note="Removes it and every match in it. This cannot be undone."
                onClick={onDelete}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
