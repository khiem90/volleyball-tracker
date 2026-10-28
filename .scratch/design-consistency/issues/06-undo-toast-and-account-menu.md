# 06: Undo toast and account menu

**What to build:** After an instant win on a rotation court, the undo toast is a
navy bar with paper text, a coral Undo button, and a paper X to dismiss, in
the shape of the reload banner. The account menu, already matchbook, loses its
last stray icon and opens its sign-out confirm in the restyled generic confirm.
The dropdown and avatar primitives carry matchbook defaults so the menu's
class overrides can go.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [x] The toast shows after an instant win on a Win 2 & Out or Two Match
      Rotation court as a navy bar with paper text, 44px coral Undo, 44px paper
      dismiss, a sprite check for the saved state, and the matchbook spinner
      while undoing.
- [x] The toast's timing, undo behavior, and dismissal are unchanged.
- [x] The dropdown primitive's content, item, separator, and label default to
      matchbook (paper-bright, 1.5px navy border, 4px radius, display face
      items at 44px, red item with a red wash on focus) and the account menu no
      longer overrides them.
- [x] The avatar primitive defaults to the navy border on paper-bright.
- [x] Sign out uses the sprite's logout glyph in the menu and in the confirm.
- [x] The sprite gains a logout glyph in its own style, shown beside the lucide
      glyph it replaces before being committed.
- [x] No lucide import remains in the toast or the shell components.
- [x] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Verified in the browser pane at 375x812 against the emulators: an
      instant win on a rotation court, then the menu and sign-out confirm.

## Comments

### What I did

Rewrote `UndoToast` as the reload banner's strip: `border-mb-navy bg-mb-navy
text-mb-paper-bright` with the banner's `mb-btn mb-btn-coral` Undo, plus a
4px radius and the panel shadow because it floats instead of sitting in the
flow. The saved state is the sprite's circled `check` in paper, the dismiss is
a 44px square with the `close` glyph, and `InlineSpinner` sits in the Undo
button while undoing. The motion variants, the fixed position above the tab
bar, `role="alert"`, `aria-live`, both aria-labels, the Enter and Space
handler, and the "Undo (N more)" text are as they were. `GlobalUndoToast` is
untouched.

`dropdown-menu.tsx` now defaults its content to paper-bright with the 1.5px
navy border, 4px radius, the panel shadow, navy ink, and the body font (it
portals to `<body>`); items are `matchbook-display` rows at 44px with the 6%
navy wash on focus, and `variant="destructive"` gives the red text with the
red wash; the separator is the rule color and the label `px-3 py-2`. The nine
exports nobody imported (portal, group, checkbox item, radio group and item,
shortcut, sub, sub trigger, sub content) are gone, which took the file's
three lucide icons with them. `avatar.tsx` defaults to a 36px navy ring on
paper-bright with the initial in the display face. `AccountMenu` keeps only
`align="end"` and `w-64` on the content and `variant="destructive"` on the
item; its Sign out row and the confirm both use the new `logout` glyph.
Deleted the `ghost` button variant; nothing imports it after the toast
rewrite. Added `logout` to the sprite, `manifest.json` `iconIds`, and the
`preview.html` ids.

### Deviations and decisions

- The `logout` glyph is the mirror of the sprite's `login` (door on the left,
  arrow out to the right), so the pair reads as one drawing. Lucide's door has
  rounded corners; the sprite's does not.
- The toast has no undo arrow. The ticket names no glyph for the Undo button,
  the `undo` glyph belongs to ticket 04 running in parallel, and the coral
  button already says Undo. The spinner replaces nothing; it appears before
  the label while undoing.
- The avatar's default size is now 36px (`size-9`), the only size in use, so
  the menu passes no class at all. The 32px shadcn default had no caller.
- The dropdown content's `max-w-[calc(100vw-2rem)]` moved into the default;
  `w-64` stays at the call site since width is the menu's own choice. The
  trigger keeps its classes: the trigger primitive never had styles of its own
  and the ticket lists content, item, separator, and label.
- The `inset` prop on item and label went with the unused exports; no caller
  passed it.
- No unit test added: the ticket is a restyle with no pure-module seam, and
  the spec forbids rendering tests. The existing suites pass unchanged.

### For the orchestrator to check in the browser

- Not verified in the browser pane; I did not start the dev server or the
  emulators per the brief.
- In a Win 2 & Out or Two Match Rotation console with instant win on, tap a
  team's win button on the Courts tab: a navy bar above the tab bar with the
  circled check, "<team> won", a coral Undo, and a paper X. Tap Undo and look
  for the spinner in the button; tap X to clear. Ctrl+Z still undoes.
- Open the account menu: paper-bright panel with the navy frame, "Signed in
  as" kicker, the rule-color separator, Sign out in red with the logout glyph,
  red wash on hover or focus. The avatar ring is unchanged.
- The sign-out confirm opens only when sign-out is refused over unsynced
  changes (go offline, change something, then Sign out): logout glyph in the
  navy title and on the red "Sign out anyway" button.
- The toast and the menu render outside `.matchbook-surface`, so both pass
  `font-sans` themselves; with the font bug in issue 09 they show the system
  sans like the rest of the app.
- Installed browsers see the new glyph only after the update banner; the
  service worker precaches the sprite.
- Glyph page: `C:\Users\khiem\AppData\Local\Temp\claude\C--Dev-Tournament-Tracker\718bee3b-cf00-40de-9132-9a9163eeed1b\scratchpad\glyphs\06-undo-toast-and-account-menu.html`.

No new issues filed.
