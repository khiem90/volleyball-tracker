# 11: Home

**What to build:** The owner opens the app and sees Home from direction D. The
header block shows the title, today's date, and a full-width green Quick Match
button. Below it are four cards, each with an icon, a title, and a count. Live
tournaments list first, each with a black Resume pill and a green line saying
how many matches are being scored. Your RSVPs show a date tile, the list's
name and scheduled time, a chip with the person's standing, and a flag for an
unread notice. Recent results are row-size score lines with the tournament and
time above each, ending in a link to History. Tools lists the volleyball
rotations tool.

The picture is the left half of
`.scratch/app-redesign/directions/d-matchday.png`.

Covers spec stories 18, 33, and 35 to 41.

**Blocked by:** 03, 05, 06

**Status:** ready-for-agent

- [x] The header block shows "Home", today's date, and the Quick Match button as the main action.
- [x] The live tournaments card lists the same tournaments in the same order as today, each with its facts, a Resume pill, and the count of matches being scored when there is one.
- [x] The RSVPs card lists the same RSVP lists as today, each with a date tile, name, scheduled time, and a standing chip that is green when the person is in. An unread notice shows a bell and "New notice".
- [x] The results card shows the same recent results as today as score lines, with the tournament or "Quick match" and the time above each, and a link to History.
- [x] The tools card links to the volleyball rotations tool.
- [x] A card with nothing to show, a guest, and a signed-in user with no tournaments each see what they see today, in the new look.
- [x] Home's files contain no old-theme name and are on the guard's list of migrated folders.
- [x] The home tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has looked at Home on a phone and on a laptop, and what they flagged is fixed.

## Comments

- The results criterion was open until ticket 09 rebuilt `MatchRow` on the shared score line. A merger saw the rows in the app after that merge, at 390px and 1280px: the winner is bold, the loser is dimmed, and a long name is cut short beside the score. Home's file did not change.
- "Each with a count" is not applicable to Recent results and Tools, which have no count today. Live tournaments and Your RSVPs keep theirs.
- Dropped to match the picture: the chevron in the Resume pill, the chevron after an RSVP's standing, and the court glyph on the tools row. Recent results gains the `history` glyph in its head. A list with no scheduled time shows a calendar glyph on a grey tile where the date tile would be.
