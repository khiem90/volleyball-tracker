"use client";

import { useState, type FormEvent } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelEmpty, PanelError } from "@/components/matchbook/Panel";
import { NoticeList } from "@/components/rsvpList/NoticeList";
import { DeleteConfirmDialog } from "@/components/shared";
import { useListNotices } from "@/context/useListNotices";
import { NOTICE_BODY_MAX, noticeProblem } from "@/lib/rsvp";
import type { Notice } from "@/types/game";

/**
 * A list's notices, newest first, on the list's page. Everyone who can
 * open the page reads them. The owner also gets a box to post a new one
 * and Delete on each, before and after the scheduled time.
 *
 * Posting clears the box at once, since the notice shows from the local
 * write. A refusal puts the text back and says why. Anyone but the owner
 * sees no panel until there is a notice to read.
 *
 * `readerUid` is the viewer's uid while they have an RSVP on the list.
 * Opening the page records on that RSVP that they have seen the notices,
 * whether or not there is one to show.
 */
export const ListNoticesPanel = ({
  listId,
  isOwner,
  readerUid,
  className = "",
}: {
  listId: string;
  isOwner: boolean;
  readerUid: string | null;
  className?: string;
}) => {
  const { notices, error: loadError, post, remove } = useListNotices(listId, readerUid);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);

  const problem = noticeProblem(draft);
  // An empty box only disables Post. A box over the limit says so.
  const shownProblem = draft.trim().length > 0 ? problem : null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (problem) return;
    const body = draft;
    setError(null);
    setDraft("");
    post(body).catch((failure: unknown) => {
      console.error("Failed to post the notice:", failure);
      setDraft((current) => (current === "" ? body : current));
      setError("The notice could not be posted. Check your connection and try again.");
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const notice = deleting;
    setDeleting(null);
    setError(null);
    remove(notice.id).catch((failure: unknown) => {
      console.error("Failed to delete the notice:", failure);
      setError("The notice could not be deleted. Check your connection and try again.");
    });
  };

  if (!isOwner && !loadError && (notices === null || notices.length === 0)) return null;

  return (
    <Panel
      title="Notices"
      icon="bell"
      meta={
        notices && notices.length > 0 ? (
          <span className="matchbook-display text-[0.72rem] font-bold tracking-[0.1em]">
            {notices.length}
          </span>
        ) : undefined
      }
      className={className}
    >
      {isOwner && (
        <form onSubmit={submit} className="flex flex-col gap-1.5 border-b border-mb-rule p-4">
          <label htmlFor="list-notice-body" className="mb-kicker">
            New notice
          </label>
          <textarea
            id="list-notice-body"
            className={shownProblem ? "mb-textarea border-mb-red" : "mb-textarea"}
            rows={3}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            placeholder="We moved to 7:30."
            aria-invalid={!!shownProblem}
            aria-describedby="list-notice-body-help"
          />
          <p
            id="list-notice-body-help"
            role={shownProblem ? "alert" : undefined}
            className={
              shownProblem
                ? "text-[0.78rem] font-medium text-mb-red"
                : "text-[0.72rem] text-mb-ink-muted"
            }
          >
            {shownProblem ??
              `Up to ${NOTICE_BODY_MAX} characters. Everyone on the list sees it on this page.`}
          </p>
          {error && (
            <p role="alert" className="text-[0.78rem] font-medium text-mb-red">
              {error}
            </p>
          )}
          <button type="submit" className="mb-btn mb-btn-navy mt-1.5 self-start" disabled={!!problem}>
            <MbIcon id="bell" size={14} />
            Post
          </button>
        </form>
      )}

      {loadError ? (
        <PanelError message="The notices could not be loaded. Check your connection and reload." />
      ) : notices === null ? (
        <PanelEmpty message="Loading the notices..." />
      ) : notices.length === 0 ? (
        <PanelEmpty message="No notices yet." />
      ) : (
        <NoticeList notices={notices} onDelete={isOwner ? setDeleting : undefined} />
      )}

      {isOwner && (
        <DeleteConfirmDialog
          open={deleting !== null}
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Delete this notice?"
          description="It comes off this page for everyone on the list. You cannot bring it back."
          onConfirm={confirmDelete}
        />
      )}
    </Panel>
  );
};
