---
status: accepted
---

# A mixed team is not a roster team

Every entry used to point at a roster team, and the roster is what an account keeps between tournaments. Importing a by-person RSVP list deals the people into teams that mean nothing after that tournament: "Team 1" this week holds different people from "Team 1" next week. We decided that a mixed team exists only in the tournament it was made for. Its entry has an id no roster team has, and carries the team's name, color, and players' names itself. Teams imported from a by-team list do become roster teams, reusing a roster team with the same name, because "Spikers" is the same side from week to week and should keep its record.

## Considered options

- Put every mixed team on the roster. Rejected: the roster would gain a row per team per week, and reusing by name would give "Team 1" a record that belongs to no group of people.
- Put each person on the roster as a team of one and build mixed teams from those. Rejected: the roster holds teams, people would need a model of their own, and an RSVP name is free text with nothing tying this week's "Dan" to last week's.
- Keep only a team name on the entry and no players. Rejected: nobody could look up which team they were dealt into.

## Consequences

- An entry may have no roster team behind it. The pages already cope with that, since a team deleted from the roster shows from its entry today.
- A mixed team takes no part in roster features. It is not on the Teams page, has no record across tournaments, and cannot play a quick match.
- Renaming a mixed team or changing its players writes to the tournament and nothing else. No roster change fans out to it. The owner can do this while the tournament is a draft or live.
- That write is an exception to ADR-0003, which makes every change to a started tournament an engine command. A rename or a player change touches `entries` and no match, and the engine has nothing to work out for it, so it is not a command and does not go through the command queue. It reads the stored tournament, applies the edit to those entries, and writes them with `basedOn`. When the rules refuse it because the revision moved, it reads again and applies the edit to the fresh copy, up to five times. The rules still check it like any other write, and a withdrawal or a result that landed in between is kept.
- Bringing a withdrawn mixed team back reads the entry, since there is no roster team to read.
- Duplicating a tournament copies its mixed teams with their players.
