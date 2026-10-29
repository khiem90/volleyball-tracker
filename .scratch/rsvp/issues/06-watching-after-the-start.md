# 06: Watching after the start

**What to build:** Once the tournament is live, the RSVP page keeps its header
and shows a Watch button into the console, where the person sees the tournament
as a spectator would, with the Spectator badge, without the owner turning on a
spectator link. A completed tournament's RSVP page says so and keeps its list
read-only.

**Blocked by:** 02

**Status:** resolved

- [x] The rules let a signed-in account read a tournament's matches while `rsvp.enabled` is true, alongside the owner, spectator, and scorer doors; rules tests cover the accept and the refusals for signed-out and anonymous.
- [x] The console page accepts an RSVP-link holder as a spectator: the link shell shows the Spectator badge and no controls, and the console tests pin the role.
- [x] The RSVP page shows Watch while the tournament is live and "Completed" with the list read-only once it ends; the page state function covers both.
- [x] Turning the RSVP link off while someone is watching ends their view the way turning the spectator link off does.

## Comments

- 2026-10-28: Implemented test-first on the integration branch `claude/rsvp` (72621c5, 50984bb). Code-review fixes landed in 1c65ff8..f4ca321. All acceptance boxes ticked, and the full suite (783 tests) passes against the emulator.
