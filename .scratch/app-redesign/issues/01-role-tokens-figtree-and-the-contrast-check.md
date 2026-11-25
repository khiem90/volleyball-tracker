# 01: Role tokens, Figtree, and the contrast check

**What to build:** The owner opens any screen and sees the new palette and the
new typeface, with the layout still the old one. The role tokens from the spec
exist as theme tokens beside the old theme's tokens: ground, surface, ink,
ink-soft, line, fill, action, action-tint, danger, and a danger tint. The
radius scale and the type scale exist as named tokens. The old theme's token
names resolve to role values, so every screen that still uses an old name takes
the new colors without being edited. Figtree loads once and applies everywhere,
which fixes the defect that kept Oswald and Outfit from ever applying.

The design guard learns two things here. It checks the contrast of the token
pairs the spec lists, reading the values from the stylesheet. It also gets a
list of migrated folders, empty for now. Later tickets add their folders to it,
and the ban on old-theme names and on arbitrary radii applies to listed folders
only until ticket 20 makes it global.

This is the expand step of an expand and contract. Nothing is deleted.

Covers spec stories 9 to 15, 79, and 81.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The prototype route is not on the work branch. Its code is kept on a throwaway branch, and the spec's opening paragraph names that branch.
- [ ] The role tokens hold the values in the spec's token table, and the danger tint is chosen so danger text on it reaches 4.5 to 1.
- [ ] The radius scale has four named steps: 14px, 10px, 8px, and a full pill. The type scale has named steps for the sizes in the spec.
- [ ] Each old theme color token resolves to a role token. The old teal, gold, plum, and green resolve to whichever role fits the way each is used today, and the ticket's comments record the mapping.
- [ ] Figtree is the body and heading face on every screen, including the scoring page and the volleyball tools. Oswald and Outfit are no longer loaded.
- [ ] Scores and other changing numbers use tabular figures.
- [ ] The page ground, the text selection color, the focus ring, and the scrollbar use role tokens.
- [ ] The guard test reads the role tokens from the stylesheet and asserts 4.5 to 1 for every pair in the spec's testing section. Its own sample cases cover a passing pair and a failing pair.
- [ ] The guard test has a list of migrated folders, and the ban on old-theme names and the named-radius rule run against that list. Sample cases cover both rules. The list is empty.
- [ ] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.
- [ ] Issue 09 of the design-consistency work is marked resolved with a pointer to this ticket.

## Comments
