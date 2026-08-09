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
| P1 primitive kit | W1 | **DONE** — ~30 components, gallery at `/dev/kit` |
| P1 ranking + tests + audit.mjs | W8 | **DONE** — `audit.mjs` + `routes.mjs` + `shot.mjs` are the measurement harness |
| **Gate 1 (regression + critique)** | — | **RUN — 64/100 FAIL.** PASS needs all ten rubric dimensions ≥8 and zero §3 hard fails |
| Gate 1 fix round | W1–W8 (7 parallel agents) | **IN FLIGHT — this round.** Disjoint file slices; re-critique after |
| P2a shell | W2 | not started |
| P2b toast/loading/offline/layout, contexts | W2 + W8 | not started |
| P3a create-flows, competition-detail, live-scoring, volleyball | W3 W4 W5 W7 | not started |
| P3b public share | W6 | not started (gated on W4) |
| P4 legacy deletion | W2 | not started |

### Gate 1 verdict — 64/100, FAIL

An independent critic scored the W1 kit against `benchmark-rubric.md`. The
programme does **not** advance to P2 until the re-critique passes. The fix round
in flight splits the verdict into eight disjoint slices, one agent each, so no
two agents touch the same file. W8's slice is the one this file documents:
`audit.mjs` composite-awareness + a11y checks (F18) and the design language
un-staling (F19).

### What P1 actually delivered

~30 components in `src/components/matchbook/` — the real list, with a "use this
when" line each, is **`docs/design/matchbook-design-language.md` §4.2**. That
inventory now reflects **commit `a4d6876` plus this fix round**; it was written
by reading every file in the directory, not from a plan. Ten of the fifteen §11
GAPs are closed and each now names the file that closed it.

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

`npx tsc --noEmit` clean · `npx eslint src` clean · `npx vitest run` green (205 tests). The seven tsc errors
and two failing tests recorded here previously are fixed; the primitives listed as missing all landed.

`src/app/dev/kit/page.tsx` is a **shared gallery** that up to 7 agents append to concurrently. Re-running an
agent can duplicate its `<section>`, and a mid-write render serves HTTP 500 — if a screenshot or audit run
returns `LOAD FAIL — HTTP 500` on `/dev/kit` while a fix round is in flight, wait and retry rather than
debugging it. De-duplicating the gallery is the audit agent's job.

### What the Gate-1 fix round changed in the harness (W8 slice)

`<SCRATCH>/pw/audit.mjs` gained **composite awareness** and **three a11y checks**, because its spacing
section was about to hand six workstreams a wall of false positives.

- A pair of interactive boxes under 8px apart is now split into `SPACING` (counted) and `GROUPED`
  (informational, printed, never silently dropped). A pair is grouped only when both boxes are cells of one
  composite — `[role=tablist]`, `[role=radiogroup]`, `[role=menu]`, `[role=listbox]`, `.mb-segmented`,
  `.mb-stepper` — or are sibling ruled rows **with a measured rule in the gap band**. Unruled adjacent rows
  stay violations. Grouped pairs print whether a rule was measured, so `tablist (no rule)` is still visible.
- New `A11Y` section: **failures** (`no-accessible-name`, `not-native`, `name-mismatch`) count toward the
  exit code; **notes** (`title-no-aria-label`, `name-from-title`, `icon-only-no-title`) print but do not.
- New flag `--groups` lists grouped pairs individually. Summary table gained `[grp]` and `A11Y` columns.

Measured effect (same runs, so the split is a pure partition of one pair set):

| Sweep | spacing before | spacing after | grouped | a11y failures found |
| --- | --- | --- | --- | --- |
| `/dev/kit` desktop | 65 | **10** | 55 | 0 |
| `--all` desktop (23 routes) | 67 | **41** | 26 | **82** |
| `--all` mobile (23 routes) | 70 | **44** | 26 | **91** |

The `/dev/kit` figure is the one that matters for W2–W7, because the kit is where the composites live: an
84% cut, and the four survivors are all real (three list-header/first-row collisions and the two scoring tap
columns at 1px). The app routes barely move because none of them use `MbTabs`/`MbSegmented` yet — they will,
which is exactly why this had to land before P2.

Also this round: `docs/design/matchbook-design-language.md` was brought into agreement with the tree —
§4.2 rewritten as the real ~30-component inventory, §11 turned from "GAPS TO BUILD" into a status register
where every closed gap names its file, and the false claims in §1.1, §1.3, §1.4, §3.3, §4.1, §4.3, §5.6,
§5.7, §6, §7, §8, §9 and §10 corrected.

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
node routes.mjs                          # 23 route ids (login is BLOCKED locally)
node shoot-all.mjs <SCRATCH>/shots/<label>
node shot.mjs /competitions/comp-se-city-cup out.png --desktop --full
node shot.mjs /dev/kit out.png --mobile  # the primitive gallery

# the measurement sweep — read the docblock at the top of audit.mjs first
node audit.mjs <routeId|/path> --mobile          # one route
node audit.mjs --all --desktop --skip-motion     # every route, no reduced-motion pass
node audit.mjs /dev/kit --desktop --groups       # list the grouped (waived) pairs
node audit.mjs home --viewports --json           # machine-readable, all three sizes
```

Reading the output:

| Section | Counts toward the exit code? | Meaning |
| --- | --- | --- |
| `TOUCH` | yes | real hit area under 44×44, after probing all four corners with `elementFromPoint` |
| `SPACING` | yes | adjacent interactive pairs under 8px that are **not** one composite's cells |
| `GROUPED` | **no** | pairs waived as composite cells. Prints the kind and whether a rule was measured |
| `OVERFLOW` | yes | `body.scrollWidth` vs `clientWidth`, with the widest unclipped culprits named |
| `NUMERALS` | yes | standalone numerals with no `tabular-nums` (digits inside prose are counted separately and never fail) |
| `A11Y` failures | yes | `no-accessible-name`, `not-native`, `name-mismatch` |
| `A11Y` notes | **no** | `title-no-aria-label`, `name-from-title`, `icon-only-no-title` |
| `CONSOLE` | yes | console + page errors, with the documented dev-env noise filtered |
| `MOTION` | yes | inline-style drift across two frames under `prefers-reduced-motion: reduce` |

A `GROUPED` count is not a licence to ignore it: a `tablist (no rule)` line means those tabs abut with
nothing drawn between them, which may still be wrong. It means the 8px *separation* rule does not apply.

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
