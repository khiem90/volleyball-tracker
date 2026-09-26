# 11: Bracket management

**What to build:** On Single and Double Elimination tournaments, withdrawing a team advances its
opponent by forfeit, a completed result can be corrected until the dependent
match has started, adding a team after start is refused, brackets with a team
count that is not a power of two complete on their own, and completed
double-elimination matches no longer open a Start dialog.

**Blocked by:** 06

**Status:** ready-for-agent

- [x] Withdraw forfeits the team's next match and advances the opponent.
- [x] Editing a completed result is allowed until the dependent match has started, then refused with the reason shown.
- [x] Adding a team after start is refused with the reason shown.
- [x] A five-team and a six-team single elimination tournament complete when the final ends.
- [x] Tapping a completed double-elimination match opens its result, not a Start dialog.
- [x] Engine tests cover withdraw, edit-until-started, the add refusal, and completion for power-of-two and non-power-of-two counts.

## Comments

**2026-09-26, implementation.** Done on branch `claude/rotation-lab-redesign`.

- Engine: the bye resolver in `src/lib/engine/brackets.ts` is now
  `settleWithoutPlay`, which settles byes as before and also forfeits any
  open match whose two teams are known and one of which has withdrawn,
  then sends the result on. `withdraw` takes a bracket: it marks the entry
  and runs that resolver, so the team's open match is forfeited to its
  opponent at once when the opponent is known, and when the opponent
  arrives otherwise. In Double Elimination the withdrawn team drops into
  the losers bracket like any loser and forfeits there too once it has an
  opponent. A withdrawn team never advances, so a match it is in with an
  empty slot nothing can fill closes with no winner. `correct_result`
  takes a bracket: a score-only correction just records the score, even
  after the next match has started; a change of winner takes back what the
  old result sent onward (`takeBack`), reopening a bye or a forfeit the old
  winner or loser was then given, and is refused at the first match in the
  way that has started, named in the message. A bye or a forfeit in a
  bracket has no score to correct and is refused. The series rules from 10
  moved into `correctedScore` and apply to both formats. `add_team` still
  refuses brackets, now saying the bracket is drawn. The `forfeited`
  helper moved to `src/lib/engine/forfeit.ts` so both modules use it.
- Console: `canCorrectResults` now covers live brackets, and the Bracket
  tab's completed cells are buttons that open "Correct the score" with a
  "Correct" footer; byes and forfeits stay plain (`isCorrectable` in
  `src/lib/console.ts` decides, for Schedule too). The dialog's copy says
  a new winner goes through and that a change of winner is refused once
  the next match has started; the engine's refusal shows in the dialog.
  The Teams tab splits `canEdit` into `canAdd` and `canWithdraw`: a live
  bracket shows Withdraw on every row, the reason adding is refused where
  the add strip would be, and no Rejoin on a withdrawn row. The withdraw
  confirm has bracket wording.
- Tests: `src/__tests__/engine/bracketManagement.test.ts` (31 tests)
  covers withdrawing with a known and an unknown opponent, a bye team
  withdrawing before its opponent is known, a match in play, a knocked-out
  team, the forfeit that decides the final, the double-elimination drop,
  corrections that keep and change the winner, the refusal once the next
  match or the loser's next match has started, re-settling a forfeit and a
  bye, reopening a forfeited best-of as a fresh match, a new winner that
  has since withdrawn, the best-of rule, refusing byes and forfeits, the
  add refusal for both formats, and completion for 4, 5, 6, and 8 teams in
  both formats. The `addTeam`, `withdraw`, `correct`, and `entryOf` helpers
  the three management suites each defined now live in `helpers.ts`. Two
  placeholder tests from 09 and 10 that pinned brackets refusing withdraw
  and correction are gone; the rotation refusal for correction has its own
  message.
- Glossary: `CONTEXT.md`'s Withdraw and Correction entries say what each
  does in a bracket.

Verified here: typecheck, `eslint src` (0 errors, 13 pre-existing
warnings), and the full suite (397 tests) with the emulators up. In the
browser against the emulators, on the other session's dev server (this
folder's `next dev` lock allowed only one), with the throwaway emulator
account and a five-team Single Elimination: the Teams tab showed the
refusal line and Withdraw on every row; a quarter-final scored 3 to 1 from
the scoring page; tapping its bracket cell opened the dialog with the
bracket copy, and saving 1 to 3 put the new winner in the semi and
updated both records; opening that semi's scoring page and then trying to
flip the quarter-final again showed "Aces v Eagles has started, so this
match's winner cannot change." in the dialog; withdrawing a semi-finalist
showed the bracket confirm wording, marked the semi Forfeit in the bracket
and Schedule with no Correct footer, put the opponent in the final, and
left the row Withdrawn with no Rejoin. The phone layout at 375px showed the
same Teams tab; the pane cropped its screenshots.

From the review: a reopened best-of kept the old pairing's games won, so
a new team could start a game down; reopening now resets the series
fields. The add refusal's wording comes from one engine function the
console imports instead of two copies.

Judgement calls:

- A withdrawn team in Double Elimination drops into the losers bracket and
  forfeits there as well, rather than leaving that slot empty as a bye.
  The glossary's "remaining matches are forfeited" fits that better, and
  it keeps `advance` unchanged.
- "Has started" means in progress, points on the board, or completed by
  play. Opening the scoring page marks a match in progress, so a scorer
  who opens the next match and backs out blocks a change of winner until
  a correction is no longer needed. That matches the Live tag the console
  shows.
- A forfeit in a bracket cannot be corrected, unlike in Round Robin, where
  a corrected forfeit counts as played. The opponent has gone through and
  the withdrawn team cannot come back, so a score there would only
  contradict the bracket.
- A score-only correction is allowed after the next match has started;
  only a change of winner is refused. The spec's "allowed only while the
  dependent match has not started" reads as a blanket rule, but story 51
  is about the bracket not contradicting itself, which a score fix does
  not touch, and a mistyped score on the last round would otherwise be
  stuck.
- A match forfeited while it was in play counts as never started once the
  forfeit lands, so a correction upstream can still reopen it for the team
  that should have been there. The play it had was between the wrong
  pairing and the forfeit already wiped it; refusing would leave the
  opponent with a forfeit win over a team that should not have been in the
  match, with no way to fix it since bracket forfeits cannot be corrected.
- Adding a team is refused up front, with the reason shown in place of the
  add strip, rather than after an attempt.
- The engine's refusal shows twice: in the dialog and in the masthead's
  error line, as it did for Round Robin in 10.

Left for later:

- Withdraw is offered for a team the bracket has already knocked out; the
  engine only marks its entry. Hiding the button would need an
  "eliminated" mark on `TeamRow`.
- The masthead's error line repeats the dialog's, for every dialog.
- The theme toggle logs a hydration mismatch on every page; ticket 18.
