# 06: Watching after the start

**What to build:** Once the tournament is live, the RSVP page keeps its header
and shows a Watch button into the console, where the person sees the tournament
as a spectator would, with the Spectator badge, without the owner turning on a
spectator link. A completed tournament's RSVP page says so and keeps its list
read-only.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The rules let a signed-in account read a tournament's matches while `rsvp.enabled` is true, alongside the owner, spectator, and scorer doors; rules tests cover the accept and the refusals for signed-out and anonymous.
- [ ] The console page accepts an RSVP-link holder as a spectator: the link shell shows the Spectator badge and no controls, and the console tests pin the role.
- [ ] The RSVP page shows Watch while the tournament is live and "Completed" with the list read-only once it ends; the page state function covers both.
- [ ] Turning the RSVP link off while someone is watching ends their view the way turning the spectator link off does.
