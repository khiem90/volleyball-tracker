# 07: Console settings actions

**What to build:** From the Settings tab the owner can rename a tournament, duplicate it into a new
draft, end it in any format, and delete it.

**Blocked by:** 06

**Status:** ready-for-agent

- [x] Rename updates the name everywhere it appears.
- [x] Duplicate creates a new draft with the same entries and settings and opens it.
- [x] End moves a Live tournament to Completed, freezes standings, and works for every format; the tournament then shows in the completed list.
- [x] Delete removes the tournament and its matches and returns to the Tournaments tab.
- [x] Engine tests cover End and every status transition.

## Comments

**2026-09-25, implementation.** Done on branch `claude/rotation-lab-redesign`.

- Access. `consoleAccess` in `src/lib/console.ts` gains `canRename`,
  `canDuplicate`, and `canDelete`. The owner can rename a draft or live
  tournament, and can duplicate or delete one in any status; `canManage`
  keeps End, teams, and courts for a live one. Scorers and spectators get
  none of the three. A completed tournament is read-only in the sense that
  nothing in it changes: its Settings tab still offers Duplicate and Delete,
  because story 29 duplicates last week's night and nothing else could
  delete a completed tournament. Rename is not offered, so a completed
  tournament keeps its name. `CONTEXT.md`'s Completed entry now says so.
- Rename. `renameTournament` in `src/lib/tournaments.ts` writes only the
  name, with a fresh revision and updatedAt, so it can never paper over a
  result a court saved at the same moment, and an engine command built on
  the old copy reloads rather than writing the old name back. Every screen
  reads the name from the tournaments subscription, so the console masthead,
  the Tournaments list, History, the ledger filter, the CSV, and the team
  profile follow the local write at once. The Settings tab has the name
  field with Save, offered once the field differs from the stored name; a
  rename from another device replaces the field unless it is being edited.
  A write the server refuses shows in the console's error line.
- Duplicate. `duplicateInput` gives the input a new draft is built from: the
  same format and settings, and the same teams in entry order, named
  "<name> (duplicate)". Teams come from the current roster, so each entry
  takes the team's current name and color, a team that has left the roster
  is left out, and a team that had withdrawn from the source is back in.
  The provider creates it like any draft and hands back the id as soon as
  the local write is issued, and the console opens it.
- End. Unchanged in the engine: status to completed, completedAt stamped,
  matches and format state untouched, no winner named. History's tournament
  list now shows completed tournaments only, newest first, as "Completed
  Tournaments", so an ended tournament leaves the Tournaments tab and
  appears there; ticket 17 owns the rest of History.
- Delete. Settings has Delete behind one confirm that names the tournament;
  the provider's existing delete removes the matches and then the
  tournament, and the console returns to the Tournaments tab. Once the
  tournament has left the cache the page shows a spinner rather than "not
  found" until the list opens.
- Tests. `src/__tests__/engine/status.test.ts` (25 tests) walks every format
  through draft, live, and completed: start and end stamp their times; end
  leaves every match, one in progress included, and the standings as they
  stand; start is refused once live or completed, and end on a draft or a
  completed tournament; results, instant wins, and undo are refused once
  completed; round robin and brackets complete on their own when the last
  match is played and cannot be ended after; the rotation formats stay live
  through forty results and finish only through End. The three End tests
  from `endAndRotation.test.ts` moved there, and the rest of that file is
  now `rotationStart.test.ts`. `console.test.ts` pins the new access flags
  for every role and status. `duplicate.test.ts` (4 tests) covers what a
  duplicate is made from. `tournaments.test.ts` gains three emulator tests:
  a rename writes the trimmed name and moves the revision and nothing else;
  an empty name is refused and writes nothing; a duplicate of a completed
  rotation tournament is a fresh draft with its teams and settings and no
  format state.

Verified against the emulators in the browser with the account already
signed in there, on the dev server another session left on port 3000, since
this session's own server could not take Next's lock on `.next/dev`.
Renaming "Tuesday night" to "Wednesday night" from Settings changed the
masthead at once and the Tournaments list after it. Duplicate opened
"Wednesday night (duplicate)" at its own address as a draft with the same
three teams, Round Robin, no matches, Start offered, and Settings showing
Save, Duplicate, and Delete but no End. Starting it and ending it from
Settings moved it to Completed with the completion time shown, the name
field and End gone, and only Duplicate and Delete left; History's Completed
Tournaments listed it first. Delete's confirm named it, and the page landed
on the Tournaments tab with the renamed original and no duplicate. At 375px
the Settings tab fits with no horizontal scroll and every button is 44px
tall. Typecheck, `eslint src` (0 errors, 13 pre-existing warnings), and the
full suite (267 tests) pass with the emulators up.

Things seen and left alone: the dark-mode hydration error that ticket 18
removes; the browser pane's pointer clicks land off the Radix dialogs, so
the dialog buttons were driven as DOM clicks from the page console; and the
borrowed dev server picked up every TypeScript edit but never rebuilt
`globals.css`, so the red outline on Delete was checked by compiling the
stylesheet through the app's PostCSS and Tailwind pipeline, where the rule
comes through intact. Two boundaries: the delete waits for the server before the list opens, so with
no signal the confirm stays on "Deleting..." until the connection returns,
the same trade ticket 05 made for roster deletes; and a rename moves the
revision, so a queue reorder or court swap built on the copy from before it
is refused, which is the guard doing its job until ticket 09 moves those
edits into engine commands. Ticket 13 owns the rules test that a scorer
cannot rename, end, or delete.

**2026-09-25, review.** A two-axis review (standards and spec) ran on the
staged change. The spec axis traced rename, duplicate, end, delete, and the
status tests by hand and found no defect in what was asked for. What changed
after it:

- "copy" is a word the glossary avoids for Duplicate; the name suffix, the
  doc comment, and the test names now say duplicate.
- A refused rename never reached the console's error line, because the
  provider swallowed the write's rejection; the provider now hands the
  promise back and the console reports the rejection.
- The provider's duplicate repeated create's build-and-save shape; it now
  creates the draft through `createTournament`.
- The red Delete button used utility overrides on the coral outline;
  `.mb-btn-outline-red` joins the matchbook button classes.
- `owns` in the access rules is `ownerOnly`; the status tests' `underway`
  helper is `liveWithOneResult`.

Left as they are: the in-progress match in the status test is set by hand,
which is what the scoring page writes; the four busy-flag actions in
`useConsole` share a shape but not enough to earn a helper yet;
`isDuplicating` clears because the page for the new id mounts fresh, which
the browser confirmed.
