# 05: Notices

**What to build:** When something changes, the owner posts a notice from the
console's RSVP tab, and deletes one posted by mistake. Everyone who opens the
RSVP page, confirmed or waitlisted, sees the notices newest first. Opening the
page records that the viewer has seen them, so a later ticket can mark unread
ones on Home.

**Blocked by:** 02

**Status:** resolved

- [x] Notices live in a `notices` subcollection under the tournament with `body` and a server-written `createdAt`; only the owner creates or deletes them, and whoever can read the RSVPs can read them; rules tests cover the owner, another account, a signed-out request, and the anonymous identity.
- [x] The console RSVP tab has a compose box and Delete on each notice; a notice body is one to five hundred characters.
- [x] The RSVP page shows notices newest first above the lists.
- [x] An RSVP gains `noticesReadAt`, written by its own account and nobody else (rules test), and the page writes it on open for a viewer who has an RSVP.
- [x] Deleting a tournament removes its notices in the cleanup batch; the existing delete test covers it.
- [x] The README's data layout lists the `notices` path.

## Comments

- 2026-10-28: Implemented test-first on the integration branch `claude/rsvp` (62dead9, a6f3620). Code-review fixes landed in 1c65ff8..f4ca321. All acceptance boxes ticked, and the full suite (783 tests) passes against the emulator.
