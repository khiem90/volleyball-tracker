# 06: App shell: tab bar and page headers

**What to build:** The owner sees the new tab bar and the new page header on
every screen inside the shell. The tab bar is a white bar with the same five
tabs in the same order. The active tab has ink text and a filled icon, and the
others are in the soft ink. A top-level page opens with a white header block:
the wordmark, the account button, the page's title, and room for the page's
main action. A page one level down shows a back link in place of the wordmark
row. Desktop keeps today's shell structure and breakpoints in the new tokens.

The shell's files are the first to leave the old theme's names, and its folder
is the first entry in the guard's list of migrated folders.

Covers spec stories 1, 5, 8, 72, and 78.

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [x] The tab bar shows Home, Teams, Tournaments, History, and RSVP in that order, with the same routes and the same rule for which tabs need an account.
- [x] The active tab uses the filled glyph and ink text. Inactive tabs use ink-soft, which passes 4.5 to 1 on the bar.
- [x] The header block is a shared piece that takes a title, an optional line beside the title, an optional main action, and an optional back link.
- [x] The account button and its menu use the pieces from tickets 04 and 05.
- [x] The desktop shell has the same structure and breakpoints as today, drawn with the role tokens.
- [x] The tab bar respects the device's bottom safe area, and the header respects the top one.
- [x] The shell's files contain no old-theme name, and the shell's folder is on the guard's list of migrated folders.
- [x] The shell tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [x] The design-system document describes the tab bar and the header block.

## Comments

- No page uses `PageHeader` yet. Each screen ticket swaps its own masthead for it, so until then a page shows the white top bar over its old masthead on the ground.
- On a phone, a page that passes `back` has no brand row and so no account button. That is the spec's layout. The account button is one tap back.
- Nothing here was looked at in a browser.
