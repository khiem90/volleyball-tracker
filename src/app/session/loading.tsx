/**
 * The `/session/*` loading boundary (W6, claimed by `app/loading.tsx`'s own
 * docblock: "those segments get their own `loading.tsx` from W5 and W6").
 *
 * WHY IT HAD TO EXIST. Next shows the NEAREST boundary from the moment a
 * navigation commits, and the root one renders `MbPageLoading variant="console"`
 * — the real sidebar, the real nav links, the account chip with the signed-in
 * user's email in it. Measured on a cold load of `/session/SUMMER` at 390px:
 * frame 0 was the console shell reading "Overview Teams Quick Compete History
 * Tools · Quick Match · preview@localhost · Sign out", and the public shell
 * only arrived at ~100ms.
 *
 * That is the app's private chrome, with somebody's account on it, flashing on
 * the one route the product hands to strangers. It is also the exact defect
 * the brief records for `PageLoadingSpinner` (§2.4.16) reappearing through a
 * different door.
 *
 * The fallback is the SAME component the route's own `<Suspense>` uses, so
 * there is one loading picture for this screen rather than two that hand over
 * to each other.
 */

import { MatchbookShell } from "@/components/matchbook/AppShell";
import { SessionSkeleton } from "@/components/session/SessionSkeleton";

export default function SessionLoading() {
  return (
    <MatchbookShell variant="public">
      <SessionSkeleton />
    </MatchbookShell>
  );
}
