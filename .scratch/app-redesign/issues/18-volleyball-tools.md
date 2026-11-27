# 18: Volleyball tools

**What to build:** The owner opens the tools page and the volleyball rotations
tool and both look like the rest of the app. The tools page lists its tools in
a card. The rotations tool, the saved formations page, and the page a shared
formation opens all use the shared header block, cards, buttons, form
controls, and dialogs. The court diagram keeps its geometry and takes its
colors from the role tokens. Building, rotating, saving, and sharing a
formation work exactly as they do today.

These pages are the last ones on the look from before the old theme. With them
moved, the legacy token block has no reader and goes, along with the tools'
exemption in the guard.

Covers spec stories 1, 75, and 76.

**Blocked by:** 05, 06

**Status:** ready-for-human

- [x] The tools page lists the same tools with the same copy, in a card.
- [x] The rotations tool has the same controls and the same behavior, built from the shared pieces.
- [x] The court diagram has the same geometry and positions. Its lines, players, and labels use role tokens and pass 4.5 to 1 for text.
- [x] The saved formations page lists the same formations with the same actions. Deleting one uses the shared destructive dialog.
- [x] The page a shared formation opens shows the same content for a signed-in user and for a guest.
- [x] The tool's three modals use the shared dialog with their content unchanged.
- [x] No volleyball file reads a legacy token. The legacy token block and the base rules that read it are deleted from the stylesheet.
- [x] The guard test no longer exempts the volleyball folders or the stylesheet, and the volleyball folders are on its list of migrated folders.
- [x] The volleyball tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has built and saved a formation on a phone, and what they flagged is fixed.

## Comments

- Player colors are the court's own palette, not role tokens: seven hues in `src/lib/volleyball/constants.ts`, each with an ink or white label at 4.5 to 1 or better. The big zone numbers behind the players stay faint on purpose, since each player carries its own zone label.
- Three things behave a little differently. The shared dialog closes the editor on Escape, saving a draft as Cancel does. Deleting on My Formations waits in the dialog and no longer cancels itself after 3 seconds. In the editor on a phone the court comes before the controls so it can be reached. The rotations page keeps its browser confirm for delete and gains no back link, since it has none today.
- Nothing here was seen in a browser. The owner check is open, and the two carried defects (labels over the net on the Tools page, the editor's see-through footer at 390px) are fixed in markup only.
- Merged on the integration branch `claude/grill-with-docs-redesign-27d048` and through the code review. The one open box is the owner's own look on a phone, so the status is `ready-for-human` until they have had it.
