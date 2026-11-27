"use client";

import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { FIELD_NOTE } from "@/components/rsvpList/RsvpFields";
import { RsvpRows, RsvpSectionHead } from "@/components/rsvpList/RsvpRows";
import { Card, CardEmpty, CardError, Icon, InlineSpinner } from "@/components/shared";
import { RSVP_NAME_MAX, rsvpEntryProblems } from "@/lib/rsvp";
import type { ListWording } from "@/lib/rsvpList";
import type { Rsvp, RsvpTakes } from "@/types/game";
import type { ListOwnerControls } from "./useListOwnerControls";
import type { ListRsvpView } from "./useListRsvpView";
import { LABEL } from "@/components/shared/classes";

/**
 * The owner's box for a held spot: a name for someone without an account,
 * or on a by-team list a team name for a team with nobody who has one. An
 * empty box only disables Add. A name over the limit says so.
 */
const HeldSpotForm = ({
  wording,
  onAdd,
}: {
  wording: ListWording["heldSpot"];
  onAdd: (name: string) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [isAdding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problem = rsvpEntryProblems({ name, note: "" }).name;
  const shownProblem = name.trim().length > 0 ? problem : undefined;

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (problem || isAdding) return;
    setAdding(true);
    setError(null);
    try {
      await onAdd(name);
      setName("");
    } catch (failure) {
      console.error("Failed to add the held spot:", failure);
      setError("The held spot could not be added. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <form onSubmit={add} className="flex flex-col gap-1.5 border-b border-line p-4">
      <label htmlFor="list-held-spot-name" className={LABEL}>
        {wording.label}
      </label>
      <div className="flex gap-2">
        <span className={`field min-w-0 flex-1 ${shownProblem ? "border-danger" : ""}`}>
          <input
            id="list-held-spot-name"
            value={name}
            maxLength={RSVP_NAME_MAX + 10}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder={wording.placeholder}
            autoComplete="off"
            aria-invalid={shownProblem ? true : undefined}
            aria-describedby="list-held-spot-help"
          />
        </span>
        <button type="submit" className="btn btn-ink shrink-0" disabled={!!problem || isAdding}>
          {isAdding ? <InlineSpinner /> : <Icon id="plus" size={14} />}
          Add
        </button>
      </div>
      <p
        id="list-held-spot-help"
        role={shownProblem ? "alert" : undefined}
        className={shownProblem ? "text-caption font-medium text-danger" : FIELD_NOTE}
      >
        {shownProblem ?? wording.help}
      </p>
      {error && (
        <p role="alert" className="text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  );
};

/**
 * Everyone on the list by name, in arrival order, in two sections: who is
 * in, under a green band, and who is on the waitlist, under a grey one. On
 * a by-team list each row is a team with its mark, and the card says
 * teams. The viewer's own row is marked. With the owner's `controls`, and
 * until the list is over, each row has Remove and the card opens with the
 * box for a held spot.
 */
export const ListPeoplePanel = ({
  view,
  takes,
  controls = null,
}: {
  view: ListRsvpView;
  /** What the list takes. On a by-team list each row draws a team's mark. */
  takes: RsvpTakes;
  /** The owner's controls. Null for anyone else. */
  controls?: ListOwnerControls | null;
}) => {
  const { split, wording } = view;
  const viewerUid = view.mine?.uid ?? null;
  const manage = controls?.canChange ? controls : null;
  const isByTeam = takes === "teams";

  const [removing, setRemoving] = useState<Rsvp | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // The row leaves when the delete lands, since every phone works the list
  // out again from what is stored. The dialog does not wait for it.
  const confirmRemove = () => {
    if (!removing || !manage) return;
    const rsvp = removing;
    setRemoving(null);
    setRemoveError(null);
    manage.removeRsvp(rsvp.id).catch((failure: unknown) => {
      console.error("Failed to remove the RSVP:", failure);
      setRemoveError(`${rsvp.name} could not be removed. Check your connection and try again.`);
    });
  };

  const onRemove = manage ? setRemoving : undefined;

  return (
    <Card
      title={wording.heading}
      icon="teams"
      meta={view.rsvps ? wording.count(view.rsvps.length) : undefined}
    >
      {manage && <HeldSpotForm wording={wording.heldSpot} onAdd={manage.addHeld} />}

      {removeError && <CardError message={removeError} className="mx-4 mt-4" />}

      {view.hasError ? (
        <CardError message="The RSVPs could not be loaded. Check your connection and reload." />
      ) : split === null ? (
        <CardEmpty message="Loading the RSVPs..." />
      ) : split.confirmed.length === 0 ? (
        <CardEmpty message={wording.empty} />
      ) : (
        <>
          <RsvpSectionHead label="In" count={split.confirmed.length} tone="action" />
          <RsvpRows
            rsvps={split.confirmed}
            viewerUid={viewerUid}
            mineLabel={wording.mine}
            teams={isByTeam}
            onRemove={onRemove}
          />
          {split.waitlisted.length > 0 && (
            <>
              <RsvpSectionHead label="Waitlist" count={split.waitlisted.length} />
              <RsvpRows
                rsvps={split.waitlisted}
                viewerUid={viewerUid}
                mineLabel={wording.mine}
                teams={isByTeam}
                onRemove={onRemove}
              />
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        icon="remove-user"
        title={`Remove ${removing?.name ?? "this RSVP"}?`}
        description={
          removing?.held
            ? "The held spot comes off the list and the first RSVP on the waitlist moves up."
            : "They come off the list and the first RSVP on the waitlist moves up. Nobody is told. They can RSVP again while the list is open, at the back of the line."
        }
        confirmLabel="Remove"
        busyLabel="Removing..."
        isBusy={false}
        onConfirm={confirmRemove}
      />
    </Card>
  );
};
