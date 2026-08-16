# Matchbook redesign — session handoff / resume state

**Read this file first in any new session.** It is the single entry point. Update it at the end of
every phase.

Branch: `claude/app-redesign-features-a65ea3` · Worktree:
`C:/Dev/Tournament-Tracker/.claude/worktrees/app-redesign-features-cf1ebd`

---

## 1. Rebuild the environment (do this before anything else)

The worktree has no `node_modules` and no `.env.local` of its own — both are recreated, not committed.

```powershell
# 1. node_modules junction to the main checkout (Windows; ~1s, no npm install needed)
New-Item -ItemType Junction -Path "C:\Dev\Tournament-Tracker\.claude\worktrees\app-redesign-features-cf1ebd\node_modules" -Target "C:\Dev\Tournament-Tracker\node_modules"

# 2. env file — copy from main, then append BOTH design-preview flags
Copy-Item "C:\Dev\Tournament-Tracker\.env.local" "C:\Dev\Tournament-Tracker\.claude\worktrees\app-redesign-features-cf1ebd\.env.local"
Add-Content "C:\Dev\Tournament-Tracker\.claude\worktrees\app-redesign-features-cf1ebd\.env.local" "`nNEXT_PUBLIC_DEV_PREVIEW_AUTH=1"
Add-Content "C:\Dev\Tournament-Tracker\.claude\worktrees\app-redesign-features-cf1ebd\.env.local" "NEXT_PUBLIC_DEV_PREVIEW_SESSION=1"
```

```bash
# 3. dev server — run in background, leave it running for the whole session
cd "C:/Dev/Tournament-Tracker/.claude/worktrees/app-redesign-features-cf1ebd" && npx next dev -p 3100
```

```bash
# 4. screenshot harness (only if the scratchpad was wiped — check if pw/shot.mjs exists first)
cd <SCRATCH>/pw && npm init -y && npm i playwright && npx playwright install chromium
```

`<SCRATCH>` = `C:/Users/khiem/AppData/Local/Temp/claude/C--Dev-Tournament-Tracker--claude-worktrees-app-redesign-features-cf1ebd/bbc48bd4-cabe-4606-b848-eecddebf3c28/scratchpad`

**Why the preview-auth flag exists:** every gated route redirects to `/login` without it, so nothing can be
screenshotted. The Firebase auth emulator is not an option — it needs Java, which is not installed on this
machine. The bypass lives in `src/context/AuthContext.tsx` behind
`process.env.NODE_ENV !== "production" && NEXT_PUBLIC_DEV_PREVIEW_AUTH === "1"`, so it compiles out of any
production build. `.env.local` is gitignored and never ships. **Decide before the final merge whether to keep
or strip it.**

**Why the preview-session flag exists (charter Appendix A, D-12):** the three public share routes read
Firestore, and the Firestore emulator needs Java too, so all three rendered their not-found state and W6
could not verify a single pixel of them. `NEXT_PUBLIC_DEV_PREVIEW_SESSION=1` serves them from the harness
fixture instead, declared exactly like the auth flag — `process.env.NODE_ENV !== "production" &&
NEXT_PUBLIC_DEV_PREVIEW_SESSION === "1"`, which Turbopack inlines to a literal `false` in a production build,
so every branch behind it is dead code the minifier deletes.

| Where | What it serves |
| --- | --- |
| `src/lib/sessions.ts` | Sessions and summaries, projected from `localStorage["tournament-tracker-state"]` — the same `pw/fixture.json` `shot.mjs` seeds. An in-memory store, not a lookup table: writes fire the subscribers, so create / edit / end-session all round-trip |
| `src/lib/volleyball/userFormations.ts` | The shared formation (built from the app's own `standard-5-1` template) and the signed-in user's archive, which starts **empty** |

Rules it follows, and the traps behind them:

- **Nothing contacts Firestore while the flag is on.** An unknown share code resolves to null locally, so the
  not-found states are auditable rather than dressed-up network failures. It also removed the background
  NET_FAIL noise from `/summaries` and `/tools/volleyball-rotations/my-formations`.
- **The fixture is snapshotted at module load, never lazily.** `AppContext` truncates
  `localStorage["tournament-tracker-state"]` during hydration — its load effect dispatches `LOAD_STATE` while
  its save effect, committing in the same pass, writes the still-empty initial state back. The share routes'
  first lookup lands inside that window; measured, it read 43 bytes. Seeding lazily produced an empty store
  and "not found" on every code with the full fixture sitting right next to it.
- **No `Date.now()` in seeded data.** Every timestamp comes from the fixture's fixed clock, so durations and
  dates do not drift between screenshot runs.

Roles, so the read-only and permission-denied paths are both reachable: `FRDAY2` and `SPRNG7` are owned by
the preview uid (creator — edit affordances, End Session, Delete); `SUMMER`, `CTYCUP` and `GYMDAY` are owned
by someone else (viewer — read-only). `/session/SUMMER?admin=dev-preview-admin-token` promotes viewer to
admin through the real `applyAdminToken` → `validateAdminToken` path.

Route ids are in `pw/routes.mjs`: `session-live-rr`, `session-live-bracket`, `session-live-admin`,
`session-live-token`, `session-notfound`, `summary-creator`, `summary-viewer`, `summary-notfound`,
`vb-shared-formation`, `vb-shared-notfound`. All ten load with **0 console errors and 0 load failures**. Those W6
baselines (58 / 10 / 9 / 58 / 2 / 85 / 67 / 2 violations at desktop) are **discharged**: re-measured in the
R6-R9 sweep, every `session-*` and `summary-*` route audits **0 violations at both viewports**.

**`NEXT_PUBLIC_FIREBASE_USE_EMULATOR=1` must stay in `.env.local`** — no emulator process is needed and
nothing contacts it, but it is what makes `isFirebaseConfigured()` true without a real project, and
`/session/[shareCode]` renders `SessionNotConfigured` when that is false.

---

## 2. The documents that govern this work

Read in this authority order; higher wins every argument.

| Order | File | Role |
| --- | --- | --- |
| 1 | `docs/design/matchbook-design-language.md` | the shipped system. §11 lists the GAPs being closed |
| 2 | `docs/design/benchmark-rubric.md` | §3 hard fails outrank aesthetics. PASS = all 10 dims ≥8, zero hard fails |
| 3 | `docs/design/IMPLEMENTATION-CHARTER.md` | §2 canonical primitive names/APIs, §4 the 53 invariants, §5 verification protocol, Appendix A settled conflicts, Appendix B retired names |
| 4 | `docs/design/brief-*.md` | six per-area audits (inventory, defects, target design, motion) |

`public/assets/matchbook/tokens.css` is **preview-only and not loaded by the app**. Runtime truth is the
Matchbook block at the top of `src/app/globals.css`.

---

## 3. Phase status

| Phase | Workstream | Status |
| --- | --- | --- |
| Foundation research | — | **DONE** — 7 docs in `docs/design/` |
| P0 tokens + CSS + sprite | W1 | **DONE** — verified zero regression on 6 shipped routes |
| P1 primitive kit | W1 | **DONE** — ~30 components, gallery at `/dev/kit` |
| P1 ranking + tests + audit.mjs | W8 | **DONE** — `audit.mjs` + `routes.mjs` + `shot.mjs` are the measurement harness |
| **Gate 1 (regression + critique)** | — | **RUN — 64/100 FAIL** (one critic). PASS needs all ten rubric dimensions ≥8 and zero §3 hard fails |
| Gate 1 fix round | W1–W8 (7 parallel agents) | **DONE** — 8 disjoint slices, all reported |
| **Gate 1r re-critique** | — | **RUN — 57 / 65 / 66 out of 100. Three critics, three FAILs.** No dimension reached 8 on all three cards. Verdicts below |
| Gate 1r fix round | W1–W8 (parallel agents) | **DONE** |
| P2a shell | W2 | **DONE** — `cf90a61` converted the six shipped pages onto `MatchbookShell`; `ef939d2` landed the shell itself. `AppShell` · `Masthead` · `TopStrip` · `BottomBar` · `AccountChip` · `EventBar` all exist in `src/components/matchbook/`. `data-mb-touch="on"` is **armed** (`src/app/layout.tsx:92`), which closes register item D-5 |
| P2b toast/loading/offline/layout, contexts | W2 + W8 | **DONE** — `Toast.tsx` (`MbToast` + `useToast` + `ToastHost`), `Loading.tsx` (`MbPageLoading`), `Offline.tsx` (`MbOfflineBanner`) |
| P3a create-flows, competition-detail, live-scoring, volleyball | W3 W4 W5 W7 | **DONE** — `5ea8393` redesigned all four screen groups, `c4896bf` applied the critic defect lists. `StandingsTable` · `MatchRow` · `BracketRail` · `CourtCard` · `ScoreSide` (with `MbSetStrip`) · `ScoreboardHero` · `court/` all exist |
| P3b public share | W6 | **DONE** — `356eaa2` shipped `/session/[shareCode]` and `/summary/[shareCode]` (with `layout.tsx`, `opengraph-image.tsx`, `summaryMeta.ts`), all rendering populated behind `NEXT_PUBLIC_DEV_PREVIEW_SESSION=1` (§1) |
| P4 legacy deletion | W2 | **DONE** — `356eaa2` deleted the pre-Matchbook design system. Re-measured for this entry: `oklch(` in `globals.css` **231 → 2**; no `.dark` block; `ThemeToggle.tsx` and `ThemeContext.tsx` gone; **zero** `framer-motion` imports in `src/` (only prose mentions remain); `.scrollbar-thin` gone and both Matchbook consumers with it. Closes D-1, D-2, D-31, D-32 |
| **Gate 2 re-critique** | — | **NOT RUN as a scored gate.** Later rounds landed critic *defect lists* (`c4896bf`, `0eef061`) without a recorded ten-dimension score, so **no card supersedes 57/65/66**. See the verdict history below |
| Naive-walker verdict | — | **RUN — FAIL.** "Would I trust this with my club's tournament? **No.**" Root cause below. Superseded as the standing verdict by the 76/100 full-rubric card below |
| R6–R9 harness + fixture round | W8 | **DONE.** Details in §4 |
| **Full-rubric re-critique (this tree)** | — | **RUN — 76/100 FAIL.** Six dimensions at 8, four at 7, one hard fail. Its convergence analysis blocks each remaining 7 on exactly ONE measured requirement and enumerates the complete path to PASS. Details below |
| Convergence fix round (the F-list) | parallel agents, disjoint slices | **THIS ROUND.** Executes the verdict's enumerated list and nothing else — no new fronts, no refactors beyond the named fix; a regression in any of the six 8s costs more than any polish gains. This slice's items (F6–F9) are recorded below; sibling slices land in parallel, so re-read the tree before treating this table as exhaustive |

### Verdict history

Every verdict this programme has recorded, newest last. A round that produced a
defect list but no scored card is listed as such rather than being written up as
a pass — the scored bar is still 57/65/66 FAIL.

| When | Kind | Result |
| --- | --- | --- |
| Gate 1 | one critic, ten dimensions | **64 / 100 — FAIL** |
| Gate 1r | three critics, ten dimensions | **57 / 65 / 66 — three FAILs.** No dimension ≥8 on all three cards |
| post-1r rounds (`c4896bf`, `0eef061`) | critic defect lists | defects closed; **no scored card**, so the 57/65/66 bar stands |
| R6–R9 round | one naive user, walking the app cold | **"Would I trust this with my club's tournament? No."** |
| latest | one critic, full rubric + convergence analysis | **76 / 100 — FAIL.** Six dimensions at 8, four at 7, one hard fail; each remaining 7 blocked by exactly one measured requirement. The enumerated fix list is being executed by the current round (see "The 76/100 verdict" below) |

### The 76/100 verdict and the remaining path — the current round's contract

The latest full-rubric verdict on this tree scored **76/100: six dimensions at 8,
four at 7, one hard fail**. Its convergence analysis found that each remaining 7
is blocked by exactly **one** measured requirement, and enumerated the complete
path to PASS as a finding list. The current round executes that list and nothing
else — no new fronts, no refactors beyond the named fix, because **a regression
in any of the six 8s costs more than any polish gains**.

The list is split into disjoint slices across parallel agents. This entry
records the slice that owns the two craft dents and the two document rulings
(**F6–F9**); sibling slices own the remainder and land in parallel — re-read
the tree and the sibling reports before treating this section as the whole
round.

| # | Finding | What was done |
| --- | --- | --- |
| F6 | **[D1/D4 dent]** `MbTeamName`'s pinned token hard-cut: in the widest 1440 bracket cell the head ellipsized but the tail clipped mid-word — "WE… WANDERE", the head announcing its elision while the tail lied by omission (`text-overflow` is inert under `overflow: clip`) | `TAIL_CEILING` in `TeamName.tsx` is now `max-w-[calc(100%-4ch)] overflow-hidden text-ellipsis`, so a cut tail marks itself: "WE… WANDER…". Pinned by a new case in `nameFloor.test.tsx`; the outer box keeps `overflow-clip` (the min-content-zero half, guarded by `horizontalGuard.test.ts`). **Re-measured after landing** (`pw/f6-bracket-census.json` vs the `nm-ceil4.json` baseline): mobile floors unchanged — min painted 13 at 320/360/375/390, 8 at 414, zero cases below 8. At 1366/1440 the two tightest `competition-se-live` cells (74–75px) pay the ellipsis glyph one letter: 8 painted name characters became 7 **plus a visible "…"** ("WE… WANDERE" silent cut → "WE… WANDER…" marked). Those 4 (viewport, route, element) rows below 8 are the fix the verdict ordered, not a floor regression — the next census diff should expect exactly them and nothing else |
| F7 | **[D3 kit note]** `MbNotice` warn and danger shared one glyph (`DEFAULT_ICON.warn = DEFAULT_ICON.danger = "warning"`) — register D-21's HF-10 half | `danger` now defaults to `close` (the X — the only mark in the 62-id sprite that reads "this failed" rather than "mind this"); `warn` keeps the exclamation triangle. The other half of D-21 — the warn rail riding `--mb-gold` at 2.15:1 — is NOT closed by this and stays in the register |
| F8 | **[ruling]** Rubric 6.6 ("type escalation 390 vs 1440") contradicted design-language §2.1's twice-argued width-invariant data ramp; the verdict ruled the rubric anchor should yield | `benchmark-rubric.md` D6.6 now carries a **carve-out**: width-invariant data type is conformant WHEN the document names it intentional AND the painted-character floors are measured at every width — both cited to §2.1, which now cross-references the carve-out back. The anchor keeps its teeth for apps without those two conditions. Register D-27 is discharged by this ruling |
| F9 | **[hygiene]** This file did not record the 76/100 verdict or the remaining path | This entry |

**The remaining path, as of this slice's close:** the verdict's enumerated list,
minus F6–F9 above, is with the sibling slices of the current round. This slice's
own verifications were re-run at close against the running tree: `npx tsc
--noEmit` clean, `npx eslint src` 0/0, `npx vitest run` **576/576 across 26
files**; the bracket-route painted census re-run (F6 row above); both notice
tones verified rendered in `/dev/kit` (`warn` → `#warning`, `danger` → `#close`,
distinct — `pw/f67-verify.mjs`). Still owed after the sibling slices land: the
same three commands on the merged tree, the `/summaries` filter-bar CLS
re-measurement (the hard fail — NOT confirmed landed when this round resumed),
the skeleton row reserves, and then a **fresh full-rubric card** — 76 stands as
FAIL until a scored card shows all ten dimensions ≥8 with zero hard fails.

### The naive-walker verdict — one root cause, and it is the fixture

The walker's findings all trace to a single fact: **this app had only ever been
tested against eight team names — Surge, Tide, Storm, Apex, Flare, Peak, Nova,
Riptide — none longer than seven characters and none of them two words.**

Adding one team called **"Westhill Wanderers"**:

| viewport | `documentElement.scrollWidth` | bottom nav |
| --- | --- | --- |
| 390 | 396 vs 390 | labels clipped |
| 375 | 396 vs 375 | 9px of a 56px bar visible |
| 360 | 396 vs 360 | entirely below the fold |
| 320 | 397 vs 320 | 144px below the fold, unreachable |

and `html { overflow-x: hidden }` means `window.scrollTo(scrollWidth, 0)` leaves
`scrollX` at 0, so the navigation **cannot be scrolled to**. The app's primary
navigation became unreachable because somebody typed a two-word team name.

Our own sweep had reported `OFLOW 0` on all thirty routes, because `audit.mjs`
measured `body.scrollWidth` and the fixture contained only short names. **The
harness was measuring a world that does not exist.** Both halves — the fixture
and the checks — were rebuilt this round; see §4.

### Gate 1r verdict — 57 / 65 / 66, three FAILs

Three critics scored the same `/dev/kit` build against `benchmark-rubric.md` in
the same hour. Every card was a FAIL; no dimension scored ≥8 on all three.

| Dim | A | B | C | Spread |
| --- | --- | --- | --- | --- |
| D1 Typographic craft | 6 | 8 | 6 | 2 |
| D2 Spatial rhythm | 5 | 7 | 7 | 2 |
| D3 Colour discipline | 6 | 6 | 6 | 0 |
| D4 Data legibility | 6 | 5 | 7 | 2 |
| D5 Motion | 7 | 7 | 5 | 2 |
| D6 Touch ergonomics | 3 | 4 | 6* | 3 |
| D7 State coverage | 6 | 8 | 8 | 2 |
| D8 Hierarchy | 7 | 8 | 7 | 1 |
| D9 Brand consistency | 6 | 7 | 7 | 1 |
| D10 Perceived performance | 5 | 5 | 7 | 2 |
| **TOTAL** | **57** | **65** | **66** | |

\* C's own evidence column reads "hit-area sweep not re-run independently
(sibling-owned)" — the 6 is an unmeasured score against two measured 3s and 4s.

Hard fails raised, union of the three: HF-1 (content clipped off-viewport at
375/320 with no affordance), HF-2 (targets under 44×44 and pairs under 8px, five
distinct sources), HF-4 (two design systems — the legacy stylesheet, consumed by
two Matchbook components), HF-6 (non-text contrast under 3:1 on enabled fields;
gold rail at 2.15:1), HF-10 (colour-alone: `MbNotice` warn vs danger share a
glyph), HF-13 (16 numerals without `tabular-nums` on `/teams@390`), HF-15
(keyboard cannot page the screen — the double scrollport).

**Why the spread, and what was done about it.** Part of it is lens difference and
is intended. The rest was the rubric's fault, and `benchmark-rubric.md` §2 was
rewritten this round to remove it: every dimension now carries a **Measure**
block (the quantity, and the command that produces it), §2.2 adds the **phase
rule** (a component a later workstream owns is *noted*, not scored — one critic
took D4 to 6 largely because `MbStandingsTable` does not exist, which is
charter-scheduled for W4/W5 P3a), §2.3 caps an **unmeasured** dimension at 5 and
forces the label, and §4's verdict format gained mandatory `IN-SCOPE INVENTORY`,
`SCHEDULED ABSENCES` and `MEASUREMENTS NOT TAKEN` blocks. The bar did not move —
8 is still the pass line and all ten still have to clear it.

**What still remains.** P2, P3 and P4 have all shipped since this list was
written (see the phase table above), so it is no longer a gate on starting them —
it is the list of what is still open:

1. **Gate 2 has not been run.** Until it scores all ten dimensions ≥8 with zero
   §3 hard fails on all cards, the verdict stands at FAIL.
2. Everything in **§8, the deferred-defects register** — the findings this round
   is deliberately *not* fixing, each with an owner and the check that catches it.
3. ~~`--all` reports 295 sub-44px targets / 263 numerals / 82 a11y failures / 1
   overflowing route across 23 routes.~~ **Superseded.** Re-measured across 30
   routes at both viewports in the R6-R9 round: **sub-44px 0, numerals 0, a11y
   0, fonts 0, console 0**, and 0 routes overflowing at their own viewport. What
   replaced it is a different and newer baseline — 52 text overlaps, 2 fixed-
   chrome findings and 3 overflowing widths at 320 — none of which the harness
   could see before this round. The table is in §4.
4. The three out-of-zone-A dependencies in §7.3 of the design language must be
   re-declared inside the Matchbook block **before** P4 deletes zone C, and zone
   B needs an owner. One of the three — the double scrollport — was closed this
   round; see §8 D-1.
5. `MbStateBlock` / `MB_STATE_SCALE` landed in `Panel.tsx` from a sibling while
   the previous round was running and are in §4.2. Anything that lands **after**
   a round is not — re-read the directory before treating §4.2 as exhaustive.

### What P1 actually delivered

**43 files in `src/components/matchbook/`** — 30 primitives plus types, hooks and
the two screen panel libraries. The real list, with a "use this when" line each,
is **`docs/design/matchbook-design-language.md` §4.2**. That inventory reflects
**commit `a4d6876` plus this fix round, re-read from the files at the end of the
round** — not from a plan, and not from `a4d6876` alone. Six agents were editing
those files while it was written, so anything landing after this round is not in
it; re-read the directory before trusting it as exhaustive. Ten of the fifteen
§11 GAPs are closed and each names the file that closed it; every "still open"
claim in §11 was re-verified against the tree at the end of this round
(`MbToast`, `MatchbookBottomBar`, `MbScoreSide`, `MbPageLoading`,
`MatchbookMasthead`, `MbAccountChip`, `MbPanelFoot` are genuinely absent from
`src/`; `data-mb-touch="on"` is genuinely unset; `DeleteConfirmDialog` is
genuinely a ~20-line `MbConfirm` adapter; `PageLoadingSpinner` genuinely still
renders `<Navigation />`).

Still unbuilt, with owners (also listed at the end of §4.2): `MatchbookMasthead`,
`MbEventBar`, `MatchbookTopStrip`, `MatchbookBottomBar`, `MbAccountChip`,
`MbPanelFoot` (W2/P2a) · `MbToast` + `useToast` + `ToastHost`, `MbPageLoading`,
`MbOfflineBanner` (W2/P2b) · `MbScoreSide`, `MbSetStrip`, `useCourtView`
(W5/P3a).

### P0 outcomes worth remembering
- 22 new tokens, ~60 utility classes, 25 new sprite icons (62 total, manifest 1.3.0).
- Coral button fill moved to `--mb-coral-deep` — contrast **3.69:1 → 5.23:1**. This intentionally changes
  pixels on every shipped screen; it is the only sanctioned visual diff besides the live dateline.
- The coarse-pointer 44px floor is **written but not armed** — it sits behind `[data-mb-touch="on"]`, which
  W2 sets on `<html>` in the same commit that removes `maximumScale` and adds `viewport-fit: cover`
  (charter H6 requires those together). One line to activate.
- `.mb-radio` is a squared ballot box, not a circle — the radius vocabulary (authority #1) reserves 999px.
- `.mb-badge` letterforms are navy; tone rides the frame/fill/dot, because tone-coloured text at 0.66rem
  measured 1.97–4.20:1 and failed AA.

---

## 4. State of the tree

`npx tsc --noEmit` clean · `npx vitest run` green — **524 tests across 22 files**, re-run at the end of the
R6–R9 round. (The Gate-1r figure in earlier revisions of this file, 205 tests, is three rounds stale.)

**Do not trust a red build during a fix round without re-running it.** Mid-round, tsc reported 3 errors, all
in `src/app/dev/kit/page.tsx` (`MbIconButtonSize` not exported, `size="sm"` not assignable to
`MbCompositeSize`) — siblings had landed `IconButton.tsx` / `Segmented.tsx` API changes while the shared
gallery still called the old shape. They were gone twenty minutes later. Same for `--all` sweeps: two
different routes returned `LOAD FAIL — HTTP 404` on two consecutive passes and loaded on the other.

`src/app/dev/kit/page.tsx` is a **shared gallery** that up to 7 agents append to concurrently. Re-running an
agent can duplicate its `<section>`, and a mid-write render serves HTTP 500 — if a screenshot or audit run
returns `LOAD FAIL — HTTP 500` on `/dev/kit` while a fix round is in flight, wait and retry rather than
debugging it. De-duplicating the gallery is the audit agent's job. The same applies to `--all` sweeps: a
route can return `LOAD FAIL — HTTP 404` on one pass and load on the next while the dev server recompiles.

### What the R6–R9 round changed in the harness (W8 slice)

The naive-walker verdict (§3) was one root cause: the fixture. Both halves of the
measurement were rebuilt.

**R6 — the fixture.** `gen-fixture.mts` now seeds eight realistic club names in
place of Surge/Tide/Storm/Apex/Flare/Peak/Nova/Riptide:

| chars | name | what it tests |
| --- | --- | --- |
| 18 | Westhill Wanderers | the walker's own name — the one that broke the nav |
| 20 | Riverside Rovers VBC | shares its last two words with… |
| 20 | Redbridge Rovers VBC | …this one, and both open on "R" |
| 22 | Northgate Thunderbirds | a 13-character unbreakable token |
| 26 | Ashford & District Spikers | an ampersand |
| 21 | St Brendan's Panthers | an apostrophe |
| 28 | Kingsbridge Community Vipers | top of the realistic band |
| 40 | Mount Pleasant Community Volleyball Club | the monster |

Three files are written on every run and can never drift apart: `fixture.json`
(realistic — **the default**), `fixture-short.json` (the old one-word roster) and
`fixture-empty.json`. The short variant is the **same tournament** — same ids,
same schedule, same scores, same clock, only `teams[].name` differs — so a diff
between two runs is a pure measurement of name length. `audit.mjs --short` seeds
it. Counts are unchanged at 8 teams / 6 competitions / 70 matches.

The roster lands on **five** distinct crests, not eight, because no realistic
name contains a pack slug so all eight hash over eight buckets. That is what an
arbitrary real roster does. **Do not rename teams until the crests are distinct**
— that is the same mistake as the eight short names in a new costume.

The corpus is also pinned in the tree at `src/__tests__/lib/realisticNames.test.ts`
(8 tests), because the scratchpad is wiped between sessions and the names would
otherwise be lost. It asserts the roster's shape (so it cannot revert to short
words) and holds `splitTeamName` and `crestForTeam` to it.

**R7 — three new checks in `audit.mjs`.**

- **`OVERFLOW` reads both scroll widths.** It measured `body.scrollWidth` alone
  for the whole programme; the defect showed on `documentElement.scrollWidth`.
  It now scores the worse of the two and names which one it came from.
- **`WIDTHS`** re-asks the overflow question at invariant 31's widths rather than
  at the one size the run happens to use, and adds the check that turns "the
  layout is wide" into "the reader has lost the navigation": every
  `position: fixed` element must be inside the viewport, unclipped horizontally,
  hit-testable, and every control inside it reachable. `sticky` is held only to
  the last two — a sticky element outside the viewport is what sticky IS.
  A run sweeps the widths of its own device class (mobile 320/375/390/414 ·
  desktop 768/1024/1280/1440), so `--all --mobile` plus `--all --desktop` covers
  the invariant's eight exactly once.
- **`TEXTOVER`** reports element pairs whose painted **line boxes** intersect —
  measured with `Range.getClientRects()`, not element boxes, so it fires on
  letters rather than on margins. Counted when both sides are in the flow;
  printed but not counted when one side is fixed/sticky chrome (that is an
  accident of where the page opens, and its permanent form is already counted by
  `OCCLUSION anywhere` and `WIDTHS chrome-control-unreachable`).

**The measurement that made `WIDTHS` work.** `window.innerHeight` is the wrong
fold. When content overflows horizontally a mobile engine expands the initial
containing block to the content width and scales its height to match. Measured on
`/` at 320 with the realistic fixture:

```
documentElement.clientWidth  320     window.innerWidth   509
documentElement.clientHeight 844     window.innerHeight 1343
visualViewport               320x844 at scale 1
nav.fixed                    0,1286  509x57
```

The bar is pinned to the bottom of the 1343px ICB — 442px below what the reader
can see — and it is 509px wide in a 320px window. Judged against `innerHeight` it
looks perfectly placed, which is exactly how this survived thirty routes of
`OFLOW 0`. `WIDTH_PROBE` uses `visualViewport.height`.

**Four false-positive classes were found and closed before the baseline was
trusted**, each with a selftest case:

1. the **skip-link idiom** (parked off-screen, revealed on `:focus`) is correct
   code. An off-viewport control is now focused and re-measured; coming back is
   the pattern, staying out is the defect. No selector, no allow-list;
2. that focus probe **leaked focus** — restoring to `document.body`, whose
   `focus()` is a no-op, left the skip link revealed at the next width, covering
   the masthead wordmark. This tool reported a defect it had created itself.
   Blur first, unconditionally;
3. `Range.getClientRects()` returns **unclipped** geometry, so every `truncate`
   span "overlapped" whatever followed it — including its own pinned tail, at
   100%. Rects are now intersected with every clipping ancestor;
4. a range rect is the **font box, not the CSS line box**, so two lines under
   `leading-none` graze by 2–3px of ascender with nothing visibly touching.
   Overlaps must now take a quarter of the smaller rect on both axes to count;
   the grazes are still printed. Separately, `elementFromPoint` was returning the
   **Next.js dev overlay** in the bottom-left corner — exactly where a bottom
   nav's first item lives — so hit-testing skips dev-overlay layers and probes
   five points rather than one.

`--selftest` grew from 22 cases to **46**, all passing, and needs no dev server.
New flags: `--short`, `--skip-widths`. Summary table gained `WIDTH` (chrome
findings / widths overflowing) and `TXOV` (counted / total).

**R8 — the re-baseline.** `--all` at both viewports against the realistic
fixture, 30 routes, **60 runs, 0 load failures**:

| | mobile | desktop |
| --- | --- | --- |
| total violations | **44** | **20** |
| `TEXTOVER` counted (in flow) | **33 on 6 routes** | **19 on 6 routes** |
| `TEXTOVER` under chrome / grazes (not counted) | 24 / 21 | 15 / 19 |
| `WIDTHS` chrome findings | 2 on 2 routes | 0 |
| widths overflowing beyond the run's own | 3 | 0 |
| `SPACING` | 6 (all `/summaries`) | 0 |
| `OCCLUSION` | 3 | 0 |
| `SCROLLPORT` | 0 | 1 (`competition-rr-completed`, `body` 1794/1788 — 6px) |
| `TOUCH` · `NUMERALS` · `FONTS` · `A11Y` · `CONSOLE` | 0 · 0 · 0 · 0 · 0 | same |

**Every one of the 52 text overlaps is new signal — the harness could not see
this class at all before, and none of it is visible on the short-name fixture.**
The worst is `/quick-match@390`, 16 in-flow overlaps: the recent-quick-matches
rows draw the date, the crest, both team names and the scoreline **on top of one
another** and the row is unreadable. Screenshot evidence:
`<SCRATCH>/shots/r7-crop.png`. Routes carrying counted overlaps: `quick-match`
(16 mobile / 2 desktop), `teams` (5 / 5), `vb-rotations` (5 / 5),
`vb-shared-formation` (4 / 4), `history` (2 / 2), `tools` (1 / 1).

**The A/B that settles which half was at fault.** Same tree, same route, same
checks, only the roster swapped — `node audit.mjs quick-match --mobile` against
each fixture:

| roster | `TEXTOVER` counted | violations |
| --- | --- | --- |
| `--short` (Surge, Tide, Storm…) | **1** | **1** |
| default (realistic club names) | **16** | **16** |

Fifteen of the sixteen defects on that screen were invisible to a harness that
was otherwise identical. It was never the checks alone; it was what we fed them.

The two `WIDTHS` findings are both at **320**: `/` draws its bottom nav 342px
wide (22px past the right edge, `chrome-clipped-horizontally`), and
`competition-de-draft` overflows +51px. `/summaries` overflows +1px at 320.

**Reading these numbers.** `OFLOW 0` at every run's own viewport is now a real
number rather than an artefact — the fixture that produced it has 40-character
names in it. Six routes still lose their layout at 320 or draw text through text
at 390, and that is the honest baseline. Expect the numbers to move under you:
sibling agents were landing shell fixes while these sweeps ran, and `/` went from
a 509px-wide nav at 390 to a clean one inside the same session.

### What the Gate-1r fix round changed in the harness (W8 slice)

`<SCRATCH>/pw/audit.mjs` gained two sections, both of which exist because a real defect hid from the harness
for the whole programme:

- **`SCROLLPORT`** — five assertions that the document is the scroller: `document.scrollingElement` is
  `<html>`; BODY is not itself a scrollport; a programmatic `window.scrollTo` moves `window.scrollY`; the
  viewport still shows content after that scroll (9 hit-test sample points, not 1); and a **trusted wheel**
  moves the window rather than an inner scroller. The last two are the ones that matter. On the tree as
  found, the brief's two assertions both *passed* on `/dev/kit@1440` — `scrollingElement` was still `<html>`
  and `scrollTo(0,600)` did move `scrollY` to 600 — while the page was thoroughly broken: 600px into an
  18,124px-tall HTML box whose only painted child was an 844px BODY, so `elementFromPoint` at the viewport
  centre returned `HTML`, and `page.mouse.wheel(0,800)` moved `body.scrollTop` to 800 with `window.scrollY`
  at 0. Synthetic wheel events are untrusted and do not scroll, so this half is driven from the harness
  (`scrollportCheck(page)`), not from inside the page.
- **`FONTS`** — the computed first font-family of every text-painting node. Two tiers, on the A11Y
  precedent: **failures** are elements that fell through to Tailwind preflight's text stack (the F20 bug —
  both faces were dead for weeks because the next/font variable classes sat on `<body>` while every token
  resolving them sat at `:root`, and nothing failed; it just looked like a slightly wider sans);
  **notes** are the preflight *mono* stack (`ui-monospace` on `<code>`), a real but lesser defect — a third
  family the system has never declared. The resolved first-family census always prints, so
  `Oswald 987 · Outfit 364 · ui-monospace 17` is evidence rather than an assumption.

`--selftest` grew from 15 cases to **22**, all passing. Four cover FONTS (an Oswald node and an Outfit node
must produce nothing; a `ui-sans-serif` node must be a failure; a `ui-monospace` `<code>` must be a note and
not a failure). Three cover SCROLLPORT **on both arms of the same synthetic page** — as authored it reports
0 findings and `wheel → scrollY 800`; then the exact production rule
(`html, body { height:100%; overflow-x:hidden }`) is injected and the same code reports
`body-is-second-scrollport`, `window-scroll-does-not-move` and `wheel-bypasses-window-scroll` with
`wheel → scrollY 0 / body.scrollTop 800`. A check that has only ever seen a broken tree cannot prove it will
go green on a fixed one, which is why both arms are asserted.

Readings on the current tree — `node audit.mjs --all` at both viewports, 23 routes:

| Section | desktop | mobile | note |
| --- | --- | --- | --- |
| `SCROLLPORT` | **0 findings** | **0 findings** | was 3 findings on 12 of 22 mobile routes before the `globals.css` zone-B fix landed mid-sweep; the check caught it live |
| `FONTS` failures | **0** | **0** | census is Oswald + Outfit only on every route |
| `FONTS` notes | 1 (`/dev/kit`, 17 `ui-monospace` `<code>` nodes) | 1 | register D-12 territory: printed, not counted |

The summary table gained `SCRL` and `FONT` columns (`FONT` prints `failures/notes`).

### What the earlier Gate-1 fix round changed in the harness (W8 slice)

`<SCRATCH>/pw/audit.mjs` gained **composite awareness**, **three a11y checks** and a **self-test**, because
its spacing section was about to hand six workstreams a wall of false positives.

- A pair of interactive boxes under 8px apart is now split into `SPACING` (counted) and `GROUPED`
  (informational, printed, never silently dropped). A pair is grouped only when both boxes are cells of one
  composite — `[role=tablist]`, `[role=radiogroup]`, `[role=menu]`, `[role=menubar]`, `[role=listbox]`,
  `.mb-segmented`, `.mb-stepper` — or are sibling ruled rows **with a rule measured in the gap band**.
  Unruled adjacent rows stay violations. Grouped pairs print whether a rule was measured, so
  `tablist (no rule)` is still visible.
- A "measured rule" is capped at **2px**, on both paths. Uncapped, `edgeRule` starts at the element itself,
  so any framed control — `.mb-tile`, `.mb-input`, a default `<button>` — supplies its own divider, and any
  gap under 8px between two transparent controls inside a painted panel reads as a rule because the panel's
  ground differs from `rgba(0,0,0,0)`. A rule is a hairline; anything wider is a gap, and a gap under 8px is
  the violation being hunted. A/B on the same tree (`--all` desktop): uncapped **41 spacing / 26 grouped**,
  capped **44 / 23** — the cap recovers three real violations the first cut waived, all on
  `/tools/volleyball/rotations`, where four framed accordion buttons stack **5px** apart and each button's
  own frame was being read as the divider. `/dev/kit` is unaffected (55 grouped either way): its composites
  all abut at ≤1.5px.
- New `A11Y` section: **failures** (`no-accessible-name`, `not-native`, `name-mismatch`) count toward the
  exit code; **notes** (`title-no-aria-label`, `name-from-title`, `icon-only-no-title`) print but do not.
- New flags: `--groups` lists grouped pairs individually; `--no-composites` turns the reclassification off so
  the "before" of any signal/noise claim is measurable on the same tree; `--selftest` runs the composite and
  a11y rules against a synthetic page (no dev server, no fixture) with one known-good and one known-bad case
  each — **15 cases, all passing**. Run it after editing the file. Summary table gained `[grp]` and `A11Y`.

Measured with `--no-composites` vs default on the **same tree**, so the split is a pure partition of one
pair set:

| Sweep | spacing before | spacing after | grouped | cut | a11y failures | a11y notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/dev/kit` desktop | 59 | **4** | 55 | 93% | 0 | 12 |
| `/dev/kit` mobile | 61 | **4** | 57 | 93% | 0 | 12 |
| `--all` desktop (23 routes) | 67 | **44** | 23 | 34% | **82** | 65 |
| `--all` mobile (23 routes) | 70 | **44** | 23 | 37% | **91** | 84 |

`/dev/kit` is the figure that matters for W2–W7, because the kit is where the composites live. The four
survivors there are all real: three list-header-on-first-row collisions (`Select all` / `Clear selection`
abutting the first ruled row at 1px) and the two scoring tap columns at 1px. The app routes barely move
because none of them use `MbTabs`/`MbSegmented` yet — they will, which is exactly why this had to land
before P2. The 55 waived pairs break down `list-row 32 · tablist (no rule) 14 · radiogroup 9`; the
`(no rule)` on all 14 tablist pairs is real signal — those tabs abut with nothing drawn between them.

The critic's named example, the **0px reveal-eye/copy pair, was already fixed by the sibling that owns
`CopyField.tsx`** when this slice ran: measured 10px (`gap-2.5`) between the 44×48 reveal button and the
82×48 copy button. `--selftest` case 6 is that exact shape and asserts it would still be reported.

Also this round: `docs/design/matchbook-design-language.md` was brought into agreement with the tree —
§4.2 rewritten as the real component inventory, §11 turned from "GAPS TO BUILD" into a status register
where every closed gap names its file, and false claims corrected throughout. Three findings from that pass
are new and matter beyond the document:

1. **There is no 1.5px border in the system and there never was.** Chrome floors `border-width: 1.5px` to a
   used value of 1px at DPR 1, 2 and 3. A sweep of `/dev/kit` found 2783 rendered borders — 2616 at 1px, 81
   at 4px, 52 at 3px, 34 at 2px, **zero at 1.5px** — including all 109 elements carrying `border-[1.5px]`.
   The rule hierarchy still reads, because it is carried by colour (translucent `--mb-rule` vs solid
   `--mb-navy`) plus the real 3px/4px steps. §3.3 now says so. **Keep writing `border-[1.5px]`** — it is the
   shipped idiom and produces the correct line; do not "fix" it, and do not go to 2px (spoken for).
2. **`globals.css` has three zones, not two**, and the design language now says so (Trap 2): **A** Matchbook
   (`@theme inline` + first `:root` + every `.mb-*`), **B** a shared middle owned by nobody (the
   `@media (max-height: 500px)` landscape helpers, then `* { box-sizing }`,
   `html, body { …; overflow-x: hidden }`, `body { font-family }`, `.scrollbar-thin`), **C** legacy from the
   second `:root` down. **Three guarantees Matchbook screens rely on live outside zone A** — the global
   `button:active` press scale (C), the global `prefers-reduced-motion` clamp (C), and
   `html, body { overflow-x: hidden }` (B). There is **no** `prefers-reduced-motion` rule anywhere in zone A.
   W2's P4 deletion removes the first two from every converted screen unless they are re-declared first, in
   the same commit. New §7.3 records this. `audit.mjs` will not catch the reduced-motion one — its `MOTION`
   pass detects JS-driven motion, not an unclamped CSS keyframe.
3. **`.hide-landscape` and friends are in zone B**, and §8 previously told W5 to reuse them as
   "legacy-named but system-neutral". Corrected: re-declare them as `.mb-*` in zone A or write the media
   query locally.

Line numbers were removed from the design language throughout. Seven agents edit `globals.css` and
`src/components/matchbook/` in parallel, and every line number in it was already wrong; anchors are now
grep targets (a selector, a token, an export name).

---

## 5. How to resume the interrupted workflow

The workflow script is on disk and completed agents replay from cache — P0 will **not** re-run.

```
Workflow({
  scriptPath: "C:\\Users\\khiem\\.claude\\projects\\C--Dev-Tournament-Tracker--claude-worktrees-app-redesign-features-cf1ebd\\bbc48bd4-cabe-4606-b848-eecddebf3c28\\workflows\\scripts\\matchbook-w1-foundation-kit-wf_38809839-f46.js",
  resumeFromRunId: "wf_38809839-f46"
})
```

Editing an agent's prompt in that script invalidates only that agent's cache entry. Keep the P0 agent's
prompt byte-identical or it re-runs for nothing.

If the scratchpad has been wiped, the run IDs are useless — rebuild the harness per §1 step 4, then relaunch
the phase from scratch rather than resuming.

---

## 6. Verification commands (charter §5)

```bash
cd "C:/Dev/Tournament-Tracker/.claude/worktrees/app-redesign-features-cf1ebd"
# deterministic: 8 teams (18-40 char club names), 6 competitions, 70 matches.
# Writes fixture.json + fixture-short.json + fixture-empty.json every time.
npx tsx <SCRATCH>/pw/gen-fixture.mts
npx tsc --noEmit
npx eslint src
npx vitest run                           # 524 tests, 22 files
```

```bash
cd <SCRATCH>/pw
node routes.mjs                          # 31 route ids (login is BLOCKED locally)
node shoot-all.mjs <SCRATCH>/shots/<label>
node shot.mjs /competitions/comp-se-city-cup out.png --desktop --full
node shot.mjs /dev/kit out.png --mobile  # the primitive gallery

# the measurement sweep — read the docblock at the top of audit.mjs first
node audit.mjs --selftest                        # 46 cases, no dev server needed. Run after editing it
node audit.mjs <routeId|/path> --mobile          # one route
node audit.mjs <routeId> --mobile --short        # the same route on the OLD one-word roster.
                                                 # Same ids, same scores — the diff is name length
node audit.mjs --all --desktop --skip-motion     # every route, no reduced-motion pass
node audit.mjs /dev/kit --desktop --groups       # list the grouped (waived) pairs
node audit.mjs /dev/kit --desktop --no-composites # the same run with grouping OFF — the honest "before"
node audit.mjs home --viewports --json           # machine-readable, all three sizes
```

Reading the output:

| Section | Counts toward the exit code? | Meaning |
| --- | --- | --- |
| `TOUCH` | yes | real hit area under 44×44, after probing all four corners with `elementFromPoint` |
| `SPACING` | yes | adjacent interactive pairs under 8px that are **not** one composite's cells |
| `GROUPED` | **no** | pairs waived as composite cells. Prints the kind and whether a rule was measured |
| `OVERFLOW` | yes | **both** `body.scrollWidth` and `documentElement.scrollWidth` vs `clientWidth`, worse of the two, with the widest unclipped culprits named. It read only the first for the whole programme, which is why one two-word team name went unreported on thirty routes |
| `WIDTHS` | yes | the same overflow question at invariant 31's widths, plus: every `position: fixed` element inside the viewport, unclipped, hit-testable, with every control in it reachable. `sticky` is judged only on clipping and hit-testability. Mobile sweeps 320/375/390/414, desktop 768/1024/1280/1440 — run both to cover the invariant |
| `TEXTOVER` in flow | yes | element pairs whose painted **line boxes** intersect, measured with `Range.getClientRects()` and clipped to their clipping ancestors |
| `TEXTOVER` under chrome / grazes | **no** | one side fixed/sticky (an accident of where the page opens — its permanent form is counted by `OCCLUSION anywhere`), or an intersection under a quarter of the smaller rect (font-box bleed from tight leading) |
| `SCROLLPORT` | yes | the document must be the scroller: `scrollingElement` is `<html>`, BODY is not a second scrollport, `window.scrollTo` moves `scrollY`, the viewport is not blank afterwards, and a **trusted wheel** moves the window |
| `NUMERALS` | yes | standalone numerals with no `tabular-nums` (digits inside prose are counted separately and never fail) |
| `FONTS` failures | yes | computed first font-family fell through to Tailwind preflight's text stack — the Oswald/Outfit chain is broken |
| `FONTS` notes | **no** | first family is the preflight *mono* stack (`ui-monospace` on `<code>`) — an undeclared third family |
| `A11Y` failures | yes | `no-accessible-name`, `not-native`, `name-mismatch` |
| `A11Y` notes | **no** | `title-no-aria-label`, `name-from-title`, `icon-only-no-title` |
| `CONSOLE` | yes | console + page errors, with the documented dev-env noise filtered |
| `MOTION` | yes | inline-style drift across two frames under `prefers-reduced-motion: reduce` |

`SCROLLPORT` reports `0 findings` on a page that fits the viewport and says so — a short page cannot
demonstrate a scroller defect, and that is printed rather than passed silently. `FONTS` always prints the
resolved first-family census, so a clean run carries its own evidence.

A `GROUPED` count is not a licence to ignore it: a `tablist (no rule)` line means those tabs abut with
nothing drawn between them, which may still be wrong. It means the 8px *separation* rule does not apply.

Two limits to know before trusting a clean run. `MOTION` samples inline styles and computed
transform/opacity across two frames, so it detects **JS-driven** motion — a CSS keyframe that was never
clamped under `prefers-reduced-motion` passes. And React attaches click handlers by delegation, so a `<div>`
with an `onClick` and no `role`/`tabindex` is invisible to `A11Y` and to `TOUCH` alike.

Baseline to diff against: `<SCRATCH>/shots/baseline/` (60 PNGs).

Known harness limits: `/login` cannot be shot while preview-auth is on; mobile full-page shots reach ~8700px
and need `--scroll` to read. (`/session/*`, `/summary/*` and `/tools/**/shared/*` all render populated now —
`NEXT_PUBLIC_DEV_PREVIEW_SESSION` landed. That limit is gone.)

Two limits that remain, and both are real. `TEXTOVER` measures the page **at rest**: two strings that only
collide once a panel expands are invisible to it. And `WIDTHS` resizes the viewport without reloading, so a
layout decided at mount from a width read in JS is measured in its mount-time shape, not its resized one.

---

## 7. Standing decisions (do not relitigate — see charter Appendix A)

- Dark mode is **dropped** for Matchbook; `ThemeToggle` and `ThemeContext` get deleted in P4.
- The mobile scrolling text nav is replaced by a real bottom tab bar (`MatchbookBottomBar`).
- `userScalable: false` is **removed**, with `touch-action: manipulation` on scoring controls.
- No QR code in v1. No framer-motion on converted screens. No second icon library. No emoji.
- Team colour only ever appears as a contained 3px accent bar beside a crest — never a fill or gradient.
- Known app bug to fix during W5: `src/app/match/[id]/page.tsx:112` shows a `Live` badge and tappable
  scoring controls on a **completed** match.

---

## 8. Deferred-defects register

**Every Gate-1r critic finding we are deliberately NOT fixing in this round, with the reason and the check
that will catch it.** This section exists because "later" is where real defects go to die quietly. Nothing
leaves this register except by being fixed *and re-measured*, or by an explicit decision recorded here.

Sources — three verdicts, full text at `<SCRATCH>/verdict-A.md`, `verdict-B.md`, `verdict-C.md` (extracted
from `~/.claude/projects/…/subagents/workflows/wf_544d35ce-d57/journal.jsonl`, result rows 30/31/32). Cited
below as **A**, **B**, **C**. Every number in this section was **re-measured against the working tree during
the Gate-1r round**, not copied from the verdicts — several had already moved.

Dispositions: **SCHEDULED** (a named workstream/phase owns it) · **OUT OF SCOPE** (a standing decision or
charter rule puts it elsewhere) · **DISPUTED** (the finding is wrong, or the critics disagree and the tree
settles it).

### 8.1 Closed during Gate 1r — do not re-file

| Finding | Raised by | Verified closed by |
| --- | --- | --- |
| **Double scrollport.** `html, body { height:100%; overflow-x:hidden }` made BODY a second viewport-height scroller; a wheel moved `body.scrollTop` while `window.scrollY` stayed 0, and `End` scrolled the app off-screen into blank paper | A-D10, B-HF-15 | `globals.css` zone B is now `html { height:100%; overflow-x:hidden }` / `body { min-height:100% }`. `audit.mjs --all` reports **0 SCROLLPORT findings on 23 routes, desktop and mobile**. `/dev/kit@1440`: `scrollTo(600) → scrollY 600`, `wheel(800) → scrollY 800, body.scrollTop 0` |
| **No distinct pressed state on any button.** `.mb-console-column:active` was the only `:active` recipe against 60+ controls | A-D5, C-D5 | `globals.css` now carries **25 `:active` rules** covering `.mb-btn`, `.mb-tile`, `.mb-swatch`, `.mb-segmented > *`, `.mb-stepper button`, `.mb-nav-item`, `.mb-tab`, `.mb-row-hover`, `.mb-panel-link`, `.mb-console-column`, the outline variants, and a `prefers-reduced-motion` arm |
| **Enabled field boundaries at 1.74:1.** `.mb-input`/`.mb-search`/`.mb-textarea` painted their only edge in `--mb-rule` | C-HF-6a | `.mb-input` now reads `border: var(--mb-rule-edge) solid var(--mb-navy)` |
| **Both type faces were dead** (the pre-Gate-1r F20 bug) | F20 | New permanent check: `audit.mjs` **FONTS**. `--all` reports **0 preflight fall-throughs on 23 routes** at both viewports; `/dev/kit@1440` census `Oswald 987 · Outfit 364` |

### 8.1b Closed since Gate 1r — re-measured for this entry

Each row was measured against the working tree during the R6–R9 round, not
copied from a commit message.

| Finding | Register id | Verified closed by |
| --- | --- | --- |
| **The 44px coarse-pointer floor was written but never armed** — `[data-mb-touch="on"]` had 4 selector lines and 0 writers | D-5 | `src/app/layout.tsx:92` now sets it on the root element |
| **231 `oklch(...)` declarations, the shadcn `:root` block and the `.dark` block** | D-1, D-31 | `356eaa2`. `grep -c "oklch(" src/app/globals.css` → **2**; no `.dark` block; `ThemeToggle.tsx` and `ThemeContext.tsx` are gone |
| **`.scrollbar-thin` consumed by two Matchbook components** (`Sidebar.tsx`, `MobileBar.tsx`) | D-2 | the class and both consumers are gone; only a comment marking where it was remains |
| **`.soft-card` / `.playful-card` / `.glass-*`** | D-32 | 4 remaining mentions in `globals.css` are prose, not rules |
| **framer-motion on converted screens** | charter §7 | **zero** `from "framer-motion"` imports in `src/`; the six remaining hits are prose in comments |
| **Not-yet-built components**: `MatchbookMasthead`, `MbEventBar`, `MatchbookTopStrip`, `MatchbookBottomBar`, `MbAccountChip`, `MbToast`/`useToast`/`ToastHost`, `MbPageLoading`, `MbOfflineBanner`, `MbScoreSide`, `MbSetStrip`, `MbStandingsTable`, `MbMatchRow`, `BracketRail`, `MbCourtCard` | D-28, D-29, D-30 | all present in `src/components/matchbook/`, verified by export grep. **Still absent: `MbPanelFoot` and `useCourtView`** — those two rows stay open |
| **`audit.mjs` could not see horizontal overflow, unreachable fixed chrome, or text drawn through text** | — | R7. `OVERFLOW` reads both scroll widths; `WIDTHS` and `TEXTOVER` are new sections; `--selftest` is 46 cases. §4 has the numbers |
| **The fixture had eight one-word team names** | — | R6. 18–40 character club names are the default; `fixture-short.json` keeps the old roster; the corpus is pinned in `src/__tests__/lib/realisticNames.test.ts` |
| **295 sub-44px targets desktop / 222 mobile across 23 routes** | D-6 | **0 / 0** across 30 routes at both viewports. D-5 (arming the floor) was the fix, exactly as the register predicted |
| **`/tools` overflows +35px at 390** | D-7 | `/tools` audits **0 overflow** at 390 and clean at 320/375/414 |
| **16 numerals without `tabular-nums` on `/teams@390`; 263 / 256 app-wide** | D-11 | **0 / 0** across 30 routes at both viewports |
| **`/competitions` renders seven equal-weight empty headlines** | D-14 | `/competitions` reports **0** headlines against a budget of 1, at both viewports; app-wide 7 headlines per 30-route sweep, **0 over budget on 0 runs**, at both viewports |

### 8.2 SCHEDULED — a named workstream owns it

#### Legacy stylesheet and leakage

| ID | Finding, as measured now | Raised by | Why not now | Owner | Caught by |
| --- | --- | --- | --- | --- | --- |
| D-1 | **231 `oklch(...)` declarations** in `globals.css`, the second `:root` shadcn token block (`--primary` → the old red, `--card`, `--popover`, `--secondary`, `--muted`, `--red-light/dark`, `--card-shadow`, `--color-team-*`), and the **`.dark` block at `globals.css:2271`** | A-HF-4, B-D3 | Charter W2 **P4** deletes zone C only after the last consumer is gone. Deleting it now takes `ThemeToggle`, `ThemeContext` and every unconverted screen with it. Both B and C independently verified **0 legacy classes render** today — the risk is silent, not visible: `bg-primary` would ship the old red and pass tsc, eslint and all 205 tests | W2 / P4 | rubric **9.1** (zero pre-Matchbook classes in the live DOM) and §3 **HF-4**, at Gate 2 and at every P3 screen gate |
| D-2 | **`.scrollbar-thin` consumed by two Matchbook components** — `Sidebar.tsx:21`, `MobileBar.tsx:43` — whose thumb is `oklch(0.7 0.08 25 / 0.3)`, the pre-Matchbook warm red. (`QuickAddTeams.tsx:261` also consumes it; that file is legacy) | A-HF-4 | This is **not** a zone-C deletion, and the scope rule is explicit: fix the *consumption*, not the class. It is deferred only because both files are W2's shell, and W2 replaces both in P2a — patching them now would be thrown away | W2 / P2a | **9.1**. If P2a lands with either consumer surviving, that is an HF-4 on the shell gate, not a deferral |
| D-3 | **`.mb-skeleton` paints `rgba(7,50,77,0.08)`** rather than an alpha of `--mb-navy` | B-fix6 | Cosmetically identical today; it is a token-hygiene item that belongs with the zone-C sweep | W2 / P4 | rubric **3.1** |
| D-4 | **`.hide-landscape` and the `@media (max-height: 500px)` helpers live in zone B**, owned by nobody, and Matchbook screens depend on them | design-language §7.3 | Zone B has no owner assigned. Assigning one is a charter decision, not a fix | **UNOWNED — assign before P4** | nothing automated. This is the one item in this register with no check behind it |

#### Touch, spacing and overflow

| ID | Finding, as measured now | Raised by | Why not now | Owner | Caught by |
| --- | --- | --- | --- | --- | --- |
| D-5 | **The 44px coarse-pointer floor is written but never armed.** `[data-mb-touch="on"]` appears at `globals.css:1048–1051` and **nowhere else in `src/`** — 4 selector lines, 0 writers | A-HF-2, A-D6 | Charter **H6** requires the attribute, the `maximumScale` removal and `viewport-fit: cover` to land in one commit. That commit is W2's | W2 / P2a | `audit.mjs` **TOUCH** (rubric 6.1). Note the floor being dead is *not* itself what TOUCH measures — TOUCH measures the consequence, which is D-6 |
| D-6 | **295 sub-44px targets desktop / 222 mobile across 23 routes.** Kit-level survivors, re-measured: `a.mb-nav-item` **217×38 at 0px separation ×6** on `/`; `a.mb-btn.mb-btn-outline` **177×38.8**; `a.mb-skip-link` **135.8×36.8** (the only TOUCH finding on `/dev/kit`); `a.mb-panel-link` was **98.3×17.3** on `/` | A-HF-2, B-HF-2 | The great majority are un-converted legacy screens and are P3's baseline. The kit-level ones are gated on D-5: arming the floor fixes the whole class in one place, and patching call sites first would have to be undone | W2 / P2a (floor) · W3–W7 / P3 (screens) | `audit.mjs` **TOUCH**, per route. Target is 0 on every converted screen |
| D-7 | **`/tools` overflows +35px horizontally at 390px** — `body.scrollWidth 425 vs clientWidth 390`, culprit `div.flex.items-center.gap-4` in the masthead stat row (`right 425, w 409`) | not raised by any critic — found by this round's sweep | The tools hub shipped in `abd874b`; it is a converted screen, so this is a live **HF-1**, not a deferral. Recorded here so it is not lost between rounds | **owner of `/tools` (W7)** — next round, not later | `audit.mjs` **OVERFLOW** (rubric 6.3). Currently the only overflowing route of 23 |
| D-8 | **`.mb-badge` 342.9px wide at x=41 in a 375px viewport**, severed mid-word ("…BEFORE THE B") and unreachable because the root `overflow-x: hidden` suppresses the scroll | C-HF-1 | Disputed in part — see **D-22**. The demo label on `/dev/kit` is a gallery string, but `MbBadge` clamping is a real kit gap | W1 (kit) — next round | rubric **6.3** + the D4 `clipped` expression at 320/375 |
| D-9 | **320px hard clipping with no ellipsis**: `(required)` loses 74px, StepRail legend loses 77/88/80px | B-D1 | Same class as D-8 and the same fix (wrap-or-ellipsis strategy), so it moves with it | W1 (kit) — next round | D4 `clipped` at 320 |

#### Type, colour and copy on the six shipped screens

The critics all scored `/dev/kit`. These are on the **shipped** screens and were measured this round.

| ID | Finding, as measured now | Raised by | Why not now | Owner | Caught by |
| --- | --- | --- | --- | --- | --- |
| D-10 | **Coral-as-text below AA on five of the six shipped screens — 19 failing text nodes.** Sidebar wordmark "Tracker" `span.block.text-mb-coral` 16.8px/700 at **3.26:1** (all six screens); `/competitions` status badge "Draft" 10.56px/700 at **2.15:1**; `/competitions` "Live" chip 14.4px/700 at **4.20:1**; kickers and datelines ("Jul 31", "Round 4", "5:48 AM") at **3.26–3.55:1**; `/competitions` scoreline "15 – 13" 15.2px/700 at 3.55:1. Floors: 4.5:1 under 24px (or under 18.66px/700). Per screen: `/` 5 fails, `/teams` 3, `/competitions` 7, `/history` 0, `/tools` 2, `/quick-match` 2 | not raised — the critics scored `/dev/kit`, which is clean (A and C both measured 0 real failures there) | This is a live **HF-6** on shipped screens, deferred only because the fix is one decision — coral letterforms under 24px go to `--mb-coral-deep`, exactly as `.mb-badge` already resolved for its own tone words at 0.66rem (recorded in §3 of this file) — and that decision belongs with whoever owns the shipped-screen sweep, not with a kit agent | **W1/W2 shipped-screen sweep — next round** | rubric **3.2** (`text` list must be empty on every screen coral appears on) and §3 **HF-6** |
| D-11 | **16 standalone numerals without `tabular-nums` on `/teams@390`**, from `teamPanels.tsx`, including a 13.6px `td.matchbook-display` "1". App-wide: **263 desktop / 256 mobile** across 23 routes | A-HF-13 | The `/teams` 16 are a converted screen and are a live **HF-13**; the rest are un-converted P3 screens | W1 (teamPanels) — next round · W3–W7 / P3 (rest) | `audit.mjs` **NUMERALS** (rubric 1.6 / 4.6) |
| D-12 | **28 `border-[1.5px]` call sites in 15 files** (`competitions/page.tsx` 3, `dev/kit/page.tsx` 3, `login/page.tsx` 3, `quick-match/page.tsx` 3, `tools/page.tsx` 3, `CopyField.tsx` 3, `summaries/page.tsx` 2, plus 8 files at 1) against **10** call sites using the `--mb-rule-edge/accent/anchor` tier. Was 50 in 16 files when this round opened | A-D2 | **This is not a defect.** The design language records that Chrome floors `border-width: 1.5px` to a used value of 1px at DPR 1/2/3 — a sweep of `/dev/kit` found 2783 rendered borders, **zero at 1.5px**. `border-[1.5px]` is the shipped idiom and produces the correct line. Converting the remainder to the token tier is *consistency*, not correctness, and going to 2px is forbidden (spoken for) | W1 — opportunistic, no deadline | nothing automated, by design. Do **not** add an audit check for it; a check that fires on correct code is how a tool gets ignored |
| D-13 | **`splitStateMessage` (`Panel.tsx`) prints the post-em-dash clause verbatim as a deck**, so shipped empty states open lowercase mid-sentence: "add your first team to start the directory.", "its status will appear here." — 6 on `/teams`, 6 on `/competitions`, ~35 messages app-wide | A-D1 | Copy pass across ~35 strings; belongs with the shipped-screen sweep, not with a kit agent mid-round | W1/W2 shipped-screen sweep | rubric **7.5** and D1 evidence; no automated check |
| D-14 | **`/competitions` renders seven equal-weight "NO … EXIST YET" display headlines**, two textually identical, five with no action — `PanelEmpty` promotes every empty state to a 1.2rem bold display line and `MB_STATE_SCALE` has no quieter row | A-D7, A-D8 | Needs a third `MB_STATE_SCALE` row (`quiet`) and a `scale` prop — a kit API change, then a screen pass. Two owners, so it is sequenced rather than raced | W1 (kit scale) → W1/W2 (screen) | rubric **7.3** (≤1 equal-weight state headline per screen) and **8.1** |

#### Kit API, size ladder and type scale

| ID | Finding, as measured now | Raised by | Why not now | Owner | Caught by |
| --- | --- | --- | --- | --- | --- |
| D-15 | **Four incompatible control ladders**: `.mb-btn` 44/48/56, `MbIconButton` 44/56, `.mb-segmented` 44/48, `.mb-stepper` 46/58 — and `size="md"` means 48px on one and 44px on another. One `MbSegmented[data-size="md"]` rendered cells at 48 **and** 54.38 simultaneously when a label wrapped | A-D2, A-D9 | `Button.tsx`, `IconButton.tsx`, `Segmented.tsx` and `form.tsx` are all being edited by siblings **in this round** — this is in flight, not deferred, and this row exists so it is re-measured rather than assumed | W1 — this round | rubric **2.1** and **2.5** (`heights` must be a subset of {44,48,56}; `sizeSplit` must be empty) |
| D-16 | **Button appearance has four prop names** (`variant` / `tone` / `actionTone` / `triggerVariant`); **`tone` names seven unrelated unions**, and `tone="navy"` means *ink* on `MbLiveStatus`/`MbScoreNumeral` but *ground* on `Panel`/`MbDialog`/`MbIconButton`; `MbTabs` takes `onValueChange`+`items` while `MbSegmented` takes `onChange`+`options`; `MbAction` and `MbEmptyStateAction` are two near-identical action interfaces | A-D9 | A rename touching every kit file and every call site. Doing it mid-round, while six agents hold those files, guarantees conflicts. It must be one commit, alone | W1 — dedicated round **before W2 forks a third action type for `MatchbookMasthead`** | rubric **9.4**. This is the highest-leverage item in the register: every hour it waits, more call sites copy the wrong name |
| D-17 | **Five hand-rolled controls inside the kit re-derive `.mb-btn`** rather than composing it — `Dialog.tsx`, `Sheet.tsx`, `CopyField.tsx`, `form.tsx` (tag remove). `CopyField`'s Copy key is a second navy-fill treatment at 0.72rem with a `brightness-125` hover, sitting inches from a real `.mb-btn-navy` at 0.8rem in the gallery | A-D9 | Blocked on D-15: `CopyField` exists in that shape **only because `MbIconButton` has no 48px step**. Fixing it before the ladder just moves the seam | W1 — after D-15 | rubric **9.5** |
| D-18 | **54 distinct type steps at 1440px / 53 at 390px against a named scale of 23**; 8 size/weight pairs carrying two or more trackings at once; 179 elements riding `.matchbook-display`'s default `0.02em`, which §2.2 says is only correct for the masthead — and the masthead measures `0.01em`, so `0.02em` is correct for nothing; off-scale sizes 12px (`ActionBar.tsx`), 11.2px (`MbStat` delta), 14px (`form.tsx` `md:text-sm!`) | C-D1 | A scale-closure pass across the whole kit. Partly in flight (`form.tsx` is held by a sibling this round); the rest is a dedicated pass | W1 — next round | rubric **1.1 / 1.2 / 1.3**, which is exactly why those three quantities were added to the rubric this round |
| D-19 | **25 of 50 prose blocks fall outside 45–75 characters per line** (worst 134/116/116/113); `MbNotice` has no measure cap and sets **127 characters on one line** at 1440px | C-D1, C-D7 | Needs a `max-width` decision on the state/notice blocks — a design-language change, then a kit change | W1 — with D-18 | rubric **1.4** and **7.5** |
| D-20 | **13 elements truncate at desktop 1440px**, including a `.mb-kicker truncate` clipping 278px of label into 134px and `MbStat`'s "POINTS SCORED ACROS…" inside a 1300px panel | C-D4, C-D6 | Removing `truncate` risks reflow in panels a sibling is editing; it needs one pass with fresh shots | W1 — next round | rubric **4.4** / **8.4** (`clipped` must be 0 at 1440) |
| D-21 | **`MbNotice` warn and danger share one glyph** (`DEFAULT_ICON.warn = DEFAULT_ICON.danger = "warning"`), identical navy letterforms, identical geometry — the only difference is hue, and the warn hue (`--mb-gold` at **2.15:1**) fails 3:1 | C-HF-10, C-HF-6b | **HALF CLOSED — the glyph half (HF-10) was fixed by F7 of the convergence round**: `danger` now defaults to `close`, `warn` keeps `warning`, so the two tones differ in shape, not hue alone. **Still open: the warn rail rides `--mb-gold` at 2.15:1** (`globals.css` `.mb-banner[data-tone="warn"]`), which fails the 3:1 non-text floor — that is an HF-6, not touched by F7 | W1 — the gold-rail hue, next round | §3 **HF-6** and rubric **3.3**; the glyph half is a read of the greyscale shot (rubric 3.5) |
| D-22 | **Coral does ~15 jobs**, including the focus ring on all 60 tab stops — on `MbTabs` the focus ring and the active-tab underline are the same hue with opposite meanings. Two semantic collisions against the design language's own §1.2 table: "leader" is `--mb-teal` as a table rail but `--mb-coral` as the scoreboard notch; "Final" is `--mb-green` as a badge but `--mb-coral-deep` as `.mb-stamp-final` | C-D3 | The focus-ring hue is a system-wide decision (it appears on every screen, converted or not) and the two collisions are design-language edits before they are code edits | W1 + design-language owner — dedicated decision | rubric **3.4** (coral job count ≤2). The count is the point: it is the one quantity that makes "coral is reserved" falsifiable |
| D-23 | **`.mb-icon-disc` is 999px for navy/teal/green but 3px for coral/gold/red** — a class named "disc" renders rectangular 4 times in 23, so the shape channel maps two tones to one mark in greyscale where `MbBadge` gets 9 distinct marks. Plus **6 elements at a 1px radius**, outside the 4/3/2/999 vocabulary | C-D2, C-D9 | Small, real, and not held by anyone this round | W1 — next round | rubric **2.2** (`radii` must be a subset of the vocabulary) and **3.5** |
| D-24 | **`MbToggle` hard-codes coral for every "on" switch** with no prop to quiet it, and its "on" state reads **lighter** than its "off" in greyscale — inverted weight | A-D3, A (greyscale note) | `form.tsx` is held by a sibling this round | W1 — next round | rubric **3.4** and **3.5** |
| D-25 | **Motion property census**: 0 of 358 transitioning elements animate `transform`; 27 animate `opacity`; **324 animate paint properties and 7 animate `width`** (`.mb-meter > span`, layout-triggering). The dominant duration is **150ms**, which is not one of `--mb-dur-fast/base/slow` (120/180/280) — 7 hand-written `0.15s` in `globals.css` plus Tailwind's `transition-colors` default | C-D5 | Partly closed: the `:active` recipes landed this round (§8.1). The `width`→`transform: scaleX()` change and the duration sweep did not | W1 — next round | rubric **5.1** (`props.layout` must be 0) and **5.2** (every duration resolves to a token) |
| D-26 | **`.mb-enter` / `.mb-stagger-1..6` have zero consumers outside the `/dev/kit` demo tile** — the documented entrance vocabulary is applied to 6 demo elements on a 20,900px page and to nothing shipped. The brief calls "alive" a first-class requirement | A-D5, C-D5 | Applying entrance choreography to shipped screens is a per-screen authoring decision (which elements, in what order), not a kit change — it belongs to each screen's conversion | W2 / P2a (shell) then W3–W7 / P3 (screens) | rubric **5.4** (`entrance.count > 0 and ordered`). Until a screen conversion applies it, D5 cannot reach 8 on that screen |
| D-27 | **Type does not escalate on mobile** — `/dev/kit` renders 9.92px labels and 11.52px body at 390px, byte-identical to 1440px except the `h1` | C-D6 | **DISCHARGED BY DECISION (F8, convergence round).** The design language argues the width-invariant data ramp twice with measured painted-character floors (§2.1, "width-invariant below the masthead — on purpose"), and `benchmark-rubric.md` D6.6 now carries the matching carve-out: the invariance is conformant WHILE both conditions hold (named intentional + floors measured at every width). Lose either half and this row reopens | closed — design-language owner guards the two conditions | rubric **6.6** carve-out, both conditions checked at every card |

| D-40 | **`/summary/[shareCode]` names a champion its own standings rank 4th.** Newly visible now that the route renders populated (`/summary/SPRNG7`): the hero reads "Champion — Tide, 3 wins" while Final Standings puts Apex 1st and Tide 4th. Two different rankings, one screen. `computeSessionStats` (`sessions.ts`) picks the first team to reach the highest win count, with no tiebreak and iteration order deciding; `useSummaryPage.teamStats` sorts by wins **then point differential**. Four teams are on 3 wins in that fixture, so they disagree by construction, not by chance | found by W8 while building the preview fixture; no critic saw it, because the route could not render | It is a real data-correctness defect on a public, shareable screen, and the fix is a ranking decision (`rankTeams` in `lib/standings.ts` is the existing shared authority) that belongs with whoever rebuilds the screen — patching `computeSessionStats` now would collide with W6's rewrite | **W6 / P3b** | The two rankings must agree: the hero team is `rankTeams(...)[0]`, or the hero is dropped. Re-check on `/summary/SPRNG7`, where the disagreement is currently visible |

#### Not-yet-built components — SCHEDULED ABSENCES, noted not scored (rubric §2.2)

| ID | Absent | Owner | Note |
| --- | --- | --- | --- |
| D-28 | `MbStandingsTable`, `MbMatchRow`, `BracketRail` / `MbBracketCell` / `BracketConnectors`, `MbCourtCard`, `MbScoreSide`, `MbSetStrip` | **W4 + W5 / P3a** | A took D4 to 6 largely on this absence. Under the phase rule this is now a SCHEDULED ABSENCE and does not move a score. It also means **D4 cannot be meaningfully scored on `/dev/kit`** — one numeral and one matchup block is fewer than three in-scope specimens, so `n/a` is the correct entry at P1 |
| D-29 | `MbToast` + `useToast` + `ToastHost`, `MbPageLoading`, `MbOfflineBanner` | **W2 / P2b** | A deducted D7 for their absence; same treatment |
| D-30 | `MatchbookMasthead`, `MbEventBar`, `MatchbookTopStrip`, `MatchbookBottomBar`, `MbAccountChip`, `MbPanelFoot`, `useCourtView` | **W2 / P2a**, `useCourtView` **W5 / P3a** | Same treatment. Note D-16: `MatchbookMasthead` must not fork a third action interface |

### 8.3 OUT OF SCOPE — a standing decision or charter rule puts it elsewhere

| ID | Finding | Why |
| --- | --- | --- |
| D-31 | The `.dark` block, `ThemeToggle`, `ThemeContext` | Dark mode is dropped for Matchbook (§7). Deletion is W2/P4, not a defect to fix |
| D-32 | `.soft-card`, `.playful-card`, `.glass-*` in `globals.css` | Zone C, W2/P4 deletion. No Matchbook component consumes them (verified: the only Matchbook consumers of any zone-B/C class are the two `.scrollbar-thin` call sites in D-2) |
| D-33 | No view-transition / shared-element continuity between list and detail | B-D5, C-D5 raise it as the D5 **10-anchor**, not the 8-anchor. It is a P3 screen-pair concern (list→detail), and no screen pair is converted yet |
| D-34 | No INP / CLS figures produced | B-D10, C-D10. Real, and now operational rather than deferred: rubric **10.1/10.2** name the measurement and §2.3 caps D10 at 5 without it. The next critic must produce the numbers |

### 8.4 DISPUTED — recorded so it is not re-litigated from memory

| ID | Claim | Ruling |
| --- | --- | --- |
| D-35 | A-D2: "35 literal `1.5px` borders … in a system whose own CSS records that the 1.5px tier never rendered" — framed as a defect | **Rejected as a defect, kept as a consistency item (D-12).** `border-[1.5px]` is the shipped idiom and renders the correct 1px line at every DPR. The count also moved from 50/16 files to **28/15** during this round, so any verdict quoting the old number is stale |
| D-36 | C-HF-1: the clipped `.mb-badge` at 375px is a hard fail | **Upheld as a kit gap (D-8), disputed as a screen defect.** The offending string is a `/dev/kit` demo label chosen to stress the component; the real finding is that `MbBadge` has no `max-width`/ellipsis degradation, which is D-8. Shortening the demo label alone would hide it |
| D-37 | C-D6 scored touch ergonomics **6** while stating the hit-area sweep was not re-run; A and B measured **3** and **4** | **C's number is void under rubric §2.3** (unmeasured ⇒ capped at 5, labelled `UNMEASURED`). The tree's own measurement stands: `/dev/kit` 1 TOUCH, `/` 22 of 23 sub-44, `/teams@390` 17 of 17 |
| D-38 | B-D1 scored typographic craft **8**; A and C scored **6** | **Unresolved by measurement at the time** — B did not produce the step census (1.1), the tracking-collision list (1.3) or the cpl list (1.4) that C did. Under the rewritten §2 the three quantities are mandatory, so this specific disagreement cannot recur: 54 steps against a named 23 is not an 8 |
| D-39 | A-D10 scored perceived performance **5** citing the double scrollport; C scored **7** without checking it | **A was right and the defect is now closed** (§8.1). C's D10 did not run 10.3; under §2.3 it would now be capped |

### 8.5 How this register is discharged

At Gate 2, every row in §8.2 is either (a) closed and re-measured, with the number in §8.1, or (b) still here
with a fresh measurement and an unchanged owner. A row that has been in this register for two consecutive
gates without moving is escalated to the phase table in §3 as a blocking item — that is the whole mechanism
that stops "later" from being permanent.
