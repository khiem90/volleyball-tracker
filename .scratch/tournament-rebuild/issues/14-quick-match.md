# 14: Quick match

**What to build:** A signed-in owner picks two roster teams for a quick match, sees abandoned quick
matches with Resume and Discard, and quick match results count toward team
records. A guest gets a working Play Again.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] The Quick page offers a roster pick for both teams and starts scoring.
- [x] A quick match left mid-way shows on the Quick page with Resume and Discard; Resume reopens it, Discard removes it.
- [x] A completed quick match appears in the team's all-time record.
- [x] After a guest match, Play Again starts a fresh guest match; closing the result dialog does not strand the page.

## Comments

**2026-09-27, implementation.** Done on branch `claude/rotation-lab-redesign`.

- Data layer. `src/lib/quickMatches.ts` gains `completeQuickMatch`, which
  refuses a tie and names the winner. It moved out of the provider so a test
  can drive it. `discardQuickMatch` replaces the unused `deleteQuickMatch`.
  `abandonedQuickMatches` picks the quick matches without a result, pending
  or in progress, newest first.
- Provider. `completeMatch` calls `completeQuickMatch` for a quick match.
  `discardQuickMatch` drops the match from the local cache at once and lets
  the server catch up, as `addTeams` does. A refused delete only logs, and
  the row comes back.
- Quick page. The roster pick for both teams was already there. A Left
  Mid-Way panel above Match Setup lists each abandoned quick match with its
  score and start time. Resume opens `/match/{id}`, which carries on from
  the score it had. Discard asks first, naming the match and its score. A
  match whose team has since left the roster gets Discard only, because the
  scoring page cannot show it.
- Team records. The Teams page already tallied every completed match from
  the account-wide query, quick matches included, so a completed quick match
  counts in both teams' records with no change there.
- Guest. Closing the result dialog left a Completed page whose notice said
  to play again with nothing to press. The scoring screen now takes an
  optional button beside its notice, and the guest page passes Play again
  once the match is completed. The dialog's own button reads "Play again"
  to match.
- Scoring page fixes found in the browser, on ticket 12's page. The score
  panel was `overflow-hidden`, which still makes it a scroll container. The
  first tap focused a button, the browser scrolled the panel toward the glow
  that hangs past its edge, and the name, score, and buttons jumped up and
  left with the minus button cut off. The panel is now `overflow-clip` and
  cannot scroll. At 375px the Live and Guest badges ran under the header
  buttons, so the badge row now wraps.
- Glossary. `CONTEXT.md` says a quick match left without a result is
  abandoned and waits on the Quick page, and adds Discard.
- Tests. `src/__tests__/quickMatches/quickMatches.test.ts` has one pure test
  of the abandoned list and three emulator tests through the data layer. A
  completed quick match counts in both teams' records through
  `buildTeamTallies`, a tie is refused and leaves the match as it was, and a
  discarded match is gone from the account-wide query. These follow the
  emulator data-layer tests of earlier tickets rather than the two seams
  Testing Decisions names. The subscription helper `when` moved into
  `rules/emulator.ts`, and `tournaments.test.ts` uses it from there.

Open edges. Every quick match without a result counts as abandoned, so one
being scored on a second phone of the same account shows under Left Mid-Way
with Discard, and discarding it drops that phone to "Match not found". The
match has no last-updated time to tell the two apart. Deleting a roster team
leaves its quick matches in place.

Verified against the emulators at 375x812 in the browser pane, with a new
Auth emulator account signed in at 127.0.0.1:3000 so the sign-in another
session left at localhost:3000 stayed untouched. Aces and Blockers were
picked from the roster and scored to 3-1, then Back showed the match under
Left Mid-Way with Discard and Resume. Resume reopened it Live at 3-1. Ending
it returned to the Quick page with the panel gone and the result under
Recent Quick Matches, and the Teams page showed Aces 1-0 with 3 points for
and 1 against, and Blockers 0-1. A second match left at 0-1 and discarded
was still gone after a reload. As a guest, closing the result dialog left
Play again under the notice, and it started a fresh 0-0 match. The dialog's
own button did the same.
