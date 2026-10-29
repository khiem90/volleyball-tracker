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

**Status:** resolved

- [x] The console RSVP tab lists the two sections with Remove on each row, an Add held spot form, and Close or Reopen; Reopen is offered only while the tournament is a draft.
- [x] A held spot is a document with a generated id, `uid` null, `held` true, a name, and a server-written `createdAt`; only the owner creates one, only while draft or live, nobody updates one, and the owner may delete any RSVP at any status; rules tests cover each.
- [x] The setup problems gain "capacity below the confirmed count" and "open time changed after the first RSVP", tested with plain values; the stepper and the open time field show them and refuse the change.
- [x] An emulator test through the data layer shows the owner's held spot takes the next place in order and the owner's removal of a confirmed RSVP promotes the first waiting.
- [x] The delete confirmation names the number of people on the list when it is not zero; deleting a tournament removes its RSVPs in the same cleanup batch as the scorer key and proofs, and an emulator test proves they are gone.
- [x] The owner can RSVP to their own tournament from the RSVP page like anyone else, and their row shows in the tab.

## Comments

- 2026-10-28: Implemented test-first on the integration branch `claude/rsvp` (8178ff7, f2f27e2). Code-review fixes landed in 1c65ff8..f4ca321. All acceptance boxes ticked, and the full suite (783 tests) passes against the emulator.
