# 08: Import a by-team list into a tournament

**What to build:** The owner creates a tournament from a by-team list. The
creation page's teams section offers "Import from an RSVP list", and a "Create
tournament" button on a list opens the page with that list chosen. Import
works on a list that is closed or over and offers to close an open one. It
takes the confirmed RSVPs, held spots included, and leaves the waitlist out.
Each becomes a team in arrival order: a name that matches a roster team,
ignoring case, enters that roster team, and a new name joins the roster when
the tournament is saved. Two RSVPs under the same team name are flagged and the
owner renames one before saving. Roster teams can be ticked alongside the
import. The import is a copy (ADR-0005): the tournament records the list it
came from, the list records the tournament, and nothing that happens to the
list afterwards changes the tournament. Only by-team lists can be imported
until ticket 10.

Covers spec stories 55 to 62, 69 to 74, and the by-team part of 96.

**Blocked by:** 06, 07

**Status:** ready-for-agent

- [ ] A new pure import module says whether a list can be imported yet, picks the confirmed RSVPs to import, finds clashes among team names ignoring case, and matches names to roster teams ignoring case. Pure tests cover a closed list, an over list, an open list, the waitlist left out, held spots kept, a clash, and a roster match.
- [ ] The creation page lists the owner's lists to import from, offers to close an open one first, shows the imported teams above the roster checklist, lets the owner rename a clashing team, and lets the owner remove the import.
- [ ] The creation problems gain the clash message, and imported teams count toward the format's minimum with the ticked ones. The creation tests cover both.
- [ ] Seed order is ticked roster teams in tick order, then imported teams in arrival order.
- [ ] Saving writes any new roster teams, then the tournament with the id of its list, its scorer key, and the tournament's id added to the list. Starting at creation still works.
- [ ] The rules refuse a tournament created with the id of a list another account owns. A rules test covers it.
- [ ] A data-module test on the emulator creates a tournament from a by-team list with one new name and one roster match, and checks the roster, the entries, the list recorded on the tournament, and the tournament recorded on the list.
- [ ] A data-module test shows a withdrawal from the list after the import leaves the tournament's entries as they were, and that the same list imports into a second tournament.
- [ ] Create tournament on a list's page opens the creation page with the list chosen.
