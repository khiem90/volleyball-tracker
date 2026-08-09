/**
 * Root loading boundary (charter §2.3, invariant 26, W2 / P2b).
 *
 * Next.js shows this the moment a navigation starts and keeps it until the
 * segment's own component is ready, so it is the first thing a user sees on
 * every cold route in the app. It renders the REAL shell — the actual sidebar,
 * the actual nav links, live and clickable — plus a skeleton grid at the final
 * geometry. It never renders `<Navigation/>` or `PageLoadingSpinner`
 * (invariant 2, a hard fail), and it is never a centred spinner (invariant 26,
 * also a hard fail).
 *
 * SCOPE: this is the ROOT boundary, so it also covers `/match/*` (which wants
 * `variant="focus"`) and `/session/*` + `/summary/*` (which want
 * `variant="public"`). Those segments get their own `loading.tsx` from W5 and
 * W6 — a nested boundary wins over this one, and `MbPageLoading` already takes
 * the variant they need. Until then the console shell is the right default,
 * because eleven of the thirteen routes are console routes.
 */

import { MbPageLoading } from "@/components/matchbook/Loading";

export default function RootLoading() {
  return <MbPageLoading variant="console" panels={5} />;
}
