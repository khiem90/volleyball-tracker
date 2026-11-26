"use client";

import { Icon, TeamMark } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import type { Placed } from "@/lib/rsvp";
import type { Rsvp } from "@/types/game";

/**
 * A section heading inside a list card: "In" or "Waitlist", with its count.
 * It is a band across the card, green for who is in and grey for who is
 * waiting, so the two sections read apart before any row is read.
 */
export const RsvpSectionHead = ({
  label,
  count,
  tone = "fill",
}: {
  label: string;
  count: number;
  /** `action` for the confirmed section. The waitlist keeps the grey default. */
  tone?: "action" | "fill";
}) => (
  <div
    className={`flex items-baseline justify-between gap-3 px-4 py-2 text-caption font-semibold ${
      tone === "action" ? "bg-action-tint text-action" : "bg-fill text-ink"
    }`}
  >
    <span>{label}</span>
    <span className="tabular-nums">{count}</span>
  </div>
);

/**
 * One section of an RSVP list in arrival order, by name and note. Each row
 * leads with its place in the section, so a waitlist row shows how far back
 * it is. A held spot is marked Held and the viewer's own row is marked with
 * `mineLabel`. With `teams`, each row is a team and draws the team's mark,
 * in a color picked from the name because an RSVP stores none. With
 * `onRemove`, each row has a Remove button.
 */
export const RsvpRows = ({
  rsvps,
  viewerUid,
  mineLabel,
  teams = false,
  onRemove,
}: {
  rsvps: Placed<Rsvp>[];
  /** The account looking at the list, whose row is marked; null for nobody. */
  viewerUid: string | null;
  /** The badge on the viewer's own row, from listWording: "You" or "Your team". */
  mineLabel: string;
  /** True on a by-team list. */
  teams?: boolean;
  onRemove?: (rsvp: Rsvp) => void;
}) => (
  <ol className="flex flex-col divide-y divide-line">
    {rsvps.map((rsvp) => (
      <li key={rsvp.id} className="flex items-center gap-2.5 px-4 py-2.5">
        <span className="min-w-6 shrink-0 text-label font-semibold tabular-nums text-ink-soft">
          {rsvp.position}
        </span>
        {teams && <TeamMark name={rsvp.name} />}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 text-body font-semibold wrap-anywhere">{rsvp.name}</span>
            {rsvp.held && <Badge>Held</Badge>}
            {viewerUid !== null && rsvp.uid === viewerUid && <Badge>{mineLabel}</Badge>}
          </span>
          {rsvp.note && (
            <span className="text-caption text-ink-soft wrap-anywhere">{rsvp.note}</span>
          )}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(rsvp)}
            className="btn btn-danger-quiet shrink-0"
            aria-label={`Remove ${rsvp.name}`}
          >
            <Icon id="remove-user" size={14} />
            Remove
          </button>
        )}
      </li>
    ))}
  </ol>
);
