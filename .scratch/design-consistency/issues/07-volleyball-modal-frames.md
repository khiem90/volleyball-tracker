# 07: Volleyball modal frames

**What to build:** The formation editor, the share dialog, and the delete
overlay on My Formations open under the navy overlay inside the matchbook
panel frame with the sprite close glyph. Everything inside them stays as it
is, since the volleyball tools' content waits for its own redesign.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Formation editor: navy overlay, paper-bright panel with 1.5px navy border,
      4px top rule, 4px radius, panel shadow, sprite close glyph at 44px. The
      editor's controls, court, arrows, and validation panel are untouched.
- [x] Share dialog: the same frame; its fields and buttons untouched.
- [x] My Formations delete overlay: the same frame and overlay; its two
      buttons untouched beyond what the remapped tokens already changed.
- [x] The rotation controls and formation picker show the effect of the
      remapped tokens from ticket 01 and nothing else; no volleyball component
      outside the three modals is edited.
- [x] Opening, closing, escape, and backdrop behavior are unchanged.
- [x] Typecheck, lint, and the full test suite pass unchanged, including the
      volleyball suites.
- [ ] Verified in the browser pane at 375x812 on the Rotation Lab and My
      Formations.

## Comments

### What I did

Three files, nothing else: `src/components/volleyball/FormationEditorModal.tsx`,
`src/components/volleyball/ShareFormationDialog.tsx`, and the delete overlay in
`src/app/(shell)/tools/volleyball-rotations/my-formations/page.tsx`.

- Overlay: `bg-black/50 backdrop-blur-sm` became `bg-mb-navy/55` on the editor
  and the share dialog, the same overlay `DialogContent` draws. The delete
  overlay's `bg-red-500/10 backdrop-blur-sm` became the same navy; it keeps
  its `rounded-xl` so it still follows the card's corners.
- Frame: `bg-background rounded-2xl shadow-2xl` on both modal panels and
  `bg-background rounded-lg shadow-lg` on the delete panel became `mb-dialog`
  (paper-bright, 1.5px navy border, 4px top rule, 4px radius, panel shadow).
  No new class; nothing in `globals.css` changed.
- Close control: the inline X `<svg>` in the editor and the share dialog is now
  `<MbIcon id="close" size={20} />`. The button stays `size-11` (44px) with
  its `aria-label`; its `rounded-lg hover:bg-accent` became the dialog's
  `rounded-[4px] text-mb-navy hover:bg-mb-navy/6` so the control matches the
  one in `DialogContent`.
- Everything inside the three frames is as it was: the editor's header, draft
  prompt, sidebar, court, validation panel, and footer; the share dialog's
  fields and buttons; the delete overlay's question and two buttons.

### Deviations and decisions

- The backdrop blur went with the black overlay. The matchbook overlay in
  `DialogContent` has none, and keeping it would have left these three as the
  only blurred overlays in the app.
- The delete overlay gets no close glyph. The ticket text reads "the same
  frame and overlay", and the brief says it has no close control today and
  gains no behavior. Cancel remains its only dismissal.
- No unit test added: the ticket has no pure-module seam (three class strings
  and one icon swap), and the spec forbids rendering tests.
- The modals never closed on Escape and still do not; backdrop click and body
  scroll lock are untouched. The editor still unmounts before its exit
  animation can play, as before.

### Verification status

- `npx tsc --noEmit` clean; `npx eslint` 0 errors, 10 warnings (the
  baseline); `npx vitest run` 429 passed, 104 skipped (the baseline), the
  five volleyball suites among the passes. The checks ran after the
  orchestrator restored the main checkout's `node_modules`, which was
  partially wiped when the worktrees were created.
- Not verified in the browser pane; I did not start the dev server or the
  emulators per the brief.

### For the orchestrator to check in the browser

- Rotation Lab at 375x812: open the formation editor (navy overlay, paper
  panel with the 4px top rule, navy close glyph top right, 44px hit area) and
  the share dialog (same). Backdrop tap still closes both; Escape still does
  nothing. The editor still prompts to resume a draft.
- My Formations: tap a card's delete. The card goes under the navy overlay
  with the paper panel on it; Cancel and Delete work as before, and the
  overlay still clears on its own after 3 seconds.
- The rotation controls and the formation picker show only ticket 01's
  remapped tokens (navy outline circles on prev/next, navy-framed badges).
- Installed browsers see the `close` glyph only after the update banner; the
  service worker precaches the sprite.

No new issues filed.
