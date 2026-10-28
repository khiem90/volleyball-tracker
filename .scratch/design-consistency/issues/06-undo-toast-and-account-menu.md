# 06: Undo toast and account menu

**What to build:** After an instant win on a rotation court, the undo toast is a
navy bar with paper text, a coral Undo button, and a paper X to dismiss, in
the shape of the reload banner. The account menu, already matchbook, loses its
last stray icon and opens its sign-out confirm in the restyled generic confirm.
The dropdown and avatar primitives carry matchbook defaults so the menu's
class overrides can go.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] The toast shows after an instant win on a Win 2 & Out or Two Match
      Rotation court as a navy bar with paper text, 44px coral Undo, 44px paper
      dismiss, a sprite check for the saved state, and the matchbook spinner
      while undoing.
- [ ] The toast's timing, undo behavior, and dismissal are unchanged.
- [ ] The dropdown primitive's content, item, separator, and label default to
      matchbook (paper-bright, 1.5px navy border, 4px radius, display face
      items at 44px, red item with a red wash on focus) and the account menu no
      longer overrides them.
- [ ] The avatar primitive defaults to the navy border on paper-bright.
- [ ] Sign out uses the sprite's logout glyph in the menu and in the confirm.
- [ ] The sprite gains a logout glyph in its own style, shown beside the lucide
      glyph it replaces before being committed.
- [ ] No lucide import remains in the toast or the shell components.
- [ ] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Verified in the browser pane at 375x812 against the emulators: an
      instant win on a rotation court, then the menu and sign-out confirm.
