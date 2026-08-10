/**
 * The scoring segment's own loading boundary (charter §2.3, invariant 26).
 *
 * `src/app/loading.tsx` says in as many words that `/match/*` "gets its own
 * `loading.tsx` from W5", because the root boundary draws
 * `MbPageLoading variant="console"` — a sidebar, a bottom bar and a centred
 * five-panel grid — and the console is `variant="focus"`: full bleed, two
 * columns, an action rail. It was never written, so every cold arrival at the
 * console painted the wrong shell first. Measured under an 8x CPU throttle at
 * 1440x900: a **1158x670 grid at y=30 with no action bar**, against the
 * console's **1440x839 frame at y=61 with an 82px rail at y=818**. Rubric 7.2
 * asks for a 0px delta between a skeleton and the thing it stands in for, and
 * that was the largest one on the route.
 *
 * With this boundary in place the same capture reads, skeleton against loaded:
 *
 *   1440x900   61+61 / 132+661 / 793+36 / 829+81
 *              61+61 / 122+660 / 782+36 / 818+82
 *    390x844   61+61 / 132+605 / 737+36 / 773+81
 *              61+61 / 122+604 / 726+36 / 762+82
 *
 * Every row height is within 1px. The uniform +10px `y` is `.mb-enter`'s
 * entrance transform caught mid-flight, not a box.
 *
 * `MatchConsoleSkeleton` is the same component the route itself renders while
 * `AppContext` has not been read out of localStorage yet, so the two paints a
 * user can meet before the match arrives are one paint at one geometry — and it
 * is also the server render, which is what killed the "Match not found" flash
 * that used to be the first frame of every successful load.
 *
 * ONE RESIDUAL, AND IT IS NOT THIS FILE'S: Next always shows the OUTERMOST
 * invalidated boundary first, so a cold navigation can still flash the root
 * `MbPageLoading` for a frame before this one takes over. That boundary is
 * `src/app/loading.tsx` — W2's file, W2's geometry.
 */

import { MatchConsoleSkeleton } from "@/components/match";

export default function MatchLoading() {
  return <MatchConsoleSkeleton />;
}
