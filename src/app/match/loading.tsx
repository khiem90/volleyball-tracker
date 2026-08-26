/**
 * The scoring segment's own loading boundary: the root `app/loading.tsx`
 * draws the console *shell*, but the match console is full-bleed with an
 * action rail — without this file every cold arrival painted the wrong shell
 * first. `MatchConsoleSkeleton` is the same component the route renders while
 * AppContext is still reading localStorage, so every pre-match paint shares
 * one geometry (and the server render matches, which is what killed the
 * "Match not found" flash on successful loads).
 */

import { MatchConsoleSkeleton } from "@/components/match";

export default function MatchLoading() {
  return <MatchConsoleSkeleton />;
}
