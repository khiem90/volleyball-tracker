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

- [ ] Same information as today: winner, final score, the three sign-in
      benefits, sign in, and play again. Same destinations for both buttons.
- [ ] Matches the dialog recipe: paper panel, navy frame, navy overlay, navy
      uppercase title, muted body, 44px buttons full width on phone.
- [ ] The winner box uses the matchbook green on paper-bright with a navy
      border, not an emerald fill.
- [ ] Benefit icons come from the sprite, reusing history, teams, and chart
      where they fit.
- [ ] No motion-library import remains in this dialog; the library stays in
      the app for the scoring page and volleyball.
- [ ] No heroicons import remains in this dialog.
- [ ] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Verified in the browser pane at 375x812 as a guest finishing a quick
      match.
