# Tournament Tracker

A modern web application for organizing and tracking matches, tournaments, and competitions. Features real-time scoring, multiple tournament formats, team management, and cloud-based session sharing.

## Features

### Team Management
- Create and edit teams with custom colors
- Quick bulk-add for rapidly creating multiple teams
- Search and filter teams by name

### Match Scoring
- Real-time score tracking with animated displays
- Quick Match mode for standalone games
- Undo functionality for score corrections
- Fullscreen mode optimized for event displays
- View-only sharing for spectators

### Competition Formats
- **Round Robin** - Each team plays every other team
- **Single Elimination** - Standard bracket tournament
- **Double Elimination** - Winners and losers brackets
- **Win 2 & Out** - Continuous rotation with win streaks
- **Two Match Rotation** - Multi-court format with team rotation

### Tournament Management
- One-page tournament creation: format, name, teams with inline add, and advanced settings, then save as a draft or create and start
- Customizable scoring rules (points for win/tie/loss)
- Best-of series match support
- Multiple court configuration
- Visual brackets and standings

### Account and data
- Roster, tournaments, and matches live in Firestore under the signed-in account
- Offline persistence keeps scoring working without signal
- Google Sign-in and email sign-in

### History
- Complete match history records with filters and CSV export

## Tech Stack

- Next.js 16 / React 19
- TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore)
- Framer Motion
- Radix UI

## Data layout

Everything a signed-in account owns is in Firestore, and the rules in
`firestore.rules` let only that account write it.

| Path | Holds |
| --- | --- |
| `users/{uid}` | The account's own fields: `rsvpName`, the name it last RSVP'd under on a by-person list, and `rsvpTeamName`, the team name it last RSVP'd on a by-team list; only that account can read it |
| `users/{uid}/teams/{teamId}` | The roster |
| `users/{uid}/matches/{matchId}` | Quick matches, with `tournamentId: null` |
| `tournaments/{tournamentId}` | One tournament: owner, format, status, entries, settings, and `rsvpListId` when its teams were imported from an RSVP list |
| `tournaments/{tournamentId}/matches/{matchId}` | One document per match |
| `tournaments/{tournamentId}/private/scorerKey` | The key behind the scorer link; only the owner can read it |
| `tournaments/{tournamentId}/scorers/{uid}` | A phone's proof that it opened the scorer link |
| `rsvpLists/{listId}` | One RSVP list, with no tournament behind it: owner, name, `takes` (`people` or `teams`), capacity, scheduled time, open time, `enabled` (the RSVP link), `closed`, and the ids of tournaments imported from it |
| `rsvpLists/{listId}/rsvps/{uid}` | One account's RSVP to the list: `uid`, `name`, `note`, and `createdAt`, the server's time |
| `rsvpLists/{listId}/notices/{noticeId}` | A notice from the owner to everyone on the list: `body` and `createdAt`, the server's time |

An RSVP list's RSVP link is its own page, `/rsvp/{listId}`. The owner always
reads the list, and any other signed-in account reads it while `enabled` is
on. The silent identity a scorer link gives a phone does not count. The rules
refuse `enabled` without both `scheduledAt` and `opensAt`, and only the owner
writes a list. A write names only the fields it changes, and a list carries
no revision. The RSVP tab's query for an account's own lists needs the
`rsvpLists` index in `firestore.indexes.json`.

The owner closes a list by setting `closed`, which stops new RSVPs and leaves
withdrawals working, and reopens it the same way. The owner removes any RSVP
at any time, and until `scheduledAt` adds a held spot: an RSVP under a
generated id with `uid` null and `held` true, which no account can change.
Deleting a list deletes its RSVPs in the same batch. The app refuses a change
to `capacity` below the confirmed count, a change to `opensAt` once the list
has an RSVP, and any settings change once `scheduledAt` has passed. The rules
do not check those three, since only the owner writes a list.

Whoever can read a list can read its RSVPs. An RSVP's id is the account's
uid, so an account holds one RSVP per list. The rules accept one only from
that account, only while the link is on and the list is not closed, only from
`opensAt` until `scheduledAt` by the server's clock, and only with `createdAt`
equal to the request's time. The account changes its own `name` and `note`,
until `scheduledAt`, and never its arrival time. It withdraws by deleting the RSVP, until
`scheduledAt`, and an RSVP made after that is a new arrival at the back of
the line. Who is confirmed and who waits is never stored. It follows from the
arrival order and the capacity (ADR-0004).

Only the owner posts or deletes a notice on a list, and nobody edits one.
The owner can do both after `scheduledAt`. Whoever can read the RSVPs can
read the notices. Opening the list's page sets `noticesReadAt` on the
account's own RSVP to the server's time. Only that account can write it, and
it can still write it after `scheduledAt`, so a notice newer than it has not
been seen.

Creating a tournament can import a by-team list that is closed or past
`scheduledAt`. The confirmed RSVPs are copied into its entries once
(ADR-0005): a name the roster has enters that roster team, and a new name
joins the roster. One batch writes the new roster teams, the tournament with
`rsvpListId`, and the tournament's id appended to the list's `tournamentIds`,
so all of it lands or none does. The rules refuse a tournament whose
`rsvpListId` names a list another account owns, or no list, and never let
`rsvpListId` change afterwards. Nothing that happens to the list later
reaches the tournament.

A tournament takes no RSVPs and has no scheduled time. One saved before RSVP
lists may still hold `scheduledAt`, `scheduledZone`, an `rsvp` map, and
`rsvps` and `notices` subcollections of its own. The app ignores all of them,
and nothing migrates them (ADR-0005). Home's query for an account's own RSVPs
skips any that is not under a list. The rules let only the tournament's owner
read and delete what is in those two subcollections, and nobody write to
them. Deleting the tournament deletes them with it.

Tournament ids are random so a link to one cannot be guessed. Every match
carries `ownerId`, so one collection group query on `matches` returns all of an
account's matches; that query and the tournament list need the composite
indexes in `firestore.indexes.json`. A tournament is readable by anyone only
while its `spectatorEnabled` flag is on.

A scorer link is the tournament's page with `?scorer=<key>`. A phone that
opens it gets a silent anonymous identity and writes the key under its own
uid; the rules accept that proof only while the key is the current one, and
compare it on every write after that, so regenerating the key from Settings
locks every old phone out at its next write. Scorers can score, record
results, reorder the queue, and swap courts in a live tournament, and
nothing else. Silent sign-in needs the Anonymous provider enabled on the project
(Firebase Console > Authentication > Sign-in method); the emulator has it on.

Format rules live in the engine under `src/lib/engine`. A command (start,
complete a match, end) plus the tournament and its matches produce the next
tournament and a list of per-match writes. There is one write path, online or
offline: the command queue in `src/lib/commandQueue.ts` applies the command to
the phone's own copy and writes the result as one batched write that names in
`basedOn` the revision it was built on. The local cache shows it at once, the
Firestore rules refuse it when the stored revision has moved on, and the queue
replays the command on the fresh copy, so two courts finishing at the same
moment cannot overwrite each other (ADR-0003). Field updates such as a rename
move the revision the same way and are retried on the fresh copy if refused.

## Local development

### Emulators

Sign-in and data can run against the Firebase emulators instead of a real
project. The emulators are Java programs, so install a JDK 21 or newer first
and make sure `java` is on your PATH. Temurin from
https://adoptium.net/temurin/releases/ works. Without a JDK, `npm run emulators`
stops with a message saying so.

1. Put this line in `.env.local`:

   ```
   NEXT_PUBLIC_FIREBASE_USE_EMULATOR=1
   ```

2. Start the Auth and Firestore emulators:

   ```bash
   npm run emulators
   ```

3. In another terminal, run `npm run dev`. The Emulator UI is at
   http://127.0.0.1:4000.

The emulators discard their accounts and data when they stop. To use a real
project instead, remove the flag and fill in the `NEXT_PUBLIC_FIREBASE_*` keys
from Firebase Console > Project Settings > Your apps > Config.

### Tests

```bash
npm test
```

The engine tests in `src/__tests__/engine` and the volleyball tests always
run. The Firestore rules tests in `src/__tests__/rules`, the roster tests in
`src/__tests__/roster`, and the tournament data tests in
`src/__tests__/tournaments` need the emulators up. When they are down, vitest
skips those tests and prints a message saying so. Each of those files loads
`firestore.rules` into its own demo project, so wiping data between tests never
touches what you see in the browser or what another test file is doing.

### Deploying rules and indexes

Changes to `firestore.rules` or `firestore.indexes.json` reach the real project
through the Firebase CLI, not through Vercel. The steps are in
[docs/deploying-firestore-rules.md](docs/deploying-firestore-rules.md).

## Release notes

- Results recorded on a phone with no signal are now checked against what
  landed meanwhile when the phone reconnects, the same as any other result.
  They land in the order they were tapped; a result on a court another phone
  recorded in the meantime is taken back with a notice naming the court, so a
  reconnecting phone can no longer overwrite other phones' results.
