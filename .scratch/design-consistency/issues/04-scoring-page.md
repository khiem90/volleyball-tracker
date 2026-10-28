# 04: Scoring page

**What to build:** On the scoring page an owner or scorer sees sprite icons in
the header, the fullscreen control bar, and the team-color panels, a fullscreen
bar with the same square corners as every other matchbook control, and a
match-complete confirm in the matchbook design. The team-color panels keep
their full-bleed look exactly, apart from their icons.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Header: back, flag, fullscreen, and undo use sprite glyphs.
- [ ] Fullscreen bar: flag, exit fullscreen, and undo use sprite glyphs; the
      bar has a 4px radius and the panel shadow.
- [ ] Team panels: crown, minus, and plus come from the sprite; their colors,
      blobs, pill, and typography are otherwise unchanged.
- [ ] The legacy score-text rule moves into the components layer under a
      matchbook name and the panels use it.
- [ ] Match complete: navy title with the trophy glyph, team color chips as
      navy-bordered squares without shadows, the winner line in navy with the
      muted ink for detail, filled navy Confirm, navy outline Cancel, spinner
      while saving. Verified on both the signed-in and the guest scoring pages.
- [ ] The match page's loading state uses the matchbook spinner.
- [ ] The sprite gains chevron-left, flag, maximize, minimize, undo, crown,
      minus, and trophy glyphs in its own style, shown beside the lucide
      glyphs they replace before being committed.
- [ ] No lucide import remains in the match components or pages.
- [ ] 44px controls, both orientations, wake lock, and fullscreen behave as
      before.
- [ ] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Verified in the browser pane at 375x812 and in landscape against the
      emulators.
