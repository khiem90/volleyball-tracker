---
status: accepted
---

# RSVP standing is derived from arrival order, not stored

A tournament that takes RSVPs has a capacity, and the people beyond it wait in order. Firestore rules cannot count a collection, so a rule cannot refuse the thirteenth RSVP to a twelve-spot night, and there is no server in this app to do it either (the Firebase project stays on the Spark plan and nothing runs on Vercel's side). We decided that every RSVP is accepted, that the server writes its arrival time, and that whether a person is confirmed or waitlisted is computed on every phone from the list sorted by arrival time against the capacity. Nothing stores a status. The open time is enforced by the rules against the request's server time, and the rules require an RSVP's arrival time to equal the request's time, so no phone's clock takes part in the order.

## Considered options

- A stored `status` field moved by whoever's write caused the change. Rejected: a withdrawal is written by the person leaving, who cannot be allowed to write to someone else's RSVP, so promotion would need a server.
- A Cloud Function triggered on the write. Rejected: it needs the Blaze plan, and the owner does not want to pay.
- A counter on the tournament, incremented by the RSVP write in a batch, that the rules check against capacity. Rejected: two RSVPs at the open instant race on the counter, and the losing phone is refused rather than queued, which is the opposite of a waitlist.

## Consequences

- Promotion is immediate and needs no write. Raising capacity, a withdrawal, or a removal promotes the next person the moment the subscription delivers it.
- Capacity is a display rule, not a write rule. Anyone can be on the list; where they stand is a function of the list. A lowered capacity below the confirmed count is refused by the client, since only the owner can write it.
- Ties on arrival time are broken by document id so every phone computes the same order.
- There is no record of a promotion as an event, so nothing can notify about it beyond the standing changing on the page and on Home. Email, when it comes, will have to compute the same split before and after a change to know whom to tell.
- A test of "who is confirmed" is a pure test over plain documents, and a test of "who may RSVP and when" is a rules test. Neither needs the other.
