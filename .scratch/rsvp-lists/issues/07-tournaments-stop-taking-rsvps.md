# 07: Tournaments stop taking RSVPs

**What to build:** A tournament no longer has RSVPs of its own. The creation
page loses its RSVP section, the console loses its RSVP tab and the RSVP link
in Settings, and the tournament's RSVP page is gone. A tournament has no
scheduled time. Deleting a tournament stops counting or naming RSVPs.
Duplicating one carries nothing about RSVPs. RSVP data already stored under
tournaments is ignored, with no migration (ADR-0005), and is swept when its
tournament is deleted. After this ticket the list is the only way to take
RSVPs, and the code that served tournament RSVPs is deleted, not left unused.

Covers spec stories 91 to 93 and 99.

**Blocked by:** 03, 04, 05

**Status:** ready-for-agent

- [ ] The creation page has no RSVP section, and the creation module's setup, problems, and input carry no RSVP settings or scheduled time. The creation tests are updated.
- [ ] The console has no RSVP tab, no RSVP link in Settings, and no RSVP capability in its access. The console tests are updated.
- [ ] The tournament RSVP route is removed and the RSVP page components serve lists only.
- [ ] A new tournament is written without RSVP settings or a scheduled time, and the tournament type no longer has them.
- [ ] The rules drop the RSVP link as a way to read a tournament and its matches, drop the check that an RSVP link has its times, and reduce the RSVP and notice paths under a tournament to owner-only read and delete. Rules tests show a real account that is not the owner reads neither, and the owner can still delete what is left there.
- [ ] Deleting a tournament still sweeps RSVPs and notices left under it, and its confirmation no longer mentions people on a list. A data-module test covers the sweep.
- [ ] Duplicating a tournament copies no capacity. The duplicate tests are updated.
- [ ] The pure and data RSVP modules have no function that takes a tournament, and no test refers to one.
- [ ] The README's data layout shows the list paths, drops the tournament's RSVP fields and paths, and says old data under tournaments is ignored.
- [ ] The full suite passes.
