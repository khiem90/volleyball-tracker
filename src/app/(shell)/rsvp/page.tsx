"use client";

import Link from "next/link";
import { useListsPage } from "@/components/rsvpList/useListsPage";
import {
  Card,
  CardEmpty,
  CardError,
  CARD_ROW,
  Chip,
  DateTile,
  Icon,
  PageLoadingSpinner,
} from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";
import { timeLabel } from "@/lib/rsvp";
import { TAKES_LABEL } from "@/lib/rsvpList";
import { plural } from "@/lib/utils";
import type { RsvpList } from "@/types/game";

/**
 * One list: a date tile, its name, when it is, what it takes and how many,
 * and whether its link is on. A list with no scheduled time yet gets a tile
 * with a calendar in it, so every name starts at the same place.
 */
const ListRow = ({ list, zone }: { list: RsvpList; zone: string }) => {
  const when =
    list.scheduledAt === undefined
      ? "No scheduled time yet"
      : timeLabel(list.scheduledAt, list.scheduledZone, zone).viewer;

  return (
    <Link href={`/rsvp/${list.id}`} className={`flex items-center gap-3 ${CARD_ROW}`}>
      {list.scheduledAt === undefined ? (
        <span className="date-tile min-h-11 justify-center text-ink-soft" aria-hidden="true">
          <Icon id="calendar" size={18} />
        </span>
      ) : (
        <DateTile at={list.scheduledAt} zone={zone} />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-title font-bold leading-tight wrap-anywhere">{list.name}</span>
        <span className="text-caption text-ink-soft">{when}</span>
        <span className="text-caption text-ink-soft">
          {TAKES_LABEL[list.takes]} • Capacity {list.capacity}
        </span>
      </span>
      <Chip tone={list.enabled ? "action" : "fill"}>Link {list.enabled ? "on" : "off"}</Chip>
    </Link>
  );
};

const ListRows = ({ lists, zone }: { lists: RsvpList[]; zone: string }) => (
  <ul className="divide-y divide-line">
    {lists.map((list) => (
      <li key={list.id}>
        <ListRow list={list} zone={zone} />
      </li>
    ))}
  </ul>
);

/**
 * The RSVP tab: the account's own RSVP lists, the upcoming ones first by
 * scheduled time and then the ones that are over, with a button to create
 * a new one. Each row opens the list's page, which is also its RSVP link.
 */
export default function RsvpListsPage() {
  const page = useListsPage();

  if (page.isLoading) return <PageLoadingSpinner />;

  const { lists } = page;
  const isEmpty = lists !== null && lists.upcoming.length === 0 && lists.over.length === 0;

  return (
    <>
      <PageHeader
        title="RSVP Lists"
        line="Find out who will play before you create the tournament."
        action={
          <Link href="/rsvp/new" className="btn btn-action">
            <Icon id="plus" size={18} />
            New list
          </Link>
        }
      />

      <div className="flex max-w-3xl flex-col gap-4">
        {page.hasError || lists === null ? (
          <Card title="Upcoming" icon="calendar">
            <CardError message="Your lists could not be loaded. Check your connection and reload." />
          </Card>
        ) : isEmpty ? (
          <Card title="Upcoming" icon="calendar">
            <CardEmpty
              message="You have no RSVP lists yet. Create one, turn its link on, and share it."
              actionLabel="New list"
              href="/rsvp/new"
            />
          </Card>
        ) : (
          <>
            <Card title="Upcoming" icon="calendar" meta={plural(lists.upcoming.length, "list")}>
              {lists.upcoming.length === 0 ? (
                <CardEmpty message="No upcoming lists." />
              ) : (
                <ListRows lists={lists.upcoming} zone={page.zone} />
              )}
            </Card>
            {lists.over.length > 0 && (
              <Card title="Over" icon="history" meta={plural(lists.over.length, "list")}>
                <ListRows lists={lists.over} zone={page.zone} />
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
