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

**Status:** resolved

- [x] The prototype route is not on the work branch. Its code is kept on a throwaway branch, and the spec's opening paragraph names that branch.
- [x] The role tokens hold the values in the spec's token table, and the danger tint is chosen so danger text on it reaches 4.5 to 1.
- [x] The radius scale has four named steps: 14px, 10px, 8px, and a full pill. The type scale has named steps for the sizes in the spec.
- [x] Each old theme color token resolves to a role token. The old teal, gold, plum, and green resolve to whichever role fits the way each is used today, and the ticket's comments record the mapping.
- [x] Figtree is the body and heading face on every screen, including the scoring page and the volleyball tools. Oswald and Outfit are no longer loaded.
- [x] Scores and other changing numbers use tabular figures.
- [x] The page ground, the text selection color, the focus ring, and the scrollbar use role tokens.
- [x] The guard test reads the role tokens from the stylesheet and asserts 4.5 to 1 for every pair in the spec's testing section. Its own sample cases cover a passing pair and a failing pair.
- [x] The guard test has a list of migrated folders, and the ban on old-theme names and the named-radius rule run against that list. Sample cases cover both rules. The list is empty.
- [x] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.
- [x] Issue 09 of the design-consistency work is marked resolved with a pointer to this ticket.

## Comments

- 2026-11-25: Built test-first. The mapping of the old colors: paper to ground, paper-bright to surface, navy to ink, ink-muted to ink-soft, rule to line, red to danger. Coral, green, and teal go to action, since they mark the call to action, a winner or a completed match, and the leader in standings. Gold and plum go to ink-soft. Gold marks a draft, a middling readiness, and a few highlights, and none of those is good news or a warning. No screen uses plum.
- The names. Radius: `rounded-card` 14px, `rounded-tile` 10px, `rounded-chip` 8px, `rounded-pill`. Type: `text-page-title` 28 to 30px, `text-title` 16px, `text-body` 15px, `text-label` 14px, `text-caption` 13px, `text-tab` 10.5px, `text-score` 44px. `cn()` had to learn both lists, or it dropped `text-title` beside `text-ink`.
- The danger tint is `#fff7f6`, close to white. Danger is 4.76 to 1 on white, so any stronger tint puts danger text under 4.5. A visible red chip needs a darker danger, which is the spec's call.
- Beyond the criteria: the paper-grain texture is off the page ground, and the contrast math is `contrastRatio` in `src/lib/contrast.ts` for ticket 03 to reuse.
- Left for later tickets: the live dot and error text still read the old red, so live shows in danger until ticket 04 restyles it. The forced uppercase stays on `.matchbook-display` and the `mb-*` classes for ticket 04 to drop, so story 13's sentence case lands there. The page's theme-color tag is still the old paper and belongs to ticket 19. Field borders in `line` are faint on a white card until ticket 04.
- Merged on the integration branch `claude/grill-with-docs-redesign-27d048` and resolved after the code review.
