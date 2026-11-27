"use client";

import { useState } from "react";
import { DateTile, NoDateTile } from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";
import { deviceZone, type TimeLabel } from "@/lib/rsvp";
import type { RsvpList } from "@/types/game";
import type { ListRsvpView } from "./useListRsvpView";
import { LABEL } from "@/components/shared/classes";

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <dt className={LABEL}>{label}</dt>
    <dd className="text-body font-semibold tabular-nums">{value}</dd>
  </div>
);

/**
 * What a list's page opens with: the list's name, a date tile with the
 * scheduled time beside it, and the capacity in people or in teams with
 * how many are in and waiting. The two counts wait for the RSVPs.
 *
 * The owner gets the way back to their lists. Someone who only holds the
 * link has no list of their own to go back to, so they get none.
 */
export const ListHeader = ({
  list,
  when,
  view,
  isOwner,
}: {
  list: RsvpList;
  /** The scheduled time on this phone's clock. Null while the list has none. */
  when: TimeLabel | null;
  view: ListRsvpView;
  isOwner: boolean;
}) => {
  const [zone] = useState(deviceZone);
  const { split, wording } = view;
  const at = list.scheduledAt ?? null;

  return (
    <PageHeader
      back={isOwner ? { href: "/rsvp", label: "RSVP lists" } : undefined}
      title={list.name}
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pb-3.5 lg:pb-5">
        <div className="flex min-w-0 items-center gap-3">
          {at === null ? <NoDateTile /> : <DateTile at={at} zone={zone} />}
          {when ? (
            <p className="flex min-w-0 flex-col gap-0.5">
              <span className="text-title font-semibold">{when.viewer}</span>
              {when.owner && (
                <span className="text-caption text-ink-soft">{when.owner} where it was set</span>
              )}
            </p>
          ) : (
            <p className="text-label text-ink-soft">No scheduled time yet.</p>
          )}
        </div>

        <dl className="flex gap-6">
          <Fact label="Capacity" value={wording.count(list.capacity)} />
          <Fact label="In" value={split ? String(split.confirmed.length) : "..."} />
          <Fact label="Waiting" value={split ? String(split.waitlisted.length) : "..."} />
        </dl>
      </div>
    </PageHeader>
  );
};
