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

### Cloud Collaboration
- Shareable sessions via codes or links
- Real-time synchronization across devices
- Admin and viewer access roles
- Google Sign-in and anonymous access

### Summaries & History
- Post-competition statistics and results
- Complete match history records
- Shareable competition summaries

## Tech Stack

- Next.js 16 / React 19
- TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore)
- Framer Motion
- Radix UI

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

Unit tests always run. The Firestore rules tests in `src/__tests__/rules` and
the roster tests in `src/__tests__/roster` need the emulators up. When they are
down, vitest skips those tests and prints a message saying so. They load
`firestore.rules` into their own demo project, so wiping data between tests
never touches what you see in the browser.

### Deploying rules and indexes

Changes to `firestore.rules` or `firestore.indexes.json` reach the real project
through the Firebase CLI, not through Vercel. The steps are in
[docs/deploying-firestore-rules.md](docs/deploying-firestore-rules.md).
