# RSVP

Status: ready-for-agent

Agreed in a grilling session on 2026-10-28. Vocabulary is in `CONTEXT.md` under
"RSVP". The structural decision, deriving confirmed and waitlisted from arrival
order instead of storing it, is recorded as ADR-0004.

## Problem Statement

I set up tournament nights ahead of time and I need to know who is coming. Today
that happens in a group chat: I post the night, people reply, I count replies,
someone drops out in a later message that gets buried, and on the night the
count is wrong. There is no cap, so when fourteen people say yes to a
twelve-player night I am the one telling two of them they are out. People who
asked first and people who asked last look the same in the chat. When the time
moves I post again and hope everyone scrolls back far enough.

The app knows every tournament I run but nothing about who is playing in it
until I build the teams, and it has no idea when the night is.

## Solution

Any tournament, in any format, can take RSVPs. When I create it, or later from
its console, I give it a scheduled date and time, a capacity, and an open time,
and turn the RSVP link on. I paste the link into the chat once.

Anyone who opens the link signs in and sees the night: its name, when it is,
how many spots, who is in, and who is waiting. Before the open time they see a
countdown and a disabled button. At the open time the button goes live for
everyone at the same instant, judged by the server, so nobody gets ahead by
setting their clock forward. Tapping it puts them on the list under a name they
choose. Once the capacity is reached, new RSVPs join a waitlist in arrival
order. Anyone can withdraw until the tournament starts, even after I close the
list, and the first person waiting moves up on their own, with no action from
me.

I can raise the capacity any time and watch the waitlist move up. I can close
the list early, reopen it while the tournament is still a draft, add a held
spot by name for someone without an account, and remove anyone. Starting the
tournament closes the list for good.

When something changes I post a notice on the tournament. Everyone who RSVP'd
sees it on the RSVP page and on their Home, marked as new until they open it.
Home also lists the nights each person is in, with their status, so nobody has
to dig up the link again. Once the night starts, the same link lets everyone
who RSVP'd watch the live tournament.

The list is a headcount. It does not create teams or entries; I build the teams
from my roster the way I do now.

## User Stories

### Setting up

1. As the owner, I want to give a tournament a scheduled date and time, so that the RSVP page says what people are saying yes to.
2. As the owner, I want to set a capacity, so that the list stops at the number the courts can take.
3. As the owner, I want to set the open time, so that I can create the night on Monday and let people RSVP from Thursday at 6.
4. As the owner, I want to set all of this on the creation page, so that a night is ready to share the moment it is saved.
5. As the owner, I want to set or change all of this from the console while the tournament is a draft or live, so that a court falling through on the morning of can lower the count I am aiming for.
6. As the owner, I want the open time to lock once the first RSVP arrives, so that I cannot confuse people who already answered.
7. As the owner, I want to be refused when I try to lower capacity below the confirmed count, so that nobody loses a spot to a number stepper.
8. As the owner, I want this to work the same for every format, so that a Round Robin and a Win 2 & Out night are shared the same way.
9. As the owner, I want to turn the RSVP link on and off, so that a night I am not sure about yet stays private.
10. As the owner, I want to enter times in my own time zone, so that "7 PM" means my 7 PM.
11. As the owner, I want a draft without a scheduled time or open time to refuse to turn the link on, so that I cannot share a page that cannot say when.

### Answering

12. As a signed-in person with the link, I want to see the night's name, scheduled time, capacity, and the list before it opens, so that I know whether I want in.
13. As a signed-in person with the link, I want a countdown and a disabled button before the open time, so that I know when to come back.
14. As a signed-in person, I want the button to work at the open time for everyone at once, judged by the server, so that nobody can jump the line with their phone's clock.
15. As a signed-out person with the link, I want to be sent to sign in and back to the RSVP page afterwards, so that the link works from a cold start.
16. As a person who opened a scorer link earlier on this phone, I want that silent identity not to count as signed in for RSVP, so that my RSVP is tied to my account and not to a phone.
17. As a person RSVPing, I want to enter the name the owner will see, prefilled from my account, so that "Dan from Tuesdays" shows as that and not as an email address.
18. As a person RSVPing again later, I want my name remembered, so that I type it once.
19. As a person RSVPing, I want an optional short note, so that I can say I am arriving thirty minutes late.
20. As a person RSVPing when the night is full, I want to go on the waitlist and see my position, so that I know how likely I am to play.
21. As a person on the waitlist, I want to move up on my own when someone drops or the owner adds spots, so that a freed spot is never a race to refresh.
22. As a person on the list, I want to withdraw until the tournament starts, even after the owner closed the list, so that getting sick on Friday morning frees my spot.
23. As a person who withdrew, I want to RSVP again while the list is open and go to the back of the line, so that changing my mind is possible and fair.
24. As a person on the list, I want to change my name or note without losing my place, so that fixing a typo does not cost me a spot.
25. As a person on the list, I want to see who else is in and who is waiting, by name, so that I know who I am playing with.
26. As a person on the list, I want my email never shown or stored, so that the names list can be visible without leaking addresses.
27. As a person who RSVP'd, I want the same link to show me the live tournament once it starts, so that I can watch standings from the bench without a second link.
28. As a person who RSVP'd, I want the page to tell me the tournament is completed once it ends, with the list read-only, so that the link does not look broken afterwards.
29. As a person opening the link to a tournament whose RSVP link is off, I want "not found", so that a withdrawn link reveals nothing.
30. As the owner, I want to RSVP to my own tournament like anyone else, so that my own spot counts.

### Managing the list

31. As the owner, I want the console to show the list with confirmed and waitlisted sections, in arrival order, so that I can see the night at a glance.
32. As the owner, I want to remove anyone from the list, so that a no-show from last week does not take a spot.
33. As the owner, I want to add a held spot by name for someone without an account, so that my walk-in friend counts against capacity.
34. As the owner, I want a held spot to take its place in arrival order like any other RSVP, so that the list stays honest; if I want that person in a full night, I add a spot.
35. As the owner, I want to raise capacity and see the waitlist move up at once, so that a fourth court means two more players without any other step.
36. As the owner, I want to close the list early, so that I can stop new RSVPs on Thursday for a Friday night.
37. As the owner, I want to reopen a closed list while the tournament is a draft, so that a change of plan does not need a new tournament.
38. As the owner, I want starting the tournament to close the list, so that the count is final once play begins.
39. As the owner, I want deleting a tournament to tell me how many people have RSVP'd and ask first, so that I do not vanish a night people are counting on by accident.
40. As the owner, I want duplicating a tournament to carry its capacity but not its times or its list, so that next week's night starts from the right number and an empty list.

### Notices

41. As the owner, I want to post a notice on the tournament, so that "we moved to 7:30" reaches everyone who RSVP'd.
42. As a person on the list, I want notices on the RSVP page, newest first, so that I see what changed.
43. As a person on the list, I want a new notice marked on Home until I open the page, so that I do not miss a change I did not go looking for.
44. As a person on the waitlist, I want notices too, so that I know about a time change before I am promoted.
45. As the owner, I want to delete a notice I posted by mistake, so that a wrong message does not stay up.

### Home

46. As a signed-in person, I want Home to list the upcoming tournaments I RSVP'd to with my status, so that I find the page again without the chat.
47. As a signed-in person, I want each Home row to show the scheduled time and whether I am in or waiting and at what position, so that one glance answers "am I playing Friday".
48. As a signed-in person, I want tournaments I withdrew from off that list, so that it shows only what I am part of.

### Developer

49. As a developer, I want the open time enforced in the Firestore rules against the server's clock, so that the fairness promise does not depend on any phone.
50. As a developer, I want arrival order written by the server, so that two RSVPs at the open instant have a definite order no client chose.
51. As a developer, I want confirmed and waitlisted derived from arrival order and capacity rather than stored, so that promotion needs no server and cannot drift from the truth.
52. As a developer, I want the rules tests to prove who can RSVP, when, and what they can touch, so that the access promises are tested where they live.
53. As a developer, I want the engine untouched, so that nothing about formats changes.
54. As a developer, I want no server-side code in this feature, so that the app stays a browser talking to Firestore under the rules.

## Implementation Decisions

### What a tournament gains

A tournament gets an optional `rsvp` map and an optional `scheduledAt`.

- `scheduledAt` is an epoch-millisecond number, like every other timestamp on
  the document, and `scheduledZone` is the IANA zone the owner set it in, so
  a viewer in another zone can be shown the owner's wall-clock time next to
  their own.
- `rsvp` holds `enabled`, `capacity`, `opensAt` (epoch milliseconds), and
  `closed`. A tournament created before this feature has neither field and
  behaves as if `enabled` were false.
- The owner writes these through the same field-update path a rename uses,
  with a fresh revision carrying `basedOn`, so they obey ADR-0003 like every
  other owner write. The scorer's allowed-keys list does not include them,
  so a scorer cannot touch them.
- "RSVPs are open" is derived: `enabled`, not `closed`, status is draft, and
  the server's time is at or past `opensAt`. Starting a tournament does not
  need to set `closed`, because leaving draft closes the list by definition.
- Turning `enabled` on requires `scheduledAt` and `opensAt`; the client
  refuses otherwise, and the rules refuse an `enabled` tournament with
  either missing.

### RSVPs

Each RSVP is one document in an `rsvps` subcollection under the tournament.

- A person's RSVP has the person's uid as its document id, so one account
  holds at most one RSVP per tournament and a withdrawal is a delete.
- Fields: `uid`, `name`, `createdAt`, `note`, `noticesReadAt`. `createdAt`
  is the server timestamp, and the rules require the written value to equal
  the request's time, so no client can choose its own arrival order.
- A held spot is a document with a generated id, `uid` null, `held` true,
  the name the owner typed, and the same server-written `createdAt`.
- Changing name or note updates the document without touching `createdAt`,
  so the person keeps their place. RSVPing again after a withdrawal is a
  new create with a new `createdAt`, which is the back of the line.
- `noticesReadAt` is written by the RSVP's own account and nobody else; it
  is what Home compares against the newest notice to decide "new".

### Arrival order decides confirmed and waitlisted (ADR-0004)

Firestore rules cannot count a collection, so capacity cannot be enforced at
write time. Instead, every RSVP is accepted and the list is sorted by
`createdAt`; the first `capacity` entries are confirmed and the rest are the
waitlist, in order. Nothing stores a status. A withdrawal, a removal, or a
raised capacity changes who falls in the first `capacity` the moment the
subscription delivers it, which is the promotion. There is no server, no
function, and nothing to get out of sync.

Ties on `createdAt` at the open instant are broken by document id, so the order
is total and the same on every phone.

### Rules

- Reading the tournament and its matches gains a third door next to the owner
  and the spectator flag: a signed-in, non-anonymous account may read when
  `rsvp.enabled` is true. The anonymous check uses the token's sign-in
  provider, because the existing `signedIn()` helper passes the silent
  identity a scorer link creates.
- Creating an RSVP requires that same kind of account, a document id equal to
  the caller's uid, `uid` equal to the caller's uid, the tournament's RSVPs to
  be open as defined above with `opensAt` compared to the request's time, the
  keys limited to the RSVP's fields, a name between one and forty characters,
  and `createdAt` equal to the request's time.
- Updating an RSVP: its own account may change `name`, `note`, and
  `noticesReadAt` only; `createdAt` and `uid` never change.
- Deleting an RSVP: its own account while the tournament is a draft, or the
  owner at any time.
- Held spots: only the owner creates them, only while the tournament is a
  draft or live, with `held` true and `uid` null; nobody updates them.
- Reading RSVPs: the owner, or any signed-in non-anonymous account while
  `rsvp.enabled` is true. A wildcard collection-group rule lets a signed-in
  account read an RSVP whose `uid` is their own, which is what Home queries.
- Notices live in a `notices` subcollection with `body` and `createdAt`.
  Only the owner creates or deletes them, and they are readable by whoever
  can read the RSVPs.
- Deleting a tournament deletes its RSVPs and notices in the same cleanup
  batch that already removes the scorer key and the proofs.
- The locked open time and the capacity floor are client-side checks. Only
  the owner can write those fields, so the rules do not need to repeat them.
- The collection-group query on `rsvps` by `uid` needs an index entry; it
  goes in the indexes file next to the matches one.

### The remembered name

The account's RSVP name is stored on the account's own `users/{uid}` document,
which until now had no fields of its own, under a rule that lets only that
account read and write it. The RSVP form prefills from it, then from the
account's display name, then blank.

### Pure module

A pure `rsvp` module, with no Firestore in it, owns the derivations so they can
be tested with plain values:

- the list split into confirmed and waitlisted with positions, from the RSVP
  documents and the capacity, including tie-breaking;
- the page state from the tournament and a "now": link off, not open yet
  (with the open time), open, full with waitlist, closed by the owner,
  started, completed;
- a person's standing from the list and their uid: not on the list, confirmed,
  waitlisted at position n;
- the problems with an RSVP setup (missing scheduled time, missing open time,
  open time after scheduled time, capacity below one, capacity below the
  confirmed count, open time change after the first RSVP), used by both the
  creation page and the console;
- the RSVP link, which is the tournament's RSVP page URL with nothing secret
  in it, next to the existing spectator and scorer link helpers;
- the Home rows: the tournaments a person has RSVP'd to that are not
  completed, each with scheduled time, standing, and whether there is an
  unread notice.

### Data layer

An `rsvp` data module beside `sharing`:

- subscribe to a tournament's RSVPs and notices;
- RSVP as the signed-in account with a name and optional note; update name
  and note; withdraw;
- mark notices read;
- owner actions: set RSVP settings, add a held spot, remove any RSVP, post
  and delete a notice;
- subscribe to the signed-in account's RSVPs across tournaments and to the
  tournaments they point at, for Home;
- read and write the account's remembered name.

A refused RSVP write is read back the way a refused scorer write is: the
client re-reads the tournament to tell "not open yet" from "closed" from
"link off" and shows the matching line.

### Creation page

The creation page gains an RSVP section under advanced settings: a toggle,
a capacity stepper, a scheduled date and time, and an open date and time.
Date and time use the browser's native date-time input, since the app has no
date input of its own, styled with the matchbook field classes. The setup
problems list grows to cover the RSVP fields, and the existing first-problem
display shows them.

Times entered are local wall-clock in the device's zone, converted to epoch
milliseconds, and the device's IANA zone is stored as `scheduledZone`.

### Console

- Console access gains `canManageRsvp`, true for the owner while the
  tournament is a draft or live.
- The console gets an RSVP tab, shown to the owner whenever `canManageRsvp`
  holds or the tournament has an `rsvp` map, with: the settings (toggle,
  capacity, scheduled time, open time, close and reopen), the RSVP link with
  Copy next to the other two links in Settings, the list in two sections
  with Remove on each row, Add held spot, and the notices with a compose box
  and Delete on each.
- Capacity changes that would go below the confirmed count are refused in the
  stepper with a line saying why. The open time field is read-only once the
  list has an RSVP, with a line saying why.
- The delete confirmation names the number of people on the list when it is
  not zero.
- Duplicate copies `capacity` and nothing else from `rsvp`; the copy starts
  with `enabled` false and no times, and the owner turns it on after setting
  them.

### RSVP page

A new route under the tournament, `/competitions/[id]/rsvp`, is the RSVP link.

- A guest is sent to sign in with a redirect back, using the existing
  sign-in href helper. A phone holding only a scorer-link identity counts as
  a guest here.
- While the tournament is a draft, the page shows the name, scheduled time
  (in the viewer's zone, with the owner's wall-clock time and zone
  abbreviation when they differ), capacity and count, the notices newest
  first, the viewer's standing, the button or the countdown, and the two
  lists by name. The countdown uses the phone's clock for display only; a
  tap the rules refuse for time shows "Not open yet" and the page keeps
  counting.
- The RSVP action opens a small dialog, following the design system's dialog
  recipe, with the name field prefilled and the note field; a second tap on
  an existing RSVP opens the same dialog to edit, with Withdraw in the
  footer.
- Once the tournament is live or completed, the page keeps its header and
  notices and shows a Watch button into the console, which the rules now let
  this account read; the console's link shell shows the Spectator badge for
  that account. The lists stay visible, read-only.
- With the link off, the page shows the same not-found view the console shows
  for a tournament that is not shared.
- Opening the page writes `noticesReadAt` for the viewer's RSVP, if they
  have one, which clears the Home marker.

### Home

Home gains a panel between Live tournaments and Recent results, shown only
when the account has at least one RSVP to a tournament that is not completed:
one row per tournament with its name, scheduled time, the account's standing,
and a "New notice" mark when one is unread. Each row links to the RSVP page.
It is fed by the collection-group query above plus one read per tournament,
and the panel is hidden for a guest.

### Glossary and docs

`CONTEXT.md` already carries the RSVP terms. The README's data layout gains the
`rsvps` and `notices` paths and the `users/{uid}` document. The deploy doc
notes the new index. ADR-0004 records the arrival-order decision.

## Testing Decisions

A good test exercises what a person or a rule can observe: a write accepted or
refused, a subscription delivering a list in a given order, a derived standing
for a given set of documents. Tests do not reach into hooks or components,
because nothing in the repo does; the pure module and the emulator are the
seams.

### Rules (`firestore.rules.test.ts`, emulator)

Following the existing file's shape, with paths spelled out in the test and
seeding through `withSecurityRulesDisabled`:

- A signed-in account reads a tournament and its matches when `rsvp.enabled`
  is on; a signed-out request and an anonymous identity cannot; turning it
  off refuses the account.
- An account RSVPs at or after `opensAt` and is refused before it. This is
  the first time a test depends on the request's time, so the fixture seeds
  `opensAt` relative to the test's own `Date.now()` (a minute in the past
  for the accepting case, a minute ahead for the refusing case) and the
  rules compare `request.time.toMillis()` against it. The emulator's clock
  and the test's clock are the same machine's.
- `createdAt` must equal the request's time; a literal number is refused.
- Document id and `uid` must be the caller's; RSVPing as someone else, an
  anonymous identity RSVPing, RSVPing on a live or completed tournament, on
  a closed list, or with the link off, are refused; extra keys and an empty
  or over-long name are refused.
- The account updates its own name, note, and `noticesReadAt` and cannot
  change `createdAt`, `uid`, or someone else's RSVP.
- The account withdraws while draft and cannot once live; the owner removes
  anyone at any status.
- Only the owner creates a held spot, only with `held` true and `uid` null,
  and nobody updates one.
- Only the owner posts or deletes a notice; readers match the RSVP readers.
- The collection-group read returns an account's own RSVPs and refuses
  another account's.
- The scorer's allowed keys still exclude `rsvp` and `scheduledAt`.
- The owner cannot set `enabled` without `scheduledAt` and `opensAt`.

### Data layer (`tournaments.test.ts` style, emulator)

Through the `rsvp` data module against the real rules:

- Two accounts RSVP at the same moment to a capacity-one tournament; both
  land, the subscription delivers them in server order, and the pure split
  makes exactly one confirmed. Repeating with the capacity raised promotes
  the second without any further write to it.
- A withdrawal by the first promotes the second; the withdrawn account
  RSVPs again and lands behind.
- The owner's held spot takes the next place in order.
- Deleting the tournament removes its RSVPs and notices.
- The Home subscription returns the account's RSVPs across two tournaments
  and drops one on withdrawal.

### Pure module (`rsvp.test.ts`, no emulator)

With plain values, in the style of `home.test.ts` and `console.test.ts`:

- the split for an empty list, under capacity, at capacity, over capacity,
  and with a `createdAt` tie broken by id;
- the page state for each combination of link, `closed`, status, and now
  versus `opensAt`;
- a person's standing in each list shape;
- each setup problem, and no problem for a valid setup;
- the Home rows, including the unread-notice flag and the exclusion of
  completed tournaments;
- `consoleAccess` gains `canManageRsvp` cases in `console.test.ts`;
- the RSVP link in `shareLinks.test.ts`.

## Out of Scope

- Email of any kind. Brevo through a Vercel route is the follow-up for when
  there is a sending domain; the Firebase project stays on Spark and nothing
  runs server-side.
- Teams RSVPing, or forming roster teams and entries from the list.
- Location on a tournament.
- A separate close time; the owner closes by hand or by starting.
- "Maybe" as an answer.
- Plus-ones.
- Changing the open time once the first RSVP has arrived.
- Any notification of the owner when someone RSVPs or withdraws beyond the
  list changing on screen.
- Showing RSVP'd people's emails to the owner. The owner sees names only.
- An Event or Night grouping above tournaments (still out of scope from the
  rebuild spec).

## Further Notes

- The fairness promise is exactly this: the rules refuse an RSVP before
  `opensAt` by the server's clock, and the server writes the arrival time.
  A phone whose clock is wrong sees a countdown that is wrong by that much
  and a refusal that says "not open yet"; it cannot get in early.
- A removed person gets no automatic message. The owner can post a notice
  if one is warranted; that is a conversation, not a mechanism.
- Nothing in this feature changes the engine, the scorer link, or the
  spectator link. The only change to existing rules is the third read door
  and the exclusion of the new fields from the scorer's allowed keys.
- A tournament created before this feature has no `rsvp` map; the console
  tab offers to set it up, and nothing else about such a tournament changes.
