# Instant results

Status: ready-for-human

Agreed in a grilling session on 2026-10-14. Vocabulary is in `CONTEXT.md`. The
structural decision, moving the concurrency check from a client transaction into
the Firestore rules, is recorded as ADR-0003.

## Problem Statement

I run Win 2 & Out and Two Match Rotation nights with Instant Win on, often with
two or three phones scoring through the scorer link. When I tap "Reds won" the
court sits there for a second or more before the next match appears. There is no
sign that the tap took, so people tap again, or tap the other team, and then get
"The result could not be recorded". On a crowded night with weak gym Wi-Fi this
turns every result into a small argument about whether it went in.

Underneath, the app reads the tournament and all of its matches from the server,
then runs a transaction, before anything changes on screen. A phone that has lost
its signal entirely is, oddly, faster: its write is queued and shown at once, but
with no check at all, so when it reconnects it overwrites whatever the other
phones recorded meanwhile.

## Solution

Every result and every court edit shows on the phone the moment it is tapped and
is confirmed in the background. The court moves on at once: the winner goes to
the queue or stays on, the next match appears, and the undo toast is offered
right away.

If two phones record the same court within the same moment, the first to reach
the server wins. The other phone's court snaps back to what the server has, and
the console's error line says that court was already recorded by another scorer.
Results on different courts never clash, so with several phones on several
courts nobody ever sees a notice.

A phone with no signal keeps scoring. Its results go when the connection returns
and are checked against what landed meanwhile, the same as any other result.

Nothing marks a result as "still saving". The only visible traces of the
mechanism are a brief moment after a tap during which the court's win buttons do
not respond, so a double tap cannot record the next match by accident, and the
notice when a result is taken back.

## User Stories

1. As a scorer, I want the court to move on the instant I tap the winner, so that I can look back up at the next match without waiting on the network.
2. As a scorer, I want the undo toast to appear as soon as I tap, so that a wrong tap can be taken back at once.
3. As a scorer, I want Undo to work on a win the server has not confirmed yet, so that fixing a mistake is never slower than making it.
4. As a scorer on weak Wi-Fi, I want my taps to feel the same as on a good connection, so that the gym's network does not set the pace of the night.
5. As a scorer whose phone has lost its signal, I want to keep recording results, so that the court is not held up until the signal returns.
6. As a scorer whose phone reconnects, I want my queued results to land in order, so that the queue and the courts end up the way I saw them.
7. As a scorer, I want a double tap on a court to record one result and not two, so that the next match is never finished by accident.
8. As a scorer, I want no spinner or "saving" marker on a court, so that the console stays as calm as a scoreboard.
9. As a scorer on one of several phones, I want results on different courts never to interfere with each other, so that several of us can score at once without ever seeing an error.
10. As a scorer who recorded a court that another phone had just recorded, I want my court to snap back to what the server has and a notice naming the court, so that I know whose result stood and can use Undo if it was wrong.
11. As a scorer whose win was taken back, I want its undo toast entry to disappear, so that I am never offered an undo for a result that no longer exists.
12. As a scorer who tapped Undo before a reversal arrived, I want that undo to be dropped with the win, so that the court is not undone twice.
13. As a scorer finishing a match from the scoring page, I want to be back on the console at once with the result in place, so that finishing feels the same as an instant win.
14. As a scorer, I want Swap and queue reorder to show at once, so that moving a team around is not slower than recording a result.
15. As the owner, I want Start to show the first matches at once, so that the night begins the moment I tap.
16. As the owner, I want End to complete the tournament at once, so that the final standings appear without a wait.
17. As the owner, I want a correction from Schedule or the Bracket tab to show at once, so that fixing a score feels immediate.
18. As the owner, I want to rename a tournament while courts are scoring and have neither the rename nor a result lost, so that housekeeping never costs a result.
19. As the owner, I want a result that was queued offline on a scorer's phone to be checked against what landed meanwhile, so that a reconnecting phone can never silently overwrite results from other phones.
20. As the owner, I want a scorer to be unable to sidestep the check by writing to Firestore directly, so that the revocable link stays the only credential that matters.
21. As the owner who opened my own scorer link, I want the console to behave the same as on my signed-in phone, so that I can score from either without surprise.
22. As a scorer whose link the owner regenerated, I want my next tap to tell me the link is stale rather than silently reverting forever, so that I ask for a new link instead of guessing.
23. As a spectator, I want to see results as they land, with no change in how the console looks, so that watching is unaffected.
24. As a scorer, I want a result that the engine refuses on the fresh state, such as a win on a court that already moved on, to be dropped with a notice rather than retried forever, so that the console never gets stuck.
25. As a scorer, I want the console's existing error line to carry the reversal notice, so that there is one place to look when something did not take.
26. As a developer, I want one write path for online and offline, so that the two cannot drift apart again.
27. As a developer, I want the engine untouched by this change, so that every format rule stays testable with plain values.
28. As a developer, I want the rules tests to prove that a stale write is refused for both the owner and a scorer, so that the concurrency guarantee is tested where it lives.
29. As a developer, I want the emulator-backed tournament tests to prove that two phones on different courts both land and that two phones on one court resolve to one result, so that the shared-tournament behaviour is pinned down.

## Implementation Decisions

### One write path: batched writes checked by the rules

- An engine command is applied on the phone's current copy of the tournament and its matches and written as a single batched write, not a transaction. Firestore shows a batched write from the local cache at once and rolls it back by itself if the server refuses it. This is what makes the court move instantly, online or offline.
- The tournament document gains a `basedOn` field: the revision the write was built on. On every write that changes `revision`, the rules refuse the write unless `basedOn` equals the stored `revision`. The match writes travel in the same batch, so a refused tournament write takes them with it.
- A scorer's update must change `revision` and carry a matching `basedOn`, in addition to the existing field allow-list. An owner's update must carry a matching `basedOn` whenever it changes `revision`. A write that leaves `revision` alone is unaffected.
- Rename keeps moving the revision, so it now carries `basedOn` too and is retried on the fresh copy if refused. A refused rename is reported on the console's error line as today.
- The transaction, its single-attempt setting, and the separate offline fallback are removed. The reload-and-retry loop that re-read the tournament from the server is replaced by the replay below.
- The engine is unchanged. A command's `now` and new match ids are produced on the phone as they are today.

### The command queue

- Each tournament the phone is acting on has a command queue, a small object in the data layer with no React in it. It holds the commands the server has not yet acknowledged, in order, and the copy of the tournament and matches those commands produced.
- A new command is applied by the engine to the queue's copy when the queue is non-empty, and to the phone's subscribed copy when it is empty. The engine's result is written at once and becomes the queue's new copy. This keeps a second tap building on the first even before the subscription has caught up.
- A command's write resolving acknowledges it and drops it from the queue. When the queue empties, the subscribed copy is the source again.
- A refused write means the stored tournament moved past `basedOn`, or the phone's scorer link is stale. The queue tells the two apart the way the scorer guard does today: a read of the tournament. If the link is stale, every queued command fails with the stale-link error and the queue empties. Otherwise the queue waits for the subscription to deliver the fresh copy and replays every unacknowledged command on it, in order, each as a new write.
- A replayed command the engine refuses, for example `match_completed` or `court_moved_on` because another phone recorded that court, is dropped and reported through the command's own promise with the engine's error, the court it concerned, and the fact that it was reversed. Commands behind it keep replaying.
- Replay is bounded as today, a handful of attempts per command, after which the command is dropped and reported the same way.
- Firestore guarantees that writes from one client reach the server in order, so no extra sequencing is needed between a write and the one after it. The queue serialises replays so that no new write is issued while a replay is building on a copy that is about to change.

### Console behaviour

- The console treats every command's promise the same: nothing on success, the error line on failure. A reversal reads "Court 2 was already recorded by another scorer." using the tournament's court terminology, and any other failure keeps its current wording.
- After a tap on a court's win button, that court's win buttons do not respond for roughly half a second. There is no spinner, disabled styling, or marker. The guard is per court.
- The undo toast entry for a win is pushed as soon as the win is applied locally, before any acknowledgement.
- When a win is reversed, the undo toast drops that win's entry. An undo already queued behind a reversed win is reported as reversed too and leaves no entry.
- The scoring page finishes a match the same way: it navigates on the engine's local result and any reversal shows on the console's error line afterwards.
- No glossary change. Instant Win, Undo, Tournament, Court, Scorer, and Owner already name everything a person sees.

### Data and rules

- Tournament document: add `basedOn` (string). No migration: existing documents have a `revision` for the next write to base on, and the rules only compare on update.
- Rules: on tournament update, `revision` changed implies `basedOn == resource.data.revision`; scorer updates require `revision` to change; `basedOn` joins the scorer field allow-list.
- Deploying this while a tournament is live will refuse writes from phones still on the old build until they reload. Deploy between nights.

## Testing Decisions

A good test exercises what a person or another module can observe: documents after a write, what a subscription delivers, which writes the rules refuse, what a promise resolves or rejects with. No test reaches into the queue's internals or asserts on how many Firestore calls were made.

Three seams, all existing:

- **Firestore rules**, tested with the rules unit-testing package against the emulator, as the existing rules suite does. New cases: an update that changes `revision` with a wrong or missing `basedOn` is refused for the owner and for a scorer; a scorer update that leaves `revision` alone is refused; a matching `basedOn` is accepted; a rename with a matching `basedOn` is accepted.
- **Tournament data module**, tested against the emulator the way the existing tournament suite tests commands, scorer phones, and the stale-revision cases. New cases: a command resolves and its documents land; two phones on different courts both land without either being lost; two phones on one court end with one result and the loser's promise rejecting with the engine's error and the reversal; a command built on a stale copy is refused by the rules and lands on replay when the court is untouched; a stale scorer link fails every queued command with the stale-link error; two taps in a row on one phone are both built on the first's result; a rename racing a result loses nothing. The emulator's network can be disabled and re-enabled to cover the offline queue landing in order.
- **Console logic**, pure, as the existing console suite tests access and view helpers. New cases: the reversal notice text from a reversed command and the court terminology; the win-button guard's timing rule; the undo stack dropping a reversed win's entry.

The engine suites are untouched. No component or hook tests are added; the repo has none and the behaviour above is reachable from the three seams.

## Out of Scope

- Any change to the engine or to format rules.
- Quick matches, which have no revision and are private to the account.
- Roster writes, which are already latency-compensated field writes.
- A visible "unconfirmed" marker, a pending-results count, or a sync status screen.
- Merging two phones' results on the same court, or asking a scorer which was right.
- Notifying the phone whose result stood that another phone's was reversed.
- Component or hook tests.

## Further Notes

- The old offline fallback wrote without any revision check, so a reconnecting phone could overwrite other phones' results. The new path closes that hole as a side effect; it is worth a line in the release note.
- The existing comment on the command runner says engine commands run "in a transaction". That wording, and the comments on undo and correction that repeat it, change with the code.
- The number of replay attempts and the length of the tap guard are tuning values, not contracts; pick sensible defaults and keep them in one place.
