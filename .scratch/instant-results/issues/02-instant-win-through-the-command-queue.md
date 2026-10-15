# 02: Instant Win shows at once and survives a race

**What to build:** A scorer taps the winner on a court and the court moves on immediately: the
winner goes to the queue or stays on, the next match appears, and the undo toast is offered. The
write happens in the background as one batch built on the phone's own copy. When two phones record
the same court, the first to reach the server stands; the other phone's court snaps back and the
console's error line says that court was already recorded by another scorer. Results on different
courts never clash.

**Blocked by:** 01

**Status:** resolved

- [x] A command queue lives in the data module with no React in it: it holds the commands the server has not yet acknowledged, in order, and the copy of the tournament and matches they produced.
- [x] Instant Win applies the engine to the queue's copy when commands are pending, otherwise to the subscribed copy, and writes the result as a single batched write carrying `basedOn`.
- [x] The court moves on from the local cache before the server answers, online or on a slow connection.
- [x] A refused write is told apart from a stale scorer link by reading the tournament, as the scorer guard does today; a stale link fails every queued command with the stale-link error and empties the queue.
- [x] After a refused write the queue waits for the fresh copy and replays every unacknowledged command in order; a replayed command that the engine refuses is dropped and its promise rejects with the engine's error, the court, and the fact it was reversed.
- [x] Replay is bounded to a handful of attempts per command; a command that runs out is dropped and reported the same way.
- [x] The console shows a reversed win on its existing error line, naming the court in the tournament's terminology; any other failure keeps its current wording.
- [x] The undo toast entry is pushed when the win is applied locally, not when it is acknowledged.
- [x] Emulator tests: two phones on different courts both land; two phones on one court end with one result and the loser's promise rejecting as reversed; a command built on a stale copy is refused and lands on replay when its court is untouched; two taps in a row on one phone are both built on the first's result; a stale scorer link fails the queued command with the stale-link error.
- [x] Console tests: the reversal notice text from a reversed command and the court terminology.

## Comments

Implemented on branch `worktree-agent-a16fb855f80bcbe13` (ticket 02). The queue lives in
`src/lib/commandQueue.ts`; `applyTournamentCommand` moved there with its signature intact and
`queueTournamentCommand` returns `{ outcome, done }`. The refusal check reads the tournament with a
transaction `get`, not `getDocFromServer`: the SDK answers the latter through any live listener on
the same document, which stays authorized after the scorer link goes stale. The queue releases its
listeners once nothing is pending; a listener left open at process exit made the emulator's clear
endpoint answer 500 for the next run. The existing regenerated-link test now expects
`StaleScorerLinkError` from the data module, since the queue classifies the refusal itself.

- 2026-10-15: Implemented test-first on the integration branch `claude/instant-results` (merge a5b0a23); code-review fixes landed in a3ae899. All acceptance boxes ticked; the full suite (572 tests) passes against the emulator.
