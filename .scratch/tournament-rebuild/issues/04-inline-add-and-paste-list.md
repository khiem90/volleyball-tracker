# 04: Inline add and paste list

**What to build:** On the Teams page, typing a name and pressing Enter saves the team and puts the
cursor back in the field. A paste-a-list action adds one team per line. Quick
Add with generated names is removed.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Ten names typed with Enter between them produce ten teams without opening a dialog.
- [x] Pasting five lines adds five teams; blank lines are ignored and names that already exist are reported rather than duplicated.
- [x] Each new team gets a color, and the new row is visible after adding.
- [x] Quick Add and its generated names are gone.

## Comments

**2026-09-23, implementation.** Done on branch `claude/rotation-lab-redesign`.

- The roster panel on the Teams page now starts with an add strip: a name
  field that saves on Enter and keeps focus, an Add button, and a "Paste a
  list" toggle that opens a textarea taking one team per line (Ctrl+Enter
  also submits). A paste with several lines into the single field opens that
  textarea prefilled instead of folding the lines into one name. A status
  line under the strip says what happened, for example "Added 5 teams.
  Already on the roster: Aces, blockers." A refused single name stays in the
  field so it can be corrected. The Add Team dialog button and Quick Add are
  gone; the dialog remains for editing a team's name and color.
- The roster table is now its own scroll area, capped at 60% of the viewport,
  so revealing a new row scrolls the rows rather than the page and the add
  strip stays in place for the next name on a long roster.
- Scope: the ticket is about the Teams page. The creation wizard's "Quick Add
  Team" and the quick match page's "Create a team" still make a single team
  named "Team N" through `addTeams`; ticket 08 deletes the wizard and ticket
  14 reworks quick match. A rejected batch write is logged, as every other
  fire-and-forget write in the app is.
- `parseTeamNames` in `src/lib/roster.ts` is the pure part: it splits lines,
  trims, drops blanks, reports names the roster already has (compared without
  case, and including repeats within the paste), and gives each new team the
  palette color the roster uses least, in palette order on ties. The palette
  moved from the color picker into the roster module as `TEAM_COLORS`.
- `buildRosterTeam` and `saveRosterTeams` split the add into building teams
  with known ids and saving them in one batch write. The context's `addTeams`
  returns the built teams at once and lets the write finish in the background,
  so the page can select and scroll to the last added row without waiting for
  the server; offline the batch lands on reconnect. The creation wizard and
  quick match page still use their single-team quick create through
  `addTeams`; ticket 08 replaces the wizard.
- Tests: `src/__tests__/roster/parseTeamNames.test.ts` covers splitting,
  duplicates against the roster and within the paste, and color assignment;
  `roster.test.ts` gains a batch save test on the emulator. Component tests
  were not added, since the repo has no React testing library; the page was
  checked in the browser instead.

Verified against the emulators in the browser: ten names typed with Enter
produced ten teams, no dialog, field cleared and focused after each. A paste of
nine lines with two blank lines and two existing names ("Aces", "blockers")
added five teams, reported the two, and left the count at 19. Every new team
had a palette color in the Firestore emulator, and the pasted five carried
consecutive `createdAt` values. The last added row was selected, scrolled into
view, and shown in the profile panel. At 390px width the strip wraps without
horizontal overflow. Typecheck, lint, and the full suite (198 tests) pass.
