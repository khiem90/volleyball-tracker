# 14: History

**What to build:** The owner opens History and reads every past result as a
row-size score line, grouped the way History groups results today. A completed
tournament shows its name, format, and champion at the head of its group, and
its matches underneath. Quick matches show the same way. A result opens what
it opens today.

Covers spec stories 31, 32, 60, and 61.

**Blocked by:** 03, 05, 06

**Status:** ready-for-agent

- [x] History shows the same results in the same groups and order as today.
- [x] Every match is a row-size score line with marks, the winner in bold, and the loser dimmed.
- [x] A completed tournament's group shows its name, format, date, and champion, with the champion's mark.
- [x] Any filter or search on the page works as today in the new form controls.
- [x] Deleting or discarding a record, where History allows it today, uses the shared destructive dialog.
- [x] An empty History shows today's empty state in the new look.
- [x] History's files contain no old-theme name and are on the guard's list of migrated folders.
- [x] The history tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has looked at History on a phone and what they flagged is fixed.

## Comments

- Score lines: History draws every match through `MatchRow`, which ticket 09 moved to the shared `ScoreLine`. A merger saw both cards in the app after that merge, at 390px and 1280px: every match is a score line with the winner bold and the loser dimmed.
- Groups, not applicable: History has no group per tournament. A completed tournament is one row that opens its console, and the ledger groups every match by day. Both are kept. The row shows the name, format, teams, matches, date, and "Winner: name" with the winner's mark where the star was.
- Delete and discard, not applicable: History has neither, so it opens no dialog.
