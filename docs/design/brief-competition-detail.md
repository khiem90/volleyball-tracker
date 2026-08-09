# Redesign brief — Competition detail & bracket views

**Route group:** `/competitions/[id]` (all five competition formats)
**Status:** unconverted. Still on the legacy "playful warm cream/red" system.
**Authority:** `docs/design/matchbook-design-language.md` governs. Where this brief
and that document disagree, that document wins. Reference implementations to copy
from: `src/app/competitions/page.tsx` (Compete console), `src/app/summaries/page.tsx`
(History archive), `src/app/teams/page.tsx` + `src/components/matchbook/teamPanels.tsx`.

**How this was audited.** Every file in scope was read. The running app at
`http://127.0.0.1:3100` was seeded with a purpose-built fixture (16 teams,
9 competitions, 204 matches — round robin in progress / completed, single
elimination 8- and 16-team, double elimination draft + live, win2out with 2 courts
and crowns, two-match rotation with 2 courts, plus a 120-match "too much data"
league) and screenshotted at 1440px and 390px, plus every dialog.
Fixture generator: `scratchpad/gen-fixture.mts`; shots:
`scratchpad/shots/audit-competition-detail/`.

---

## 1. Inventory

### 1.1 Page shell and states

| # | State | Route | File / lines | Notes |
| --- | --- | --- | --- | --- |
| S1 | Auth loading | any | `src/app/competitions/[id]/page.tsx:89-104` | Inline framer-motion ring spinner on `bg-background` with legacy `<Navigation />`. Does **not** use `PageLoadingSpinner`; a third variant of the same thing. |
| S2 | Not found / deleted | any bad id | `src/components/competition-detail/CompetitionNotFound.tsx:8-31` | Trophy in a `rounded-3xl bg-muted/50` tile, "Competition not found". Also the de-facto *permission-denied* and *stale-share* state — there is no distinct copy for either. |
| S3 | Loaded | `/competitions/<id>` | `page.tsx:110-237` | `max-w-6xl mx-auto px-4 py-8` centred column, legacy `<Navigation />` top bar. |
| S4 | Back link | all | `page.tsx:116-124` | shadcn ghost `<Button>` wrapped in a `<Link>`. |
| S5 | Header | all | `competition-detail/CompetitionHeader.tsx:35-107` | Title + status badge + type/teams/date meta + action cluster. |
| S6 | Winner banner | completed only | `competition-detail/CompetitionWinnerBanner.tsx:16-47` | Amber gradient card, initial-letter avatar tile, `Crown` lucide badge. |
| S7 | Stats triptych + progress | not draft | `competition-detail/CompetitionStats.tsx:27-67` | Completed / In Progress / Pending cards + `<Progress>` bar. Returns `null` on draft. |
| S8 | Draft team list | draft only | `competition-detail/CompetitionDraftTeams.tsx:12-46` | 2/4-col grid of gradient initial tiles. Read-only — teams **cannot** be edited from here. |
| S9 | Error / offline | — | **none** | `SessionContext` exposes `error` (`src/context/SessionContext.tsx:41,434`); the page never reads it. No offline indicator, no Firestore-failure surface, no retry. |
| S10 | Permission-denied (shared viewer) | shared mode | implicit | `canEdit === false` silently removes edit pencils, hides Play buttons, and makes `EditMatchDialog`/`EditQueueDialog` render `null` (`edit-match/EditMatchDialog.tsx:60`, `edit-queue/EditQueueDialog.tsx:55`). No explanatory copy anywhere. |
| S11 | "Too much data" | 16-team RR | — | 120 match rows and 16 standings rows all render unvirtualised, unpaginated, uncollapsed. |

### 1.2 Format-specific bodies

| # | Body | Condition | File |
| --- | --- | --- | --- |
| B1 | Round robin: standings + schedule | `type=round_robin`, not draft | `competition-detail/CompetitionRoundRobinSection.tsx:29-144` + `src/components/Standings.tsx:14-146` |
| B2 | Single-elimination bracket | `type=single_elimination`, not draft | `page.tsx:167-187` → `src/components/Bracket.tsx:18-120` → `src/components/bracket-parts/BracketMatchCard.tsx:22-205`, `ChampionDisplay.tsx:11-35` |
| B3 | Double-elimination bracket | `type=double_elimination`, not draft | `page.tsx:189-210` → `src/components/DoubleBracket.tsx:21-255` (renders its own inline match card, **does not** reuse `BracketMatchCard`) |
| B4 | Win 2 & Out console | `type=win2out` + `win2outState` | `src/components/Win2OutView.tsx:39-240` → `rotation-views/ActiveCourtCard.tsx`, `TeamQueueSection.tsx`, `TeamLeaderboard.tsx` → `LeaderboardCard.tsx`, `MatchHistorySection.tsx` |
| B5 | Two-match rotation console | `type=two_match_rotation` + state | `src/components/TwoMatchRotationView.tsx:34-239` → `rotation-views/TwoMatchCourtCard.tsx`, `TwoMatchQueueSection.tsx`, `TwoMatchLeaderboard.tsx` → `LeaderboardCard.tsx`, `MatchHistorySection.tsx` |

Sub-states inside the bodies:

- **Round-robin row**: pending / live / completed; live row gets an amber ring; only
  non-completed rows are clickable (`CompetitionRoundRobinSection.tsx:59-63`); the edit
  pencil appears only for `pending` **and** only on hover (`:106-119`).
- **Bracket cell**: playable / completed / bye / TBD-empty / live
  (`BracketMatchCard.tsx:33-39`). Bye renders a dashed 50%-opacity card with a "bye" pip.
- **Champion cell**: rendered only when the final match is completed
  (`Bracket.tsx:111-116`; `DoubleBracket.tsx:232-249`).
- **Court card**: pending ("VS" + Play) / in-progress (score + Live + Continue) /
  instant-win mode (both buttons suppressed, team halves become the tap targets)
  (`ActiveCourtCard.tsx:152-186`, `:60-65`).
- **Rotation empty**: "No active matches" clock card (`Win2OutView.tsx:186-195`,
  `TwoMatchRotationView.tsx:184-193`).
- **Queue empty**: "All teams are on court!" (`TeamQueueSection.tsx:39-42`).
- **Leaderboard empty**: renders `null` entirely (`LeaderboardCard.tsx:32`) — the panel
  vanishes with no explanation.
- **History empty**: renders `null` entirely (`MatchHistorySection.tsx:12`).
- **History overflow**: hard `.slice(0, 20)` inside a `max-h-60` scroller while the
  heading still claims the full count (`MatchHistorySection.tsx:17-23`).

### 1.3 Dialogs

| # | Dialog | File | Trigger |
| --- | --- | --- | --- |
| D1 | Start competition (+ play-in team picker) | `competition-detail/StartCompetitionDialog.tsx:27-186` | Draft header button |
| D2 | Match action (Play / Continue) | `competition-detail/MatchActionDialog.tsx:24-74` | Any clickable match |
| D3 | End competition | `competition-detail/EndCompetitionDialog.tsx:21-68` | Shared-mode creator only |
| D4 | Create live session | `src/components/CreateSessionDialog.tsx` | Header "Share Live" |
| D5 | Share session | `src/components/ShareSession.tsx:231-253` (`ShareButton`) | Shared mode |
| D6 | Edit match | `dialogs/edit-match/EditMatchDialog.tsx:28-172` + `useEditMatchDialog.ts`, `TeamSelectDropdown.tsx`, `MatchPreview.tsx`, `SwapWarning.tsx` | Pencil on RR row / bracket cell / court card |
| D7 | Edit queue order | `dialogs/edit-queue/EditQueueDialog.tsx:25-130` + `useEditQueueDialog.ts`, `QueueTeamItem.tsx`, `NextUpIndicator.tsx` | "Reorder" in queue panel |

### 1.4 Product logic that must survive (do not drop a single one)

From `src/hooks/useCompetitionDetailPage.ts`:

1. **Schedule generation on start**, per format, with `matchSeriesLength` fan-out
   (`:109-206`). Elimination formats accept an explicit `byeTeamIds` list computed from
   the play-in picker (`StartCompetitionDialog.tsx:77-87`).
2. **Rotation formats bypass `addMatches`** and use `startCompetitionWithMatches` with
   a freshly initialised `win2outState` / `twoMatchRotationState` (`:152-197`).
3. **Auto-complete**: when every match is completed, derive a winner (standings #1 for
   RR, final-round / grand-finals winner otherwise) and call `completeCompetition`
   (`:217-244`).
4. **Auto-create live session** after starting, unless already in shared mode and only
   when Firestore `isConfigured` (`:246-290`).
5. **End competition (shared mode)**: complete → `endSession()` → remove the local
   competition → redirect to `/summary/<shareCode>` (`:292-312`).
6. **RR row ordering**: in-progress → pending → completed, then round, then position
   (`:79-107`).
7. **Standings** recomputed from `calculateStandings(teamIds, matches, config)` so the
   competition's configurable points-for-win / ties rules apply (`:324-327`).
8. **`canEdit` gating** everywhere (shared-mode viewers are read-only).
9. **Instant win**: `useRotationInstantWin` writes a completed match + advances rotation
   state without opening the scoring console (`Win2OutView.tsx:58-64`).
10. **Team-swap on edit**: `detectTeamSwap` / `calculateSwapUpdates`, plus manual court
    re-assignment for rotation formats (`useEditMatchDialog.ts:118-215`).
11. **Queue reorder** filtered against teams currently on court
    (`useEditQueueDialog.ts:32-44,134-139`).
12. **Dynamic terminology** — "court" may be "field"/"table" via
    `competition.config.terminology` (`Win2OutView.tsx:51-53`).
13. **Bye handling** in both brackets, including non-power-of-2 team counts via
    `getTotalRounds` / `getTotalWinnersRounds`.
14. **Lazy loading** of the four heavy view components via `next/dynamic` with
    `ssr:false` (`page.tsx:29-45`).

---

## 2. What's wrong today

### 2.1 Legacy design system still present (must all go)

Every item below is on the §9 anti-pattern list of the design language doc.

- **Legacy shell.** `page.tsx:91,111` `<div className="min-h-screen bg-background">` with
  `<Navigation />` and `page.tsx:93,114` `max-w-6xl mx-auto px-4 py-8`. Matchbook screens
  are full-bleed with `MatchbookSidebar` + `MatchbookMobileBar` and
  `px-4 py-5 sm:px-6 lg:px-8`.
- **shadcn primitives.** `Card`/`CardHeader`/`CardTitle`/`CardContent` at
  `page.tsx:169,192`, `CompetitionStats.tsx:30,39,48`, `Standings.tsx:43`,
  `CompetitionRoundRobinSection.tsx:33`, `CompetitionDraftTeams.tsx:13`,
  `ActiveCourtCard.tsx:35`, `TwoMatchCourtCard.tsx:52`, `TeamQueueSection.tsx:17`,
  `LeaderboardCard.tsx:35`, `MatchHistorySection.tsx:15`, `DoubleBracket.tsx:63,235`,
  `BracketMatchCard.tsx:63`, `ChampionDisplay.tsx:21`. Plus `<Button>`, `<Badge>`,
  `<Progress>`, `<Separator>` throughout.
- **Legacy status classes.** `CompetitionHeader.tsx:43-45` `status-draft` /
  `status-active` / `status-complete`; `CompetitionRoundRobinSection.tsx:99-101`;
  `BracketMatchCard.tsx:156` and `DoubleBracket.tsx:136` `status-live`.
- **lucide-react everywhere.** `ArrowLeft, Trophy` (`page.tsx:20-23`), `Calendar, Globe,
  Play, Trash2, Trophy, Users` (`CompetitionHeader.tsx:7-14`), `CheckCircle2, Clock, Play`
  (`CompetitionStats.tsx:5`), `Crown` (`CompetitionWinnerBanner.tsx:4`), `Pencil, Swords`
  (`CompetitionRoundRobinSection.tsx:8`), `Trophy, Medal` (`Standings.tsx:5`),
  `Users, Flame, Play, Pencil, Zap` (`ActiveCourtCard.tsx:6`), `Clock, RefreshCw`
  (`Win2OutView.tsx:5`), `Clock, RotateCw` (`TwoMatchRotationView.tsx:5`),
  `Users, Clock, Settings2` (`TeamQueueSection.tsx:6`), `GripVertical, ChevronUp,
  ChevronDown` (`QueueTeamItem.tsx:4`), `Repeat, AlertCircle, ArrowRightLeft`
  (edit-match). `TeamCard.tsx:11` additionally pulls `@heroicons/react`.
- **Emoji in JSX and in strings.**
  `ActiveCourtCard.tsx:141` `` `🔥 ${homeStreak} win - 1 more = crown!` ``,
  `:146` `👑 ×{homeChampionCount}`, and the same pair at `:240,245`;
  `TeamQueueSection.tsx:68` `👑×{item.championCount}`;
  `ChampionDisplay.tsx:27` and `DoubleBracket.tsx:242` `<span className="text-2xl">🏆</span>`.
- **Gradients.** `CompetitionWinnerBanner.tsx:17-18,25-27`,
  `CompetitionDraftTeams.tsx:31-33`, `ActiveCourtCard.tsx:35,123-127,223-227`,
  `TwoMatchCourtCard.tsx:52,147-151`, `TeamQueueSection.tsx:55-59`,
  `LeaderboardCard.tsx:77-79`, `QueueTeamItem.tsx:71-73`, `NextUpIndicator.tsx:18-20`,
  `ChampionDisplay.tsx:24-26`, `DoubleBracket.tsx:238-240`.
- **Big radii and glows.** `rounded-3xl` (`CompetitionNotFound.tsx:13`, `TeamCard.tsx:50`),
  `rounded-2xl` (`CompetitionWinnerBanner.tsx:23`), `rounded-xl` on 14 sites,
  `shadow-lg shadow-primary/20` (`CompetitionHeader.tsx:73`, `MatchActionDialog.tsx:64`,
  `StartCompetitionDialog.tsx:177`), `hover:shadow-md hover:shadow-primary/10
  hover:-translate-y-0.5` (`BracketMatchCard.tsx:69`).
- **Off-system colours.** `emerald-500` for wins (14 sites), `amber-500` for live/champion
  (18 sites), `red-500`/`red-400`, `sky-500` (`CompetitionStats.tsx:50`), `blue-500`
  (queue panels), `slate-400`/`amber-700` for medal ranks (`LeaderboardCard.tsx:66-67`),
  `text-blue-400` / `text-orange-400` bracket headings (`DoubleBracket.tsx:174,200`).
  Matchbook has exactly `--mb-green`, `--mb-red`, `--mb-gold`, `--mb-teal`, `--mb-plum`,
  `--mb-coral`, `--mb-navy`, `--mb-ink-muted`.
- **Colour-only initial-letter avatars** instead of crests
  (`CompetitionWinnerBanner.tsx:30-32`, `CompetitionDraftTeams.tsx:36-38`) and generic
  `Users` glyph tiles standing in for team identity (`ActiveCourtCard.tsx:129`,
  `TeamQueueSection.tsx:61`, `LeaderboardCard.tsx:81`, `QueueTeamItem.tsx:75`,
  `NextUpIndicator.tsx:21`). `crestForTeam()` / `Crest` / `TeamMark` exist and are unused.
- **Exclamation-mark copy.** `TeamQueueSection.tsx:41` "All teams are on court!",
  `Win2OutView.tsx:151-152` "Win 2 in a row → Champion → Back to queue!",
  `ActiveCourtCard.tsx:141` "1 more = crown!".
- **Dead code.** `animate-spin-slow` (`Win2OutView.tsx:147`) is not defined anywhere in the
  repo — a no-op class. `src/components/TeamCard.tsx` has **zero** importers since the
  Teams redesign; it is entirely dead and should be deleted, not converted.

### 2.2 Real layout bugs (not just styling)

**BUG-1 — the single-elimination bracket has zero-width columns; cards overlap on
mobile and the last round is clipped on desktop.**
`BracketMatchCard.tsx:61-63` renders

```tsx
<div className="relative" style={{ height }}>
  <div className="absolute top-1/2 -translate-y-1/2 w-full">
    <Card className="… w-56 …">
```

The card is absolutely positioned, so it contributes **no intrinsic width** to its flex
column. `Bracket.tsx:74`'s `flex w-full min-w-max justify-between gap-10` therefore sizes
each round column from the round *label* only. Consequences, both reproduced:
- at 390px (`shots/audit-competition-detail/tall-mobile-se-live.png`) the Semi-Finals
  cards render **on top of** the Quarter-Finals cards — the bracket is unreadable;
- at 1440px with 8 or 16 teams (`tall-desktop-se-live.png`, `tall-desktop-se-big.png`)
  the Finals card is sliced in half at the panel's right edge.
`DoubleBracket.tsx` does not have this bug because it lays cards out in normal flow with
`gap-4`/`gap-6` — which is also why the two brackets look nothing alike.

**BUG-2 — exponential dead space.** `Bracket.tsx:52-56`
`getMatchHeight = 140 * 2^(round-1)` gives a 560px-tall slot per finals match. On the
16-team fixture the bracket panel is mostly whitespace with cards floating in it.

**BUG-3 — brackets have no connectors.** `BracketMatchCard.tsx:199-201` draws a 16px stub
(`-right-4 w-4 h-0.5`) and nothing else. There is no tree, so with the zero-width columns
above there is no way to tell which cell feeds which.

**BUG-4 — the Edit Queue dialog overflows the viewport at 390px.**
`EditQueueDialog.tsx:110-126` is `flex-row` with Reset + spacer + Cancel + "Save Order";
in `mobile-dlg-editqueue.png` the Save button is cut off by the right edge and cannot be
pressed.

**BUG-5 — queue reordering is impossible on touch.** `QueueTeamItem.tsx:42-47` uses HTML5
drag-and-drop (`draggable`, `onDragStart`…), which does not fire on touch devices, and
the fallback arrows are `h-7 w-7` = 28px (`:84,102`), well under the 44px minimum. The
dialog's own copy still says "Drag teams or use arrows to reorder"
(`EditQueueDialog.tsx:66`).

**BUG-6 — with instant-win enabled there is no route to the scoring console.**
`ActiveCourtCard.tsx:66-87,168-183` gate both the card click and the Play/Continue button
on `canPlayMatch && !instantWinEnabled`. In the win2out fixture (`instantWinEnabled: true`)
the only interaction is "tap a team to declare a winner" — a real live score can no longer
be kept. Same in `TwoMatchCourtCard.tsx:90-110,178-193`.

**BUG-7 — completed round-robin matches are inert.**
`CompetitionRoundRobinSection.tsx:59-63` only calls `onMatchClick` when
`status !== "completed"`. A finished match cannot be opened, reviewed, or corrected —
there is no edit-result path anywhere on this screen.

**BUG-8 — match history silently truncates.** `MatchHistorySection.tsx:17-23`: the header
prints the true count, the list renders `.slice(0, 20)` inside `max-h-60`, and there is no
"view all". At 40+ matches the operator simply loses data.

**BUG-9 — hover-only affordances are invisible on touch.** The edit pencil is
`opacity-0 group-hover:opacity-100` in three places
(`CompetitionRoundRobinSection.tsx:110`, `BracketMatchCard.tsx:186`,
`DoubleBracket.tsx:156`), as is the bracket "Start/Continue" hint
(`BracketMatchCard.tsx:174`). On a phone these controls do not exist.

**BUG-10 — three stacked horizontal scrollers on mobile double elimination.**
`DoubleBracket.tsx:175,201` plus the grand-finals row each scroll independently, with no
scroll affordance and clipped round headers ("Winners Semi…", "Losers Rour…") — see
`tall-mobile-de-live.png`.

**BUG-11 — the standings table hides its most important column on mobile.** At 390px
(`tall-mobile-rr-live.png`) `Standings.tsx`'s 9 columns overflow and **PTS** — the column
that decides the competition — is off-screen behind a scroll nobody signals. Long team
names wrap to four lines because there is no `truncate`.

**BUG-12 — no state at all for 120 matches.** The 16-team fixture renders 120 schedule
rows and 16 standings rows with no pagination, virtualisation, round grouping, or filter.
Body scroll height reaches ~10,000px.

**BUG-13 — `document.documentElement` never grows.** `globals.css:393-399` sets
`html, body { height: 100% }`, so `document.documentElement.scrollHeight` is pinned to the
viewport while `body.scrollHeight` is 10,056px. Screenshot tooling and any future
scroll-position logic will read the wrong value. Worth fixing while converting the shell.

### 2.3 Mobile ergonomics

- Primary actions ("Start Competition", "Share Live") sit at the very top of a
  2,600px page, out of thumb reach (`CompetitionHeader.tsx:69-105`).
- Court-card team names wrap to three lines at 390px and the streak string
  "🔥 1 win - 1 more = crown!" wraps to three (`tall-mobile-w2o.png`).
- The mode banner (`Win2OutView.tsx:146-153`) is a full sentence that wraps to two lines
  and carries no actionable information.
- Leaderboard rows are ~57px tall × 8-16 teams, pushing match history below three screens
  of scroll.
- `MatchHistorySection.tsx:32-130` maintains two hand-written layouts (`sm:hidden` and
  `hidden sm:flex`) for the same data — duplicate markup that must be kept in sync.
- Touch targets under 44px: edit pencils `h-7 w-7`/`h-8 w-8`
  (`CompetitionRoundRobinSection.tsx:110`, `ActiveCourtCard.tsx:46`,
  `DoubleBracket.tsx:156`), queue arrows `h-7 w-7`, dialog swap button `size="icon"`.
- Native `<select>` in `TeamSelectDropdown.tsx:29-49` truncates to "Apex Me…" at 390px, so
  the operator cannot tell which team they picked.

### 2.4 Inconsistency with the already-redesigned pages

- `/competitions` (converted) links straight here; the user crosses from a navy/cream
  almanac console into a rounded pastel card page. The most jarring transition in the app.
- The converted Compete console **already renders a compact matchbook bracket**
  (`src/app/competitions/page.tsx:25-73` `BracketBox`, fed by
  `useMatchbookCompete.ts:165-191`) and a matchbook standings table
  (`:132-186`). This screen has a second, incompatible implementation of both.
- Data shaping lives in components here; every converted screen shapes data in a
  `useMatchbook*` hook.
- The loading spinner is a third variant (`page.tsx:95-99`) versus `PageLoadingSpinner`
  used by converted pages — which is itself still legacy (GAP-8).
- `DoubleBracket.tsx` duplicates `BracketMatchCard` inline instead of sharing it; the two
  bracket cards differ in width (`w-44` vs `w-56`), padding, font size and hover.
- `TwoMatchLeaderboard` and `TeamLeaderboard` already share `LeaderboardCard` — that
  generic-render-prop pattern is the right idea and should survive the conversion, just
  re-skinned.

### 2.5 Information architecture gaps

- **Draft is a dead end.** `tall-desktop-de-draft.png` is a masthead plus a 6-tile team
  list and 2,000px of empty paper. You cannot add or remove teams, rename, change format,
  set courts, set series length, toggle instant win, view scoring rules, or delete the
  competition — even though all of those are competition fields
  (`src/types/game.ts:41-62`, `src/types/competition-config.ts:17-27`).
- **Config is invisible.** `matchSeriesLength`, `numberOfCourts`, `instantWinEnabled`,
  `pointsForWin`, `allowTies`, and custom terminology are never displayed on the detail
  page. The Compete console *does* show "Best of N" (`useMatchbookCompete.ts:255-258`).
- **Completed competitions offer nothing.** No link to the summary, no export, no share,
  no rematch, no delete (`tall-desktop-rr-done.png`), and the results list is still titled
  "Match Schedule".
- **No round grouping** in the round-robin schedule despite `match.round` existing.
- **Play-in picker gives no preview.** `StartCompetitionDialog.tsx:109-163` asks the user
  to choose N teams for play-in matches while unselected teams grey out with no
  explanation, and never shows the bracket that will be generated.
- **`EditMatchDialog` uses court language everywhere.** `:68` renders
  `Edit Match - Court {match.position}` and `:71` "Change which teams are playing on this
  court" — wrong for round robin and for brackets, where `position` is a bracket slot.

### 2.6 Accessibility

- Colour is the only signal for won/lost (`emerald-500` text) in standings, RR rows,
  bracket cells and history.
- `CompetitionRoundRobinSection.tsx:66-73` handles `Enter`/`Space` on a div but never
  calls `preventDefault`, so Space scrolls the page as well as activating the row.
- Bracket round headings are `<span>`s (`Bracket.tsx:84`), so the bracket has no heading
  structure; `DoubleBracket.tsx:174,200,227` uses `<h3>` inconsistently.
- `Standings.tsx` has no `<caption>` and no `scope` on `<th>`.
- The drag-reorder list has no keyboard alternative announcement and no `aria-live` on
  order changes.
- `viewport` is locked (`layout.tsx:34-39` `maximumScale: 1, userScalable: false`), so the
  10px `text-[10px]` bracket pips cannot be zoomed.

---

## 3. Target design

### 3.1 Shell (identical for all five formats)

```tsx
<div className="matchbook-surface min-h-screen">
  <div className="flex">
    <MatchbookSidebar />
    <div className="min-w-0 flex-1">
      <MatchbookMobileBar active="/competitions" cta={{ href: "/competitions/new", label: "New" }} />
      <main className="px-4 py-5 sm:px-6 lg:px-8">
        <EventMasthead … />
        <FormatTabs … />            {/* only where the format has >1 view */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12"> … </div>
      </main>
    </div>
  </div>
</div>
```

No `max-w-*`, no `<Navigation />`, no back-link button — the sidebar/mobile bar *is* the
back path, exactly as on `/summaries`.

### 3.2 Masthead (`EventMasthead`)

Follows §3.2 of the design language, five slots:

1. **Title** — `matchbook-display text-4xl sm:text-5xl`, the competition name. Because the
   name is user data, do **not** split it two-tone; append the coral full stop only when
   the name is short enough. `truncate` inside a `min-w-0` wrapper.
2. **Status badge** — coral-frame variant of the shipped `STATUS_STYLES` lookup
   (`src/app/competitions/page.tsx:19-23`): `Draft` gold / `Live` red / `Final` green,
   `border-[2px]` frame, `matchbook-display tracking-[0.14em]`.
3. **Dateline** (`hidden sm:block`) — line 1 `{typeLabel} • {n} Teams • {n} {venuePlural}`
   using `useTerminology`, line 2 `.mb-kicker` `Created {date}` +
   `suppressHydrationWarning`.
4. **Actions** (`ml-auto`, ≤2 buttons, ≤1 coral, ≤1 navy), by state:
   - draft → navy `Edit Setup` + coral `Start Competition`
   - live, not shared → navy `Manage` (overflow menu) + coral `Share Live`
   - live, shared, creator → navy `Share` + coral `End Competition`
   - live, shared, viewer → navy `Share` only, plus a `.mb-kicker` "View only" caption
   - completed → navy `Delete` + coral `View Summary`
   Everything beyond two buttons (export, rename, delete, duplicate) moves into a
   `MbMenu` behind the navy button.
5. **Account chip** (`hidden md:flex`) — verbatim from the shipped markup.

`mb-5` to the grid.

### 3.3 Format tabs

Formats with more than one view get a segmented control directly under the masthead
(`MbTabs`, GAP-5): a horizontal strip with `border-bottom: 1.5px solid navy`, coral 3px
bottom border on the active tab, `min-h-[44px]` per tab, `?tab=` in the URL so a refresh
holds position.

| Format | Tabs |
| --- | --- |
| round_robin | **Standings** · Schedule · Results |
| single_elimination | **Bracket** · Schedule · Results |
| double_elimination | **Winners** · Losers · Finals · Results |
| win2out | **Courts** · Queue · Leaderboard · Results |
| two_match_rotation | **Courts** · Queue · Leaderboard · Results |

At `xl` and above the tabs are *view filters over the same 12-column grid* — all panels
are visible, and the tab scrolls to / highlights its panel. Below `xl` the tabs genuinely
switch, so a phone shows one panel at a time instead of a 2,600px scroll. This is the
single biggest mobile win available.

### 3.4 Round robin

**Desktop (`xl`)** — `grid grid-cols-1 gap-4 xl:grid-cols-12`:

| Panel | Span | Tone | Content |
| --- | --- | --- | --- |
| Standings | 7 | paper | `mb-table`, columns `# · Team · P · W · L · PF · PA · PD · Pts · Form`. Rank 1 gets the teal inset rail; `TeamMark` in the Team cell; `Pts` and `PD` are `matchbook-display font-bold tabular-nums`; `FormSquares` last. Legend becomes a `border-t-[1.5px] border-mb-navy` footer strip of `.mb-kicker` pairs. |
| Event Status | 5 | **navy** | Four `StatusStat` blocks (matches completed + %, teams, format, live now / champion) — reuse `src/app/competitions/page.tsx:75-102` verbatim. |
| Schedule | 7 | paper | Grouped by round with a `.mb-kicker` "Round N" sub-head per group, `divide-y divide-mb-rule` rows: `grid-cols-[44px_1fr_auto_1fr_auto]` = round/match no · home `TeamMark` · score-or-status · away `TeamMark` reversed · action. Live row gets the coral inset rail + `.mb-live-dot`. |
| Live Now | 5 | paper | Boxed `.mb-score-box` per in-progress match. `PanelEmpty` otherwise. |
| Recent Results | 5 | paper | Last 6, `{home} – {away}` en dash row register. |

**Mobile** — panels stack in the order Standings → Live Now → Schedule → Results.
Standings drops to `# · Team · W-L · Pts` (PF/PA/PD/Form behind `hidden sm:table-cell`);
**Pts must never be the column that falls off the edge**. Schedule rows collapse to two
lines: teams on line 1, score/status on line 2.

### 3.5 Single & double elimination

Both formats render **one** `<BracketRail>` component. `DoubleBracket`'s inline card is
deleted; there is exactly one bracket cell in the system.

**Cell (`MbBracketCell`)** — 156px wide, `border-[1.5px] border-mb-navy bg-mb-paper-bright`,
two rows split by a hairline, each row `Crest 16 + truncate name + .mb-score-box`.
Directly modelled on the shipped `BracketBox` (`src/app/competitions/page.tsx:25-73`),
extended with: winner row `font-bold` + coral score, loser row `text-mb-ink-muted`,
`live` → bottom strip with `.mb-live-dot` + "Live", `bye` → single row + a "Bye"
`.mb-kicker`, `TBD` → `.mb-kicker` "TBD" on a `rgba(7,50,77,0.04)` fill. **Never** absolutely
positioned — the cell participates in layout (fixes BUG-1).

**Rail layout** — one `overflow-x-auto` container for the whole bracket (not one per
section, fixing BUG-10). Rounds are flex columns with `gap-5`, each column
`flex flex-col justify-around` with a **linear** vertical rhythm (`gap-3` between cells,
column height driven by content) rather than the exponential slot heights. Round labels
are `.mb-kicker` inside an `<h3 className="sr-only">`-backed heading so the bracket has
structure.

**Connectors** — a single SVG overlay per rail drawing navy 1px elbows between cell
midpoints, `stroke: var(--mb-rule)`, coral for the path a live match sits on. Rendered
from measured cell positions (see §6 risk note).

**Double elimination** — three labelled sections inside one scroller and one panel:
`Winners` / `Losers` / `Grand Finals`, separated by `border-t-[1.5px] border-mb-navy` and
a `.mb-kicker` section label. Section colour is carried by a 3px inset rail
(`--mb-teal` winners, `--mb-gold` losers, `--mb-coral` grand finals), never by tinted
heading text.

**Champion** — replaces `ChampionDisplay`/the 🏆 span with a navy `Champion` panel:
`Crest 62`, `.mb-kicker` "Champion", name at `matchbook-display text-[1.5rem]`, and the
final score beneath. On desktop it is the trailing column of the rail; on mobile it is
the first panel above the bracket.

**Desktop grid:** Bracket 12-span (full width, it needs the room), then
Event Status 5 / Live Now 4 / Recent Results 3 beneath.
**Mobile:** the bracket rail keeps horizontal scroll but gains (a) a `.mb-kicker`
"Scroll for later rounds →" caption, (b) a round-jump chip row, and (c) a
**Rounds list fallback** — the same matches as a vertical `divide-y` list grouped by
round, shown by default under `sm` with a "Show bracket" toggle. A 16-team bracket on a
390px screen is not usable as a rail; the list is.

### 3.6 Win 2 & Out / Two-match rotation

The two views keep their distinct data but converge on one layout.

| Panel | Span | Tone | Content |
| --- | --- | --- | --- |
| Courts | 7 | paper | One `MbCourtCard` per court, stacked with `divide-y divide-mb-rule` inside a single panel (not N loose cards). |
| Format Status | 5 | **navy** | `StatusStat` blocks: format, courts, matches completed, rule line ("Win 2 in a row to take the crown" / "Play 2 matches then rotate") — dry, no exclamation, replacing the mode banner. |
| Queue | 5 | paper | Numbered `divide-y` rows, `#n` in `matchbook-display`, `TeamMark`, right-side stat (`Crowns n` / `nW–nL`). Head `meta` slot carries the `Reorder` `.mb-panel-link`. `PanelEmpty`: "No teams are waiting — every team is on {venue}." |
| Leaderboard | 4 | paper | `mb-table mb-table-compact`: `# · Team · Crowns|W · L · Played · Pct`. Teal rail on rank 1; a `Playing` framed badge on teams currently on court. This replaces the 57px card rows with 32px table rows. |
| Results | 4 | paper | Ledger rows `#n · C{n} · TeamMark · score · TeamMark`, **paginated** — 15 rows with a `Show more` footer link, and a count in the head `meta`. No inner `max-h` scroller (fixes BUG-8). |

**`MbCourtCard`** — a `1fr auto 1fr` grid inside the Courts panel:
- left/right: `Crest 40` + `matchbook-display` name + one `.mb-kicker` sub-line
  (`Streak 1 · one more for the crown` / `Crowns ×2` / `First match` / `1/2 matches`);
- centre: pending → `.mb-score-box` "VS"; live → hero score
  `matchbook-display text-5xl tabular-nums` with `{home} – {away}` and the live dot pair;
- a full-width action strip beneath: **always** a coral `Play`/`Continue` button, and
  when `instantWinEnabled`, two additional outline buttons `Win: {home}` / `Win: {away}`
  plus a `.mb-kicker` "Instant win — no scoring" caption. Both paths are always available
  (fixes BUG-6);
- edit affordance is a persistent `h-11 w-11` icon button in the card's top-right,
  visible on all pointer types, enabled only for `pending` (fixes BUG-9).

**Mobile:** courts first and full width, then Format Status, Queue, Leaderboard, Results.
The court card's action strip is the one place a bottom-sticky bar is justified: when a
court is live, pin the `Continue` button to the bottom of the viewport with
`padding-bottom: env(safe-area-inset-bottom)` while the Courts tab is active.

### 3.7 Draft state

Draft is currently the emptiest screen in the app and should become the setup console.

| Panel | Span | Tone | Content |
| --- | --- | --- | --- |
| Entrants | 7 | paper | `divide-y` list of `TeamMark` rows with a remove control, plus an `Add team` row that opens the existing team picker. Head `meta` = `.mb-kicker` "{n} Teams". |
| Setup | 5 | **navy** | `StatusStat` blocks: format, series length, courts, instant win, points-for-win / ties, terminology. Each row links to the setup dialog. |
| What Will Be Generated | 7 | paper | A live preview: for RR, "{n} matches over {r} rounds"; for elimination, the seeded round-1 pairings and which teams get byes — the play-in decision moves **out** of the start dialog and into this panel, where there is room to show it. `mt-auto` coral `Start Competition` button. |
| Danger Zone | 5 | paper | Delete competition, with a `--mb-red` framed confirm. |

The start dialog then degrades to a short confirmation ("This generates {n} matches and
locks the entrant list.").

### 3.8 Empty / loading / error / permission states

- **Loading** → `MbPageLoading` (GAP-8): matchbook surface + sidebar + mobile bar +
  skeleton panels. Never the legacy spinner.
- **Not found** → `matchbook-surface` shell with a single 12-span panel and `PanelEmpty`:
  *"No competition exists at this address — it may have been deleted."* CTA
  "Back to competitions".
- **Shared-mode viewer** → a full-width `.mb-kicker` strip between masthead and grid:
  *"View only — the organiser controls this event."* framed `border-y-[1.5px] border-mb-navy`.
  All edit affordances are removed rather than disabled.
- **Offline / sync error** → read `SessionContext.error` and render the same strip in
  `--mb-red` with a `Retry` `.mb-panel-link`. This is a new capability; today the page is
  silent.
- **Every panel** gets a `PanelEmpty` with the house sentence shape
  *"No X exist yet — Y."* Leaderboard and Results must stop returning `null`.
- **Too much data** → schedule groups by round and collapses completed rounds behind a
  `Show N completed` footer link; results paginate at 15; standings stay full (a table row
  is cheap) but gain a sticky `thead` inside the `overflow-x-auto` wrapper.

---

## 4. Interaction & motion

Matchbook motion is deliberately tiny (§7 of the design language). The entire allowance
for this screen:

**Should animate**
- Panel entrance: opacity 0→1 + `translateY(6px)→0` at 280ms `cubic-bezier(.2,.8,.3,1)`,
  staggered 40ms in grid order, capped at 6 panels. CSS only — do **not** reintroduce
  framer-motion.
- Button hover/press: the existing `.mb-btn` filter transition plus the global
  `button:active { transform: scale(.98) }`. Nothing else.
- Row hover: `transition-colors` to `rgba(7,50,77,0.04)` — 150ms.
- `.mb-live-dot` pulse on live matches and live court cards, dot + word always together.
- **Score change** (the one value that may animate): opacity + 4px rise at 120ms, no
  scale, no flip, no spring. Applies to court-card hero scores and live bracket cells when
  a Firestore update lands.
- Tab switch: cross-fade at 180ms. No slide, no `layoutId`.
- Dialog: overlay fade + content fade at 280ms, no zoom, no bounce.

**Must NOT animate**
- Bracket cells, connectors, and the whole rail — a bracket that reflows or slides is
  unreadable. Cells appear with the panel, not individually.
- Standings row reordering. When standings change, rows re-render in place; no FLIP, no
  layout animation. Rank changes are signalled by the teal rail moving, nothing more.
- Progress bars filling, counters counting up, confetti, trophy shine, the champion panel.
- Queue reorder — the row moves instantly on arrow press; the only feedback is a 150ms
  background tint on the moved row.
- Anything on `prefers-reduced-motion` (the global clamp in `globals.css:1240` covers
  transitions; any JS-driven score animation must additionally check `useReducedMotion()`
  and render the end state).
- Route transitions into `/match/[id]`. The scoring console must appear instantly.

**Interaction rules**
- Every match cell/row is a real `<button type="button">`, not a div with a keydown
  handler, and `Space` must `preventDefault()`.
- Completed matches become clickable → a result-review dialog with an `Edit result` path
  (fixes BUG-7).
- The edit affordance is always visible at ≥44px; no hover-only controls anywhere.
- Bracket rail: horizontal scroll with `scroll-snap-type: x proximity` on round columns,
  and the rail auto-scrolls once on mount to the earliest round containing a live or
  pending match.
- Live updates (shared mode) must never move the scroll position or steal focus.

---

## 5. New primitives required

Ordered by how much of the app they unblock. **Shared** marks primitives other unconverted
screens need too — build them in `src/components/matchbook/` + `globals.css`, not locally.

| # | Primitive | Proposed API | Shared with |
| --- | --- | --- | --- |
| P1 | **`MbDialog`** (GAP-1) | `<MbDialog open onOpenChange title icon tone="paper"\|"navy" size="sm"\|"md"\|"lg">` + `MbDialogBody` / `MbDialogFooter` | **Every** screen. Blocks D1–D7 here. Highest priority. |
| P2 | **`MbTabs`** (GAP-5) | `<MbTabs value onValueChange items={[{value,label,icon,count}]} />`, URL-syncable | `/match/[id]`, `/session/[shareCode]`, volleyball rotation designer |
| P3 | **`MbBadge`** (GAP-4) | `<MbBadge tone="live"\|"draft"\|"final"\|"win"\|"loss"\|"neutral"\|"teal" variant="text"\|"framed"\|"solid" size>` | Compete, History, Teams, session, summary |
| P4 | **`BracketRail` + `MbBracketCell` + `BracketConnectors`** | `<BracketRail rounds={MbBracketRound[]} onSelect={(id)=>void} onEdit={(id)=>void} champion={MbTeam\|null} variant="single"\|"double" />`; cell props `{home, away, homeScore, awayScore, homeWon, awayWon, live, pending, bye, tbd}` — a superset of the shipped `MbBracketCell` in `useMatchbookCompete.ts:25-34` | `/session/[shareCode]` renders `Bracket`/`DoubleBracket` today (`src/app/session/[shareCode]/page.tsx:9-16`) and `/competitions` already has a read-only cousin. **Must be one component.** |
| P5 | **`MbCourtCard`** | `<MbCourtCard court={n} venue="court" home away homeScore awayScore status streak crowns sessionLabel canEdit canPlay instantWin onPlay onEdit onInstantWin />` | `/session/[shareCode]` (same rotation views), `/match/[id]` header |
| P6 | **`MbStandingsTable`** | `<MbStandingsTable rows={MbStandingLine[]} compact highlightTeamId columns={...} />` — reconciles `Standings.tsx` with the shipped table in `src/app/competitions/page.tsx:141-183` | Compete console, session viewer, summary |
| P7 | **`MbMatchRow`** | `<MbMatchRow label home away homeScore awayScore status onSelect onEdit variant="schedule"\|"result"\|"live" />` | Compete, History, session, summary, quick-match |
| P8 | **`MbStatusStat`** (GAP-9) | promote `StatusStat` out of `src/app/competitions/page.tsx:75-102` into the kit unchanged | Every console screen |
| P9 | **`EventMasthead`** (GAP-9) | `<EventMasthead title status meta actions />` — the five-slot masthead as a component | Every converted screen re-implements this by hand today |
| P10 | **`MbPageLoading` / `MbSkeleton`** (GAP-8) | `<MbPageLoading active="/competitions" />` | 4 already-shipped screens are currently regressing through the legacy spinner |
| P11 | **`MbReorderList`** | `<MbReorderList items onReorder renderItem />` — pointer-events based (works on touch), 44px handles, `↑`/`↓` buttons, `aria-live` announcements, keyboard `Alt+↑/↓` | Queue editor, volleyball formation editor, create-competition wizard |
| P12 | **`MbSegmentedStat` / progress** | `<MbProgressRule value={0..100} label />` — a 4px navy/coral rule, not a rounded shadcn `<Progress>` | Compete, session, summary |
| P13 | **`MbMenu`** (overflow) | `<MbMenu trigger items={[{label,icon,tone,onSelect}]} />` — needed the moment actions exceed two | Teams, Compete, History |
| P14 | Sprite additions | `close`/`x` (required by P1), `crown`, `flame`/`streak`, `trophy`, `queue`, `grid`, `pencil` | Global |
| P15 | Motion tokens (GAP-11) | `--mb-dur-fast/base/slow`, `--mb-ease-out/in-out` in `globals.css` | Global — must land before anyone writes §4 |

**Not new, just reuse:** `Panel`, `PanelEmpty`, `Crest`, `TeamMark`, `FormSquares`,
`FormLetters`, `MbIcon`, `crestForTeam`, `mb-table`, `mb-score-box`, `mb-btn`,
`mb-kicker`, `mb-live-dot`, `MatchbookSidebar`, `MatchbookMobileBar`.

**Data layer:** add `src/components/matchbook/useMatchbookCompetitionDetail.ts` mirroring
`useMatchbookCompete.ts` — it owns crest resolution, standings shaping, bracket-round
construction, court/queue/leaderboard shaping, and terminology, and returns view-ready
rows. `useCompetitionDetailPage.ts` keeps the *mutations* (start/end/auto-complete/
auto-session) unchanged.

---

## 6. Risks

**R1 — `Bracket`, `DoubleBracket`, `Win2OutView`, `TwoMatchRotationView` are shared with
`/session/[shareCode]`** (`src/app/session/[shareCode]/page.tsx:9-23`). Converting them
changes the public live-session viewer, which is a different agent's scope. Either convert
them together or ship the new components alongside the old ones and switch the session
page in the same PR. Do not fork.

**R2 — Bracket connector geometry.** Drawing real elbows needs measured positions
(`ResizeObserver` + `getBoundingClientRect`, or a CSS-grid layout with deterministic row
tracks). Measurement in a horizontally scrolling container is fiddly and re-runs on every
resize. Mitigation: compute the layout arithmetically (round *r* has `2^(R-r)` cells; cell
*i* centres between children `2i` and `2i+1`) and render the SVG from those numbers rather
than from the DOM. Never animate it.

**R3 — Non-power-of-2 team counts and byes.** `getTotalRounds` / `getTotalWinnersRounds`
and `getPlayInMatchCount` exist precisely because brackets are ragged. The new rail must
be tested at 3, 5, 6, 7, 8, 11, 16 teams. `getDoubleBracketStructure` returns ragged
losers rounds where a round can be empty — the current code renders an empty column.

**R4 — Perf on large brackets and long lists.** 16 teams = 15 single-elim cells,
30 double-elim cells; 16-team RR = 120 rows. `BracketMatchCard` is already `memo`'d and
that must be preserved. The SVG connector overlay must not re-render per cell. The
results ledger must paginate rather than render 120 rows.

**R5 — The auto-complete effect can fire mid-conversion.**
`useCompetitionDetailPage.ts:217-244` runs on every `matches` change and writes to app
state. Any refactor that changes the identity of `matches` or `competition` risks an
extra `completeCompetition` call. Do not touch that effect while restyling.

**R6 — The auto-session effect touches Firestore** (`:246-290`) and depends on
`isConfigured`; the end-competition flow deletes the local competition and redirects
(`:292-312`). Both are easy to break by reordering the header actions. Keep the callbacks
identical and only change what renders them.

**R7 — Rotation court-state mutation is duplicated and fragile.**
`useEditMatchDialog.ts:145-209` contains two near-identical 30-line blocks that rewrite
`win2outState.courts` / `twoMatchRotationState.courts` by index search. Any change to the
edit dialog must preserve this exactly; ideally extract it to `lib/` first, under test.

**R8 — Instant-win writes results without a match console.**
`useRotationInstantWin` completes a match and advances rotation state directly. Adding the
`Play` button back (BUG-6) means two paths can now complete the same match — confirm the
rotation processor is idempotent before shipping.

**R9 — Terminology is dynamic.** "Court" is configurable
(`src/types/competition-config.ts:6-15`). Every new string must go through
`useTerminology`; hardcoding "Court" in the new components would be a regression, and the
existing `MatchHistorySection.tsx:35,90` already hardcodes it.

**R10 — Viewport is locked and there is no safe-area handling.** Any bottom-anchored
element (§3.6) must add `padding-bottom: env(safe-area-inset-bottom)` itself, and
`viewport-fit: cover` is not set in `layout.tsx` (GAP-3).

**R11 — Dialog conversion is on the critical path.** Seven dialogs on this screen all
depend on P1. If `MbDialog` is not ready, this screen ships half-converted with shadcn
modals — the exact regression the design doc calls the loudest in the app.

**R12 — `html, body { height: 100% }`** (`globals.css:393-399`) breaks
`documentElement.scrollHeight`. If the conversion introduces sticky headers, scroll-spy
tabs, or scroll restoration, fix this first.

**R13 — Dead file.** `src/components/TeamCard.tsx` has no importers. Delete it rather than
converting it; leaving it invites someone to "fix" it later.

---

## 7. Definition of done

**Shell & structure**
- [ ] `/competitions/[id]` renders the standard Matchbook shell; `<Navigation />`,
      `max-w-6xl`, and the back-link button are gone.
- [ ] One `<h1>` masthead with status badge, dateline (`hidden sm:block`,
      `suppressHydrationWarning`), ≤2 action buttons, and the account chip.
- [ ] Grid is `grid-cols-1 gap-4 xl:grid-cols-12` with spans only from 7/5, 4/4/4, 12.
- [ ] Every region is a `<Panel>`; 1–2 navy panels maximum.
- [ ] `MbTabs` present for all five formats, URL-synced, switching (not filtering) below `xl`.

**Formats**
- [ ] All five formats render with the fixture (`scratchpad/gen-fixture.mts`) at 375, 390,
      768, 1024, 1280, 1440.
- [ ] Single and double elimination share **one** bracket cell and **one** rail; the
      inline card in `DoubleBracket.tsx` is deleted.
- [ ] Bracket cells participate in layout — verified no overlap at 390px and no clipped
      final column at 1440px with 8 **and** 16 teams (BUG-1, BUG-2).
- [ ] Connectors render for every round and match the real parent/child relationships.
- [ ] Exactly one horizontal scroller per bracket (BUG-10), with a visible scroll cue and
      a vertical rounds-list fallback below `sm`.
- [ ] Standings never hide `Pts` on mobile (BUG-11).
- [ ] Round-robin schedule is grouped by round; completed rounds collapse.
- [ ] Results ledger paginates; the header count and the rendered count agree (BUG-8).
- [ ] Court cards always expose a path to `/match/[id]`, including with
      `instantWinEnabled` (BUG-6).
- [ ] Completed matches are openable and their results editable (BUG-7).
- [ ] Draft renders the four-panel setup console; entrants can be added/removed; the
      generated schedule is previewed before starting.

**Capability parity**
- [ ] All 14 behaviours in §1.4 verified by hand against the fixture: start (all 5
      formats, with and without play-in), auto-complete, auto-session, end-competition →
      summary redirect, `canEdit` gating, instant win, team swap (RR, bracket same-round,
      rotation with court sync), queue reorder, terminology override, bye rendering,
      series length, lazy loading.

**States**
- [ ] Loading uses `MbPageLoading`; the legacy spinner is gone from this route.
- [ ] Not-found, shared-viewer, and sync-error states all render Matchbook copy;
      `SessionContext.error` is surfaced.
- [ ] Every panel that can be empty renders `PanelEmpty` with an "exist yet —" sentence;
      no panel returns `null` (Leaderboard, Results).
- [ ] 120-match / 16-team competition is usable: no layout break, no >5s interaction.

**System hygiene**
- [ ] Zero matches in the changed files for the §9 anti-pattern list: no `Card`/`Button`/
      `Badge`/`Progress`/`Separator`, no `status-*`, no lucide/heroicons, no gradients,
      no `rounded-{lg,xl,2xl,3xl,full}` outside the sanctioned exceptions, no
      `bg-background`/`text-muted-foreground`/`border-border`/`text-primary`, no
      `emerald/amber/sky/blue/slate` utilities, no framer-motion.
- [ ] **Zero emoji** in JSX and in strings (currently 7 occurrences).
- [ ] `animate-spin-slow` and `src/components/TeamCard.tsx` deleted.
- [ ] All team identity via `crestForTeam` / `Crest` / `TeamMark`; no initial-letter tiles,
      no `Users` glyph stand-ins.
- [ ] All icons are `MbIcon` with sprite ids.
- [ ] `tabular-nums` on every score, stat, record, and table measure; en dash `–` between
      scores.
- [ ] Data shaping lives in `useMatchbookCompetitionDetail.ts`.

**Interaction, motion, a11y**
- [ ] Motion is exactly §4; no entrance animation on bracket cells; no standings reorder
      animation; `prefers-reduced-motion` verified.
- [ ] Every interactive cell/row is a `<button>`; `Space` calls `preventDefault`.
- [ ] No hover-only controls; every touch target ≥44×44 (`min-h-[44px]` / `h-11 w-11`).
- [ ] Queue reorder works on touch and by keyboard, with `aria-live` announcements.
- [ ] Won/lost is never colour-only — carried by weight, a form square, or a label.
- [ ] Icon-only controls have `title` + `aria-label`; the standings table has a `caption`
      and `scope` on headers.
- [ ] Contrast checked against §1.3 (no gold text on paper; no ink-muted on navy).

**Build**
- [ ] `npx tsc --noEmit` clean.
- [ ] `npx eslint <changed paths>` clean.
- [ ] `npx vitest run` green.
- [ ] `/session/[shareCode]` still renders (R1) — it imports the same four view
      components.
- [ ] Visually diffed side by side against `src/app/competitions/page.tsx` and
      `src/app/summaries/page.tsx`.
