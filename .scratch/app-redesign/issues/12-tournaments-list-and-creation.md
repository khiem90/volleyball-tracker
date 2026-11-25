# 12: Tournaments list and creation

**What to build:** The owner opens the Tournaments tab and sees their
tournaments as rows in cards, grouped as they are today, each with its format,
a status chip, and its facts. The page's main action starts a new tournament.
Creation walks through the same steps as today on the new cards and controls:
choosing a format, picking teams from the roster with their marks, importing
from an RSVP list, and the advanced settings.

Covers spec stories 57, 58, 59, and 65.

**Blocked by:** 03, 05, 06

**Status:** ready-for-agent

- [ ] The list shows the same tournaments in the same groups and order as today. Each row has the name, the format, a chip for draft, live, or completed, and its facts.
- [ ] Duplicating and deleting a tournament are reached the same way as today and use the shared menu and dialog.
- [ ] The action that starts a new tournament is the page's green main button.
- [ ] The format picker shows each format as a selectable card with its name and description, with a clear selected state.
- [ ] The team checklist shows each roster team's mark beside its name, and the count of chosen teams.
- [ ] Importing from an RSVP list shows its rows with marks and the same "move to" controls as today.
- [ ] Adding teams by typing names works as today in the new form controls.
- [ ] The advanced settings are grouped in a card with the same options and defaults.
- [ ] The step buttons are the shared buttons, with the forward step in green.
- [ ] The files for the list and for creation contain no old-theme name and are on the guard's list of migrated folders.
- [ ] The creation and tournaments tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has created a tournament of each format on a phone, and what they flagged is fixed.

## Comments
