/**
 * Not-found route (charter §2.3, invariants 2 / 25 / 28, W2 / P2b).
 *
 * Renders inside the root layout, so it wears the real shell and the nav is
 * live — a wrong address is the single most likely place for a first-time
 * visitor to land, and landing there with no way out is the dead end
 * invariant 28 forbids.
 *
 * A server component: nothing here is interactive except two links, and the
 * shell's own client parts (`MatchbookSidebar` reads `usePathname`) are client
 * components imported from it, which is the normal direction.
 */

import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbRouteState } from "@/components/matchbook/Loading";

export default function NotFound() {
  return (
    <MatchbookShell variant="console">
      <MbRouteState
        state="notFound"
        actions={[
          { label: "Back to overview", icon: "overview", href: "/" },
          {
            label: "Browse competitions",
            icon: "compete",
            href: "/competitions",
            variant: "outline-navy",
          },
        ]}
      />
    </MatchbookShell>
  );
}
