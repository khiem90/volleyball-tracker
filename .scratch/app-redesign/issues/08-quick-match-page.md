# 08: Quick Match page

**What to build:** The owner or a guest opens Quick Match and sets up a
one-off match on a page built from the new cards and controls. Picking or
naming the two teams shows each team's mark. Starting the match is the page's
green main button. Any quick matches listed on the page read as score lines.

Covers spec stories 3, 4, 19, 20, and 56.

**Blocked by:** 03, 05, 06

**Status:** ready-for-agent

- [x] The page uses the shared header block, cards, form controls, and buttons, with the same fields, defaults, and copy as today.
- [x] Teams chosen from the roster show their marks. A team typed in by name gets a mark from the fallback color.
- [x] The action that starts the match is the green main button.
- [x] Finished and unfinished quick matches on the page show as score lines, and discarding one uses the shared destructive dialog.
- [x] A guest can set up and start a quick match as today.
- [x] The page's files contain no old-theme name, and they are on the guard's list of migrated folders.
- [x] The quick match tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has looked at the page on a phone and what they flagged is fixed.

## Comments

- Not applicable: "a team typed in by name". The page has no field for a typed name. Teams come from two selects, or are the guest's fixed pair. A roster team with no color, and a team that has left the roster, get the fallback color.
- Both start buttons stay. "Start Match" in the header is the green one, and "Start Scoring" in the preview card is the black pill.
- A row's bold winner replaces the green or red win dot. A slot with no team picked is a grey shield, not the greyed app crest. Nothing here was looked at in a browser.
