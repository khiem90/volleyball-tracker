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
import { MbIcon } from "@/components/matchbook/MbIcon";
import type { TeamRow } from "@/lib/console";
import type { MixedTeamEdit } from "@/lib/entries";
import { RSVP_NAME_MAX } from "@/lib/rsvp";
import { plural } from "@/lib/utils";

/**
 * The team's name with Save, offered once the field holds a name that
 * differs from the stored one. A rename that arrives from elsewhere
 * replaces the field unless it is being edited.
 */
const NameForm = ({ name, onRename }: { name: string; onRename: (name: string) => void }) => {
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
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor="mixed-team-name" className="mb-kicker">
        Team name
      </label>
      <div className="flex gap-2">
        <span className="mb-input min-w-0 flex-1">
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
        <button type="submit" className="mb-btn mb-btn-navy" disabled={!canSave}>
          Save
        </button>
      </div>
    </form>
  );
};

/** A name field that adds a player on Enter and clears for the next one. */
const AddPlayerForm = ({ onAdd }: { onAdd: (name: string) => void }) => {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (trimmed.length === 0) return;
    onAdd(trimmed);
    setName("");
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <label className="mb-input min-w-0 flex-1">
        <MbIcon id="plus" size={14} className="shrink-0 text-mb-ink-muted" />
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
      <button type="submit" className="mb-btn mb-btn-navy" disabled={trimmed.length === 0}>
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
  onEdit,
}: {
  team: TeamRow;
  others: TeamRow[];
  onEdit: (edit: MixedTeamEdit) => void;
}) => {
  const players = team.players ?? [];
  if (players.length === 0) {
    return <p className="text-[0.85rem] text-mb-ink-muted">Nobody is on this team.</p>;
  }
  return (
    <ul aria-label={`Players on ${team.name}`} className="flex flex-col border border-mb-rule">
      {players.map((name, index) => {
        const player = { name, index };
        return (
          <li
            key={`${index}:${name}`}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-mb-rule px-3 py-2 last:border-b-0"
          >
            <span className="min-w-0 text-[0.92rem] font-semibold [overflow-wrap:anywhere]">
              {name}
            </span>
            <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {others.length > 0 && (
                <span className="relative">
                  <select
                    className="mb-select-native w-auto text-[0.72rem]"
                    value=""
                    onChange={(event) =>
                      event.target.value &&
                      onEdit({
                        kind: "move_player",
                        teamId: team.teamId,
                        player,
                        toTeamId: event.target.value,
                      })
                    }
                    aria-label={`Move ${name} to another team`}
                  >
                    <option value="">Move to</option>
                    {others.map((other) => (
                      <option key={other.teamId} value={other.teamId}>
                        {other.name}
                      </option>
                    ))}
                  </select>
                  <MbIcon
                    id="chevron-down"
                    size={13}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mb-ink-muted"
                  />
                </span>
              )}
              <button
                type="button"
                onClick={() => onEdit({ kind: "remove_player", teamId: team.teamId, player })}
                className="mb-btn mb-btn-outline-red"
                aria-label={`Remove ${name} from ${team.name}`}
              >
                <MbIcon id="remove-user" size={14} />
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
 * nothing to confirm and Done only closes. A change the tournament
 * refuses comes back as `error`.
 */
export const MixedTeamDialog = ({
  team,
  mixedTeams,
  error,
  onEdit,
  onClose,
}: {
  team: TeamRow | null;
  /** Every mixed team in the tournament, this one included. */
  mixedTeams: TeamRow[];
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
    <DialogContent className="sm:max-w-md">
      {team && (
        <>
          <DialogHeader>
            <DialogTitle>
              <MbIcon id="pencil" size={18} className="shrink-0" />
              Edit {team.name}
            </DialogTitle>
            <DialogDescription>
              Names here are labels. Changing them leaves every match and result as it is.
            </DialogDescription>
          </DialogHeader>

          <NameForm
            key={team.teamId}
            name={team.name}
            onRename={(name) => onEdit({ kind: "rename", teamId: team.teamId, name })}
          />

          <div className="flex flex-col gap-1.5">
            <span className="mb-kicker">{plural(team.players?.length ?? 0, "player")}</span>
            <div className="max-h-[40vh] overflow-auto">
              <Players
                team={team}
                others={mixedTeams.filter((other) => other.teamId !== team.teamId)}
                onEdit={onEdit}
              />
            </div>
            <AddPlayerForm
              onAdd={(name) => onEdit({ kind: "add_player", teamId: team.teamId, name })}
            />
          </div>

          {error && (
            <p role="alert" className="text-[0.8rem] font-medium text-mb-red">
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
