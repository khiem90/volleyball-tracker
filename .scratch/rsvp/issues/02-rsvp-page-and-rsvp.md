# 02: The RSVP page and RSVPing

**What to build:** A signed-in person who opens the RSVP link sees the night:
its name, scheduled time, capacity and count, and everyone on the list by name
in arrival order. Before the open time the page counts down over a disabled
button. From the open time, judged by the server, the button opens a small
dialog with the name prefilled from the account's remembered name, then its
display name, and an optional note; confirming puts the person on the list and
remembers the name for next time. A guest is sent to sign in and back to the
page; a phone holding only a scorer-link identity counts as a guest. A link the
owner has turned off shows not found. The list is flat here; who is confirmed
and who waits comes in the next ticket.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A new route under the tournament is the RSVP page; a guest is redirected to sign in with a redirect back, using the existing sign-in href.
- [ ] The rules gain a helper meaning "signed in with a real account", which excludes the anonymous identity a scorer link creates; a rules test proves the anonymous identity is refused everywhere this ticket uses the helper.
- [ ] A signed-in account can read a tournament whose `rsvp.enabled` is true, and cannot once it is false or when signed out; rules tests cover all three.
- [ ] Each RSVP is a document in the tournament's `rsvps` subcollection with the account's uid as its id and `uid`, `name`, `createdAt`, `note` fields; the rules accept a create only from that account, only while the link is on, the tournament is a draft, the list is not closed, and the request's server time is at or past `opensAt`, with keys limited to those fields, a name of one to forty characters, and `createdAt` equal to the request's time.
- [ ] Rules tests seed `opensAt` a minute in the past and a minute ahead of the test's own clock and prove the accept and the refusal, and prove a literal `createdAt` is refused; the emulator test helpers gain whatever this first time-dependent test needs.
- [ ] Any signed-in account can read the RSVPs while the link is on; the owner always can; rules tests cover both and the refusals.
- [ ] The remembered name lives on the account's own `users/{uid}` document under a rule that lets only that account read and write it; a rules test proves another account cannot.
- [ ] The data layer subscribes to a tournament's RSVPs, RSVPs with a name and note, and reads and writes the remembered name; an emulator test through the data layer shows two accounts RSVPing at the same moment both land, delivered in server order.
- [ ] The page's state (link off, not open yet, open, started, completed) is a pure function of the tournament and a "now", tested with plain values; the countdown uses the phone's clock for display only, and a tap the rules refuse for time shows "Not open yet" and keeps counting.
- [ ] The dialog follows the design system's dialog recipe; the page passes the design-system checks at 375px with no horizontal scroll.
- [ ] The README's data layout lists the `rsvps` path and the `users/{uid}` document.
