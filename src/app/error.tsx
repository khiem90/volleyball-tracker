"use client";

/**
 * Route error boundary. Renders inside the root layout, so the shell and nav
 * stay live. Deliberately shows `error.digest` (the hash Next also writes to
 * the server log) and never `error.message` — that string comes from whatever
 * threw and must not leak into the UI. No `console.error` either: Next has
 * already logged the failure.
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
          { label: "Back to overview", icon: "overview", href: "/", variant: "outline-navy" },
        ]}
      />
    </MatchbookShell>
  );
}
