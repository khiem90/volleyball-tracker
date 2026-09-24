# 02: Tournaments and matches on Firestore for round robin and brackets

**What to build:** Tournaments are documents owned by the account, each match is its own document
under its tournament, and a pure tournament engine produces start, match
completion, and auto-completion for Round Robin, Single Elimination, and Double
Elimination. Session mode and everything attached to it is gone. The existing
competition pages keep working on the new store, so an owner can run two
round-robin tournaments at once.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Creating a tournament writes a document with owner, name, format, status Draft, entries that snapshot each team's name and color, and settings.
- [x] Starting writes one match document per scheduled match; completing a match updates that document plus whatever the engine schedules next, never a whole array.
- [x] Two round-robin tournaments can be Live at the same time; both appear on the tournaments list and both open.
- [x] Starting a tournament no longer creates a session. The session and summary routes, contexts, admin tokens, and the localStorage reducer are removed.
- [x] Engine tests cover start, complete, and auto-complete for the three formats, including single elimination with five and six teams.
- [x] Rules tests: the owner can write a tournament and its matches; a different account and a signed-out request cannot; a tournament with spectator access off is unreadable by anyone but the owner.
- [x] Type check passes and the existing competition detail and match pages work against the new provider.

## Comments

**2026-09-23, implementation.** Done on branch `claude/rotation-lab-redesign`.

- Types: `Tournament` (owner, format, status draft/live/completed, entries,
  teamIds, settings, spectatorEnabled, revision) and `Match` (ownerId,
  tournamentId, court, forfeitedBy) replace `Competition` and the old match
  shape in `src/types/game.ts`. Tie settings are gone from the settings and
  from the creation wizard. `AuthUser` moved to `src/types/auth.ts`.
- Engine: `src/lib/engine` is the pure tournament engine. `applyCommand` takes
  `start`, `complete_match`, or `end` plus the tournament and its matches and
  returns the next tournament and per-match writes (creates and field-level
  updates). Best-of series are handled there too: a game that does not decide
  the series resets the score for the next game. `brackets.ts` routes winners
  and losers for single and double elimination and settles matches that can
  never get a second team, which is what lets five-, six-, and seven-team
  brackets reach their final. Completion is read from the final itself, not
  from the team count. Rotation formats start and complete through the same
  entry point using the existing libraries; ticket 03 owns their tests, undo,
  and the two-court concurrency test.
- Data: `src/lib/tournaments.ts` holds `tournaments/{id}` and its `matches`
  subcollection. Commands load the tournament and matches, run the engine,
  and write the result in a transaction that first checks the tournament's
  `revision`; a stale revision reloads and retries. When the client is
  offline the same writes go out as a batch so scoring continues. Quick
  matches moved to `users/{uid}/matches` (`src/lib/quickMatches.ts`) so one
  collection group query returns every match an account owns.
- Rules and indexes: owner-only writes on tournaments and matches, reads for
  anyone only while `spectatorEnabled` is true, a `{path=**}/matches` rule
  for the account-wide query, and two composite indexes (tournaments by owner
  and date, matches collection group by owner and date). The `|| true` update
  rule is gone with the sessions collection.
- Provider: `AppProvider` is a thin layer over the roster, tournaments, and
  account-wide match subscriptions plus the domain actions. Sessions,
  summaries, admin tokens, the localStorage reducer, and the `/session` and
  `/summary` routes are deleted. The History page at `/summaries` keeps the
  local ledger and lost its session-backed "Shared Reports" panel. The
  old detail, list, creation, and match pages run on the new provider with
  their old design; `src/lib/entries.ts` gives them a team list that shows
  roster names while a tournament is a draft or live and the entry snapshot
  once it is completed.
- Tests: 52 engine tests (`src/__tests__/engine`), 39 rules tests, and 10
  data-layer tests that drive the module through the emulator and assert on
  the documents. Each emulator-backed test file now gets its own emulator
  project, because running three of them in parallel against one project let
  one file's `clearFirestore` wipe another's data mid-test.
- `src/lib/formats.ts` is the one table of format labels, minimum team
  counts, and families; the engine, the creation page, the detail page, and
  the list all read it.

Verified here against the emulators at 375px: two round-robin tournaments
were created and started from the app, both listed as Live and both opened;
a match scored 3-1 on the match page came back to the detail page with the
standings updated and one match document changed; the emulator shows six
match documents per tournament and no match array on either tournament.
Typecheck, `eslint src` (0 errors, 13 pre-existing warnings), and the full
suite (154 tests) pass with the emulators up.

**2026-09-23, review.** A two-axis review (standards and spec) ran on the
staged change. What it found and what changed:

- The bye resolver judged each bracket match from a copy taken at the start
  of its pass, so when one settlement filled another match's slot in the
  same pass, that match was still seen as one-sided and handed to the wrong
  team. Playing a five-team double elimination with the later-round match
  first ended it after six matches instead of eight. Fixed by re-reading each
  match before judging it; tests now play five- to nine-team brackets in
  both orders and check the match count.
- `loadTournament` read the tournament and its matches in parallel, so a
  commit landing between the two responses could pass the revision check
  with stale matches. It now reads the tournament first.
- Direct tournament writes (queue reorder, court swap, undo) replaced the
  whole document with no guard. `updateTournament` now checks the revision
  the caller's state was built on and refuses with `StaleTournamentError`
  if the tournament moved; two tests cover it.
- Creating a tournament and starting a quick match awaited the server, so
  with no signal the Create button spun until reconnect. The provider now
  returns as soon as the local write is issued; the subscription shows the
  document from the cache at once.
- The engine and the creation page disagreed on minimum team counts; both
  now read `src/lib/formats.ts`. A few glossary slips in names and copy
  ("archive", "walkover", "2 Match Rotation") and a wrong path in a comment
  were fixed, and the per-file emulator project id gained a hash so two
  long test names cannot collide.

Left for later tickets, as the review noted: the court and queue edits in
the provider still shape the tournament document outside the engine (03 and
09), entry names resolve against the roster at read time until 05 adds the
write-time fan-out (a spectator, who cannot read the roster, would see the
snapshot until then), and the forfeit column in standings is ahead of 10.

Things seen and left alone: the built-in browser still logs the dark-mode
hydration error ticket 18 removes; the built-in browser pane dropped pointer
clicks on this session's Radix dialogs so the click-through above was driven
with Playwright, which had no such trouble. Whole-repo lint reports thousands
of errors from the sibling worktree's `node_modules` under `.claude/`, which
ticket 20's lint ignore list should cover.

Not in this ticket: engine commands for edit result, withdraw, add team,
courts, and queue (tickets 03, 05, 09 to 11), the scorer key and spectator
toggle (13), and landing on the new tournament after creation (08).
