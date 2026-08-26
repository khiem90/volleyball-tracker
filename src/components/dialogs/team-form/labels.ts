/* The names the team dialogs answer to. Strings only — every screen that
   opens one of these sheets reads its trigger label from here, so the label
   cannot drift one screen at a time. */

/**
 * The single-team action, everywhere it is offered. NOT "Add team": "Add" is
 * spent — `AddEntrantsDialog` uses it to mean *enter existing teams into a
 * competition*. The commit button inside the sheet stays a verb ("Create
 * team"); the trigger and the sheet title must both read this constant.
 * Sentence case: `MbButton` and the masthead keys uppercase their own labels.
 */
export const TEAM_CREATE_LABEL = "New team";

/**
 * The batch action, everywhere it is offered. The short form is the one that
 * fits beside the create key at 390px; the sheet's one-line description
 * carries the noun the title no longer has to.
 */
export const TEAM_BULK_ADD_LABEL = "Quick add";
