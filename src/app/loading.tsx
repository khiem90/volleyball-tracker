"use client";

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
 * ---------------------------------------------------- IT ASKS WHICH SHELL
 *
 * It used to declare `variant="console"` unconditionally, on the reasoning that
 * "eleven of the thirteen routes are console routes" and that `/session/*`,
 * `/summary/*` and `/match/*` would get their own nested `loading.tsx`. Both
 * halves of that were wrong in the same way: **Next paints the OUTERMOST
 * invalidated boundary first**, so a nested boundary takes over only after the
 * parent subtree resolves and cannot remove the frames above it.
 * `app/match/loading.tsx` records the residual in its own docblock and hands it
 * here; `app/session/loading.tsx` records it too, and the measurement below
 * shows it survived the addition of both.
 *
 * Measured against a PRODUCTION build (`next build` + `next start`, 390x844,
 * navigated with `waitUntil:"commit"` and the DOM sampled every frame) with
 * this file declaring `variant="console"` — first painted frame carried
 * `nav[aria-label="Primary"]`, twelve `.mb-nav-item` rows and the bottom bar:
 *
 *   /summary/GYMDAY                       private chrome 145ms → 179ms   (34ms)
 *   /session/SUMMER                        "      "      163ms → 203ms   (40ms)
 *   /tools/…/shared/demoShare1             "      "      211ms → 383ms  (172ms)
 *   /login                                 "      "      125ms → 380ms  (255ms)
 *
 * Four public surfaces — three of them share links handed to strangers, one of
 * them the sign-in screen — opening on the app's private navigation. It is a
 * dev-only artefact in exactly one respect: `AuthContext`'s preview hatch seeds
 * a user synchronously, so on this dev box frame 0 also carried
 * `preview@localhost` and `Sign out`. In production `MbAccountChip` is still
 * `isLoading` at first paint and draws its skeleton, so the ADDRESS does not
 * appear in the SSR HTML — but the rail, the links and the CTA do, which is the
 * defect. (Verified: `curl` of the production document contains
 * `aria-label="Primary"` and no `Sign out`.)
 *
 * It is also invariant 26 failing in its own words. "A skeleton at the FINAL
 * GEOMETRY" is precisely what a 218px sidebar and a 57px bottom bar are not, on
 * a route whose final geometry is a centred 1100px column with neither.
 *
 * So the boundary asks the URL instead of assuming, through the same
 * `usePathname()` the shell itself uses for `active`. Pages still declare their
 * own variant (shell brief R6) — this is the boundary's prediction of what the
 * page is about to declare, and `src/__tests__/shell/shellVariant.test.ts`
 * fails if a prediction and a declaration ever disagree.
 *
 * `"use client"` costs nothing here: `MbPageLoading` and `MatchbookShell` are
 * both client components already, so this boundary has never been a server
 * component in anything but name.
 */

import { usePathname } from "next/navigation";
import {
  mbIsChromelessRoute,
  mbShellVariantFor,
} from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { LoginSkeleton } from "./login/LoginSkeleton";

/**
 * `public` gets four panels, not five. Five is two full console rows (7/5 then
 * 4/4/4); the public column is narrower and its screens — the live session and
 * the match report — open on a full-width hero over a 7/5 pair, so a fourth
 * panel is the last one that is honest about what is arriving.
 */
const PANELS: Record<ReturnType<typeof mbShellVariantFor>, number> = {
  console: 5,
  public: 4,
  focus: 3,
};

export default function RootLoading() {
  const pathname = usePathname();

  /* `/login` is not a shell at all — a full-bleed two-column poster — so no
     variant is the right answer and the poster's own bones are drawn instead.
     This is the boundary that was flashing the sidebar at it for 255ms. */
  if (mbIsChromelessRoute(pathname)) return <LoginSkeleton />;

  const variant = mbShellVariantFor(pathname);
  return <MbPageLoading variant={variant} panels={PANELS[variant]} />;
}
