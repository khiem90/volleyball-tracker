"use client";

import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbEmptyState } from "@/components/matchbook/EmptyState";

/**
 * The route-level not-found state.
 *
 * It used to be a `Trophy` in a `rounded-3xl bg-muted/50` tile inside the
 * legacy shell, and it was doing three jobs at once — genuinely-missing,
 * deleted, and permission-denied all rendered the same four words. The copy
 * below names the two cases it actually covers and offers the one route out.
 * `MbEmptyState` supplies the state language; the shell is the real one, so a
 * bad id never flashes a different design system.
 */
export const CompetitionNotFound = () => (
  <MatchbookShell active="/competitions">
    <MbEmptyState
      tone="notfound"
      title="No competition exists at this address"
      body="It may have been deleted, or the link may be out of date. Everything else is unaffected."
      actions={[
        { label: "Back to competitions", href: "/competitions", variant: "coral" },
        { label: "New competition", href: "/competitions/new" },
      ]}
    />
  </MatchbookShell>
);
