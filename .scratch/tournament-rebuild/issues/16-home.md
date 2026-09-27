# 16: Home

**What to build:** Home shows live tournaments with a Resume button, a quick match button, recent
results, and a link to Tools. The projected panels and the fake bracket are
gone.

**Blocked by:** 06, 14

**Status:** ready-for-agent

- [x] Each live tournament shows with Resume opening its console.
- [x] Quick match starts from Home in one tap.
- [x] Recent results list the last completed matches and open the tournament or quick match they belong to.
- [x] No panel on Home is built from projections; every row is tappable.

## Comments

**2026-09-27, implementation.** Done on branch `claude/rotation-lab-redesign`.

- `src/lib/home.ts` is Home's pure part. `liveTournaments` gives the live
  tournaments, the most recently started first, so rows stay put while
  courts score. Each comes with the teams still in it (a withdrawn team is
  out), the matches played, the matches it will play in all, and the
  matches being scored now. Byes count for neither. A rotation tournament
  has no total, because it keeps scheduling until the owner ends it.
  `recentResults` gives the latest matches played, newest first, five by
  default. A tournament match opens the tournament's console, completed or
  not. A quick match opens its own page, which shows it Completed with the
  final score. A tournament match takes its team names from the entries,
  so a completed tournament keeps the names it had. A quick match takes
  them from the roster.
- What Recent results leaves out. Byes, because nobody played them.
  Forfeits too, because one withdrawal from a round robin forfeits every
  match the team had left, all at the same moment, and five Forfeit rows
  would push real results off Home. History still has them. A match
  nothing could open is left out as well: one whose tournament is gone,
  and a quick match whose team has left the roster, since the scoring page
  shows "Match not found" for it.
- The page at `src/app/(shell)/page.tsx` has a Quick match button, then
  Live tournaments, then Recent results with a row to History, then a Tools
  row. From `lg` up, Live tournaments sits beside the other two. Every row
  is a link. A live row shows the name, format, teams, and progress, with
  a Resume button, and a live tag when a match is being scored. With
  nothing live, the panel offers New tournament, or Open tournaments when
  a draft is waiting. A result row is the console's `MatchRow` with the
  tournament's name, or "Quick match", and the time. A guest sees a
  sign-in panel in place of the tournaments and no results.
- Quick match in one tap. For a guest, the tap starts a guest match,
  since there is nothing to pick. For an owner, it opens the Quick page,
  where the two roster teams are picked (story 78). A match cannot start
  in one tap until two teams are chosen, so the tap reaches that screen.
- Deleted: the dashboard page's `panels.tsx`, `useMatchbookDashboard.ts`,
  and the types only they used. The projected standings, the fake bracket
  seeded from standings, Match of the Day, readiness, leaders, and the
  schedule built from creation times went with them. The Tools button that
  ticket 15 left in the masthead became the Tools row.
- Shared on the way: `scoringHref` moved from the console's `MatchRow` to
  `src/lib/scoring.ts` beside `backHref`, so the pure module can use it.
  `LiveTag` takes an optional label. `PanelEmpty` takes an optional action
  in place of its small link, so Home's empty states get 44px buttons.
- Tests. `src/__tests__/home/home.test.ts` (11 tests) drives the pure
  module with engine-built worlds, in the shape of the console and shell
  tests. It covers which tournaments are live and their order, the counts
  for a round robin, a bracket with byes, and a rotation tournament, and a
  withdrawn team. For results it covers order and limit, where a
  tournament match and a quick match open, entry names against roster
  names, and what is left out. Like tickets 06 and 15, this is a pure
  module seam beside the two that Testing Decisions names.

Verified against the emulators in the browser pane at 375x812 on the dev
server another session left on port 3000, at 127.0.0.1, with the emulator
account signed in there. A new Win 2 & Out on two courts showed as "Win 2 &
Out • 6 teams • 2 courts • 1 played" with "1 being scored" once a court's
match had a point, above the older round robin. Resume opened each console.
Tapping a tournament result opened its console, and tapping the quick match
opened its page with Completed and 3 to 1. Playing the round robin out moved
it off the list, and its results opened the console read-only with its
winner. With nothing live, the panel offered New tournament, and after a
Duplicate it said "1 draft is ready to start" with Open tournaments.
Withdrawing a team from the started duplicate made its row say 5 teams.
Quick match was 48px tall and opened the Quick page. Every row was a link
of 44px or more, and the page was 375px wide with no sideways scroll. At
1280px the panels sat side by side, each as tall as its rows. As a guest,
on `[::1]:3000` so the signed-in origin stayed untouched, Home showed the
sign-in panel and Tools, and Quick match started a 0 to 0 guest match.
Loading Home logged no errors. Typecheck, `eslint src` (0 errors, 13
pre-existing warnings), and the full suite (490 tests) pass with the
emulators up.

Things seen and left alone. `.mb-panel` sets `height: 100%` outside any
Tailwind layer, so two panels in one column each tried to fill it; the grid
aligns its items to the start instead, and ticket 18 owns the layer. Back
on a completed quick match's page leads to the Quick page, not Home. The
console's Settings logged "Failed to read the scorer key" (a rules `get()`
on the tournament that found nothing) around ending a tournament and
pressing Duplicate, then Firestore "INTERNAL ASSERTION FAILED (ca9)"
errors. That is filed as its own task. The test tournaments "Home check
courts" and its duplicate, and the teams Eagles and Falcons, stay in the
emulator account.

**2026-09-27, review.** A two-axis review (standards and spec) ran on the
staged change. What changed after it:

- The live row counted withdrawn teams. It counts the teams still in it.
- One round robin withdrawal could fill Recent results with forfeits.
  Forfeits are left out now.
- A failed tournaments listener left Recent results saying "No results
  yet". Both panels show the load error.
- The empty state said "Finished matches", which the glossary avoids. It
  says "Completed matches".
- Result rows use the console's `MatchRow` and `teamLookup` rather than a
  copy, the being-scored tag is `LiveTag` with a label, the empty states
  use `PanelEmpty`, and `scoringHref` is shared. The live row asks
  `isRotationFormat` rather than reading a missing total as the format.
- In the tests, the helper `named` became `withId`, a test name dropped
  "runs", and an assertion that repeated the one above it went.

Left as judgement calls: the owner's Quick match tap opening the picker
(above), and hiding a quick match whose team left the roster rather than
fixing the scoring page for it. The date line, the draft empty state, the
guest panel, and the History row go past the ticket's list, but each points
at a next tap. The live row's facts line resembles the console masthead's
but counts different things.
