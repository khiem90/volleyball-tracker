# 02: Console dialogs

**What to build:** Every dialog an owner opens from a tournament's console, and
the discard confirm on Quick Match, is matchbook inside as well as out. End
tournament, start tournament with its play-in team picker, correct result, and
the generic confirm used by withdraw, scorer-link regenerate, close court, and
discarding an abandoned quick match all use sprite glyphs, navy titles, muted
body text, matchbook rows and fields, and the right footer buttons.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] End tournament: navy title with a sprite glyph, red filled End button,
      navy outline Cancel, spinner while ending.
- [ ] Start tournament: navy title with the play glyph, the play-in team rows
      on paper-bright with the rule color for borders, a navy border and light
      navy wash on the selected row, the check glyph from the sprite, a filled
      navy Start button.
- [ ] Correct result: the shell matches the recipe and the pencil glyph
      replaces the lucide one; the existing matchbook fields are unchanged.
- [ ] The generic confirm takes a sprite glyph id instead of a lucide component,
      and each caller passes one: remove-user for withdraw, a fitting existing
      glyph for scorer-link regenerate and close court, trash for discard.
- [ ] The sprite gains play, pencil, and remove-user glyphs in its own style,
      shown beside the icons they replace before being committed.
- [ ] No lucide or heroicons import remains in the console or quick-match
      components and pages.
- [ ] No copy or confirm behavior changes.
- [ ] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Each dialog verified in the browser pane at 375x812 against the
      emulators, opened from a live tournament's console and from Quick Match.
