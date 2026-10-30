# 07: Home lists the nights you are in

**What to build:** Home gains a panel, between Live tournaments and Recent
results, of the upcoming tournaments the signed-in account has RSVP'd to: name,
scheduled time, whether the account is in or waiting at what position, and a
"New notice" mark when a notice arrived after the account last opened the page.
Each row opens the RSVP page. Tournaments the account withdrew from and
completed tournaments are not listed. A guest sees nothing.

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] A collection-group rule lets a signed-in account read any RSVP whose `uid` is its own and refuses another account's; rules tests cover both.
- [ ] The indexes file gains the collection-group entry for `rsvps` by `uid`, and the deploy doc says to deploy it.
- [ ] The data layer subscribes to the account's RSVPs across tournaments and to the tournaments they point at; an emulator test shows two tournaments listed and one dropped on withdrawal.
- [ ] A pure function builds the Home rows from the account's RSVPs, their tournaments, their lists, and their notices, excluding completed tournaments and flagging unread notices; tests cover each case in the style of the existing Home tests.
- [ ] The panel is hidden when there are no rows and for a guest, and each row links to the RSVP page.
