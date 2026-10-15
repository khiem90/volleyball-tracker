---
status: accepted
---

# Tournament writes are optimistic and the rules reject stale ones

Every change to a started tournament is an engine command. Until now a command re-read the tournament and its matches from the server and committed the engine's result in a transaction that checked the tournament's revision. A transaction is never shown from the local cache, so a court changed on screen only when the server's answer came back through the subscription: three round trips per tap, several seconds on gym Wi-Fi, and nothing on screen meanwhile. With several phones scoring through the scorer link, taps that overlapped failed with a generic error. A phone that had lost its signal fell back to a batched write with no revision check at all, and overwrote other phones' results when it reconnected.

We decided that an engine command is applied to the phone's own copy and written as one batched write that carries the revision it was built on, in a `basedOn` field. The Firestore rules refuse a tournament update that changes the revision unless `basedOn` equals the stored revision, and require a scorer's update to change the revision. The batched write is shown from the local cache at once and rolled back by the SDK if the server refuses it. A phone keeps the commands the server has not yet acknowledged and replays them, in order, on the fresh copy when one is refused; a replayed command the engine then rejects is dropped with a notice.

## Considered options

- Keep the transaction and add an optimistic layer in the app that replays pending commands over each snapshot. Rejected: it rebuilds what the SDK's local cache and rollback already do, and keeps a second code path for offline.
- Keep the transaction and show a saving state instead. Rejected: honest, but the wait is the problem.
- Drop the revision check and let the last write win. Rejected: two phones on one court would silently lose a result.

## Consequences

- The rules are the concurrency check. A change to how the revision moves is a change to `firestore.rules` and its tests, not to a client transaction.
- A result can appear on a phone and be taken back moments later when it lost a race with another phone on the same court. Results on different courts never clash.
- Online and offline use one write path, and an offline phone's queued results are checked like any other when it reconnects.
- A refused write looks the same whether the revision moved or the scorer link went stale; the client reads the tournament to tell them apart, as the scorer guard already did.
- Phones running the previous build are refused once the rules deploy, until they reload. Deploy between tournament nights.
