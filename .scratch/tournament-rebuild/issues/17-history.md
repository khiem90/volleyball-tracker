# 17: History

**What to build:** History lists completed tournaments and past quick matches from one account-wide
match query, opens a completed tournament read-only, and keeps the ledger,
filters, and CSV export.

**Blocked by:** 06, 14

**Status:** ready-for-agent

- [x] Completed tournaments and quick matches appear, newest first, and each opens.
- [x] The ledger lists matches across all tournaments and quick matches with the existing filters.
- [x] CSV export downloads the filtered ledger in every supported browser.
- [x] Elimination tournaments are labelled by their real format.

## Comments

**2026-09-27, implementation.** Done on branch `claude/rotation-lab-redesign`.

- `src/lib/history.ts` is History's pure part. It works from the one
  account-wide match query the provider already runs. `historyItems` gives
  the completed tournaments and the quick matches with a result, newest
  first. A tournament row carries its format's name, so a bracket says
  Single Elimination or Double Elimination. The pre-rebuild summaries page
  fell through to "Session" for both. The row also carries the teams
  entered, the matches played with byes left out, and the winner as the
  entries named it. A tournament the owner ended has no winner. A quick
  match row names its teams from the roster. Every row opens: a tournament
  its console, read-only now, and a quick match its own page. A quick match
  whose team has left the roster is left out, as on Home, because its page
  shows "Match not found".
- The ledger. `ledgerRows` gives every result from live and completed
  tournaments and from quick matches, newest first. Byes are left out and
  forfeits stay, marked Forfeit. A tournament match names its teams as the
  tournament shows them, so a completed one keeps its names. A match whose
  tournament is gone is left out. A quick match whose team has left the
  roster stays, that team reading "Deleted team", with nothing to open.
  `filterLedger` keeps the page's three filters: tournament or quick
  matches, team, and search. Search also matches the day heading, so
  "July" finds July's results. That answers story 84's "who beat whom in
  July" without a new control. The filter options come from what the
  ledger holds, not every roster team and tournament, and a deleted team
  gets no option. `ledgerDays` heads the rows by local day.
- Home's `recentResults` is now the ledger's rows less forfeits and rows
  that cannot open, cut to five. It had repeated `ledgerRows` nearly line
  for line. Home's tests pass unchanged.
- CSV. `ledgerCsv` writes what the filters show, all of it, not only the
  rows on screen. Dates and times are local. The old export wrote UTC,
  which put an evening's matches on the next day. Every cell is quoted, and
  a team name starting with = + - or @ gets an apostrophe so a spreadsheet
  keeps it as text. Excel shows that apostrophe, which seemed a fair price
  for a name like "+1" not turning into a formula error. A forfeit has no
  score and names the team that forfeited. A best-of adds the games each
  team won beside the deciding game's points. The file starts with a byte
  order mark so Excel reads accented names as UTF-8, and is named
  `history-YYYY-MM-DD.csv`.
- Saving the file, in `src/lib/saveFile.ts`. The old export clicked a link
  that was never in the document and revoked its URL straight away. Safari
  and Firefox read the file after the click returns, so the revoke could
  cancel the download, and older Firefox ignores a detached link. The link
  now goes in the document and the URL lives a minute. In an iPhone home
  screen app (`navigator.standalone`) that can share files, the export
  opens the share sheet, whose Save to Files keeps it, because a download
  there can open over the app with no way back. `saveMethod` makes that
  choice and is tested with plain host objects, in the shape of
  `fullscreenSupported`.
- The page at `src/app/(shell)/summaries/page.tsx`. A History masthead with
  counts, then Tournaments & quick matches, then the Ledger with its
  filters, Export CSV, and Clear filters once a filter is set. From `lg` up
  the two panels sit side by side. The lists show 10 and 25 rows with Show
  more. A ledger row is the console's `MatchRow` and opens where the match
  was played. The page waits for the roster, tournaments, and matches, so
  it no longer flashes "No results" while they load.
- Dropped: the Match Report, Archive Summary, and Top Matchups panels and
  `useMatchbookHistory`. Picking a ledger row filled a report that sat a
  long scroll below on a phone, so the tap looked dead. Rows open their
  match instead. The summary and matchup rows went nowhere, the complaint
  the spec makes about the old Home, and the spec's History line names the
  lists, the ledger, the filters, and the export. "Match Archive" also used
  a word the glossary avoids.
- The console's back link on a completed tournament says History and goes
  there, since the Tournaments list no longer shows it.
- Shared on the way: Home's `LoadError` became `PanelError` and its row
  classes `PANEL_ROW`, both in `Panel.tsx`. `plural` moved to
  `src/lib/utils.ts` with an optional plural form. The test helpers
  `withId` and `together` moved to `src/__tests__/engine/helpers.ts`.
- Tests. `src/__tests__/history/history.test.ts` (24 tests) drives the pure
  module with engine-built worlds, like the Home and console tests. It
  covers the list's order and where rows open, the elimination labels,
  byes, winners as the entries named them, an ended rotation tournament,
  and the quick match rules. For the ledger it covers scope, names,
  forfeits, deleted teams, gone tournaments, each filter and the day
  search, the options, and day headings across midnight. For the export it
  covers the CSV lines, a forfeit, a best-of, quoting, the formula guard,
  and the file name. Its dates are built from local times so it passes in
  any time zone. `saveFile.test.ts` (4 tests) covers the share or download
  choice. Like 06, 15, and 16, this is a pure module seam beside the two
  that Testing Decisions names.

Verified against the emulators in the browser pane on the dev server
another session left on port 3000, at 127.0.0.1, with the emulator account
signed in there. Next 16 locks `next dev` to one instance per folder, so
this session could not start its own. At 375x812 I created "History single",
a four-team Single Elimination. I scored Blockers over Chasers 3 to 1 and
withdrew Eagles and then Blockers, so Aces went through twice by forfeit
and the bracket completed with Aces as winner. The console's back link
read History. I created "History double", a Double Elimination, and
withdrew Falcons. History showed its forfeit in the ledger while the
tournament stayed off the list. I ended it from Settings. The list then
read, newest first, History double "Double Elimination • 4 teams • 1 match"
with no winner, History single "Single Elimination • 4 teams • 3 matches"
with "Winner: Aces", Home check courts (Win 2 & Out), Shell check (Round
Robin, Winner: Aces), and the quick match Aces 3 to 1 Blockers. A tap on a
tournament row opened its console read-only, with controls left only in
Settings for the spectator link, Duplicate, and Delete. The quick match
opened Completed at 3 to 1. A ledger row opened its tournament's console.
The tournament filter cut the ledger to History single's 3 of 9, team
Chasers with search "SHELL" to 2, and Clear filters brought all 9 back.
For the export I stubbed the link's click from the page console so nothing
downloaded, then read the file it would have saved. It was
`history-2026-09-27.csv`, type `text/csv`, starting EF BB BF, CRLF lines,
the header and exactly the 2 filtered rows with local times. The link was
in the document when clicked and gone after, and the file was still
readable after the click. The page was 375px wide with no sideways scroll,
and all 18 controls were 44px or taller. At 1280px the panels sat side by
side. A fresh load of History and Home logged no errors. Typecheck,
`eslint src` (0 errors, 13 pre-existing warnings), and the full suite (518
tests) pass with the emulators up.

Not checked on a device. The share sheet path needs an iPhone home screen
app, and the pane is desktop Chrome, so only the download path ran. If an
iPhone home screen app lacks file sharing (before iOS 15), or `share()`
fails with anything but a cancel, the export falls back to the download.

Things seen and left alone. Firestore logged "INTERNAL ASSERTION FAILED
(ca9)" and "Failed to read the scorer key" while I created and withdrew in
History double, and the first Falcons withdrawal failed with it. That is
the task ticket 16 filed. An ended bracket's Courts tab still lists its
unplayed semi-final under "Up next". History still lives at `/summaries`,
a word the glossary avoids. The test tournaments History single and
History double stay in the emulator account.

**2026-09-27, review.** A two-axis review (standards and spec) ran on the
staged change. What changed after it:

- "side" for a team, which the glossary avoids and which clashes with the
  bracket's side, became `teamWithId` and "each team".
- `recentResults` is built on `ledgerRows` instead of repeating it, and
  Home's result label uses `playedIn`.
- The test helpers `withId` and `together` and the row classes are shared
  rather than copied, and the console's back link is one link.
- Names: `PastTournament` and `PastQuickMatch` became `CompletedTournament`
  and `CompletedQuickMatch`, `at` became `completedAt`, a tournament's
  `teams` count became `entered` (Home's `teams` counts the teams still
  in), and `ItemsPanel` became `CompletedPanel`. `DELETED_TEAM` and
  `dayLabel` are no longer exported.
- Several deleted teams each gave the team filter a "Deleted team" option.
  A deleted team now gets none.

Left as judgement calls: the tournament filter's value stays a string with
a "quick" sentinel, since a select's value is one anyway. Leaving a quick
match with a deleted team off the list, as Home does, rather than fixing
the scoring page for it. The day search, the added CSV columns, Show more,
and the back link go past the ticket's list; each serves a story (84, 85,
82, 58).
