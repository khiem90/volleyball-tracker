/**
 * Not-found route. Renders inside the root layout, so it wears the real shell
 * and the nav stays live — never a dead end. A server component; the shell's
 * client parts are imported from it, which is the normal direction.
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
