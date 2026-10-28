# 07: Volleyball modal frames

**What to build:** The formation editor, the share dialog, and the delete
overlay on My Formations open under the navy overlay inside the matchbook
panel frame with the sprite close glyph. Everything inside them stays as it
is, since the volleyball tools' content waits for its own redesign.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Formation editor: navy overlay, paper-bright panel with 1.5px navy border,
      4px top rule, 4px radius, panel shadow, sprite close glyph at 44px. The
      editor's controls, court, arrows, and validation panel are untouched.
- [ ] Share dialog: the same frame; its fields and buttons untouched.
- [ ] My Formations delete overlay: the same frame and overlay; its two
      buttons untouched beyond what the remapped tokens already changed.
- [ ] The rotation controls and formation picker show the effect of the
      remapped tokens from ticket 01 and nothing else; no volleyball component
      outside the three modals is edited.
- [ ] Opening, closing, escape, and backdrop behavior are unchanged.
- [ ] Typecheck, lint, and the full test suite pass unchanged, including the
      volleyball suites.
- [ ] Verified in the browser pane at 375x812 on the Rotation Lab and My
      Formations.
