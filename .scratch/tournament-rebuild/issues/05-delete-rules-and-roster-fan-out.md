# 05: Delete rules and roster fan-out

**What to build:** Deleting a team that is in a live tournament is refused and Withdraw is offered
instead. Deleting a team removes its entries from drafts. Renaming or recoloring
a team flows into its draft and live entries and leaves completed tournaments
untouched. The roster gets a select mode with bulk delete.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [x] Delete on a team with a live entry shows a refusal that names the tournament and links to Withdraw (Withdraw itself lands in the format management tickets).
- [x] Deleting a team removes its entry from every draft tournament.
- [x] Renaming a team updates the entry name on a live tournament's standings; a completed tournament keeps the old name.
- [x] Select mode lets several teams be chosen and deleted behind one confirm; teams with live entries are skipped and named.
- [x] A unit test covers which entries a rename touches.

## Comments

**2026-09-24, implementation.** Done on branch `claude/rotation-lab-redesign`.

- `src/lib/entries.ts` holds the pure part. `fanOutTeamChange` says which
  tournaments a rename or recolor reaches: every draft or live tournament the
  team is entered in whose entry does not already match, with withdrawn marks
  and every other entry left as they were. `planTeamDeletion` says what
  deleting a set of teams would do: which go, which a live tournament keeps
  back, and which drafts lose an entry. Completed tournaments are never in
  either answer. `entryTeams` keeps its read-time roster lookup as the
  fallback for the moment before a write lands.
- `src/lib/roster.ts` writes through those plans. `updateRosterTeam` and
  `deleteRosterTeams` take the account's tournaments as the page knows them,
  then read the ones they touch again inside a transaction, so a withdrawal
  or a result saved on a court a moment ago is kept. Each tournament write
  moves the revision on, so an engine command built on the old copy reloads
  instead of writing over it. A transaction that loses a race is retried up
  to five times, one attempt per call so a phone with no signal does not
  stall. `isOffline` and `lostRace` moved to `firestoreData.ts` so the
  tournaments module and the roster module share them.
- Offline. A rename with no signal still updates the team, queued by the
  offline cache, and leaves its entries for the next rename made online; the
  owner's screens read roster names while a tournament is a draft or live,
  so only a spectator sees the old one until then. Deleting a team that is in
  no draft or live tournament works offline like any roster write. Deleting
  one that is in a draft needs the stored tournaments read first, which
  offline cannot do, so that delete is refused with a message and nothing
  changes. The review pointed out that queuing tournament edits from a stale
  copy could drop a withdrawal or strip a team from a draft that went live
  meanwhile, which is what ADR-0001 exists to prevent, so this trade was made
  on purpose.
- The Teams page. Delete on the profile panel asks the plan first: when the
  team is in a live tournament the refusal names the tournament and links to
  its page, where Withdraw will live once tickets 09 to 11 land; otherwise one
  confirm covers it. Select in the directory header turns on select mode: the
  add strip gives way to a bar with the count, a select-all for the rows
  shown, and Delete selected; rows get checkboxes and a tap checks a row. One
  confirm names the teams a live tournament keeps back, and a line under the
  masthead afterwards says what went and what stayed. When nothing chosen can
  go, the refusal appears instead of a confirm. The dialogs keep their content
  while they animate closed.
- Vocabulary: "kept" is the word for a team a live tournament keeps on the
  roster, in the plan, the outcome, and the copy. Draft-or-live is spelled out
  rather than named, since the glossary has no word for it; a candidate for
  /domain-modeling.
- Tests: `src/__tests__/roster/entries.test.ts` covers which entries a rename
  touches and what a deletion plan contains (10 tests). `roster.test.ts`
  gains four emulator tests: a rename reaches a draft and a live tournament
  and leaves a completed one alone; a delete takes the entry out of every
  draft; a team in a live tournament is kept and named while the rest go; a
  draft that went live after the page loaded keeps its team, because the
  write re-checks the stored copy.

Verified against the emulators in the browser with a throwaway account. With
a live, a draft, and a completed round robin seeded: Delete on a team in the
live one showed "Aces is in a live tournament" with "Open Tuesday night to
withdraw" linking to that tournament. Renaming that team changed its entry in
the live and draft tournament documents, moved their revisions, and the live
standings showed the new name, while the completed tournament's document and
page kept "Aces". Deleting a team entered only in the draft removed its entry
and team id from that document. Select mode with three teams checked, two of
them in the live tournament, showed one confirm naming the two kept teams,
deleted the third, and reported "Deleted Eagles. Kept Block Party and
Chasers, still in a live tournament." Selecting only live teams gave the
refusal instead of a confirm. At 375px the selection bar wraps with no
horizontal overflow. Typecheck, `eslint src` (0 errors, 13 pre-existing
warnings), and the full suite (212 tests) pass with the emulators up. The JDK
note in the spec is out of date: Temurin 21 is installed and the emulators
ran here.

Things seen and left alone: the built-in browser still logs the dark-mode
hydration error ticket 18 removes; the browser pane dropped pointer clicks on
the Radix dialogs again, so the dialog flows were driven through DOM clicks
from the page console, and the Playwright browser was locked by another
session. The matchbook buttons are 39px tall, under the 44px ticket 18 asks
for.

Not in this ticket: Withdraw itself (09 to 11), the console page the refusal
will link into (06), and bringing a spectator's view of a rename made offline
up to date before the next online rename.
