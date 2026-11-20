# 09: Watch an imported tournament from the RSVP page

**What to build:** Once a tournament imported from a list is live, anyone who
can open the list's RSVP page can watch it. The page shows one row per imported
tournament the viewer can read: Watch for a live one and See results for a
completed one. The console takes that account as a spectator. A draft stays
with its owner, so nobody sees teams that are still being arranged. Deleting a
list leaves its tournaments as they are; they only lose this way in.

Covers spec stories 48 and 85 to 87.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] The rules let a real account read a tournament and its matches when the tournament names a list, that list's link is on, and the tournament is live or completed. Rules tests cover a live one, a completed one, a draft, a tournament with no list, a list with the link off, a deleted list, and an anonymous identity.
- [ ] The spectator link, the scorer link, and the owner's access are unchanged, and their existing rules tests pass.
- [ ] The RSVP page reads each tournament the list records by id, and leaves out one it cannot read or one that was deleted, without failing the page.
- [ ] A pure function turns the list's readable tournaments into rows with Watch or See results, and nothing for a draft. Pure tests cover each status and an empty list.
- [ ] Opening a row lands in the console with the Spectator badge.
- [ ] A data-module test on the emulator shows a person on the list is refused the tournament while it is a draft and reads it once it starts.
- [ ] A data-module test shows deleting a list leaves the imported tournament readable by its owner.
