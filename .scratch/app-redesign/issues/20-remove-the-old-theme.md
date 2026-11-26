# 20: Remove the old theme

**What to build:** Nothing the owner can see changes. Every screen already
wears the new look, and this ticket deletes what is left of the old one so it
cannot come back. The old token names, the old shared classes, the old
component and hook names, the eight crests, the paper textures, and the
theme's standalone token file and preview page all go. The asset folder that
carries the theme's name is renamed. The guard's ban on old-theme names and on
arbitrary radii covers the whole source.

This is the contract step of the expand and contract that ticket 01 began. It
also sweeps for anything the screen tickets missed, and it is the point where
the branch is ready to merge.

Covers spec stories 1, 7, 77, and 78.

**Blocked by:** 07, 08, 10, 11, 12, 13, 14, 16, 18, 19

**Status:** ready-for-agent

- [x] A search of the source finds no use of an old token, an old shared class, or the old icon component name. Anything found is moved to the new names first.
- [x] The old token names and the old shared classes are deleted from the stylesheet.
- [x] The folder, components, hooks, and types that carry the old theme's name or prefix are renamed, and the crest field is removed from the team shape.
- [x] The eight crests, the textures, the standalone token file, the preview page, and their manifest are deleted. The asset folder is renamed and the sprite's path follows.
- [x] Shared components that no screen ticket owned, such as the choice control, the link field, the step buttons, the spinners, and the motion helpers, are on the new names and the new look.
- [x] The guard test bans the old theme's prefix, the word "matchbook", and the two old font names across the whole source, with no list of migrated folders and no exempt folder apart from its own.
- [x] The guard's named-radius rule covers the whole source.
- [x] The design-system document matches what was built, with no mention of the old theme. The project instructions' design-system paragraph is rewritten to match.
- [x] Each of the five tabs, the console, the scoring page, sign-in, and the volleyball tool has been opened on a phone and on a laptop with no leftover piece of the old look.
- [x] The full suite passes. Lint, the type checker, and a production build are clean.
- [ ] The owner has said the branch is ready to merge.

## Comments

- The design-system document is corrected and the guard now reads it. The implementer left the design-system paragraph in `CLAUDE.md` alone, since an agent may not edit the project instructions on another agent's word. The main session put the new paragraph in after the merge (commit `75a16ce`) and added `CLAUDE.md` to the files the guard reads.
- The asset folder is `public/assets` now, with `icons/` and `auth/` straight under it. `tabGlyphs.test.ts`, which ticket 06 added, read the sprite by its old path, so its one path changed along with the two that ruling 10 names.
- `components.json` names Phosphor as its icon library and the lint rule also refuses `@phosphor-icons/react`. Lint has no errors. Its 10 warnings are unused functions in `src/lib/volleyball`, which this ticket did not touch.
- The Teams page's directory list fills its card from `xl` up, the defect carried from ticket 13. A merger saw it at 1280px with 11 teams: the list ends at the card's foot, level with Team Readiness, and scrolls inside. At 1024px and 390px it keeps the 60% cap.
- The phone-and-laptop sweep ran on the dev server in a 390px touch context and at 1280px, not on a real phone. It covered the five tabs, the seeded RSVP list, the Win 2 & Out console's five tabs, the guest scoring page, sign-in, Quick Match, Tools, and the rotations tool. Every icon drew from the sprite's new address, no page was wider than its window, no console logged an error, and no element carried the old fonts, palette, uppercase, 1.5px border, or 4px corner.
