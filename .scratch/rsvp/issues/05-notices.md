# 05: Notices

**What to build:** When something changes, the owner posts a notice from the
console's RSVP tab, and deletes one posted by mistake. Everyone who opens the
RSVP page, confirmed or waitlisted, sees the notices newest first. Opening the
page records that the viewer has seen them, so a later ticket can mark unread
ones on Home.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Notices live in a `notices` subcollection under the tournament with `body` and a server-written `createdAt`; only the owner creates or deletes them, and whoever can read the RSVPs can read them; rules tests cover the owner, another account, a signed-out request, and the anonymous identity.
- [ ] The console RSVP tab has a compose box and Delete on each notice; a notice body is one to five hundred characters.
- [ ] The RSVP page shows notices newest first above the lists.
- [ ] An RSVP gains `noticesReadAt`, written by its own account and nobody else (rules test), and the page writes it on open for a viewer who has an RSVP.
- [ ] Deleting a tournament removes its notices in the cleanup batch; the existing delete test covers it.
- [ ] The README's data layout lists the `notices` path.
