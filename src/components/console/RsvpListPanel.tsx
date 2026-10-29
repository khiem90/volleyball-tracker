"use client";

import { useState, type FormEvent } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelEmpty, PanelError } from "@/components/matchbook/Panel";
import { InlineSpinner } from "@/components/shared";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { RSVP_NAME_MAX, rsvpEntryProblems, splitRsvps, type Placed } from "@/lib/rsvp";
import type { Rsvp } from "@/types/game";

const Tag = ({ label }: { label: string }) => (
  <span className="matchbook-display shrink-0 border-[1.5px] border-mb-navy px-1.5 py-0.5 text-[0.58rem] font-bold tracking-[0.12em]">
    {label}
  </span>
);

/** A section heading: "In" or "Waitlist", with its count. */
const SectionHead = ({ label, count }: { label: string; count: number }) => (
  <div className="flex items-baseline justify-between border-b border-mb-rule bg-mb-paper px-4 py-2">
    <span className="mb-kicker">{label}</span>
    <span className="matchbook-display text-[0.72rem] font-bold tracking-[0.1em] tabular-nums">
      {count}
    </span>
  </div>
);

/** One section in arrival order, by name, with Remove on each row while the owner can change the list. */
const Rows = ({
  rsvps,
  ownerUid,
  onRemove,
}: {
  rsvps: Placed<Rsvp>[];
  ownerUid: string;
  onRemove?: (rsvp: Rsvp) => void;
}) => (
  <ol className="flex flex-col">
    {rsvps.map((rsvp) => (
      <li
        key={rsvp.id}
        className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-mb-rule px-4 py-2 last:border-b-0"
      >
        <span className="matchbook-display text-[0.85rem] font-bold text-mb-ink-muted tabular-nums">
          {rsvp.position}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 text-[0.92rem] font-semibold [overflow-wrap:anywhere]">
              {rsvp.name}
            </span>
            {rsvp.held && <Tag label="Held" />}
            {rsvp.uid === ownerUid && <Tag label="You" />}
          </span>
          {rsvp.note && (
            <span className="text-[0.78rem] text-mb-ink-muted [overflow-wrap:anywhere]">
              {rsvp.note}
            </span>
          )}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(rsvp)}
            className="mb-btn mb-btn-outline-red"
            aria-label={`Remove ${rsvp.name}`}
          >
            <MbIcon id="remove-user" size={14} />
            Remove
          </button>
        ) : (
          <span />
        )}
      </li>
    ))}
  </ol>
);

/**
 * The owner's RSVP list on the RSVP tab: who is in and who is waiting, in
 * arrival order against the capacity, worked out here and never stored
 * (ADR-0004), so a removal or a raised capacity moves the waitlist up the
 * moment it lands. While the tournament is a draft or live the owner can
 * remove anyone and add a held spot by name for someone without an
 * account; a held spot takes the next place in order. A completed
 * tournament's list is read-only.
 */
export const RsvpListPanel = ({
  rsvps,
  error: listError,
  capacity,
  ownerUid,
  canChange,
  onAddHeld,
  onRemove,
  className = "",
}: {
  /** The list in arrival order; null until it arrives. */
  rsvps: Rsvp[] | null;
  error: Error | null;
  capacity: number;
  ownerUid: string;
  /** Whether the owner can still change the list: a draft or live tournament. */
  canChange: boolean;
  onAddHeld: (name: string) => Promise<void>;
  onRemove: (rsvpId: string) => Promise<void>;
  className?: string;
}) => {
  const [name, setName] = useState("");
  const [isAdding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Rsvp | null>(null);

  const problem = rsvpEntryProblems({ name, note: "" }).name;
  // An empty box only disables Add; a name over the limit says so.
  const shownProblem = name.trim().length > 0 ? problem : undefined;

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (problem || isAdding) return;
    setAdding(true);
    setError(null);
    try {
      await onAddHeld(name);
      setName("");
    } catch (failure) {
      console.error("Failed to add the held spot:", failure);
      setError("The held spot could not be added. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  };

  const confirmRemove = () => {
    if (!removing) return;
    const rsvp = removing;
    setRemoving(null);
    setError(null);
    onRemove(rsvp.id).catch((failure: unknown) => {
      console.error("Failed to remove the RSVP:", failure);
      setError(`${rsvp.name} could not be removed. Check your connection and try again.`);
    });
  };

  const list = rsvps ? splitRsvps(rsvps, capacity) : null;
  const remove = canChange ? setRemoving : undefined;

  return (
    <Panel
      title="The list"
      icon="teams"
      meta={
        list ? (
          <span className="matchbook-display text-[0.72rem] font-bold tracking-[0.1em] tabular-nums">
            {list.confirmed.length} of {capacity}
          </span>
        ) : undefined
      }
      className={className}
    >
      {canChange && (
        <form onSubmit={add} className="flex flex-col gap-1.5 border-b border-mb-rule p-4">
          <label htmlFor="held-spot-name" className="mb-kicker">
            Add held spot
          </label>
          <div className="flex gap-2">
            <span className={`mb-input min-w-0 flex-1 ${shownProblem ? "border-mb-red" : ""}`}>
              <input
                id="held-spot-name"
                value={name}
                maxLength={RSVP_NAME_MAX + 10}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                placeholder="Walk-in Sam"
                aria-invalid={shownProblem ? true : undefined}
                aria-describedby="held-spot-help"
              />
            </span>
            <button type="submit" className="mb-btn mb-btn-navy" disabled={!!problem || isAdding}>
              {isAdding ? <InlineSpinner /> : <MbIcon id="plus" size={14} />}
              Add
            </button>
          </div>
          <p
            id="held-spot-help"
            role={shownProblem ? "alert" : undefined}
            className={
              shownProblem
                ? "text-[0.78rem] font-medium text-mb-red"
                : "text-[0.72rem] text-mb-ink-muted"
            }
          >
            {shownProblem ??
              "For someone without an account. It takes the next place in line, so in a full night it joins the waitlist."}
          </p>
          {error && (
            <p role="alert" className="text-[0.78rem] font-medium text-mb-red">
              {error}
            </p>
          )}
        </form>
      )}

      {!canChange && error && (
        <p role="alert" className="px-4 pt-3 text-[0.78rem] font-medium text-mb-red">
          {error}
        </p>
      )}

      {listError ? (
        <PanelError message="The list could not be loaded. Check your connection and reload." />
      ) : list === null ? (
        <PanelEmpty message="Loading the list..." />
      ) : list.confirmed.length === 0 ? (
        <PanelEmpty message="Nobody has RSVP'd yet." />
      ) : (
        <>
          <SectionHead label="In" count={list.confirmed.length} />
          <Rows rsvps={list.confirmed} ownerUid={ownerUid} onRemove={remove} />
          <SectionHead label="Waitlist" count={list.waitlisted.length} />
          {list.waitlisted.length > 0 ? (
            <Rows rsvps={list.waitlisted} ownerUid={ownerUid} onRemove={remove} />
          ) : (
            <p className="px-4 py-3 text-[0.82rem] text-mb-ink-muted">Nobody is waiting.</p>
          )}
        </>
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        icon="remove-user"
        title={`Remove ${removing?.name ?? "them"}?`}
        description={
          removing?.held
            ? "The held spot comes off the list and the first person waiting moves up."
            : "They come off the list and the first person waiting moves up. Nobody is told; post a notice if they should know. They can RSVP again while the list is open, at the back of the line."
        }
        confirmLabel="Remove"
        busyLabel="Removing..."
        isBusy={false}
        onConfirm={confirmRemove}
      />
    </Panel>
  );
};
