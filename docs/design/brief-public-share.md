# Redesign brief — Public share screens (live session viewer + post-event summary)

**Screen group:** `/session/[shareCode]` (live, real-time, Firestore-backed) and `/summary/[shareCode]` (frozen post-event report)
**Status:** not yet converted to Matchbook. Still on the "playful warm cream/red" theme — shadcn `Card`, `Badge`, `Button`, lucide icons, `glass` headers, pastel gradient stat tiles.
**Audit date:** 2026-08-08
**Audit evidence:** 28 screenshots at 1440×900 and 390×844 (plus tall-viewport full-page variants) in
`C:/Users/khiem/AppData/Local/Temp/claude/C--Dev-Tournament-Tracker--claude-worktrees-app-redesign-features-cf1ebd/bbc48bd4-cabe-4606-b848-eecddebf3c28/scratchpad/shots/audit-public-share/`
**Harness:** `…/scratchpad/pw/shoot-share.mjs` + `fixture-share.mjs`. Both routes are Firestore-only and there is **no Firestore emulator available locally** (`npm run emulators` starts auth only; `firebase.json` declares a Firestore emulator on 8080 but **Java is not installed on this machine**). The harness therefore intercepts the Turbopack dev chunk and short-circuits `getSessionByShareCode` / `getSummaryByShareCode` / `subscribeToSession` with fabricated payloads, so the **real components render with real CSS**. No application source was modified.

---

## 0. The one-sentence problem

These two routes are the only pages a stranger ever sees — they are the product's front door, pasted into a group chat at 7pm on a Friday — and today they are the *least* designed screens in the app: an unbranded page that flashes "Session Not Found" before it has finished loading, buries the live score below a standings table, renders it at 24px, and throws the entire screen away the moment the network hiccups.

---

## 1. Inventory

### 1.1 Routes and files

| # | Thing | Route | File |
|---|---|---|---|
| 1 | Live session viewer | `/session/<shareCode>` | `src/app/session/[shareCode]/page.tsx` (193 lines) |
| 2 | Session state machine | — | `src/hooks/useSessionPage.ts` (187 lines) |
| 3 | Session header (sticky) | 1 | `src/components/session/SessionHeader.tsx` |
| 4 | Competition info card | 1 | `src/components/session/SessionCompetitionInfo.tsx` |
| 5 | 3-up counters | 1 | `src/components/session/SessionStatsGrid.tsx` |
| 6 | Round-robin standings | 1 | `src/components/session/SessionRoundRobinStandings.tsx` |
| 7 | Live matches list | 1 | `src/components/session/SessionLiveMatches.tsx` |
| 8 | Read-only notice | 1 | `src/components/session/SessionViewerNotice.tsx` |
| 9 | Loading state | 1 | `src/components/session/SessionLoadingState.tsx` |
| 10 | Error / not-found / ended state | 1 | `src/components/session/SessionErrorState.tsx` |
| 11 | Firebase-not-configured state | 1 | `src/components/session/SessionNotConfigured.tsx` |
| 12 | Post-event summary | `/summary/<shareCode>` | `src/app/summary/[shareCode]/page.tsx` (182 lines) |
| 13 | Summary state machine | — | `src/hooks/useSummaryPage.ts` (183 lines) |
| 14 | 4 stat tiles | 12 | `src/app/summary/[shareCode]/SummaryOverviewCards.tsx` |
| 15 | Champion banner | 12 | `src/app/summary/[shareCode]/SummaryWinnerDisplay.tsx` |
| 16 | Final standings list | 12 | `src/app/summary/[shareCode]/SummaryStandings.tsx` |
| 17 | Match history list | 12 | `src/app/summary/[shareCode]/SummaryMatchHistory.tsx` |
| 18 | Auth / admin-token dialog | 1 | `src/components/auth/SessionAuth.tsx` + `useSessionAuth.ts` |
| 19 | Google button | 18 | `src/components/auth/GoogleSignInButton.tsx` |
| 20 | Email form | 18 | `src/components/auth/EmailAuthForm.tsx` |
| 21 | Admin-token form | 18 | `src/components/auth/AdminTokenForm.tsx` |
| 22 | Share dialog + trigger button | 1 | `src/components/ShareSession.tsx` |
| 23 | Delete confirm | 12 | `src/components/shared/DeleteConfirmDialog.tsx` |
| 24 | Session/role/permission layer | both | `src/context/SessionContext.tsx` (467 lines) |
| 25 | Firestore data layer | both | `src/lib/sessions.ts` (588 lines) |
| 26 | Auth + admin-token vault | both | `src/context/AuthContext.tsx` |
| 27 | Tournament views (borrowed) | 1 | `Bracket.tsx`, `DoubleBracket.tsx`, `Win2OutView.tsx`, `TwoMatchRotationView.tsx` — **owned by the competition-detail brief**, lazily imported here (`page.tsx:9-24`) |

There is **no** `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `opengraph-image.tsx` or `generateMetadata` under either route. `Navigation.tsx:31-36` explicitly hides the app nav on both, so these pages are standalone and completely un-chromed.

### 1.2 Product capabilities that must survive conversion

Nothing in this list may be lost.

**Session viewer — data & realtime**
- Join by share code on mount; `shareCode` is upper-cased server-side (`sessions.ts:140`).
- Live `onSnapshot` subscription; every score/team/competition change pushes into the view (`SessionContext.tsx:235-251`).
- Session deleted remotely → `callback(null)` → error `"This session has been ended by the creator."`, local persistence cleared (`SessionContext.tsx:239-244`).
- Session persisted to `localStorage["tournament_tracker_session"]` and auto-rejoined on next visit, with migration from the legacy `volleyball_tracker_session` key (`SessionContext.tsx:98-135`).
- Matches are scoped to the competition by `matchIds` when present, else by `competitionId` (`useSessionPage.ts:66-78`).

**Session viewer — roles & permissions**
- Three roles: `creator` / `admin` / `viewer` (`sessions.ts:384-400`). Creator = signed-in `uid === creatorId`. Admin = in `adminIds`, **or** holds the matching `adminToken`. Everyone else is a viewer.
- `?admin=<token>` in the URL is validated, stored per-session in `localStorage["tournament-admin-tokens"]`, and then **stripped from the URL** via `router.replace` (`useSessionPage.ts:43-50`).
- Admin token can also be pasted into the auth dialog's third tab (`useSessionAuth.ts:87-100`).
- `canEdit = creator || admin` gates match click-through (`page.tsx:113, 129, 150, 161, 171`).
- Anonymous creator recognition: token matches **and** `creatorId` is null (`SessionContext.tsx:361-368`).
- Leave session: unsubscribe, clear stored session, `router.push("/")` (`useSessionPage.ts:52-55`). Hidden for the creator.

**Session viewer — content**
- Session name + share code + role badge in the header.
- Competition name, type badge, status badge (draft/in-progress/completed), team count.
- Counters: upcoming, live, completed.
- Round-robin standings computed **in the hook, not from `lib/roundRobin`** — P/W/L/PD/Pts with configurable `pointsForWin|Tie|Loss` defaults 3/1/0, sorted by points then PD (`useSessionPage.ts:81-150`). Ties are counted but never rendered.
- Format-specific views: `Bracket` (single elim), `DoubleBracket` (double elim), round-robin standings table, `Win2OutView`, `TwoMatchRotationView` — each lazily loaded, each receives `onMatchClick` only when `canEdit`.
- Live matches list with team colours, score, and for series: `Game N of M` + running series tally.
- Admins clicking a match navigate to `/match/<id>`, which reads session data through `AppContext` because `AppContext.tsx:117-127` swaps its state source to the session when `isSharedMode`.
- Share dialog: viewer link always; **admin link only for creator/admin**, rendered as a password field with a copy button and a trust warning; native `navigator.share` with copy fallback.
- Sign-in dialog with Google / email sign-in / email sign-up / admin token, plus "Continue as Viewer".

**Summary — content & actions**
- Fetch a frozen `SessionSummary` by share code (`sessions.ts:532-547`); `summary.matches`/`teams`/`competition` are snapshots, `stats` were computed at end time (`sessions.ts:440-477`).
- Stats: completed matches, team count, duration (`Xh Ym` / `Xm`), ended date.
- Champion banner when `stats.winner` exists (most wins).
- Derived final standings: W, L, PF-PA, sorted by wins then point differential (`useSummaryPage.ts:116-162`) — note this is a **different** ranking rule from the live standings.
- Match history newest-first by `completedAt`, numbered `#N` descending, winner emphasised.
- Started / Ended timestamps (long locale format) + share code.
- Copy share link (2s "Copied!" confirmation).
- Delete summary — **creator only** — with confirm dialog, then `router.push("/summaries")`.
- Back arrow → `/summaries` for the creator, `/` for everyone else.

### 1.3 State inventory — every state the redesign must draw

| # | State | Trigger | Today |
|---|---|---|---|
| S1 | Session loading | `isLoading` from `joinSession` | `SessionLoadingState.tsx` — centred spinner + "Loading session…" |
| S2 | **Session pre-load flash** | first render: `isLoading=false, session=null, error=null` | **Renders the not-found error card.** Verified: `session-real-mobile-early.png` shows "Session Not Found" 700 ms after navigation, before Firestore has answered |
| S3 | Session not found | `error = "Session not found"` | `SessionErrorState` |
| S4 | Session ended by creator | snapshot `null` → error contains `"ended"` | `SessionErrorState` with amber icon — **all live content is destroyed, no link to the resulting summary** |
| S5 | Firestore unreachable / offline | `onSnapshot` error → `setError(err.message)` | Raw Firebase message rendered as the card body; **the whole viewer is replaced** and never recovers |
| S6 | Permission denied | rules reject (`firestore.rules`) | Same as S5 — raw `"Missing or insufficient permissions."` |
| S7 | Firebase not configured | `isConfigured === false` | `SessionNotConfigured` — "Firebase Not Configured. Please set up Firebase…" shown **to the public** |
| S8 | Session with no competition | `competition === null` | Header + three `0` tiles, then **nothing** (`session-empty-desktop.png`) |
| S9 | Session with no live matches | `inProgressMatches.length === 0` | `SessionLiveMatches` returns `null` (`SessionLiveMatches.tsx:19`) — silently absent |
| S10 | Viewer (read-only) | `role === "viewer"` | Notice card at the very bottom of the page |
| S11 | Viewer, signed out | `role === "viewer" && !user` | Same card + inline "Sign in" link; header gains a Sign In button |
| S12 | Admin via `?admin=` link | token validates | Match rows become clickable; no visual affordance that they are |
| S13 | Creator | `uid === creatorId` | Leave button hidden; crown badge |
| S14 | Series match in progress | `seriesLength > 1` | `Game N of M` + tally. Unclamped: a 2-1 best-of-3 renders **"Game 4 of 3"** (`session-toomuch-mobile-full.png`) |
| S15 | Too much data | 14 teams / 91 fixtures / 6 live | 14-row table + 6 stacked live rows, no truncation, no pagination |
| S16 | Summary loading | `isLoading` | Bare unlabelled spinner on an empty page (`summary-real-desktop-early.png`) |
| S17 | Summary not found | `error \|\| !summary` | Card, "Go to Dashboard" |
| S18 | Summary with no completed matches | `completedMatches.length === 0` | Standings show four teams ranked 1-4 at `0W 0L 0-0`; history says "No completed matches" |
| S19 | Summary with no winner | `stats.winner` undefined | Champion banner omitted, no substitute |
| S20 | Summary, creator | `uid === creatorId` | Delete button appears |
| S21 | Summary, stranger | not creator | No delete; back → `/` |
| S22 | Summary, huge | 75 completed matches | **All 75 rendered**, page ≈5 200 px tall (`summary-toomuch-desktop-full.png`) |
| S23 | Delete in flight | `isDeleting` | Button text "Deleting…" |
| S24 | Delete rejected by rules | anonymous creator | **Nothing happens.** `console.error` only (`useSummaryPage.ts:59-61`) |
| S25 | Auth dialog, Firebase unconfigured | `!isConfigured` | Dialog degrades to a "Firebase Not Configured" message |
| S26 | Share dialog, no admin token | viewer role | Admin-link block hidden |
| S27 | Copy failed / no clipboard | insecure origin, iOS | Summary: **unhandled promise rejection, no feedback** (`useSummaryPage.ts:44-49`) |

---

## 2. What's wrong today

### 2.1 Old design system that must go

Everything below is verbatim from the current source.

1. **Legacy surface, not `matchbook-surface`.** `session/[shareCode]/page.tsx:74` — `<div className="min-h-screen bg-background">`; `summary/[shareCode]/page.tsx:81` — identical. No paper grain, no navy ink, no Oswald.
2. **`glass` sticky headers.** `SessionHeader.tsx:49` — `className="glass border-b border-border/40 sticky top-0 z-50"`; `summary page.tsx:83` — identical. Glassmorphism is the opposite of a printed matchbook.
3. **shadcn `Card` everywhere.** 14 `<Card>` instances across the group (`page.tsx:104,119`; `SessionCompetitionInfo:17`; `SessionStatsGrid:17,21,25`; `SessionRoundRobinStandings:15`; `SessionLiveMatches:22`; `SessionViewerNotice:21`; `SessionErrorState:21`; `SessionNotConfigured:10`; `summary page.tsx:57,152`; all four `Summary*.tsx`). Rounded, soft-shadowed, no heavy top border.
4. **Pastel gradient tiles.** `SummaryOverviewCards.tsx:21,35,49,63` —
   `bg-linear-to-br from-primary/5 to-primary/10 border-primary/20`, `…from-blue-500/5…`, `…from-amber-500/5…`, `…from-green-500/5…`. Four different hues in one row; none exist in the Matchbook palette.
5. **Amber/orange champion gradient.** `SummaryWinnerDisplay.tsx:19` — `bg-linear-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 border-amber-500/30`, with `rounded-2xl bg-amber-500/20` icon chip at `:22`.
6. **Raw Tailwind status colours instead of `--mb-*`.** `SessionStatsGrid.tsx:22,26` (`text-amber-500`, `text-emerald-500`); `SessionRoundRobinStandings.tsx:49,52` (`text-emerald-500`, `text-destructive`); `SummaryStandings.tsx:46,49` (`bg-green-500/10 text-green-500`, `bg-destructive/10 text-destructive`); `SummaryMatchHistory.tsx:61,65` (`text-green-500`).
7. **Ad-hoc role palette invented twice.** `SessionHeader.tsx:42-46` and `ShareSession.tsx:94-98` both define
   `creator: "bg-amber-500/20 text-amber-500 border-amber-500/30"`, `admin: "bg-blue-500/20 …"`, `viewer: "bg-muted …"` — duplicated, and blue appears nowhere else in the app.
8. **lucide + heroicons mixed.** These files import 20 distinct lucide icons (`Crown`, `Shield`, `Eye`, `LogIn`, `LogOut`, `Trophy`, `AlertCircle`, `Home`, `Loader2`, `Target`, `Users`, `Timer`, `Calendar`, `Medal`, `Clock`, `Check`, `ArrowLeft`, `Share2`, `Trash2`, `KeyRound`, `Mail`, `Lock`, `User`, `Link2`, `Copy`, `CheckCircle2`, `Play`), while `DeleteConfirmDialog.tsx:13` uses heroicons `TrashIcon`. The Matchbook sprite is used **zero** times in this screen group.
9. **`rounded-2xl` status blobs.** `SessionErrorState.tsx:24`, `SessionNotConfigured.tsx:12`, `summary page.tsx:59` — `w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10`.
10. **Proportional numerals for scores.** `SessionLiveMatches.tsx:58` — `text-2xl font-bold`, no `tabular-nums`; `SessionRoundRobinStandings.tsx:48-62` — no `tabular-nums` anywhere; `SummaryMatchHistory.tsx:60` — `text-lg font-mono` (monospace, not Oswald tabular). Scores jitter horizontally on every increment.
11. **`<code className="bg-muted px-1.5 py-0.5 rounded">`** for the share code (`summary page.tsx:165`) — a code tag for the single most important string on the page.
12. **`Badge variant="secondary" className="capitalize"`** turning `single_elimination` into "single elimination" (`SessionCompetitionInfo.tsx:26-28`) while `useSummaryPage.ts:85-98` uses a different, hand-written label map. Two vocabularies for one concept.
13. **`animate-pulse` amber dot** as the only "live" signal (`SessionLiveMatches.tsx:25`) — `w-2 h-2 bg-amber-500 rounded-full animate-pulse`. The kit already ships `.mb-live-dot` in coral-red.
14. **Spinner-only loading.** `SessionLoadingState.tsx:8` and `summary page.tsx:48` — `<Loader2 className="w-8 h-8 animate-spin text-primary" />`. No brand, no skeleton, no session name.

### 2.2 Mobile ergonomics failures (measured at 390×844)

1. **Header is a three-button scrum.** `SessionHeader.tsx:59` clamps the title to `truncate max-w-[200px]`; the right side stacks Sign In + Share + Leave, all `size="sm"` (32 px tall, below the 44 px minimum), labels hidden behind `hidden sm:inline` so they become unlabelled icons. `session-rr-viewer-signedout-mobile-full.png` shows the title cut to "Friday Night Volleyball Le…" with the buttons hard against it.
2. **Live-score rows collide.** `SessionLiveMatches.tsx:49-68` is `flex items-center justify-between` with two 32 px colour swatches and no minimum gutter. At 390 px with real names the score touches the team name — `session-toomuch-mobile-full.png` renders literally `Summit 15 - 10Anchor`.
3. **Live scores are 24 px.** `SessionLiveMatches.tsx:58`. This page's entire purpose is being watched from a sideline or propped on a table; 24 px is a caption, not a scoreboard.
4. **The live score is below the fold — always.** Order is competition card → counters → standings/bracket → live matches (`page.tsx:88-173`). On mobile you scroll past ~900 px of chrome and a 14-row table before you see the score. On the 14-team fixture the live block starts at y≈1 050.
5. **Summary burns the entire first screen on four counters.** `SummaryOverviewCards.tsx:20` — `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` → single column below 640 px. Four ~150 px cards = 600 px. `summary-mobile.png` shows the champion banner not even starting before the fold.
6. **Summary title wraps and shoves the page down.** `summary page.tsx:93` — `text-lg font-semibold` with no truncation; "Regional Championship — 14 Teams" takes two lines inside a sticky header, and the destructive Delete button sits 8 px from Share, both 32 px targets (`summary page.tsx:104-127`).
7. **Match-history rows mis-centre.** `SummaryMatchHistory.tsx:48-80` uses `flex-1 min-w-0` on both name columns with the score between them, so the score drifts left of centre whenever the two names differ in length — visible in `summary-desktop-full.png` and much worse at 390 px.
8. **The bracket overlaps itself on mobile.** `Bracket.tsx:73-74` — `<div className="flex w-full min-w-max justify-between gap-10">`: `w-full` + `justify-between` + `min-w-max` fight each other, and inside a `CardContent` at 390 px the Semi-Final column is drawn **on top of** the Quarter-Final cards (`session-bracket-mobile-full.png`). Even at 1440 px the Finals column is clipped to a sliver of two coloured dots (`session-bracket-desktop-full.png`).
9. **No safe-area handling.** Neither page reads `env(safe-area-inset-*)`; the sticky header sits under the notch in PWA standalone mode.
10. **Pinch-zoom is disabled app-wide.** `layout.tsx:35-41` — `maximumScale: 1, userScalable: false`. On a page whose smallest meaningful text is a 24 px score and a 12 px standings table, this is a WCAG 1.4.4 failure and there is no in-app zoom to compensate.

### 2.3 Inconsistencies with the already-redesigned pages

| Redesigned pages do | These pages do |
|---|---|
| `matchbook-surface` + paper grain (`summaries/page.tsx:54`) | `bg-background` |
| Editorial masthead: `matchbook-display text-4xl … sm:text-5xl` with a coral count box (`summaries/page.tsx:66-87`) | `h1 font-semibold` at `text-lg` |
| `Panel` with heavy top border + `mb-panel-head` | shadcn `Card` + `CardHeader` |
| `PanelEmpty` with message + action | `null` (`SessionLiveMatches.tsx:19`) or nothing at all (S8) |
| `mb-table` with Oswald uppercase headers and `tabular-nums` | bare `<table className="w-full text-sm">` |
| `Crest` / `TeamMark` / `crestForTeam` | 8-12 px CSS colour dots and 32 px rounded squares |
| `mb-btn mb-btn-coral` / `mb-btn-outline-navy` | shadcn `Button variant="ghost"/"outline"` |
| `MbIcon` sprite | lucide |
| `mb-live-dot` (coral-red, 1.4 s) | `bg-amber-500 animate-pulse` |
| `mb-kicker` for labels | `text-sm text-muted-foreground` |
| `mb-score-box` for numerals | plain `text-2xl font-bold` |

`summaries/page.tsx` (History) already lists these summaries in a **"Shared Reports"** panel with matchbook styling and links straight into `/summary/<code>` (`summaries/page.tsx:394-445`). Clicking that link today drops the user from a designed page into an undesigned one — the most visible seam in the app.

### 2.4 Correctness and product defects found while auditing

Not styling. These must be fixed as part of the conversion, not preserved.

1. **Error-first flash (S2).** `page.tsx:69` guards `if (error || !session)` while `SessionContext` initialises `isLoading` to `false` (`SessionContext.tsx:82`). The first paint of every visit is the not-found card. Verified in `session-real-mobile-early.png`.
2. **A transient snapshot error nukes the page.** `SessionContext.tsx:188-190` and `:248-250` call `setError(err.message)` but never clear it, and never touch `session`. Because `page.tsx:69` short-circuits on `error`, one lost websocket frame replaces a live scoreboard with a dead-end card, permanently, until reload. This is also the offline (S5) and permission-denied (S6) path, and it leaks raw Firebase strings to the public.
3. **"Upcoming" double-counts live matches.** `page.tsx:94` — `upcomingCount={pendingMatches.length + inProgressMatches.length}`. In the screenshots: 3 pending + 2 live renders as "Upcoming 5 / Live 2".
4. **Elimination summaries are labelled "Session".** `useSummaryPage.ts:85-98` switches on `"bracket"`, which is not a member of `CompetitionType` (`types/game.ts:12`). `single_elimination` and `double_elimination` both fall through to `default: return "Session"`.
5. **Silent delete failure.** `useSummaryPage.ts:51-63` catches and `console.error`s. `firestore.rules` requires `request.auth != null && request.auth.uid == resource.data.creatorId` for summary deletes, so an anonymous creator's delete always fails and the UI shows nothing at all.
6. **Unguarded clipboard write.** `useSummaryPage.ts:45` — `await navigator.clipboard.writeText(url)` with no `try`. Rejects on insecure origins and in some iOS webviews → unhandled rejection, no feedback. `ShareSession.tsx:43-52` does guard it; the two share paths disagree.
7. **`useSearchParams` without a Suspense boundary.** `useSessionPage.ts:9` reads search params; `session/[shareCode]/page.tsx` has no `<Suspense>`, unlike `login/page.tsx:314-320` which wraps it deliberately. This is a prerender/CSR-bailout hazard for `next build`.
8. **Unclamped series game number.** `SessionLiveMatches.tsx:36-38` — `gameNumber = gamesPlayed + 1` with no `Math.min(…, seriesLength)`, producing "Game 4 of 3".
9. **Non-competition matches vanish.** `useSessionPage.ts:66-78` filters `session.matches` down to the competition, so any quick match inside a shared session is invisible to viewers.
10. **Redundant re-filtering.** `page.tsx:110` and `:126` re-apply `matches.filter(m => m.competitionId === competition.id)` to an already-scoped array — and would wrongly drop matches for competitions that use `matchIds` with a different `competitionId`.
11. **Two ranking rules for one event.** Live standings sort by competition points then PD (`useSessionPage.ts:144-149`); the summary sorts by wins then PD (`useSummaryPage.ts:158-161`). The table can reorder the instant a session ends.
12. **Standings drop data they compute.** `tied`, `pointsFor`, `pointsAgainst` are all calculated (`useSessionPage.ts:111-137`) and never rendered.
13. **"Continue as Viewer" is a no-op.** `useSessionAuth.ts:102-104` — it just closes the dialog. It reads as an action.
14. **Session end is a dead end.** `SessionContext.endSession` creates a summary and returns it (`SessionContext.tsx:317`), but a *viewer* watching when it happens gets `SessionErrorState` with a "Go to Dashboard" button and **no link to the summary that was just created** (`session-ended-desktop.png`).
15. **No share metadata.** Neither route exports `generateMetadata` or an OG image, so a link pasted into WhatsApp/Discord/Slack previews as "Tournament Tracker - Manage Your Competitions". For a screen whose only distribution channel *is* pasting a link, this is the single highest-leverage miss in the group.
16. **`PageLoadingSpinner` renders the legacy `Navigation`** (`shared/PageLoadingSpinner.tsx:5,16`) — if these routes ever adopt it, the old red nav bar flashes on a public page.
17. **Dead state in `Navigation.tsx:29`** — `showAuth` is passed to `SessionAuth` but nothing ever calls `setShowAuth`.
18. **Public-facing developer error.** `SessionNotConfigured.tsx:15-18` shows a stranger "Firebase Not Configured. Session sharing requires Firebase to be configured."

---

## 3. Target design — "The Programme" (live) and "The Match Report" (summary)

The mental model: the live viewer is the **programme sheet handed out at the gate** — masthead, current score huge, table below. The summary is the **match report printed the next morning** — headline result, box score, full ledger.

Both are **public pages**: `MatchbookShell variant="public"` (see brief-shell-motion §5 #1) — no sidebar, no bottom nav, no account chip. Chrome is a slim navy masthead and a single footer strip that is the app's only advertisement.

### 3.1 Shared shell for both routes

**Masthead** (`EventMasthead`, replaces `SessionHeader` and the summary header):
- Full-bleed `bg-mb-navy text-mb-paper-bright`, `border-b-[3px] border-mb-coral`, `position: sticky; top: 0`, `padding-top: env(safe-area-inset-top)`.
- Left: brand crest (28 px, links `/`) · vertical hairline · **event name** in `matchbook-display` `clamp(1.05rem, 4vw, 1.6rem)`, two-line clamp on mobile, single line ≥768 px.
- Under the name, a `mb-kicker` meta line: `ROUND ROBIN · 6 TEAMS · CODE ABC234`. The share code is a bordered chip (`border-[1.5px] border-mb-paper-bright/45 px-1.5 tabular-nums tracking-[0.18em]`), **never** a `<code>`.
- Right: status pill + max **two** actions. Overflow goes into `MbMenu`.
  - Live route: `MbLiveStatus` pill (§3.4) + `Share` (coral) + overflow (Sign in / Enter admin token / Leave).
  - Summary route: `FINAL` stamp + `Share` (coral) + overflow (Delete, creator only).
- Mobile (<768 px): actions collapse to one 44 × 44 `MbIconButton` for Share plus one for overflow. Delete **never** sits in the top bar on mobile — it lives at the bottom of the page in a `Danger zone` rule.

**Footer strip** (new, both routes, below the fold): hairline rule, brand lockup, one line — `Scored live with Tournament Tracker` → `/` — and, on the summary, `Started 7:38 PM · Ended 11:08 PM · Code ABC234`. This replaces the orphan "Session Info" card at `summary page.tsx:152-169`.

### 3.2 `/session/<shareCode>` — desktop ≥1280 px

Content column `max-w-[1180px]`, `px-8 py-6`, 12-column grid, `gap-4`.

```
┌──────────────────────────── navy masthead (sticky) ─────────────────────────────┐
│ ⛊ │ FRIDAY NIGHT VOLLEYBALL LEAGUE          ● LIVE · updated 3s   [SHARE] [⋯]   │
│     ROUND ROBIN · 6 TEAMS · CODE ABC234                                          │
└──────────────────────────────────────────────────────────────────────────────────┘

  ┌── col 1-8 ─────────────────────────────────────┐ ┌── col 9-12 ───────────────┐
  │ ON COURT NOW                    ● LIVE         │ │ TONIGHT                   │
  │ ┌────────────────────────────────────────────┐ │ │  5 UPCOMING               │
  │ │  ⛊ APEX        15  –  10        PEAK ⛊    │ │ │  2 LIVE                   │
  │ │  (3-1)      GAME 3 OF 3          (2-2)     │ │ │ 10 FINAL                  │
  │ └────────────────────────────────────────────┘ │ │ ──────────────────────── │
  │ ┌────────────────────────────────────────────┐ │ │ NEXT UP                   │
  │ │  ⛊ FLARE       12  –   9        PEAK ⛊    │ │ │ Storm v Nova              │
  │ └────────────────────────────────────────────┘ │ │ Tide v Apex               │
  ├────────────────────────────────────────────────┤ │ ──────────────────────── │
  │ STANDINGS                          AFTER 10    │ │ LATEST RESULTS            │
  │ #  TEAM      P  W  L  T  PF  PA  PD  PTS  FORM │ │ Surge 18–19 Tide          │
  │ 1  ⛊ Tide    5  4  1  0  94  84 +10   12  ■■■□ │ │ Surge 21–16 Storm         │
  │ …                                              │ │ …                         │
  └────────────────────────────────────────────────┘ └───────────────────────────┘
```

Ordering rule, non-negotiable: **live score first, always.** The competition-info card (`SessionCompetitionInfo.tsx`) is deleted as a component — its content is absorbed into the masthead meta line and the "Tonight" panel.

- **`On Court Now`** — `Panel tone="navy"`, one `MbScoreboardHero` per in-progress match. Numerals via `MbScoreNumeral size="console"` (`clamp(2.75rem, 6vw, 4.5rem)`, Oswald, `tabular-nums`, fixed `min-width: 2ch`). Crest + team name + record on each flank, series line centred below. `mb-live-dot` in the panel head. If `canEdit`, the whole card is a `<button>` to `/match/<id>` with a `pointer` cursor, a coral inset edge on hover and an explicit `EDIT SCORE →` link — today the click target is invisible.
- **`Tonight`** — replaces `SessionStatsGrid`. Three stacked `StatusStat` rows (promote the one at `competitions/page.tsx:75-102`), correctly labelled: **Upcoming = pending only**, Live, Final.
- **`Next Up`** and **`Latest Results`** — new panels built from `pendingMatches` and `completedMatches`, which the hook already computes and currently throws away. Cap at 5 with `View all →` opening a `MbSheet` on mobile / expanding in place on desktop.
- **`Standings`** — `MbStandingsTable` (competition-detail brief P6). Full column set including the T / PF / PA that are computed today and dropped. Leader row gets `box-shadow: inset 3px 0 0 var(--mb-teal)` exactly as `panels.tsx:63-68`. Crests via `crestForTeam`, colour bar from `team.color`.
- **Bracket / Win2Out / Two-match-rotation formats:** render `BracketRail` (competition-detail brief P4) in the col 1-8 slot **below** `On Court Now`, in a `Panel` with `overflow-x: auto`, snap points per round, sticky round labels, and a `Round 2 of 3 →` affordance. It must not use `Bracket.tsx`'s `w-full min-w-max justify-between` — that is the cause of the mobile overlap. Same for `Win2OutView` / `TwoMatchRotationView` → `MbCourtCard` (P5).

### 3.3 `/session/<shareCode>` — mobile 390 px

Single column, `px-4`, `gap-3`. Order:

1. Masthead (sticky, 2 lines, 56 px + safe-area).
2. **`On Court Now`** — the first thing below the masthead. One card per live match, `grid-template-columns: 1fr auto 1fr` with `min-width: 0` on the name cells and `gap: 0.75rem` so names **cannot** touch the score. Names truncate; crest never shrinks. Score at `clamp(2.25rem, 11vw, 3rem)`. Series line full-width underneath, centred.
   - >3 live matches: show 2, then a `+4 MORE COURTS` row that expands in place (no route change).
3. Horizontal `MbTabs`, sticky directly under the masthead once scrolled: **`COURT · TABLE · RESULTS · NEXT`**. Only one section is mounted at a time — this is also the fix for the too-much-data case.
4. `Tonight` counters become a single ruled strip: `5 UPCOMING · 2 LIVE · 10 FINAL` (`mb-kicker`, `tabular-nums`, hairline separators). No cards.
5. Standings table drops to `# / TEAM / P / W / L / PTS` at <420 px; PD/PF/PA/T move into a per-row expander. The table scrolls horizontally inside its own `overflow-x:auto` container — **the page body never scrolls sideways**.
6. Bracket tab: `BracketRail` horizontal scroll-snap, one round per screen, round name pinned.
7. Read-only notice → not a card at the bottom. It becomes a slim ruled banner directly under the masthead: `👁 READ-ONLY · SIGN IN OR ENTER ADMIN TOKEN TO EDIT`, dismissible, `role="status"`. Only for `role === "viewer"`.
8. Footer strip.

### 3.4 Live status — new, and the point of the whole screen

`MbLiveStatus` replaces the silent, stateless amber dot.

| State | Pill | Source |
|---|---|---|
| Receiving updates | `● LIVE` coral, `mb-live-dot`, + `updated 3s ago` | snapshot received, `metadata.fromCache === false` |
| Served from cache / offline | `◌ RECONNECTING` gold, static | `metadata.fromCache === true` or `navigator.onLine === false` |
| Snapshot error | `⚠ OFFLINE — showing last known scores` gold banner | `onSnapshot` error |
| Session ended | `■ ENDED` navy | snapshot `null` |

**Critical behaviour change:** on snapshot error the last-known session stays on screen. The page must never blank out because of a network event. See §3.6.

### 3.5 `/summary/<shareCode>` — desktop and mobile

The report has a headline, a box score, and a ledger.

**Desktop ≥1280 px**, `max-w-[1180px]`:

```
┌──────────── navy masthead: EVENT NAME · ROUND ROBIN · CODE ABC234 · [FINAL] [SHARE] [⋯] ┐

  ┌── col 1-7 ─ RESULT ────────────────────────┐  ┌── col 8-12 ─ BY THE NUMBERS ──┐
  │            ★ CHAMPION ★                    │  │ MATCHES PLAYED          10    │
  │        ⛊  (crest, 96px)                    │  │ TEAMS                    6    │
  │            T I D E                         │  │ DURATION             3H 30M   │
  │        4 WINS · 1 LOSS · +10 PD            │  │ ENDED        AUG 8, 11:08 PM  │
  └────────────────────────────────────────────┘  │ TOTAL POINTS           343    │
                                                   └───────────────────────────────┘
  ┌── col 1-7 FINAL TABLE ─────────────────────┐  ┌── col 8-12 ───────────────────┐
  │ #  TEAM     P  W  L  PF  PA  PD  FORM      │  │ BIGGEST WIN                   │
  │ 1  ⛊ Tide   5  4  1  94  84 +10  ■■■□      │  │ Surge 24–13 Apex              │
  └────────────────────────────────────────────┘  │ CLOSEST MATCH                 │
                                                   │ Surge 18–19 Tide              │
  ┌── col 1-12 MATCH LEDGER ───────────────────────────────────────────────────────┐
  │ #10  7:41 PM   ⛊ Surge      18 – 19      Tide ⛊         Round Robin            │
  └────────────────────────────────────────────────────────────────────────────────┘
```

- **Champion block** replaces `SummaryWinnerDisplay`: `Panel tone="navy"`, gold `star` sprite, 96 px crest, name in `matchbook-display text-[2.5rem]`, record line. When `stats.winner` is undefined (S19) the panel becomes `NO OUTRIGHT WINNER — <n> teams tied on <w> wins`, listing them. Never omit the block silently.
- **`By the numbers`** replaces `SummaryOverviewCards`. One `Panel`, `grid-cols-2` of `SummaryStat` rows exactly as `summaries/page.tsx:16-36`. **No gradients, no per-tile hue.** Adds "Total points" because the data is free.
- **`Final table`** — the same `MbStandingsTable` as the live view, so nothing reorders when a session ends. **Unify the ranking rule** (§2.4.11): use competition points then PD then PF, in one shared helper.
- **`Match ledger`** replaces `SummaryMatchHistory`, styled as the Results Ledger in `summaries/page.tsx:206-230`: grouped by day with a `bg-[rgba(7,50,77,0.05)]` day header, `grid-cols-[52px_1fr_auto_1fr_auto]`, `TeamMark` both sides, winner side bold + coral score, `tabular-nums`.
  - **Cap at 25 rows** with `Showing 25 of 75 — [SHOW ALL] [EXPORT CSV]`, mirroring `summaries/page.tsx:233-238`. This is the S22 fix.
- **New: `Biggest win` / `Closest match`** — two derived rows. Cheap, and they give the report a reason to be read.
- **Danger zone** (creator only): last block before the footer, hairline `border-t-[1.5px] border-mb-red`, `mb-kicker` "Danger zone", one `mb-btn mb-btn-outline` in red — `Delete this report`. Removed from the masthead entirely on mobile.

**Mobile 390 px:** champion block first (crest 64 px), then the numbers strip as a two-column ruled grid (not four stacked cards — that is the S5 fix in §2.2), then `MbTabs: TABLE · LEDGER`, then footer. First screen must contain the champion and the final score line.

### 3.6 State screens — one component, six tones

All six replace their bespoke cards with `MbEmptyState` (shell brief §5 #7), centred in a `mb-panel` with a faint crest watermark, on `matchbook-surface`.

| State | tone | Title | Body | Actions |
|---|---|---|---|---|
| S1/S16 loading | — | — | `MbPageLoading` **skeleton of the real layout**: masthead bar, one hero score block, six table rows. Never a bare spinner. | — |
| S3 not found | `notfound` | `NO SUCH EVENT` | `We couldn't find anything with code ABC234. Codes are 6 characters and never use 0, O, 1 or I.` | `Try another code` (inline 6-char input) · `Go to Tournament Tracker` |
| S4 ended | `info` | `THAT'S FULL TIME` | Final score of the last match + champion, drawn from the last snapshot we held. | **`View the match report` → `/summary/<newCode>`** (primary) · `Home` |
| S5 offline | — | — | **Not a page.** A gold `MbOfflineBanner` under the masthead: `OFFLINE — showing scores as of 11:04 PM`. Content stays. Auto-clears on reconnect. | `Retry` |
| S6 denied | `denied` | `THIS EVENT IS PRIVATE` | Plain-English only. Never surface a Firebase string. | `Home` |
| S7 unconfigured | `error` | `LIVE SHARING IS UNAVAILABLE` | `Live sharing isn't switched on for this deployment.` No mention of Firebase. | `Home` |
| S8 no competition | `empty` | `WAITING FOR THE FIRST MATCH` | `<Name> is set up but hasn't started. This page updates by itself — leave it open.` + live pill | — |
| S9 no live matches | `empty` | `NO MATCH ON COURT` | Inside the `On Court Now` panel via `PanelEmpty`, showing the next fixture. Never render nothing. | — |
| S18 empty summary | `empty` | `NO MATCHES WERE PLAYED` | Suppress the 0-0 ranked table; list teams unranked as `ENTERED`. | — |

### 3.7 Dialogs

Owned by the global dialog workstream; these are this group's requirements on `MbDialog`.

- **Share** (`ShareSession.tsx`) → `MbDialog tone="navy" size="md"`, title `SHARE THIS EVENT`, role badge in the header.
  - `MbCopyField` for the viewer link: monospace, `readOnly`, 44 px copy button, `Copied` swaps the icon to `check` for 2 s and announces via `aria-live`.
  - Admin link keeps `type="password"` **but gains a reveal toggle** — today you copy 32 characters you cannot verify (`ShareSession.tsx:177-182`).
  - Warning line becomes a framed `mb-btn`-height strip with the `warning` sprite, gold, not an emoji (`ShareSession.tsx:197`).
  - Add **`Show QR`** — the courtside use case is "point a phone at my screen", and this is the one feature that would make the share screen actually get used.
  - Footer: `Share` (coral, native sheet → copy fallback) + `Close`.
- **Sign in / admin token** (`SessionAuth.tsx`) → `MbDialog`, `MbTabs` replacing `TabsList grid-cols-3`. On mobile the three labels don't fit; use `SIGN IN · JOIN · TOKEN`. `AdminTokenForm` uses `mb-input` with the `lock` sprite and `font-mono tracking-[0.1em]`. **Delete "Continue as Viewer"** (§2.4.13) — the close affordance already does that; replace it with `Keep watching` styled as `mb-btn-outline-navy` only if the dialog was opened by a gate, never as a fake action.
- **Delete summary** → `MbDialog tone="paper"`, red rule, types-nothing confirm, and it **must surface failure** (§2.4.5) as an inline `MbToast` error instead of closing silently.

### 3.8 Metadata and link previews (new capability, highest leverage)

Add `src/app/session/[shareCode]/layout.tsx` and `src/app/summary/[shareCode]/layout.tsx` as **server** components exporting `generateMetadata`, plus `opengraph-image.tsx` using `next/og`:

```ts
export async function generateMetadata({ params }): Promise<Metadata>
// title:       "Surge 15–10 Peak · Friday Night Volleyball League"   (live)
//              "Tide win Friday Night Volleyball League"             (summary)
// description: "Live scores · 6 teams · 10 matches played"
// openGraph.images: [`/session/${shareCode}/opengraph-image`]
```

The OG image is a Matchbook card: navy field, coral rule, crest, event name in Oswald, the scoreline in tabular numerals. Reading the doc server-side needs the Firebase **Admin** SDK or the REST endpoint (`firestore.googleapis.com/v1/projects/…/documents:runQuery`) — see risk R4.

---

## 4. Interaction & motion

Motion tokens land first (`--mb-dur-fast: 120ms`, `--mb-dur-base: 200ms`, `--mb-ease-out`), per brief-shell-motion §4.1. Nothing here animates until they exist.

**Must animate**

| Thing | Motion |
|---|---|
| Page entrance | Panels fade+rise `opacity 0→1`, `translateY 8px→0`, 200 ms, `stagger 40 ms`, capped at 6 panels. Masthead does not move. |
| **Score increment** | Cross-fade the numeral only: old digit `opacity 1→0` / new `0→1` over 120 ms, plus a 2 px coral underline that wipes L→R and fades over 400 ms. **No scale, no bounce, no layout shift** — the numeral box is `min-width: 2ch` and never resizes. |
| New live match appears | The card expands from `height 0` over 200 ms then the content fades in. Never slide the whole list. |
| Match ends | The card's `LIVE` pill cross-fades to a `FINAL` stamp (rotated -4°, coral hairline) over 200 ms; the card then collapses into `Latest results` after 1.2 s so viewers register the result before it moves. |
| Standings reorder | FLIP on the `<tr>`s, `transform` only, 240 ms, and only when ≥1 row actually changed rank. Cap at 14 rows; beyond that, no animation. |
| Live dot | Existing `.mb-live-dot` `mb-pulse` 1.4 s. |
| `updated Ns ago` | Text-only tick, `aria-live="off"`. |
| Connection change | Offline banner slides down 160 ms; up on recovery. |
| Press | `mb-btn` / clickable cards: `transform: translateY(1px)` + `filter: brightness(.96)`, 90 ms. Touch targets flash `rgba(7,50,77,0.06)`. |
| Copy confirm | Icon swap `share → check` with a 120 ms cross-fade; label `SHARE → COPIED`; revert at 2 s. |
| Tab change (mobile) | Content cross-fade 140 ms. No horizontal slide — it fights the horizontally scrolling bracket. |
| Dialogs | `MbDialog` default: backdrop fade 160 ms, panel `scale .98→1` + fade 180 ms. Mobile: bottom-sheet slide. |

**Must NOT animate**

- The standings table on every snapshot (Firestore pushes the whole doc; a naive re-render would animate all 14 rows on every point scored).
- Score numerals under `prefers-reduced-motion: reduce` → instant swap, keep the underline as a static 400 ms flash of `background-color` only.
- The masthead, the share code, the bracket rail's scroll position (never scroll-jack a viewer who has panned to Round 3).
- Route transitions into `/match/<id>` — the scorer is mid-game; the console must appear instantly.
- The offline banner must not re-animate on every retry tick.
- No layout-affecting properties anywhere in this group: `transform`/`opacity`/`filter` only, except the two deliberate `height` transitions above.

**Focus & keyboard**
- Skip link to `#scores`.
- The live scoreboard is `role="status" aria-live="polite" aria-atomic="true"` with a text label (`"Apex 15, Peak 10, game 3 of 3"`) so a screen reader announces changes without reading the table.
- Every clickable match card is a real `<button>` with a visible `--mb-focus` ring; `canEdit === false` renders a `<div>`, never a dead button.
- Dialogs trap focus and restore it to the trigger.

---

## 5. New primitives required

Ordered by breadth. **Reuse** means it is already specified by a sibling brief — build it once, do not fork it.

### 5.1 Consumed from sibling briefs (do not redefine)

| Primitive | Owner brief | Used here for |
|---|---|---|
| `MatchbookShell` `variant="public"` | shell-motion #1 | Both routes' chrome — must render **no** sidebar/bottom-bar/account chip |
| `EventMasthead` / `MatchbookMasthead` | competition-detail P9, shell-motion #4 | Both mastheads |
| `MbDialog` (+ body/footer) | competition-detail P1 | Share, Sign-in, Delete |
| `MbButton`, `MbIconButton` | live-scoring, shell-motion #11 | Every action; guarantees 44 px |
| `MbBadge` / `MbChip` | competition-detail P3 | Status, role, format labels |
| `MbTabs` | competition-detail P2 | Mobile section switcher on both routes |
| `MbScoreNumeral` | live-scoring | Every score on both routes |
| `MbStandingsTable` | competition-detail P6 | Live standings **and** final table |
| `MbMatchRow` | competition-detail P7 | Next Up, Latest Results, Match ledger |
| `BracketRail` / `MbBracketCell` | competition-detail P4 | Replaces `Bracket`/`DoubleBracket` here |
| `MbCourtCard` | competition-detail P5 | Replaces `Win2OutView`/`TwoMatchRotationView` here |
| `MbEmptyState` | shell-motion #7 | S3, S4, S6, S7, S8, S18 |
| `MbPageLoading` / `MbSkeleton` | shell-motion #6 | S1, S16 |
| `MbToast` | shell-motion #8 | Copy confirm, delete failure |
| `MbOfflineBanner` / `useOnlineStatus` | shell-motion #9 | S5 |
| `MbSheet` | shell-motion #10 | Mobile "view all" |
| `MbMenu` | competition-detail P13 | Masthead overflow |
| `MbTeamIdentity` | live-scoring | Crest + colour bar + name |

### 5.2 Genuinely new — this group must build them

| # | Primitive | File | Proposed API | Shared with |
|---|---|---|---|---|
| N1 | **`MbLiveStatus`** + **`useLiveConnection()`** | `matchbook/LiveStatus.tsx`, `hooks/useLiveConnection.ts` | `useLiveConnection({ isSubscribed, lastSnapshotAt, fromCache, error }) → { status: "live"\|"reconnecting"\|"offline"\|"ended"\|"idle", secondsAgo, retry() }`; `<MbLiveStatus status secondsAgo tone="navy"\|"paper" />` | **`/competitions/[id]`** (same Firestore subscription), `/match/[id]` in shared mode |
| N2 | **`MbScoreboardHero`** | `matchbook/ScoreboardHero.tsx` | `{ home: MbTeam, away: MbTeam, homeScore, awayScore, homeColor?, awayColor?, series?: {game,of,homeWins,awayWins}, status: "live"\|"final"\|"pending", size?: "hero"\|"compact", href?, onSelect?, editable?: boolean }` — composes `MbScoreNumeral` + `MbTeamIdentity`; **grid, not flex**, `1fr auto 1fr` with `min-width:0` name cells | `/competitions/[id]` featured match, `/summary` champion line, Home "Match of the day" |
| N3 | **`MbCopyField`** | `matchbook/CopyField.tsx` | `{ label, value, secret?: boolean, revealable?: boolean, help?: ReactNode, onCopied?() }` — guarded clipboard with `document.execCommand` fallback, `aria-live` confirmation, 44 px button | `ShareSession`, `CreateSessionDialog`, `tools/volleyball-rotations/shared/[shareId]` |
| N4 | **`MbShareAction`** | `matchbook/ShareAction.tsx` | `{ url, title, text, variant: "button"\|"icon", withQr?: boolean }` — one implementation of native-share → copy → toast, so `useSummaryPage.handleCopyLink` and `ShareSession.handleShare` stop disagreeing | Every screen with a share affordance |
| N5 | **`MbQrCode`** | `matchbook/QrCode.tsx` | `{ value, size?: number, tone?: "navy"\|"paper" }` — inline SVG, **no runtime dependency** (small hand-rolled QR encoder or a build-time helper); see risk R7 | Session share, tools share |
| N6 | **`MbFinalStamp`** | `matchbook/FinalStamp.tsx` | `{ label?: string, rotate?: number }` — the rotated coral hairline "FINAL"/"FULL TIME" stamp | `/competitions/[id]`, History |
| N7 | **`MbDangerZone`** | `matchbook/DangerZone.tsx` | `{ title, description, action: {label, onClick, loading} }` — bottom-of-page destructive block | Teams, Competition detail, Formations |
| N8 | **`useMatchbookSession(shareCode)`** | `matchbook/useMatchbookSession.ts` | Mirrors `useMatchbookHistory`. Owns crest resolution, standings shaping (single ranking rule), live/next/latest partitioning, series clamping, terminology, connection status. Returns view-ready rows; keeps `useSessionPage` for joins/roles/navigation | Pattern already used by 5 shipped screens |
| N9 | **`useMatchbookSummary(shareCode)`** | `matchbook/useMatchbookSummary.ts` | Same for the report: numbers, champion (incl. tie handling), unified standings, day-grouped ledger, biggest/closest derivations, capped rows, CSV export reusing History's exporter | — |
| N10 | **`rankTeams()`** | `lib/standings.ts` | One ranking function used by `useSessionPage`, `useSummaryPage`, `Standings.tsx` and `lib/roundRobin`. Fixes §2.4.11 | Competition detail, History |
| N11 | **Share metadata layer** | `app/session/[shareCode]/layout.tsx`, `opengraph-image.tsx` (+ summary twins), `lib/sessionsServer.ts` | `generateMetadata` + `next/og` card. Server-side read via Admin SDK or Firestore REST | `/competitions/[id]` if it ever becomes public |

### 5.3 CSS + assets

Add to the Matchbook block in `globals.css`:
`.mb-stamp-final`, `.mb-code-chip`, `.mb-banner` (+ `[data-tone="warn"|"error"|"info"]`), `.mb-scoreline` (the `1fr auto 1fr` grid with `min-width:0` guards), `.mb-numeral-flash`, `.mb-day-head` (extract the day header from `summaries/page.tsx:197`), `--mb-safe-top`.

Sprite additions needed in `public/assets/matchbook/icons/sprite.svg` + `manifest.json` — **none of these exist today**:
`crown` (creator), `shield` (admin), `eye` / `eye-off` (viewer, reveal secret), `link`, `copy`, `key`, `logout`, `qr`, `trash`, `wifi-off`, `chevron-left`, `close`.
`close`, `chevron-left`, `logout`, `wifi-off` and `trash` are already requested by the shell / competition-detail briefs — **coordinate one sprite PR**, do not add them piecemeal.

Existing sprite ids that cover the rest: `live`, `share`, `check`, `warning`, `calendar`, `clock`, `chart`, `teams`, `compete`, `star`, `bracket`, `court`, `export`, `history`, `lock`, `login`, `mail`, `search`, `chevron-right`, `chevron-down`, `volleyball`, `clipboard`.

---

## 6. Risks

**High**

1. **You cannot see these screens locally.** Both routes are 100 % Firestore. `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=1` makes `isFirebaseConfigured()` return true and points the SDK at `127.0.0.1:8080`, but `package.json`'s `emulators` script starts **auth only**, and the Firestore emulator needs **Java, which is not installed**. Every local visit ends at "Session Not Found". Before conversion starts, land one of: (a) a documented Java + `firebase emulators:start --only firestore` path with a seed script, (b) a `NEXT_PUBLIC_DEV_PREVIEW_SESSION=1` fixture escape hatch in `lib/sessions.ts` mirroring the existing `DEV_PREVIEW_AUTH` pattern, or (c) keep using the chunk-patching harness at `…/scratchpad/pw/shoot-share.mjs`. Without this, the redesign is being built blind and **cannot be visually regression-tested**.
2. **The error/loading state machine is the actual bug.** `page.tsx:69` (`error || !session`) plus `isLoading` initialised to `false` plus `setError` on every transient snapshot failure means the page has *three* ways to show a dead end while perfectly good data is in memory. Fixing this requires touching `SessionContext` (shared with `/match/[id]` and `AppContext`), not just the view. Sequence it first, behind tests, and coordinate with the live-scoring brief — `AppContext.tsx:117-127` reads the same `session` object.
3. **Borrowed tournament views.** `Bracket`, `DoubleBracket`, `Win2OutView`, `TwoMatchRotationView` are owned by the competition-detail workstream. If this screen converts first it will fork them; if it converts last it inherits whatever they became. **Agree the `BracketRail` / `MbCourtCard` contract before either starts.** The mobile overlap (§2.2.8) is in `Bracket.tsx`, not here, so it cannot be fixed from this brief alone.
4. **Server-side metadata needs credentials the client build doesn't have.** `lib/firebase.ts` is client-only (`typeof window !== "undefined"`). `generateMetadata` runs on the server and would need either `firebase-admin` (new dependency, service-account secret, deployment config) or an unauthenticated REST `runQuery` (works because `firestore.rules` allows public read, but couples the app to a REST shape and leaks the project id). Decide early; the OG card is the highest-value item in §3.8 and the hardest to retrofit.
5. **`?admin=<token>` in the URL.** `useSessionPage.ts:43-50` strips it after validating, but it is in browser history, the referrer, and any analytics before that happens. The redesign must not add anything that logs `window.location.href`, and the share dialog must keep the admin link `type="password"` by default. Do not put the token in a QR code (N5).

**Medium**

6. **Perf: the whole session document re-renders on every point.** `onSnapshot` replaces `session` wholesale, so `teamsMap`, `matches`, `standings`, and all three partitions recompute (`useSessionPage.ts:57-154`). At 14 teams / 91 matches that is a full standings rebuild per tap. Memoise on `session.updatedAt` + match ids, keep row components `memo`'d with a stable key, and **never** animate a table that just re-rendered identically (§4).
7. **`MbQrCode` with no dependency.** A correct QR encoder is ~200 lines. Options: hand-roll byte-mode with fixed EC level, add `qrcode` (+30 kB), or generate server-side alongside the OG image. If it slips, ship the share dialog without it — it is additive.
8. **Big ledger.** 75+ rows today, unbounded in principle. The 25-row cap + CSV export is the answer; do not reach for virtualisation, which fights the day-grouping and printing.
9. **Print.** A "match report" invites `Cmd+P`. Nothing in the app has a print stylesheet. Add `@media print` for the summary: hide masthead actions and footer CTA, force one column, expand the ledger to all rows, black on white.
10. **Two clocks.** `stats.duration` is frozen at end time while `formatDate(createdAt/endedAt)` renders in the viewer's locale and timezone. A report shared across timezones will look internally inconsistent unless the dates carry an explicit zone or are rendered relative to `endedAt`.
11. **Hydration.** Any `new Date(...).toLocaleDateString()` rendered during SSR mismatches. `summaries/page.tsx:83` already uses `suppressHydrationWarning` for exactly this — apply the same discipline or compute dates in an effect.
12. **`SessionAuth` is shared with `Navigation.tsx:76`.** Restyling it touches a component mounted app-wide (even though its `showAuth` there is dead — §2.4.17). Delete the dead usage in the same change or the old dialog ships twice.

**Low**

13. Removing `SessionCompetitionInfo` / `SessionStatsGrid` / `SessionViewerNotice` as components is safe — nothing else imports them (`grep` confirms usage only in `session/[shareCode]/page.tsx`). Same for all four `Summary*.tsx`, which live inside the route folder.
14. `localStorage["tournament_tracker_session"]` auto-rejoin (`SessionContext.tsx:98-125`) means a visitor who once opened a share link is silently re-subscribed on other pages. Do not "improve" this during conversion; it is load-bearing for the scorer's flow.

---

## 7. Definition of done

**Visual**
1. Both routes render on `matchbook-surface` with the paper grain, navy ink, coral accent, and Oswald display type; zero `<Card>`, `<Badge>`, `glass`, `bg-linear-to-*`, `rounded-2xl` blobs, or `text-{amber,blue,green,emerald}-500` remain in the scope files.
2. Zero lucide/heroicon imports in the scope files; every icon comes from `MbIcon`.
3. Every team is shown with a crest (`crestForTeam`) plus its colour, never a bare dot.
4. Every number that can change is `tabular-nums` in the Oswald stack.
5. A screenshot of `/session/<code>` and `/summary/<code>` sits beside `/summaries` and `/competitions` without looking like a different product.

**Layout & ergonomics**
6. At 390 × 844 the live score is fully visible **above the fold** on `/session`, and the champion + final result are above the fold on `/summary`.
7. Live score numerals are ≥40 px on mobile and ≥64 px at ≥1280 px.
8. No horizontal body scroll at 320 px, 390 px, 768 px, 1024 px, 1440 px. Tables and the bracket scroll inside their own containers.
9. Every interactive target is ≥44 × 44 at `pointer: coarse`. Delete is not adjacent to Share on mobile.
10. Team names never overlap the score at any width with a 20-character name.
11. `env(safe-area-inset-*)` respected top and bottom.
12. The bracket renders without overlap at 390 px and shows the Finals column completely at 1440 px.

**States**
13. All 27 states in §1.3 are drawn and reachable in the harness; screenshots at both widths are archived.
14. **No error card is ever shown before the first Firestore response** (S2 fixed).
15. A snapshot error or `navigator.onLine === false` shows a banner and **keeps the last known scores on screen** (S5 fixed). Recovery clears it without a reload.
16. No raw Firebase error string, and no mention of "Firebase", reaches the public UI (S6, S7 fixed).
17. Session-ended offers a direct link to the generated summary (S4 / §2.4.14 fixed).
18. Loading is a layout skeleton, not a spinner, and never renders the legacy `Navigation`.
19. A summary with 0 matches and a session with no competition both render a purposeful empty state.
20. ≥25 ledger rows are capped with a Show-all/Export affordance; ≥8 live matches collapse behind "more courts".

**Correctness**
21. "Upcoming" counts pending matches only (§2.4.3).
22. `single_elimination` / `double_elimination` summaries show "Single Elimination" / "Double Elimination" (§2.4.4).
23. Live and final standings use one shared `rankTeams()` and cannot reorder when a session ends (§2.4.11); T / PF / PA are rendered.
24. Series game number is clamped to `seriesLength` (§2.4.8).
25. Delete failure surfaces an error to the user (§2.4.5); clipboard failure surfaces a fallback (§2.4.6).
26. `useSearchParams` is inside a `<Suspense>` boundary and `npx next build` is clean (§2.4.7).
27. Matches with `competitionId === null` inside a session are still shown (§2.4.9).
28. "Continue as Viewer" is gone or does something real (§2.4.13).

**Sharing**
29. Pasting either link into Slack/WhatsApp/Discord previews the event name, the current or final score, and a Matchbook OG card (§3.8).
30. One share implementation (`MbShareAction`) serves the masthead, the dialog, and the summary; native sheet with copy fallback and a confirmation on both.
31. The admin link is revealable before copying and still masked by default.

**Motion & a11y**
32. Motion tokens are used; no `transition-all`; score changes cross-fade without layout shift; standings FLIP only on real rank changes.
33. `prefers-reduced-motion: reduce` removes every transform and keeps the UI fully usable.
34. The scoreboard announces score changes once via `aria-live="polite"`; the standings table does not.
35. Focus is visible on every control with `--mb-focus`; dialogs trap and restore focus; a skip link reaches the scores.
36. Axe reports no contrast failures at AA on navy-on-paper, coral-on-paper, and paper-on-navy.

**Engineering**
37. `npx tsc --noEmit`, `npx eslint <scope files>`, and `npx vitest run` are green.
38. `useMatchbookSession` / `useMatchbookSummary` own all shaping; the route files contain layout only, matching the shipped pattern in `summaries/page.tsx`.
39. Every new primitive in §5.2 lives in `src/components/matchbook/`, is used by at least this screen, and is documented for the sibling briefs that consume it.
40. `SessionCompetitionInfo`, `SessionStatsGrid`, `SessionViewerNotice`, `SessionLoadingState`, `SessionErrorState`, `SessionNotConfigured` and the four `Summary*.tsx` are deleted, not left orphaned.
