# 05: Dialogs, menus, toasts, and banners

**What to build:** Every dialog in the app opens as a centered white card with
rounded corners, a sentence-case title, and pill buttons in its footer. A
destructive dialog's confirm button is filled red. Dropdown menus, the undo
toast, the reload banner, avatars, and badges take the new look too. The owner
sees this on every dialog and menu at once, because the shared dialog recipe
and the shared menu are restyled in place.

Dialogs stay centered and keep their structure, their focus handling, and
their copy. Only their look changes.

Covers spec stories 16, 55, 68, 69, and 70.

**Blocked by:** 04

**Status:** ready-for-agent

- [x] The dialog panel is a surface with a 14px radius over a dimmed overlay. Its title is in sentence case at the card-title size, and its close control is a 44px target.
- [x] Footer buttons are the shared buttons from ticket 04. A destructive confirm uses the red button and its title stays ink.
- [x] Every dialog that confirms, corrects, ends, starts, deletes, or edits something shows the new panel with its copy unchanged. This covers deleting and ending a tournament, starting one, a correction, withdrawing a team, a mixed team, deleting and editing teams, an RSVP, match complete, and sign out.
- [x] Focus is trapped in an open dialog and returns to the control that opened it, as today.
- [x] Dropdown menus are surface cards with a 10px radius, 44px items, and a red item style for destructive entries.
- [x] The undo toast and the reload banner use ink as their ground with a green action, and sit clear of the tab bar.
- [x] Avatars and badges use the role tokens.
- [x] The design-system document carries the new dialog recipe and the menu and toast rules.
- [x] The 56 test files outside the design folder pass unedited. Lint and the type checker are clean.

## Comments

- Nothing here was looked at in a browser. The merger checks a dialog, the account menu, and the undo toast at 390px and 1280px.
- The reload banner already draws ink with a green button through the old names. Its file belongs to ticket 06, which adds the `ink-bar` class there so the button's focus ring shows white.
- The inside of a dialog (the color squares in the team form, the score box in match complete) still has the old 4px boxes. Each screen ticket restyles its own.
