"use client";

import { useState, type FormEvent } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import { courtsWord, type ConsoleAccess } from "@/lib/console";
import { formatLabel, isRotationFormat } from "@/lib/formats";
import type { Tournament } from "@/types/game";
import { ShareLinks } from "./ShareLinks";
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
  <div className="flex flex-col gap-0.5">
    <span className="mb-kicker">{label}</span>
    <span className="text-[0.85rem] font-semibold">{value}</span>
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
    <form onSubmit={submit} className="flex flex-col gap-1.5 border-b border-mb-rule p-4">
      <label htmlFor="tournament-name" className="mb-kicker">
        Name
      </label>
      <div className="flex gap-2">
        <span className="mb-input min-w-0 flex-1 py-[0.45rem]">
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
        <button type="submit" className="mb-btn mb-btn-navy min-h-11" disabled={!canSave}>
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
  const button = "mb-btn mb-btn-outline-navy min-h-11 min-w-11 px-3 text-[1rem]";
  return (
    <div className="flex flex-col gap-1.5 border-b border-mb-rule p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="mb-kicker">In play</span>
          <span className="text-[0.85rem] font-semibold">
            {courts} {courtsWord(tournament, courts)}
          </span>
        </div>
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange(courts - 1)}
            disabled={busy || !canRemove}
            aria-label={`Close a ${word}`}
            className={button}
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onChange(courts + 1)}
            disabled={busy || !canAdd}
            aria-label={`Open a ${word}`}
            className={button}
          >
            +
          </button>
        </span>
      </div>
      <p className="text-[0.72rem] text-mb-ink-muted">
        Closing a {word} sends its teams to the front of the queue. Opening one fills it from the
        queue.
      </p>
    </div>
  );
};

/** One owner action with the line that says what it does. */
const Action = ({
  icon,
  label,
  note,
  onClick,
  disabled = false,
  tone = "coral",
}: {
  icon: string;
  label: string;
  note: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "coral" | "navy" | "red";
}) => (
  <div className="flex flex-col gap-1.5">
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mb-btn min-h-11 ${
        tone === "navy"
          ? "mb-btn-outline-navy"
          : tone === "red"
            ? "mb-btn-outline-red"
            : "mb-btn-outline"
      }`}
    >
      <MbIcon id={icon} size={14} />
      {label}
    </button>
    <p className="text-[0.72rem] text-mb-ink-muted">{note}</p>
  </div>
);

/**
 * The Settings tab: the tournament as it was set up, and the owner's
 * actions on it: Rename, the courts of a live rotation tournament, the
 * share links, Duplicate, End, and Delete. A scorer or spectator sees the
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
    <Panel title="Settings">
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
      {links && (
        <ShareLinks
          links={links}
          courts={courtsWord(tournament, 2)}
          onToggleSpectator={onToggleSpectator}
          onRegenerate={onRegenerate}
          onCreateScorerLink={onCreateScorerLink}
        />
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
        {facts.map(([label, value]) =>
          value === null ? null : <Fact key={label} label={label} value={value} />,
        )}
      </div>
      {hasActions && (
        <div className="mt-auto flex flex-col gap-4 border-t border-mb-rule p-4">
          {access.canDuplicate && (
            <Action
              icon="clipboard"
              tone="navy"
              label={isDuplicating ? "Duplicating..." : "Duplicate"}
              note="Makes a new draft with the same teams and settings and opens it."
              onClick={onDuplicate}
              disabled={isDuplicating}
            />
          )}
          {access.canManage && (
            <Action
              icon="warning"
              label="End tournament"
              note="Ends it as it stands. Standings freeze and no more matches can be scored."
              onClick={onEnd}
            />
          )}
          {access.canDelete && (
            <Action
              icon="warning"
              tone="red"
              label="Delete tournament"
              note="Removes it and every match in it. This cannot be undone."
              onClick={onDelete}
            />
          )}
        </div>
      )}
    </Panel>
  );
};
