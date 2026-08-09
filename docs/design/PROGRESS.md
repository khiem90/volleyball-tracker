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
| Gate 1 fix round | W1–W8 (7 parallel agents) | **IN FLIGHT — this round.** Disjoint file slices; re-critique after. W8's slice (`audit.mjs`, design language, this file) is **done** |
| **Re-critique against `benchmark-rubric.md`** | — | **NOT RUN.** The gate is still 64/100 FAIL until it is. Nothing here claims a dimension moved |
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

**What still remains before P2 can start:**

1. The **re-critique has not been run.** Until it scores all ten dimensions ≥8
   with zero §3 hard fails, the programme's verdict is still 64/100 FAIL.
2. `--all` still reports **295 sub-44px targets (desktop) / 225 (mobile)**,
   **263 / 258 numerals without `tabular-nums`**, and **82 / 91 a11y failures**
   across the 23 routes. Almost all of that is un-converted legacy screens, which
   is expected and is P3's work — but it is the baseline P3 has to clear, and
   nobody has looked at it yet. `/dev/kit` itself is at 1 TOUCH (the skip link,
   correctly off-screen), 4 SPACING, 0 everything else.
3. Two mobile routes were overflowing horizontally when this round started; one
   still is. The app is being edited concurrently, so re-measure rather than
   trusting that count.
4. The three out-of-zone-A dependencies in §7.3 of the design language must be
   re-declared inside the Matchbook block **before** P4 deletes zone C, and zone
   B needs an owner.
5. `MbStateBlock` / `MB_STATE_SCALE` landed in `Panel.tsx` from a sibling while
   this round was running and are in §4.2. Anything that lands **after** this
   round is not — re-read the directory before treating §4.2 as exhaustive.

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

`npx tsc --noEmit` clean · `npx eslint src` clean · `npx vitest run` green (205 tests). The seven tsc errors
and two failing tests recorded here previously are fixed; the primitives listed as missing all landed.

`src/app/dev/kit/page.tsx` is a **shared gallery** that up to 7 agents append to concurrently. Re-running an
agent can duplicate its `<section>`, and a mid-write render serves HTTP 500 — if a screenshot or audit run
returns `LOAD FAIL — HTTP 500` on `/dev/kit` while a fix round is in flight, wait and retry rather than
debugging it. De-duplicating the gallery is the audit agent's job.

### What the Gate-1 fix round changed in the harness (W8 slice)

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
node audit.mjs --selftest                        # 15 cases, no dev server needed. Run after editing it
node audit.mjs <routeId|/path> --mobile          # one route
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
| `OVERFLOW` | yes | `body.scrollWidth` vs `clientWidth`, with the widest unclipped culprits named |
| `NUMERALS` | yes | standalone numerals with no `tabular-nums` (digits inside prose are counted separately and never fail) |
| `A11Y` failures | yes | `no-accessible-name`, `not-native`, `name-mismatch` |
| `A11Y` notes | **no** | `title-no-aria-label`, `name-from-title`, `icon-only-no-title` |
| `CONSOLE` | yes | console + page errors, with the documented dev-env noise filtered |
| `MOTION` | yes | inline-style drift across two frames under `prefers-reduced-motion: reduce` |

A `GROUPED` count is not a licence to ignore it: a `tablist (no rule)` line means those tabs abut with
nothing drawn between them, which may still be wrong. It means the 8px *separation* rule does not apply.

Two limits to know before trusting a clean run. `MOTION` samples inline styles and computed
transform/opacity across two frames, so it detects **JS-driven** motion — a CSS keyframe that was never
clamped under `prefers-reduced-motion` passes. And React attaches click handlers by delegation, so a `<div>`
with an `onClick` and no `role`/`tabindex` is invisible to `A11Y` and to `TOUCH` alike.

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
