"use client";

import { useState, type FormEvent } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelEmpty, PanelError } from "@/components/matchbook/Panel";
import { NoticeList } from "@/components/rsvp/NoticeList";
import { DeleteConfirmDialog } from "@/components/shared";
import { useNotices } from "@/context/useNotices";
import { NOTICE_BODY_MAX, noticeProblem } from "@/lib/rsvp";
import type { Notice } from "@/types/game";

/**
 * The owner's notices on the RSVP tab: a box to post a new one, and the
 * notices newest first with Delete on each. Everyone on the list sees them
 * on the RSVP page. Posting clears the box at once, since the notice shows
 * from the local write; a refusal puts the text back and says why.
 */
export const NoticesPanel = ({
  tournamentId,
  className = "",
}: {
  tournamentId: string;
  className?: string;
}) => {
  const { notices, error: listError, post, remove } = useNotices(tournamentId, true);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);

  const problem = noticeProblem(draft);
  // An empty box only disables Post; a box over the limit says so.
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
      <form onSubmit={submit} className="flex flex-col gap-1.5 border-b border-mb-rule p-4">
        <label htmlFor="notice-body" className="mb-kicker">
          New notice
        </label>
        <textarea
          id="notice-body"
          className={shownProblem ? "mb-textarea border-mb-red" : "mb-textarea"}
          rows={3}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          placeholder="We moved to 7:30."
          aria-invalid={!!shownProblem}
          aria-describedby="notice-body-help"
        />
        <p
          id="notice-body-help"
          role={shownProblem ? "alert" : undefined}
          className={
            shownProblem
              ? "text-[0.78rem] font-medium text-mb-red"
              : "text-[0.72rem] text-mb-ink-muted"
          }
        >
          {shownProblem ??
            `Up to ${NOTICE_BODY_MAX} characters. Everyone on the list sees it on the RSVP page.`}
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

      {listError ? (
        <PanelError message="The notices could not be loaded. Check your connection and reload." />
      ) : notices === null ? (
        <PanelEmpty message="Loading the notices..." />
      ) : notices.length === 0 ? (
        <PanelEmpty message="No notices yet." />
      ) : (
        <NoticeList notices={notices} onDelete={setDeleting} />
      )}

      <DeleteConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this notice?"
        description="It comes off the RSVP page for everyone on the list. It cannot be undone."
        onConfirm={confirmDelete}
      />
    </Panel>
  );
};
