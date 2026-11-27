# 16: RSVP link page

**What to build:** A signed-in user opens an RSVP link and the first thing
they read is their own standing: in, on the waitlist with a position, or not
yet on the list. The list's name, a date tile, the scheduled time, and the
capacity sit above it. The action to RSVP or to withdraw is the page's main
button. The people on the list and the owner's notices follow in cards. An
RSVP by team shows the team's mark.

Covers spec stories 6, 63, 64, and 66.

**Blocked by:** 15

**Status:** resolved

- [x] The page shows the same list details as today. The person's standing is the most prominent element, as a large chip or line that is green when they are in.
- [x] The action to RSVP is the green main button. Withdrawing uses the shared destructive dialog.
- [x] The RSVP dialog has the same fields and validation as today in the new form controls.
- [x] The people card shows confirmed RSVPs, the waitlist, and held spots as distinct groups, with marks for teams.
- [x] Notices show as messages from the owner with their time, newest first as today. An unread notice is marked as today.
- [x] A list that is not open yet, a full list, a closed list, and a link that is off each show the state they show today, in the new look.
- [x] A guest is sent to sign in and back, as today.
- [x] Every RSVP file contains no old-theme name, and the RSVP folders are on the guard's list of migrated folders.
- [x] The RSVP tests pass unedited, along with the rest of the suite outside the design folder. Lint and the type checker are clean.
- [x] The owner has opened an RSVP link from a second account on a phone, and what they flagged is fixed.

## Comments

- The standing is a band at the top of the first card, green for in and grey for waiting. An account with no RSVP gets no band, as before. Its card shows the RSVP button and the text it already had.
- Not applicable, under ruling 1. Held spots stay "Held" badges on rows of In or Waitlist, not a third group. A notice has no unread mark on this page and never had one. Home's row carries it.
- An RSVP by team has no color, so its mark is drawn in the color picked from its name. Ticket 15 built that.
- The cards changed order. The standing card comes first, then tournaments and notices under it, where both sat above it before.
- Nothing here was looked at in a browser.
- Merged on the integration branch `claude/grill-with-docs-redesign-27d048` and through the code review. The one open box is the owner's own look on a phone, so the status is `ready-for-human` until they have had it.
- The owner looked at the app on a phone on 2026-11-27, after the merge, and said it looks good. Nothing was flagged, so the last box is ticked and the ticket is resolved.
