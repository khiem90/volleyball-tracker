"use client";

import { useParams } from "next/navigation";
import { Card, CardError, PageLoadingSpinner } from "@/components/shared";
import { RsvpDialog } from "@/components/rsvpList/RsvpDialog";
import { ListLinkPanel } from "@/components/rsvpList/ListLinkPanel";
import { ListNotFound } from "@/components/rsvpList/ListNotFound";
import { ListNoticesPanel } from "@/components/rsvpList/ListNoticesPanel";
import { ListPeoplePanel } from "@/components/rsvpList/ListPeoplePanel";
import { ListRsvpPanel } from "@/components/rsvpList/ListRsvpPanel";
import { ListOwnerPanel } from "@/components/rsvpList/ListOwnerPanel";
import { ListSettingsPanel } from "@/components/rsvpList/ListSettingsPanel";
import { ListTournamentsPanel } from "@/components/rsvpList/ListTournamentsPanel";
import { useListPage } from "@/components/rsvpList/useListPage";

/**
 * A list's page, which is also its RSVP link. A signed-in person holding
 * the link sees the list's name, its scheduled time, its capacity, and
 * everyone on it by name, split into who is in and who is waiting. They
 * RSVP from here, change their name and note, and withdraw, until the
 * scheduled time. After it the page is read-only.
 *
 * On a by-team list each RSVP is a team. One person RSVPs the whole team
 * under a team name, and the page says teams where it would say people.
 *
 * Once a tournament imported from the list has started, the page offers
 * it to everyone who can open the page: Watch while it is live, and See
 * results once it is completed.
 *
 * The owner sees the same and RSVPs the same way, and also gets the link
 * to copy, the settings to change, Remove on each row, the box for a held
 * spot, and Close or Reopen, all until the scheduled time. Duplicate and
 * Delete stay after it. With the link off, anyone but the owner gets the
 * shared not found, the same as for a list that does not exist. A guest
 * is sent to sign in and back here.
 */
export default function RsvpListPage() {
  const params = useParams();
  const page = useListPage(params.id as string);

  if (page.isLoading) return <PageLoadingSpinner />;

  const { list, settings, rsvp } = page;
  if (page.hasLoadError) {
    return (
      <Card title="RSVP list">
        <CardError message="The list could not be loaded. Check your connection and reload." />
      </Card>
    );
  }
  if (!list) return <ListNotFound />;

  return (
    <>
      <header className="mb-4 flex flex-col gap-2">
        <span className="mb-kicker">RSVP</span>
        <h1 className="matchbook-display min-w-0 max-w-full text-3xl font-bold leading-none tracking-[0.01em] [overflow-wrap:anywhere] sm:text-5xl">
          {list.name}
        </h1>
        {page.when ? (
          <p className="flex flex-wrap items-baseline gap-x-2 text-[0.95rem] font-semibold">
            <span>{page.when.viewer}</span>
            {page.when.owner && (
              <span className="text-[0.8rem] font-normal text-mb-ink-muted">
                {page.when.owner} where it was set
              </span>
            )}
          </p>
        ) : (
          <p className="text-[0.85rem] text-mb-ink-muted">No scheduled time yet.</p>
        )}
      </header>

      <ListNoticesPanel
        listId={list.id}
        isOwner={page.isOwner}
        readerUid={rsvp.mine?.uid ?? null}
        className="mb-4"
      />

      <ListTournamentsPanel list={list} className="mb-4" />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <ListRsvpPanel list={list} view={rsvp} />

          {page.isOwner && <ListLinkPanel link={page.link} />}

          {page.owner && <ListOwnerPanel controls={page.owner} wording={rsvp.wording} />}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-7">
          <ListPeoplePanel view={rsvp} takes={list.takes} controls={page.owner} />

          {settings && <ListSettingsPanel settings={settings} />}
        </div>
      </div>

      <RsvpDialog
        open={rsvp.dialog.isOpen}
        name={list.name}
        wording={rsvp.wording.dialog}
        entry={rsvp.dialog.entry}
        isEditing={rsvp.dialog.isEditing}
        joinsWaitlist={rsvp.state?.kind === "full"}
        isSending={rsvp.dialog.isSending}
        isWithdrawing={rsvp.dialog.isWithdrawing}
        error={rsvp.dialog.error}
        onChange={rsvp.dialog.change}
        onSend={rsvp.dialog.send}
        onWithdraw={rsvp.dialog.withdraw}
        onClose={rsvp.dialog.close}
      />
    </>
  );
}
