# 04: The owner manages the list

**What to build:** From the console's RSVP tab the owner sees confirmed and
waitlisted in arrival order, removes anyone, adds a held spot by name for
someone without an account (which takes the next place in order), closes the
list early and reopens it while the tournament is a draft, and raises capacity
to watch the waitlist move up. The capacity stepper refuses to go below the
confirmed count and says why. The open time locks once the first RSVP has
arrived and says why. Deleting a tournament with people on the list names the
headcount in the confirmation, and the delete removes the RSVPs.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The console RSVP tab lists the two sections with Remove on each row, an Add held spot form, and Close or Reopen; Reopen is offered only while the tournament is a draft.
- [ ] A held spot is a document with a generated id, `uid` null, `held` true, a name, and a server-written `createdAt`; only the owner creates one, only while draft or live, nobody updates one, and the owner may delete any RSVP at any status; rules tests cover each.
- [ ] The setup problems gain "capacity below the confirmed count" and "open time changed after the first RSVP", tested with plain values; the stepper and the open time field show them and refuse the change.
- [ ] An emulator test through the data layer shows the owner's held spot takes the next place in order and the owner's removal of a confirmed RSVP promotes the first waiting.
- [ ] The delete confirmation names the number of people on the list when it is not zero; deleting a tournament removes its RSVPs in the same cleanup batch as the scorer key and proofs, and an emulator test proves they are gone.
- [ ] The owner can RSVP to their own tournament from the RSVP page like anyone else, and their row shows in the tab.
