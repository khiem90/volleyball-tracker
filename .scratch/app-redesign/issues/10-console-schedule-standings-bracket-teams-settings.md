# 10: Console: Schedule, Standings, Bracket, Teams, and Settings

**What to build:** The owner moves through the rest of the console's tabs and
each one is built from the same cards, rows, marks, and score lines as Courts.
Schedule lists matches as score lines. Standings is a table in a card with a
mark beside each team. The bracket keeps its shape and its scrolling, with
each match drawn in the new look. Teams lists the tournament's entries with
their marks. Settings groups its controls and share links in cards. The
console's own dialogs carry their content in the shared dialog.

Covers spec stories 50, 51, 52, and 61.

**Blocked by:** 09

**Status:** ready-for-human

- [x] Schedule shows each match as a row-size score line with its court and state, and the same actions per match as today, including a correction.
- [x] Standings shows the same columns and order as today in the shared table, with a mark beside each team and the champion marked as today.
- [x] The bracket has the same layout, rounds, and horizontal scroll. Each match is a small card with marks, names, and scores, with the winner in bold.
- [x] Teams lists every entry with its mark. Withdrawing a team, adding a team, and a mixed team's players show and behave as today.
- [x] Settings shows the same controls. The scorer link and the spectator link sit in a card with their copy and share actions. Ending and deleting the tournament use the red button.
- [x] The console's dialogs for starting, ending, correcting, confirming, and a mixed team lay out their content with the shared form controls and buttons.
- [x] The not-found view uses the new look.
- [x] Every console file contains no old-theme name, and the console's folders are on the guard's list of migrated folders.
- [x] The console tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has looked at each tab on a phone, with a round robin and with a bracket format, and what they flagged is fixed.

## Comments

- Not applicable, by ruling 1: no tournament row has a menu, and the links have no share action. Duplicate, End, and Delete are buttons in Settings, and each link has Copy.
- The leader of the standings is marked by a green place number. The teal bar was an inset shadow on the cell.
- Settings is three cards now: the name, courts, and facts, then the two links, then Duplicate, End, and Delete. End and Delete are the quiet red button, and each dialog confirms in filled red.
- Merged on the integration branch `claude/grill-with-docs-redesign-27d048` and through the code review. The one open box is the owner's own look on a phone, so the status is `ready-for-human` until they have had it.
