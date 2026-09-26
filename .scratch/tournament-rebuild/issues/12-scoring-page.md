# 12: Scoring page

**What to build:** Scoring works in portrait and landscape with no rotate prompt, keeps the screen
awake, treats fullscreen as a bonus that never breaks on iPhone, uses controls a
thumb can hit, and says Completed when a match is over.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Portrait and landscape are both usable at phone sizes and no rotate dialog appears.
- [x] The wake lock is requested when scoring starts and released on leaving the page.
- [x] On a browser without the Fullscreen API the fullscreen button is hidden.
- [x] Score controls are at least 44px; a completed match shows Completed and explains why taps do nothing.
- [x] Back returns to the tournament console, or to the Quick page for a quick match.

## Comments

**2026-09-26, implementation.** Done on branch `claude/rotation-lab-redesign`.

- `src/lib/scoring.ts` is the scoring page's pure part. `scoringAccess`
  says whether a role may score a match and, if not, why: the match is
  completed, the tournament is over, or the visitor may only watch. The
  most specific reason wins, and a tournament match defers to
  `consoleAccess`, so the owner of a completed rotation tournament can no
  longer score the pending match a court was left with (the gap 06 noted).
  `blockMessage` turns the reason into the line the page shows, with a
  wording each for a tournament match, a quick match, and a guest match.
  `backHref` sends a tournament match to its console and a quick match to
  the Quick page. `statusLabel` reads Completed once a match has a result,
  Live while it is played, and Not started before. `seriesInfo` moved here
  from the hook. `fullscreenSupported` reads the standard and the
  webkit-prefixed flags, so an iPhone, which has neither, gets no button.
  `keepsScreenAwake` holds the lock while the match is still to be played.
- Hooks: `useWakeLock(active)` asks for a screen wake lock, asks again
  whenever the page comes back into view, and releases it when the page
  leaves or the match ends. `useFullscreen` no longer owns the wake lock
  or an orientation check; it reports `isSupported` and `isFullscreen`
  through `useSyncExternalStore`, so the server renders no button and the
  Escape key is followed, and it swallows a refused request.
  `useMatchPage` derives the role like the console does, runs every
  handler through `scoringAccess`, and keeps a queue of the scores it has
  written that the subscription has not shown yet, so two taps in quick
  succession both count; before, the second tap built on the stale
  snapshot and a point was lost. The rules of the queue (`afterSnapshot`, `latestScore`, `tapped`) are pure and tested. A bracket slot with no team yet refuses to start, so opening its URL writes nothing.
- Screen: `ScoringScreen` is the whole page, rendered by both
  `/match/[id]` and `/match/guest`, which were two copies of the same
  markup. The two team panels stack in portrait and sit side by side in
  landscape through the `landscape:` variant, with the score sized in
  `vmin` so it fits either way, and the outer edges and the bottom pad
  for the notch and home indicator. Each panel is one big button that
  adds a point plus a 56px minus and plus; every header and fullscreen
  control is at least 44px, and the End button reads End on a phone with
  its full label from `sm` up so the status badge keeps its room. The
  header is in the matchbook style. A completed match shows Completed, a
  Winner badge instead of Leading, no controls, and the line saying why
  taps do nothing; a match the tournament's end left behind shows Not
  started and its own line. The rotate dialog and the auto-exit on
  portrait are deleted. The confirm dialog now shows a saving state and
  the error when the engine refuses a result, which the old page
  swallowed.
- Tests: `src/__tests__/scoring/scoring.test.ts` (23 tests) drives the
  pure module with engine-built worlds: access per role for a live,
  completed tournament, a bracket slot with no team yet, and quick matches, the wording of
  each block, Back for both kinds, the status word, series progress
  through a best-of-three, the confirm rule, the fullscreen check for the
  standard, the prefixed, and the iPhone cases, and the wake-lock
  predicate.

Verified against the emulators in the browser pane, signed in as the
emulator owner, at 375x812 and 812x375. Portrait stacks the panels and
landscape puts them side by side with no page scroll; the header controls
measure 44px and the plus and minus 56px; no rotate dialog exists. Taps
on the panel, the plus, and the minus scored, two and three taps with no
pause all counted, Undo stepped back one point at a time, and End opened
the confirm with the right score and winner. Confirming returned to the
console and the match left Up next; reopening it showed Completed, the
Winner badge, the line about the Schedule tab, and no controls. The
completed rotation tournament's leftover match showed Not started and its
line, and the emulator still had it pending afterwards. A quick match's
Back went to the Quick page and so did confirming its result. A
best-of-three showed Best of 3, Game 1, then Game 2 at 1–0 on the same
page with the score reset after End game. With both fullscreen flags
removed from the document the Fullscreen button disappeared on the next
render. With `navigator.wakeLock` stubbed, opening a match through the
console requested the lock and Back released it (twice each under the
development double-mount). The guest page showed the Guest tag, Back to
the Quick page, the result dialog after confirming, and then Completed
with the guest wording. Typecheck, `eslint src` (0 errors, 13
pre-existing warnings), and the full suite (423 tests) pass with the
emulators up.

Things seen and left alone: the browser pane does not honor a fullscreen
request (the click reached the button, the promise resolved, nothing
changed, no error), so entering fullscreen was not seen here; the pane
also throttles animation frames, so the score digits sit at the start of
their enter animation in screenshots. The manifest still locks portrait,
which ticket 15 removes, so the installed Android app cannot rotate until
then. The home page's standings table keys rows by team name and logs a
duplicate-key error when a roster has two teams with the same name, which
the seed used here happened to create; ticket 16 rewrites Home. Story 66
(complete a match and land on the next thing on the court) is in no
ticket's list; the page returns to the console instead.

**2026-09-26, review.** A two-axis review (standards and spec) ran on the
staged change. The spec axis traced the access rules for every role and
status, the fast double tap, the fullscreen check for iPhone, iPad, and
desktop, and the portrait and landscape classes, and found them sound.
What changed after it:

- End read the last snapshot rather than the last tap, so a tap followed
  at once by End confirmed the score from before the tap. The confirm and
  the dialog guard now build on the same in-flight score as the taps, and
  a new game of a series seeds the queue with the clean board the engine
  wrote instead of emptying it, so a tap before that snapshot lands
  counts from zero.
- The wake lock could be asked for twice, once by the mount and once by a
  visibility change while the first request was still in flight, and
  then only one was released. A request now waits for none in flight and
  none held, and a lock the browser lets go of is forgotten so the next
  visibility change asks again.
- Opening the URL of a bracket match with an empty slot started it,
  because the page started any pending match a scorer may play. The
  access rule now refuses a match still waiting for a team, with its own
  line, and a test plays a four-team bracket to its final to pin it. In
  the browser, opening such a match showed Match not found and the
  emulator still had it pending afterwards.
- The rules of the pending queue moved into the pure module as
  `afterSnapshot`, `latestScore`, and `tapped`, with tests, per the spec's
  testing decisions; the hook only applies them.
- Glossary: "ended" as the state of a tournament became "completed" in
  copy, comments, test names, and this ticket, and the "view only" reason
  became "watch only", since the glossary avoids Viewer. `roleFor` in
  `src/lib/console.ts` replaces the role derivation the console hook and
  the scoring hook each had; `winnerSide` replaces two copies of the
  winner-to-side ternary; the stock team colors live in `ScoringScreen`
  instead of in both pages; the status badge keys its color on the
  match's status rather than on its display word; and the match folder
  exports only what the pages use.

Left as they are: the safe-area padding on the header and panels is inert
until ticket 15 sets the viewport to cover fit, and quick-match completion
lands on the Quick page where it went Home before, which the spec leaves
open.
