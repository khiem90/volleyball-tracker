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

- [ ] The team-color panels keep their size, layout, colors, and tap targets. Text on a panel keeps the contrast handling it has today.
- [ ] The scoring header uses the role tokens and shows team marks where it showed crests.
- [ ] The fullscreen controls, the menu, and any score entry use the shared buttons, menu, and form controls.
- [ ] The match-complete dialog and the guest's match-complete screen use the shared dialog and the score line.
- [ ] Undo works as today and its toast is the shared one.
- [ ] Scoring a point, an undo, finishing a game, finishing a match, and leaving the page all behave as they did.
- [ ] The scoring files contain no old-theme name, and their folders are on the guard's list of migrated folders.
- [ ] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.
- [ ] The owner has looked at the scoring page on a phone, as an owner and as a guest, and what they flagged is fixed.

## Comments
