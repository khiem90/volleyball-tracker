# 05: Every command through the queue

**What to build:** Every other change to a live tournament shows at once: finishing a match from
the scoring page, Swap, queue reorder, Start, End, a correction from Schedule or the Bracket tab,
add team, withdraw, and change courts. With nothing left on the old path, the transaction and the
separate offline fallback are deleted, so online and offline share one write path.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Every engine command the app issues goes through the command queue.
- [x] The scoring page navigates on the engine's local result; a later reversal shows on the console's error line.
- [x] The transaction, its single-attempt setting, the server reload-and-retry loop, and the offline fallback are removed from the data module.
- [x] Comments that describe commands as running "in a transaction", on the command runner, undo, and correction, are rewritten.
- [x] The existing tournament suite passes unchanged in what it asserts about documents.
- [x] Emulator tests: a Start, an End, and a correction each land through the queue; two phones completing matches on different courts from the scoring page both land.
