# 10: Merge the four confirm dialogs into one component

**Status:** needs-triage

**Type:** task

Filed by the design-consistency spec (ticket 08), which restyled these in
place and left the merge for later.

Four dialogs are the same shape: a title with a leading sprite glyph, a
description, an optional box of extra content, and a footer of Cancel (navy
outline) and one main action (filled navy or filled red) that shows
`InlineSpinner` while busy.

- `src/components/console/ConfirmDialog.tsx` (the generic confirm: scorer-link regenerate, withdraw a team, close a court, discard a quick match, sign out)
- `src/components/shared/DeleteConfirmDialog.tsx` (delete a tournament)
- `src/components/console/EndTournamentDialog.tsx` (end a tournament)
- `src/components/dialogs/delete-teams/DeleteTeamsDialog.tsx` (delete teams, plus the "team is in a live tournament" refusal in the same file)

`ConfirmDialog` already takes a sprite id, a title, a description, button
labels, a `destructive` flag, and a busy state. The other three could become
calls to it (or to one shared `ConfirmDialog` moved under `shared/`), with
the delete-teams dialog passing its kept-teams box as children and the
refusal staying a one-button variant.

Not a restyle, so it waits for its own ticket. Nothing changes in copy, flow,
or what each dialog does on confirm. Each caller is checked in the browser at
375x812 afterwards, since the four open from four different screens.
