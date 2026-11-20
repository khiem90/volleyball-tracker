# 03: The owner manages a list

**What to build:** On the list's page the owner removes anyone, adds a held
spot by name, closes the list and reopens it until the scheduled time, raises
capacity and watches the waitlist move up, duplicates the list for next week,
and deletes it. The settings guard the people already on the list: capacity
cannot drop below the confirmed count, the open time locks at the first RSVP,
and nothing changes once the list is over. Deleting asks first and names how
many are on the list.

Covers spec stories 9, 10, 39 to 48.

**Blocked by:** 02

**Status:** resolved

- [x] The owner removes any RSVP, a held spot included, at any time, and the next on the waitlist is confirmed with no further write. A rules test covers the owner and a non-owner.
- [x] The owner adds a held spot by name before the scheduled time, or on a list with no scheduled time yet. It takes its place in arrival order and nobody can update it. Rules tests cover the owner, anyone else, and after the scheduled time.
- [x] Close stops new RSVPs and leaves withdrawals working. Reopen lets them in again and is refused by the client once the list is over. A data-module test covers close, a withdrawal after it, and reopen.
- [x] The pure setup problems gain: capacity below the confirmed count, an open time changed after the first RSVP, and any settings change on a list that is over. Pure tests cover each.
- [x] The page shows the owner Remove on each row, Add held spot, and Close or Reopen, and hides them once the list is over.
- [x] Duplicate makes a new list with the same by-person or by-team choice and capacity, named the way a duplicated tournament is, with no times, nobody on it, and the link off. A data-module test covers it.
- [x] Delete removes the list with its RSVPs in one cleanup batch, after a confirmation that names the headcount when it is not zero. A data-module test covers it.

## Comments

- 2026-11-20: Built test-first on the integration branch `claude/rsvp-lists` (ticket branch tip 4b4dd54). Code review fixes landed in 98e2510..46a6cd2. All acceptance boxes ticked, and the full suite (1,032 tests) passes against the emulator. Beyond the ticket, the rules also refuse a name or note change on an RSVP once the scheduled time has passed.
