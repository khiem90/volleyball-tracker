# Redesign brief — Live scoring consoles

**Screen group:** `/match/[id]` (authenticated / shared live scoring) and `/match/guest` (in-memory guest scoring)
**Status:** not yet converted to Matchbook. Still on the "playful warm cream/red" theme plus full-bleed team-colour gradients.
**Audit date:** 2026-08-08
**Audit evidence:** screenshots at 1440×900, 390×844 and 844×390 in
`C:/Users/khiem/AppData/Local/Temp/claude/C--Dev-Tournament-Tracker--claude-worktrees-app-redesign-features-cf1ebd/bbc48bd4-cabe-4606-b848-eecddebf3c28/scratchpad/shots/audit-live-scoring/`

This is the highest-stakes screen in the product. It is the only screen used *during* play — one-handed, at arm's length, outdoors, under time pressure, by someone who is also watching a game. Every other screen can afford to be pretty. This one has to be correct at three metres.

---

## 1. Inventory

### 1.1 Routes and files

| # | Thing | Route | File |
|---|---|---|---|
| 1 | Live match console | `/match/<id>` | `src/app/match/[id]/page.tsx` |
| 2 | Guest match console | `/match/guest` | `src/app/match/guest/page.tsx` |
| 3 | Console state machine | — | `src/hooks/useMatchPage.ts` (509 lines) |
| 4 | Guest state machine | — | `src/hooks/useGuestQuickMatch.ts` |
| 5 | Fullscreen + wake-lock | — | `src/hooks/useFullscreen.ts` |
| 6 | Team score panel (×2 per screen) | both | `src/components/match/TeamScorePanel.tsx` |
| 7 | Floating fullscreen control bar | both | `src/components/match/FullscreenControls.tsx` |
| 8 | End-match confirm dialog | both | `src/components/match/MatchCompleteDialog.tsx` |
| 9 | Rotate-device dialog | both | `src/components/match/RotateDeviceDialog.tsx` |
| 10 | Guest result modal | guest only | `src/components/GuestMatchComplete.tsx` |
| 11 | Global undo toast (overlaps this screen) | app-wide | `src/components/UndoToast.tsx`, `src/components/GlobalUndoToast.tsx` |
| 12 | Compact score display | — | `src/components/ui/match-score.tsx` — **currently imported by nothing** (dead) |
| 13 | Barrel | — | `src/components/match/index.ts` |

### 1.2 Product capabilities that must survive conversion

Nothing in this list may be lost.

**Scoring**
- Tap anywhere on a team's panel → +1 to that team (`TeamScorePanel.tsx:36`).
- Keyboard `Enter`/`Space` on a focused panel → +1 (`TeamScorePanel.tsx:37-43`).
- Explicit `−` and `+` icon buttons per team; `−` floors at 0 (`useMatchPage.ts:150-153`).
- `+`/`−` buttons must `stopPropagation` so they don't double-fire the panel tap (`TeamScorePanel.tsx:128-131`).
- Undo one step, driven by an in-memory score history stack (`useMatchPage.ts:168-173`); disabled when `history.length < 2`.
- Leading indicator on whichever side is ahead; neither side when tied.
- Scores write straight through to `updateMatchScore` → localStorage (or Firestore in shared mode) on every tap.

**Match lifecycle**
- A `pending` match auto-transitions to `in_progress` on mount (`useMatchPage.ts:118-122`; guest equivalent `match/guest/page.tsx:89-93`).
- End Match is blocked while scores are equal (`useMatchPage.ts:457-459`, `useGuestQuickMatch.ts:104`).
- Confirm dialog shows both scores, both team colours, and the computed winner before committing.
- On confirm, `handleCompleteMatch` (`useMatchPage.ts:175-453`) branches across **five** competition formats:
  - **Series (best-of-N)** for round_robin / single_elim / double_elim: increments `homeWins`/`awayWins`, and if neither side has reached `winsNeeded` it **resets the score to 0-0, stays on the page, and starts the next game** rather than navigating away (`:206-218`).
  - **win2out**: `processMatchResult` → updated competition state + a generated next match → `completeMatchWithNextMatch` → redirect to the competition.
  - **two_match_rotation**: same shape via `processTwoMatchRotationResult`.
  - **single/double elimination**: `advanceWinner` propagates the winner into the next bracket slot, then either `updateMatches` (shared mode) or `completeMatch` + per-match `updateMatchTeams` (local).
  - **quick match** (`competitionId === null`): completes and redirects to `/`.
  - Plus: after any of these, if every match in the competition is complete, it computes the competition winner (round-robin standings, or the final/grand-final match) and calls `completeCompetition`.
- Back navigates to the parent competition if there is one, else `/` (`useMatchPage.ts:463-469`).

**Series presentation**
- "Best of N" and "Game M" chips, plus a running series tally line `Home H - A Away` (`match/[id]/page.tsx:116-132`).
- Series only applies to round_robin / single_elim / double_elim (`useMatchPage.ts:90-98`).
- Labels swap between match-level and game-level wording: `End Game` vs `End Match`, `End Game?` vs `End Match?`, `Confirm Result` vs `Confirm Winner` (`match/[id]/page.tsx:77-84`).

**Fullscreen / court mode**
- Fullscreen is landscape-only. In portrait, tapping Fullscreen opens the rotate-device dialog instead (`useMatchPage.ts:43-53`).
- Entering fullscreen requests a **screen wake lock** so the device doesn't sleep courtside; re-acquires it on `visibilitychange` (`useFullscreen.ts:23-37, 124-135`).
- Rotating back to portrait auto-exits fullscreen (`useMatchPage.ts:55-71`).
- Escape / browser-driven fullscreen exit is detected and syncs state back (`useFullscreen.ts:97-121`).
- In fullscreen the header is removed, panels force `flex-row`, scores scale up to `20rem`, and a floating pill rail carries Undo / End / Exit.

**Permissions & shared sessions**
- `canEdit` comes from `AppContext` → `SessionContext`; it is `true` for local use and `role === "admin"` in a shared session (`AppContext.tsx:1086`).
- When `!canEdit && isSharedMode`, panels show a "View Only" pill, hide the steppers, and show "Live Score" instead of "Tap to score" (`TeamScorePanel.tsx:63-72, 156-162`).
- When `!canEdit`, the header hides Undo and End Match entirely (`match/[id]/page.tsx:146-168`).

**Guest mode**
- Fixed `Team A` / `Team B` from `src/constants/guestTeams.ts`, in memory only, nothing persisted.
- Result modal with score recap, winner, a four-item "sign in to unlock" grid, Play Again, and Sign In (`GuestMatchComplete.tsx`).
- `Play Again` resets score, history, and both modals (`useGuestQuickMatch.ts:123-135`).

### 1.3 State inventory (what the redesign must draw)

| State | Reachable how | Today's rendering | Verified |
|---|---|---|---|
| **Loading / hydrating** | every page load | **None.** Renders the "Match not found" error for ~1 frame, then swaps. | ✅ probe: first paint text = `"Match not found \| This match may have been deleted."` |
| **Live, no series** | quick match | header with LIVE chip only | ✅ `desk-match-quick-tied.png` |
| **Live, in series** | round-robin w/ `matchSeriesLength > 1` | LIVE + "Best of 3" + "Game 2" + tally line | ✅ `desk-match-series.png` |
| **Tied score** | equal scores | End Match silently disabled, no explanation | ✅ `mob-match-quick-tied.png` |
| **Leading** | unequal scores | amber "Leading" crown pill floating over the panel | ✅ |
| **Completed match opened** | navigate to a finished match | **renders as fully live**: LIVE chip, "Tap to score", steppers; taps silently no-op; series chip reads "Game 0" | ✅ `desk-match-completed.png` + probe (`changed: false`) |
| **View-only (shared, viewer role)** | join a session as viewer | "View Only" pill, no steppers, "Live Score" caption | ⚠️ code-verified only (needs Firestore) |
| **Match not found** | bad id | trophy glyph + "Match not found" + "Back to Dashboard" | ✅ `desk-match-notfound.png` |
| **Match exists, team deleted** | delete a team mid-match | **also renders "Match not found"** — wrong and misleading | ✅ probe |
| **Complete confirm dialog** | End Match | glass card, colour swatches, emerald winner | ✅ `desk/mob-complete-dialog.png` |
| **Rotate device dialog** | Fullscreen in portrait | infinitely rotating rounded rectangle | ✅ `mob-rotate-dialog.png` |
| **Fullscreen / court view** | Fullscreen in landscape | header removed, floating pill rail | ⚠️ real Fullscreen API can't be driven headlessly; layout inferred from `landscape-match-series.png` |
| **Mobile landscape, not fullscreen** | rotate without entering fullscreen | **"Leading" pill collides with the team name; steppers are clipped off the bottom of the viewport** | ✅ `landscape-match-series.png` |
| **Guest live** | `/match/guest` | as above + amber "Guest Mode" chip | ✅ |
| **Guest result modal** | confirm winner | amber trophy, emerald winner, sign-in grid | ✅ `mob-guest-complete-modal.png` |
| **Offline / write failure** | lose network in shared mode | **no state exists.** `AppContext` fire-and-forgets `syncAllData`; the console never shows sync status, staleness, or failure. | ✅ code-verified |
| **"Too much data"** | 3-digit scores, 50-char team names | 3-digit scores fit at desktop/mobile but a long name wraps to 2 lines, ragged-left, and shoves the numeral down; at fullscreen `20rem` a 3-digit score will overflow horizontally | ✅ `desk/mob-match-long-bignum.png` |
| **Undo unavailable after reload** | reload mid-match | Undo is disabled even at 18-15, because the history stack is memory-only | ✅ probe (`undo disabled: true`) |

---

## 2. What's wrong today

### 2.1 Old design system that must go

Every token, class and component below is from the pre-Matchbook theme and has no place in the redesign.

**Legacy CSS classes**
- `glass-nav` on both headers — `match/[id]/page.tsx:97`, `match/guest/page.tsx:106`.
- `glass-input` on Fullscreen/Undo/Back — `match/[id]/page.tsx:67,140,153`, `match/guest/page.tsx:135,144`.
- `glass-card border-glass-border` on all three dialogs — `MatchCompleteDialog.tsx:46`, `RotateDeviceDialog.tsx:27`, `GuestMatchComplete.tsx:50`.
- `btn-teal-gradient` (which, per `globals.css:1167`, is *actually red* — "Legacy btn-teal-gradient for compatibility - now red") on every primary button: `match/[id]/page.tsx:162`, `match/guest/page.tsx:153`, `FullscreenControls.tsx:59`, `MatchCompleteDialog.tsx:103`, `RotateDeviceDialog.tsx:54`, `GuestMatchComplete.tsx:149`.
- `status-live` badge with `livePulse` keyframes — `match/[id]/page.tsx:112`, `match/guest/page.tsx:118`. Matchbook already has `.mb-live-dot` with `mb-pulse`.
- `score-text` text-shadow — `TeamScorePanel.tsx:109`.
- `bg-background` / `bg-muted/30` / `text-muted-foreground` throughout the not-found state — `match/[id]/page.tsx:53,59,60,63`.

**Legacy shape language.** Matchbook is 3–4px radii, hairline rules, heavy 4px top borders. Today this screen is all pills and 24px radii:
- `rounded-3xl` icon tile — `match/[id]/page.tsx:59`
- `rounded-xl` on every button and dialog surface — `:67,104,140,153,162`, `MatchCompleteDialog.tsx:58,74,97,103`, `RotateDeviceDialog.tsx:41,54`
- `rounded-full` steppers and pills — `TeamScorePanel.tsx:67,81,133,150`, `FullscreenControls.tsx:40,50,59,71`
- `backdrop-blur-sm` / `backdrop-blur-md` — `TeamScorePanel.tsx:67,81`, `UndoToast.tsx:53`

**Off-palette colours.** Matchbook's palette is paper / navy / coral / teal / gold / plum / green / red. These are not in it:
- `text-emerald-400` for the winner — `MatchCompleteDialog.tsx:88`, `GuestMatchComplete.tsx:111`. On cream paper this is a genuine contrast failure (see `desk-complete-dialog.png` — the winner's name is the least legible text in the dialog).
- `bg-emerald-500/10 border-emerald-500/20` — `GuestMatchComplete.tsx:108`
- `bg-amber-500/30 border-amber-400/30` Leading pill — `TeamScorePanel.tsx:81`
- `from-amber-400 to-amber-600` trophy tile — `GuestMatchComplete.tsx:56`
- `bg-amber-500/10 text-amber-600 border-amber-500/20` Guest chip — `match/guest/page.tsx:122`
- `text-emerald-500` — `ui/match-score.tsx:41`
- Hardcoded team fallbacks `#3b82f6` / `#f97316` — `useMatchPage.ts:475-476`, `match/guest/page.tsx:50-51`, `MatchCompleteDialog` callers, `GuestMatchComplete.tsx:45-46`, `constants/guestTeams.ts`.

**The full-bleed team gradients are the central problem.**
```
TeamScorePanel.tsx:48-50
  style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}bb)` }}
TeamScorePanel.tsx:58-60
  <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
  <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
  <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-white/10 to-transparent" />
```
Two arbitrary user-picked saturated colours, blurred radial glows and a diagonal white wash — this is the exact opposite of a printed almanac. It is also functionally bad: text colour is hardcoded `text-white/90` (`:91`) and `text-white/50` (`:138`) regardless of what colour the user picked, so a team with a pale yellow crest gets white-on-yellow captions. Visible in `desk-match-long-bignum.png`: "Tap to score" on gold is nearly invisible.

**Wrong icon libraries.** Heroicons everywhere here (`match/[id]/page.tsx:7-14`), lucide-react in `UndoToast.tsx:5`, a bespoke `CrownIcon` from `@/lib/icons` in `TeamScorePanel.tsx:7`. Matchbook uses one sprite via `MbIcon` (`/assets/matchbook/icons/sprite.svg`).

**Wrong typography.** Team names and scores use the body font (`Outfit`) at `font-semibold` / `font-black` (`TeamScorePanel.tsx:91,109`). Matchbook display type is Oswald via `.matchbook-display` (uppercase, condensed, letterspaced). The scores are also not tabular — `tracking-tighter` with proportional digits means the numeral jumps horizontally as it changes from `18` to `19`.

**Dead code.**
- `fullscreen-mode` class is applied at `match/[id]/page.tsx:89` and `match/guest/page.tsx:98` but **is defined nowhere in the codebase**. Grep returns only those two usages.
- `.hide-landscape`, `.hide-landscape-divider`, `.show-landscape`, `.landscape-row` exist in `globals.css:371-387` under `@media (max-height: 500px)` and are used by **no component** — they were clearly written for this screen and never wired up. That is why landscape is broken (§2.2).
- `src/components/ui/match-score.tsx` (`MatchScoreDisplay`) is imported by nothing.
- `useMatchPage` returns `competition` and `role` (`:486,501`); the page destructures neither.

### 2.2 Mobile ergonomics failures

Measured on a real 390×844 context (see probe output).

1. **Every header control is below the minimum touch target.** Measured: Back `36×32`, Fullscreen `38×32`, Undo `38×32`, End Match `36×32`. WCAG 2.5.5 / platform guidance is 44×44. All four are in the top strip, which is also the least reachable part of a phone held one-handed.
2. **The most destructive action is an unlabelled red circle.** `<span className="hidden sm:inline">` (`match/[id]/page.tsx:165`) strips the "End Game" text below `sm`, leaving a 36px red disc with a check glyph, sitting 8px from an equally unlabelled grey disc (Undo) — see `mob-match-series.png`. Confirming a match result and undoing a point are adjacent, same-size, text-free targets. This is the single worst ergonomic defect on the screen.
3. **Portrait mobile wastes the middle of the screen and puts controls in the dead zone.** Each panel is `387px` tall and vertically centred, so the `+`/`−` steppers land at ~y=341 and ~y=732 — the second one is fine, the first is mid-screen. The score itself occupies the thumb-reachable arc.
4. **Landscape (non-fullscreen) is broken.** In `landscape-match-series.png` (844×390) the "Leading" pill overlaps the team name "Surge", and both teams' `+`/`−` steppers are clipped by the bottom edge. Root cause: `min-h-screen` (`:88`) is `100vh`, the header consumes 67px, and the panel's `p-6` + centred stack overflow with no scroll and no landscape-specific rules — despite `globals.css` already containing unused rules for exactly this case.
5. **`min-h-screen` / `100vh` is wrong for a PWA scoring screen.** On iOS Safari the dynamic URL bar makes `100vh` taller than the visible viewport; anything anchored to the bottom (`FullscreenControls.tsx:40` `fixed bottom-4`) can sit under browser chrome. Needs `100dvh` and `env(safe-area-inset-bottom)`.
6. **Long team names break the layout.** `TeamScorePanel.tsx:90-98` has no `truncate`, no `max-w`, no `text-center` on the `<h2>`. A 50-character name wraps to two ragged-left lines and pushes the numeral off-centre (`mob-match-long-bignum.png`).
7. **`userScalable: false` / `maximumScale: 1`** in `src/app/layout.tsx` blocks pinch-zoom app-wide, so a user cannot zoom in to disambiguate the unlabelled icon buttons. (Global fix, but it bites hardest here.)
8. **Two components fight for the same fixed position.** `FullscreenControls.tsx:40` and `UndoToast.tsx:49` are both `fixed bottom-4 left-1/2 -translate-x-1/2 z-50`. `GlobalUndoToast` wraps the whole app (`Providers.tsx`), so an undo entry pushed on the competition-detail rotation views will render directly on top of the fullscreen control rail.

### 2.3 Inconsistencies with the already-redesigned pages

Compared against `src/app/quick-match/page.tsx`, `src/app/competitions/page.tsx`, `src/app/summaries/page.tsx`, `src/app/tools/page.tsx`:

- **No masthead.** Every redesigned page opens with `<header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">` carrying a `matchbook-display text-4xl/5xl` title with a coral second word, an issue-number box, and a date line. The console has a centred cluster of pills instead.
- **No `matchbook-surface`.** No paper texture, no navy ink default. The screen is `bg-background` + two gradients.
- **No crests.** Every other Matchbook screen identifies teams with `Crest` / `TeamMark` from `components/matchbook/Panel.tsx` and `crestForTeam()`. The console shows only a name (and, in the dialogs, a coloured rounded square).
- **No `Panel`.** The dialogs are `glass-card`, not the heavy-top-border `mb-panel`.
- **Hand-off breaks visually.** `/quick-match` "Start Scoring" (`quick-match/page.tsx:339-347`, a `mb-btn mb-btn-coral`) launches straight into a screen that shares zero visual vocabulary with the one you just left. Same for `/competitions/[id]` → `/match/[id]`.
- **Chips.** Redesigned pages use `mb-kicker` and inline `STATUS_STYLES` dots (`competitions/page.tsx:19-23`); the console uses shadcn `<Badge variant="secondary"|"outline">`.
- **Buttons.** Redesigned pages use `mb-btn mb-btn-coral|navy|outline|outline-navy`; the console uses `<Button>` from `components/ui/button`.

### 2.4 Correctness and logic defects found while auditing

These are not styling issues, but the redesign touches all of them and must not carry them forward.

1. **"Match not found" is the loading state.** `match/[id]/page.tsx:51` returns the error branch whenever `!match`, and `AppContext` hydrates from localStorage inside an effect — so the first paint of *every* successful load is the error screen. Confirmed by probe: first text snapshot is the error, second is the match.
2. **A completed match renders as live.** Opening `/match/<completed id>` shows the LIVE chip, "Tap to score", and both steppers. Taps are swallowed by the `match.status === "completed"` guards (`useMatchPage.ts:126,148,169`) with zero feedback. Probe: DOM text identical before and after a tap.
3. **"Game 0".** `useMatchPage.ts:111-113` — when `isSeries && status === "completed"`, `gameNumber` is `gamesPlayed`, which is `0` for a match whose series counters were never written. Rendered verbatim as `Game 0` (`desk-match-completed.png`).
4. **Guest undo desyncs from the score.** `useGuestQuickMatch.ts:56-62` computes the new history entry from the closure values `match.homeScore` / `match.awayScore` while `setMatch` correctly uses the updater form. Under batched taps the history fills with duplicates. Probe: 5 rapid taps → score `5`, then 6 undos → score stuck at `1`, never returns to `0`.
5. **Undo is dead after a reload.** History lives only in component state (`useMatchPage.ts:36`), so reloading a 18-15 match leaves Undo permanently disabled until the next point. Probe-confirmed.
6. **A deleted team turns a live match into "Match not found".** `match/[id]/page.tsx:51` fails on `!homeTeam || !awayTeam` and reuses the same copy. Probe-confirmed.
7. **Tie is a silent dead end.** `useMatchPage.ts:457-459` and `useGuestQuickMatch.ts:104` `return` without any message, so the disabled End button has no explanation. This also ignores `CompetitionConfig.allowTies` (`src/types/competition-config.ts:25`) — a competition explicitly configured to allow ties still cannot record one here.
8. **Fullscreen failures are swallowed.** `useFullscreen.ts:65-67, 83-85` `console.log` and continue. On iOS Safari (no Fullscreen API on iPhone) the button appears to do nothing.
9. **`console.log` noise ships.** `useFullscreen.ts:28, 31, 35, 44, 47`.
10. **Duplicated orientation logic.** `match/guest/page.tsx:53-86` is a verbatim copy of `useMatchPage.ts:39-71`.
11. **`handleCompleteMatch` is 278 lines** (`useMatchPage.ts:175-453`) handling five formats, bracket advancement, shared-mode merges, and competition completion. It is the riskiest code in the group and the redesign must not touch its internals.
12. **No `aria-live` on the score, no `<h1>`, no `<main>`.** Probe: `{h1: 0, main: 0, live: 0}`. Score changes are announced to nobody; the document title stays "Tournament Tracker - Manage Your Competitions".
13. **The score element renders twice mid-transition.** `AnimatePresence mode="popLayout"` keyed on `score` (`TeamScorePanel.tsx:102-104`) keeps the outgoing numeral in the DOM. Probe captured `Team A | 1 | 0 | Tap to score` — two scores visible to assistive tech simultaneously.
14. **Guest page hardcodes `canEdit={true}`** in three places (`match/guest/page.tsx:165,186,201`) rather than reading a mode, so the component has two different contracts.

---

## 3. Target design — "The Scorer's Card"

The console becomes a printed scorer's card: cream stock, a heavy navy rule down the middle, two ink columns of numerals, an editorial strip across the top, and a coral action rail at the bottom.

**Non-negotiable principle:** this screen does not get the standard Matchbook page shell. No `MatchbookSidebar`, no `MatchbookMobileBar`, no 12-column panel grid. It is a **focus console** — full bleed, chrome-minimal, one job. Everything else on this list is in service of that.

**Team colour policy.** User-chosen team colours stay, but they stop being surfaces. A team's colour appears only as (a) a 6px bar at the top of its column and (b) a 3px underline beneath its name. Everything else is navy ink on paper. This is what makes the screen Matchbook rather than "the same gradients with a different font", and it removes the white-on-yellow contrast failure for free. Team identity is carried primarily by the **crest** (`crestForTeam()` from `components/matchbook/types.ts`), consistent with every other redesigned screen.

**At-a-distance legibility** is preserved by inverting the leading side, not by colour: the leading column gets a navy fill with paper-coloured numerals. From three metres you read "the dark one is winning" instantly.

### 3.1 Desktop (≥1024px), `/match/[id]`, live

```
┌──────────────────────────────────────────────────────────────────────────┐
│ NAVY STRIP  h=56                                                          │
│ ‹ BACK │ ● LIVE │ SPRING LEAGUE 2026 · MATCH 12    │  ⛶ COURT VIEW  ⤺ UNDO│
│         │        │ BEST OF 3 · GAME 2 · [1]–[0]     │                     │
└──────────────────────────────────────────────────────────────────────────┘
┌───────────────────────────────┬┬─────────────────────────────────────────┐
│ ███ team colour bar 6px       ││ ███                                     │
│                               ││                                         │
│         [crest 88px]          ││        [crest 88px]                     │
│           SURGE               ││          RIPTIDE                        │
│         ───────── colour 3px  ││        ─────────                        │
│                               ││                                         │
│            18                 ││            15                           │
│      (Oswald, tabular,        ││                                         │
│       clamp 9rem–16rem)       ││                                         │
│                               ││                                         │
│      ◤ LEADING                ││                                         │
│                               ││                                         │
│    ┌────┐         ┌────┐      ││   ┌────┐         ┌────┐                 │
│    │ −  │ TAP +1  │ +  │      ││   │ −  │ TAP +1  │ +  │                 │
│    └────┘         └────┘      ││   └────┘         └────┘                 │
└───────────────────────────────┴┴─────────────────────────────────────────┘
   leading column = navy fill,      trailing column = paper fill,
   paper numerals                   navy numerals
                    ↑ 2px navy centre rule, full height
┌──────────────────────────────────────────────────────────────────────────┐
│ ACTION RAIL h=64  │ Scores save as you tap  │  [⤺ UNDO] [✓ END GAME]     │
└──────────────────────────────────────────────────────────────────────────┘
```

Specifics:
- Root: `matchbook-surface` + `h-[100dvh] flex flex-col overflow-hidden`.
- **Masthead** — navy strip, reusing the `Panel tone="navy"` header treatment (`Panel.tsx:31-34`): `bg-mb-navy px-4 py-2.5 text-mb-paper-bright`. Three zones: back (left), fixture identity (centre, `matchbook-display`), utilities (right). Series tally rendered as two `mb-score-box` elements in gold on navy, not as body text. `mb-live-dot` replaces the pulsing `status-live` badge.
- **Column grid** — `grid grid-cols-[1fr_2px_1fr]`, the middle cell a solid `var(--mb-navy)` rule (replaces `match/[id]/page.tsx:204-205`).
- **Numerals** — `.matchbook-display`, `font-variant-numeric: tabular-nums`, `font-size: clamp(6rem, 18vw, 16rem)`, `line-height: 0.82`, `letter-spacing: -0.01em`. Tabular + a fixed `min-w-[2ch]` box means the digit never shifts. No `text-shadow`, no `tracking-tighter`.
- **Leading marker** — a coral right-triangle notch flush to the column's inner edge plus a `mb-kicker`-styled `LEADING` label placed *in flow* under the score, never absolutely positioned over the name (this is the landscape collision fix).
- **Steppers** — 56×56 square (4px radius) `mb-btn-outline-navy` on the paper column, inverted on the navy column. Between them, `TAP ANYWHERE +1` as an `mb-kicker`.
- **Primary action lives in the bottom rail**, not the header. Rail is `border-t-[1.5px] border-mb-navy bg-mb-paper-bright`, left side a hint line, right side `mb-btn-outline-navy` Undo + `mb-btn-coral` End Game.

### 3.2 Mobile (<768px) portrait

```
┌────────────────────────────┐
│ NAVY  ‹  ● LIVE   ⛶        │  h=48, single line
│      BEST OF 3 · GAME 2    │  h=22, secondary line, navy 80%
│         SURGE 1–0 RIPTIDE  │
├────────────────────────────┤
│ ███                        │
│  [crest 56] SURGE          │  ← identity row, horizontal, left-aligned
│                            │
│            18              │  ← clamp(5rem, 26vw, 8rem)
│                            │
│  ◤ LEADING          [ − ]  │  ← −1 pinned bottom-right of its own column,
├════════════════════════════┤     thumb-reachable, 56×56
│ ███                        │
│  [crest 56] RIPTIDE        │
│            15              │
│                     [ − ]  │
├────────────────────────────┤
│  [ ⤺ UNDO ]  [ ✓ END GAME ]│  sticky rail, 56px tall + safe-area inset
└────────────────────────────┘
```

- Each column is `flex-1` inside a `h-[100dvh]` flex column, so the two halves plus the rail exactly fill the visible viewport. No page scroll, ever.
- The whole column remains the `+1` target (keep `role="button"` + Enter/Space).
- The `+` icon button is **removed on mobile** — the column *is* the plus. Only `−` survives, pinned bottom-inner-corner of its column at 56×56 with a 12px inset.
- **The header loses all destructive controls.** Only Back and Court View remain, each grown to 44×44. Undo and End Game live in the sticky rail with full text labels. This fixes the "two unlabelled circles" defect directly.
- Team name: `matchbook-display truncate` with `title={name}` and `max-w-[70%]`; the crest carries identity when the name truncates.
- Series info collapses to a single secondary line under the masthead; it never competes with the score.

### 3.3 Court View (replaces "fullscreen")

Rename in UI copy: **Court View**. Trigger stays the same (landscape-only, wake lock, auto-exit on rotate).

- Ground flips to **navy** (`--mb-navy`) with paper numerals — a scoreboard, and easier on the eyes in a dark gym.
- Layout: `grid-cols-[1fr_2px_1fr]` always (never stacks).
- Numerals `clamp(8rem, 30vh, 22rem)` — **vh-based, so 3-digit scores can't overflow** (today's fixed `20rem` will).
- Crest 40px + name in `mb-kicker` above each numeral; series tally as gold `mb-score-box` pair centred on the rule.
- Chrome auto-hides after 4s of no interaction; a tap anywhere on the top or bottom 15% reveals a hairline rail with Undo / End / Exit. Score taps still work while chrome is hidden.
- Implement as `data-view="court"` on the root with real CSS, and **delete** the phantom `fullscreen-mode` class and the orphaned `.hide-landscape` / `.show-landscape` / `.landscape-row` block in `globals.css:371-387`.
- If `requestFullscreen` rejects (iOS Safari), fall back to an in-page court view — same visual, no browser fullscreen — and surface a one-line note rather than silently doing nothing.

### 3.4 Mobile landscape, not in Court View

Currently broken. Target: at `(orientation: landscape) and (max-height: 520px)` the console automatically adopts the Court View *layout* (side-by-side, vh-scaled numerals, chrome collapsed to a 40px strip) without requesting browser fullscreen. Steppers move inline beside the numeral so nothing is clipped.

### 3.5 State-specific screens

**Loading (new).** A paper skeleton: navy masthead strip with a shimmering kicker, two columns each with a grey crest silhouette, a ruled name placeholder and a `▓▓` numeral block. No spinner. Must render whenever `state` has not hydrated — gate on an explicit `isHydrated` flag from `AppContext`, not on `!match`.

**Final / completed.**
- Masthead: navy strip, `LIVE` dot replaced by a green `FINAL` stamp (`--mb-green`), and the completion date.
- Columns: no steppers, no "TAP +1", winner's column gets the navy inversion plus a coral `WINNER` rule under the crest; loser's column stays paper at 70% ink.
- Rail: `Back to <Competition>` (`mb-btn-outline-navy`) + `View Summary` (`mb-btn-coral`).
- Fix `Game 0` — for a completed series game show `GAME {seriesGame ?? gamesPlayed || 1}`, and if series counters are absent, omit the chip entirely rather than printing zero.

**View-only (shared session, viewer).**
- Masthead gains a `WATCHING` kicker chip in gold and the session code.
- Columns: no steppers, caption reads `LIVE SCORE · READ ONLY`.
- Rail replaced by a hairline status strip: `● Synced 2s ago` / `⚠ Reconnecting…` / `⚠ Offline — showing last known score`. This is a new capability; today there is no sync feedback at all.

**Tie.** End Game stays disabled but gains an inline explanation in the rail: `Scores are level — a winner is required.` If `competition.config.allowTies` is true, the button enables and the confirm dialog offers `Record a Draw`.

**Errors.** Three distinct panels, each an `mb-panel` centred on `matchbook-surface`, each with a greyed brand crest watermark:
- *Match not found* — "No match exists at this address." → Back to Overview.
- *Teams unavailable* — "This match references a team that has been deleted." → Back to Competition. (Currently misreported as "not found".)
- *Sync failed* — "Couldn't reach the live session." → Retry / Continue offline.

**Guest.** Identical console, plus a gold `GUEST` chip in the masthead and a persistent hairline footnote above the rail: `Guest match — nothing is saved.` The result modal becomes an `mb-panel`-styled dialog: navy header bar `MATCH COMPLETE`, both crests with tabular scores, a coral `WINNER` rule, the four unlock items as a 2×2 `mb-table`-style list with sprite icons (`teams`, `compete`, `history`, `chart`), then `mb-btn-coral` Play Again and `mb-btn-outline-navy` Sign In.

### 3.6 Dialogs

All three become `MbDialog` (§5): `mb-panel` body (4px navy top border, 4px radius, paper-bright fill), navy header bar with a sprite icon and `matchbook-display` title, hairline-ruled sections, `mb-btn` footer. Specifically:
- **MatchCompleteDialog** — replace the colour swatches with `Crest` + colour bar; scores as large tabular Oswald; winner line in `--mb-navy` on a `--mb-green` hairline-ruled band (kills the `emerald-400` contrast failure); footer `Continue Playing` (`mb-btn-outline-navy`) + `Confirm Result` (`mb-btn-coral`).
- **RotateDeviceDialog** — drop the infinite rotation. Static line-art phone diagram in navy with a single coral arc, plus copy. Announce with `role="alertdialog"`.
- **GuestMatchComplete** — as §3.5.

---

## 4. Interaction & motion

Matchbook is print. Motion should read as *paper and stamps*, not as *glass and springs*. Default to short, linear-ish, small-displacement transitions.

**Must animate**
| Event | Treatment |
|---|---|
| Console entrance | Masthead strip wipes down `y:-8→0`, 180ms `ease-out`; columns fade `opacity 0→1` 160ms, staggered 40ms. No scale, no spring. |
| Score increment | The numeral does **not** slide or spring. It cross-fades in place over 90ms while the column edge flashes a 2px coral inner rule for 220ms. Rationale: the number's *position* must be rock-stable for a scorer glancing at it; today's `y:30 → 0` spring (`TeamScorePanel.tsx:105-108`) makes the digit visibly jump on every point. |
| Score decrement | Same cross-fade, edge flash uses `--mb-ink-muted` instead of coral. |
| Column press | `filter: brightness(0.97)` for 90ms + a 1px inward border pull. No `scale` (scaling a full-bleed column at 60fps on a mid-range Android is the frame-drop risk). |
| Lead change | The two columns swap fill via a 220ms `background-color` transition; the coral notch slides across the centre rule 180ms `ease-in-out`. This is the one place a positional move is worth it — it's the semantic event of the game. |
| Button press | 90ms `filter: brightness(1.08)`, matching `.mb-btn` (`globals.css:147`). |
| Rail / dialog entry | Rail slides `y:12→0` 160ms. Dialogs fade + `y:8→0` 160ms. |
| Court View enter/exit | 240ms cross-fade of the ground colour; chrome fades out over 200ms after the 4s idle timer. |
| Live sync tick (shared) | `mb-live-dot`'s existing 1.4s `mb-pulse`. Nothing else. |

**Must NOT animate**
- The numeral's position, size, or weight. Ever.
- The team name, crest, or colour bar.
- Anything on a `prefers-reduced-motion: reduce` device — the existing global block (`globals.css:1240`) must cover the new classes; the lead-change swap becomes an instant colour change.
- The rotate-device illustration (today: `repeat: Infinity`, `RotateDeviceDialog.tsx:38-46`) — an infinitely looping element on a modal is a vestibular hazard and pins a compositor layer.
- Route transitions into/out of the console. The scorer tapped a button; the score must be on screen immediately. No page-level slide.
- Anything while a score tap is in flight — no optimistic shimmer, no pending spinner. The write is local-first.

**Feedback that must be added**
- `aria-live="polite"` region announcing `"Surge 19, Riptide 15"` on change, debounced 400ms; the visual numeral itself gets `aria-hidden`. Replaces today's silent, double-rendered score.
- Haptic `navigator.vibrate(10)` on a scoring tap where supported (behind a preference).
- The undo affordance must reflect reality: if history is unavailable (post-reload), the button should be labelled and disabled with a tooltip, not just greyed.

---

## 5. New primitives required

None of these exist in `src/components/matchbook/` today. Ordered by breadth of reuse.

| Primitive | Proposed API | Shared with |
|---|---|---|
| **`MbButton`** | `({ variant: "coral"\|"navy"\|"outline"\|"outline-navy"\|"ghost", size: "sm"\|"md"\|"lg"\|"touch", icon?: string, iconRight?: string, disabled, loading, fullWidth, children, ...button })` — wraps the existing `.mb-btn*` classes, enforces `min-height:44px` at `size="touch"`. | **Every** unconverted screen. Highest-value primitive in the whole redesign. |
| **`MbDialog`** | `({ open, onOpenChange, title, icon?, description?, tone?: "paper"\|"navy", size?: "sm"\|"md"\|"lg", footer, children })` — `mb-panel` surface over `ui/dialog.tsx`, navy header bar, `mb-btn` footer, focus trap preserved. | All of global item 8: `dialogs/*`, `CreateSessionDialog`, `ShareSession`, `QuickAddTeams`, `DeleteConfirmDialog`. |
| **`MbChip`** | `({ tone: "live"\|"final"\|"draft"\|"guest"\|"warn"\|"neutral", icon?, children })` — replaces every `<Badge>` + `status-live`. `tone="live"` renders `mb-live-dot`. | Compete console, history, session viewer, summary. |
| **`MbScoreNumeral`** | `({ value, size: "console"\|"court"\|"compact", tone: "ink"\|"paper", flash?: "up"\|"down"\|null, ariaLabel? })` — Oswald, tabular, `clamp()`-sized, fixed `min-w`, cross-fade + edge-flash only. | `/session/[shareCode]`, `/summary/[shareCode]`, `/competitions/[id]` live cards. |
| **`MbConsoleShell`** | `({ masthead, rail, children, view: "console"\|"court", surface: "paper"\|"navy" })` — full-bleed `100dvh` shell with safe-area insets, no sidebar/mobile bar, orientation data-attrs, overflow lock. | `/match/guest`, `/session/[shareCode]` (public viewer is the same console minus controls). |
| **`MbMasthead`** (console variant) | `({ back?: {href\|onClick,label}, kicker?, title, subtitle?, chips?: ReactNode, actions?: ReactNode, tone?: "navy"\|"paper", compact?: boolean })` — the navy strip. Distinct from the editorial page masthead on `/quick-match` etc.; both should end up sharing type tokens. | `/competitions/[id]`, `/session/[shareCode]`, `/summary/[shareCode]`. |
| **`MbActionRail`** | `({ hint?: ReactNode, children, sticky?: boolean })` — bottom rail, `border-t-[1.5px] border-mb-navy`, `padding-bottom: env(safe-area-inset-bottom)`. | Competition detail, new-competition wizard, volleyball tools. |
| **`MbTeamIdentity`** | `({ team: MbTeam, color?: string, size: "sm"\|"md"\|"lg", orientation: "vertical"\|"horizontal", truncate?: boolean })` — crest + colour bar + `matchbook-display` name. Extends the existing `TeamMark` (`Panel.tsx:65`) with the colour bar and size scale. | Teams, compete, session, summary. |
| **`MbToast`** | `({ tone, icon, message, action?: {label,onClick,loading}, onDismiss })` — matchbook skin for `UndoToast`, plus a `slot: "rail"\|"float"` so it can dock above `MbActionRail` instead of colliding with it. | `GlobalUndoToast` (app-wide). |
| **`MbStatePanel`** | `({ variant: "loading"\|"empty"\|"error", title, message, icon?, actions? })` — centred `mb-panel` with crest watermark; `variant="loading"` renders the skeleton. | Every screen's loading/empty/error state. |
| **`MbSkeleton`** | `({ w, h, tone })` — ruled paper placeholder block. | Everywhere. |
| **`useCourtView`** hook | `({ isCourtView, canEnter, enter, exit, toggle, blockedReason: "portrait"\|"unsupported"\|null })` — folds `useFullscreen` + the orientation logic currently duplicated in `useMatchPage.ts:39-71` and `match/guest/page.tsx:53-86`, adds the in-page fallback and surfaces failures instead of `console.log`. | `/session/[shareCode]`. |
| **`useScoreHistory`** hook | `({ history, push, undo, canUndo, reset })` — one correct implementation (updater-form only, no stale closures), optionally persisted to `sessionStorage` keyed by match id so undo survives a reload. | Guest + authed console; fixes defects §2.4.4 and §2.4.5. |

CSS tokens/classes to add to the Matchbook block in `globals.css`:
`.mb-console`, `.mb-console-column`, `.mb-console-column[data-leading="true"]`, `.mb-numeral` (+ `--court` modifier), `.mb-rule-vertical`, `.mb-rail`, `.mb-stamp-final`, `.mb-notch-coral`, and `--mb-safe-bottom: env(safe-area-inset-bottom, 0px)`.

Sprite icons needed that already exist: `live`, `check`, `chevron-right`, `swap`, `court`, `compete`, `history`, `chart`, `teams`, `warning`, `clock`. **Missing from the sprite** (`manifest.json` iconIds) and required: **`undo`**, **`minus`**, **`expand`/`collapse`**, **`back`/`chevron-left`**. These must be added to `public/assets/matchbook/icons/sprite.svg` and the manifest — flag to whoever owns the asset pack, since `undo` and `chevron-left` are needed by several other screens too.

---

## 6. Risks

**High**
1. **`handleCompleteMatch` (`useMatchPage.ts:175-453`).** 278 lines, five format branches, bracket advancement, shared-mode merge, cascade to `completeCompetition`. The redesign must treat this as a black box: change *what calls it* and *what the dialog looks like*, never its internals. Any refactor here needs `npx vitest run` green on the `singleElimination` / `roundRobin` / `win2out` / `twoMatchRotation` suites first.
2. **Series continuation is an in-place state change, not a navigation.** At `:206-218` the match resets to 0-0 and stays put. If the redesign animates route transitions or remounts on `match` identity change, the scorer will see a jarring full-screen reset mid-series. The "next game" transition needs an explicit, deliberate treatment (a brief `GAME 3` stamp over the columns) — it must not fall out of generic entrance animation.
3. **Fullscreen + wake lock + orientation.** Three browser APIs with wildly different support. iOS Safari on iPhone has no element fullscreen at all; `wakeLock` is Chromium-mostly. Court View must degrade to an in-page mode. Cannot be verified headlessly — needs manual device testing on at least one iPhone and one Android before sign-off.
4. **Firestore / shared mode is unverifiable locally.** `canEdit`, `isSharedMode`, `updateMatches`, and the whole viewer treatment depend on `SessionContext` + a live session. The view-only and offline states in this brief are code-derived, not screenshot-derived. Build them behind a forced prop so they can be storybooked/QA'd without a session.

**Medium**

5. **Score-write frequency.** Every tap calls `updateMatchScore`, which in shared mode fires `syncAllData` to Firestore. A fast rally is several writes per second. The redesign should not add per-tap animation work on top of that; and this is a good moment to flag (not necessarily fix) that these writes are unbatched and unthrottled.
6. **`100dvh` support.** Required for the layout to be correct on iOS, but needs a `100vh` fallback via `@supports`.
7. **The undo-toast / rail collision (§2.2.8).** Fixing it means touching `GlobalUndoToast`, which is app-wide. Coordinate with whoever owns global item 8 so the `MbToast` API is agreed once.
8. **`prefers-reduced-motion`.** The existing global block (`globals.css:1240-1273`) targets specific legacy classes. New `.mb-console-*` animations must be explicitly covered or they'll bypass it.

**Low**

9. **Long team names + 3-digit scores** are handled by `clamp()` + `truncate`, but need a visual check at 4 digits (theoretically reachable — nothing caps the score).
10. **Deleting `ui/match-score.tsx`** is safe (zero importers) but confirm with a repo-wide grep at implementation time in case a sibling agent adds one.
11. **`viewport.userScalable: false`** in `layout.tsx` — worth removing, but it's a global change that affects every screen; raise it, don't unilaterally flip it in this workstream.

---

## 7. Definition of done

**Visual**
- [ ] Both routes render on `matchbook-surface` with paper grain; zero `glass-*`, `btn-teal-gradient`, `status-live`, `soft-card`, `playful-card`, `rounded-xl/2xl/3xl`, or `backdrop-blur` remaining in the scope files.
- [ ] Zero `emerald-*` / `amber-*` / raw hex colours outside of user-supplied team colours; team colour appears only as the top bar and name underline.
- [ ] All display type is `.matchbook-display`; all numerals are tabular and do not shift position when the value changes.
- [ ] Both teams are identified by a crest from `crestForTeam()` on the console and in every dialog.
- [ ] A user landing from `/quick-match` or `/competitions/[id]` sees continuous visual language — same navy, same coral, same rules, same buttons.

**States** — each of these renders correctly and is screenshotted at 1440×900 and 390×844:
- [ ] loading skeleton (and **never** the "Match not found" flash — verified by capturing the first paint)
- [ ] live no-series / live in-series / tied / leading
- [ ] completed match (FINAL treatment, no scoring affordances, no "Game 0")
- [ ] view-only shared session
- [ ] match-not-found vs teams-unavailable vs sync-failed (three distinct panels)
- [ ] offline / reconnecting indicator in shared mode
- [ ] guest live + guest result modal
- [ ] long team name (50 chars) + 3-digit score, at every breakpoint and in Court View
- [ ] Court View, and mobile landscape without Court View (nothing clipped, nothing overlapping)

**Ergonomics**
- [ ] Every interactive control measures ≥44×44 CSS px at 390×844 — verified by a scripted `getBoundingClientRect` sweep, not by eye.
- [ ] No unlabelled icon-only control anywhere on mobile; End Match and Undo carry visible text.
- [ ] The primary action is in a bottom sticky rail with `env(safe-area-inset-bottom)`; the header carries no destructive action.
- [ ] Layout uses `100dvh` (with a `100vh` fallback); the page never scrolls in either orientation.
- [ ] Tapping the column still scores; `−` still works and still floors at 0; `+`/`−` do not double-fire.

**Behaviour preserved** (regression-tested by hand against this brief's §1.2):
- [ ] pending → in_progress auto-start; tie blocking (plus the new `allowTies` path); series continuation resetting to 0-0 in place; all five completion branches reaching the right destination; bracket advancement; competition auto-completion; back-target logic; wake lock acquired in Court View and released on exit; auto-exit on rotate to portrait.

**Correctness fixes shipped with the redesign**
- [ ] Completed matches are not presented as live and taps are not silently swallowed.
- [ ] `Game 0` cannot render.
- [ ] Guest undo returns the score to 0 after N rapid taps (scripted: 5 sync clicks then 5 undos → score 0).
- [ ] Undo either survives a reload or is honestly labelled as unavailable.
- [ ] A deleted team produces the "teams unavailable" panel, not "match not found".
- [ ] `useFullscreen` no longer `console.log`s; failures surface in the UI.
- [ ] Orientation logic exists once (`useCourtView`), not duplicated across two files.

**Motion & a11y**
- [ ] The score numeral never translates or scales on change; the lead-change swap is the only positional motion.
- [ ] Nothing loops infinitely (rotate dialog is static).
- [ ] `prefers-reduced-motion: reduce` disables the lead-change transition and all entrances.
- [ ] A single polite `aria-live` region announces score changes; the visual numeral is `aria-hidden`; only one score value is in the accessibility tree at a time.
- [ ] The console has one `<h1>` (the fixture), a `<main>` landmark, and a document title of the form `Surge 18–15 Riptide · Tournament Tracker`.
- [ ] Full keyboard path: Tab reaches back → court view → both columns → both steppers → undo → end; Enter/Space scores; Escape exits Court View.
- [ ] All navy-on-paper and paper-on-navy text pairs pass WCAG AA at their rendered size.

**Cleanup**
- [ ] `fullscreen-mode` class and the orphaned `.hide-landscape` / `.hide-landscape-divider` / `.show-landscape` / `.landscape-row` block removed from `globals.css`.
- [ ] `src/components/ui/match-score.tsx` deleted (or converted into `MbScoreNumeral`'s compact size and actually used).
- [ ] `useMatchPage` no longer returns unused `role`; `match/guest` no longer hardcodes `canEdit={true}` in three places — it passes an explicit `mode`.
- [ ] Missing sprite icons (`undo`, `minus`, `expand`, `collapse`, `chevron-left`) added to `icons/sprite.svg` + `manifest.json`.

**Gates**
- [ ] `npx tsc --noEmit` clean.
- [ ] `npx eslint src/app/match src/components/match src/hooks/useMatchPage.ts src/hooks/useGuestQuickMatch.ts src/hooks/useFullscreen.ts` clean.
- [ ] `npx vitest run` green.
