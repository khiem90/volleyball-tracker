# 02: Instant Win shows at once and survives a race

**What to build:** A scorer taps the winner on a court and the court moves on immediately: the
winner goes to the queue or stays on, the next match appears, and the undo toast is offered. The
write happens in the background as one batch built on the phone's own copy. When two phones record
the same court, the first to reach the server stands; the other phone's court snaps back and the
console's error line says that court was already recorded by another scorer. Results on different
courts never clash.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A command queue lives in the data module with no React in it: it holds the commands the server has not yet acknowledged, in order, and the copy of the tournament and matches they produced.
- [ ] Instant Win applies the engine to the queue's copy when commands are pending, otherwise to the subscribed copy, and writes the result as a single batched write carrying `basedOn`.
- [ ] The court moves on from the local cache before the server answers, online or on a slow connection.
- [ ] A refused write is told apart from a stale scorer link by reading the tournament, as the scorer guard does today; a stale link fails every queued command with the stale-link error and empties the queue.
- [ ] After a refused write the queue waits for the fresh copy and replays every unacknowledged command in order; a replayed command that the engine refuses is dropped and its promise rejects with the engine's error, the court, and the fact it was reversed.
- [ ] Replay is bounded to a handful of attempts per command; a command that runs out is dropped and reported the same way.
- [ ] The console shows a reversed win on its existing error line, naming the court in the tournament's terminology; any other failure keeps its current wording.
- [ ] The undo toast entry is pushed when the win is applied locally, not when it is acknowledged.
- [ ] Emulator tests: two phones on different courts both land; two phones on one court end with one result and the loser's promise rejecting as reversed; a command built on a stale copy is refused and lands on replay when its court is untouched; two taps in a row on one phone are both built on the first's result; a stale scorer link fails the queued command with the stale-link error.
- [ ] Console tests: the reversal notice text from a reversed command and the court terminology.
