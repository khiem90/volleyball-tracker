# 10: Import a by-person list as mixed teams

**What to build:** The owner creates a tournament from a by-person list. Import
asks for a team size and deals the confirmed people into random mixed teams no
larger than that, with sizes that differ by at most one: fourteen people at
size four gives 4, 4, 3, and 3. The owner can shuffle again, move a person
between teams, and rename a team from "Team 1" before saving. A size of one
enters each person alone under their own name. A mixed team exists only in
this tournament and never joins the roster (ADR-0006). Its entry carries its
name, color, and players, and the Teams tab shows the players to everyone who
can see the tournament. A mixed team plays, is withdrawn, and comes back like
any other team.

Covers spec stories 63 to 68, 75, 76, 80 to 82, and 96.

**Blocked by:** 08

**Status:** resolved

- [x] An entry can carry a list of player names. An entry that does is a mixed team: its team id is generated for the tournament and no roster document is written for it.
- [x] The pure import module deals people into mixed teams for a size and a source of randomness passed in, moves a person between teams, and renames a team. Pure tests show every person lands on one team, no team exceeds the size, sizes differ by at most one, a size of one names each team after its person, and the same randomness gives the same deal.
- [x] The creation page shows a team size stepper, Shuffle, and the dealt teams with their players for a by-person list. A person can be moved to another team and a team renamed. Changing the size deals again.
- [x] Mixed teams take the palette colors least used among the tournament's teams.
- [x] Mixed teams count toward the format's minimum and seed after the ticked roster teams, in number order. Roster teams can still be ticked alongside them.
- [x] The entries module shows a mixed team from its own entry while the tournament is a draft, live, and completed, and a roster rename, recolor, or delete passes over it. The entries tests cover each.
- [x] The Teams tab shows each mixed team's players to the owner, a scorer, and a spectator.
- [x] A mixed team can be withdrawn from a live tournament and brought back, in each format, with no roster team to read. An engine or console test covers one bracket format and one rotation format.
- [x] A data-module test on the emulator creates a tournament from a by-person list with a held spot on it, and checks the entries hold the players, the tournament's team ids include the mixed teams, and the roster is unchanged.
- [x] History shows a completed tournament's mixed teams by name.

## Comments

- 2026-11-20: Built test-first on the integration branch `claude/rsvp-lists` (ticket branch tip 2ad7034). Code review fixes landed in 98e2510..46a6cd2. All acceptance boxes ticked, and the full suite (1,032 tests) passes against the emulator. On "brought back, in each format": a bracket takes no team back once it is drawn, mixed or roster, so the tests cover the return in a rotation format and a round robin and the refusal in a bracket. The engine's `addTeam` gained one line so a returning mixed team keeps its players.
