# 01: Scheduled time and RSVP settings on a tournament

**What to build:** The owner describes the night before anyone can answer. On
the creation page, under advanced settings, an RSVP section takes a toggle, a
capacity, a scheduled date and time, and an open date and time, entered in the
owner's own zone. In the console, a new RSVP tab shows the same settings and
lets the owner change them while the tournament is a draft or live, and shows
the RSVP link with Copy next to the spectator and scorer links in Settings. The
toggle refuses to go on without both times. Duplicate carries the capacity only.
Nobody can RSVP yet; this ticket makes the night describable and the link
shareable.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A tournament has an optional `scheduledAt` (epoch milliseconds) with its `scheduledZone` (IANA), and an optional `rsvp` map of `enabled`, `capacity`, `opensAt`, and `closed`; a tournament from before this ticket has neither and behaves as if the link were off.
- [x] The creation page's RSVP section sets all of them with the browser's native date-time input styled in the matchbook field classes; the setup problems cover a missing scheduled time, a missing open time, an open time after the scheduled time, and a capacity below one, and the existing first-problem line shows them.
- [x] The console RSVP tab is shown to the owner while the tournament is a draft or live (console access gains `canManageRsvp`, pinned in the console tests) and edits every setting through the same revision-carrying field write a rename uses.
- [x] Settings shows the RSVP link with Copy; the pure link helper has a test beside the spectator and scorer link tests.
- [x] The rules accept these fields from the owner only, refuse `enabled` true without both `scheduledAt` and `opensAt`, and keep them out of the scorer's allowed keys; rules tests cover the owner, a scorer, and the missing-times refusal.
- [x] Duplicate copies `capacity`, starts with `enabled` false and no times, and the duplicate test says so.
- [x] Times display in the viewer's zone, with the owner's wall-clock time and zone abbreviation beside them when the zones differ.
- [x] The README's data layout describes the new tournament fields.

## Comments

- 2026-10-28: Implemented test-first on the integration branch `claude/rsvp` (0d2152b, 3cd2db5). Code-review fixes landed in 1c65ff8..f4ca321. All acceptance boxes ticked, and the full suite (783 tests) passes against the emulator.
