"use client";

/* ===========================================================================
   THE STRIPS UNDER THE EVENT BAR (public-share brief §3.3.7, §3.6 S5, S4)

   Four bands, all of them narrow, all of them above the scoreboard, none of
   them a card at the bottom of the page — which is where the shipped
   "You're viewing this session in read-only mode" notice lived, ~1,500px below
   the fold, on the one screen where the reader's permissions decide whether
   half the affordances they can see do anything.

   THE ORDER IS THE PRIORITY ORDER, and only one of the top three can be true
   at a time:

     ended     the event is over. States it, keeps the scores below it
     stale     the feed is faulted. States what the scores on screen ARE —
               the last ones received — and does NOT remove them (brief S5)
     token     an `?admin=` link was opened and did not match this event.
               It used to fail in silence
     role      read-only, with the two ways out of it

   The read-only band is dismissible because it is the only one a reader can
   act on and then not need again; the other three describe the state of the
   world and are not the reader's to dismiss.
   =========================================================================== */

import { MbButton } from "@/components/matchbook/Button";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbNotice } from "@/components/matchbook/Notice";
import type { SessionRole } from "@/types/session";

export const SessionEndedBanner = () => (
  <MbNotice tone="info" icon="check" title="That's full time">
    The organiser has closed this event. Everything below is the final
    scoreline — it will not change again. Ask them for the match report if you
    want the full ledger.
  </MbNotice>
);

/**
 * `offline` distinguishes the two causes, because the reader can act on one of
 * them and not on the other: no network interface is theirs to fix, a faulted
 * subscription is ours. Neither sentence names a provider or an error code
 * (invariant 28) — the shipped page put `Missing or insufficient permissions.`
 * on screen verbatim.
 */
export const SessionStaleBanner = ({
  offline,
  onRetry,
}: {
  offline: boolean;
  onRetry: () => void;
}) => (
  <MbNotice
    tone="warn"
    icon="wifi-off"
    title={offline ? "You are offline" : "Not receiving updates"}
  >
    <span className="flex flex-col items-start gap-2">
      <span>
        The scores below are the last ones this device received — they are not
        wrong, they are just not moving.{" "}
        {offline
          ? "They will catch up on their own when your connection returns."
          : "This usually fixes itself."}
      </span>
      <MbButton variant="outline-navy" size="sm" icon="refresh" onClick={onRetry}>
        Reconnect
      </MbButton>
    </span>
  </MbNotice>
);

export const SessionTokenRejected = ({ onDismiss }: { onDismiss: () => void }) => (
  <MbNotice tone="danger" icon="key" title="That scorer link is not for this event">
    <span className="flex flex-col items-start gap-2">
      <span>
        You are still watching, and nothing is broken. Ask the organiser for a
        fresh link, or paste the token by hand.
      </span>
      <MbButton variant="outline-navy" size="sm" onClick={onDismiss}>
        Dismiss
      </MbButton>
    </span>
  </MbNotice>
);

/**
 * The role band. A ruled strip rather than a `MbNotice`, because it is not a
 * problem — it is the ordinary state of this page for almost everybody who
 * ever opens it, and a warning frame around "you are watching a match" is
 * noise. Creator and admin get the same strip in the other direction: the one
 * thing an editor needs to know here is that the scoreboards are tappable.
 */
export const SessionRoleBand = ({
  role,
  onSignIn,
  onDismiss,
}: {
  role: SessionRole;
  onSignIn: () => void;
  onDismiss: () => void;
}) => {
  if (role !== "viewer") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-mb-navy px-1 py-2.5">
        <MbIcon
          id={role === "creator" ? "crown" : "shield"}
          size={15}
          className="shrink-0 text-mb-navy"
        />
        <p className="mb-kicker min-w-0">
          {role === "creator" ? "You created this event" : "You can score this event"}
        </p>
        <p className="min-w-0 text-[0.78rem] text-mb-ink-muted">
          Open any match on court to change its score.
        </p>
      </div>
    );
  }

  /**
   * THE WRAP ORDER IS THE WHOLE DESIGN OF THIS BAND.
   *
   * The first cut was one flex row with the sentence as `flex-1` between the
   * eyebrow and the two controls. At 390px that gave the sentence ~90px of
   * column and it set as SIX ragged lines, 120px tall, directly above the
   * score — a read-only notice that cost more vertical than the scoreboard it
   * was qualifying.
   *
   * So the sentence is `order-last w-full` below `sm`: eyebrow and controls
   * share the first line, the sentence takes the second at full measure. From
   * `sm` up the explicit orders put it back inline where there is room for it.
   */
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-mb-navy px-1 py-2"
    >
      <MbIcon id="eye" size={15} className="shrink-0 text-mb-navy" />
      <p className="mb-kicker min-w-0">Read-only</p>
      <span className="ml-auto flex items-center gap-2 sm:order-3">
        <MbButton variant="outline-navy" size="sm" icon="key" onClick={onSignIn}>
          I can score
        </MbButton>
        <MbButton variant="outline-navy" size="sm" onClick={onDismiss}>
          Hide
        </MbButton>
      </span>
      <p className="order-last w-full min-w-0 text-[0.78rem] text-mb-ink-muted sm:order-2 sm:w-auto sm:flex-1">
        You are watching. Scores are updated by whoever is running the event.
      </p>
    </div>
  );
};
