# 13: Teams tab

**What to build:** The owner opens the Teams tab and sees their roster as rows
in a card, each with the team's mark, its name, and the facts shown today.
Adding a team is the page's main action. Editing a team opens the team form in
the shared dialog, where the color picker works as it does today and the mark
previews the chosen color. Deleting teams uses the shared destructive dialog.

Covers spec stories 25, 29, and 30.

**Blocked by:** 03, 05, 06

**Status:** ready-for-human

- [x] The roster lists the same teams in the same order as today, each with its mark, name, and the same facts and status.
- [x] Search and any filters work as today in the new form controls.
- [x] The team form has the same fields and validation. The color picker shows the same palette, and a mark beside it previews the chosen color with the team's initial.
- [x] Selecting several teams and deleting them works as today and confirms in the shared destructive dialog.
- [x] An empty roster shows today's empty state in the new look.
- [x] The Teams tab's files and the team dialogs contain no old-theme name and are on the guard's list of migrated folders.
- [x] The roster tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has added, edited, and deleted a team on a phone, and what they flagged is fixed.

## Comments

- "Adding a team is the page's main action" is not applicable. The page has no action in its header and gets none. A team is added in the inline form at the top of the directory card, as today.
- The directory and the readiness list are rows now, not tables, so neither scrolls sideways. The selected row is washed with `action-tint`. The teal edge on the top row is gone, and its rank number still says it leads.
- The page's title reads "Teams". It was "Team Directory", which the first card still says. Status words read "Active", "Idle", "Ready", "Good", and "Needs attention" where the data holds capitals.
- Merged on the integration branch `claude/grill-with-docs-redesign-27d048` and through the code review. The one open box is the owner's own look on a phone, so the status is `ready-for-human` until they have had it.
