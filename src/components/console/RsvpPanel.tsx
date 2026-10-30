"use client";

import { useState, type FormEvent } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import { CapacityField, DateTimeField } from "@/components/rsvp/RsvpFields";
import {
  deviceZone,
  OPEN_TIME_LOCKED,
  rsvpProblems,
  rsvpSetupOf,
  type ListSoFar,
  type RsvpSetup,
} from "@/lib/rsvp";
import type { Tournament } from "@/types/game";

/** The part of the setup the form edits; the link is switched on its own. */
type RsvpDraft = Omit<RsvpSetup, "enabled">;

const draftOf = (setup: RsvpSetup): RsvpDraft => ({
  capacity: setup.capacity,
  scheduledAt: setup.scheduledAt,
  opensAt: setup.opensAt,
});

const sameDraft = (a: RsvpDraft, b: RsvpDraft) =>
  a.capacity === b.capacity && a.scheduledAt === b.scheduledAt && a.opensAt === b.opensAt;

/**
 * The owner's RSVP tab: the RSVP link with its switch, Close or Reopen for
 * the list, and the scheduled time, open time, and capacity with a Save
 * button. Times are entered on this phone's clock. Turning the link on
 * also saves what the form holds, so a tournament set up and switched on
 * in one go needs no Save first, and is refused with the reason when either
 * time is missing. Turning it off writes only the switch, so it always
 * works and leaves the form as typed. Settings that arrive from elsewhere replace the form unless
 * it is being edited. Once anyone is on the list the open time is
 * read-only, and the capacity stepper stops at the confirmed count; both
 * say why.
 */
export const RsvpPanel = ({
  tournament,
  list,
  onSave,
  onTurnOff,
  onSetClosed,
}: {
  tournament: Tournament;
  /** What the list already holds; null until it arrives. */
  list: ListSoFar | null;
  onSave: (setup: RsvpSetup) => void;
  /** Turn the link off, writing nothing else. */
  onTurnOff: () => void;
  onSetClosed: (closed: boolean) => void;
}) => {
  const [zone] = useState(deviceZone);
  const stored = rsvpSetupOf(tournament);
  const storedDraft = draftOf(stored);

  const [typed, setDraft] = useState(storedDraft);
  const [seen, setSeen] = useState(storedDraft);
  if (!sameDraft(storedDraft, seen)) {
    setSeen(storedDraft);
    if (sameDraft(typed, seen)) setDraft(storedDraft);
  }
  // Once anyone is on the list the open time is the stored one, whatever
  // was typed before the first RSVP arrived.
  const openTimeLocked = (list?.arrivals ?? 0) > 0;
  const draft = openTimeLocked ? { ...typed, opensAt: stored.opensAt } : typed;
  const [linkProblem, setLinkProblem] = useState<string | null>(null);
  // Why the stepper did not go lower, until the capacity changes again.
  const [floorProblem, setFloorProblem] = useState<string | null>(null);

  const change = (changes: Partial<RsvpDraft>) => {
    setLinkProblem(null);
    setFloorProblem(null);
    setDraft((current) => ({ ...current, ...changes }));
  };

  const against = list ?? undefined;
  const problems = rsvpProblems({ ...draft, enabled: stored.enabled }, against);
  const edited = !sameDraft(draft, storedDraft);
  const canSave = edited && Object.keys(problems).length === 0;
  // Reopen is offered only before the start, which closes the list for good.
  const draftStatus = tournament.status === "draft";

  const stepBelowFloor = () =>
    setFloorProblem(
      rsvpProblems({ ...draft, enabled: stored.enabled, capacity: draft.capacity - 1 }, against)
        .capacity ?? null,
    );

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({ ...draft, enabled: stored.enabled });
  };

  // Turning off always works and leaves the form's edits unsaved. Turning
  // on saves the form with it, since the link needs both times.
  const toggleLink = () => {
    if (stored.enabled) {
      setLinkProblem(null);
      onTurnOff();
      return;
    }
    const next = { ...draft, enabled: true };
    const [problem] = Object.values(rsvpProblems(next, against));
    if (problem) {
      setLinkProblem(problem);
      return;
    }
    setLinkProblem(null);
    onSave(next);
  };

  return (
    <Panel title="RSVP">
      <div className="flex flex-col gap-1.5 border-b border-mb-rule p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="mb-kicker">RSVP link</span>
            <span className="text-[0.85rem] font-semibold">{stored.enabled ? "On" : "Off"}</span>
          </div>
          <button
            type="button"
            onClick={toggleLink}
            aria-pressed={stored.enabled}
            className={`mb-btn min-h-11 ${stored.enabled ? "mb-btn-outline-navy" : "mb-btn-navy"}`}
          >
            <MbIcon id="share" size={14} />
            {stored.enabled ? "Turn off" : "Turn on"}
          </button>
        </div>
        {linkProblem && (
          <p role="alert" className="text-[0.78rem] font-medium text-mb-red">
            {linkProblem}
          </p>
        )}
        <p className="text-[0.72rem] text-mb-ink-muted">
          {stored.enabled
            ? "Copy the link from Settings. Turning it off makes the RSVP page show not found."
            : "Only you can see this tournament. Set both times, then turn the link on to share it."}
        </p>
      </div>

      {tournament.rsvp && (
        <div className="flex flex-col gap-1.5 border-b border-mb-rule p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="mb-kicker">List</span>
              <span className="text-[0.85rem] font-semibold">
                {draftStatus ? (tournament.rsvp.closed ? "Closed" : "Open") : "Closed"}
              </span>
            </div>
            {draftStatus && (
              <button
                type="button"
                onClick={() => onSetClosed(!tournament.rsvp?.closed)}
                className="mb-btn mb-btn-outline-navy min-h-11"
              >
                <MbIcon id={tournament.rsvp.closed ? "undo" : "lock"} size={14} />
                {tournament.rsvp.closed ? "Reopen" : "Close"}
              </button>
            )}
          </div>
          <p className="text-[0.72rem] text-mb-ink-muted">
            {!draftStatus
              ? "The list closed when the tournament started. You can still remove people and add held spots."
              : tournament.rsvp.closed
                ? "Nobody new can RSVP. People on the list can still withdraw. Reopen it any time before you start."
                : "Close it to stop new RSVPs before you start. People on the list can still withdraw."}
          </p>
        </div>
      )}

      <form onSubmit={save} className="flex flex-col gap-5 p-4">
        <DateTimeField
          id="rsvp-scheduled-at"
          label="Scheduled for"
          value={draft.scheduledAt}
          zone={zone}
          setZone={tournament.scheduledZone}
          problem={problems.scheduledAt}
          onChange={(scheduledAt) => change({ scheduledAt })}
        />
        <DateTimeField
          id="rsvp-opens-at"
          label="RSVPs open"
          value={draft.opensAt}
          zone={zone}
          setZone={tournament.scheduledZone}
          note={
            openTimeLocked
              ? `${OPEN_TIME_LOCKED} Anyone who already answered was told this time.`
              : "Everyone can RSVP from this moment, by the server's clock."
          }
          problem={problems.opensAt}
          disabled={openTimeLocked}
          onChange={(opensAt) => change({ opensAt })}
        />
        <CapacityField
          id="rsvp-capacity"
          value={draft.capacity}
          problem={problems.capacity ?? floorProblem ?? undefined}
          floor={list?.confirmed ?? 0}
          onFloor={stepBelowFloor}
          onChange={(capacity) => change({ capacity })}
        />
        <button type="submit" className="mb-btn mb-btn-navy self-start" disabled={!canSave}>
          <MbIcon id="save" size={14} />
          Save
        </button>
      </form>
    </Panel>
  );
};
