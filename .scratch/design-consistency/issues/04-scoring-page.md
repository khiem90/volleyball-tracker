# 04: Scoring page

**What to build:** On the scoring page an owner or scorer sees sprite icons in
the header, the fullscreen control bar, and the team-color panels, a fullscreen
bar with the same square corners as every other matchbook control, and a
match-complete confirm in the matchbook design. The team-color panels keep
their full-bleed look exactly, apart from their icons.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Header: back, flag, fullscreen, and undo use sprite glyphs.
- [x] Fullscreen bar: flag, exit fullscreen, and undo use sprite glyphs; the
      bar has a 4px radius and the panel shadow.
- [x] Team panels: crown, minus, and plus come from the sprite; their colors,
      blobs, pill, and typography are otherwise unchanged.
- [x] The legacy score-text rule moves into the components layer under a
      matchbook name and the panels use it.
- [x] Match complete: navy title with the trophy glyph, team color chips as
      navy-bordered squares without shadows, the winner line in navy with the
      muted ink for detail, filled navy Confirm, navy outline Cancel, spinner
      while saving. Verified on both the signed-in and the guest scoring pages.
- [x] The match page's loading state uses the matchbook spinner.
- [x] The sprite gains chevron-left, flag, maximize, minimize, undo, crown,
      minus, and trophy glyphs in its own style, shown beside the lucide
      glyphs they replace before being committed.
- [x] No lucide import remains in the match components or pages.
- [x] 44px controls, both orientations, wake lock, and fullscreen behave as
      before.
- [x] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Verified in the browser pane at 375x812 and in landscape against the
      emulators.

## Comments

### What I did

- Sprite: added `chevron-left`, `flag`, `maximize`, `minimize`, `undo`,
  `crown`, `minus`, and `trophy` before the closing tag, one symbol per line,
  1.8px stroke with round caps and joins (`chevron-left` and `minus` at 2px to
  sit beside the existing `chevron-right` and `plus`). Added the eight ids to
  `manifest.json` `iconIds` and the `preview.html` catalog.
- `ScoringHeader`: Back uses `chevron-left` at 20px (lucide was `h-5 w-5`);
  Fullscreen, Undo, and End use `maximize`, `undo`, and `flag` at 16px.
- `FullscreenControls`: `undo`, `flag`, `minimize` at 16px; the bar's
  `rounded-lg shadow-lg` became `rounded-[4px]` and the panel's literal shadow
  `shadow-[0_8px_22px_rgba(57,41,23,0.08)]`. Nothing else on the bar changed.
- `TeamScorePanel`: `crown` at 16px with `text-amber-200` on the glyph itself,
  `minus` and `plus` at 24px inside the unchanged 56px round buttons. The
  score span's `score-text` became `mb-score-text`. Gradient, blobs, pill,
  type, and the whole-panel button are untouched.
- `globals.css`: deleted the unlayered `.score-text` block and added
  `.mb-score-text` in `@layer components` beside `.mb-score-box`, same
  shadow (`rgba(0, 0, 0, 0.1)` in place of `oklch(0 0 0 / 0.1)`, the same
  color).
- `MatchCompleteDialog`: rebuilt on ticket 01's recipe. Title leads with
  `trophy` at 18px; description untouched; the score block is a paper box with
  the rule border and 4px radius; each chip is a 48px square with the 4px
  radius and the 1.5px navy border, no shadow; names in the muted ink, scores
  and the winner's name in navy display type, the "Winner" label in muted ink;
  the error in `text-mb-red`. Footer: `Keep playing` as the navy outline,
  `Confirm result` / `Confirm game` filled navy with `InlineSpinner` while
  `isBusy`. One component serves the signed-in and guest pages, so both get it.
- `app/match/[id]/page.tsx`: the loading state renders `PageLoadingSpinner`
  inside the paper `Frame` instead of lucide `Loader2`.
- No lucide import remains under `src/components/match` or `src/app/match`.

### Deviations and decisions

- Trophy: `compete` is already a trophy cup, and the spec allows reusing it.
  The ticket lists `trophy` among the glyphs to add, so I drew it as a sibling
  (rounder cup, short stem, plinth) and the dialog uses it. Swapping the
  dialog to `compete` is a one-word change if the two look too alike on the
  glyph page.
- "Square" chips carry the design's 4px radius, the same as ticket 01's badge,
  rather than 0.
- The chip block's old `bg-accent/20` had no named target; it is now paper
  (`bg-mb-paper`) with the rule border, so the chips sit on a surface distinct
  from the paper-bright dialog.
- The footer uses ticket 01's default (stacked full width on a phone, main
  action on top; side by side from `sm`) instead of the old half-and-half row.
- The loading ring is the matchbook page spinner (coral, 32px) rather than the
  navy lucide spinner, since that is the one spinner the design has at page
  size. It sits in the spinner's 60vh box inside the full-height frame, so it
  stays centered.
- No unit test added: there is no pure-module seam here (sprite, class swaps,
  one dialog), and the spec forbids rendering tests. Existing suites pass at
  the baseline.
- `node_modules` was briefly wiped by something outside this worktree during
  verification; the orchestrator restored it and the three checks were re-run
  clean after that.

### For the orchestrator to check in the browser

- Not verified in the browser pane; I did not start the dev server or the
  emulators per the brief. The last checkbox stays unticked.
- Signed-in scoring page at 375x812: header back chevron at 20px in its 44px
  outline button; `maximize`, `undo`, `flag` at 16px; the Leading / Winner
  pill with an amber crown on both team colors; minus and plus in the 56px
  round buttons; the score still carries its soft shadow.
- Landscape: panels side by side, safe-area insets, nothing moved.
- Fullscreen: the bar at the bottom has 4px corners and the soft brown shadow,
  with `undo`, `flag`, and `minimize`; Exit still leaves fullscreen; wake lock
  code untouched.
- Tap End: navy overlay, paper panel with the trophy title, chips as navy
  squares, winner in navy, Keep playing above Confirm at phone width, spinner
  on Confirm while `isCompleting`.
- Guest quick match: the same confirm, then ticket 05's dialog behind it.
- The match page while its tournaments load: a coral ring centered on paper.
- Installed browsers see the new glyphs only after the update banner; the
  service worker precaches the sprite.
- Glyph page: `.scratch/design-consistency/glyphs/04-scoring-page.html`.

No new issues filed.
