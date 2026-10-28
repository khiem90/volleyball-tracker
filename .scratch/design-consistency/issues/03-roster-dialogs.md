# 03: Roster dialogs

**What to build:** On the Teams page, deleting teams, being refused because a
team is in a live tournament, and creating or editing a team all happen in
matchbook dialogs. The team form uses the matchbook input for the name, square
swatches with a navy border and a check on the chosen color, and a flat block
of the team color carrying the name as the preview.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Delete teams: navy title with the trash glyph, the team list on
      paper-bright with the rule color, red filled Delete, navy outline Cancel.
- [ ] The "team is in a live tournament" refusal uses the sprite's warning
      glyph, navy title, and a single navy button; its links to the tournament
      are navy, coral on hover.
- [ ] Team form: matchbook input for the name with the validation message in
      the matchbook red, swatches as 44px navy-bordered squares with the sprite
      check on the selected one, a flat preview block of the team color with
      the name on it and a 1.5px navy border, filled navy Save and navy outline
      Cancel, spinner while saving.
- [ ] The stock input and color picker primitives are restyled to matchbook
      where they are defined, or folded into the team form if the form is their
      only importer.
- [ ] No lucide or heroicons import remains in the roster dialogs.
- [ ] No copy, validation, or save behavior changes.
- [ ] Typecheck, lint, and the full test suite pass unchanged.
- [ ] Each dialog verified in the browser pane at 375x812 against the
      emulators, including the refusal with a team in a live tournament.
