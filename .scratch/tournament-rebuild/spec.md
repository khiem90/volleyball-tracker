# Tournament rebuild

Status: ready-for-agent

Agreed in a grilling session on 2026-09-23. Vocabulary is in `CONTEXT.md`. The two
structural decisions are recorded as ADR-0001 (per-account Firestore storage
replaces Sessions) and ADR-0002 (scorers act through a revocable link, without
signing in).

## Problem Statement

I run tournaments from my phone and the app fights me at every step.

I can only have one tournament going at a time. The moment I start one, every
other tournament disappears from the list, my team list shrinks to that
tournament's teams, and creating another silently overwrites the live one for
everyone watching. If the tournament finishes on its own, the End button vanishes
and I'm stuck in that view.

Adding a team costs a dialog per team, and bulk add only produces names like
"Team 5" that I then rename one by one. Deleting a team means finding a panel far
below the list, and nothing stops me deleting a team that is mid-tournament, which
leaves "Unknown Team" all over the standings.

Managing a tournament means one long scroll with actions missing. I can't rename
it, change courts, add or withdraw a team, correct a confirmed score, or delete it
from its own page. Edit pencils only appear on mouse hover, so on a phone they
don't exist.

I install the app on my phone, and it isn't built for that. The nav strip scrolls
off screen and drops my account, so I can't sign out. Nothing respects the notch
or home bar. The install locks portrait while the scoring screen demands
landscape. Buttons are too small. Dark mode leaks into dialogs on cream pages.

The home screen is full of panels whose rows go nowhere, with a bracket built from
standings rather than real matches.

Underneath all this, my data lives only in this browser even though I had to sign
in, and anyone who finds a share link can edit any tournament.

## Solution

Every signed-in account owns a roster and any number of tournaments, stored in
Firestore so they follow the account across devices and keep working offline.
There is no more session mode. A tournament is the unit of sharing: it has a
spectator link that can be turned off and a scorer link that can be regenerated.

Teams are added inline or by pasting a list, deleted singly or in bulk, and
protected while they are in a live tournament by a Withdraw action that forfeits
their remaining matches. Roster edits show up in draft and live tournaments and
freeze in completed ones.

Creating a tournament is one page ending in "Save as draft" or "Create and
start". Managing one is a console with tabs on phone and columns on desktop, and
every management action lives in it, including editing a confirmed result and
ending an endless format.

The phone shell is a bottom tab bar above the home indicator, an account menu in
the top bar, safe areas respected everywhere, no orientation lock, scoring that
works in either orientation with the screen kept awake, and a light-only design.

Home shows what is live and what to do next, and nothing else.

## User Stories

### Account and data

1. As an owner, I want my roster and tournaments stored under my account, so that they are there when I sign in on another phone.
2. As an owner, I want the app to keep working when the gym has no signal, so that scoring never stops.
3. As an owner, I want changes made offline to sync when I reconnect, so that nothing is lost.
4. As an owner, I want sign-in with Google or email and password, so that I can use whichever I have.
5. As an owner, I want a password reset by email, so that a forgotten password doesn't lock me out.
6. As an owner, I want sign-out to clear the app's cached data on that device, so that a borrowed phone doesn't keep my data.
7. As an owner, I want only my account to be able to change my data, so that a stranger with a link cannot edit my tournaments.
8. As a guest, I want the navigation to tell me which parts need sign-in, so that I don't tap into a bounce to the login page.
9. As a guest, I want to play an unsaved quick match without an account, so that I can try the app at once.

### Roster

10. As an owner, I want to type a team name, press Enter, and have it saved with the field ready for the next one, so that adding ten teams takes ten lines.
11. As an owner, I want to paste a list of names, one per line, so that I can bring a roster from a group chat in one go.
12. As an owner, I want each new team to get a color I can change later, so that teams are telling apart on the court.
13. As an owner, I want to rename or recolor a team from its profile, so that fixes are quick.
14. As an owner, I want a rename to show up in the standings of a live tournament, so that the court sees the right name.
15. As an owner, I want completed tournaments to keep the names and colors as they were, so that history doesn't rewrite itself.
16. As an owner, I want to delete a team from its profile with one confirm, so that removing a stale entry is fast.
17. As an owner, I want a select mode with bulk delete behind one confirm, so that clearing last season's roster is a few taps.
18. As an owner, I want the app to refuse to delete a team that is in a live tournament and offer Withdraw instead, so that I never create ghost teams.
19. As an owner, I want deleting a team to remove it from draft tournaments cleanly, so that drafts don't reference missing teams.
20. As an owner, I want to see which tournaments a team is entered in, so that I know what a delete or withdraw would touch.
21. As an owner, I want each team's all-time record including quick matches, so that I can see form across nights.
22. As an owner, I want the roster to be searchable, so that I can find one team among fifty.

### Creating a tournament

23. As an owner, I want to create a tournament on one page with format, name, teams, and settings, so that setup takes under a minute.
24. As an owner, I want to tick teams from my roster or add new ones inline while creating, so that I never leave the page.
25. As an owner, I want advanced settings collapsed by default, so that the common case stays simple.
26. As an owner, I want "Save as draft" and "Create and start" side by side, so that I can prepare in advance or start now.
27. As an owner, I want to land on the new tournament after creating it, so that I don't hunt for it in a list.
28. As an owner, I want to create several tournaments and have all of them listed, so that a two-court night with two tournaments is possible.
29. As an owner, I want to duplicate a tournament into a new draft with the same teams and settings, so that a weekly night is one tap to set up.
30. As an owner, I want to choose the number of courts for rotation formats, so that the queue matches the gym.
31. As an owner, I want to pick a best-of series length, so that a match can be decided over several games.
32. As an owner, I want instant win for rotation formats, so that I can record a result by tapping the winner.
33. As an owner, I want to call a court a field or a table, so that the app fits my sport.

### Managing a tournament

34. As an owner, I want a console with Courts, Schedule, Standings or Bracket, Teams, and Settings, so that each job has a place.
35. As a phone user, I want those sections as tabs, so that I never scroll through everything to reach one action.
36. As a desktop user, I want those sections side by side, so that I can watch courts and standings at once.
37. As an owner, I want to rename a tournament, so that a typo doesn't stick.
38. As an owner, I want to change the number of courts on a live rotation tournament, so that I can react when a court opens or closes.
39. As an owner, I want teams from a removed court to go to the front of the queue, so that they don't lose their turn.
40. As an owner or scorer, I want to swap teams between courts, so that a mismatch can be fixed without a dialog chain.
41. As an owner or scorer, I want to reorder the queue with controls that work with a finger, so that late arrivals can be slotted in.
42. As an owner, I want to add a team to a live round robin and have its matches appended, so that a latecomer can still play everyone.
43. As an owner, I want to add a team to a live rotation tournament and have it join the queue, so that latecomers just wait their turn.
44. As an owner, I want the app to refuse adding a team to a started bracket, so that the bracket stays valid.
45. As an owner, I want to withdraw a team from a live tournament, so that a team that leaves early doesn't block the schedule.
46. As an owner, I want a withdrawal to forfeit the team's remaining matches as wins for the opponents, so that standings stay complete.
47. As an owner, I want forfeits marked as forfeits and excluded from point difference, so that the table is honest.
48. As an owner, I want a withdrawn team's played results to stay, so that the record of the night is intact.
49. As an owner, I want to correct a completed match's score, so that a mis-tap that got confirmed isn't permanent.
50. As an owner, I want standings to recalculate after a correction, so that the table is always right.
51. As an owner, I want bracket corrections blocked once the next match has started, so that a bracket can't contradict itself.
52. As an owner, I want to end any tournament from its Settings, so that endless formats have a finish.
53. As an owner, I want round robin and brackets to complete on their own when the last match ends, so that I don't have to remember.
54. As an owner, I want a single-elimination bracket with five or six teams to complete correctly, so that odd team counts work.
55. As an owner, I want to delete a tournament from its own page, so that I don't go back to the list to do it.
56. As an owner, I want completed matches in a bracket to not open a "Start Match" dialog, so that I don't get sent into a locked screen.
57. As an owner, I want to open a completed tournament and see the same console read-only, so that reviewing a night looks like running one.
58. As an owner, I want the Tournaments tab to show live and draft only, so that finished ones don't crowd it.

### Scoring

59. As a scorer, I want to score in portrait or landscape, so that I hold the phone however is comfortable.
60. As a scorer, I want no "rotate your device" prompt, so that scoring starts immediately.
61. As a scorer, I want the screen to stay awake while scoring, so that it doesn't lock between points.
62. As a scorer, I want fullscreen when the device supports it and nothing broken when it doesn't, so that iPhones don't get a dead button.
63. As a scorer, I want score buttons I can hit without looking, so that I keep my eyes on the court.
64. As a scorer, I want undo for the last point, so that a mis-tap is one tap to fix.
65. As a scorer, I want a completed match to say Completed, not Live, so that I know it's done.
66. As a scorer, I want to complete a match and be taken to the next thing on my court, so that rotation nights flow.
67. As a scorer, I want two phones scoring two courts at once to both save, so that no result is lost.

### Sharing

68. As an owner, I want a spectator link per tournament, so that people in the stands can follow.
69. As an owner, I want to turn the spectator link off, so that a night can be private.
70. As an owner, I want a scorer link per tournament, so that helpers can score without accounts.
71. As an owner, I want to regenerate the scorer link, so that old phones lose access.
72. As a scorer, I want to open the link and be scoring within seconds, with no sign-in, so that I can help on the spot.
73. As a scorer, I want to pick my court from the link, so that several helpers can share one link.
74. As a scorer, I want to be unable to end, delete, rename, or change teams, so that helpers can't wreck the tournament.
75. As a spectator, I want to see live courts, the queue, standings or bracket, and the schedule, so that I can follow without asking.
76. As a spectator, I want the page to update live, so that I don't refresh.
77. As a spectator, I want a link that is off to show a clear not-found message, so that I know it's closed rather than broken.

### Quick match

78. As an owner, I want to pick two roster teams for a quick match, so that a friendly counts toward their records.
79. As an owner, I want to see abandoned quick matches with Resume and Discard, so that nothing stays "Live" forever.
80. As an owner, I want quick matches in History, so that friendlies are part of the record.
81. As a guest, I want Play Again after a guest match, so that I'm not stuck on a frozen screen.

### History

82. As an owner, I want History to list completed tournaments and past quick matches, so that I can find any past night.
83. As an owner, I want to open a completed tournament from History, so that I can see its final standings and matches.
84. As an owner, I want a ledger of matches with filters, so that I can answer "who beat whom in July".
85. As an owner, I want to export the ledger as CSV, so that I can share results outside the app.

### Phone shell and home

86. As a phone user, I want a bottom tab bar with Home, Teams, Tournaments, History, so that every section is one tap away.
87. As a phone user, I want the tab bar padded above the home indicator, so that taps land.
88. As a phone user, I want the status bar area handled, so that titles don't sit under the clock.
89. As a phone user, I want my account and sign-out in the top bar on every page, so that I can sign out from anywhere.
90. As a phone user, I want page titles to wrap rather than get cut off, so that nothing is hidden.
91. As a phone user, I want no controls that only appear on hover, so that every action is visible.
92. As a phone user, I want primary buttons at least 44px tall, so that they're easy to hit.
93. As a phone user, I want the installed app to allow both orientations, so that landscape scoring is possible.
94. As a phone user, I want the app's icon and splash colors to match the paper design, so that install looks right.
95. As a phone user, I want a "reload to update" banner when a new version deploys, so that the app doesn't reload itself mid-match.
96. As a user, I want a light-only design, so that dialogs don't turn dark on cream pages.
97. As an owner, I want Home to show live tournaments with Resume, quick match, and recent results, so that I always know the next tap.
98. As an owner, I want Tools reachable from Home, so that the volleyball tools stay findable.

### Volleyball tools

99. As a coach, I want template formations to load onto the court when I pick them, so that the picker isn't decorative.
100. As a coach, I want the share dialog to reflect whether sharing is on, so that I can trust the link.
101. As a coach, I want Select in My Formations to open the formation, so that the button does something.
102. As a coach, I want the tools page to advertise only rotations that exist, so that I'm not promised a 6-2 that isn't there.

## Implementation Decisions

### Storage

- All roster, tournament, and match data lives in Firestore under the owning
  account, with offline persistence and the multi-tab manager. The Session and
  Summary entities, the admin token, the localStorage reducer, and the session
  and summary routes are removed. Existing data is discarded.
- Roster teams live in a per-user collection. Quick matches live in a per-user
  collection with no tournament reference.
- Tournaments live in a top-level collection with random, unguessable ids, since
  spectators and scorers reach them by link. A tournament document carries its
  owner, name, format, status (Draft, Live, Completed), entries, the list of
  entered team ids for queries, settings (courts, series length, instant win,
  scoring configuration, terminology), rotation format state, a spectator-enabled
  flag, timestamps, and the winner.
- Each match is its own document in a subcollection of its tournament, carrying
  the owner id and tournament id so one collection-group query returns all of an
  account's matches for History and team records. A match carries its court
  number and an optional forfeit mark naming the team that forfeited.
- The scorer key lives in a private subdocument readable by the owner only.
  Scorers write a key proof into a scorers subcollection under their own uid.
- Rules: owner-only writes on roster and tournaments; scorer writes on matches and
  on rotation state only while the scorer's proof equals the current key; public
  reads of a tournament and its matches only while spectator access is enabled.
  A collection-group index supports the account-wide match query. The `|| true`
  update rule is gone.

### Entries and the roster

- An entry is a snapshot of the team's name and color plus an optional withdrawn
  timestamp. Renaming or recoloring a roster team fans out to entries in the
  owner's draft and live tournaments and leaves completed ones untouched.
- Deleting a roster team is refused while it has an entry in a live tournament.
  Deleting it removes its entries from draft tournaments.

### The tournament engine

- All format logic sits behind one pure engine. A command (start, complete match,
  edit result, withdraw, add team, change courts, swap courts, reorder queue,
  end) plus the current tournament and matches produce the next tournament and
  the match writes. The existing format libraries become its internals.
- Round Robin: adding a team while live appends its matches against every
  active entry. Withdraw forfeits the team's pending matches. Standings count a
  forfeit as a win for the opponent with no effect on points for, against, or
  difference. Editing a completed result recalculates standings.
- Single and Double Elimination: adding a team after start is refused. Withdraw
  forfeits the team's next match and advances the opponent. Editing a completed
  result is allowed only while the dependent match has not started. Completion
  is detected from the true final rather than from the team count, so
  non-power-of-two brackets finish.
- Win 2 & Out and Two Match Rotation: adding a team while live appends it to the
  queue. Withdraw removes the team from the queue or court and leaves the court's
  other team in place. Reducing courts sends the removed court's teams to the
  front of the queue. These formats complete only through End, which freezes the
  standings.
- Ties stay disallowed; the tie settings are removed from configuration.

### Applying commands

- The data layer applies engine output in a transaction so two scorers on two
  courts cannot overwrite each other. Match scores during play are per-match
  writes, never whole-array replacements.
- The app-wide provider becomes a thin layer over live subscriptions (roster,
  tournaments, matches) and the domain actions. In the first PR, existing pages
  keep working against it with their old design.

### Access

- The owner is whoever created the tournament. Only the owner can end, delete,
  rename, duplicate, or change teams. Scorers can score, complete matches, use
  instant win, reorder the queue, and swap courts. Spectators read only.
- Opening a scorer link gives the visitor a silent anonymous Firebase identity if
  they have none, writes the key proof, and opens the console with scorer
  permissions. Regenerating the key changes what the rules compare against, so
  every old proof fails on its next write. This is a mechanism, not a guest
  account; guests still get only an unsaved quick match.
- The spectator link is the tournament page in read-only mode. Turning it off
  clears the spectator-enabled flag and the page shows not found.

### Screens

- Creation is one page with format, name, roster checklist with inline add,
  collapsed advanced settings, and "Save as draft" plus "Create and start".
- The console uses the matchbook shell with tabs on phone and columns on
  desktop: Courts, Schedule, Standings or Bracket, Teams, Settings. Settings
  holds rename, courts, share links, Duplicate, End, Delete. Completed
  tournaments use the same console read-only. Editing a completed result is
  reached from Schedule.
- The scoring page keeps its full-bleed design, works in both orientations,
  drops the rotate prompt, requests the wake lock during any scoring, treats
  fullscreen as best-effort with an iOS guard, and uses 44px controls. Completed
  matches read Completed.
- Home shows live tournaments with Resume, a quick match button, recent results,
  and a link to Tools. Tournaments lists Live and Draft. History lists Completed
  tournaments and quick matches with the ledger, filters, and CSV export.
- Quick match picks two roster teams when signed in and lists abandoned quick
  matches with Resume and Discard. The guest flow gets Play Again.

### Phone shell

- A fixed bottom tab bar (Home, Teams, Tournaments, History) with safe-area
  padding replaces the scrolling strip. The top bar holds the account menu with
  sign-out on every page. The old navigation component is removed.
- The manifest drops the portrait lock, matches the paper palette, and ships real
  maskable icons. The viewport uses cover fit. Every sticky or fixed element uses
  safe-area insets.
- Light only: the theme toggle and the dark class are removed.
- Matchbook CSS moves into a Tailwind layer so utilities win. Overflowing headers
  wrap. Hover-only controls are replaced with always-visible ones.
- A "reload to update" banner replaces reload-on-reconnect.

### Tools and cleanup

- Template formations resolve and load; the share dialog reads live formation
  state; Select in My Formations opens the formation; the 6-2 claim is removed.
- Dead components and hooks found in the audit are deleted. Lint ignores the
  generated service-worker files.

### Delivery

Twenty-one tickets under `issues/`, numbered in dependency order with their
blocking edges. Tickets 04, 12, 14, and 19 can run in parallel with the main
chain once their blockers land.

## Testing Decisions

A good test drives a public seam with realistic inputs and asserts what a user
would observe: which matches exist, who is on which court, what the standings
say, which state the tournament is in, whether a write was allowed. It does not
inspect internal structure, mock the engine's own helpers, or assert on call
counts.

Prior art is the three vitest suites for the volleyball library, which call pure
functions with fixtures and assert on returned values. The new tests follow that
shape.

Seam 1, the tournament engine. Tests cover, per format: starting from a draft;
completing a match and what it schedules next; editing a completed result and
its effect on standings or the bracket, including the refusal once a dependent
match has started; withdrawing a team and the forfeits it creates; adding a team
while live, including the bracket refusal; changing courts and where displaced
teams go; swapping courts; reordering the queue; ending, including that endless
formats only finish this way; and auto-completion of round robin and brackets
with power-of-two and non-power-of-two team counts. Standings tests cover forfeit
marks and point difference. A small pure roster fan-out function is tested for
which entries a rename touches.

Seam 2, Firestore rules against the emulator, using the rules unit-testing
package. Tests cover: a signed-out request cannot write a tournament; an owner
can; a different account cannot; a scorer with a valid proof can write a match
and rotation state but cannot rename, end, or delete; a scorer with a stale
proof is refused; the tournament and its matches are readable without auth only
while spectator access is enabled; the scorer key is unreadable by anyone but the
owner.

No component tests. Screens are verified in the browser against the emulators
at phone width, and each PR's acceptance list is checked that way.

## Out of Scope

- Dark mode. The design is light only.
- An Event or Night grouping above tournaments.
- Guest accounts that create tournaments, and linking an anonymous identity to a
  real account.
- A redesign of the volleyball tools beyond the four fixes. They get the new
  shell (tab bar and top bar) but their content is not redesigned.
- Reset or regenerate schedule. Delete plus Duplicate covers it.
- Ties and tie points.
- Migration of existing localStorage, session, or summary data.
- Named collaborators who sign in to score.
- Account deletion and data export beyond the CSV ledger.
- Translations.
- A custom install prompt.
- 6-2 rotations.

## Further Notes

- Hosting is Vercel. Firestore rules and indexes are deployed by the owner with
  the Firebase CLI; the first PR includes a short step-by-step for that.
- Local verification uses the Auth and Firestore emulators, which need a JDK. The
  winget install of Microsoft OpenJDK 17 attempted on 2026-09-23 failed with an
  installer hash mismatch, so no JDK is present yet. Until one is installed, only
  the guest quick match can be driven in the browser here.
- The env file is already set to emulator mode. The emulators script needs
  Firestore added to its list.
- Effort order across formats: Win 2 & Out, Two Match Rotation, Round Robin,
  Single Elimination, Double Elimination.
- iPhone Safari PWA is the first target and Android Chrome the second.
- The dev server was started during the audit and is still running on port 3000.
