"use client";

import { MbIcon } from "@/components/matchbook/MbIcon";
import { Badge } from "@/components/ui/badge";
import type { Placed } from "@/lib/rsvp";
import type { Rsvp } from "@/types/game";

/** A section heading inside a list panel: "In" or "Waitlist", with its count. */
export const RsvpSectionHead = ({ label, count }: { label: string; count: number }) => (
  <div className="flex items-baseline justify-between border-b border-mb-rule bg-mb-paper px-4 py-2">
    <span className="mb-kicker">{label}</span>
    <span className="matchbook-display text-[0.72rem] font-bold tracking-[0.1em] tabular-nums">
      {count}
    </span>
  </div>
);

/**
 * One section of an RSVP list in arrival order, by name and note, with a
 * held spot marked Held and the viewer's own row marked You. With
 * `onRemove`, each row has a Remove button.
 */
export const RsvpRows = ({
  rsvps,
  viewerUid,
  onRemove,
}: {
  rsvps: Placed<Rsvp>[];
  /** The account looking at the list, whose row is marked; null for nobody. */
  viewerUid: string | null;
  onRemove?: (rsvp: Rsvp) => void;
}) => (
  <ol className="flex flex-col">
    {rsvps.map((rsvp) => (
      <li
        key={rsvp.id}
        className={`grid ${onRemove ? "grid-cols-[2rem_minmax(0,1fr)_auto]" : "grid-cols-[2rem_minmax(0,1fr)]"} items-center gap-2 border-b border-mb-rule px-4 py-2.5 last:border-b-0`}
      >
        <span className="matchbook-display text-[0.85rem] font-bold text-mb-ink-muted tabular-nums">
          {rsvp.position}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 text-[0.92rem] font-semibold [overflow-wrap:anywhere]">
              {rsvp.name}
            </span>
            {rsvp.held && <Badge>Held</Badge>}
            {viewerUid !== null && rsvp.uid === viewerUid && <Badge>You</Badge>}
          </span>
          {rsvp.note && (
            <span className="text-[0.78rem] text-mb-ink-muted [overflow-wrap:anywhere]">
              {rsvp.note}
            </span>
          )}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(rsvp)}
            className="mb-btn mb-btn-outline-red"
            aria-label={`Remove ${rsvp.name}`}
          >
            <MbIcon id="remove-user" size={14} />
            Remove
          </button>
        )}
      </li>
    ))}
  </ol>
);
