"use client";

import { CapacityField, DateTimeField } from "@/components/rsvp/RsvpFields";
import { Choice } from "@/components/shared";
import {
  LIST_NAME_MAX,
  TAKES_LABEL,
  type ListSetup,
  type ListSetupProblems,
} from "@/lib/rsvpList";
import type { RsvpTakes } from "@/types/game";

const TAKES_CHOICES: { value: RsvpTakes; label: string }[] = [
  { value: "people", label: TAKES_LABEL.people },
  { value: "teams", label: TAKES_LABEL.teams },
];

const LINK_CHOICES = [
  { value: false, label: "Off" },
  { value: true, label: "On" },
];

/**
 * A list's settings as a form: the name, by person or by team, the
 * capacity, both times, and the RSVP link. The new-list page and the
 * owner's settings on the list's page both show it. Times are entered on
 * this phone's clock, in `zone`.
 */
export const ListSetupFields = ({
  setup,
  problems,
  zone,
  scheduledZone,
  onChange,
}: {
  setup: ListSetup;
  problems: ListSetupProblems;
  /** The zone the time fields read and write: this phone's. */
  zone: string;
  /** The zone the stored scheduled time was set in, on a list that has one. */
  scheduledZone?: string;
  onChange: (changes: Partial<ListSetup>) => void;
}) => (
  <div className="flex flex-col gap-5 p-4">
    <div className="flex flex-col gap-1.5">
      <label htmlFor="list-name" className="mb-kicker">
        Name
      </label>
      <span className={`mb-input ${problems.name ? "border-mb-red" : ""}`}>
        <input
          id="list-name"
          type="text"
          value={setup.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Friday pickup"
          maxLength={LIST_NAME_MAX}
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={problems.name ? true : undefined}
          aria-describedby={problems.name ? "list-name-problem" : undefined}
        />
      </span>
      <span className="text-[0.72rem] text-mb-ink-muted">
        The RSVP page shows it, so people know what they are saying yes to.
      </span>
      {problems.name && (
        <p id="list-name-problem" role="alert" className="text-[0.78rem] font-medium text-mb-red">
          {problems.name}
        </p>
      )}
    </div>

    <Choice
      id="list-takes"
      label="RSVPs"
      note={
        setup.takes === "people"
          ? "Each person RSVPs for themselves."
          : "One person RSVPs a whole team under a team name."
      }
      value={setup.takes}
      options={TAKES_CHOICES}
      onChange={(takes) => onChange({ takes })}
    />

    <CapacityField
      id="list-capacity"
      value={setup.capacity}
      problem={problems.capacity}
      onChange={(capacity) => onChange({ capacity })}
    />

    <DateTimeField
      id="list-scheduled-at"
      label="Scheduled time"
      value={setup.scheduledAt}
      zone={zone}
      setZone={scheduledZone}
      problem={problems.scheduledAt}
      onChange={(scheduledAt) => onChange({ scheduledAt })}
    />

    <DateTimeField
      id="list-opens-at"
      label="Open time"
      value={setup.opensAt}
      zone={zone}
      note="Nobody can RSVP before this, whatever their phone's clock says."
      problem={problems.opensAt}
      onChange={(opensAt) => onChange({ opensAt })}
    />

    <Choice
      id="list-link"
      label="RSVP link"
      note={
        setup.enabled
          ? "Anyone you send the link to can sign in and see the list."
          : "Off keeps the list private. Only you can open its page."
      }
      value={setup.enabled}
      options={LINK_CHOICES}
      onChange={(enabled) => onChange({ enabled })}
    />
  </div>
);
