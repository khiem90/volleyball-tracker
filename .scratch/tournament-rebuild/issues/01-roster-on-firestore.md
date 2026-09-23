# 01: Roster on Firestore

**What to build:** A signed-in owner's teams live under their account in Firestore. The Teams page
creates, renames, recolors, and deletes them there, offline persistence keeps it
working without signal, and rules let only the owner touch the roster. The rest
of the app still runs on the old local store for tournaments and matches.

**Blocked by:** 00

**Status:** ready-for-agent

- [ ] Creating, renaming, recoloring, and deleting a team on the Teams page writes to the account's roster.
- [ ] A second browser signed in as the same account shows the same roster within a second of a change.
- [ ] With the network cut, a team can be added; it appears in the other browser after reconnect.
- [ ] Rules tests: a different account cannot read or write this roster; a signed-out request cannot.
- [ ] Quick match and the creation flow pick teams from the roster.
- [ ] A step-by-step for deploying rules and indexes with the Firebase CLI exists under the docs folder.
