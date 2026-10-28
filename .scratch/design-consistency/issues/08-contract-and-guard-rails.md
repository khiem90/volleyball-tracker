# 08: Contract and guard rails

**What to build:** A maintainer or agent opening the repo finds one page that
says what the design system is and what is forbidden, linked from the project
instructions. The two old icon libraries are gone from the dependencies, lint
refuses an import of either, and a test fails if an old token class appears
outside the volleyball tools. The follow-up to merge the four confirm dialogs
is filed.

**Blocked by:** 02, 03, 04, 05, 06, 07

**Status:** ready-for-agent

- [ ] Both icon libraries are uninstalled and no import of either remains
      anywhere in the source, including the primitives.
- [ ] Lint forbids importing either library, with a message naming the sprite
      as the replacement.
- [ ] One vitest file reads every source file outside the volleyball component
      folder and the volleyball page tree and fails on any old token class
      (background, foreground, card, popover, primary, secondary, muted,
      accent, destructive, border, input, ring utilities) or a radius above
      4px on a matchbook surface. The forbidden list lives in that one file.
      It passes on the finished branch.
- [ ] A one-page design-system document under the docs folder covers: the
      palette and what each color is for, the display and body faces, radius
      and border rules, the component classes and which button to use for
      primary, secondary, outline, and destructive actions, the icon sprite and
      how to add a glyph in its style, the dialog recipe, and the forbidden list
      (old token classes, the two icon libraries, radii above 4px on matchbook
      surfaces, dark-mode utilities, colors outside the palette).
- [ ] The project instructions link to that page under a design-system
      heading.
- [ ] The old token block's legacy comment says what reads it and when it goes.
- [ ] A new issue is filed for merging the generic confirm, delete confirm,
      end tournament, and delete teams dialogs into one component, with status
      needs-triage.
- [ ] Typecheck, lint, and the full test suite pass.
