# 10: Round robin management

**What to build:** On a live Round Robin tournament, adding a team appends its matches, withdrawing
a team forfeits its remaining matches, a completed result can be corrected from
Schedule, and standings show forfeit marks and recalculate.

**Blocked by:** 06

**Status:** ready-for-agent

- [x] Adding a team appends a match against every active entry.
- [x] Withdraw turns the team's pending matches into forfeits won by the opponent, with no points for or against.
- [x] Editing a completed score from Schedule recalculates standings.
- [x] Standings show a forfeit mark on forfeited results and exclude them from point difference.
- [x] Engine tests cover add while live, withdraw, edit result, and standings with forfeits.

## Comments

**2026-09-26, implementation.** Done on branch `claude/rotation-lab-redesign`.

- Engine: `add_team` and `withdraw` now take a live Round Robin as well as
  the rotation formats; brackets still refuse both until 11. Adding a team
  enters it and gives it a match against every active entry, one new round
  each after the rounds already scheduled, played as the tournament's
  best-of. Withdraw marks the entry and turns every match the team has
  still to play, a match in progress included, into a forfeit: completed,
  won by the other side, no points, marked with the team that forfeited.
  When those forfeits settle the last matches the tournament completes
  with the standings leader as winner, as a played result would. A new
  `correct_result` command corrects the score of a completed Round Robin
  match: the winner follows the score, a forfeit corrected this way loses
  its mark and counts as played, and the standings, which are worked out
  from the matches, follow on their own. In a best-of the corrected score
  is the deciding game's; a change of winner moves that game's win across
  and is refused if the series would be left undecided, and a corrected
  forfeit is recorded as won in the games it needs with the loser's games
  as they stood. Adding a withdrawn team again reopens the matches its
  withdrawal forfeited, keeps its played results and any forfeit since
  corrected, awards a reopened match whose opponent has withdrawn
  meanwhile to the team coming back, and schedules it against any team
  that joined while it was out.
- Standings: `RoundRobinStanding` gains `forfeitLosses` beside
  `forfeitWins`; forfeits were already left out of points for, against,
  and difference.
- Provider and console: `correctMatchResult` on the provider, applied
  through the engine in the same transaction as everything else. On the
  Schedule tab the owner of a live Round Robin taps a completed row to
  open "Correct the score", two score fields seeded from the match with
  Save held back on a tie or a blank; the engine's refusals show in the
  dialog. A forfeit row shows no score. The Teams tab's add strip,
  Withdraw, and Rejoin now appear for a live Round Robin too, with the
  notice and the withdraw confirm worded for it. Standings marks wins and
  losses by forfeit with a small count (`1F`) and a legend line that
  appears only while the table has one.
- Tests: `src/__tests__/engine/roundRobinManagement.test.ts` (23 tests)
  covers adding, the round numbering and series fields, withdrawing with
  played and in-progress matches, completion by forfeit, the standings
  after a withdrawal, refusing a second withdrawal, correcting a result
  and its refusals, correcting a forfeit, the best-of rules, and rejoining
  in each of its cases. Two placeholder tests from 09 that pinned Round
  Robin refusing add and withdraw now pin brackets refusing them.
  `tournaments.test.ts` gains one emulator test that adds, withdraws, and
  corrects a forfeit through Firestore and checks the forfeit mark leaves
  the document.
- Glossary: `CONTEXT.md` gains Correction, and Withdraw says what adding a
  withdrawn team back does in Round Robin.

Verified here: typecheck, `eslint src` (0 errors, 13 pre-existing
warnings), and the full suite (371 tests) with the emulators up; in one
of two full runs the roster suite's "teams added in the same instant"
test, untouched here, failed on timing and passed alone. In the
browser at 375px against the emulators, with a throwaway emulator account
and a seeded live Round Robin: adding a roster team from the Teams tab
(notice, five entered, ten matches), withdrawing it (confirm wording, four
forfeit rows, `1F` and `4F` marks with the legend, Rejoin offered),
correcting a forfeit from Schedule (dialog wording, tie held back, saved
as 21 to 25 with the standings recalculated), and rejoining (three
forfeits back to pending, the corrected result kept, legend gone). The
browser pane's own clicks did not reach this app under phone emulation,
so the taps were fired on the same buttons from the page and the checks
read the rendered DOM; screenshots were cropped by the pane.

Judgement calls, from the review:

- Rejoin for Round Robin, correcting a forfeit into a played result, and
  the best-of rules are in no story. Rejoin follows from `add_team` having
  to decide what a withdrawn entry means, as 09 noted; a forfeit is a
  completed match, so story 49 reaches it; the best-of rule keeps the
  games won consistent with the winner. The Correction glossary entry
  records all three.
- A mis-tap on the last match cannot be corrected: that result completes
  the tournament (story 53) and a completed console is read-only (story
  57). The same holds for a withdrawal whose forfeits settle the last
  matches. Story 49 loses that one case; End is not offered either way.
- Withdraw forfeits a match in progress and drops its points, as the
  glossary's "remaining matches" says, where the ticket says "pending".
- A withdrawn team's reopened best-of resumes as pending with the games
  already won kept.
- The command is `correct_result`, after the glossary's Correction, though
  the ticket and spec say "edit result".

Left for later:

- `addTeam`, `withdraw`, and `correctResult` each branch on the format the
  same way, as `useConsole` and the page do for copy; a per-format table
  could gather them.
- The Teams tab's W and L columns carry no forfeit mark; only Standings
  does.
