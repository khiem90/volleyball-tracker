# 01: Roster on Firestore

**What to build:** A signed-in owner's teams live under their account in Firestore. The Teams page
creates, renames, recolors, and deletes them there, offline persistence keeps it
working without signal, and rules let only the owner touch the roster. The rest
of the app still runs on the old local store for tournaments and matches.

**Blocked by:** 00

**Status:** ready-for-agent

- [x] Creating, renaming, recoloring, and deleting a team on the Teams page writes to the account's roster.
- [x] A second browser signed in as the same account shows the same roster within a second of a change.
- [x] With the network cut, a team can be added; it appears in the other browser after reconnect.
- [x] Rules tests: a different account cannot read or write this roster; a signed-out request cannot.
- [x] Quick match and the creation flow pick teams from the roster.
- [x] A step-by-step for deploying rules and indexes with the Firebase CLI exists under the docs folder.

## Comments

**2026-09-23, implementation.** Done on branch `claude/rotation-lab-redesign`.

- Teams live at `users/{uid}/teams/{teamId}`. `src/lib/roster.ts` holds the
  subscribe, add, update, and delete functions; each takes the Firestore
  instance so the same code runs in the app and against the emulator.
- `firestore.rules` allows read and write on that path only for the matching
  uid. The rules tests in `src/__tests__/rules/firestore.rules.test.ts` cover
  the owner, a different account, and a signed-out request across list, get,
  create, update, and delete. `src/__tests__/roster/roster.test.ts` drives the
  module through those rules on the emulator.
- `src/lib/firebase.ts` turns on the persistent local cache with the multi-tab
  manager. `AppProvider` subscribes to the roster for the signed-in account and
  routes the team actions to it; the reducer now holds only competitions and
  matches, and a stored `teams` array from older localStorage is ignored.
- The Teams, Quick Match, and creation pages show the spinner until the roster
  has loaded, so an empty roster no longer flashes before the real one. If the
  subscription fails, for example because the rules are not deployed yet, the
  Teams page shows a notice instead of an empty roster.
- Teams added in the same instant, as Quick Add does, get strictly increasing
  `createdAt` values so they list in the order they were added.
- Existing local data: the `teams` array in localStorage is dropped on first
  load, and competitions or matches saved before this change point at team ids
  the roster does not have, so those show a blank team name. Competitions
  created from now on use roster ids. The spec lists migration as out of scope.
- A color cannot be cleared through the roster update; the form always sends
  one.
- `docs/deploying-firestore-rules.md` is the CLI walkthrough; the README links
  it.

Verified here with a throwaway account in the Auth emulator: each action on the
Teams page produced the matching document in the Firestore emulator. A rename
saved in one browser profile appeared in a second, separately signed-in
profile after 175 ms. With the network cut in one profile, a team added there
showed at once locally and reached the server and the other profile after
reconnect. Quick Match and the creation flow listed the roster teams.
Typecheck, `npm run lint`, and the full suite (66 tests) pass with the
emulators up. A two-axis review (standards and spec) ran afterwards; its
findings are folded into the points above.

Two things seen and left alone: the built-in browser logs a hydration error on
every page because it prefers dark mode and the theme provider adds the `dark`
class on the client only, which ticket 18's light-only change removes; and the
Firestore emulator logs one `RESOURCE_EXHAUSTED` line on the gRPC Listen stream
during the delete test, without failing it. The browser client uses WebChannel,
not gRPC, so the second one cannot reach the app.

Not in this ticket: sign-out does not yet clear the on-device cache (story 6),
and the guest quick match still uses its fixed pair of teams.
