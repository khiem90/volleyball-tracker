"use client";

/**
 * Route error boundary (charter §2.3, invariants 2 / 28, W2 / P2b).
 *
 * Rendered in place of the page when a segment throws, INSIDE the root layout —
 * so the shell around it is the real one, and the nav is live. A user who hits
 * this can leave without using the browser's back button, which is the whole
 * difference between an error state and a dead end (invariant 28).
 *
 * WHAT IT DELIBERATELY DOES NOT SHOW: `error.message`. That string is written
 * by whatever threw — Firebase, Next, a third-party SDK — and invariant 28
 * forbids leaking a raw provider message into the UI. What it shows instead is
 * `error.digest`, the hash Next.js also writes to the server log, which is the
 * one token that lets a user and a maintainer talk about the same incident.
 *
 * It also does not `console.error` the failure. Next has already logged it, and
 * a second write would put a permanent entry in the CONSOLE section of every
 * audit sweep that ever loads this route (invariant 50).
 */

import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbRouteState } from "@/components/matchbook/Loading";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <MatchbookShell variant="console">
      <MbRouteState
        state="error"
        digest={error.digest}
        actions={[
          { label: "Try again", icon: "refresh", onClick: reset },
          { label: "Back to overview", icon: "overview", href: "/", tone: "outline-navy" },
        ]}
      />
    </MatchbookShell>
  );
}
