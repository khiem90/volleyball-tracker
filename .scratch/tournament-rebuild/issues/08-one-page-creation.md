# 08: One-page creation

**What to build:** Creating a tournament is one page: pick a format, name it, tick roster teams or
add new ones inline, expand advanced settings only if needed, then "Save as
draft" or "Create and start". Both land on the console. The three-step wizard is
removed.

**Blocked by:** 06

**Status:** ready-for-agent

- [x] A tournament can be created and started in six taps or fewer from the Tournaments tab.
- [x] Teams added inline are saved to the roster and ticked.
- [x] Advanced settings (courts, series length, instant win, scoring, terminology) stay hidden until expanded and persist on the tournament.
- [x] Validation rejects an empty name and fewer teams than the format needs, with the reason shown.
- [x] The old wizard and its step components are deleted.

## Comments

**2026-09-25, implementation.** Done on branch `claude/rotation-lab-redesign`.

- `src/lib/creation.ts` is the pure part. `TournamentSetup` is what the
  page collects: name, format, the ticked team ids in tick order (the seed
  order), courts, series length, instant win, standings points, and the
  word for a court. `setupProblems` says why the setup cannot become a
  tournament yet, by field: a blank name, no format, or fewer teams than
  the format needs, counting only teams still on the roster. A rotation
  format on several courts needs two per court, and the message says so in
  the tournament's own word: "Win 2 & Out on 2 fields needs at least 4
  teams." `setupSettings` keeps only the settings the format uses, so a
  best-of chosen before switching to Win 2 & Out is not stored, and turns
  the typed court word into the terminology, lowercased, with its plural.
  `setupInput` builds the `NewTournamentInput` and throws the first
  problem as the guard behind a page that shows them and stops.
- "Create and start" runs the engine here. `buildNewTournament` in
  `src/lib/tournaments.ts` builds the draft and, with `start`, applies the
  engine's start command to it, so the tournament goes out live with its
  first matches and nothing is read back; a phone with no signal can
  create and start a tournament. The engine's refusal (too few teams)
  surfaces before anything is written. `saveNewTournament` writes the
  tournament first in its own write and the matches in one batch after
  it, because the match rules read the stored tournament and a batch's
  `get()` sees the state before the batch; the client sends writes in the
  order they were issued. The provider's `createTournament` takes
  `{ start }` and still hands back the id at once, so the console opens
  straight away for both buttons. A bracket with a team count that is not
  a power of two starts with the lowest seeds playing in; an owner who
  wants to pick them saves a draft and starts from the console, which
  asks.
- The page at `/competitions/new` is the matchbook shell with four
  sections in one column: Format (five radio cards with a line on how each
  plays and its minimum), Name, Teams (the Teams page's add strip above
  the roster as a checklist, 44px rows, with Tick all), and Advanced
  settings behind one disclosure that shows only what the chosen format
  uses: courts and results for the rotation formats, best-of for the
  rest, standings points for Round Robin, and the court word for all.
  Then "Save as draft" beside "Create and start", both 44px. Teams added
  inline go to the roster through `parseTeamNames` and `addTeams` as on
  the Teams page, are ticked, and the new row scrolls into view. Problems
  appear under their field and, so a thumb at the bottom sees them, above
  the buttons, once a create has been tried, and clear as they are fixed.
  From the Tournaments tab: New, a format, the name, Tick all, Create and
  start is five taps.
- Deleted: the wizard's page body, its four step components and the
  advanced settings panel under `components/competitions/new/`, and
  `useNewCompetitionPage`. Nothing else imported them; every link to
  `/competitions/new` still lands on the new page.
- Tests: `src/__tests__/creation/creation.test.ts` (6 tests) drives the
  pure module: the untouched page's problems, the minimum per format, the
  per-court minimum in the tournament's own word, a ticked team that has
  left the roster, the input's tick order and per-format settings, and
  the guard. `tournaments.test.ts` gains three emulator tests: create and
  start writes a live round robin with its six matches, stamped as
  started when created; a rotation tournament goes out with its format
  state and one match per court, which also shows the ordered writes pass
  the rules; a start the engine refuses rejects with nothing written.

Verified against the emulators in the browser with the account already
signed in there, on the dev server another session left on port 3000,
since this session's own server could not take Next's lock on
`.next/dev`. Tapping Create and start on the untouched page showed "Pick a
format." and "Give the tournament a name." under their fields and together
above the buttons. Round Robin, "Tuesday night", two teams ticked showed
"Round Robin needs at least 3 teams."; typing "Diggers" and Enter in the
add strip put it on the roster ticked, made three ticked, and cleared the
reason. With Best of 3 and "field" typed under Advanced settings, Create
and start opened the console on the live tournament with three matches in
tick order, the courts tab titled "Fields", and Settings showing "1 field"
and "Best of 3". Win 2 & Out on 2 courts with instant win and three teams
showed "Win 2 & Out on 2 courts needs at least 4 teams."; Tick all made
four and cleared it; Save as draft opened the draft's console with Start
offered, "2 courts", and Instant win on. At 375px the page is 375px wide
with no horizontal scroll, the format cards, team rows, disclosure, and
both buttons are 44px or taller, and the add strip's buttons are the
matchbook 39px ticket 18 raises. Typecheck, `eslint src` (0 errors, 13
pre-existing warnings), and the full suite (278 tests) pass with the
emulators up.

Things seen and left alone: the dark-mode hydration error that ticket 18
removes. The Firestore emulator running since the 23rd stopped answering
during the first full-suite run, at 4.5 GB on a 16 GB machine; it was
restarted (`npm run emulators`, detached), which discards emulator data,
and the suite passed on the fresh one. One boundary: a name typed in the
add strip that is already on the roster is reported, as on the Teams
page, rather than ticked.

**2026-09-25, review.** A two-axis review (standards and spec) ran on the
staged change. The spec axis confirmed the five-tap path, inline add and
tick, collapsed settings that persist, validation that agrees with the
engine, and the wizard's removal. What changed after it:

- The "needs at least N teams" message is worded once, in
  `minimumTeamsMessage` in `src/lib/formats.ts`, and the engine's refusal
  now carries the courts clause too: "Win 2 & Out on 2 courts needs at
  least 4 teams."
- `setupSettings` said settings the format does not use are not stored,
  but let standings points through for every format; they are now put
  back to their defaults outside Round Robin, and one `settingsUsedBy`
  map drives both that and which fields the advanced panel shows. The
  court word's fallback and plural live in one `courtTerminology`, which
  the panel reads too, and a pitch now has pitches.
- `addTeamsFromText` moved to the provider, so the Teams page hook and
  the creation hook share it; `messageOf` moved to `src/lib/utils.ts`
  for the console and creation hooks; `createdMatches` in the engine's
  writes module picks created matches out of writes for both callers in
  the tournaments module.
- `byeTeamIds` had no caller and is gone from `CreateTournamentOptions`;
  `buildNewTournament` and `NewTournament` are `buildTournamentToSave`
  and `TournamentToSave`, since what differs from `buildTournament` is
  the matches to save.
- The two buttons sit side by side at every width, as story 26 says,
  with less padding. Measured in the browser at the 343px content width
  of a 375px phone, each is 168px by 44px and "Create and start" fits
  even in the wider fallback font, and the compiled stylesheet carries
  the utilities used.
- An error from a refused write now clears on the next edit rather than
  waiting for the next attempt.
- The list page's "New Competition" button and empty-state links say
  "New Tournament", the glossary's word.
- Test names lost their colons and the input test is three.

Left as they are: every problem shows beside its field and again above
the buttons, on purpose, so a thumb at the bottom of a phone sees it; and
"Create and start" lets the lowest seeds play in for a bracket whose team
count is not a power of two, where the console's Start asks which teams
do, so an owner who wants to choose saves a draft first. Recorded for a
follow-up, since it is a rules change: the tournament and its matches go
out as two writes that are not atomic, because the match create rule's
`get()` sees the state before a batch; `getAfter()` would let one batch
carry both. The emulator restart signed the browser session out, so the
button change was checked by measurement rather than by a second
walkthrough.
