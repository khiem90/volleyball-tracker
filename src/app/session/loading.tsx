/**
 * The `/session/*` loading boundary. Without it the root boundary paints the
 * private console shell — sidebar, nav, the signed-in account chip — on the
 * one route the product hands to strangers. The fallback is the same
 * component the route's own `<Suspense>` uses, so there is one loading
 * picture for this screen.
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
