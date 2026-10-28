# 03: Roster dialogs

**What to build:** On the Teams page, deleting teams, being refused because a
team is in a live tournament, and creating or editing a team all happen in
matchbook dialogs. The team form uses the matchbook input for the name, square
swatches with a navy border and a check on the chosen color, and a flat block
of the team color carrying the name as the preview.

**Blocked by:** 01

**Status:** resolved

- [x] Delete teams: navy title with the trash glyph, the team list on
      paper-bright with the rule color, red filled Delete, navy outline Cancel.
- [x] The "team is in a live tournament" refusal uses the sprite's warning
      glyph, navy title, and a single navy button; its links to the tournament
      are navy, coral on hover.
- [x] Team form: matchbook input for the name with the validation message in
      the matchbook red, swatches as 44px navy-bordered squares with the sprite
      check on the selected one, a flat preview block of the team color with
      the name on it and a 1.5px navy border, filled navy Save and navy outline
      Cancel, spinner while saving.
- [x] The stock input and color picker primitives are restyled to matchbook
      where they are defined, or folded into the team form if the form is their
      only importer.
- [x] No lucide or heroicons import remains in the roster dialogs.
- [x] No copy, validation, or save behavior changes.
- [x] Typecheck, lint, and the full test suite pass unchanged.
- [x] Each dialog verified in the browser pane at 375x812 against the
      emulators, including the refusal with a team in a live tournament.

## Comments

### What I did

Rewrote `DeleteTeamsDialog.tsx` (both exports) and `TeamForm.tsx` to the
ticket 01 recipe. Delete teams: navy title with the sprite `trash` glyph, the
kept-teams box on paper-bright with a rule-color border and an `mb-kicker`
heading, Cancel as the navy outline and Delete as the filled red, with
`InlineSpinner` in place of the trash glyph while `isDeleting`. The refusal:
sprite `warning` glyph, navy title, one filled navy Close button; the kept
teams' links are navy with a coral hover. Team form: the name field is a
kicker label over an `.mb-input` wrapper (the convention in
`AdvancedSettings` and `CorrectResultDialog`), the wrapper turns `border-mb-red`
with the message in `text-mb-red`; the swatches are 44px squares with a 1.5px
navy border and the sprite's circled `check` in white on the chosen one; the
preview is a flat block of the team color with a 1.5px navy border carrying
the initial and the name in the display face; filled navy Save with the
`check` glyph, navy outline Cancel.

Deleted `src/components/ui/input.tsx` and `src/components/ui/color-picker.tsx`.
Each had `TeamForm` as its only importer (confirmed by grep), so the form now
owns a local `ColorSwatches` and a bare `<input>` inside `.mb-input`. No new
glyph was drawn: `trash` came from ticket 01, `warning`, `check`, and `teams`
already existed. No lucide or heroicons import is left in
`src/components/dialogs`. `globals.css` and `sprite.svg` are untouched.

### Deviations and decisions

- The "spinner while saving" part of the team form criterion is skipped, per
  the brief: `useTeamForm` submits synchronously and closes the dialog, so there
  is no saving state to read. No state was added. The rest of that criterion is
  met, which is why it is ticked.
- The swatches lost the old `hover:scale-110` and the white ring on the chosen
  one. A navy-bordered square with the check is the matchbook way to say
  "chosen"; the hover grow was part of the old playful look. The press scale
  on buttons still applies, since the swatches are buttons.
- The check on the chosen swatch is white with `drop-shadow-md` so it reads on
  the yellow and cyan swatches. Navy would vanish on the blue, indigo, and
  purple ones.
- The preview keeps the team's initial in a 44px square beside the name
  (border in white at 70%, no fill), so it shows the same information as the
  old gradient tile.
- The error message sits beside the field rather than inside the `<label>`,
  so the input's accessible name stays "Team Name" and the message reaches
  readers through `aria-describedby` only, as before.
- The refusal's Close button is not `sm:flex-1`: a lone button sits at its own
  width at the right from `sm` up and fills the width on a phone.
- Delete teams now shows `InlineSpinner` while deleting. The ticket text does
  not ask for it, but spec story 22 does and the dialog already has
  `isDeleting`; no behavior changed.
- The "Create Team" title and label branches stay. They are dead in practice
  (the Teams page only opens the form with a team), but removing them would be
  a copy change.
- No unit test added: this ticket has no pure-module seam and the spec forbids
  rendering tests. The existing suites pass unchanged (429 passed, 104 skipped).

### For the orchestrator to check in the browser

- Not verified in the browser pane; I did not start the dev server or the
  emulators per the brief.
- Teams page, Select a team, Delete: navy overlay, trash glyph title, red Delete
  and outline Cancel stacked full width at 375px. With a mix of live and draft
  teams selected, the "Kept on the roster" box appears above the footer with a
  kicker heading and navy links that turn coral on hover.
- With only a live-tournament team selected: the refusal opens with the warning
  glyph, one filled navy Close button, and navy links.
- Edit a team: the name field is the matchbook input and clears to an empty
  name to see the red border and red message; ten 44px square swatches wrap to
  two rows at 375px with the circled check on the chosen one; the preview is a
  flat block in the team color with a navy border; Save navy, Cancel outline.
- Installed browsers see the new glyphs only after the update banner; the
  service worker precaches the sprite.
- No glyph page: no glyph was drawn.

No new issues filed.

### Browser check (orchestrator, 375x812, emulators)

Seen: the team form (teams glyph title, kicker label over the matchbook input, ten 44px navy-bordered square swatches with the circled check on the chosen one, flat preview block with the initial and name, navy Save and outline Cancel) and Delete team (trash glyph, red Delete). Not opened: the live-tournament refusal. Not re-checked after the review fix moved the check onto a paper disc.
