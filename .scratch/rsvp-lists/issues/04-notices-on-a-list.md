# 04: Notices on a list

**What to build:** The owner posts a notice on a list and everyone who can see
the RSVP page reads it there, newest first. The owner can delete a notice
posted by mistake, and can still post after the scheduled time has passed.
Opening the page records, on the viewer's own RSVP, that they have seen the
notices, which ticket 05 uses to mark a new one on Home.

Covers spec stories 49, 50, 52 to 54.

**Blocked by:** 02

**Status:** resolved

- [x] Notices are stored under the list with the body and the server's posting time.
- [x] The rules let only the owner post or delete a notice, at any time, with a body of one to five hundred characters and the server's time. Whoever can read the RSVPs can read the notices. Rules tests cover the owner, a person on the list, an account with the link off, and a post after the scheduled time.
- [x] The rules let an account record the notices-read time on its own RSVP, as the server's time and nothing else. A rules test covers its own RSVP and someone else's.
- [x] The list's page shows the notices newest first to everyone, and the compose box and Delete to the owner.
- [x] Opening the page records the read time for a viewer who has an RSVP.
- [x] Deleting a list removes its notices in the same cleanup batch as its RSVPs.
- [x] A data-module test on the emulator posts, reads as a person on the list, deletes, and marks read.

## Comments

- 2026-11-20: Built test-first on the integration branch `claude/rsvp-lists` (ticket branch tip 0102a01). Code review fixes landed in 98e2510..46a6cd2. All acceptance boxes ticked, and the full suite (1,032 tests) passes against the emulator. The criterion about deleting a list's notices landed with ticket 03's delete (4b4dd54).
