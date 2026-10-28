# 08: Contract and guard rails

**What to build:** A maintainer or agent opening the repo finds one page that
says what the design system is and what is forbidden, linked from the project
instructions. The two old icon libraries are gone from the dependencies, lint
refuses an import of either, and a test fails if an old token class appears
outside the volleyball tools. The follow-up to merge the four confirm dialogs
is filed.

**Blocked by:** 02, 03, 04, 05, 06, 07

**Status:** resolved

- [x] Both icon libraries are uninstalled and no import of either remains
      anywhere in the source, including the primitives.
- [x] Lint forbids importing either library, with a message naming the sprite
      as the replacement.
- [x] One vitest file reads every source file outside the volleyball component
      folder and the volleyball page tree and fails on any old token class
      (background, foreground, card, popover, primary, secondary, muted,
      accent, destructive, border, input, ring utilities) or a radius above
      4px on a matchbook surface. The forbidden list lives in that one file.
      It passes on the finished branch.
- [x] A one-page design-system document under the docs folder covers: the
      palette and what each color is for, the display and body faces, radius
      and border rules, the component classes and which button to use for
      primary, secondary, outline, and destructive actions, the icon sprite and
      how to add a glyph in its style, the dialog recipe, and the forbidden list
      (old token classes, the two icon libraries, radii above 4px on matchbook
      surfaces, dark-mode utilities, colors outside the palette).
- [x] The project instructions link to that page under a design-system
      heading.
- [x] The old token block's legacy comment says what reads it and when it goes.
- [x] A new issue is filed for merging the generic confirm, delete confirm,
      end tournament, and delete teams dialogs into one component, with status
      needs-triage.
- [x] Typecheck, lint, and the full test suite pass.

## Comments

### What I did

- Uninstalled `lucide-react` and `@heroicons/react` (`npm uninstall`, the
  brief's exception for this ticket). The last two importers were
  `src/components/volleyball/RotationControls.tsx` and `HelpAccordion.tsx`;
  each heroicon became an `MbIcon` at the same pixel size and nothing else in
  those files changed. Prev and next use `chevron-left` and `chevron-right`
  at 20px, the accordion uses `chevron-down` at 16px with its rotate class,
  the Overlaps toggle uses two new glyphs `eye` and `eye-off` at 14px, and
  the Arrows toggle reuses the sprite's `swap` at 14px.
- Drew `eye` and `eye-off` in the sprite's style (24px grid, 1.8px stroke,
  round caps and joins, an almond outline with a 3px pupil, the off state
  with one diagonal stroke) and added both ids to `manifest.json` `iconIds`
  and the `preview.html` catalog. 53 glyphs now.
- `eslint.config.mjs`: `no-restricted-imports` on `lucide-react`,
  `lucide-react/*`, `@heroicons/react`, `@heroicons/react/*` with a message
  naming `MbIcon` and the sprite. Proven on a scratch file with a value
  import, a type-only import, and a deep heroicons path: three errors, then
  the file was deleted.
- `src/__tests__/design/tokens.test.ts`: the forbidden list (old token
  utilities on background, foreground, card, popover, primary, secondary,
  muted, accent, destructive, border, input, ring, with their `-foreground`
  pairs and any variant prefix; `rounded-xl` and up; arbitrary radii above
  4px; `dark:`) with unit tests on the matcher for the pass and fail examples,
  a test that the walk covers the primitives and skips the volleyball folders
  and `globals.css`, and the scan itself. Red was proven by planting
  `bg-background rounded-xl` in `dialog.tsx` (the failure named
  `components/ui/dialog.tsx:91` with both classes); the real tree then passed
  with no fix needed.
- `docs/design-system.md`: palette with uses, the two faces and the issue 09
  caveat, radius, border, and shadow rules, the component classes and which
  button to use, the sprite and the three places an id lives, the dialog
  recipe as ticket 01 shipped it, the forbidden list, and the legacy block.
  Linked from `CLAUDE.md` under a `## Design system` heading.
- The legacy comment in `globals.css` now names its readers (the two
  volleyball folders, the `@theme inline` maps, the base layer), says the
  block and the base layer go with the volleyball redesign, and points at the
  scan test and the doc.
- Filed `10-merge-the-four-confirm-dialogs.md` (needs-triage) naming
  `console/ConfirmDialog.tsx`, `shared/DeleteConfirmDialog.tsx`,
  `console/EndTournamentDialog.tsx`, and
  `dialogs/delete-teams/DeleteTeamsDialog.tsx`.

### Deviations and decisions

- The Arrows toggle reuses `swap` instead of a new refresh glyph. The task
  said to reuse where a glyph fits; the toggle shows movement arrows and
  `swap` is two arrows, which reads closer to the label than a refresh cycle
  would. A `refresh` glyph is one drawing away if the page says otherwise.
- `rounded-full` passes the scan. It is a circle (avatar, live dot, the
  scoring page's 56px plus and minus), not a corner radius, and ticket 04
  kept those on purpose. `rounded-lg` passes too, since it is 4px while the
  legacy `--radius` stands; the doc tells people to write `rounded-[4px]`.
- The scan reads `.ts`, `.tsx`, and `.css` under `src` and skips
  `src/app/globals.css` (it defines the legacy block and the base layer that
  reads it) and the test's own folder.
- `components.json` still says `"iconLibrary": "lucide"`. It is a shadcn CLI
  setting read by nothing at runtime, and the lint rule rejects anything the
  CLI would generate with lucide, so I left it rather than guess at a value
  the CLI accepts.
- `Button` and `Badge` keep `asChild` and the Slot import (ticket 01 said
  this ticket could drop them). No caller passes it; dropping it is a refactor
  with no design effect, so it stays.
- The full suite ran with the Firestore emulator up on this machine, so the
  five gated files ran too: 34 files, 538 tests passed, 0 skipped (the
  baseline 533 plus this ticket's 5).

### For the orchestrator to check in the browser

- Not verified in the browser pane; I did not start the dev server or the
  emulators per the brief.
- Rotation Lab at 375x812: prev and next circles show the sprite chevrons at
  20px; the Overlaps toggle shows the eye (on) and the crossed eye (off) at
  14px; the Arrows toggle shows the swap glyph; the help accordion's chevrons
  still flip when a row opens. Nothing else on the page moved.
- `/assets/matchbook/preview.html` lists `eye` and `eye-off` at the end.
- Installed browsers see the two new glyphs only after the update banner; the
  service worker precaches the sprite.
- Glyph page: `.scratch/design-consistency/glyphs/08-contract-and-guard-rails.html`.

### Noticed across the merged tickets, for the review

- Two trophies: `MatchCompleteDialog` uses `trophy` (ticket 04) while
  `GuestMatchComplete` and `EndTournamentDialog` use `compete` (tickets 05
  and 02) for the same meaning. One string each to settle.
- Two left chevrons: `competitions/new/page.tsx:34` and
  `competitions/[id]/page.tsx:115` still rotate `chevron-right` 180 degrees,
  while the sprite now has `chevron-left` (ticket 04 used it on the scoring
  header). The doc says to use `chevron-left`.
- The guest dialog's Play again carries the `quick` bolt; the scoring page's
  undo carries `undo`. Different meanings, so probably fine, but worth a look.
- The delete-teams refusal's lone Close button is not `sm:flex-1` on purpose;
  every other footer splits the row.

Issue filed: 10.

### Browser check (orchestrator, 375x812, emulators)

Static checks on the finished branch: tsc clean, eslint 0 errors with the 10 baseline warnings, vitest 538 passed with the emulator up (the token scan and the lint rule included). The Rotation Lab was opened at 375x812 and its icons come from the sprite.
