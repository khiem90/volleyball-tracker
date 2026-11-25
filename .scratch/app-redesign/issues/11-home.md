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

- [ ] The header block shows "Home", today's date, and the Quick Match button as the main action.
- [ ] The live tournaments card lists the same tournaments in the same order as today, each with its facts, a Resume pill, and the count of matches being scored when there is one.
- [ ] The RSVPs card lists the same RSVP lists as today, each with a date tile, name, scheduled time, and a standing chip that is green when the person is in. An unread notice shows a bell and "New notice".
- [ ] The results card shows the same recent results as today as score lines, with the tournament or "Quick match" and the time above each, and a link to History.
- [ ] The tools card links to the volleyball rotations tool.
- [ ] A card with nothing to show, a guest, and a signed-in user with no tournaments each see what they see today, in the new look.
- [ ] Home's files contain no old-theme name and are on the guard's list of migrated folders.
- [ ] The home tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has looked at Home on a phone and on a laptop, and what they flagged is fixed.

## Comments
