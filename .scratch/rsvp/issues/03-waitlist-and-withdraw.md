# 03: Waitlist and withdraw

**What to build:** The list splits into confirmed and waitlisted by arrival
order against capacity, and every phone computes the same split (ADR-0004). A
person who RSVPs to a full night lands on the waitlist and sees their position.
Anyone on the list can withdraw until the tournament starts, even after the
owner closed the list, and the first person waiting moves up on their own.
Someone who withdrew can RSVP again while the list is open and goes to the back.
Editing the name or note keeps the person's place. The page shows the viewer's
standing: not on the list, in, or waiting at position n.

**Blocked by:** 02

**Status:** resolved

- [x] A pure function splits RSVP documents into confirmed and waitlisted with positions from `createdAt` and capacity, breaking ties by document id; tests cover empty, under, at, over capacity, and a tie.
- [x] A pure function gives a person's standing from the split and their uid; tests cover each list shape.
- [x] The RSVP page shows the two sections and the viewer's standing, and the page state gains "full, waitlist open".
- [x] A second tap on an existing RSVP opens the same dialog to edit name and note, with Withdraw in the footer.
- [x] The rules let an account update its own RSVP's `name` and `note` only, never `createdAt` or `uid`, and never another account's; rules tests cover each.
- [x] The rules let an account delete its own RSVP while the tournament is a draft and refuse it once live or completed; rules tests cover both.
- [x] An emulator test through the data layer shows a withdrawal by the first of two RSVPs on a capacity-one night promotes the second with no further write, and the withdrawn account RSVPing again lands behind; another shows raising capacity promotes the next person.
- [x] Starting the tournament closes the list without any write to the `rsvp` map, because the page state derives "started" from the tournament's status.

## Comments

- 2026-10-28: Implemented test-first on the integration branch `claude/rsvp` (54e9cb7, b2faecb). Code-review fixes landed in 1c65ff8..f4ca321. All acceptance boxes ticked, and the full suite (783 tests) passes against the emulator.
