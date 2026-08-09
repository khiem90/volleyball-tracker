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

# 2. env file — copy from main, then append the design-preview flag
Copy-Item "C:\Dev\Tournament-Tracker\.env.local" "C:\Dev\Tournament-Tracker\.claude\worktrees\app-redesign-features-cf1ebd\.env.local"
Add-Content "C:\Dev\Tournament-Tracker\.claude\worktrees\app-redesign-features-cf1ebd\.env.local" "`nNEXT_PUBLIC_DEV_PREVIEW_AUTH=1"
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
| P1 primitive kit | W1 | **PARTIAL — interrupted by session limit** (see §4) |
| P1 ranking + tests + audit.mjs | W8 | **PARTIAL** |
| Gate 1 (regression + critique) | — | not started |
| P2a shell | W2 | not started |
| P2b toast/loading/offline/layout, contexts | W2 + W8 | not started |
| P3a create-flows, competition-detail, live-scoring, volleyball | W3 W4 W5 W7 | not started |
| P3b public share | W6 | not started (gated on W4) |
| P4 legacy deletion | W2 | not started |

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

## 4. Exactly what is half-finished right now

`npx tsc --noEmit` reports **7 errors**; `npx vitest run` reports **2 failing tests**. Both are the debris of
agents killed mid-write, not design problems.

| File | Problem | Owner on resume |
| --- | --- | --- |
| `src/components/matchbook/Panel.tsx:107,141,144` | `TeamMark` gained a `size` string union but still forwards it to `Crest`, which takes `number` | W1 `kit-logic` |
| `src/__tests__/lib/doubleElimination.test.ts:77,90,104,117` | fixture objects missing required `Match` fields | W8 `w8-data` |
| `src/__tests__/lib/win2out.test.ts` + 1 other | 2 assertions failing | W8 `w8-data` |

**Primitives that exist:** Badge, Button, ChoiceCard, Confirm, CopyField, Dialog, EmptyState, FinalStamp,
IconButton, Meter, Notice, ScoreNumeral, Segmented, SelectList, Sheet, Skeleton, Stat, StepRail, Tabs,
form.tsx, formatMeta.ts, useMbReducedMotion.ts, lib/standings.ts, lib/text.ts, and `src/app/dev/kit/page.tsx`.

**Primitives still missing:** `ActionBar.tsx`, `Menu.tsx`, `ShareAction.tsx`, `ScoreboardHero.tsx`,
`LiveStatus.tsx`, `DangerZone.tsx`, `ReorderList.tsx`, plus W8's `twoMatchRotation`/`standings` test suites
and `<SCRATCH>/pw/audit.mjs`.

`src/app/dev/kit/page.tsx` is a **shared gallery** that 7 agents append to concurrently. Re-running an agent
can duplicate its `<section>` — the Gate-1 audit agent is responsible for de-duplicating it.

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
npx tsx <SCRATCH>/pw/gen-fixture.mts     # deterministic: 8 teams, 6 competitions, 70 matches
npx tsc --noEmit
npx eslint src
npx vitest run
```

```bash
cd <SCRATCH>/pw
node routes.mjs                          # 24 route ids
node shoot-all.mjs <SCRATCH>/shots/<label>
node shot.mjs /competitions/comp-se-city-cup out.png --desktop --full
node audit.mjs <routeId> --mobile        # once W8 lands it: 44px sweep, overflow, tabular-nums, a11y
```

Baseline to diff against: `<SCRATCH>/shots/baseline/` (60 PNGs).

Known harness limits: `/login` cannot be shot while preview-auth is on; `/session/*`, `/summary/*` and
`/tools/**/shared/*` render not-found until W8 adds `NEXT_PUBLIC_DEV_PREVIEW_SESSION`; mobile full-page shots
reach ~8700px and need `--scroll` to read.

---

## 7. Standing decisions (do not relitigate — see charter Appendix A)

- Dark mode is **dropped** for Matchbook; `ThemeToggle` and `ThemeContext` get deleted in P4.
- The mobile scrolling text nav is replaced by a real bottom tab bar (`MatchbookBottomBar`).
- `userScalable: false` is **removed**, with `touch-action: manipulation` on scoring controls.
- No QR code in v1. No framer-motion on converted screens. No second icon library. No emoji.
- Team colour only ever appears as a contained 3px accent bar beside a crest — never a fill or gradient.
- Known app bug to fix during W5: `src/app/match/[id]/page.tsx:112` shows a `Live` badge and tappable
  scoring controls on a **completed** match.
