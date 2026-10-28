"use client";

import { useState, type FormEvent } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import { CapacityField, DateTimeField } from "@/components/rsvp/RsvpFields";
import { deviceZone, rsvpProblems, rsvpSetupOf, type RsvpSetup } from "@/lib/rsvp";
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
 * The owner's RSVP tab: the RSVP link with its switch, and the scheduled
 * time, open time, and capacity with a Save button. Times are entered on
 * this phone's clock. Turning the link on also saves what the form holds,
 * so a night set up and switched on in one go needs no Save first, and is
 * refused with the reason when either time is missing. Settings that
 * arrive from elsewhere replace the form unless it is being edited.
 */
export const RsvpPanel = ({
  tournament,
  onSave,
}: {
  tournament: Tournament;
  onSave: (setup: RsvpSetup) => void;
}) => {
  const [zone] = useState(deviceZone);
  const stored = rsvpSetupOf(tournament);
  const storedDraft = draftOf(stored);

  const [draft, setDraft] = useState(storedDraft);
  const [seen, setSeen] = useState(storedDraft);
  if (!sameDraft(storedDraft, seen)) {
    setSeen(storedDraft);
    if (sameDraft(draft, seen)) setDraft(storedDraft);
  }
  const [linkProblem, setLinkProblem] = useState<string | null>(null);

  const change = (changes: Partial<RsvpDraft>) => {
    setLinkProblem(null);
    setDraft((current) => ({ ...current, ...changes }));
  };

  const problems = rsvpProblems({ ...draft, enabled: stored.enabled });
  const edited = !sameDraft(draft, storedDraft);
  const canSave = edited && Object.keys(problems).length === 0;

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({ ...draft, enabled: stored.enabled });
  };

  const toggleLink = () => {
    const next = { ...draft, enabled: !stored.enabled };
    const [problem] = Object.values(rsvpProblems(next));
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
            : "Only you can see this night. Set both times, then turn the link on to share it."}
        </p>
      </div>

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
          note="Everyone can RSVP from this moment, by the server's clock."
          problem={problems.opensAt}
          onChange={(opensAt) => change({ opensAt })}
        />
        <CapacityField
          id="rsvp-capacity"
          value={draft.capacity}
          problem={problems.capacity}
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
