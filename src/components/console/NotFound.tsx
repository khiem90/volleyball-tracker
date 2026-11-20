"use client";

import { usePathname } from "next/navigation";
import { Panel, PanelEmpty } from "@/components/matchbook/Panel";
import { STALE_SCORER_LINK } from "@/lib/shareLinks";
import { signInHref } from "@/lib/shell";
import type { NotFoundReason } from "./useConsole";

/**
 * Why a tournament page shows nothing. The tournament is not there, or not
 * shared with this phone, or the scorer link it opened has been replaced.
 * A guest is offered sign-in, coming back here, in case the tournament is
 * theirs.
 *
 * An RSVP list's page shows it with `subject` set to "list". The words
 * are the same whether the list was deleted, never existed, or has its
 * RSVP link off.
 */
export const NotFound = ({
  reason,
  isGuest,
  subject = "tournament",
}: {
  reason: NotFoundReason;
  isGuest: boolean;
  subject?: "tournament" | "list";
}) => {
  const pathname = usePathname();
  if (subject === "list") {
    return (
      <Panel title="List not found">
        <PanelEmpty
          message="This RSVP list does not exist or is not being shared."
          actionLabel="Back to RSVP"
          href="/rsvp"
        />
      </Panel>
    );
  }
  const message =
    reason === "stale_link"
      ? STALE_SCORER_LINK
      : isGuest
        ? "This tournament does not exist or is not being shared. If it is yours, sign in to open it."
        : "This tournament does not exist, is not being shared, or belongs to another account.";
  return (
    <Panel title={reason === "stale_link" ? "Scorer link replaced" : "Tournament not found"}>
      <PanelEmpty
        message={message}
        actionLabel={isGuest ? "Sign in" : "Back to tournaments"}
        href={isGuest ? signInHref(pathname) : "/competitions"}
      />
    </Panel>
  );
};
