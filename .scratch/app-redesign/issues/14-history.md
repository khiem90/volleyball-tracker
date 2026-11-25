# 14: History

**What to build:** The owner opens History and reads every past result as a
row-size score line, grouped the way History groups results today. A completed
tournament shows its name, format, and champion at the head of its group, and
its matches underneath. Quick matches show the same way. A result opens what
it opens today.

Covers spec stories 31, 32, 60, and 61.

**Blocked by:** 03, 05, 06

**Status:** ready-for-agent

- [ ] History shows the same results in the same groups and order as today.
- [ ] Every match is a row-size score line with marks, the winner in bold, and the loser dimmed.
- [ ] A completed tournament's group shows its name, format, date, and champion, with the champion's mark.
- [ ] Any filter or search on the page works as today in the new form controls.
- [ ] Deleting or discarding a record, where History allows it today, uses the shared destructive dialog.
- [ ] An empty History shows today's empty state in the new look.
- [ ] History's files contain no old-theme name and are on the guard's list of migrated folders.
- [ ] The history tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has looked at History on a phone and what they flagged is fixed.

## Comments
