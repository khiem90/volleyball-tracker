"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InlineSpinner, MoveToSelect } from "@/components/shared";
import { Icon } from "@/components/shared/Icon";
import type { TeamRow } from "@/lib/console";
import type { MixedTeamEdit } from "@/lib/entries";
import { RSVP_NAME_MAX } from "@/lib/rsvp";
import { plural } from "@/lib/utils";
import { ROW_BUTTON } from "./parts";
import { LABEL } from "@/components/shared/classes";

/**
 * The team's name with Save, offered once the field holds a name that
 * differs from the stored one. A rename that arrives from elsewhere
 * replaces the field unless it is being edited.
 */
const NameForm = ({
  name,
  busy,
  onRename,
}: {
  name: string;
  busy: boolean;
  onRename: (name: string) => void;
}) => {
  const [value, setValue] = useState(name);
  const [seen, setSeen] = useState(name);
  if (name !== seen) {
    setSeen(name);
    if (value === seen) setValue(name);
  }

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== name && !busy;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    setValue(trimmed);
    onRename(trimmed);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor="mixed-team-name" className={LABEL}>
        Team name
      </label>
      <div className="flex gap-2">
        <span className="field min-w-0 flex-1">
          <input
            id="mixed-team-name"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={RSVP_NAME_MAX}
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

/** A name field that adds a player on Enter and clears for the next one. */
const AddPlayerForm = ({ busy, onAdd }: { busy: boolean; onAdd: (name: string) => void }) => {
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const canAdd = trimmed.length > 0 && !busy;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAdd) return;
    onAdd(trimmed);
    setName("");
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <label className="field min-w-0 flex-1">
        <Icon id="plus" size={16} className="shrink-0 text-ink-soft" />
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={RSVP_NAME_MAX}
          placeholder="Player name"
          aria-label="Player to add"
          autoComplete="off"
          enterKeyHint="done"
        />
      </label>
      <button type="submit" className="btn btn-ink" disabled={!canAdd}>
        Add
      </button>
    </form>
  );
};

/**
 * The team's players, each with Remove and, when the tournament has another
 * mixed team, a menu that moves them there. A player is told apart by
 * place as well as name, since two people can share a name.
 */
const Players = ({
  team,
  others,
  busy,
  onEdit,
}: {
  team: TeamRow;
  others: TeamRow[];
  busy: boolean;
  onEdit: (edit: MixedTeamEdit) => void;
}) => {
  const players = team.players ?? [];
  if (players.length === 0) {
    return <p className="text-label text-ink-soft">Nobody is on this team.</p>;
  }
  return (
    <ul aria-label={`Players on ${team.name}`} className="flex flex-col divide-y divide-line">
      {players.map((name, index) => {
        const player = { name, index };
        return (
          <li
            key={`${index}:${name}`}
            className="flex flex-wrap items-center justify-between gap-2 py-2"
          >
            <span className="min-w-0 text-body font-semibold wrap-anywhere">{name}</span>
            <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {others.length > 0 && (
                <MoveToSelect
                  player={name}
                  teams={others.map((other) => ({ id: other.teamId, name: other.name }))}
                  disabled={busy}
                  onMove={(toTeamId) =>
                    onEdit({ kind: "move_player", teamId: team.teamId, player, toTeamId })
                  }
                />
              )}
              <button
                type="button"
                onClick={() => onEdit({ kind: "remove_player", teamId: team.teamId, player })}
                disabled={busy}
                className={`${ROW_BUTTON} btn-danger-quiet`}
                aria-label={`Remove ${name} from ${team.name}`}
              >
                <Icon id="remove-user" size={14} />
                Remove
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * The owner's edit of one mixed team, reached from the Teams tab: its name,
 * and its players to add, remove, or move to another mixed team. Open
 * while `team` is set. Each change is saved as it is made, so there is
 * nothing to confirm and Done only closes. `busy` holds the controls from
 * one change until the phone shows it. A change the tournament refuses
 * comes back as `error`.
 */
export const MixedTeamDialog = ({
  team,
  mixedTeams,
  busy,
  error,
  onEdit,
  onClose,
}: {
  team: TeamRow | null;
  /** Every mixed team in the tournament, this one included. */
  mixedTeams: TeamRow[];
  busy: boolean;
  error: string | null;
  onEdit: (edit: MixedTeamEdit) => void;
  onClose: () => void;
}) => (
  <Dialog
    open={team !== null}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <DialogContent className="grid-cols-1 sm:max-w-md">
      {team && (
        <>
          <DialogHeader>
            <DialogTitle>
              <Icon id="pencil" size={18} className="shrink-0" />
              Edit {team.name}
            </DialogTitle>
            <DialogDescription>
              Names here are labels. Changing them leaves every match and result as it is.
            </DialogDescription>
          </DialogHeader>

          <NameForm
            key={team.teamId}
            name={team.name}
            busy={busy}
            onRename={(name) => onEdit({ kind: "rename", teamId: team.teamId, name })}
          />

          <div className="flex flex-col gap-1.5">
            {/* The spinner sits beside the count, so the dialog keeps its height while a change saves. */}
            <span className={`flex min-h-5 items-center gap-2 ${LABEL}`}>
              {plural(team.players?.length ?? 0, "player")}
              {busy && <InlineSpinner />}
              <span role="status" className="sr-only">
                {busy ? "Saving" : ""}
              </span>
            </span>
            {/* The side padding keeps a button's focus ring clear of the edge the list scrolls under. */}
            <div className="-mx-1 max-h-[40vh] overflow-auto px-1">
              <Players
                team={team}
                others={mixedTeams.filter((other) => other.teamId !== team.teamId)}
                busy={busy}
                onEdit={onEdit}
              />
            </div>
            <AddPlayerForm
              busy={busy}
              onAdd={(name) => onEdit({ kind: "add_player", teamId: team.teamId, name })}
            />
          </div>

          {error && (
            <p role="alert" className="text-caption font-medium text-danger">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" className="sm:flex-1" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  </Dialog>
);
