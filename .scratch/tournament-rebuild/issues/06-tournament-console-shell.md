# 06: Tournament console shell

**What to build:** Opening a tournament shows a console in the matchbook shell: Courts, Schedule,
Standings or Bracket, Teams, and Settings as tabs on a phone and columns on a
desktop. The console knows the roles owner, scorer, and spectator, with only
owner active for now. The Tournaments tab lists Live and Draft; a completed
tournament opens the same console read-only. The old competition detail page is
removed.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Every tab renders for every format from existing data: Standings for Round Robin and rotation formats, Bracket for elimination.
- [x] Courts shows live matches and the queue for rotation formats, and pending and live matches for the others; tapping a match opens scoring.
- [x] Settings tab exists with its actions arriving in 07.
- [x] At 375px the tabs fit without horizontal scroll and no control depends on hover.
- [x] The Tournaments tab lists Live and Draft only; a completed tournament opens read-only with every action hidden.
- [x] The old competition detail page is deleted.

## Comments

**2026-09-24, implementation.** Done on branch `claude/rotation-lab-redesign`.

- `src/lib/console.ts` is the console's pure part. `consoleAccess` says what
  a role may do given the tournament's status: an owner can start a draft,
  and can score, arrange courts, and manage a live tournament; a scorer can
  score and arrange courts while it is live; a spectator can only watch; a
  completed tournament is read-only for everyone. The five views come from
  the tournament and its matches. `courtsView` gives each court with its
  open match and the queue for rotation formats, and the live and playable
  pending matches for the rest. `scheduleView` gives every match in play
  order with its round, bracket round, or court as its label, in the
  tournament's own word for a court. `standingsView` gives the points table
  for Round Robin, times champion for Win 2 & Out, and wins for Two Match
  Rotation, with every entered team listed. `bracketView` gives rounds per
  section: one section for single elimination, and the winners bracket, the
  losers bracket, and the grand final for double elimination. `teamsView`
  gives each entry's record and withdrawn mark.
- The page at `/competitions/[id]` is the console. The masthead has the
  name, status, a format line, the winner once there is one, and Start for a
  draft. Then Courts, Schedule, Standings or Bracket, Teams, and Settings.
  Below `lg` a five-tab strip in a fixed grid shows one section at a time;
  from `lg` up the sections are columns, Courts beside Standings or Bracket,
  then Schedule, Teams, and Settings. The components live in
  `src/components/console/`. Tapping a pending or live match opens its
  scoring page. Completed matches are not tappable; correcting a result
  arrives with 10 and 11.
- Roles: the page derives owner or spectator from the signed-in uid; scorer
  arrives with 13. Every action keys off `consoleAccess`, so a completed
  tournament hides Start, the score links, instant win, Edit, Reorder, and
  End.
- Carried over from the old page so nothing regresses before the later
  tickets: Start in the masthead, with play-in selection for brackets; End in
  Settings, where 07 owns its tests and the other Settings actions; and on
  rotation courts the instant win buttons, the Edit match dialog, and the
  queue Reorder dialog, which 09 replaces with tap controls. Swapping teams
  in a pending bracket or round robin match, which the old page offered
  behind a hover pencil, is gone: no story asks for it.
- The Tournaments list shows live and draft only, titled "Live & Draft" with
  a count of each; completed tournaments open from History. The status word
  for a completed tournament is "Completed" everywhere; the list said
  "Final".
- Deleted: the old detail page's components in `competition-detail/`,
  `useCompetitionDetailPage`, the old format views (`Win2OutView`,
  `TwoMatchRotationView`, `Bracket`, `DoubleBracket`, `Standings`,
  `rotation-views/`, `bracket-parts/`), and `useTerminology`. Nothing else
  imported them.
- Tests: `src/__tests__/console/console.test.ts` (26 tests) drives the pure
  module with engine-built worlds: access per role and status; courts for
  rotation formats before and after a result, and for round robin and
  brackets with unfilled slots and byes left out and winners before losers;
  schedule labels for every format, including a tournament that calls its
  courts fields; standings for the three non-bracket formats; the bracket for
  four teams, five teams, and double elimination; and each team's record
  with a forfeit and a withdrawn mark.

Verified against the emulators in the browser with the account already
signed in there. Desktop shows the columns as described. At 375px the five
tabs are 69px wide and 51px tall, the page is 375px wide with no horizontal
scroll, and one section shows at a time. Tapping a round robin match opened
its scoring page, and Back returned to the console with that match under
"Live now". A one-team draft's Start showed "Round Robin needs at least 3
teams" and left the dialog open. A seeded Win 2 & Out on two courts showed
both court cards, the instant win buttons, and the queue; "Chasers won"
recorded the result through the engine (Chasers stayed with "one more to be
champion", Eagles came on, Block Party joined the queue) and the undo toast
appeared; End from Settings moved it to Completed with every action gone and
the standings frozen. A seeded five-team single elimination's Start pre-picked
the two lowest seeds for the play-in, and the Bracket tab drew Quarter-Finals
with dashed byes, Semi-Finals, and Finals, scrolling inside its panel at
375px. A completed round robin opened read-only with its winner. Typecheck,
`eslint src` (0 errors, 13 pre-existing warnings), and the full suite (238
tests) pass with the emulators up.

Things seen and left alone: the dark-mode hydration error and the dark
dialogs on cream pages that 15 and 18 remove; the old scrolling nav strip
that 15 replaces; the pane's pointer clicks land in a coordinate frame 1.75
times the CSS pixels, so the tab and dialog taps were driven as DOM clicks
from the page console once that was clear. One boundary for 12 and 13:
access is enforced in the console only, so the owner of an ended rotation
tournament who types `/match/[id]` for a court's leftover pending match can
still score it, because the scoring page starts any pending match for a
signed-in owner.

**2026-09-24, review.** A two-axis review (standards and spec) ran on the
staged change. The spec axis traced the access rules, the courts view, the
rankings, and the bracket placement by hand and found no defect. What
changed after the standards axis:

- "table" was the tab id and the view kind for Standings, which the glossary
  avoids. The tabs are now `standings` and `bracket`, and the view kind is
  `round_robin`.
- "viewer" in comments, which the glossary avoids for Spectator, `venue`
  locals, and `titles` for the champion count were renamed.
- One `capitalize`, one `courtsWord`, one `scoringLink` guard, and one
  `TOURNAMENT_STATUS` map are shared by the list and the console instead of
  each keeping a copy; the list's "Final" became "Completed" on the way.
- An unused `trailing` prop on the match row was dropped.
- Two hand-forged test inputs became real ones: the draft comes from
  `draftWorld`, and the double elimination test plays both semi-finals so the
  losers bracket fills through the engine.

Left as judgement calls: `teamNotes` in the courts panel reads the rotation
state directly, since 09 reworks the courts; the format branching in the
pure module, which is the right home for it; and the tournament, team
lookup, and access that every panel takes together.
