# 09: Rotation management

**What to build:** On a live Win 2 & Out or Two Match Rotation tournament, the owner can add a team
to the queue, withdraw a team, change the number of courts, swap teams between
courts, and reorder the queue with tap controls.

**Blocked by:** 03, 06

**Status:** ready-for-agent

- [x] Adding a team while live appends it to the queue.
- [x] Withdraw removes the team from the queue or its court; the court's other team stays in place.
- [x] Reducing courts sends the removed court's teams to the front of the queue; increasing courts fills from the queue.
- [x] Swap and reorder work with tap controls; no drag is required.
- [x] Engine tests cover each command.

## Comments

**2026-09-25, implementation.** Done on branch `claude/rotation-lab-redesign`.

- Engine: five commands for a live Win 2 & Out or Two Match Rotation
  tournament. `add_team` enters a roster team and puts it at the back of
  the queue; a team that had withdrawn rejoins the same way with its record
  kept, and a court the tournament runs but that had gone empty opens if
  the queue can now fill it. `withdraw` marks the entry and takes the team
  off the queue or its court: the team it was playing stays, the next team
  in the queue comes on, and the court's match starts over with the new
  pairing, dropping any points on the board; with nobody waiting the court
  closes and the team left on it goes to the front of the queue.
  `change_courts` sets the number of courts: courts above the new number
  close and send their teams to the front of the queue in court order,
  courts below it open from the queue, and a count the teams still in play
  cannot fill is refused. `swap_teams` trades two teams' places between
  two courts or between a court and the queue, and is refused while either
  court's match is in play; a team keeps its run when it goes to another
  court and starts over when it goes to the queue. `reorder_queue` moves a
  waiting team to a place counted from the front, clamped to the ends. The
  shape the two formats share lives in `src/lib/engine/rotation.ts`: a
  small rules table per format (fresh status, queued status, on-court
  status, an opening court, a court with new teams) and pure helpers over
  it that say which courts opened, changed, or closed; the engine turns
  that into match writes. Round Robin and the brackets refuse all five for
  now; 10 and 11 give them their own add and withdraw.
- Undo: each command drops the undo records it would make unsafe to
  replay. Withdraw drops the court's records and any that mention the
  team; closing a court and swapping drop records for the courts touched
  and any that mention the teams sent to the queue; reorder and add keep
  them, so a court's last result can still be undone after the queue is
  rearranged.
- Provider and console: the provider's `updateTournament` and the four
  court and queue actions that shaped the tournament document are gone,
  replaced by five actions over the engine, so every edit runs in the same
  transaction as results and is applied again on a fresh copy when a court
  saved in between. The Courts tab has Swap under each team on a waiting
  court, a two-tap flow with a Cancel strip, and up and down buttons on
  each queue row; the drag dialogs and their hooks are deleted. The Teams
  tab, for the owner of a live rotation tournament, has an add strip that
  enters a roster team by name or creates one first, Withdraw behind a
  confirm, and Rejoin on a withdrawn row. Settings has a stepper for the
  courts in play, and closing a court whose match is in play asks first.
  Swap and reorder key off `canEditCourts`, so scorers get them with 13;
  add, withdraw, and courts key off `canManage`.
- Tests: `src/__tests__/engine/rotationManagement.test.ts` (68 tests)
  drives each command for both formats: adding, rejoining, and the court
  that reopens; withdrawing from the queue, from a court with and without
  a queue, and mid-match; closing and opening courts and the refusals;
  swapping court to court and court to queue, the run that carries over,
  and the refusals; reordering with clamping; and what each command does
  to undo. `tournaments.test.ts` gains one emulator test that adds,
  withdraws, and closes a court through Firestore.
- Glossary: `CONTEXT.md` gains Swap, and Withdraw says what it means in
  the rotation formats and that a withdrawn team can be added again.

Verified here: typecheck, `eslint src` (0 errors, 13 pre-existing
warnings), and the full suite (347 tests) with the emulators up. Not
verified in the browser: starting the emulators for the tests wiped the
emulator account earlier sessions had signed in with, and the console
needs a signed-in owner, which the agent does not create. In its place
the three changed panels were rendered server-side against engine-built
worlds (courts with the reorder buttons, with a swap under way, and for a
spectator; teams with add, withdraw, and rejoin; settings with the
stepper) in a throwaway check that was not kept. The tap-through at 375px
is still to do.

Judgement calls, from the review:

- With nobody waiting, a withdrawal from a court closes the court and
  sends the other team to the front of the queue with its run reset,
  because a court holds two teams or none. The glossary says so.
- Rejoin, the court that reopens after an add, and creating a roster team
  from the Teams tab's add strip are in no story. The first two fall out
  of `add_team` deciding what to do with a withdrawn entry and an empty
  court; the third follows the creation page's never-leave-the-page rule.
- The rotation withdraw drops the points of a match in play rather than
  forfeiting it, which is what "the court's other team stays in place"
  asks for. Round Robin forfeits arrive with 10.

Left for later:

- Normal play has had an undo hole since 03: a team a court's result
  queued, pulled onto another court, played there, and queued again makes
  the first court's record undoable with a stale status snapshot. The
  management commands guard their own cases now; the play case is for a
  later ticket.
- `editRotation` is the third switch on the rotation format in the
  engine, beside `settle` and `undoResult`; one accessor could serve all
  three.
- `useConsole` now holds the shell actions, team entry, courts, and swap
  state; the team block could become its own hook.

**2026-09-25, review.** A two-axis review (standards and spec) ran on the
working tree. The spec axis traced withdraw with and without a queue,
courts down and up, both kinds of swap, undo after each command, and
reorder clamping, and confirmed the role split. What changed after it:

- `removeTeam` is `withdrawTeam`, and neither the glossary's Swap entry
  nor the swap helper says "move" for a team changing court.
- The engine refuses swapping two waiting teams, which the console never
  asked for; reorder is the way.
- A Two Match Rotation team arriving mid-run on a court still in its first
  match no longer gets a third match: a court's first-match rule ends when
  a team with a match already played arrives. A test pins it.
- Closing a court, and swapping a team into the queue, also drop undo
  records that mention the displaced teams, so a result on another court
  that had queued one of them cannot be undone with a stale status. Two
  tests pin it.
- Closing a court whose match is in play asks first, the way withdraw
  does, instead of dropping the match on a tap.
- The older inline `not_live` checks use the new `requireLive`;
  `openMatchOn` is one function shared by the engine and the console; the
  error codes `same_place` and `already_withdrawn` say what they mean; the
  busy flag is `isApplying`.
