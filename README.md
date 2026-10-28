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
| `users/{uid}` | The account's own fields: `rsvpName`, the name it last RSVP'd under; only that account can read it |
| `users/{uid}/teams/{teamId}` | The roster |
| `users/{uid}/matches/{matchId}` | Quick matches, with `tournamentId: null` |
| `tournaments/{tournamentId}` | One tournament: owner, format, status, entries, settings, scheduled time, RSVP settings |
| `tournaments/{tournamentId}/matches/{matchId}` | One document per match |
| `tournaments/{tournamentId}/private/scorerKey` | The key behind the scorer link; only the owner can read it |
| `tournaments/{tournamentId}/scorers/{uid}` | A phone's proof that it opened the scorer link |
| `tournaments/{tournamentId}/rsvps/{uid}` | One account's RSVP: `uid`, `name`, `note`, and `createdAt`, the server's time |

A tournament may also carry `scheduledAt`, when the owner says it will be
played, in epoch milliseconds, with `scheduledZone`, the IANA zone it was
entered in, so a phone in another zone can show the owner's wall clock beside
its own. Its `rsvp` map holds `enabled` (the RSVP link), `capacity`,
`opensAt` (epoch milliseconds), and `closed`. A tournament without the map
behaves as if the RSVP link were off. The rules refuse `enabled` without both
`scheduledAt` and `opensAt`, and only the owner writes these fields.

The RSVP link is the tournament's page with `/rsvp` on the end. While it is
on, any signed-in account can read the tournament and its RSVPs; the silent
identity a scorer link gives a phone does not count. An RSVP's id is the
account's uid, so an account holds one RSVP per tournament. The rules accept
one only from that account, only from `opensAt` by the server's clock, while
the list is open and the tournament is a draft, and only with `createdAt`
equal to the request's time, a Firestore timestamp unlike every other time
in the app. Who is confirmed and who waits is never stored; it follows from
the arrival order and the capacity (ADR-0004).

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
