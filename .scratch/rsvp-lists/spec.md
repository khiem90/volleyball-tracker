# RSVP lists

Status: ready-for-agent

Agreed in a grilling session on 2026-11-19. Vocabulary is in `GLOSSARY.md` under
"RSVP" and "Teams". ADR-0005 records that a list stands on its own and a
tournament imports a copy of it. ADR-0006 records that a mixed team is not a
roster team. ADR-0004 still decides who is confirmed and who is waiting. This
spec replaces `.scratch/rsvp/spec.md`, which put RSVPs on a tournament.

## Problem Statement

I take RSVPs for a tournament, but the app makes me build the tournament first.
To get an RSVP link I have to pick a format and enter teams, days before I know
who is coming. Once the list fills up it is only a headcount. I read the names
off one screen and type teams into another, and when people come on their own I
shuffle them into teams on paper.

Some weeks people come as ready-made teams, and the list cannot take them, since
one person can only RSVP as themselves. And a list belongs to the one tournament
it was created on, so an evening with a round robin and then a bracket means
typing the same teams twice.

## Solution

RSVP lists are their own feature with their own tab. I create a list on its
own, with a name, a scheduled time, a capacity, and an open time, and I choose
whether it takes RSVPs by person or by team. I turn its RSVP link on and paste
the link into the chat. No tournament exists yet.

On a by-person list people RSVP as themselves, as they do today. On a by-team
list one person RSVPs a whole team under a team name. Everything else about a
list works as RSVPs work today: the open time judged by the server, the waitlist
in arrival order, held spots, notices, withdrawals, and the row on Home.

When I am ready I close the list and create a tournament from it. The creation
page imports the confirmed RSVPs into its teams. A by-team list gives me one
team per RSVP. A by-person list is dealt into random teams of a size I pick, and
I can shuffle again, move people between teams, and rename the teams before I
save. A size of one enters each person alone. I can tick teams from my roster
alongside the imported ones.

The import is a copy. The tournament does not change when the list does, and I
can import the same list into a second tournament later that evening. The
tournament shows who is on each mixed team, and I can fix the players by hand
when someone drops out. Once the tournament is live, the list's RSVP page offers
it to watch.

## User Stories

### Creating a list

1. As the owner, I want an RSVP tab in the app, so that lists have a home that is not inside a tournament.
2. As the owner, I want to create a list without creating a tournament, so that I can take RSVPs before I know the format or the teams.
3. As the owner, I want to give a list a name, so that the RSVP page says what people are saying yes to.
4. As the owner, I want to choose whether a list takes RSVPs by person or by team, so that one week can be pickup and the next can be a team tournament.
5. As the owner, I want that choice to lock once the first RSVP arrives, so that eight people do not turn into eight teams named after people.
6. As the owner, I want to set a scheduled time in my own time zone, so that "7 PM" means my 7 PM.
7. As the owner, I want to set a capacity that counts people on a by-person list and teams on a by-team list, so that the list stops at what the courts can take.
8. As the owner, I want to set the open time, so that I can create the list on Monday and let people RSVP from Thursday at 6.
9. As the owner, I want the open time to lock once the first RSVP arrives, so that I cannot confuse people who already answered.
10. As the owner, I want to be refused when I lower capacity below the confirmed count, so that nobody loses a spot to a number stepper.
11. As the owner, I want a list without a scheduled time or open time to refuse to turn its link on, so that I cannot share a page that cannot say when.
12. As the owner, I want to turn the RSVP link on and off, so that a list I am not sure about yet stays private.
13. As the owner, I want the RSVP tab to show my lists with the upcoming ones first, so that I find Friday's list without scrolling past last month's.
14. As the owner, I want to change a list's name, capacity, and scheduled time until the scheduled time passes, so that "we moved to 7:30" is one edit.

### Answering as a person

15. As a signed-in person with the link, I want to see the list's name, scheduled time, capacity, and who is on it before it opens, so that I know whether I want in.
16. As a signed-in person with the link, I want a countdown and a disabled button before the open time, so that I know when to come back.
17. As a signed-in person, I want the button to work at the open time for everyone at once, judged by the server, so that nobody jumps the line with their phone's clock.
18. As a signed-out person with the link, I want to be sent to sign in and back to the RSVP page afterwards, so that the link works from a cold start.
19. As a person who opened a scorer link earlier on this phone, I want that silent identity not to count as signed in for an RSVP, so that my RSVP belongs to my account.
20. As a person RSVPing, I want to enter the name the owner will see, prefilled from my last RSVP, so that I type it once.
21. As a person RSVPing, I want an optional short note, so that I can say I am arriving thirty minutes late.
22. As a person RSVPing to a full list, I want to go on the waitlist and see my position, so that I know how likely I am to play.
23. As a person on the waitlist, I want to move up on my own when someone drops or the owner adds capacity, so that a freed spot is never a race to refresh.
24. As a person on the list, I want to change my name or note without losing my place, so that fixing a typo does not cost me a spot.
25. As a person on the list, I want to withdraw until the scheduled time, even after the owner closed the list, so that getting sick on Friday morning frees my spot.
26. As a person who withdrew, I want to RSVP again while the list is open and go to the back of the line, so that changing my mind is possible and fair.
27. As a person on the list, I want to see who else is in and who is waiting, by name, so that I know who I am playing with.
28. As a person on the list, I want my email never shown or stored, so that the names can be visible without leaking addresses.
29. As a person opening the link to a list whose link is off, I want "not found", so that a withdrawn link reveals nothing.
30. As the owner, I want to RSVP to my own list like anyone else, so that my own spot counts.

### Answering for a team

31. As a captain, I want to RSVP my whole team under a team name on a by-team list, so that my teammates do not each need to answer.
32. As a captain, I want the team name prefilled from the last team I RSVP'd, so that "Spikers" is typed once.
33. As a captain, I want to hold one team per list, so that the list cannot be filled by one account.
34. As a captain, I want my team to go on the waitlist when the list is full and move up on its own, so that teams queue the way people do.
35. As a captain, I want to rename my team or change the note without losing my place, so that a typo is free to fix.
36. As a captain, I want to withdraw my team until the scheduled time, so that a team that falls apart frees its spot.
37. As a person on a by-team list, I want the page to say "teams" where a by-person list says "people", so that I know what I am answering for.
38. As a teammate with the link, I want to open the RSVP page and see my team on it, so that I know my captain answered.

### Managing the list

39. As the owner, I want the list's page to show confirmed and waitlisted sections in arrival order, so that I see the evening at a glance.
40. As the owner, I want to remove anyone from the list, so that a no-show from last week does not take a spot.
41. As the owner, I want to add a held spot by name, a person on a by-person list and a team on a by-team list, so that someone without an account still counts against capacity.
42. As the owner, I want to raise capacity and see the waitlist move up at once, so that a fourth court means more players with no other step.
43. As the owner, I want to close the list, so that I can stop new RSVPs on Thursday for a Friday evening.
44. As the owner, I want to reopen a closed list until the scheduled time, even after I imported it, so that a change of plan does not need a new list.
45. As the owner, I want the list to be read-only once the scheduled time has passed, so that the record of who came stops moving.
46. As the owner, I want to duplicate a list for next week with its by-person or by-team choice and its capacity, and with no times, nobody on it, and the link off, so that next week starts from the right setup.
47. As the owner, I want deleting a list to tell me how many are on it and ask first, so that I do not vanish a list people are counting on.
48. As the owner, I want deleting a list to leave the tournaments imported from it as they are, so that last Friday's results survive tidying up.

### Notices

49. As the owner, I want to post a notice on a list, so that a change reaches everyone who RSVP'd.
50. As a person on the list, I want notices on the RSVP page, newest first, so that I see what changed.
51. As a person on the list, I want a new notice marked on Home until I open the page, so that I do not miss a change I did not go looking for.
52. As a person on the waitlist, I want notices too, so that I know about a time change before I am promoted.
53. As the owner, I want to delete a notice I posted by mistake, so that a wrong message does not stay up.
54. As the owner, I want to post a notice after the scheduled time has passed, so that "courts are running late" still reaches people.

### Importing into a tournament

55. As the owner, I want a "Create tournament" button on a list, so that the next step is one tap from the list.
56. As the owner, I want the creation page to offer my lists as a second way to fill the teams section, so that import is part of creating a tournament and not a separate tool.
57. As the owner, I want import to work only on a closed list or one whose scheduled time has passed, and to offer to close an open one, so that the list cannot change while I am arranging teams.
58. As the owner, I want import to take confirmed RSVPs and leave the waitlist out, so that capacity means the same thing in the tournament as on the list.
59. As the owner, I want a by-team list to give me one team per RSVP, in arrival order, so that the teams are entered without typing.
60. As the owner, I want an imported team whose name matches a roster team to enter that roster team, so that "Spikers" keeps its record from week to week.
61. As the owner, I want an imported team with a new name to join my roster, so that it is there next week.
62. As the owner, I want import to flag two RSVPs under the same team name and stop me saving until I rename one, so that two teams never land on one roster team.
63. As the owner, I want to pick a team size for a by-person list and have the people dealt into random teams no larger than that, so that mixing is one step.
64. As the owner, I want uneven numbers spread so team sizes differ by at most one, so that fourteen people at size four gives 4, 4, 3, and 3 and nobody plays alone.
65. As the owner, I want a Shuffle button, so that a deal I do not like costs one tap.
66. As the owner, I want to move a person from one team to another before saving, so that I can keep two friends together or split two strong players.
67. As the owner, I want mixed teams named "Team 1", "Team 2", and so on, with a name I can change, so that they have something to be called on the schedule.
68. As the owner, I want a team size of one to enter each person under their own name, so that a singles tournament comes from the same list.
69. As the owner, I want held spots imported like any other RSVP, so that my walk-in friend gets a team.
70. As the owner, I want to tick roster teams alongside an import, so that six teams from a list and two of my regulars can enter together.
71. As the owner, I want the creation page to count imported teams toward the format's minimum, so that the existing "needs at least N teams" message stays right.
72. As the owner, I want to import the same list into another tournament later, so that a bracket can follow a round robin with the same teams or a fresh deal.
73. As the owner, I want the tournament to stay as I saved it when the list changes afterwards, so that a late withdrawal does not rearrange teams I already announced.
74. As the owner, I want to remove an import from the creation page before saving, so that picking the wrong list is undone in one tap.

### Mixed teams in a tournament

75. As a player, I want the Teams tab to show who is on each mixed team, so that I can find my team.
76. As a spectator, I want to see the players on each mixed team, so that I know who I am watching.
77. As the owner, I want to rename a mixed team while the tournament is a draft or live, so that "Team 3" can become whatever they call themselves.
78. As the owner, I want to add, remove, or move a player on a mixed team while the tournament is a draft or live, so that I can handle the person who withdrew after I imported.
79. As the owner, I want changing players to leave every match and result alone, so that fixing a name mid-tournament is safe.
80. As the owner, I want mixed teams kept off my roster, so that it does not fill up with "Team 1" from every week.
81. As the owner, I want to withdraw a mixed team from a live tournament and bring it back like any other team, so that the formats behave the same.
82. As the owner, I want a completed tournament to keep its mixed teams and players as they were, so that History shows who played.
83. As the owner, I want duplicating a tournament to carry its mixed teams and their players, so that a rematch is one tap.
84. As a scorer, I want to be unable to change players, so that the scorer link stays a results-only link.

### Watching and Home

85. As a person who RSVP'd, I want the RSVP page to offer each tournament imported from the list once it is live, so that I can watch from the bench without a second link.
86. As a person who RSVP'd, I want the page to offer a completed tournament's results, so that the link is still useful afterwards.
87. As a person with the link, I want a draft tournament kept from me, so that I do not see teams the owner is still arranging.
88. As a signed-in person, I want Home to list the lists I am on with my standing and the scheduled time, so that one glance answers "am I playing Friday".
89. As a signed-in person, I want a list to stay on Home until a day after its scheduled time, so that Watch is one tap away while we play and the row goes away afterwards.
90. As a signed-in person, I want lists I withdrew from off Home, so that it shows only what I am part of.

### Tournaments after the change

91. As the owner, I want the creation page free of RSVP settings, so that creating a tournament is about the format and the teams.
92. As the owner, I want the console free of an RSVP tab and an RSVP link, so that there is one place to manage a list.
93. As the owner, I want deleting a tournament to stop mentioning RSVPs, so that the confirmation says only what will go.

### Developer

94. As a developer, I want the open time and the scheduled time enforced in the Firestore rules against the server's clock, so that neither promise depends on a phone.
95. As a developer, I want standing still derived from arrival order and capacity, so that ADR-0004 holds unchanged.
96. As a developer, I want import to be a pure function from a list's RSVPs to the teams a tournament enters, with the randomness passed in, so that dealing is tested with plain values.
97. As a developer, I want the engine's formats untouched, so that nothing about how a format plays changes. The one engine change is that a team added back to a live tournament keeps its entry's players.
98. As a developer, I want no server-side code in this feature, so that the app stays a browser talking to Firestore under the rules.
99. As a developer, I want RSVP data left on old tournaments to be ignored and swept when its tournament is deleted, so that there is no migration to run.

## Implementation Decisions

### The list document

Lists live in a top-level `rsvpLists` collection, one document each, owned by
the account in `ownerId`, the way tournaments are stored (ADR-0001).

- Fields: `ownerId`, `name`, `takes` (`people` or `teams`), `capacity`,
  `scheduledAt` and `scheduledZone`, `opensAt`, `enabled` (the RSVP link),
  `closed`, `tournamentIds`, `createdAt`, `updatedAt`. Times are epoch
  milliseconds, as they are on a tournament today.
- A list write names only the fields it changes. A list has no engine and no
  result racing its settings, so it carries no revision and ADR-0003 does not
  apply to it.
- "RSVPs are open" is derived: `enabled`, not `closed`, and the server's time
  at or past `opensAt` and before `scheduledAt`.
- A list is over once the server's time reaches `scheduledAt`. Nothing stores
  that. After it, nobody RSVPs or withdraws, no held spot is added, and the
  page shows the list read-only.
- The client refuses these owner edits, since only the owner can write the
  fields: `takes` or `opensAt` changed once the list has an RSVP, `capacity`
  below the confirmed count, `enabled` without both times, an open time after
  the scheduled time, and any settings change once the list is over.
- `tournamentIds` holds the ids of tournaments imported from the list. The RSVP
  page reads each one by id, so it needs no query over other accounts'
  tournaments.

### RSVPs and notices

RSVPs sit in an `rsvps` subcollection under the list and notices in a `notices`
subcollection, with the fields they have today.

- An RSVP's document id is the account's uid, so an account holds one RSVP per
  list: one person on a by-person list, one team on a by-team list.
- `name` is the person's name on a by-person list and the team's name on a
  by-team list. Nothing else distinguishes the two; the list's `takes` says
  which it is.
- A held spot keeps its shape: a generated id, `uid` null, `held` true.
- The account's own document remembers two names: the person name it last
  RSVP'd under, as now, and the team name it last RSVP'd. Each prefills its
  own kind of list.

### What a tournament loses and gains

- A tournament loses its RSVP settings and its scheduled time, and the
  subcollections under it are no longer written.
- A tournament gains an optional `rsvpListId`, set when it was created with an
  import and never changed. A duplicate does not carry it.
- An entry gains an optional `players` list of names. An entry with `players`
  is a mixed team: its team id is generated for that tournament, no roster
  document exists for it, and the entry's own name and color are what every
  page shows (ADR-0006). The id still goes in the tournament's flat team id
  list, so the engine, the standings, and the scorer rule treat it like any
  other team.
- Mixed teams take the palette colors least used among the tournament's teams,
  the way pasted team names do on the roster.

### Rules

- Reading a list: the owner, or any real account while `enabled` is true. Real
  account keeps its meaning: signed in, and not the silent identity a scorer
  link creates.
- Creating a list: a real account, with `ownerId` its own uid, `takes` one of
  the two values, and both times present when `enabled` is true. Updating: the
  owner, `ownerId` unchanged, same condition on `enabled`. Deleting: the owner.
- Creating an RSVP keeps today's conditions, with the list in place of the
  tournament: a real account, document id and `uid` its own, valid fields,
  `createdAt` equal to the request's time, and RSVPs open as defined above.
  The new part is the upper bound, the request's time before `scheduledAt`.
- Updating an RSVP: its own account changes `name` and `note`, or records
  `noticesReadAt`, as now.
- Withdrawing: its own account, while the request's time is before
  `scheduledAt`. The owner deletes any RSVP at any time, which the delete of a
  whole list relies on.
- Held spots: the owner, while the request's time is before `scheduledAt` or
  the list has none yet. Nobody updates one.
- Notices: the owner creates and deletes at any time. Whoever can read the
  RSVPs can read them.
- The collection-group rule that lets an account read its own RSVPs stays, and
  so does its index entry. A second index entry covers the owner's lists by
  `ownerId` and `createdAt`.
- The tournament's third read door changes. A real account reads a tournament
  and its matches when the tournament has an `rsvpListId`, the list it names
  has `enabled` true, and the tournament is live or completed. A draft stays
  with its owner.
- Creating a tournament with an `rsvpListId` requires the list to belong to
  the same account. The scorer's allowed keys do not include `entries` or
  `rsvpListId`, so a scorer cannot change players.
- The account document's rule allows the second remembered name alongside the
  first.

### Pure modules

- The RSVP module keeps its job and changes its subject from a tournament to a
  list. The page state becomes: link off, not open yet, open, full, closed, and
  over. "Live" and "completed" go, since a list has neither. The split,
  standing, entry problems, notice problem, countdown, time labels, and
  refusal messages stay as they are. Setup problems gain the two locks and the
  over rule above.
- The Home rows take a "now" and keep a list until 24 hours after its
  scheduled time. They leave out a list whose link is off, one the account can
  no longer read, and one the account is not on.
- A new import module turns a list into the teams a tournament enters. Its
  interface is small: whether a list can be imported yet, the confirmed RSVPs
  to import, a deal of people into mixed teams for a size and a source of
  randomness, a move of one person between teams, a rename, the clashes in a
  set of team names, and the matching of team names to roster teams ignoring
  case. A deal makes the fewest teams that keep every team at or under the
  size, then spreads people so sizes differ by at most one.
- The creation module drops the RSVP section and gains the import: which list,
  the team size, and the arranged teams. Its problems gain "rename one of the
  two teams called X", and its team count for the format minimum adds imported
  teams to ticked ones. Seed order is the order the teams section shows:
  ticked roster teams in tick order, then imported teams, by arrival for a
  by-team list and by number for mixed teams.
- The entries module shows a mixed team from its entry in every status, and
  the roster's rename, recolor, and delete fan-out passes over it.
- Console access drops the RSVP capability and gains one for editing mixed
  teams: the owner, while the tournament is a draft or live.
- The shell gains a fifth tab, RSVP, which needs an account.
- Duplicating a tournament copies mixed teams with their players under fresh
  ids, and still drops a roster team that has left the roster.

### Data modules

- The RSVP data module is re-pointed at lists: create, update settings,
  close and reopen, duplicate, and delete a list with its RSVPs and notices in
  one cleanup batch; subscribe to an owner's lists and to one list; and the
  RSVP, withdraw, held spot, removal, notice, and Home functions it has today.
- Saving a tournament with an import writes, in order: any new roster teams a
  by-team import needs, the tournament with its entries and `rsvpListId`, its
  scorer key, and the tournament's id appended to the list's `tournamentIds`.
  Starting it at creation still works, as it does for any draft.
- Editing a mixed team is an owner field write on the tournament's entries. It
  is rebuilt on the stored tournament on each attempt and carries the base
  revision, so a withdrawal or a result landing at the same moment is kept
  (ADR-0003).
- Deleting a tournament no longer counts or names RSVPs. It still sweeps any
  RSVP and notice documents left under an old tournament.

### Pages

- `/rsvp` is the RSVP tab: the owner's lists, upcoming first by scheduled
  time, then the ones that are over, with a New list button.
- `/rsvp/new` creates a list: name, by person or by team, capacity, scheduled
  time, open time, and the link toggle. Times use the native date-time input
  with the matchbook field classes, as the RSVP section does today.
- `/rsvp/[id]` is the list's page and its RSVP link. Everyone sees the RSVP
  view that exists today. The owner also sees the settings, the link with
  Copy, Close and Reopen, Remove on each row, Add held spot, the notice
  composer, Duplicate, Delete, and Create tournament. A guest is sent to sign
  in and back.
- On a by-team list the page's wording changes from people to teams, and the
  RSVP dialog asks for a team name.
- The RSVP page shows one row per tournament imported from the list that the
  viewer can read: Watch for a live one, See results for a completed one. A
  tournament it cannot read, or one that was deleted, is left out.
- The creation page's teams section offers "Import from an RSVP list". It
  lists the owner's lists, offers to close an open one, and then shows the
  imported teams above the roster checklist: team rows for a by-team list, and
  for a by-person list a team size stepper, Shuffle, and the dealt teams with
  their players, each movable and each team renamable. Create tournament on a
  list opens this page with that list chosen.
- The console loses its RSVP tab and the RSVP link in Settings. Its Teams tab
  shows a mixed team's players to everyone, and to the owner the rename and
  the add, remove, and move controls while the tournament is a draft or live.
- Home's RSVP panel keeps its place and links each row to the list's page.
- The old `/competitions/[id]/rsvp` route goes away.
- Every new screen follows the matchbook design system. The new tab needs an
  icon drawn into the sprite under the rules in the design system doc.

### Data left on old tournaments

RSVP settings, scheduled times, RSVPs, and notices already stored on
tournaments are discarded with no migration (ADR-0005). The app stops reading
them. Home's query for an account's own RSVPs ignores any that do not sit under
a list. The rules keep the owner able to read and delete what is under an old
tournament, so deleting that tournament still cleans up. An account can also
still read its own RSVP there, through the same rule that feeds Home, and
nobody else can read anything.

### Docs

`GLOSSARY.md` and the two ADRs are written. The README's data layout swaps the
tournament RSVP paths for the list paths and drops the tournament's RSVP
fields. The deploy doc notes the new index.

## Testing Decisions

A good test exercises what a person or a rule can observe: a write accepted or
refused, a subscription delivering a list in a given order, a set of teams
dealt from a set of people. Tests do not reach into hooks or components,
because nothing in the repo does. The three existing seams are used and no new
one is added.

### Rules, on the emulator

In the existing rules test file, with paths spelled out and fixtures seeded
with the rules off. Times are seeded relative to the test's own clock, as the
open time tests already do.

- A real account reads a list while its link is on. A signed-out request and
  an anonymous identity do not. Turning the link off refuses the account.
- Only a real account creates a list, only as its own owner, only with a valid
  `takes`, and not with the link on and a time missing. Only the owner updates
  or deletes it.
- An RSVP is accepted at or after the open time and before the scheduled time,
  and refused before the one, at or after the other, on a closed list, and
  with the link off.
- The RSVP field checks that exist today still hold under the new path.
- An account withdraws before the scheduled time and is refused after it. The
  owner removes anyone at any time.
- A held spot is accepted from the owner before the scheduled time and on a
  list with no scheduled time, and refused after it and from anyone else.
- Notices are posted and deleted by the owner alone, after the scheduled time
  too, and read by whoever reads the RSVPs.
- The collection-group read still returns an account's own RSVPs and refuses
  another's.
- A real account reads a live or completed tournament, and its matches, when
  its list's link is on. It is refused a draft, a tournament with no list, a
  tournament whose list has the link off, and one whose list was deleted.
- A tournament cannot be created naming a list another account owns.
- A scorer cannot change entries.
- The account document accepts both remembered names and nothing else.
- The owner can read and delete RSVPs left under an old tournament, and a
  real account that is not the owner cannot read them.

### Data modules, on the emulator

In the style of the existing RSVP and tournament data tests, through the
modules against the real rules.

- Two accounts RSVP at the same moment to a capacity-one list. Both land, the
  subscription delivers them in server order, and raising capacity confirms
  the second with no write to it.
- A captain RSVPs a team to a by-team list and the team name is remembered
  apart from the person name.
- A withdrawal promotes the next RSVP, and the withdrawn account lands behind
  when it RSVPs again.
- Closing stops new RSVPs and leaves withdrawals working. Reopening lets them
  in again.
- Duplicating a list carries `takes` and capacity and leaves the times, the
  people, and the link behind.
- Deleting a list removes its RSVPs and notices and leaves a tournament
  imported from it readable by its owner.
- Creating a tournament from a by-team list writes roster teams for new names,
  reuses a roster team with a matching name, records the list on the
  tournament, and adds the tournament to the list.
- Creating a tournament from a by-person list stores mixed teams with their
  players and writes nothing to the roster.
- Editing a mixed team's players while a result lands keeps both.
- A person on the list reads the tournament once it is live and not before.
- Deleting an old tournament sweeps the RSVPs left under it.

### Pure modules, with plain values

In the style of the existing RSVP, creation, console, Home, shell, and entries
tests.

- The page state for each combination of link, closed, and now against the
  open time and the scheduled time, including over.
- The setup problems, including the two locks, the capacity floor, and a
  settings change on a list that is over.
- The Home rows: a list kept until 24 hours after its scheduled time and gone
  after, and the existing unread-notice cases.
- The deal: every person lands on one team, no team exceeds the size, sizes
  differ by at most one, a size of one names each team after its person, and
  the same source of randomness gives the same deal. Fourteen people at size
  four gives 4, 4, 3, and 3.
- Moving a person between teams and renaming a team.
- Import takes confirmed RSVPs, held spots included, and leaves the waitlist.
- Name clashes within an import, ignoring case, and roster matches ignoring
  case.
- A list can be imported when closed or over and not while open.
- The creation problems with an import: the clash message, and imported teams
  counting toward the format's minimum.
- Entries: a mixed team shows from its entry while draft, live, and completed,
  and a roster rename or delete passes over it.
- Duplicate carries mixed teams with their players under new ids.
- Console access for editing mixed teams, by role and status.
- The fifth shell tab, and the pages that sit under it.

## Out of Scope

- Teammates joining a team in the app, team sizes on a by-team list, or a
  list of a team's players typed at RSVP.
- A list that takes both teams and people without a team.
- A live connection between a list and a tournament. A change to the list
  after import does not reach the tournament.
- Migrating RSVPs already taken on tournaments.
- Mixed teams or people on the roster, or a person's record across weeks.
- Making a mixed team after a tournament is created. A late arrival is added
  as a player to a mixed team, or as a roster team by name as today.
- Dealing teams by skill, by friends, or by anything but chance.
- Changing by-person or by-team, or the open time, after the first RSVP.
- Bringing back a list that is over. The owner duplicates it.
- A scheduled time on a tournament.
- Email of any kind, "maybe" as an answer, plus-ones, and a location.
- Telling the owner when someone RSVPs or withdraws, beyond the list changing
  on screen.
- An Event or Night grouping above tournaments.

## Further Notes

- The fairness promise is unchanged: the rules refuse an RSVP before the open
  time by the server's clock, and the server writes the arrival time. The
  scheduled time is now held to the same standard, since it ends a list.
- Someone who withdraws after an import is still in the tournament. The owner
  removes the player from the mixed team by hand, or withdraws the team.
- These decisions were made while writing this spec and were not put to the
  owner one by one: a draft tournament is hidden from people on the list;
  settings lock once a list is over; the team name is remembered apart from
  the person name; the list keeps the ids of its tournaments so the RSVP page
  needs no cross-account query; the creation page has a Shuffle button; and
  old tournament RSVP data is swept on delete and otherwise ignored.
- Agreed in passing during the session: lists are stored beside tournaments,
  mixed teams get palette colors automatically, held spots are dealt like
  anyone else, and a duplicated tournament does not remember the list.
- This touches merged code across the rules, the creation page, the console,
  and Home. Splitting it into issues should put the standalone list first,
  then removal of tournament RSVPs, then import by team, then mixed teams.

## Comments

- 2026-11-20: Implemented on the integration branch `claude/rsvp-lists` through tickets 01 to 11, then a code review whose fixes landed in 98e2510..46a6cd2. Two sentences above changed to match what was built: story 97 now names the one engine line that carries a mixed team's players, and the note on old tournament RSVP data says an account can still read its own. Three things the review added beyond the spec: the read door through a list also checks that the list and the tournament have the same owner, deleting a tournament takes its id off its list, and a name or note change on an RSVP stops at the scheduled time.
