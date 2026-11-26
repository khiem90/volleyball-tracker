# 07: Scoring page

**What to build:** A scorer opens a match and the two team-color panels fill
the screen exactly as they do today. Everything around them wears the new
look: the header, the fullscreen and menu controls, the score entry, the
match-complete dialog, and the undo toast. A guest scoring a quick match sees
the same page and the same finish.

This is the first screen group in stage two, because the chosen direction says
least about it. The panels' layout, their colors, and the way a tap scores are
out of bounds.

Covers spec stories 3, 4, 53, 54, 55, and 56.

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [x] The team-color panels keep their size, layout, colors, and tap targets. Text on a panel keeps the contrast handling it has today.
- [x] The scoring header uses the role tokens and shows team marks where it showed crests.
- [x] The fullscreen controls, the menu, and any score entry use the shared buttons, menu, and form controls.
- [x] The match-complete dialog and the guest's match-complete screen use the shared dialog and the score line.
- [x] Undo works as today and its toast is the shared one.
- [x] Scoring a point, an undo, finishing a game, finishing a match, and leaving the page all behave as they did.
- [x] The scoring files contain no old-theme name, and their folders are on the guard's list of migrated folders.
- [x] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.
- [ ] The owner has looked at the scoring page on a phone, as an owner and as a guest, and what they flagged is fixed.

## Comments

- Not applicable, by ruling 11. The header never showed crests, and the page has no menu, no score entry, and no toast. Undo is a button in the header and in the fullscreen bar, and both now use the shared grey button.
- The panels changed in name only. Fullscreen keeps its black ground, because a panel's color thins toward one corner and the ground shows through it.
- Nobody has seen this in a browser. Check at 390px: the header with Fullscreen, Undo, and End beside two chips, and the result dialogs, where the 44px score leaves each team's name about 60px.
