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

- [x] All 54 ids are still in the sprite, each with a new drawing on one grid in one stroke weight.
- [x] The ids the prototype mapped use the glyphs the spec names. The rest are chosen by the same judgment, and the ticket's comments list every id with its glyph.
- [x] An id with no fitting Phosphor glyph is drawn by hand in the same weight. The comments say which ones.
- [x] Five filled drawings exist for the tab icons under new ids.
- [x] Glyphs take their color from the text color around them, as today.
- [x] The app has no new package and fetches no icon from another host at run time.
- [x] Phosphor's license notice is kept beside the sprite.
- [x] The sprite's version stamp changes, so an installed copy of the app fetches the new drawings.
- [x] The icon component is exported under its new name with the same props. The old name still resolves.
- [x] The guard test fails when source asks for an icon id the sprite does not have, and when one of the 54 ids goes missing. Sample cases cover both.
- [x] The lint rule against the two icon libraries stays, and its message names the new component.
- [x] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.

## Comments

Each id and its glyph from Phosphor 2.1.1, regular weight:

overview house, teams users-three, quick lightning, compete trophy,
history clock-counter-clockwise, tools wrench, settings gear, help question,
bell bell, plus plus, export upload-simple, import download-simple,
share share-network, print printer, save floppy-disk, search magnifying-glass,
filter funnel, calendar calendar-blank, clock clock, location map-pin,
volleyball volleyball, bracket tree-structure (mirrored), chart chart-bar,
swap arrows-left-right, court drawn by hand, check check-circle,
warning warning, live broadcast, menu list, chevron-right caret-right,
chevron-down caret-down, clipboard clipboard-text, star star,
mail envelope-simple, lock lock, login sign-in, cloud cloud-arrow-up, close x,
trash trash, chevron-left caret-left, flag flag, maximize arrows-out-simple,
minimize arrows-in-simple, undo arrow-u-up-left, crown crown, minus minus,
trophy trophy, play play, pencil pencil-simple, remove-user user-minus,
logout sign-out, eye eye, eye-off eye-slash, rsvp calendar-check.

`court` is the one glyph drawn by hand, because Phosphor's only court is a
basketball court. `bracket` is Phosphor's tree-structure flipped left to right,
so two entries feed one winner. `compete` and `trophy` now share one drawing.

The filled ids are the tab's id plus `-fill`: overview-fill, teams-fill,
compete-fill, history-fill, rsvp-fill. Phosphor's filled history glyph is only
a heavier outline, so on that tab the ink label carries most of the active state.

The component is `Icon` in `src/components/shared/Icon.tsx`. The version stamp
is a hash of the sprite file, so it changed with the drawings and needed no edit.
