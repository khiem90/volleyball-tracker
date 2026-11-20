# 11: Edit mixed teams in the console

**What to build:** While a tournament is a draft or live, its owner renames a
mixed team and adds, removes, or moves its players from the Teams tab. This is
how the owner handles someone who withdrew from the list after the import.
Player names are labels, so a change touches no match and no result. A scorer
and a spectator see the players and cannot change them, and nothing changes
once the tournament is completed. Duplicating a tournament carries its mixed
teams with their players.

Covers spec stories 77 to 79, 83, and 84.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Console access gains a capability for editing mixed teams: the owner while the tournament is a draft or live, and nobody otherwise. The console tests cover each role and status.
- [ ] The Teams tab gives the owner a rename on a mixed team, and add, remove, and move on its players. Roster teams show none of these.
- [ ] An edit writes the tournament's entries on the stored copy with its base revision and is rebuilt when the tournament has moved on (ADR-0003). A data-module test lands an edit and a result at the same moment and keeps both.
- [ ] A rename of a mixed team shows on the schedule, the standings, and the scoring page at once, since no roster team stands behind it.
- [ ] The rules refuse a scorer's write that touches entries. A rules test covers it.
- [ ] A pure function applies each edit to the entries and refuses an empty team name or player name. Pure tests cover rename, add, remove, move, and each refusal.
- [ ] Duplicating a tournament copies mixed teams with their players under new ids, does not carry the list the source was imported from, and still drops a roster team that has left the roster. The duplicate tests cover each.
