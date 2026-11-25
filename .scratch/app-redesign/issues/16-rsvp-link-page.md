# 16: RSVP link page

**What to build:** A signed-in user opens an RSVP link and the first thing
they read is their own standing: in, on the waitlist with a position, or not
yet on the list. The list's name, a date tile, the scheduled time, and the
capacity sit above it. The action to RSVP or to withdraw is the page's main
button. The people on the list and the owner's notices follow in cards. An
RSVP by team shows the team's mark.

Covers spec stories 6, 63, 64, and 66.

**Blocked by:** 15

**Status:** ready-for-agent

- [ ] The page shows the same list details as today. The person's standing is the most prominent element, as a large chip or line that is green when they are in.
- [ ] The action to RSVP is the green main button. Withdrawing uses the shared destructive dialog.
- [ ] The RSVP dialog has the same fields and validation as today in the new form controls.
- [ ] The people card shows confirmed RSVPs, the waitlist, and held spots as distinct groups, with marks for teams.
- [ ] Notices show as messages from the owner with their time, newest first as today. An unread notice is marked as today.
- [ ] A list that is not open yet, a full list, a closed list, and a link that is off each show the state they show today, in the new look.
- [ ] A guest is sent to sign in and back, as today.
- [ ] Every RSVP file contains no old-theme name, and the RSVP folders are on the guard's list of migrated folders.
- [ ] The RSVP tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [ ] The owner has opened an RSVP link from a second account on a phone, and what they flagged is fixed.

## Comments
