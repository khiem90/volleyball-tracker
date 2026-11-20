# 05: Home shows the lists you are on

**What to build:** A signed-in person's Home lists the RSVP lists they are on,
soonest first, each with its name, scheduled time, their standing, and a mark
when a notice is new. A row opens the list's page. A list stays until 24 hours
after its scheduled time, and leaves when the person withdraws, the link goes
off, or the list is deleted. From this ticket on Home shows lists only; an RSVP
stored under a tournament no longer makes a row.

Covers spec stories 51 and 88 to 90.

**Blocked by:** 02, 04

**Status:** resolved

- [x] The pure Home rows take a "now" and keep a list until 24 hours after its scheduled time. Pure tests cover a list just inside and just outside that day, a list whose link is off, one the account is not on, and the unread-notice cases.
- [x] Home's query for the account's own RSVPs keeps only those that sit under a list. The collection-group rule and its index entry are unchanged, and a rules test still shows an account reads its own RSVPs and not another's.
- [x] Each row shows confirmed or waitlisted with the position, and links to the list's page.
- [x] A list whose reads the rules refuse is dropped from Home without failing the panel.
- [x] The panel is hidden for a guest and when the account is on no list.
- [x] A data-module test on the emulator returns an account's lists across two lists and drops one on withdrawal.

## Comments

- 2026-11-20: Built test-first on the integration branch `claude/rsvp-lists` (ticket branch tip 6a616b7). Code review fixes landed in 98e2510..46a6cd2. All acceptance boxes ticked, and the full suite (1,032 tests) passes against the emulator.
