# 05: Guest match complete

**What to build:** When a guest finishes a quick match, the result dialog is a
matchbook panel: navy title with the trophy glyph, the winner and score on
paper-bright inside the navy frame, the sign-in offer as plain navy copy with
sprite glyphs for its points, a filled navy sign-in button and a navy outline
play-again button. It opens with the standard dialog fade. The glass card, the
amber gradient header, the emerald winner box, the teal gradient button, and
the motion entrance are gone.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Same information as today: winner, final score, the three sign-in
      benefits, sign in, and play again. Same destinations for both buttons.
- [x] Matches the dialog recipe: paper panel, navy frame, navy overlay, navy
      uppercase title, muted body, 44px buttons full width on phone.
- [x] The winner box uses the matchbook green on paper-bright with a navy
      border, not an emerald fill.
- [x] Benefit icons come from the sprite, reusing history, teams, and chart
      where they fit.
- [x] No motion-library import remains in this dialog; the library stays in
      the app for the scoring page and volleyball.
- [x] No heroicons import remains in this dialog.
- [x] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Verified in the browser pane at 375x812 as a guest finishing a quick
      match.

## Comments

### What I did

Rewrote `src/components/GuestMatchComplete.tsx` on the ticket 01 dialog
primitive. The frame, overlay, close glyph, and fade come from `DialogContent`;
the file adds nothing to the stylesheet and touches no other file.

- Title: `<DialogTitle>` with the `compete` glyph at 18px, then "Match
  Complete!". Description unchanged, in the muted ink.
- Final score: one block with a 1.5px navy border and 4px radius on
  paper-bright. Each side is a 56px square chip in the team color with a navy
  border and no shadow, the team name in the muted ink, and the score in the
  display face in navy. The colon between them is in the muted ink.
- Winner: paper-bright, 1.5px navy border, 4px radius, "Winner" as an
  `mb-kicker`, the name in the display face in `text-mb-green`.
- Sign-in offer: no box. "Sign in to unlock more features:" in navy, then a
  two-column list of the four benefits in navy with sprite glyphs at 14px:
  `teams` Custom Teams, `compete` Tournaments, `history` Match History, `chart`
  Statistics.
- Footer: the default `DialogFooter` (stacked full width on a phone, main
  action on top, side by side from `sm`). Play again is
  `<Button variant="outline">` with the `quick` glyph and still calls
  `onPlayAgain`. Sign In for More is a `<Link>` carrying
  `mb-btn mb-btn-navy` with the `login` glyph and still goes to
  `signInHref("/quick-match")`.
- Gone: the `framer-motion` import and its three `motion.div`s, all six
  heroicons imports, `glass-card`, `border-glass-border`, `btn-teal-gradient`,
  the amber gradient trophy tile, the emerald winner box, the `bg-primary/5`
  offer box, every `rounded-xl`/`rounded-2xl`, and the colored drop shadows on
  the chips.

### Deviations and decisions

- Four benefits, not three. The ticket text says three; the dialog lists four
  today and the brief says keep the same information, so all four stay.
- The trophy glyph is `compete`. Ticket 04 is drawing `trophy` in parallel, so
  to keep the sprite free of a conflict this dialog uses the existing trophy
  cup, which the spec allows where it reads better. The orchestrator can swap
  the title id to `trophy` after ticket 04 merges if it prefers; it is one
  string.
- Play again carries the `quick` glyph (the quick-match bolt). The spec's
  `undo` and `play` glyphs belong to other tickets and I drew nothing, and the
  bolt is the icon of the flow the button restarts.
- The sign-in button is a `<Link className="mb-btn mb-btn-navy">` rather than
  a `<Link>` wrapping a `<Button>`, the same pattern as the sign-in link on the
  Quick Match page. The old markup nested a button inside an anchor; the new
  one is a single anchor, so the destination and the tap target are the same
  element. Same href as before.
- The button roles swap as the spec asks: sign in is now the filled navy main
  action and play again the navy outline. Today play again was the filled
  (teal gradient) one.
- The team color fallbacks (`#3b82f6`, `#f97316`) in the component stay as
  they were; they are the colors a team without one gets, not a style token.
- The header is left-aligned like every other dialog now (it was centered with
  a trophy tile above it).
- No unit test added: the dialog has no pure-module seam and the spec forbids
  rendering tests.
- Verification: the shared `node_modules` in the main checkout was missing
  `.bin`, `@esbuild/win32-x64`, `@eslint-community/eslint-utils`,
  `@ducanh2912/next-pwa`, and firebase's type exports on my first run, so I
  reported it to the orchestrator rather than run `npm install`. After the
  install was restored: tsc 0 errors, eslint 0 errors and the baseline 10
  warnings, vitest 429 passed and 104 skipped.

### For the orchestrator to check in the browser

- Not verified in the browser pane; I did not start the dev server or the
  emulators per the brief.
- Quick Match as a guest, play to the end, confirm the result: navy overlay,
  paper panel with the top rule, navy uppercase title with the trophy cup,
  muted description, close glyph top right.
- The score block and winner block both have the navy border on paper-bright;
  the winner name is green; the chips are squares with a navy border and no
  glow.
- At 375px the two buttons stack full width with Sign In for More on top and
  Play again under it; from `sm` they sit side by side, half each.
- Sign In for More lands on `/login?redirect=%2Fquick-match`; Play again
  resets the match.
- Installed browsers see sprite glyphs only after the update banner; the
  service worker precaches the sprite. This dialog adds no glyphs, so nothing
  new to wait for here.

No new issues filed. No glyph page: no glyphs drawn.
