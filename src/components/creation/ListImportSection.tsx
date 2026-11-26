"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon, InlineSpinner, MoveToSelect, StepButtons, TeamMark } from "@/components/shared";
import { RSVP_NAME_MAX } from "@/lib/rsvp";
import type { ListImportView } from "./useListImport";

const ALERT = "text-caption font-medium text-danger";

/** The owner's lists to import from, by-person and by-team alike. */
const ImportPicker = ({ view }: { view: ListImportView }) => {
  const { picker, isBusy } = view;
  return (
    <Dialog open={picker.isOpen} onOpenChange={(next) => !next && picker.close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Icon id="import" size={18} className="shrink-0" />
            Import from an RSVP list
          </DialogTitle>
          <DialogDescription>
            Import takes the confirmed RSVPs and leaves the waitlist out. A by-person list is dealt
            into mixed teams of a size you pick. The tournament keeps its own copy, so a later
            change to the list does not reach it.
          </DialogDescription>
        </DialogHeader>

        {picker.choices === null ? (
          <p className="text-body text-ink-soft">
            {picker.hasLoadError
              ? "Your lists could not be loaded. Check your connection and reload."
              : "Loading your lists..."}
          </p>
        ) : picker.choices.length === 0 ? (
          <p className="text-body text-ink-soft">
            You have no RSVP lists yet. Create one from the RSVP tab.
          </p>
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-2 overflow-auto">
            {picker.choices.map(({ list, detail }) => (
              <li key={list.id}>
                <button
                  type="button"
                  onClick={() => picker.choose(list)}
                  disabled={isBusy}
                  className="flex min-h-11 w-full cursor-pointer flex-col items-start gap-0.5 rounded-tile border border-transparent bg-fill px-3 py-2.5 text-left transition-colors hover:border-ink-soft/75 focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-transparent"
                >
                  <span className="max-w-full truncate text-body font-semibold">{list.name}</span>
                  <span className="text-caption text-ink-soft">{detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" className="sm:flex-1" onClick={picker.close} disabled={isBusy}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** The question before an import closes an open list. Closing can be undone, so nothing here is red. */
const CloseOffer = ({ view }: { view: ListImportView }) => {
  const { closeOffer, isBusy } = view;
  if (!closeOffer) return null;
  return (
    <Dialog open onOpenChange={(next) => !next && closeOffer.cancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Icon id="lock" size={18} className="shrink-0" />
            Close the list first?
          </DialogTitle>
          <DialogDescription>{closeOffer.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="sm:flex-1"
            onClick={closeOffer.cancel}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button className="sm:flex-1" onClick={closeOffer.confirm} disabled={isBusy}>
            {isBusy ? <InlineSpinner /> : <Icon id="lock" size={14} />}
            {isBusy ? "Closing..." : "Close and import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type Imported = NonNullable<ListImportView["imported"]>;
type Dealing = NonNullable<Imported["dealing"]>;

/** The team size stepper and Shuffle of a by-person import. Either one deals everyone again. */
const DealControls = ({ dealing }: { dealing: Dealing }) => (
  <div className="flex flex-col gap-1.5 border-t border-line px-4 py-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-caption font-medium text-ink-soft">Team size</span>
        <span className="text-title font-bold tabular-nums">{dealing.teamSize}</span>
      </div>
      <span className="flex gap-1.5">
        <StepButtons
          what="team size"
          value={dealing.teamSize}
          min={1}
          max={dealing.largestTeamSize}
          onChange={dealing.setTeamSize}
        />
        <button type="button" onClick={dealing.shuffle} className="btn btn-fill">
          <Icon id="swap" size={16} />
          Shuffle
        </button>
      </span>
    </div>
    <p className="text-body font-semibold" aria-live="polite">
      {dealing.summary}
    </p>
    <p className="text-caption text-ink-soft">
      No dealt team goes over the team size, and a size of 1 enters each person alone. Changing
      the size or shuffling deals everyone again, so rename teams and move people after that.
    </p>
  </div>
);

/** What a mixed team is called in a move menu: its name, or its number while the name is blank. */
const teamLabel = (name: string, index: number) => name.trim() || `Team ${index + 1}`;

/**
 * What a row of an imported team holds, by-team and mixed alike: its mark,
 * a name the owner can change, and a word on where it stands. `label`
 * names the field for a screen reader. A blank name and a clash both mark
 * the field, and a clash also replaces `status` with "Same name".
 */
const TeamNameRow = ({
  team,
  color,
  clashes,
  label,
  status,
  onRename,
}: {
  team: Imported["rows"][number]["team"];
  color: string | undefined;
  clashes: boolean;
  label: string;
  status: string;
  onRename: (teamId: string, name: string) => void;
}) => {
  const isInvalid = clashes || team.name.trim().length === 0;
  return (
    <>
      <TeamMark name={team.name} color={color} />
      <span className={`field min-w-0 flex-1 ${isInvalid ? "border-danger" : ""}`}>
        <input
          type="text"
          value={team.name}
          onChange={(event) => onRename(team.id, event.target.value)}
          maxLength={RSVP_NAME_MAX}
          autoComplete="off"
          aria-label={label}
          aria-invalid={isInvalid ? true : undefined}
        />
      </span>
      <span className="shrink-0 text-caption font-medium text-ink-soft">
        {clashes ? "Same name" : status}
      </span>
    </>
  );
};

/**
 * A by-person import's mixed teams in number order, each with its mark, a
 * name the owner can change, and its players. A player moves through the
 * menu beside their name.
 */
const MixedTeams = ({
  imported,
  dealing,
  describedBy,
}: {
  imported: Imported;
  dealing: Dealing;
  describedBy?: string;
}) => (
  <ul aria-label={`Mixed teams dealt from ${imported.listName}`} aria-describedby={describedBy}>
    {imported.rows.map(({ team, clashes }, index) => {
      const players = team.players ?? [];
      const others = imported.rows.flatMap((other, otherIndex) =>
        other.team.id === team.id
          ? []
          : { id: other.team.id, name: teamLabel(other.team.name, otherIndex) },
      );
      return (
        <li key={team.id} className="border-t border-line px-4 py-2">
          <div className="flex min-h-11 items-center gap-3">
            <TeamNameRow
              team={team}
              color={imported.mixedColors[index]}
              clashes={clashes}
              label={`Name of mixed team ${index + 1}`}
              status={`${players.length} ${players.length === 1 ? "player" : "players"}`}
              onRename={imported.rename}
            />
          </div>
          {/* The players line up under the team's name, past its mark. */}
          <ul aria-label={`Players on ${teamLabel(team.name, index)}`} className="pl-[34px]">
            {players.map((person) => (
              <li key={person.id} className="flex min-h-11 items-center justify-between gap-3 py-1">
                <span className="min-w-0 truncate text-body">{person.name}</span>
                {others.length > 0 && (
                  <MoveToSelect
                    player={person.name}
                    teams={others}
                    onMove={(toTeamId) => dealing.move(person.id, toTeamId)}
                  />
                )}
              </li>
            ))}
          </ul>
        </li>
      );
    })}
  </ul>
);

/**
 * The import inside the teams section, above the roster checklist. With
 * no import it offers one. With one it shows the imported teams in the
 * order they enter, each with a name the owner can change, which is how
 * two teams under one name are told apart. A by-person import also shows
 * the team size, Shuffle, and each mixed team's players. `problem` is what
 * stops the import being saved, shown once a create has been tried.
 */
export const ListImportSection = ({ view, problem }: { view: ListImportView; problem?: string }) => {
  const { imported } = view;
  const shownProblem = imported?.problem ?? problem;

  return (
    <div className="border-b border-line">
      {imported ? (
        <>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <span className="text-caption font-medium text-ink-soft">Imported from</span>
              <p className="truncate text-body font-semibold">{imported.listName}</p>
            </div>
            <button type="button" onClick={imported.remove} className="btn btn-fill shrink-0">
              <Icon id="close" size={16} />
              Remove import
            </button>
          </div>
          {imported.rows.length === 0 ? (
            <p className="border-t border-line px-4 py-3 text-body text-ink-soft">
              This list has no confirmed RSVPs, so it brings no teams.
            </p>
          ) : imported.dealing ? (
            <>
              <DealControls dealing={imported.dealing} />
              <MixedTeams
                imported={imported}
                dealing={imported.dealing}
                describedBy={shownProblem ? "import-problem" : undefined}
              />
            </>
          ) : (
            <ul
              aria-label={`Teams imported from ${imported.listName}`}
              aria-describedby={shownProblem ? "import-problem" : undefined}
            >
              {imported.rows.map(({ team, rosterTeam, clashes }, index) => (
                <li
                  key={team.id}
                  className="flex min-h-11 items-center gap-3 border-t border-line px-4 py-2"
                >
                  <TeamNameRow
                    team={team}
                    color={rosterTeam?.color}
                    clashes={clashes}
                    label={`Name of imported team ${index + 1}`}
                    status={rosterTeam ? "On roster" : "Joins roster"}
                    onRename={imported.rename}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="flex flex-col items-start gap-2 px-4 py-3">
          <button
            type="button"
            onClick={view.picker.open}
            disabled={view.isBusy}
            className="btn btn-fill"
          >
            {view.isBusy ? <InlineSpinner /> : <Icon id="import" size={16} />}
            Import from an RSVP list
          </button>
          {view.error && (
            <p role="alert" className={ALERT}>
              {view.error}
            </p>
          )}
        </div>
      )}
      {shownProblem && (
        <p id="import-problem" role="alert" className={`border-t border-line px-4 py-2.5 ${ALERT}`}>
          {shownProblem}
        </p>
      )}

      <ImportPicker view={view} />
      <CloseOffer view={view} />
    </div>
  );
};
