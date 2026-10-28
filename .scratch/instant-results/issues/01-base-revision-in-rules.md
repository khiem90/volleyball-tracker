# 01: Base revision in rules and writes

**What to build:** Nothing changes on screen. Every write that moves a tournament's revision now
says which revision it was built on, and the Firestore rules refuse it when that base is no
longer the stored revision. This moves the concurrency check out of the client transaction and
into the rules, where every later ticket relies on it (ADR-0003).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The tournament document carries a `basedOn` field on every write that changes `revision`.
- [x] The rules refuse an owner's update that changes `revision` without a `basedOn` equal to the stored revision.
- [x] The rules refuse a scorer's update that changes `revision` without a matching `basedOn`, and refuse a scorer's update that leaves `revision` unchanged; `basedOn` joins the scorer's field allow-list.
- [x] A write that does not touch `revision` is unaffected.
- [x] Engine commands, the direct tournament replace, and rename all send their base, and every existing tournament and rules test still passes.
- [x] A rename refused because the tournament moved on is rebuilt on the fresh copy and lands; a rename racing a result loses neither.
- [x] Rules tests cover each refusal and acceptance above for both the owner and a scorer phone.
- [x] Existing tournament documents need no migration: the first write after deploy bases on their current revision.

## Comments

- 2026-10-15: Implemented test-first on the integration branch `claude/instant-results` (merge b44b5e6); code-review fixes landed in a3ae899. All acceptance boxes ticked; the full suite (572 tests) passes against the emulator.
