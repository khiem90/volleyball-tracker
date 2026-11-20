# 02: RSVP to a list as a person

**What to build:** A signed-in person with the link RSVPs to a by-person list
under a name they choose, with an optional note. Before the open time the page
counts down and the button is disabled. At the open time the button works for
everyone at once, judged by the server. Past capacity a new RSVP joins the
waitlist in arrival order and moves up on its own (ADR-0004). A person can
change their name or note without losing their place, withdraw until the
scheduled time, and RSVP again to the back of the line. Once the scheduled time
passes, by the server's clock, the list is over and the page is read-only. This
is the RSVP page that exists for tournaments today, working for a list.

Covers spec stories 15 to 17, 19 to 28, 30, 45, 94, and 95.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] RSVPs are stored under the list with the account's uid as the document id and the fields an RSVP has today.
- [ ] The rules accept an RSVP from a real account as itself, with valid fields and the server's time as its arrival time, while the link is on, the list is not closed, and the request's time is at or after the open time and before the scheduled time. Rules tests cover each refusal, with times seeded relative to the test's clock.
- [ ] The rules let an account change its own name and note and never its arrival time or uid, and let it withdraw before the scheduled time and not after. Rules tests cover each.
- [ ] The rules let the owner and any real account with the link on read the RSVPs.
- [ ] The pure page state for a list is one of: link off, not open yet, open, full, closed, and over. Pure tests cover each combination of link, closed, and now against the two times.
- [ ] The split into confirmed and waitlisted, the standing, the countdown, the time labels, and the refusal messages are reused unchanged, and a refusal reads as "not open yet", closed, over, or link off as the case is.
- [ ] The page shows the two sections by name, the viewer's standing, and the RSVP dialog with the name prefilled from the account's last RSVP. A second tap edits, with Withdraw in the footer.
- [ ] The owner can RSVP to their own list from the same page.
- [ ] A data-module test on the emulator lands two accounts at the same moment on a capacity-one list in server order, promotes the second when capacity goes up, and puts a withdrawn account behind when it RSVPs again.
- [ ] The tournament RSVP page still passes its existing tests.
