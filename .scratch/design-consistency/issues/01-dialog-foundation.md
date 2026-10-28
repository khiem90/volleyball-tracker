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

- [ ] The delete-tournament dialog, opened from the Tournaments list and from a
      tournament's console, matches the recipe in the spec: paper-bright panel,
      1.5px navy border with 4px top rule, 4px radius, panel shadow, navy
      overlay, navy uppercase display title, muted description, sprite close
      glyph with a 44px hit area, 44px footer buttons full width on phone.
- [ ] The title is navy, not red, and only the Delete button is red.
- [ ] A filled red button class exists with the same hover, disabled, and
      height rules as the other filled matchbook buttons.
- [ ] A small inline spinner component exists, drawn in the current text color,
      and the Delete button shows it while deleting.
- [ ] The sprite gains close and trash glyphs in its own style (24px grid, 1.8px
      stroke, round joins), shown beside the lucide and heroicons glyphs they
      replace before being committed.
- [ ] The dialog primitive sets its own paper and navy colors and the body font
      on its content element, since it portals outside the matchbook surface.
- [ ] The button primitive's default, outline, and destructive variants render
      as the matchbook navy, navy outline, and red buttons; variants, sizes,
      badge variants, and dialog exports with no importer are deleted.
- [ ] Every other dialog in the app opens in the new shell without a regression
      in its controls' 44px height.
- [ ] The old token block's values point at matchbook: background to paper,
      card and popover to paper-bright, foreground to navy, primary to navy with
      paper-bright foreground, destructive to the matchbook red, muted
      foreground to the muted ink, accent to a light navy wash, border to the
      rule color, ring to coral, base radius to 4px. The block carries a comment
      naming it volleyball-only legacy that goes with the volleyball redesign.
- [ ] The glass card, playful button, red and teal gradient button, soft shadow
      classes, the unused team blue and orange tokens, and the sidebar tokens
      are deleted, and nothing in the app referenced them except the guest
      dialog, which ticket 05 rebuilds.
- [ ] The base layer's focus-visible outline and selection color are coral; the
      press scale on buttons stays.
- [ ] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Verified in the browser pane at 375x812 against the emulators.
