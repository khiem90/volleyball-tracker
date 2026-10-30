# 07: Home lists the nights you are in

**What to build:** Home gains a panel, between Live tournaments and Recent
results, of the upcoming tournaments the signed-in account has RSVP'd to: name,
scheduled time, whether the account is in or waiting at what position, and a
"New notice" mark when a notice arrived after the account last opened the page.
Each row opens the RSVP page. Tournaments the account withdrew from and
completed tournaments are not listed. A guest sees nothing.

**Blocked by:** 03, 05

**Status:** resolved

- [x] A collection-group rule lets a signed-in account read any RSVP whose `uid` is its own and refuses another account's; rules tests cover both.
- [x] The indexes file gains the collection-group entry for `rsvps` by `uid`, and the deploy doc says to deploy it.
- [x] The data layer subscribes to the account's RSVPs across tournaments and to the tournaments they point at; an emulator test shows two tournaments listed and one dropped on withdrawal.
- [x] A pure function builds the Home rows from the account's RSVPs, their tournaments, their lists, and their notices, excluding completed tournaments and flagging unread notices; tests cover each case in the style of the existing Home tests.
- [x] The panel is hidden when there are no rows and for a guest, and each row links to the RSVP page.

## Comments

- 2026-10-28: Implemented test-first on the integration branch `claude/rsvp` (eb32201, 34d1e76). Code-review fixes landed in 1c65ff8..f4ca321. All acceptance boxes ticked, and the full suite (783 tests) passes against the emulator.
