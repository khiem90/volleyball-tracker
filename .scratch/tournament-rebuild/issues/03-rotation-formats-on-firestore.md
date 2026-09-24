# 03: Rotation formats on Firestore

**What to build:** Win 2 & Out and Two Match Rotation start, play, instant win, and undo through
engine commands applied in transactions, so two courts finishing at once never
lose a result.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Starting a rotation tournament writes the format state and the first matches.
- [x] Completing a match on one court while another completes on a second court keeps both results; a test runs the two transactions concurrently.
- [x] Instant win records the result and schedules the next match; undo restores the previous state.
- [x] Engine tests cover queue advancement, champion streaks, and next-match scheduling for both formats.

## Comments

**2026-09-23, implementation.** Done on branch `claude/rotation-lab-redesign`.

- Engine: two new commands. `instant_win` takes a match and the winner and
  records it as a full-score win, then settles it like any result, so the UI
  no longer invents a score. `undo_result` takes back the latest result on a
  court. When a rotation result is settled, `src/lib/engine/rotation.ts`
  compares the format state before and after and keeps what moved on the
  state as `lastResults`: the court as it stood, the teams sent to the queue,
  the teams pulled from it, the touched team statuses, the scheduled match's
  id, and the match's own status and points. Undo replays that record on the
  current state: it removes the queued teams from wherever they now sit,
  puts the pulled teams back at the head, restores the court and the touched
  statuses, deletes the scheduled match, and puts the match back as it was.
  Nothing else is touched, so an undo on court 1 leaves a result that landed
  on court 2 in the meantime alone. Each court keeps its last five results
  as a stack and only the newest can be undone, so the toast's five levels
  still work. Undo is refused once the court has moved on: the scheduled
  match has points or a result, a queued team has been pulled onto another
  court, or the court has been rearranged. The format libraries
  (`win2out.ts`, `twoMatchRotation.ts`) are unchanged.
- Writes: a `delete` match write joins create and update, so undo removes
  the match it scheduled inside the same transaction as everything else.
- Provider and UI: `instantWin` and `undoResult` are provider actions over
  the engine. The instant win hook calls `instantWin` and pushes an entry
  naming the tournament and match; the undo toast calls `undoResult` and
  drops the entry whether it succeeded or was refused, since a refused undo
  can never apply later. The client-side snapshot (`createSnapshot`,
  `deepCloneTournament`, `UndoSnapshot`) and the provider's `deleteMatch`
  are gone.
- Tests: 36 new engine tests (`win2out.test.ts`, `twoMatchRotation.test.ts`,
  `undoResult.test.ts`) cover queue advancement, champion streaks, next-match
  scheduling, two courts sharing one queue, instant win, and undo for both
  formats, including the two-court interleaving, reverse-order undo, the
  points of a match completed from the scoring page, and every refusal.
  Three new data-layer tests drive the module through the emulator: a
  rotation start writes the state and one match per court; two
  `complete_match` commands on two courts run under `Promise.all` and both
  results survive; an instant win then an undo leaves the documents as they
  were.
- Glossary: `CONTEXT.md` gains Undo.

Verified here: typecheck, `eslint src` (0 errors, 13 pre-existing warnings),
and the full suite (193 tests) pass with the emulators up; the
emulator-backed files were run three more times and the concurrency test
held. The dev server starts and the home page loads with no new console
errors. The tap-through of instant win and undo in the browser was not done
in this session because it needs a signed-in emulator account, which the
agent does not create; the same provider path is exercised by the data-layer
tests.

Seen and left alone: the emulator-backed suites print a Firestore
"Received message larger than max" error on teardown. The untouched roster
suite prints it too, so it predates this ticket.

Not in this ticket: add team, withdraw, change courts, swap courts, and
reorder queue as engine commands (09); undo for Round Robin and the
brackets, which have edit result instead (10, 11).

**2026-09-23, review.** A two-axis review (standards and spec) ran on the
working tree. The spec axis traced the two-court undo and the concurrency
test by hand and found no bug. What changed after the standards axis:

- The undo record's doc comment still described one record per court after
  the design had become a stack of five; it now says what the code does,
  and the type and field are `RotationUndoRecord` and `undoRecords`.
- The toast dropped an undo entry on any failure. It now drops it only
  after the undo applied or the engine refused it, and keeps it on any
  other error so the tap can be tried again.
- The engine's undo depth and the toast's stack size were two unlinked
  fives; the toast now reads the engine's.
- One action went by three names; the rotation helpers are `recordResult`,
  `canUndo`, and `applyUndo`. The repeated `Pick` of a match's status and
  points is `MatchProgress`. `openOn` moved into the engine test helpers.
- Test names used "holder", "challenger", and "crowns", none of which the
  glossary had. They now use glossary words, and `CONTEXT.md` gains
  Champion, which the ticket, the format library, and the views already
  used.

Things both axes noted and left as they are:

- Undoing court 1 after court 2 has played on does not replay history. The
  team court 2 drew from the queue stays there; the team court 1 pulled
  goes back to the head of the queue. This is the "leave the other court
  alone" choice the ticket asks for, and `undoResult.test.ts` pins it.
- Undo is offered only on the phone that recorded the result, because the
  toast's stack lives in React state. The engine command itself works from
  any client; a per-court "undo last result" in the console is ticket 09's
  to add if wanted.
- Each result writes up to five undo records per court into the tournament
  document. That is bounded and small, and it is what keeps the toast's
  five levels honest.
- Match delete is owner-only in `firestore.rules`. When ticket 13 lets
  scorers write matches, the delete rule needs the same scorer clause or a
  scorer's undo will fail in the transaction.
- The legacy state-level `currentChampionId` is restored from the undone
  court's record; with two courts it can differ from what stood before.
  Nothing reads it without a court number.
