# 01: Dialog foundation, proven on Delete tournament

**What to build:** An owner who taps Delete on a tournament sees a matchbook
dialog: a centered paper panel with the navy frame and thick top rule under a
navy-tinted overlay, a navy condensed uppercase title with a trash glyph from
the sprite, muted body text, a navy X to close, and two 44px matchbook buttons,
Cancel as the navy outline and Delete filled in the matchbook red. While the
delete runs, the Delete button shows a small spinner in its own text color.
This ticket restyles the dialog and button primitives where they are defined,
so every other dialog in the app picks up the new shell at once and keeps only
its inner leftovers for its own ticket. It also brings the stylesheet in line:
the old token block resolves to matchbook values, dead legacy classes go, and
focus and selection turn coral.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The delete-tournament dialog, opened from the Tournaments list and from a
      tournament's console, matches the recipe in the spec: paper-bright panel,
      1.5px navy border with 4px top rule, 4px radius, panel shadow, navy
      overlay, navy uppercase display title, muted description, sprite close
      glyph with a 44px hit area, 44px footer buttons full width on phone.
- [x] The title is navy, not red, and only the Delete button is red.
- [x] A filled red button class exists with the same hover, disabled, and
      height rules as the other filled matchbook buttons.
- [x] A small inline spinner component exists, drawn in the current text color,
      and the Delete button shows it while deleting.
- [x] The sprite gains close and trash glyphs in its own style (24px grid, 1.8px
      stroke, round joins), shown beside the lucide and heroicons glyphs they
      replace before being committed.
- [x] The dialog primitive sets its own paper and navy colors and the body font
      on its content element, since it portals outside the matchbook surface.
- [x] The button primitive's default, outline, and destructive variants render
      as the matchbook navy, navy outline, and red buttons; variants, sizes,
      badge variants, and dialog exports with no importer are deleted.
- [x] Every other dialog in the app opens in the new shell without a regression
      in its controls' 44px height.
- [x] The old token block's values point at matchbook: background to paper,
      card and popover to paper-bright, foreground to navy, primary to navy with
      paper-bright foreground, destructive to the matchbook red, muted
      foreground to the muted ink, accent to a light navy wash, border to the
      rule color, ring to coral, base radius to 4px. The block carries a comment
      naming it volleyball-only legacy that goes with the volleyball redesign.
- [x] The glass card, playful button, red and teal gradient button, soft shadow
      classes, the unused team blue and orange tokens, and the sidebar tokens
      are deleted, and nothing in the app referenced them except the guest
      dialog, which ticket 05 rebuilds.
- [x] The base layer's focus-visible outline and selection color are coral; the
      press scale on buttons stays.
- [x] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Verified in the browser pane at 375x812 against the emulators.

## Comments

### What later tickets should use

- Dialog frame class: `.mb-dialog` in the matchbook block of `src/app/globals.css`.
  It repeats the panel's paper-bright, 1.5px navy border, 4px top rule, 4px
  radius, and shadow without the panel's flex and height, and sets navy ink and
  the body font because the dialog portals to `<body>`. `DialogContent` applies
  it; nobody else needs to.
- Red button: `mb-btn mb-btn-red` (white on `--mb-red`). `<Button variant="destructive">`
  renders exactly that. Hover, disabled, and 44px come from `.mb-btn`.
- Spinner: `InlineSpinner` from `@/components/shared` (file
  `src/components/shared/InlineSpinner.tsx`). It renders `<span class="mb-spinner" aria-hidden>`,
  a 16px ring in `currentColor`. Pattern on a busy button:
  `{isBusy ? <InlineSpinner /> : <MbIcon id="..." size={14} />}` then the label.
- Button variants left: `default` (`mb-btn mb-btn-navy`), `destructive`,
  `outline` (`mb-btn mb-btn-outline-navy`), and `ghost` (only the undo toast;
  ticket 06 deletes it). Sizes: `default` and `icon`. Deleted: secondary, link,
  soft, red-gradient, teal-gradient, playful, cta, lg, pill.
- Dialog exports: `Dialog`, `DialogContent`, `DialogDescription`,
  `DialogFooter`, `DialogHeader`, `DialogTitle`. Deleted: `DialogTrigger`,
  `DialogClose`, `DialogOverlay`, `DialogPortal` and the `showCloseButton` prop.
- Title convention: `<DialogTitle>` is already `matchbook-display`, navy, bold,
  `flex items-center gap-2`. Put the glyph first: `<MbIcon id="trash" size={18} className="shrink-0" />`.
  Do not pass `text-destructive`; a destructive dialog keeps its title navy.
- Description: `<DialogDescription>` is `text-sm text-mb-ink-muted`. Pass no color.
- Footer: `<DialogFooter>` with no className stacks the buttons full width on a
  phone (the main action on top, `flex-col-reverse`) and puts them side by side
  from `sm`. Give each button `sm:flex-1` to split the row. Drop the old
  `className="flex-row gap-2 sm:gap-2"` override and the `cursor-pointer`,
  `rounded-xl`, and `gap-2` on the buttons; `.mb-btn` has its own gap.
- Close control: `DialogContent` renders it (sprite `close`, navy, 44px, top
  right). The header has `pr-8` so a long title clears it.
- Badge: only `variant="secondary"` remains, now a navy-framed square on paper.

### What I did

Restyled `dialog.tsx`, `button.tsx`, and `badge.tsx` in place; rewrote
`DeleteConfirmDialog` to the recipe; added `InlineSpinner`; added `.mb-dialog`,
`.mb-btn-red`, `.mb-spinner` and the `mb-spin` keyframes to the matchbook block;
remapped the old token block with the legacy comment; made focus-visible and
selection coral; deleted the glass card (both rules), the playful and gradient
buttons (and the gradient rule in the reduced-motion block), both soft shadow
classes, the team and card-shadow tokens, and the sidebar maps. Added `close`
and `trash` to the sprite, `manifest.json` `iconIds`, and the `preview.html`
ids. Removed the four `shadow-soft` class names from the shared formation page
per the brief.

### Deviations and decisions

- The spec gives no target for `--secondary`, `--muted`, `--accent-foreground`,
  `--input`, or the chart tokens. Per the brief, secondary and muted went to the
  same light navy wash as accent (`rgba(7, 50, 77, 0.06)`) with navy
  foreground, input to the rule color, and the charts to navy, coral, teal,
  gold, plum. The mapping is written in the legacy comment.
- The header is left-aligned at every width (it was centered below `sm`). Every
  dialog title now leads with a glyph in a flex row, so a centered description
  under a left-aligned title would look off.
- The footer default stays `flex-col-reverse` on a phone, so the main action
  sits above Cancel. Other dialogs still pass `flex-row gap-2 sm:gap-2` and keep
  their half-and-half row until their tickets.
- The guest dialog still names `glass-card`, `border-glass-border`, and
  `btn-teal-gradient`. They are class names only, so deleting the rules breaks
  nothing; the names now style nothing. No stub needed. Ticket 05 removes them.
- `asChild` on Button and Badge has no caller but is a prop, not a variant, so I
  left it. Ticket 08 can drop it with the Slot import if it wants.
- The press scale and `.score-text` stay; ticket 04 moves the latter.
- The `[&_svg:not([class*='size-'])]:size-4` rule left the button base, so an
  `MbIcon` inside a `<Button>` keeps its `size` prop. Every lucide or
  heroicons icon still inside a button sizes itself with `w-4 h-4` or
  `w-5 h-5`, so nothing grew.
- No unit test added: this ticket has no pure-module seam (stylesheet, Radix
  primitives, one dialog), and the spec forbids rendering tests.

### For the orchestrator to check in the browser

- Not verified in the browser pane; I did not start the dev server or the
  emulators per the brief.
- Delete tournament from the Tournaments list and from a console: navy overlay,
  paper panel with the top rule, navy uppercase title with the trash glyph,
  muted description, close glyph top right at 44px, Cancel outline and Delete
  red stacked full width at 375px.
- The spinner is hard to see: the list passes no `isDeleting`, and the console
  swaps the page for `PageLoadingSpinner` as soon as the tournament leaves the
  cache. Hold `isDeleting` true in dev tools or trust the code path.
- Every other dialog opens in the new shell. Their insides keep old leftovers
  (red titles via `text-destructive`, `rounded-xl` on some buttons) for tickets
  02 to 05.
- The volleyball rotation controls' prev/next buttons are now navy outline
  circles (they pass `rounded-full`) and the two badges navy-framed squares.
  The shared formation page's four cards lost their soft shadow.
- Installed browsers see the new glyphs only after the update banner; the
  service worker precaches the sprite.
- Glyph page: `.scratch/design-consistency/glyphs/01-dialog-foundation.html`.

No new issues filed.
