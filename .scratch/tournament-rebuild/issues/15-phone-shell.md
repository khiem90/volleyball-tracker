# 15: Phone shell

**What to build:** Every page has a fixed bottom tab bar (Home, Teams, Tournaments, History) padded
above the iPhone home indicator and a top bar with the account menu and sign-out.
The old navigation is removed everywhere, including the volleyball tools pages,
which keep their content but get the new shell. Safe areas are respected, the
manifest stops locking portrait and matches the paper palette, and the app is
light only.

**Blocked by:** 06, 08

**Status:** ready-for-agent

- [x] At 375px every page shows the tab bar and top bar with no horizontal scroll in either.
- [x] Sign-out is reachable from every page and clears cached data on that device.
- [x] The tab bar, top bar, and any fixed toast use safe-area insets; nothing sits under the home indicator or status bar.
- [x] The manifest has no orientation lock, paper background and theme colors, maskable icons with safe-zone padding, and the viewport uses cover fit.
- [x] The theme toggle and dark class are removed and the hydration error is gone.
- [x] The old navigation component and its parts are deleted.

## Comments

**2026-09-27, implementation.** Done on branch `claude/rotation-lab-redesign`.

- `src/lib/shell.ts` is the shell's pure part. It holds the four tabs,
  `tabFor` for the tab a page sits under, and `tabHref` for where a tab
  leads. Quick match and the tools sit under Home, which is where they are
  reached from. A guest's Teams, Tournaments, and History tabs show a lock
  and lead to sign-in with a return to the tab, so a tap never bounces off
  a page (story 8). `signInHref` builds that link, and `useRequireAuth`
  and the pages that built it by hand use it now.
- Every page but sign-in and scoring lives in the route group
  `src/app/(shell)/`, whose layout wraps it in `AppShell` from
  `src/components/shell/`. No URL changed. The top bar is sticky, with the
  crest, the wordmark, and the account menu. Below `lg` the four tabs are
  a bar fixed to the bottom, 60px tall above the home indicator's inset.
  From `lg` up the same tabs sit in the top bar and the bottom bar is
  hidden. The top bar pads for the status bar, and both bars and the
  page's side gutter pad for a landscape notch. The page's foot keeps
  clear of the tab bar through `--tab-bar-space`, which `globals.css` sets
  only while a tab bar is on the page and the screen is below `lg`. The
  undo toast reads the same variable, so it floats above the tab bar where
  there is one and above the home indicator everywhere. The login page
  pads itself for the insets too.
- The scoring page and sign-in stay outside the shell. The spec keeps the
  scoring page full-bleed, and sign-in is where the account menu leads.
  The first acceptance line holds for every page but those two.
- `AccountMenu` shows who is signed in and Sign out. A guest gets Sign in,
  which comes back to the page. `signOut` in `AuthContext`, with
  `src/lib/deviceData.ts`, first waits up to three seconds for writes
  still queued for the server. When they do not land, as with no signal,
  it refuses, and the menu asks "Sign out and lose unsaved changes?" with
  Sign out anyway. Otherwise it signs out and takes the app below the auth
  provider down, so no listener can touch the database after that. Then
  it terminates Firestore, clears its IndexedDB copy, clears localStorage
  (the scorer links and a formation draft live there), deletes the service
  worker's `cross-origin` and `apis` caches, and loads `/login` afresh.
  Another open tab lets go of the copy by itself, because Firestore stops
  a tab's database when a different tab deletes it. A tab that sees its
  account signed out elsewhere reloads to get a fresh one.
- Light only. `ThemeContext`, the theme toggle, the `.dark` variables and
  rules, and every `dark:` utility are gone. Tailwind v4's `dark:` follows
  the phone's setting even without the class, so the utilities had to go
  as well. `:root` sets `color-scheme: light` and the viewport exports
  `colorScheme: "light"`, so native controls stay light. The hydration
  error was the toggle rendering one label on the server and another on a
  phone set to dark.
- The viewport uses cover fit and the paper theme color. The iOS status
  bar style is `default` rather than `black-translucent`, whose white
  clock vanished on paper. The manifest has no orientation member, paper
  background and theme colors, and new icons. `scripts/generate-icons.js`
  now draws every icon from the matchbook crest on paper, and the maskable
  ones keep the crest inside the 80% safe zone, with its diagonal at 74%
  of the width. The old dark trophy image and the unused SVG beside it are
  deleted.
- Deleted: `Navigation.tsx`, `nav-parts/`, the matchbook `Sidebar` and
  `MobileBar`, the per-page "My Account" links to `/login`, and the
  console's separate link shell for scorers and spectators. Their Scorer
  or Spectator badge now sits in the masthead. `PageLoadingSpinner` no
  longer renders the old nav. Home gained a Tools button so the tools stay
  reachable until ticket 16 reworks Home.
- Tests. `src/__tests__/shell/shell.test.ts` (5 tests) drives the pure
  module, in the shape of the console and creation tests.
  `deviceData.test.ts` (2 tests) checks the sign-out guard against the
  emulator: a team saved with the network off has not reached the server,
  and it has once the network is back. These follow the emulator
  data-layer tests of earlier tickets rather than the two seams Testing
  Decisions names.

Verified against the emulators in the browser pane at 375x812 with the
phone set to dark, on the dev server another session left on port 3000.
Home, Teams, Quick, Tournaments, New Tournament, a live console, History,
Tools, the Rotation Lab, My Formations, and a shared formation all showed
both bars at 375px wide with no overflow in either, and the right tab
marked. Each tab is 94 by 60px. The page reported `color-scheme: light`
and no `dark` class, and the tournament's delete dialog came up light. A
probe at the undo toast's position sat 15px above the tab bar. At 1280px
the tabs moved into the top bar and the tab bar's space went to 0.
Sign-out from the console landed on `/login` with the Firestore database
gone from IndexedDB, localStorage empty, and no console error. With a
second tab open the copy was still cleared, and that tab reloaded, then
signed in again with its tournaments loading. With requests to the
Firestore emulator stalled, a team added on Teams held sign-out for three
seconds, the dialog appeared, and the account stayed signed in. After a
reload the team was on the emulator. A guest saw the three locked tabs,
and signing in from Teams came back to Teams. Sign-in and the guest
scoring page showed no shell. The served manifest had no orientation,
paper colors, and both maskable icons. Typecheck, `eslint src` (0 errors,
13 pre-existing warnings), and the full suite (479 tests) pass with the
emulators up.

Things seen and left alone. The masthead rows on Tournaments, History,
Tools, and the Rotation Lab run 6 to 137px past a 375px screen. The body
clips them, so nothing scrolls sideways, and ticket 18 owns wrapping them.
Desktop browsers report safe-area insets of 0, so the inset padding was
checked in the styles rather than on a phone. The pane stopped drawing
frames while hidden, which left closed dialogs mounted mid-fade with their
state already closed. `Sheet` and `Separator` in `components/ui/` have no
users now that the old nav is gone, for ticket 20. The login page's own
crest (52 by 60) sets off Next's aspect-ratio warning; the top bar's is 30
by 35 to match the SVG. The test tournament "Shell check" and the team
"Stalled" stay in the emulator account.

**2026-09-27, review.** A two-axis review (standards and spec) ran on the
staged change. What changed after it:

- Sign-out now signs out of Firebase before the app comes down. A failed
  sign-out returns to the menu with the app still up and shows "Sign-out
  failed. Try again." Before, the app was already down and the page
  reloaded still signed in.
- The console's not-found panel sends a guest to sign in with a return to
  the tournament.
- The manifest drops `orientation` rather than saying `any`. As far as we
  know, Chrome on Android treats `any` as full-sensor rotation, which
  ignores the phone's rotation lock.
- The review said a second open tab would keep the offline copy. The
  Firestore source shows it does not, and the browser agreed. Checking it
  turned up the second tab's stopped database, hence the reload above.
- The rule for the tab bar's space uses Tailwind's `max-lg` variant
  rather than repeating the breakpoint. The hand-built sign-in links and
  two inline spinners use `signInHref` and `PageLoadingSpinner`. "Owner"
  in a sign-out comment became "account holder", the menu's `state` became
  `signOutState`, and the offline test got a 10 second timeout, since it
  waits out the real three seconds.
- `signOut` lost a `try/finally`, which made the React Compiler lint skip
  the auth provider.

Left as they are: the unsynced dialog, the tabs in the top bar from `lg`
up, and the Home Tools button, which ticket 16 should replace. The crest
icons go past story 94's "colors", because the old image had no paper
version; the previous script and source image are in git to bring it
back. The `/competitions` and `/summaries` routes and Home's "Overview"
names predate this ticket.
