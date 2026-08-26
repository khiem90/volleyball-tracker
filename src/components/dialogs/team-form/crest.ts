/* ===========================================================================
   THE CREST, IN WORDS

   Both team sheets show a crest before the team exists, and both were mute
   about what it is. A reader who picks Navy and gets a teal shield has no way
   to tell whether the badge is broken, random, or theirs — and the eight-crest
   pack means two teams in a roster of eleven WILL share one (collisions are
   accepted; identity is crest + name + colour bar).

   A mark you can name is a mark you can check. The colour is a contained
   accent and never selects the crest, so the sheet has to say what does —
   the name.

   Strings only, no React, so both dialogs and a test can read it.
   =========================================================================== */

import { crestForTeam } from "@/components/matchbook/types";

/**
 * The pack name of the crest a team wears — "Tide", "Riptide", "Apex".
 *
 * Derived from the path rather than from a second table: `crestForTeam` is the
 * one function that decides, and a lookup beside it would be a copy that can
 * fall out of step with the pack.
 */
export const crestNameFor = (teamName: string, teamId = teamName): string => {
  const slug = crestForTeam(teamId, teamName).split("/").pop()?.replace(/\.svg$/, "") ?? "";
  return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "";
};

/** How many designs the pack holds. The sentence that says so must not drift. */
export const CREST_PACK_SIZE = 8;
