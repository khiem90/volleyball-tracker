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
 * theirs. The console and the RSVP page both show it, so a link that has
 * been turned off reveals nothing about which one it was.
 */
export const NotFound = ({ reason, isGuest }: { reason: NotFoundReason; isGuest: boolean }) => {
  const pathname = usePathname();
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
