"use client";

import Link from "next/link";
import { PageLoadingSpinner } from "@/components/shared";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelEmpty, PanelError, PANEL_ROW } from "@/components/matchbook/Panel";
import { useListsPage } from "@/components/rsvpList/useListsPage";
import { timeLabel } from "@/lib/rsvp";
import { TAKES_LABEL } from "@/lib/rsvpList";
import { plural } from "@/lib/utils";
import type { RsvpList } from "@/types/game";

/** One list: its name, when it is, what it takes, and whether its link is on. */
const ListRow = ({ list, zone }: { list: RsvpList; zone: string }) => {
  const when =
    list.scheduledAt === undefined
      ? "No scheduled time yet"
      : timeLabel(list.scheduledAt, list.scheduledZone, zone).viewer;

  return (
    <Link
      href={`/rsvp/${list.id}`}
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 ${PANEL_ROW}`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="matchbook-display text-[0.95rem] font-bold leading-tight [overflow-wrap:anywhere]">
          {list.name}
        </p>
        <p className="text-[0.72rem] text-mb-ink-muted">
          {when} • {TAKES_LABEL[list.takes]} • Capacity {list.capacity}
        </p>
      </div>
      <span className="matchbook-display flex items-center gap-1 text-[0.72rem] font-bold">
        <span className={list.enabled ? "text-mb-green" : "text-mb-ink-muted"}>
          Link {list.enabled ? "on" : "off"}
        </span>
        <MbIcon id="chevron-right" size={11} className="text-mb-ink-muted" />
      </span>
    </Link>
  );
};

const ListRows = ({ lists, zone }: { lists: RsvpList[]; zone: string }) => (
  <div className="flex flex-col divide-y divide-mb-rule">
    {lists.map((list) => (
      <ListRow key={list.id} list={list} zone={zone} />
    ))}
  </div>
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
      <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
            RSVP <span className="text-mb-coral">Lists</span>
          </h1>
          <p className="text-[0.85rem] text-mb-ink-muted">
            Find out who will play before you create the tournament.
          </p>
        </div>
        <Link href="/rsvp/new" className="mb-btn mb-btn-coral w-full sm:ml-auto sm:w-auto">
          <MbIcon id="plus" size={14} />
          New list
        </Link>
      </header>

      <div className="flex max-w-3xl flex-col gap-4">
        {page.hasError || lists === null ? (
          <Panel title="Upcoming" icon="calendar">
            <PanelError message="Your lists could not be loaded. Check your connection and reload." />
          </Panel>
        ) : isEmpty ? (
          <Panel title="Upcoming" icon="calendar">
            <PanelEmpty
              message="You have no RSVP lists yet. Create one, turn its link on, and share it."
              actionLabel="New list"
              href="/rsvp/new"
            />
          </Panel>
        ) : (
          <>
            <Panel
              title="Upcoming"
              icon="calendar"
              meta={<span className="mb-kicker">{plural(lists.upcoming.length, "list")}</span>}
            >
              {lists.upcoming.length === 0 ? (
                <PanelEmpty message="No upcoming lists." />
              ) : (
                <ListRows lists={lists.upcoming} zone={page.zone} />
              )}
            </Panel>
            {lists.over.length > 0 && (
              <Panel
                title="Over"
                icon="history"
                meta={<span className="mb-kicker">{plural(lists.over.length, "list")}</span>}
              >
                <ListRows lists={lists.over} zone={page.zone} />
              </Panel>
            )}
          </>
        )}
      </div>
    </>
  );
}
