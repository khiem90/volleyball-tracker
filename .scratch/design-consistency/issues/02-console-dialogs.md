# 02: Console dialogs

**What to build:** Every dialog an owner opens from a tournament's console, and
the discard confirm on Quick Match, is matchbook inside as well as out. End
tournament, start tournament with its play-in team picker, correct result, and
the generic confirm used by withdraw, scorer-link regenerate, close court, and
discarding an abandoned quick match all use sprite glyphs, navy titles, muted
body text, matchbook rows and fields, and the right footer buttons.

**Blocked by:** 01

**Status:** resolved

- [x] End tournament: navy title with a sprite glyph, red filled End button,
      navy outline Cancel, spinner while ending.
- [x] Start tournament: navy title with the play glyph, the play-in team rows
      on paper-bright with the rule color for borders, a navy border and light
      navy wash on the selected row, the check glyph from the sprite, a filled
      navy Start button.
- [x] Correct result: the shell matches the recipe and the pencil glyph
      replaces the lucide one; the existing matchbook fields are unchanged.
- [x] The generic confirm takes a sprite glyph id instead of a lucide component,
      and each caller passes one: remove-user for withdraw, a fitting existing
      glyph for scorer-link regenerate and close court, trash for discard.
- [x] The sprite gains play, pencil, and remove-user glyphs in its own style,
      shown beside the icons they replace before being committed.
- [x] No lucide or heroicons import remains in the console or quick-match
      components and pages.
- [x] No copy or confirm behavior changes.
- [x] Typecheck, lint, and the full test suite pass unchanged.
- [x] Each dialog verified in the browser pane at 375x812 against the
      emulators, opened from a live tournament's console and from Quick Match.

## Comments

### What I did

Rewrote `ConfirmDialog` and `EndTournamentDialog` to ticket 01's recipe (plain
`DialogTitle` with a leading `MbIcon`, plain `DialogFooter`, `sm:flex-1`
buttons, `InlineSpinner` while busy). `ConfirmDialog.icon` is now a sprite id
string, default `warning`. The console page passes `swap` for the scorer-link
regenerate, `remove-user` for withdraw, and `court` for close court; Quick
Match passes `trash` for discard, and its abandoned-match row's Discard button
uses the `trash` glyph too, since that was the page's last lucide import.
`StartTournamentDialog` has the `play` glyph in the title and on Start, muted
ink for the picked count and the explanation, and play-in rows on paper-bright
with a rule-color border, 4px radius, a navy border with the 6% navy wash when
picked, and the sprite's circled `check` on the picked row. The row's team
color dot takes the navy border the console's Teams tab gives its dots. The
list container lost its own border since each row now carries one.
`CorrectResultDialog` has the `pencil` glyph in the title and on Save; the
score fields are untouched. Added `play`, `pencil`, and `remove-user` to the
sprite, `manifest.json`, and `preview.html`.

### Deviations and decisions

- End tournament uses the existing `compete` trophy, since the spec's list has
  no stop glyph and `flag` belongs to ticket 04. The same glyph sits on the red
  End button, following the Delete dialog's pattern.
- Start shows the spinner while starting. The ticket does not ask for it, but
  the old button already swapped its label to "Starting...", and the recipe
  pairs that with `InlineSpinner`. No behavior changed.
- `AccountMenu.tsx` got a one-line edit, `icon={LogOut}` to `icon="logout"`,
  because the prop is now a string and the typecheck would fail otherwise. The
  `logout` glyph does not exist until ticket 06 draws it, so the sign-out
  confirm's title and button glyph render as an empty 18px and 14px box until
  then. The menu item's lucide `LogOut` and its import stay for ticket 06.
- No unit test added: the ticket is a restyle with no pure-module seam, and the
  spec forbids rendering tests. The existing suites pass unchanged (429 passed,
  104 skipped).

### For the orchestrator to check in the browser

- Not verified in the browser pane; I did not start the dev server or the
  emulators per the brief.
- From a live console: End tournament (trophy in the title, red End, outline
  Cancel), Regenerate scorer link (swap glyph), Withdraw a team (remove-user
  glyph), Close a court whose match is in play (court glyph), Correct a result
  (pencil glyph, the score fields as before). All titles navy, overlay navy,
  buttons stacked full width at 375px with the main action on top.
- From a draft single or double elimination tournament with 5, 6, or 7 teams:
  Start tournament with the play-in picker. The picked rows should read as a
  navy frame on a light navy wash with the circled check; the others as a
  faint rule-color frame. The circled check is a decision the sprite note
  flagged; say so if a bare tick would look better.
- From Quick Match with an abandoned match: the Discard confirm (trash glyph),
  and the trash glyph on the row's Discard button.
- The sign-out confirm (only reachable with unsynced changes) shows no glyph
  until ticket 06 lands.
- Installed browsers see the new glyphs only after the update banner; the
  service worker precaches the sprite.
- Glyph page: `.scratch/design-consistency/glyphs/02-console-dialogs.html`.

No new issues filed.

### Browser check (orchestrator, 375x812, emulators)

Seen: End tournament (compete glyph, red End, outline Cancel) and the generic confirm for Regenerate scorer link (swap glyph, red Regenerate). Both at 44px under the navy overlay with navy titles. Not opened: Start, Correct result, Withdraw, Close court, Discard; they share the shell and the review read their code.
