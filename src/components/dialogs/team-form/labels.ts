/* ===========================================================================
   THE TWO NAMES THE TEAM DIALOGS ANSWER TO

   Strings only — no React, no imports. Every screen that opens one of these
   two sheets reads its trigger label from here, which is the only arrangement
   that makes the defect below impossible to reintroduce one screen at a time.
   =========================================================================== */

/**
 * The single-team action, everywhere it is offered.
 *
 * It had three names. `/teams` put **ADD TEAM** in the masthead; the dashboard
 * and quick-match empty states said **CREATE A TEAM**; and the wizard's team
 * step said **CREATE A TEAM** until the first team existed and then silently
 * became **ADD TEAM** — the same `onCreateTeam` handler, the same sheet, wearing
 * a different name ninety seconds into a first session. That last one is the
 * one a first-run reader actually hits, because the two states are ninety
 * seconds apart on one screen.
 *
 * "New team" rather than either incumbent, for two reasons.
 *
 * **Add is already spent.** `AddEntrantsDialog` and the competition roster use
 * "Add teams" to mean *enter teams that already exist into this competition* —
 * a different action on the same nouns, on screens a user reaches in the same
 * sitting. Reusing "Add team" for creation makes the two indistinguishable
 * until you have opened both.
 *
 * **"Create a team" reads as a first-run instruction.** It is odd wording on
 * the twelfth team, which is precisely why someone reached for a second label
 * once teams existed and started the drift. "New team" is true on the first
 * and on the fiftieth, so no state can want to rename it.
 *
 * The commit button inside the sheet stays a verb ("Create team"): a trigger
 * names where it goes, a commit names what it does. What must never differ
 * again is the trigger and the title of the sheet it opens — so both read this
 * constant.
 *
 * Sentence case is not a rendering choice: `MbButton` and the masthead keys
 * both uppercase their own labels, so this string reaches the screen as
 * "NEW TEAM" in a key and stays "New team" as a dialog title.
 */
export const TEAM_CREATE_LABEL = "New team";

/**
 * The batch action, everywhere it is offered.
 *
 * Same drift, one notch quieter: the wizard's team step offered **QUICK ADD
 * TEAMS** while empty and **QUICK ADD** once populated, and the sheet it opens
 * was titled "Quick add teams" while `/teams` triggered it from a key reading
 * "Quick Add".
 *
 * The short form wins because it is the one that fits: the two keys sit side by
 * side in a masthead and in the wizard's control row, and at 390px "QUICK ADD
 * TEAMS" is what forced the abbreviation in the first place. The sheet keeps a
 * one-line description ("Create a numbered block of teams in one go") which
 * carries the noun the title no longer has to.
 */
export const TEAM_BULK_ADD_LABEL = "Quick add";
