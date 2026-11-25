# 13: Teams tab

**What to build:** The owner opens the Teams tab and sees their roster as rows
in a card, each with the team's mark, its name, and the facts shown today.
Adding a team is the page's main action. Editing a team opens the team form in
the shared dialog, where the color picker works as it does today and the mark
previews the chosen color. Deleting teams uses the shared destructive dialog.

Covers spec stories 25, 29, and 30.

**Blocked by:** 03, 05, 06

**Status:** ready-for-agent

- [ ] The roster lists the same teams in the same order as today, each with its mark, name, and the same facts and status.
- [ ] Search and any filters work as today in the new form controls.
- [ ] The team form has the same fields and validation. The color picker shows the same palette, and a mark beside it previews the chosen color with the team's initial.
- [ ] Selecting several teams and deleting them works as today and confirms in the shared destructive dialog.
- [ ] An empty roster shows today's empty state in the new look.
- [ ] The Teams tab's files and the team dialogs contain no old-theme name and are on the guard's list of migrated folders.
- [ ] The roster tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has added, edited, and deleted a team on a phone, and what they flagged is fixed.

## Comments
