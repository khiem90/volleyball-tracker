"use client";

import { useParams } from "next/navigation";
import { Card, CardError, PageLoadingSpinner } from "@/components/shared";
import { RsvpDialog } from "@/components/rsvpList/RsvpDialog";
import { ListHeader } from "@/components/rsvpList/ListHeader";
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
 * the link reads the list's name, its scheduled time, and its capacity in
 * the header, and under it where they stand: in, waiting at a position,
 * or not on the list. They RSVP from that card, change their name and
 * note, and withdraw, until the scheduled time. After it the page is
 * read-only. The owner's notices and everyone on the list by name, split
 * into who is in and who is waiting, follow in cards.
 *
 * On a by-team list each RSVP is a team. One person RSVPs the whole team
 * under a team name, and the page says teams where it would say people.
 *
 * Once a tournament imported from the list has started, the page offers
 * it to everyone who can open the page: Watch while it is live, and See
 * results once it is completed.
 *
 * The owner sees the same and RSVPs the same way, and also gets the way
 * back to their lists, the link to copy, the settings to change, Remove
 * on each row, the box for a held spot, and Close or Reopen, all until
 * the scheduled time. Duplicate and Delete stay after it. With the link
 * off, anyone but the owner gets the shared not found, the same as for a
 * list that does not exist. A guest is sent to sign in and back here.
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
      <ListHeader list={list} when={page.when} view={rsvp} isOwner={page.isOwner} />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <ListRsvpPanel list={list} view={rsvp} />

          <ListTournamentsPanel list={list} />

          <ListNoticesPanel
            listId={list.id}
            isOwner={page.isOwner}
            readerUid={rsvp.mine?.uid ?? null}
          />

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
