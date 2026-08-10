"use client";

/* ===========================================================================
   THE FOUR DEAD ENDS, REDRAWN AS SCREENS (public-share brief §3.6)

   Every one of these replaces a `rounded-2xl bg-destructive/10` blob over a
   centred sentence, and two of them replace something worse than that:

     not found     used to be the FIRST PAINT of every visit (brief S2). It is
                   now only reachable once the lookup has answered, and it
                   tells the reader the two things that actually help — the
                   code they tried, and what a real code looks like.
     unavailable   used to read "Firebase Not Configured. Please set up
                   Firebase…" to a member of the public (brief S7, S5). The
                   word Firebase does not appear anywhere on this route.
     denied        used to be the raw string "Missing or insufficient
                   permissions." (brief S6).

   All four are `MbEmptyState` at `scale="route"`, inside the same public
   shell the live page uses, so a stranger who lands on a wrong code still
   lands on this product rather than on a stack trace.

   The FIFTH state — ended — is deliberately not here. It is not a dead end:
   the last scores stay on screen behind a banner, which is `SessionBanners`.
   =========================================================================== */

import { MbEmptyState } from "@/components/matchbook/EmptyState";

/** Codes are generated from an alphabet with the ambiguous glyphs removed. */
const CODE_RULE = "Codes are six characters and never use the digit 0, the letter O, the digit 1 or the letter I.";

export const SessionNotFound = ({ shareCode }: { shareCode: string }) => (
  <MbEmptyState
    tone="notfound"
    title="No event with that code"
    body={
      <>
        Nothing is being scored under{" "}
        <span className="mb-code-chip tabular-nums">{shareCode || "—"}</span>. It
        may have finished, or a character may have been mistyped. {CODE_RULE}
      </>
    }
    actions={[{ label: "Go to Tournament Tracker", href: "/", icon: "overview" }]}
  />
);

export const SessionDenied = () => (
  <MbEmptyState
    tone="denied"
    title="This event is private"
    body="The organiser has not made this event public. Ask them for a fresh link — the one you have will not open it."
    actions={[{ label: "Go to Tournament Tracker", href: "/", icon: "overview" }]}
  />
);

/**
 * One state for two causes — no backend configured, and a backend that
 * refused to answer at all — because they are the same fact to the reader:
 * there is nothing to watch and it is not their fault. Splitting them would
 * only tell a stranger which of our problems it is.
 */
export const SessionUnavailable = ({ onRetry }: { onRetry?: () => void }) => (
  /* `offline`, not `unconfigured`. The tone supplies the eyebrow, and
     "Not set up" beside a body that says "right now" and a "Try again" button
     is three statements that disagree. "Offline" is true of both causes as the
     reader experiences them: the scores cannot be reached. */
  <MbEmptyState
    tone="offline"
    title="We can't reach these scores"
    body="Live scores cannot be loaded right now. This is at our end, not yours — trying again in a moment usually works."
    actions={
      onRetry
        ? [
            { label: "Try again", onClick: onRetry, icon: "refresh" },
            { label: "Go to Tournament Tracker", href: "/", icon: "overview" },
          ]
        : [{ label: "Go to Tournament Tracker", href: "/", icon: "overview" }]
    }
  />
);
