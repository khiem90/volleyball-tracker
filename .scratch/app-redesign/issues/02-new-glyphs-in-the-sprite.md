# 02: New glyphs in the sprite

**What to build:** Every icon in the app keeps its meaning and shows a new
drawing in one outline style. The sprite keeps all 54 ids, so no screen changes
which icon it asks for. The drawings come from Phosphor's regular weight, which
is MIT licensed, copied into the sprite. The five tab icons also get a filled
drawing under their own ids, ready for the shell in ticket 06. The icon
component is available under a name without the old theme's prefix, and the old
name keeps working until ticket 20.

The owner picked this look as option 1 in `d-icons-home.png` and
`d-icons-console.png` under `.scratch/app-redesign/directions/`.

Covers spec stories 71 and 80.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] All 54 ids are still in the sprite, each with a new drawing on one grid in one stroke weight.
- [ ] The ids the prototype mapped use the glyphs the spec names. The rest are chosen by the same judgment, and the ticket's comments list every id with its glyph.
- [ ] An id with no fitting Phosphor glyph is drawn by hand in the same weight. The comments say which ones.
- [ ] Five filled drawings exist for the tab icons under new ids.
- [ ] Glyphs take their color from the text color around them, as today.
- [ ] The app has no new package and fetches no icon from another host at run time.
- [ ] Phosphor's license notice is kept beside the sprite.
- [ ] The sprite's version stamp changes, so an installed copy of the app fetches the new drawings.
- [ ] The icon component is exported under its new name with the same props. The old name still resolves.
- [ ] The guard test fails when source asks for an icon id the sprite does not have, and when one of the 54 ids goes missing. Sample cases cover both.
- [ ] The lint rule against the two icon libraries stays, and its message names the new component.
- [ ] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.

## Comments
