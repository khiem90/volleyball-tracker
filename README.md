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
- Multi-step competition creation wizard
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
| `users/{uid}/teams/{teamId}` | The roster |
| `users/{uid}/matches/{matchId}` | Quick matches, with `tournamentId: null` |
| `tournaments/{tournamentId}` | One tournament: owner, format, status, entries, settings |
| `tournaments/{tournamentId}/matches/{matchId}` | One document per match |

Tournament ids are random so a link to one cannot be guessed. Every match
carries `ownerId`, so one collection group query on `matches` returns all of an
account's matches; that query and the tournament list need the composite
indexes in `firestore.indexes.json`. A tournament is readable by anyone only
while its `spectatorEnabled` flag is on.

Format rules live in the engine under `src/lib/engine`. A command (start,
complete a match, end) plus the tournament and its matches produce the next
tournament and a list of per-match writes. `src/lib/tournaments.ts` applies
those writes in a transaction guarded by the tournament's `revision`, so two
courts finishing at the same moment cannot overwrite each other. With no
network the same writes go out as a batch that the offline cache queues.

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
