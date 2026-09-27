# 13: Share links

**What to build:** From Settings the owner turns a spectator link on or off and regenerates a
scorer link. Opening the scorer link gives the phone a silent identity and the
console with scorer permissions; opening the spectator link shows the console
read-only; a link that is off shows not found.

**Blocked by:** 07

**Status:** ready-for-agent

- [x] The spectator link opens the read-only console without sign-in and updates live.
- [x] Turning the spectator link off makes it show not found; a rules test confirms the read is denied.
- [x] A scorer can score, complete matches, use instant win, reorder the queue, and swap courts, and cannot rename, end, delete, or change teams; rules tests cover both sides.
- [x] After regenerating the scorer link, a phone on the old link is refused on its next write; a rules test confirms it.
- [x] Two phones on the scorer link complete matches on different courts at the same time without losing either result.
- [x] The scorer key is unreadable by anyone but the owner; a rules test confirms it.

## Comments

**2026-09-27, implementation.** Done on branch `claude/rotation-lab-redesign`.

- Storage and rules. The scorer key lives at `tournaments/{id}/private/scorerKey`,
  which only the owner reads or writes; a spectator can read the tournament
  and never sees it. A phone that opens the scorer link writes the key under
  its own uid at `tournaments/{id}/scorers/{uid}`, and the rules accept that
  proof only while the key is the current one, so a phone on a regenerated
  link learns at once that it is stale. A scorer is a signed-in identity
  whose proof equals the current key. While the tournament is live a scorer
  may write matches (a score, a result, the next match on a court, the match
  an undo removes) and change the tournament's rotation state and revision.
  A scorer may also move a round robin or a bracket to Completed with a
  winner from its teams, which is what their last result does. End names no
  winner and stays with the owner, as do rename, entries, settings, the
  spectator flag, ownership, and delete, and the rotation formats finish
  only through End. Scorers can read the tournament and its matches with the
  spectator link off. The key is created with the tournament, in the batch
  that follows the tournament write, and deleted with it along with every
  proof.
- Data layer. `src/lib/sharing.ts` has the owner's side (subscribe to the
  key, regenerate, turn the spectator link on or off, each a field write
  with a fresh revision like a rename), the scorer's proof, and
  `StaleScorerLinkError`. `tournaments.ts` gains the doc refs, the key at
  creation, the cleanup at delete, and subscriptions to one tournament and
  its matches for a phone that reached it by link. `isRefused` joins the
  Firestore error helpers.
- Links. `src/lib/shareLinks.ts` is the pure part. The spectator link is the
  tournament's page and the scorer link the same page with `?scorer=<key>`.
  The phone keeps a record of the scorer links it has opened in
  localStorage, so a reload on the scoring page still finds the match and
  the role.
- Identity. `AuthContext` reports an anonymous identity as no account
  (`user` null, `isGuest` true), so every page that needs sign-in still
  bounces it, and exposes `identityUid` and `ensureIdentity()`, which makes
  the silent identity on demand. `src/context/useLinkedTournaments.ts`
  watches every tournament the phone holds a scorer link for plus the one a
  spectator has open, keeps them out of the account's own lists, and opens
  scorer links (identity, proof, record). The provider answers
  `getTournamentById`, `getMatchById`, and `getMatchesByTournament` from
  either source, and runs every tournament command and match write through
  `guardScorerWrite`. When the rules refuse a write it proves the recorded
  link again; only a refused proof means the owner replaced the link, and
  then the phone forgets it, keeps watching as the spectator link allows,
  and the write rejects with `StaleScorerLinkError`.
- Console. `roleFor` makes whoever holds the scorer link a scorer unless
  they own the tournament, and `consoleAccess` gains `canShare` (owner, any
  status). The page no longer requires sign-in. The owner gets the app
  shell, and a scorer or spectator gets a lighter shell with the brand, a
  Scorer or Spectator badge, and Sign in. A tournament that is not shared
  shows not found, and a replaced scorer link shows "Scorer link replaced".
  Turning the spectator link off, or any owner write after a regeneration,
  ends the phone's listener, so the page changes without a reload. A phone
  whose link was replaced while the spectator link is on keeps the console
  read-only with the stale-link line. Instant win now reports its refusal on
  the error line instead of swallowing it. The Settings tab has the share
  links for the owner: the spectator link with Turn on or Turn off and Copy,
  and the scorer link with Copy and Regenerate behind a confirm, or Create
  scorer link for a tournament from before keys. The "Spectator link" fact
  is gone, since the section replaces it and a scorer or spectator has no
  use for it.
- Scoring page. The role comes from the recorded link, so a scorer's phone
  can score from `/match/[id]` after a reload. A refused confirm shows the
  stale-link line, and once the match goes away the page says "Scorer link
  replaced" rather than "Match not found".
- Tests. `firestore.rules.test.ts` gains 21 tests. The key is read and
  written by the owner and by nobody else. A proof needs the current key and
  the phone's own uid, and the owner lists and deletes proofs. A scorer with
  a valid proof reads with the spectator link off, writes and removes
  matches in the owner's name, moves the rotation state, and completes a
  round robin with a winner from its teams. It cannot end, rename, change
  teams, settings, or the spectator link, hand the tournament over, delete
  it, complete a Win 2 & Out or a Two Match Rotation, or write on a draft or
  completed tournament. A stale proof is refused on its next write and loses
  its read once the spectator link is off. The spectator link shows the
  tournament while on and refuses it once turned off. `tournaments.test.ts`
  gains eight tests through the data layer: a new tournament's key reads for
  its owner and not for a phone; a phone records a result through the
  engine; two phones on two courts at the same moment keep both results; a
  phone's last result completes a round robin; a phone cannot end, rename,
  delete, change the teams of, or open the spectator link on the tournament;
  a regenerated key refuses the old phone's next write and its old proof
  while the new link works on the same phone; the spectator link shows the
  tournament to a signed-out reader and cuts the subscription off when
  turned off; and delete removes the key and every proof.
  `shareLinks.test.ts` (7 tests) covers the links and the record, and
  `console.test.ts` pins the scorer role and `canShare`.
- Docs. The README's data layout has the two new paths and a paragraph on
  how the scorer link works. The deploy doc says the real project needs the
  Anonymous sign-in provider on, once, in the Firebase Console. `CONTEXT.md`
  adds rename and share to Owner and says a guest holding a link gets what
  the link gives in that tournament. ADR-0002 records that a scorer writing
  to Firestore directly could complete a round robin or a bracket early.

Verified against the emulators with two browsers: the browser pane signed
in as the owner on the dev server another session left on port 3000 (this
one could not take Next's lock), and a Playwright browser at 375x812 as the
phone. With the spectator link off the phone got "Tournament not found" in
the link shell. Turn on from Settings showed the link with Copy, and the
phone then showed the read-only console with the Spectator badge, tabs,
courts, and queue, and no Score or Swap. Two points scored by the owner
appeared on the phone as "Court 1 Live 2 – 0" with no reload; Turn off
dropped the phone to not found on its own. Create scorer link made the key.
Opening the scorer link on the phone gave it a silent identity, the Scorer
badge, Continue scoring and Score, Swap, and the queue arrows, and its
Settings tab showed facts only. The phone moved Falcons up the queue,
swapped Falcons onto court 2, and scored court 2 to 3–1 and confirmed it.
Chasers came on against Falcons, Diggers joined the queue, and the owner's
console showed every step as it happened. Regenerate from Settings asked
first, then showed a new link. The phone's next queue move showed "This
scorer link is no longer valid", its badge became Spectator with every
control gone, and the owner's next write dropped it to not found. Opening
the new link on the same phone made it a scorer again. After the review,
the same run on a phone still on its `?scorer=` address showed the line and
the Spectator badge rather than a spinner, then "Scorer link replaced" at
the owner's next write; reloading the stale address went straight there; and
on the scoring page a confirm after regeneration showed the line, the page
turned watch-only, then "Scorer link replaced", with court 2 still live and
unscored for the owner. At 375px the owner's Settings has no horizontal
scroll with the links shown and every button is 44px. Typecheck,
`eslint src` (0 errors, the 13 warnings HEAD already had), and the full
suite (468 tests) pass with the emulators up.

Things seen and left alone: the browser pane never finishes a Radix
dialog's exit animation, so a confirmed dialog stays in the DOM with
`data-state="closed"` there (the same pane throttling ticket 12 saw); the
pre-existing dark-mode hydration error and the duplicate "Aces" key error
on Home, which tickets 18 and 16 own. Boundaries: a scorer's proof write
never settles offline, so a scorer link opened with no signal shows the
spinner until the connection returns; and a phone whose listener opened
while its proof was valid keeps receiving updates until the tournament next
changes, since Firestore only re-checks a listener when the listened
document moves. The fifth acceptance box, two phones at once, is covered by
the emulator test; one Playwright browser cannot be two phones.

**2026-09-27, review.** A two-axis review (standards and spec) ran on the
staged change. The spec axis found every box backed by code and a test, and
traced the key, the stale proof, the refused owner fields, the two-court
race, and the spectator cut-off by hand. What changed after it:

- A stale scorer on a `?scorer=` page spun forever. Forgetting the link took
  the tournament off the watch list, and nothing watched it as a spectator;
  the scoring page said "Match not found". A stale link now keeps the
  tournament watched and marks the link stale, so the phone gets the
  read-only console with the line, or "Scorer link replaced".
- The rules let a scorer complete any live tournament with a winner from its
  teams, rotation formats included. The completion a scorer may write is now
  limited to round robin and brackets, with two new rules tests, and ADR-0002
  records what the rules cannot check for those.
- Every refusal on a scorer's phone was read as a replaced link. The phone
  now proves the link again first, so a refusal for another reason keeps a
  valid link. That check lives in one place, `guardScorerWrite`, instead of
  a copy in the console hook and one in the scoring hook.
- The link machinery moved out of the provider into
  `useLinkedTournaments`, the unused `removeItem` left `LinkStore`, and the
  app and the tests share `memoryLinkStore`.
- Glossary and wording: "organizer" became the tournament's owner; the
  scorer copy says "reorder the queue, and swap courts" in place of "move"
  and "arrange", after the Swap entry; the test file says phone, not
  device; the Guest entry and the `isGuest` comment say what a link gives a
  guest; a few comments lost their connecting colons. Renames:
  `linkTournament` is `watchTournament`, `Unavailable` is `NotFoundReason`,
  `canRegenerate` is `showsScorerLink`, and the error helper is
  `reportFailure`.

Left as they are: the watched ids travel as one joined string so the
subscriptions restart only when the set changes; the not-found page picks
its shell by whether there is an account rather than by role, since an
account has its own app to go back to; and `isGuest` keeps meaning "no
account", which the Guest entry now spells out, rather than a rename across
every page.
