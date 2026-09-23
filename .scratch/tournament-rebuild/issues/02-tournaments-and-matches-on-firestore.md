# 02: Tournaments and matches on Firestore for round robin and brackets

**What to build:** Tournaments are documents owned by the account, each match is its own document
under its tournament, and a pure tournament engine produces start, match
completion, and auto-completion for Round Robin, Single Elimination, and Double
Elimination. Session mode and everything attached to it is gone. The existing
competition pages keep working on the new store, so an owner can run two
round-robin tournaments at once.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Creating a tournament writes a document with owner, name, format, status Draft, entries that snapshot each team's name and color, and settings.
- [ ] Starting writes one match document per scheduled match; completing a match updates that document plus whatever the engine schedules next, never a whole array.
- [ ] Two round-robin tournaments can be Live at the same time; both appear on the tournaments list and both open.
- [ ] Starting a tournament no longer creates a session. The session and summary routes, contexts, admin tokens, and the localStorage reducer are removed.
- [ ] Engine tests cover start, complete, and auto-complete for the three formats, including single elimination with five and six teams.
- [ ] Rules tests: the owner can write a tournament and its matches; a different account and a signed-out request cannot; a tournament with spectator access off is unreadable by anyone but the owner.
- [ ] Type check passes and the existing competition detail and match pages work against the new provider.
