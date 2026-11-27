# 12: Tournaments list and creation

**What to build:** The owner opens the Tournaments tab and sees their
tournaments as rows in cards, grouped as they are today, each with its format,
a status chip, and its facts. The page's main action starts a new tournament.
Creation walks through the same steps as today on the new cards and controls:
choosing a format, picking teams from the roster with their marks, importing
from an RSVP list, and the advanced settings.

Covers spec stories 57, 58, 59, and 65.

**Blocked by:** 03, 05, 06

**Status:** resolved

- [x] The list shows the same tournaments in the same groups and order as today. Each row has the name, the format, a chip for draft, live, or completed, and its facts.
- [x] Duplicating and deleting a tournament are reached the same way as today and use the shared menu and dialog.
- [x] The action that starts a new tournament is the page's green main button.
- [x] The format picker shows each format as a selectable card with its name and description, with a clear selected state.
- [x] The team checklist shows each roster team's mark beside its name, and the count of chosen teams.
- [x] Importing from an RSVP list shows its rows with marks and the same "move to" controls as today.
- [x] Adding teams by typing names works as today in the new form controls.
- [x] The advanced settings are grouped in a card with the same options and defaults.
- [x] The step buttons are the shared buttons, with the forward step in green.
- [x] The files for the list and for creation contain no old-theme name and are on the guard's list of migrated folders.
- [x] The creation and tournaments tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [x] The owner has created a tournament of each format on a phone, and what they flagged is fixed.

## Comments

- Not applicable, by ruling 1. The list is one group, live then draft, with completed tournaments in History. The page has no menu and no duplicate: delete is the bin button on a row, and it opens the shared delete dialog. Duplicate stays in the console's Settings.
- Not applicable, by ruling 1. Creation has no steps. Its two buttons are "Save as draft" in grey and "Create and start" in green, on a card at the foot.
- The Tournaments page keeps its dashboard of one selected tournament. Its court, schedule, and result rows are the shared score line under a centered label. Nothing here has been seen in a browser.
- Merged on the integration branch `claude/grill-with-docs-redesign-27d048` and through the code review. The one open box is the owner's own look on a phone, so the status is `ready-for-human` until they have had it.
- The owner looked at the app on a phone on 2026-11-27, after the merge, and said it looks good. Nothing was flagged, so the last box is ticked and the ticket is resolved.
