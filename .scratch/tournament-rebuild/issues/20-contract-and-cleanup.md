# 20: Contract and cleanup

**What to build:** With every page on the new store and shell, the compatibility layer in the app
provider is removed, dead components and hooks found in the audit are deleted,
and lint ignores the generated service-worker files.

**Blocked by:** 15, 16, 17, 18, 19

**Status:** ready-for-agent

- [x] The provider exposes only the roster, tournaments, matches, and engine-backed actions; old method names are gone.
- [x] Dead components and hooks named in the audit are deleted and nothing imports them.
- [x] Lint on the whole repo reports zero errors and the generated service-worker files are ignored.
- [x] Type check and every test pass.

## Comments

**2026-09-28, implementation.** Done on branch `claude/rotation-lab-redesign`.

- The provider exposes `roster`, `tournaments`, and `matches` in place of
  `state`, the old reducer's `{ teams, tournaments, matches }` shape.
  `AppState` is gone from `src/types/game.ts`. So are `canEdit`,
  `getTeamById`, and the catch-all `updateMatch(Partial<Match>)`, none of
  which had a caller, and the `LinkStatus` re-export. Ten screens and hooks
  read the new fields.
- I read "engine-backed actions" as the spec's "domain actions". Roster
  edits, rename, delete, share links, quick matches, and live score writes
  were never engine commands. `updateMatchScore` and `startMatch` stay as
  field writes on one match document, because the spec keeps scores during
  play as per-match writes, and their doc comments now say so. Everything
  that changes a started tournament still goes through the engine.
  `updateTeam`, `completeMatch`, `getMatchById`, and `reorderQueue` share
  names with the pre-rebuild API, but each one does the new job.
- Nobody wrote the audit down. The names left for this ticket were `Sheet`
  and `Separator` from ticket 15, and `Header.tsx`, `TeamCard.tsx`,
  `ui/copy-button.tsx`, and `ui/tabs.tsx` from ticket 18. A script that
  follows imports from every route and test found the rest, and a grep
  confirmed each one has no importer. Deleted:
  - named in the tickets: `Header`, `TeamCard`, `ui/sheet`, `ui/separator`,
    `ui/copy-button`, `ui/tabs`
  - found by the script: `Background`, the five `illustrations` files,
    `ui/card`, `ui/glass-card`, `ui/match-score`, `ui/progress`,
    `ui/rank-badge`, `ui/team-badge`, `ui/tooltip`, `shared/EmptyState`,
    `shared/DecorativeBackground`, `shared/PageHeader`, `context/index.ts`,
    and `lib/icons.tsx`
- Dead code inside live files went too. `motion` keeps only `slideUp` and
  `MotionDiv`. `isGuestTeamId` is gone, and so are `getSessionMatchCount`
  and `getCurrentChampionStreak` from the format libraries,
  `COMPETITION_TYPE_LABELS`, which was an alias of `FORMAT_LABELS`, and
  hook return values no page read: `homeTeam` and `awayTeam` from
  `useQuickMatchPage`, and `tournament` from `useMatchPage`.
- The four Radix packages that only the deleted wrappers used are
  uninstalled: `react-progress`, `react-separator`, `react-tabs`, and
  `react-tooltip`.
- `globals.css` loses about 630 lines of rules nothing uses: the old
  playful cards, glass nav and inputs, gradients, glows, status badges,
  landscape helpers, fade-in and stagger classes, and the custom
  properties only they read. `.glass-card` and `.btn-teal-gradient` stay,
  because the guest result screen uses them.
- Lint ignores `public/sw.js`, `public/workbox-*.js`, and
  `public/swe-worker-*.js`, which next-pwa writes on each build, and
  `.claude/`, whose worktrees carry their own `node_modules` and builds.
  The directory form of that pattern stops ESLint walking the folder and
  takes a whole-repo run from about 90 seconds to about 20. The repo's three
  lint errors were `require` calls in the icon script. It is now
  `scripts/generate-icons.mjs` with imports, and it writes byte-identical
  icons.

Left alone: ten unused functions in `src/lib/volleyball`, which are the ten
lint warnings, and three unused types there, since the spec keeps the
tools' content out of scope. The shadcn `dialog` and `dropdown-menu` files
keep their full sets of parts.

Typecheck, `npm run lint` with 0 errors and 10 warnings, the full suite
(533 tests) with the emulators up, and `next build` pass. In the browser
pane at 375px on the production build, guest Home, a guest match played to
its result screen, guest Quick Match, and a missing match's not-found page
all work, with the trimmed stylesheet served. Signed-in pages were not
driven. Another session's `next dev` holds the lock on `.next/dev`, and
under the production service worker the pane's Firestore listen requests
failed, so no Firestore-backed page loaded.

**2026-09-28, review.** A two-axis review (standards and spec) ran on the
staged change and found no wrong behaviour. What changed after it:

- `useMatchbookTeams` names its locals for tournaments, not competitions,
  a word the glossary avoids. `buildTeams` takes
  `(tournaments, matches, roster)`, the order `lib/home` and `lib/history`
  use.
- `useMatchbookCompete` calls the account's matches `ownMatches`, as the
  provider does.
- Two long `useApp()` destructures wrap.

Left as the review noted: `refFor` repeats in `useMatchbookCompete` and
`useMatchbookQuickMatch`, as it did before, and ticket 15's comment still
names `generate-icons.js`, since it records that ticket.
