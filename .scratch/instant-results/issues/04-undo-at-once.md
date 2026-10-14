# 04: Undo at once, dropped with a reversed win

**What to build:** Undo takes a result back the moment it is tapped, including a win the server has
not confirmed yet. When a win is reversed because it lost a race, its entry leaves the undo toast,
and an undo that was already queued behind it is dropped with it, so a court is never undone twice.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Undo runs through the command queue and the court goes back from the local cache at once.
- [x] An undo on an unconfirmed win queues behind that win and the server sees the same order.
- [x] A reversed win's entry is removed from the undo toast.
- [x] An undo queued behind a reversed win is reported as reversed too and leaves no entry.
- [x] An undo the engine refuses because the court moved on still drops its entry, as today.
- [x] Emulator tests: a win followed by its undo on one phone lands as unplayed; a win that loses a race takes its queued undo down with it.
- [x] Console tests: the undo stack dropping a reversed win's entry.
