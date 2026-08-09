# Matchbook Implementation Charter

**Status:** binding execution plan for the remaining Matchbook conversion.
**Inputs:** `docs/design/matchbook-design-language.md` (the law), `docs/design/benchmark-rubric.md`
(the scoring instrument), the six screen briefs `docs/design/brief-*.md`, and the visual harness in
`…/scratchpad/pw/` (see §5).

**Authority order — settle every argument with this list, top wins:**

1. `matchbook-design-language.md` §1–§10 (the shipped system).
2. `benchmark-rubric.md` §3 hard fails (non-negotiable, they outrank aesthetics).
3. `matchbook-design-language.md` §11 GAPS — a brief may contradict §1–§10 **only** where the contradiction
   is an explicitly listed GAP. GAP-3 (bottom nav), GAP-14 (touch targets / coral contrast) and GAP-15
   (dark mode, print, public shell) are the three places the briefs legitimately overrule the body text.
4. This charter (it resolves brief-vs-brief conflicts; see Appendix A).
5. The individual brief.

Nothing in the briefs' §5 "new primitives" lists is authoritative on naming or API. **§2 of this document is.**
Where a brief names a primitive that §2 renames or absorbs, the §2 name is the only one that may appear in code.

---

## 1. Build order

### 1.1 The eight workstreams

| ID | Workstream | Owns | Gated by |
| --- | --- | --- | --- |
| **W1** | Foundation — tokens, CSS utilities, sprite, primitive kit | `globals.css`, the sprite, `src/components/matchbook/*` primitives | nothing |
| **W2** | Shell, motion & feedback layer | app shell, masthead, nav, toast, loading, root layout, the 7 already-shipped pages | W1 P0+P1 |
| **W3** | Create & configure flows | `/competitions/new`, team/session dialogs, form primitives' call sites | W2 P2a |
| **W4** | Competition detail & bracket views | `/competitions/[id]` + all five format bodies | W2 P2a, W8 P1 |
| **W5** | Live scoring consoles | `/match/[id]`, `/match/guest` | W2 P2a, W8 P1 |
| **W6** | Public share screens | `/session/[shareCode]`, `/summary/[shareCode]`, auth surfaces | **W4 P3a**, W8 P2 |
| **W7** | Volleyball rotation tools | `/tools/volleyball-rotations/**` | W2 P2a |
| **W8** | Data, correctness & verification | contexts, `src/lib/*`, tests, the screenshot harness | nothing |

W8 is not a screen. It exists because five of the six briefs independently demand changes to
`AppContext` / `SessionContext` / `src/lib/*`, and because three of them assume test suites
(`roundRobin`, `singleElimination`, `win2out`, `twoMatchRotation`) that **do not exist** — `src/__tests__/`
contains only the three volleyball suites. Letting each screen workstream edit the contexts is the single
largest merge hazard in the programme; W8 owns them outright.

### 1.2 Phases and gates

```
P0  W1  tokens + CSS utilities + one sprite PR                    (no visual change to shipped screens)
        └─ GATE 0: baseline screenshot diff shows zero regressions on the 6 shipped routes
P1  W1  primitive kit (Dialog, Button, Badge, form, …)      ║ W8  rankTeams, characterisation tests
        └─ GATE 1: every primitive in §2 marked P1 exists, is typed, and has one real consumer
P2a W2  MatchbookShell + MatchbookMasthead + MbEventBar + BottomBar + TopStrip + AccountChip
        └─ GATE 2a: the 6 shipped routes render the new shell with zero inline shell markup
P2b W2  MbPageLoading, MbToast host, MbOfflineBanner,       ║ W8  SessionContext state machine,
        root layout/metadata/viewport, error/loading/       ║     AppContext batching + return
        not-found routes, shipped-page refactor,            ║     contracts, DEV_PREVIEW_SESSION,
        lib/exportCsv.ts extraction                         ║     harness routes
                                                            ║ W6  auth/SessionAuthPanel extraction
P3a ─── PARALLEL, fully disjoint ──────────────────────────────────────────────────────────────
    W3 /competitions/new + dialogs
    W4 /competitions/[id] + BracketRail/CourtCard/StandingsTable/MatchRow   ← publishes to W6
    W5 /match/[id] + /match/guest + MbScoreSide/MbSetStrip/useCourtView     ← publishes to W6
    W7 /tools/volleyball-rotations/** + the court kit
P3b W6  /session/[shareCode] + /summary/[shareCode]         (consumes W4 + W5 + W8 output)
P4  W2  cleanup: delete Navigation, nav-parts, PageLoadingSpinner, ui/dialog, ui/sheet, ui/card,
        ui/badge, ui/button, ui/progress, ui/tabs, ui/theme-toggle, ThemeContext, motion/index dead
        exports, illustrations/*, Header, Background, TeamCard, ui/match-score, ui/color-picker
        └─ GATE 4: `npx eslint src` reports zero unused-import/var warnings; no legacy class survives
```

**Gate rule:** no workstream starts a phase until the gate above it is signed off with evidence
(the §5 command output pasted into the PR). "It looks done" does not open a gate.

### 1.3 What runs fully in parallel

**Truly disjoint after GATE 2a — no shared file, no shared import that either side edits:**

- **W3** (create flows) — `src/app/competitions/new/**`, `src/components/competitions/new/*`,
  `src/components/dialogs/team-form/*`, `QuickAddTeams.tsx`, `CreateSessionDialog.tsx`,
  `src/hooks/useNewCompetitionPage.tsx`.
- **W4** (competition detail) — `src/app/competitions/[id]/**`, `src/components/competition-detail/*`,
  `Bracket.tsx`, `DoubleBracket.tsx`, `Win2OutView.tsx`, `TwoMatchRotationView.tsx`, `Standings.tsx`,
  `bracket-parts/*`, `rotation-views/*`, `dialogs/edit-match/*`, `dialogs/edit-queue/*`.
- **W5** (live scoring) — `src/app/match/**`, `src/components/match/*`, `GuestMatchComplete.tsx`,
  `src/hooks/useMatchPage.ts`, `useGuestQuickMatch.ts`, `useFullscreen.ts`.
- **W7** (volleyball) — `src/app/tools/volleyball-rotations/**`, `src/components/volleyball/**`,
  `src/lib/volleyball/*`, `src/hooks/useFormationEditor.ts`, `useUserFormations.ts`,
  `useVolleyballRotation.ts`.

These four can run as four simultaneous agents/branches. They share **only** read-only imports from
`src/components/matchbook/*` (frozen after GATE 1) and `globals.css` (frozen, W1-only).

**Cannot run in parallel with the above:**

- **W6** is *not* parallel-safe with W4. `/session/[shareCode]` imports `Bracket`, `DoubleBracket`,
  `Win2OutView` and `TwoMatchRotationView` directly (`src/app/session/[shareCode]/page.tsx:9-24`).
  W4 rewrites all four. Running both at once guarantees either a fork or a conflict. **W6 starts at P3b,
  after W4 has landed `BracketRail` + `MbCourtCard` and switched `/session` to them in the same PR.**
- **W2's P2b shipped-page refactor** touches `src/app/{page,teams,quick-match,competitions,summaries,tools}/page.tsx`.
  No screen workstream may touch those files at any time.

### 1.4 Merge hazards — files ≥2 workstreams would otherwise edit

| # | File(s) | Wanted by | Resolution |
| --- | --- | --- | --- |
| H1 | `src/app/globals.css` | all 8 | **W1 exclusive for the whole programme.** The complete union of every brief's CSS requests lands in P0 as one batch (§2.1). Later requests are append-only PRs to W1; no other workstream may open this file. |
| H2 | `public/assets/matchbook/icons/sprite.svg`, `manifest.json` | W2, W4, W5, W6, W7 | **W1 exclusive, one sprite PR in P0** with the union id list (§2.2). Three briefs independently asked for `close` and `chevron-left`; piecemeal additions would collide on the same SVG. |
| H3 | `src/components/matchbook/Panel.tsx`, `types.ts`, `teamStats.ts` | all | **W1 exclusive, append-only.** `PanelEmpty` gains `tone`/`icon`/`onAction`; `TeamMark` gains `size`/`orientation`/`accent`. Existing signatures never change. |
| H4 | `Bracket.tsx`, `DoubleBracket.tsx`, `Win2OutView.tsx`, `TwoMatchRotationView.tsx`, `Standings.tsx`, `bracket-parts/*`, `rotation-views/*` | W4, W6 | **W4 exclusive.** W4's PR must switch `/session/[shareCode]` to the new components in the same commit so the public viewer is never left importing deleted files. W6 may not open them. |
| H5 | `src/context/SessionContext.tsx`, `AppContext.tsx`, `AuthContext.tsx` | W3, W4, W5, W6 | **W8 exclusive.** All four briefs want behaviour changes here (pre-load flash, `createCompetition` return contract, `addTeams` batching, `canEdit`). W8 lands them in P2b behind tests; screens consume the new contracts. |
| H6 | `src/app/layout.tsx` (viewport, metadata, fonts, `<html>` class) | W2, W5, W6 | **W2 exclusive.** `viewport-fit: cover` + removal of `maximumScale`/`userScalable` flips behaviour on every screen at once and must land in one commit with every fixed/sticky element padded (shell brief R5). |
| H7 | `src/components/shared/PageLoadingSpinner.tsx`, `src/components/ui/dialog.tsx`, `ui/sheet.tsx`, `ui/input.tsx` | all | **Nobody restyles them.** New primitives ship alongside; each workstream migrates *its own* call sites to `MbDialog`/`MbSheet`/`MbTextInput`/`MbPageLoading`. W2 deletes the originals in P4, only after the last call site is gone. |
| H8 | `src/components/shared/DeleteConfirmDialog.tsx` | W2 (teams/compete), W6 (summary), W7 (formations) | **W1 rewires it once in P1** to render `MbConfirm` internally. Its props do not change, so the 5 call sites are untouched. |
| H9 | `src/components/GlobalUndoToast.tsx`, `UndoToast.tsx`, `src/lib/undo.ts` | W2, W5 | **W2 exclusive, skin only.** `pushUndo`/`performUndo`/`clearUndo`, `MAX_UNDO_STACK_SIZE`, the Ctrl+Z listener and the 3-step restore order are byte-identical after the change. W5 consumes `useUndo()` unchanged. |
| H10 | CSV exporter inside `src/app/summaries/page.tsx` | W2, W6 | **W2 extracts it to `src/lib/exportCsv.ts` in P2b.** W6 imports it; W6 never opens `summaries/page.tsx`. |
| H11 | `src/components/auth/*` (`SessionAuth`, `EmailAuthForm`, `AdminTokenForm`, `GoogleSignInButton`) | W3 (nested in `CreateSessionDialog`), W6 (session sign-in) | **W6 exclusive.** W6 delivers `auth/SessionAuthPanel.tsx` — the form body with **no dialog of its own** — as a P2b deliverable. `CreateSessionDialog` (W3) renders it as a *step*, killing the nested-Radix-dialog problem (create-flows §6). W6 also deletes the dead `showAuth` usage in `Navigation.tsx` — coordinate that one-line change with W2. |
| H12 | `src/hooks/useFullscreen.ts` | W5, W7 | **W5 exclusive.** W5 folds it into `useCourtView` (P3a); W7 consumes `useCourtView` for its fullscreen court and does not touch `useFullscreen`. |
| H13 | `src/app/tools/page.tsx` | W2 (shipped-page refactor / `MbChoiceCard`), W7 (entry point) | **W2 exclusive.** W7 only reads it for idiom. |
| H14 | Format label/blurb tables — `useNewCompetitionPage.tsx:39-80` and `useMatchbookCompete.ts:7-13` | W1, W2, W3, W4 | **W1 owns `src/components/matchbook/formatMeta.ts`** (P1). W2 repoints `useMatchbookCompete`; W3 repoints the wizard; W4 imports it. Nobody writes a third table. |
| H15 | `…/scratchpad/pw/routes.mjs`, `shot.mjs`, `gen-fixture.mts` | all | **W8 exclusive.** New route ids (editor route, populated share routes, wizard steps) are requested from W8. `pw/` is shared with other sessions — W8 re-runs `gen-fixture.mts` before every baseline. |

---

## 2. Canonical primitive set

One name per concept. If a brief used a different name, it is listed in the *Source* column and that name
is **retired** — see Appendix A for the retirement map.

### 2.1 Tokens, utilities and CSS classes — `src/app/globals.css` (W1, P0)

All of these go into the Matchbook block at the top of the file. None of them may be duplicated into
`public/assets/matchbook/tokens.css` (that file is preview-only — design language §0 Trap 1).

| Addition | Definition | Source |
| --- | --- | --- |
| Motion tokens | `--mb-dur-fast:120ms; --mb-dur-base:180ms; --mb-dur-slow:280ms; --mb-ease-out:cubic-bezier(.2,.8,.3,1); --mb-ease-in-out:cubic-bezier(.4,0,.2,1); --mb-stagger:40ms` | GAP-11 |
| `.mb-enter`, `.mb-stagger-1..6` | opacity 0→1 + `translateY(6px)→0` at `--mb-dur-slow --mb-ease-out`; stagger capped at 6, **grid panels only, never table rows** | GAP-11, shell R8 |
| Focus | `--mb-focus: var(--mb-coral)`; `.matchbook-surface :focus-visible { outline:2px solid var(--mb-focus); outline-offset:2px }`. The legacy global red outline stays scoped to legacy screens | GAP-12 |
| Tints | `--mb-tint-1:rgba(7,50,77,.04); --mb-tint-2:rgba(7,50,77,.06); --mb-tint-3:rgba(7,50,77,.12); --mb-band:rgba(7,50,77,.05); --mb-rule-on-navy:rgba(255,250,241,.25); --mb-tint-on-navy:rgba(255,250,241,.06); --mb-panel-shadow:0 8px 22px rgba(57,41,23,.08)` | GAP-13 |
| Contrast-safe variants | `--mb-coral-deep:#c9351f` (**button fill only** — 5.2:1 with white, replaces the 3.62:1 debt), `--mb-gold-ink:#8a5c00` (gold as text on paper) | GAP-13/14 |
| Safe area | `--mb-safe-top: env(safe-area-inset-top,0px)`, `--mb-safe-bottom: env(safe-area-inset-bottom,0px)`, `.mb-safe-top`, `.mb-safe-bottom` | GAP-3 |
| Touch | `@media (pointer:coarse){ .mb-btn,.mb-nav-item,.mb-tab,.mb-panel-link{min-height:44px} }`; `.mb-btn-lg`; `touch-action:manipulation` on `.mb-btn`, `.mb-nav-item`, `.mb-console-column` | GAP-14, shell R3 |
| Recipe promotions | `.mb-row-hover`, `.mb-rail` (`--mb-rail-color`), `.mb-tile`, `.mb-icon-disc`, `.mb-meter` | GAP-10 |
| Dialog family | `.mb-dialog`, `.mb-dialog-overlay` (`rgba(7,50,77,.55)`, **no blur**), `.mb-dialog-head`, `.mb-dialog-foot`, `.mb-sheet` | GAP-1 |
| `.mb-toast` | paper-bright, 1.5px navy border, 4px **left** border in the tone colour | GAP-2 |
| `.mb-badge[data-tone][data-variant]` | text / framed / solid | GAP-4 |
| `.mb-tabs`, `.mb-tab[data-active="true"]` | coral 3px **bottom** border, `min-height:44px` | GAP-5 |
| Form controls | `.mb-field`, `.mb-field-hint`, `.mb-field-error`, `.mb-textarea`, `.mb-check`, `.mb-radio`, `.mb-switch`, `.mb-stepper`, `.mb-swatch`, `.mb-segmented` | GAP-6 |
| Console | `.mb-console`, `.mb-console-column`, `.mb-console-column[data-leading="true"]`, `.mb-numeral` (+`--court`), `.mb-rule-vertical`, `.mb-action-bar`, `.mb-notch-coral` | GAP-7 |
| `.mb-skeleton` | `rgba(7,50,77,.08)`, radius 2px, **static — no shimmer** (a shimmer is a gradient, banned) | GAP-8 |
| Editorial | `.mb-stamp-final`, `.mb-code-chip`, `.mb-banner[data-tone]`, `.mb-scoreline` (`1fr auto 1fr` + `min-width:0` guards), `.mb-day-head` | public-share §5.3 |
| Court | `--mb-court-fill`, `--mb-court-line`, `--mb-court-line-strong`, `--mb-court-accent` | tools §5.17 |
| `.mb-skip-link` | visually hidden until focused, targets `#mb-main` | shell §5.16 |
| Print | `@media print` block + `.mb-print-hide`: hide chrome and actions, one column, black on white, expand capped ledgers | GAP-15.2 |

**New display step** (extends design language §2.1, W1 must add it to that table):
`display/score-2xl` — `clamp(4rem, 18vw, 9rem)`, 700, `tabular-nums`, used only by `MbScoreNumeral size="court"`.

### 2.2 Sprite additions — `public/assets/matchbook/icons/sprite.svg` + `manifest.json` (W1, P0)

One PR, 25 new ids, drawn at the existing hairline weight and optical box (rubric ref #9 — the constraint
is what makes the set read as a system):

```
close  chevron-left  minus  undo  refresh  expand  collapse  more  logout  wifi-off
trash  copy  link  key  eye  eye-off  crown  shield  trophy  streak
queue  grid  edit  drag  arrow-move
```

`qr` is **not** added — `MbQrCode` is cut (Appendix A, D-11). The design language §6 id list must be
updated from 37 to 62 ids in the same PR.

### 2.3 React primitives — `src/components/matchbook/`

Legend: **P** = phase, **O** = owning workstream. Every entry is exported from the file named and
imported by path (no barrel — the existing kit has none).

#### Overlays and feedback

| Name | File | API | Consumers | Source | O / P |
| --- | --- | --- | --- | --- | --- |
| `MbDialog`, `MbDialogBody`, `MbDialogFooter` | `Dialog.tsx` | `{ open, onOpenChange(open), title, icon?, kicker?, description?, tone?: "paper"\|"navy"\|"danger", size?: "sm"\|"md"\|"lg" (26/32/42rem), mobile?: "sheet"\|"center" = "sheet", dismissible? = true, initialFocus?, children }` — wraps `@radix-ui/react-dialog` (focus trap, Escape, `aria-labelledby`); owns scroll-lock, `max-h` + `overscroll-contain` body, 44px close target, safe-area padding, `dvh` not `vh` | **19 call sites app-wide** | GAP-1, create 5.1, comp P1, live, tools 1 | W1 / P1 |
| `MbConfirm` | `Confirm.tsx` | `{ open, onOpenChange, title, verb, subject?, body?, destructive? = true, confirmLabel?, loading?, onConfirm }` — built on `MbDialog tone="danger"` | `DeleteConfirmDialog` (rewired), W7 (replaces `window.confirm`), W4, W6 | tools 3 | W1 / P1 |
| `MbSheet` | `Sheet.tsx` | `{ open, onOpenChange, title, side? = "bottom", snapPoints?: number[], children }` — drag-to-expand deferred; discrete heights only in v1 | `MatchbookBottomBar` "More", W6 mobile view-all, W7 tool rail | shell 10, tools 2 | W1 / P1 |
| `MbToast` + `useToast()` + `ToastHost` | `Toast.tsx` | `toast({ tone: "info"\|"success"\|"warning"\|"danger", icon?, message, action?: {label,onClick}, duration? = 5000, slot?: "float"\|"rail" })`; host bottom-centre above the bottom bar, `role="status"` / `"alert"` for danger | `GlobalUndoToast`, copy confirms, delete failures | GAP-2, shell 8, live | W2 / P2b |
| `MbNotice` | `Notice.tsx` | `{ tone: "info"\|"warn"\|"danger"\|"success", icon?, title?, children }` — inline hairline box, no fill beyond `rgba(tone,.06)` | wizard validation, offline copy, permission copy | create 5.8 | W1 / P1 |
| `MbEmptyState` | `EmptyState.tsx` | `{ tone: "empty"\|"notfound"\|"error"\|"offline"\|"denied"\|"unconfigured", icon?, title, body?, actions?: Action[] }` — page-level state object (masthead + rule + copy + action) | every route's not-found/error/offline | shell 7 | W1 / P1 |
| `PanelEmpty` **(extended)** | `Panel.tsx` | existing props **+** `tone?` (same union), `icon?`, `onAction?` | every panel that can be empty | GAP-9, tools 5 | W1 / P1 |
| `MbSkeleton` | `Skeleton.tsx` | `{ w?, h?, lines?, radius? }` — static block, must occupy final geometry | everywhere | GAP-8 | W1 / P1 |
| `MbPageLoading` | `Loading.tsx` | `{ variant?: "console"\|"public"\|"focus", active?: string, panels?: number }` — renders the real shell + skeleton grid; **never** the legacy `<Navigation/>` | every gated route | GAP-8, shell 6 | W2 / P2b |
| `MbOfflineBanner` + `useOnlineStatus()` | `Offline.tsx`, `src/hooks/useOnlineStatus.ts` | `useOnlineStatus(): boolean`; banner enters once, never re-animates, **must not shift layout** | shell (global), W6 | shell 9 | W2 / P2b |

#### Controls

| Name | File | API | Consumers | Source | O / P |
| --- | --- | --- | --- | --- | --- |
| `MbButton` | `Button.tsx` | `{ variant: "coral"\|"navy"\|"outline"\|"outline-navy", size?: "sm"\|"md"\|"lg"\|"touch", icon?, iconRight?, loading?, fullWidth?, ...button }` — emits exactly `.mb-btn` + one variant class (design language §10); `size="touch"` and coarse pointers force `min-height:44px` | every screen | live-scoring | W1 / P1 |
| `MbIconButton` | `IconButton.tsx` | `{ icon, label (required), size?: "md"\|"lg", tone? }` — renders `title` + `aria-label` from `label`, guarantees a 44×44 hit box | every screen | shell 11, GAP-14 | W1 / P1 |
| `MbBadge` | `Badge.tsx` | `{ tone: "live"\|"draft"\|"final"\|"win"\|"loss"\|"neutral"\|"teal"\|"guest"\|"warn", variant?: "text"\|"framed"\|"solid", size?: "sm"\|"md", children }` — `tone="live"` renders `.mb-live-dot` + the word; `solid` only permitted for `live`/`final` | Compete, History, Teams, W4, W5, W6 | GAP-4, comp P3 (absorbs `MbChip`) | W1 / P1 |
| `MbTabs` | `Tabs.tsx` | `{ value, onValueChange, items: {value,label,icon?,count?}[], urlKey?: string }` — hand-rolled `role="tablist"` + roving tabindex; **not** `@radix-ui/react-tabs` (deleted in P4) | W4 (format views), W5 (set/mode), W6 (mobile sections), W7 (designer) | GAP-5, comp P2 | W1 / P1 |
| `MbSegmented` | `Segmented.tsx` | `{ value, onChange, name, options: {value,label,icon?}[], columns?: {base,sm}, size?: "sm"\|"md" (48px rows), fullWidth? }` — `role="radiogroup"`, arrow-key roving tabindex, **wraps instead of squeezing** | wizard ×4, W5 scoring mode, W7 serving/receiving | create 5.3 (absorbs tools `MbSegment`) | W1 / P1 |
| `MbField`, `MbTextInput`, `MbTextArea`, `MbSelect` | `form.tsx` | `MbField {label, hint?, error?, required?, htmlFor}` owns the `.mb-kicker` label, hint, error and wires `aria-describedby`/`aria-invalid`. Inputs are 48px with `font-size:16px` on mobile (preserve `text-base md:text-sm` — prevents iOS zoom) | every typed input in the app | create 5.2, tools 9, GAP-6 | W1 / P1 |
| `MbNumberStepper` | `form.tsx` | `{ value, onChange, min, max, step?, wrap?, prefix?, suffix?, label, size?: "sm"\|"lg" }` — 44/56px `−`/`+`, display-face `tabular-nums` figure, clamps on change **and on blur** (fixes `Number("")→0`), `aria-valuenow/min/max` | wizard points, quick-add count, W7 R1–R6 (`wrap prefix="R"`), W4 round picker | create 5.4 (absorbs tools `MbStepper`) | W1 / P1 |
| `MbToggle` | `form.tsx` | `{ checked, onChange, label, hint? }` — the whole 44px row is the hit target; squared navy track, paper knob | wizard `allowTies`, W7 libero | create 5.5 | W1 / P1 |
| `MbToggleChip` | `form.tsx` | `{ icon?, pressed, onPressedChange, children }` — `aria-pressed`, on/off carried by a **shape** mark as well as colour | W7 overlaps/arrows, W4 display options, History filters | tools 8 | W1 / P1 |
| `MbSwatchPicker` | `form.tsx` | `{ value, onChange, palette?: "matchbook"\|string[], allowCustom? }` — roving-tabindex radiogroup, 44px squares (4px radius, **not** circles), selected = 2px navy ring + inset check, hex readout | `TeamForm`, `QuickAddTeams` | create 5.6 | W1 / P1 |
| `MbTagInput` | `form.tsx` | `{ value: string[], onChange, max?, placeholder? }` — hairline chips with a 44px remove | W7 formations, W3 competition metadata | tools 10 | W1 / P1 |
| `MbCopyField` | `CopyField.tsx` | `{ label, value, secret?, revealable?, help?, onCopied? }` — `navigator.clipboard` → `document.execCommand` → select-on-focus + "press Ctrl+C" hint; **always** surfaces failure; `aria-live` confirmation; 44px button | `ShareSession` ×2, `CreateSessionDialog` ×2, W6, W7 share | create 5.7, share N3, tools 11 | W1 / P1 |
| `MbShareAction` | `ShareAction.tsx` | `{ url, title, text, variant: "button"\|"icon" }` — one implementation of native-share → copy → toast | every share affordance | share N4 | W1 / P1 |
| `MbMenu` | `Menu.tsx` | `{ trigger, items: {label,icon?,tone?,onSelect,disabled?}[] }` — overflow for >2 actions; 44px rows | W4, W6, Teams, History | comp P13 | W1 / P1 |
| `MbActionBar` | `ActionBar.tsx` | `{ status?: ReactNode, secondary?: Action, primary: Action, sticky? = true }` — bottom-anchored, `border-t-[1.5px] border-mb-navy`, `.mb-safe-bottom`; exports `MB_ACTION_BAR_H` so pages can pad | wizard, W4 draft console, W5 console, W7 editor | create 5.12 + live `MbActionRail` | W1 / P1 |

#### Data display

| Name | File | API | Consumers | Source | O / P |
| --- | --- | --- | --- | --- | --- |
| `MbStat` | `Stat.tsx` | `{ icon?, label, value, sub?, tone?, size?: "sm"\|"md" }` — replaces `StatusStat` / `SummaryStat` / `ProfileStat` | every console screen | GAP-9, comp P8 | W1 / P1 |
| `MbMeter` | `Meter.tsx` | `{ value: 0..100, label?, color? }` — 4px rule track + fill, **not** a rounded `<Progress>` | Compete, W4, W6 | GAP-10, comp P12 | W1 / P1 |
| `MbScoreNumeral` | `ScoreNumeral.tsx` | `{ value, size: "compact"\|"console"\|"court", tone?: "ink"\|"paper", flash?: "up"\|"down"\|null, ariaLabel? }` — Oswald, `tabular-nums`, fixed `min-width` per size, cross-fade + edge flash only; **never translates or scales** | W4, W5, W6, home | live-scoring | W1 / P1 |
| `MbScoreboardHero` | `ScoreboardHero.tsx` | `{ home, away, homeScore, awayScore, homeAccent?, awayAccent?, series?: {game,of,homeWins,awayWins}, status: "live"\|"final"\|"pending", size?: "hero"\|"compact", href?, onSelect? }` — **grid** `1fr auto 1fr` with `min-width:0` name cells (never flex) | W6 both routes, W4 featured match, home | share N2 | W1 / P1 |
| `MbFinalStamp` | `FinalStamp.tsx` | `{ label? = "Final", rotate? = -6 }` — rotated coral hairline stamp | W4, W6, History | share N6 | W1 / P1 |
| `MbLiveStatus` | `LiveStatus.tsx` | `{ status: "live"\|"reconnecting"\|"offline"\|"ended"\|"idle", secondsAgo?, tone?: "navy"\|"paper", onRetry? }` — presentational only | W4, W5 shared mode, W6 | share N1 | W1 / P1 |
| `MbDangerZone` | `DangerZone.tsx` | `{ title, description, action: {label,onClick,loading} }` — bottom-of-page destructive block, never adjacent to a frequent action | Teams, W4, W6, W7 | share N7 | W1 / P1 |
| `TeamMark` **(extended)** | `Panel.tsx` | existing props **+** `size?: "sm"\|"md"\|"lg"`, `orientation?: "horizontal"\|"vertical"`, `accent?: string` (the team colour as a 3px bar only — never a fill) | W5 console, W6, everywhere | live-scoring (absorbs `MbTeamIdentity`) | W1 / P1 |
| `MbChoiceCard` | `ChoiceCard.tsx` | `{ icon, accent?, title, description, kicker?, selected, onSelect, disabledReason? }` | wizard format grid, `tools/page.tsx` tiles | create 5.11 | W1 / P1 |
| `MbStepRail` | `StepRail.tsx` | `{ steps: {id,label,value?}[], current, onNavigate, orientation? }` — semantic `<ol>`, `aria-current="step"`, completed steps clickable | wizard, `CreateSessionDialog` | create 5.9 | W1 / P1 |
| `MbSelectList` / `MbSelectRow` | `SelectList.tsx` | `{ items, getKey, selected: Set, onToggle, onSelectAll?, search?, onSearchChange?, columns?, renderPrimary, emptyMessage, windowed? }` — windows above ~60 rows; rows are memoised and take a `Set`, never `Array.includes` | wizard teams step, `EditQueueDialog`, W4 roster | create 5.10 | W1 / P1 |
| `MbReorderList` | `ReorderList.tsx` | `{ items, onReorder, renderItem }` — pointer-events based (works on touch), 44px handles, visible `↑`/`↓` buttons, `Alt+↑/↓`, `aria-live` announcements | queue editor, W7 formation order | comp P11 | W1 / P1 |
| `MbStandingsTable` | `StandingsTable.tsx` | `{ rows: MbStandingLine[], compact?, highlightTeamId?, columns?, caption }` — reconciles `Standings.tsx` with the shipped table in `competitions/page.tsx:141-183`; sticky `thead`; `Pts` never hidden on mobile | W4, W6 ×2, Compete | comp P6 | W4 / P3a |
| `MbMatchRow` | `MatchRow.tsx` | `{ label?, home, away, homeScore?, awayScore?, status, variant: "schedule"\|"result"\|"live", onSelect?, onEdit? }` — always a real `<button>` when interactive | W4, W6, Compete, History, Quick Match | comp P7 | W4 / P3a |
| `BracketRail`, `MbBracketCell`, `BracketConnectors` | `BracketRail.tsx` | `{ rounds: MbBracketRound[], variant: "single"\|"double", champion?, onSelect?, onEdit? }`; cell `{home, away, homeScore, awayScore, homeWon, awayWon, live, pending, bye, tbd}` — connectors computed **arithmetically** (round *r* has `2^(R-r)` cells; cell *i* centres between children `2i`,`2i+1`), never measured from the DOM, never animated | W4 ×2 formats, W6 | comp P4 | W4 / P3a |
| `MbCourtCard` | `CourtCard.tsx` | `{ court, venue, home, away, homeScore, awayScore, status, streak?, crowns?, canEdit, canPlay, instantWin, onPlay, onEdit, onInstantWin }` — venue word comes from `useTerminology`, never hardcoded "Court" | W4 ×2 rotation formats, W6 | comp P5 | W4 / P3a |
| `MbScoreSide`, `MbSetStrip` | `ScoreSide.tsx` | `MbScoreSide { team, score, side, serving?, leading?, canEdit, onScore, onAdjust, viewOnly? }` — full-bleed tap column, `select-none`, press = tint not scale; `MbSetStrip { sets, current }` | W5 both routes, W6 read-only variant | GAP-7 | W5 / P3a |
| `MbCourt`, `MbPlayerToken`, `MbRoleChip`, `MbConstraintLine`, `MbCourtArrow` | `court/*.tsx` | `MbCourt { viewBox, mode, rotation, showZoneNumerals, showAttackLine, variant: "view"\|"edit", overlay, onBackgroundClick }`; `MbPlayerToken { role, zone, row, state, size }` with a ≥52px transparent hit circle. **Preserve the normalised 0..1 coordinate space exactly**; change only the rendered viewBox and re-derive the arrow-shorten constants from `NODE_RADIUS` | W7 ×3 routes; W4 rotation views may adopt later | tools 14–16 | W7 / P3a |

#### Shell (all W2 / P2a unless noted)

| Name | File | API | Source |
| --- | --- | --- | --- |
| `MatchbookShell` | `AppShell.tsx` | `{ variant?: "console"\|"public"\|"focus", active?, masthead?, cta?, children }`. `console` = sidebar + bottom bar + masthead. `public` = no sidebar/bottom bar, brand lockup header, centred `max-w-[1100px]` (**the sanctioned exception to "no max-w"**, resolves GAP-15.3). `focus` = no chrome except a 44px back/exit control; must **not** wrap the fullscreen target (shell R4) | shell 1 (absorbs `MbConsoleShell`) |
| `MatchbookMasthead` | `Masthead.tsx` | `{ title: ReactNode, badge?: {value,label}\|{lines:[string,string]}, dateLine?, subLine?, status?: ReactNode, actions?: Action[] (max 2, ≤1 coral) }` — carries `suppressHydrationWarning` internally so the six callers cannot forget | shell 4, GAP-9, comp P9 (`EventMasthead`) |
| `MbEventBar` | `EventBar.tsx` | `{ back?: {href\|onClick,label}, title, kicker?, status?: ReactNode, actions?: ReactNode, sticky?, tone?: "navy" }` — the navy strip. Used by `variant="focus"` (scoring) and `variant="public"` (share). Distinct from the editorial paper masthead | live-scoring console masthead + public-share `EventMasthead` |
| `MatchbookBottomBar` | `BottomBar.tsx` | `{ active? }` — 5 primary routes + "More" (`MbSheet`); fixed bottom, `border-top:1.5px solid navy`, `.mb-safe-bottom`, items `min-h-[44px]`, active = coral icon + coral 2px **top** border + `aria-current="page"`; `contain: layout paint` | GAP-3, shell 2 |
| `MatchbookTopStrip` | `TopStrip.tsx` | `{ title, back?, action? }` — mobile identity strip replacing the scrolling nav in `MobileBar` | shell 3 |
| `MbAccountChip` | `AccountChip.tsx` | `{ variant?: "masthead"\|"rail"\|"compact" }` — owns email, sign-in, sign-out | shell 5 |

#### Data / logic modules

| Name | File | Purpose | O / P |
| --- | --- | --- | --- |
| `FORMAT_META` | `matchbook/formatMeta.ts` | `Record<CompetitionType, {label,blurb,icon,accent,minTeams,supports:{series,courts,scoringMode,standingsPoints}}>` — the single source for format labels, blurbs and **which config controls render**. Kills the three predicates in `NameStep` + the fourth in `AdvancedSettingsPanel` and the partial duplicate in `useMatchbookCompete.ts:7-13` | W1 / P1 |
| `rankTeams()` | `src/lib/standings.ts` | One ranking function for `useSessionPage`, `useSummaryPage`, `Standings.tsx` and `lib/roundRobin`. Live and final standings must not disagree | W8 / P1 |
| `pluralise()` | `src/lib/text.ts` | Kills `venueName + "s"` | W1 / P1 |
| `exportMatchesCsv()` | `src/lib/exportCsv.ts` | Extracted from `summaries/page.tsx`; reused by W6 | W2 / P2b |
| `useMbReducedMotion()` | `matchbook/useMbReducedMotion.ts` | `matchMedia("(prefers-reduced-motion: reduce)")` — **no framer-motion dependency** (design language §9 bans framer on converted screens) | W1 / P1 |
| `useOnlineStatus()` | `src/hooks/useOnlineStatus.ts` | `navigator.onLine` + `online`/`offline` listeners | W2 / P2b |
| `useLiveConnection()` | `src/hooks/useLiveConnection.ts` | `({isSubscribed,lastSnapshotAt,fromCache,error}) → {status, secondsAgo, retry()}` — feeds `MbLiveStatus` | W8 / P2b |
| `useCourtView()` | `src/hooks/useCourtView.ts` | Folds `useFullscreen` + the orientation logic duplicated in `useMatchPage.ts:39-71` and `match/guest/page.tsx:53-86`; adds the in-page fallback (iOS has no element fullscreen) and surfaces failures instead of `console.log` | W5 / P3a |
| `useScoreHistory()` | `src/hooks/useScoreHistory.ts` | One correct undo stack — updater-form only, optionally persisted to `sessionStorage` keyed by match id | W5 / P3a |
| `useMatchbookCompetitionDetail` | `matchbook/useMatchbookCompetitionDetail.ts` | Crests, standings, bracket rounds, courts/queue/leaderboard, terminology. `useCompetitionDetailPage.ts` keeps the mutations **unchanged** | W4 / P3a |
| `useMatchbookMatch` | `matchbook/useMatchbookMatch.ts` | Console view-model. `handleCompleteMatch` (`useMatchPage.ts:175-453`) is a **black box** — change what calls it, never its internals | W5 / P3a |
| `useMatchbookSession`, `useMatchbookSummary` | `matchbook/useMatchbookSession.ts`, `useMatchbookSummary.ts` | Shaping for the two public routes; route files contain layout only | W6 / P3b |
| `useMatchbookNewCompetition` | `matchbook/useMatchbookNewCompetition.ts` | Wizard view-model over `useNewCompetitionPage` | W3 / P3a |
| `useMatchbookRotations` | `matchbook/useMatchbookRotations.ts` | Designer + archive shaping | W7 / P3a |

---

## 3. Per-screen work packets

Each packet lists **exclusively owned files** (nobody else opens them), acceptance criteria beyond the
global invariants in §4, and the harness route ids to shoot. The full DoD in each brief's §7 still applies —
these are the additions and the decisions.

---

### W1 — Foundation (tokens, sprite, primitive kit)

**Owns exclusively**
```
src/app/globals.css                                  (whole programme)
public/assets/matchbook/icons/sprite.svg
public/assets/matchbook/manifest.json
public/assets/matchbook/README.md
public/assets/matchbook/tokens.css
src/components/matchbook/Panel.tsx  types.ts  teamStats.ts        (append-only)
src/components/matchbook/{Dialog,Confirm,Sheet,Button,IconButton,Badge,Tabs,Segmented,form,
  Notice,EmptyState,Skeleton,CopyField,ShareAction,Stat,Meter,Menu,SelectList,ReorderList,
  ChoiceCard,StepRail,ActionBar,FinalStamp,DangerZone,LiveStatus,ScoreNumeral,ScoreboardHero}.tsx
src/components/matchbook/formatMeta.ts  useMbReducedMotion.ts
src/components/shared/DeleteConfirmDialog.tsx        (rewire to MbConfirm, props unchanged)
src/lib/text.ts
docs/design/matchbook-design-language.md             (updates §2.1, §4, §6, §11 as GAPs close)
```

**Acceptance**
1. P0 changes **zero pixels** on the six shipped routes — proven by a screenshot diff against the
   `baseline/` set (the `useMatchbookDashboard` dateline is the one permitted diff).
2. Every class in §2.1 exists and is referenced by at least one primitive; `tokens.css` is **not** touched
   by anything the app loads.
3. `.mb-btn-coral` uses `--mb-coral-deep`; a contrast check reports ≥4.5:1 white-on-fill.
4. No primitive imports `lucide-react`, `@heroicons/react`, or `framer-motion`.
5. Every primitive with an icon-only control emits `title` **and** `aria-label`.
6. `MbDialog` renders nothing (no portal) when its content resolves to null — `ShareSession` returns null
   outside shared mode and must not mount a portal.
7. Design language §2.1 gains `display/score-2xl`; §6 id list goes 37 → 62; GAP-1, 2, 4, 5, 6, 8, 10, 11,
   12, 13, 14 are marked resolved with a pointer to the file that closed them.

**Shots** — none of its own. Runs the full `shoot-all` sweep at GATE 0 and GATE 1 as a regression guard.

---

### W2 — Shell, motion & feedback

**Owns exclusively**
```
src/components/matchbook/{AppShell,Masthead,EventBar,BottomBar,TopStrip,AccountChip,Offline,Toast,Loading}.tsx
src/components/matchbook/Sidebar.tsx  MobileBar.tsx
src/components/matchbook/{panels,teamPanels}.tsx
src/components/matchbook/useMatchbook{Dashboard,Teams,Compete,History,QuickMatch}.ts
src/hooks/useOnlineStatus.ts
src/app/layout.tsx  loading.tsx  error.tsx  global-error.tsx  not-found.tsx
src/app/{page,teams/page,quick-match/page,competitions/page,summaries/page,tools/page,login/page}.tsx
src/components/Providers.tsx  Navigation.tsx  nav-parts/*  Header.tsx  Background.tsx  TeamCard.tsx
src/components/shared/{PageLoadingSpinner,DecorativeBackground,EmptyState,PageHeader}.tsx
src/components/illustrations/*   src/components/motion/index.tsx
src/components/GlobalUndoToast.tsx  UndoToast.tsx
src/components/ui/*  (deletion only, in P4)   src/context/ThemeContext.tsx
src/lib/exportCsv.ts   public/manifest.json   next.config.ts
```

**Decisions taken here (do not relitigate)**
- **Dark mode is dropped for Matchbook.** Delete `ThemeToggle` from `UserMenu.tsx:30` and
  `MobileNav.tsx:200`; set `<html lang="en" className="light">` so any surviving shadcn dialog cannot render
  dark on cream; delete `ThemeContext` + the `.dark` block in P4 (GAP-15.1 resolved).
- **`maximumScale` / `userScalable` are removed** and `viewportFit: "cover"` is set, in one commit that also
  pads every fixed/sticky element. Mitigation for the scoring console (live-scoring R11 / shell R3):
  `touch-action: manipulation` on `.mb-btn`, `.mb-nav-item`, `.mb-console-column`.
- **`MatchbookMobileBar` is replaced** by `MatchbookTopStrip` + `MatchbookBottomBar` (GAP-3). Design
  language §3.1 and §8 must be rewritten in the same PR.
- **`PageLoadingSpinner` survives until P4.** Converted routes use `MbPageLoading`; unconverted routes keep
  the old spinner so they don't flash cream before rendering warm-red (shell R2).

**Acceptance**
1. `MatchbookShell` has three variants; the six shipped routes contain **zero** inline shell markup.
2. No route renders a Matchbook surface and `<Navigation/>` at any point in its lifecycle, **including
   during loading**.
3. Every nav/shell control measures ≥44×44 at 390×844 — asserted by a script that reads
   `getBoundingClientRect()` for every `nav a`, `nav button`, `.mb-btn` in the shell.
4. `nav.scrollWidth === nav.clientWidth` at 320px; `document.body.scrollWidth === window.innerWidth` at
   320/360/390/414px on all routes.
5. Skip link is the first focusable node and lands on `#mb-main`; focus moves to `#mb-main` on route change;
   the route title is announced through a visually-hidden `aria-live="polite"` region.
6. `prefers-reduced-motion: reduce` produces **zero** movement app-wide — verified by sampling inline
   `style` on animated nodes across two frames.
7. No duration, easing or delay literal appears in any converted `.tsx`; they all come from §2.1 tokens.
8. `MbToast` replaces `UndoToast` **visually only**: Ctrl+Z, the 5-deep stack and the 3-step restore order
   are unchanged and still pass their tests.
9. `themeColor: "#07324d"`, `background_color: "#f7f0e4"`, `orientation: "any"`; PWA icons regenerated from
   `brand/crest.svg`.
10. P4: the deletion list in shell §7.26 is empty on disk and `npx eslint src` reports zero unused warnings.

**Shots** — `home teams quick-match competitions history tools` at desktop + mobile, plus `--with-empty`,
plus a full `shoot-all` sweep to prove no route regressed. `/login` cannot be shot by the harness
(dev-preview auth redirects it); verify it manually with `NEXT_PUBLIC_DEV_PREVIEW_AUTH` removed.

---

### W3 — Create & configure flows

**Owns exclusively**
```
src/app/competitions/new/page.tsx
src/components/competitions/new/*        (FormatStep, TeamsStep, NameStep, StepIndicator, AdvancedSettingsPanel)
src/hooks/useNewCompetitionPage.tsx
src/components/dialogs/team-form/*
src/components/QuickAddTeams.tsx
src/components/CreateSessionDialog.tsx
src/components/matchbook/useMatchbookNewCompetition.ts
src/components/ui/input.tsx  color-picker.tsx          (migrate call sites; W2 deletes in P4)
```

**Consumes, must not edit:** `auth/SessionAuthPanel.tsx` (W6, P2b), `ShareSession.tsx` (W6),
`AppContext.createCompetition` / `addTeams` new contracts (W8, P2b).

**Acceptance**
1. Wizard step lives in the URL; browser Back moves between steps; after creating, the user lands on the
   competition, not the list. Both are user-visible behaviour changes — call them out in the PR.
2. `FORMAT_META` drives every format-conditional control. A table test asserts, for all five
   `CompetitionType` values, exactly which config controls render (this is the easiest place to silently
   drop a capability).
3. Bye messaging survives: `"7 teams selected (1 bye)"` for non-power-of-2 elimination entries.
4. `numberOfCourts` is re-clamped when the team selection changes (`maxCourts` bug, not inherited quietly).
5. `isCustomized` includes `pointsForTie`; verified against `src/lib/roundRobin.ts`.
6. `SessionAuth` is a **step inside** `CreateSessionDialog`, never a nested Radix dialog.
7. Quick Add writes through the batched `addTeams` (W8) — 8 teams produce 8 teams and **one** write.
8. `TeamsStep` uses `MbSelectList` with a `Set` and memoised rows; verified smooth at 48 teams.
9. Permission-denied on submit renders an `MbNotice`, never a silent route change.
10. Verified at 390×844 with a 12-character venue word and a 60-character team name; at 0/1/3/12/48 teams;
    and at 844×390 landscape.
11. The primary action is reachable without scrolling at every step, at every tested size
    (`MbActionBar` below `lg`).
12. Team colour is a **contained accent only** — a bar beside the crest. It never tints or selects the
    crest and never fills a panel (Appendix A, D-9).

**Shots** — `competition-new`, plus click-driven step captures:
```
node shot.mjs /competitions/new out.png --desktop --click "Round Robin" --click "Next"
node shot.mjs /competitions/new out.png --mobile  --click "Round Robin" --click "Next" --click "Next"
node shot.mjs /teams out.png --desktop --click "Add Team"
node shot.mjs /teams out.png --mobile  --click "Quick Add"
node shot.mjs /competitions out.png --desktop --click "css=[data-testid=delete-competition]"
```
plus `competition-new` with `--with-empty` (0 teams).

---

### W4 — Competition detail & bracket views

**Owns exclusively**
```
src/app/competitions/[id]/page.tsx
src/components/competition-detail/*
src/components/Bracket.tsx  DoubleBracket.tsx  Win2OutView.tsx  TwoMatchRotationView.tsx  Standings.tsx
src/components/bracket-parts/*   src/components/rotation-views/*
src/components/dialogs/edit-match/*   src/components/dialogs/edit-queue/*
src/hooks/useCompetitionDetailPage.ts  useRotationInstantWin.ts  useTerminology.ts  useTeamsOnCourt.ts
src/components/matchbook/{StandingsTable,MatchRow,BracketRail,CourtCard}.tsx
src/components/matchbook/useMatchbookCompetitionDetail.ts
```

**Publishes to W6:** `BracketRail`, `MbCourtCard`, `MbStandingsTable`, `MbMatchRow`. **W4's PR must switch
`/session/[shareCode]` to the new components in the same commit** so the public viewer never imports a
deleted file (H4). That is the only edit W4 makes outside its own tree, and it must be limited to the import
block and JSX of `src/app/session/[shareCode]/page.tsx`.

**Acceptance**
1. All 14 behaviours in brief §1.4 verified by hand against the fixture. `useCompetitionDetailPage.ts:217-244`
   (auto-complete) and `:246-290` (auto-session) are **not touched** — only what renders their callbacks.
2. Single and double elimination share **one** cell and **one** rail; the inline card in `DoubleBracket.tsx`
   is deleted; connectors are computed arithmetically and never animated.
3. Exactly one horizontal scroller per bracket, with a visible scroll cue and a vertical rounds-list
   fallback below `sm`. Tested at 3, 5, 6, 7, 8, 11 and 16 teams.
4. Standings never hide `Pts` on mobile; the table has a `caption` and `scope` on headers.
5. Schedule groups by round with completed rounds collapsible; the results ledger paginates at 15 and the
   header count matches the rendered count.
6. Court cards always expose a path to `/match/[id]`, **including** with `instantWinEnabled`; confirm the
   rotation processor is idempotent before shipping (two paths can now complete one match).
7. Completed matches are clickable and their results editable.
8. `useEditMatchDialog.ts:145-209` rotation court-state rewriting is extracted to `src/lib/` **under test**
   before it is restyled (it is two near-identical 30-line index-search blocks).
9. Every venue string goes through `useTerminology` — including `MatchHistorySection.tsx:35,90`, which
   hardcodes "Court" today.
10. No panel returns `null`: Leaderboard and History render `PanelEmpty`.
11. `animate-spin-slow` and `src/components/TeamCard.tsx` deleted; zero emoji (7 today).
12. 16-team / 120-match competition usable: no layout break, no interaction over 5s.

**Shots** — `competition-rr-completed competition-rr-live competition-se-live competition-de-draft
competition-w2o-live competition-tmr-live`, desktop + mobile + `--full`, plus dialog captures:
```
node shoot-all.mjs <out> --only competition-rr-live,competition-se-live,competition-de-draft,competition-w2o-live,competition-tmr-live,competition-rr-completed
node shot.mjs /competitions/comp-de-harbor-classic out.png --click "Start Competition"
node shot.mjs /competitions/comp-rr-summer-league out.png --click "Share Live"
```

---

### W5 — Live scoring consoles

**Owns exclusively**
```
src/app/match/[id]/page.tsx   src/app/match/guest/page.tsx
src/components/match/*        src/components/GuestMatchComplete.tsx
src/hooks/useMatchPage.ts  useGuestQuickMatch.ts  useFullscreen.ts  useCourtView.ts  useScoreHistory.ts
src/components/matchbook/ScoreSide.tsx  useMatchbookMatch.ts
src/components/ui/match-score.tsx        (delete — zero importers; re-grep at implementation time)
```

**Acceptance**
1. `handleCompleteMatch` (`useMatchPage.ts:175-453`) is untouched. `npx vitest run` must be green on the
   W8 characterisation suites for all five completion branches **before** any edit here.
2. Series continuation stays an in-place state change (reset to 0-0, no navigation). It gets a deliberate
   `GAME 3` stamp — it must not fall out of a generic entrance animation.
3. **The completed-match bug is fixed**: a `status:"completed"` match renders a FINAL treatment with no
   `Live` badge, no "Tap to score", no steppers, and `Game 0` cannot render
   (`src/app/match/[id]/page.tsx:112` today shows all of them).
4. A deleted team produces a "teams unavailable" panel, not "match not found"; three distinct panels exist
   (not-found / teams-unavailable / sync-failed).
5. First paint is a skeleton — the "Match not found" flash is gone, verified by capturing the first paint.
6. The score numeral **never** translates or scales. Increment = 90ms cross-fade in place + a 220ms coral
   edge flash. The lead-change column swap is the only positional motion in the console.
7. Guest undo: scripted 5 rapid taps then 5 undos returns the score to 0. Undo either survives a reload
   (`sessionStorage`) or is honestly labelled unavailable.
8. Orientation/fullscreen logic exists once (`useCourtView`), not duplicated across two files; failures
   surface in the UI instead of `console.log`; Court View degrades to an in-page mode on iOS.
9. Layout uses `100dvh` with a `100vh` `@supports` fallback; the page never scrolls in either orientation.
10. One polite `aria-live` region announces `"Surge 19, Riptide 15"` debounced 400ms; the visual numeral is
    `aria-hidden`; only one score value is in the accessibility tree.
11. `RotateDeviceDialog` is static — no infinite loop.
12. Every control ≥44×44 at 390×844, verified by a scripted `getBoundingClientRect` sweep. End Match and
    Undo carry visible text. The header carries no destructive action.
13. Verified with a 50-character team name and a 3-digit score at every breakpoint and in Court View.

**Shots** — `match-live-bracket match-live-court match-live-quick match-completed match-guest`, desktop +
mobile, plus 844×390 landscape (`node shot.mjs <route> out.png --tablet` then a manual landscape run), plus
`--click "End Match"` for the confirm dialog. Court View and the view-only shared state cannot be captured
headlessly — build them behind a forced prop and archive manual device shots (one iPhone, one Android).

---

### W6 — Public share screens

**Owns exclusively**
```
src/app/session/[shareCode]/**      (page.tsx, layout.tsx, opengraph-image.tsx, error/loading/not-found)
src/app/summary/[shareCode]/**      (same, + the four Summary*.tsx which are deleted)
src/components/session/*            (all six deleted)
src/components/auth/*               (+ new auth/SessionAuthPanel.tsx, delivered in P2b)
src/components/ShareSession.tsx
src/hooks/useSessionPage.ts  useSummaryPage.ts
src/components/matchbook/useMatchbookSession.ts  useMatchbookSummary.ts
src/lib/sessionsServer.ts           (new — REST read for metadata)
```

**Gated by:** W4 P3a (bracket/court components + the `/session` import switch) and W8 P2b
(`SessionContext` state machine, `DEV_PREVIEW_SESSION`). Do not start before both land.

**Decisions taken here**
- **Local visibility is solved by option (b):** W8 ships `NEXT_PUBLIC_DEV_PREVIEW_SESSION=1` in
  `src/lib/sessions.ts`, mirroring the existing `DEV_PREVIEW_AUTH` pattern in `AuthContext.tsx:53-59`,
  guarded so it is dead code in production builds. Java/emulator (option a) is not installable here and
  chunk-patching (option c) is unmaintainable.
- **OG metadata uses an unauthenticated Firestore REST `runQuery`**, not `firebase-admin`. No new
  dependency, no service-account secret in deploy config. `firestore.rules` already allows public read.
  If REST cannot be made to work, ship a static Matchbook OG card carrying the event name only.
- **`MbQrCode` is cut** (Appendix A, D-11).

**Acceptance**
1. Both routes use `MatchbookShell variant="public"` — no sidebar, no bottom bar, no account chip — and a
   sticky `MbEventBar`.
2. **No error card is ever shown before the first Firestore response.** A snapshot error or
   `navigator.onLine === false` shows `MbOfflineBanner` and **keeps the last known scores on screen**;
   recovery clears it without a reload.
3. No raw Firebase error string and no mention of "Firebase" reaches the public UI.
4. Session-ended offers a direct link to the generated summary.
5. At 390×844 the live score is fully above the fold on `/session`; champion + final result above the fold
   on `/summary`. Numerals ≥40px on mobile, ≥64px at ≥1280px.
6. Live and final standings use the one shared `rankTeams()` and cannot reorder when a session ends;
   T / PF / PA are rendered. Series game number is clamped to `seriesLength` (no "Game 4 of 3").
7. "Upcoming" counts pending matches only; `single_elimination`/`double_elimination` render their proper
   labels; matches with `competitionId === null` inside a session are still shown.
8. Delete failure and clipboard failure both surface to the user.
9. `useSearchParams` is inside a `<Suspense>` boundary and `npx next build` is clean.
10. ≥25 ledger rows are capped with Show-all/Export (reusing `src/lib/exportCsv.ts`); ≥8 live matches
    collapse behind "more courts".
11. Pasting either link into a chat app previews the event name, the score, and a Matchbook OG card.
12. The admin link stays `type="password"` by default and is revealable before copy. Nothing logs
    `window.location.href` — `?admin=<token>` is already in history and the referrer.
13. `SessionCompetitionInfo`, `SessionStatsGrid`, `SessionViewerNotice`, `SessionLoadingState`,
    `SessionErrorState`, `SessionNotConfigured` and the four `Summary*.tsx` are **deleted**, not orphaned.
14. `@media print` verified on `/summary`: one column, all ledger rows, no chrome.

**Shots** — `session-shared summary-shared` render the error states today; after `DEV_PREVIEW_SESSION`
lands, W8 adds `session-live`, `session-viewer`, `session-ended`, `summary-final`, `summary-empty` to
`routes.mjs`. All 27 states in brief §1.3 must be reachable in the harness and archived at both widths.

---

### W7 — Volleyball rotation tools

**Owns exclusively**
```
src/app/tools/volleyball-rotations/**            (+ new editor route)
src/components/volleyball/**
src/lib/volleyball/*
src/hooks/useFormationEditor.ts  useUserFormations.ts  useVolleyballRotation.ts
src/components/matchbook/court/*                 (MbCourt, MbPlayerToken, MbRoleChip, MbConstraintLine, MbCourtArrow)
src/components/matchbook/useMatchbookRotations.ts
```

**Decisions taken here**
- **The formation editor becomes a route**, `/tools/volleyball-rotations/editor` (`?id=` to edit,
  `?from=` to duplicate), not a modal. It needs an unsaved-changes guard on navigation; both existing call
  sites (`page.tsx:311-318`, `my-formations/page.tsx:269-276`) become links.
- **Fix the perf bug before restyling**: `useRef(getInitialData())` → `useRef<FormationData|null>(null)` +
  lazy init, and mutate only the target frame via a shallow-copy path. Otherwise the redesign gets blamed
  for drag jank.
- **Libero:** always materialise `roleSpots.L` on save. The three-site fallback
  (`frame.roleSpots.L || frame.roleSpots[backRowMB]`) stays for reading legacy documents only.
- **Templates tab:** if it does not change the court when selected, it does not ship. No lying tab.
- The public share route uses `MatchbookShell variant="public"`, matching `/summary/[shareCode]`.

**Acceptance**
1. `COURT_SVG`'s normalised 0..1 space is byte-preserved; only the rendered viewBox and node radius change,
   and the arrow-shorten constants (`MovementArrow.tsx:24-25`, `ArrowLayer.tsx:37-38`) are re-derived from
   `NODE_RADIUS`. Every stored formation renders identically.
2. Sub-44px target count goes from 25 → **0** (and 4 → 0 for spacing) at 390px; player tokens have a ≥52px
   transparent hit circle.
3. **The editor is fully operable on a 390×844 phone**: the court is visible, every player repositionable by
   touch, every metadata field reachable. (Today the court sits at y≈1060 inside a clipped modal.)
4. Front vs back row, private/shared/unlisted, and overlap-constraint type are each legible in greyscale —
   verified with a desaturated screenshot.
5. Offline no longer renders as "0 formations": `useUserFormations` exposes `fromCache`/`isOffline` and the
   UI labels stale data.
6. All eight states drawn: loading (skeleton at final geometry), empty, error+retry, offline/stale,
   permission-denied, not-found, saving/optimistic, too-much-data (search + sort + pagination, debounced).
7. No `window.confirm`, no timed auto-disarm; destructive actions routed through `MbConfirm` and separated
   from frequent ones.
8. `PLAYER_COLORS` is retired as a rendering source; a `roleTokens.ts` maps roles → `--mb-*` tokens.
   No `oklch(...)` or raw hex anywhere in scope, **including inside SVG**.
9. The x/y readout occupies a fixed-width `tabular-nums` box and causes zero reflow during a drag.
10. `getFormationByShareId`'s composite index requirement (`shareId` + `visibility`) is documented; a
    missing index must not read as "Formation Not Found".

**Shots** — `vb-rotations vb-my-formations vb-shared-formation` at desktop + mobile, plus the new editor
route (request the id from W8), plus `--click` captures for the share dialog and the archive's empty state.

---

### W8 — Data, correctness & verification

**Owns exclusively**
```
src/context/AppContext.tsx  SessionContext.tsx  AuthContext.tsx  appReducer.ts  useTeams.ts  useMatches.ts  useCompetitions.ts
src/lib/{sessions,roundRobin,singleElimination,doubleElimination,win2out,twoMatchRotation,eliminationSwap,undo,standings}.ts
src/hooks/useLiveConnection.ts  useTeamsMap.ts
src/types/*
src/__tests__/**
…/scratchpad/pw/{gen-fixture.mts,routes.mjs,shot.mjs,shoot-all.mjs,audit.mjs}
```

**Deliverables, in order**
1. **P1 — characterisation tests before anyone refactors.** `src/__tests__/` today has only the three
   volleyball suites. Write suites for `roundRobin` (incl. configurable points and ties),
   `singleElimination` + `advanceWinner`, `doubleElimination`, `win2out`, `twoMatchRotation`, and
   `eliminationSwap`. W4 and W5 are blocked on these being green.
2. **P1 — `src/lib/standings.ts` `rankTeams()`**, and repoint `useSessionPage`, `useSummaryPage`,
   `Standings.tsx` and `lib/roundRobin` at it. Live and final rankings currently use different rules.
3. **P2b — `SessionContext` state machine.** `isLoading` must start `true`; a transient snapshot failure
   must not destroy the view; distinguish not-found / ended / offline / permission-denied / unconfigured.
   `AppContext.tsx:117-127` reads the same `session` object — regression-test `/match/[id]` in shared mode.
4. **P2b — `AppContext` contracts.** `addTeams(teams[])` batched (today `handleQuickAddTeams` loops
   `addTeam` against a stale `session`, so 8 teams become 1 and fire 8 writes); `createCompetition` returns
   `{ok:false, reason:"permission"}` instead of `""`; one localStorage serialisation per batch.
5. **P2b — `NEXT_PUBLIC_DEV_PREVIEW_SESSION=1`** fixture hatch in `src/lib/sessions.ts`, production-dead.
6. **P2b — `useLiveConnection()`** feeding `MbLiveStatus`.
7. **P1 — `pw/audit.mjs`** (§5.3): one reusable measurement CLI generalising the one-off `measure.mjs` /
   `metrics.mjs` / `diag-*.mjs` probes left behind by the audit sessions. Every other workstream depends on it.
8. **Continuous — the harness.** Re-run `gen-fixture.mts` before every baseline (`pw/` is shared with other
   sessions and `fixture.json` can be clobbered). Add route ids on request: the editor route, the wizard
   step URLs, and the five populated share routes.

**Acceptance**
1. `npx vitest run` green, with the five new suites present and non-trivial.
2. No screen workstream has a diff in any W8-owned file.
3. Every route id in `routes.mjs` renders `SHOT_OK` in a full `shoot-all` run; `index.md` lists only the
   expected console/network noise (mobile auth-emulator `ERR_CONNECTION_REFUSED`, the `brand/crest.svg`
   aspect-ratio warning, and Firestore refusals on share routes — the last of which must **disappear** once
   `DEV_PREVIEW_SESSION` lands).

---

## 4. Global invariants

One checklist. An implementer runs it before opening a PR; a critic runs the identical list. Every item is
binary and has a stated way to check it. **Items marked ⛔ are rubric hard fails — one occurrence fails the
screen regardless of everything else.**

### Shell & structure
1. Outermost element is `MatchbookShell` with the correct `variant`; `matchbook-surface` appears exactly once.
2. ⛔ No `<Navigation/>`, `<Header/>`, `<ThemeToggle/>`, or legacy `PageLoadingSpinner` on a converted route
   — **including during loading and error states**. (`grep -n "Navigation\|PageLoadingSpinner" <files>`)
3. `<main id="mb-main" className="px-4 py-5 sm:px-6 lg:px-8">`; no `max-w-*` except
   `variant="public"`'s `max-w-[1100px]`.
4. Grid is `grid-cols-1 gap-4 xl:grid-cols-12`; spans only 7/5, 4/4/4, 12; `gap-4` is the only gap.
5. Every region is a `<Panel>` or `.mb-panel`; nothing floats loose on the paper; ≤2 `tone="navy"` panels.
6. Exactly one `<h1>` per screen at `display/masthead`, two-tone with **one** coral span; ≤2 masthead
   actions (≤1 coral, ≤1 navy).

### Type & colour
7. Every font size maps to a named step in design language §2.1. No off-scale values.
8. All display text carries `.matchbook-display` **plus an explicit tracking class**.
9. ⛔ `tabular-nums` on every score, stat, percentage, record, time, and table measure. Numbers must not
   reflow when a live value changes.
10. ⛔ Zero hardcoded colours: no `#hex`, no `oklch(...)`, no `emerald-*`/`amber-*`/`sky-*`/`blue-*`/
    `slate-*`/`red-*` utilities — **including inside SVG**. Everything resolves to `--mb-*`.
11. `--mb-gold` is never text on paper (use `--mb-gold-ink`); `--mb-ink-muted`/`--mb-red`/`--mb-plum` are
    never text on navy.
12. New status text under 18.66px is navy or ink-muted; the colour is carried by an adjacent dot, square
    or border.
13. ⛔ Information is never conveyed by colour alone — win/loss, live, rank each carry a second channel
    (weight, shape, word, position). Check with a desaturated screenshot.
14. ⛔ Contrast: body text ≥4.5:1, large text/UI ≥3:1, measured not assumed. Coral-on-cream and
    ink-muted-on-paper get checked explicitly.
15. Coral appears once per screen as the primary job (single CTA or live state), plus its declared
    structural jobs (selection rail, schedule spine, masthead badge frame).
16. Team colour appears only inside a contained mark — a bar beside a crest, a form square, a seed box.
    Never a panel background, never a gradient.

### Components & assets
17. ⛔ Every icon is `<MbIcon>` with an id from the sprite. No `lucide-react`, no `@heroicons/react`,
    no second icon library. (`grep -n "lucide\|heroicons" <files>`)
18. ⛔ Zero emoji, in JSX **and** in strings. (`grep -nP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" <files>`)
19. Every button is `MbButton`/`MbIconButton` (which emit `.mb-btn` + one variant). No shadcn `<Button>`,
    `<Card>`, `<Badge>`, `<Progress>`, `<Separator>`, `<Tabs>`.
20. ⛔ Any dialog or sheet on the screen is `MbDialog`/`MbSheet` — including its overlay, radius and border
    weight. No stock shadcn modal survives.
21. Every team identity goes through `crestForTeam()` / `<Crest>` / `<TeamMark>`. No initial-letter tiles,
    no `Users` glyph stand-ins, no person imagery of any kind.
22. All records/form/readiness numbers come from `teamStats.ts`; all rankings from `rankTeams()`.
23. Data shaping lives in a `useMatchbook*` hook; the route file contains layout only.
24. ⛔ No `rounded-lg` or larger. Radii are 4 / 3 / 2 / 999px, the last only for `.mb-live-dot`, the account
    disc, icon discs and colour swatches. No gradients, no glows, no `backdrop-blur`, no shadow other than
    `--mb-panel-shadow`.

### States
25. ⛔ Every list, table, bracket and panel that can be empty renders an empty state with an
    "No <things> exist yet — <what makes them appear>." sentence, ≤1 CTA. No panel returns `null`.
26. ⛔ Loading is a skeleton at the **final geometry**, never a spinner and never a full-page blocking
    spinner. Spinners are permitted only for short discrete confirmations (save, auth).
27. ⛔ No visible layout shift on load or hydration. Images carry width/height; async regions reserve space.
28. Error states are specific and recoverable, never a dead end, and never leak a raw provider message.
29. Offline/stale data is visibly labelled, not silently shown as fresh; the last known values stay on screen.
30. Any client-rendered date carries `suppressHydrationWarning`.

### Responsive & touch
31. ⛔ No horizontal page scroll at 320 / 375 / 390 / 414 / 768 / 1024 / 1280 / 1440px. Check
    `document.body.scrollWidth === window.innerWidth` — `overflow-x:hidden` hides the symptom, so verify
    the number, not the scrollbar.
32. Only `.mb-table` wrappers, the bracket rail and the tool rail scroll horizontally, each with a visible
    edge cue.
33. ⛔ Every interactive target ≥44×44 CSS px of real hit area with ≥8px separation, verified by a scripted
    `getBoundingClientRect` sweep — not by eye.
34. ⛔ Fixed/sticky elements honour `env(safe-area-inset-*)` top and bottom.
35. Primary actions live in the bottom third on mobile; destructive actions are not adjacent to frequent ones.
36. ⛔ No hover-only affordance and no tooltip-only information anywhere.
37. Every text-bearing flex/grid child has `min-w-0`; long strings `truncate`.
38. Nothing important is hidden behind `hidden sm:*` / `hidden xl:*` — only redundant context.
39. Landscape at ≤500px height still shows the score; the existing `@media (max-height:500px)` contract is
    honoured, not bypassed.

### Motion
40. Only `transform` and `opacity` animate. Durations and easings come from §2.1 tokens; no literal
    duration/easing appears in a `.tsx`.
41. No spring, no bounce, no overshoot, no `layoutId`, no scroll-triggered animation, no shimmer.
42. `.mb-enter` applies to grid panels only, capped at 6; table rows and bracket cells never animate.
43. Score values cross-fade in place; they never translate, scale or flip. Standings never FLIP-reorder.
44. `prefers-reduced-motion: reduce` yields the end state instantly everywhere, including JS-driven motion
    (`useMbReducedMotion()`), verified by sampling inline style across two frames.
45. Nothing loops infinitely except `.mb-live-dot`.

### Accessibility & hygiene
46. ⛔ Keyboard: every control reachable by Tab, focus visible (coral, 2px, offset 2px), dialogs trap and
    restore focus, Escape closes.
47. Icon-only controls carry `title` **and** `aria-label`; selects and search inputs carry `aria-label`;
    tables carry `caption` + `scope`.
48. Interactive rows/cells are real `<button type="button">`, and `Space` calls `preventDefault()`.
49. Live values announce through exactly one polite `aria-live` region; the visual numeral is `aria-hidden`.
50. ⛔ Zero console errors, zero hydration warnings, `npx tsc --noEmit` and `npx eslint <paths>` clean.
51. ⛔ The screen contains no artefact of the pre-Matchbook theme: none of the §9 class list, none of the
    §9 token list, no `.dark`/`dark:`, no framer-motion.
52. ⛔ The layout is editorial, not generic — no centred lone card in empty space, no three equal
    icon-title-paragraph tiles, no gradient hero. If it would look identical for a CRM, it fails.
53. Any new pattern is generalised into `src/components/matchbook/*` or an `mb-*` utility, named per §2,
    and consumed by at least the screen that motivated it.

---

## 5. Verification protocol

Paths (PowerShell; in Git Bash prefix commands with `MSYS_NO_PATHCONV=1` — leading-`/` routes get mangled):

```powershell
$REPO = "C:/Dev/Tournament-Tracker/.claude/worktrees/app-redesign-features-cf1ebd"
$PW   = "C:/Users/khiem/AppData/Local/Temp/claude/C--Dev-Tournament-Tracker--claude-worktrees-app-redesign-features-cf1ebd/bbc48bd4-cabe-4606-b848-eecddebf3c28/scratchpad/pw"
$SHOTS= "C:/Users/khiem/AppData/Local/Temp/claude/C--Dev-Tournament-Tracker--claude-worktrees-app-redesign-features-cf1ebd/bbc48bd4-cabe-4606-b848-eecddebf3c28/scratchpad/shots"
```

The dev server is **already running** on `http://127.0.0.1:3100`. Do not start another; do not kill it.

### 5.1 Fixture (deterministic; re-run before every baseline)

```powershell
cd $REPO
npx tsx $PW/gen-fixture.mts          # writes fixture.json + fixture-empty.json
```
8 teams (names match the crest pack), 6 competitions, 70 matches (48 completed / 5 live / 17 pending),
clock anchored at `2026-08-08T12:00:00Z`, built with the app's own schedule/standings/bracket/rotation
libraries. `pw/` is shared with other sessions — if `fixture.json` looks wrong, regenerate it.

### 5.2 Screenshots

```powershell
cd $PW
node routes.mjs                                       # every route id + URL
node shoot-all.mjs $SHOTS/<label>                      # all routes x desktop+mobile, full page, writes index.md
node shoot-all.mjs $SHOTS/<label> --with-empty         # + empty-state shots
node shoot-all.mjs $SHOTS/<label> --only competition-se-live,match-live-quick
node shot.mjs /competitions/comp-se-city-cup out.png --desktop --full
node shot.mjs /teams out.png --mobile --scroll 1200
node shot.mjs /competitions/new out.png --desktop --click "Round Robin" --click "Next"
```
`shot.mjs` flags: `--desktop|--tablet|--mobile --full --expand --empty --wait ms --scroll px
--click <text|css=sel> --base url --allow-redirect`. It prints `CONSOLE_ERROR` / `NET_FAIL` lines, then
`SHOT_OK <path>`; it exits 1 with `SHOT_FAIL <why>` on HTTP ≥400, a redirect away from the requested path,
a Next error overlay, or a blank render.

Baseline for diffing: `$SHOTS/baseline/` (60 PNGs + `index.md`, all clean, ~107s).

Known limits, all expected:
- `/login` cannot be captured — `NEXT_PUBLIC_DEV_PREVIEW_AUTH=1` redirects it to `/`. `shoot-all` skips it.
  To shoot it, remove the flag from `.env.local` and restart the server.
- `/session/*`, `/summary/*`, `/tools/.../shared/*` render not-found until W8's `DEV_PREVIEW_SESSION`
  lands (the Firestore emulator needs Java, which is absent).
- Expected noise in `index.md`: mobile shots log `NET_FAIL … 127.0.0.1:9099` (auth emulator); matchbook
  pages log one `<Image>` aspect-ratio warning for `brand/crest.svg`; `/summaries`, `/tools` and the share
  routes log Firestore `127.0.0.1:8080` refusals. Competition-detail and match routes must stay **clean**.
- `--full` grows the viewport to the measured content height (BODY is the scroller because
  `globals.css` sets `html,body{height:100%}`). Do **not** switch it back to Chromium `fullPage: true`.
- Full-page mobile shots reach ~8700px and are illegible when read back — use the viewport variant or
  `--scroll <px>` to read text.
- A bogus id returns HTTP 200 with an app-level not-found body, so the harness cannot flag it. Always take
  ids from `routes.mjs`.
- `useMatchbookDashboard` prints today's real date in its masthead, so that one line legitimately differs
  between baseline runs.

### 5.3 Measurement sweeps (required, not optional)

The existing `pw/measure.mjs`, `pw/metrics.mjs` and `pw/diag-*.mjs` are **one-off probes from the audit
sessions**, hardcoded to specific routes and seeds — do not treat them as a CLI. **W8 generalises them, in
P1, into one reusable script:**

```powershell
cd $PW
node audit.mjs <routeId> --mobile      # or --desktop --tablet ; routeId from routes.mjs
```
`audit.mjs` must report, per route and viewport:
1. every interactive node under 44×44 (`button, a, input, select, textarea, [role="button"],
   [tabindex]:not([tabindex="-1"])`) with size and label, plus adjacent pairs closer than 8px;
2. `document.body.scrollWidth` vs `document.documentElement.clientWidth`;
3. numerals rendered without `font-variant-numeric: tabular-nums`;
4. console errors and page errors;
5. a two-frame inline-style sample under `prefers-reduced-motion: reduce` (must be identical).

The sub-44px count must be **0**, the spacing violations **0**, and body scroll width must equal client
width at every viewport in invariant 31, on every route the workstream owns. Until `audit.mjs` lands,
copy the sweep out of `measure.mjs` inline — do not skip it.

### 5.4 Build gates

```powershell
cd $REPO
npx tsc --noEmit
npx eslint <changed paths>            # and `npx eslint src` at GATE 4 — zero unused warnings
npx vitest run
npx next build                        # W6 only (Suspense boundary around useSearchParams)
```

### 5.5 PR evidence

A PR is not reviewable without: the four command outputs above, the `index.md` from a `shoot-all --only`
covering the workstream's routes, a desktop + mobile screenshot pair per owned route, the measurement sweep
result, and a filled §4 checklist. A critic then emits the verdict in the exact format of
`benchmark-rubric.md` §4. **PASS requires all ten dimensions ≥8 and zero hard fails**; 7 is a failing grade
and the total never overrides the floor.

---

## Appendix A — decisions where the briefs disagreed

| # | Conflict | Decision | Why |
| --- | --- | --- | --- |
| D-1 | Dialog API: `onOpenChange` (create-flows, comp-detail, live) vs `onClose` (tools); `footer` prop (create/live) vs `MbDialogFooter` child (GAP-1) | `open` + `onOpenChange`; `MbDialogBody` / `MbDialogFooter` children | GAP-1 in the design language is authority #3 and specifies the children; `onOpenChange` is the Radix idiom already in the dependency tree |
| D-2 | `MbBadge` (GAP-4, comp P3) vs `MbChip` (live-scoring) | `MbBadge`, tone union of both (`+guest`, `+warn`) | The design language names it; two names for one box is exactly the drift the rubric penalises (D9) |
| D-3 | `MbTabs` (GAP-5) vs `MbSegmented` (create) vs `MbSegment` (tools) | **Both `MbTabs` and `MbSegmented` exist**; `MbSegment` is retired | They are different objects: tabs switch *views* (coral bottom rule, `role="tablist"`); segmented is a *form control* (`role="radiogroup"`, boxed). Collapsing them would break one or the other's semantics |
| D-4 | `MbNumberStepper` (create) vs `MbStepper` (tools, bounded R1–R6 with wrap) | One `MbNumberStepper` with `wrap` + `prefix` | Identical geometry and a11y contract; a `prefix="R"` and `wrap` cover the rotation case entirely |
| D-5 | Masthead: `MatchbookMasthead` (shell) vs `MbMasthead` (create) vs `EventMasthead` (comp-detail) vs console masthead (live) vs sticky navy masthead (public-share) | Two components: `MatchbookMasthead` (editorial, paper, console routes) and `MbEventBar` (navy strip; focus + public routes) | The editorial masthead and the navy event strip have different geometry, tone and stickiness. One component with five variants would be a switch statement pretending to be a design |
| D-6 | Shell: `MatchbookShell` (shell) vs `MbConsoleShell` (live-scoring) | `MatchbookShell variant="focus"` | One shell declared once is shell-motion §3.1's whole point, and the rubric's D9 "extends the system" anchor |
| D-7 | Empty/error: `MbEmptyState` (shell) vs `MbStatePanel` (live) vs `PanelError`/`PanelOffline`/`PanelDenied` (tools) | `MbEmptyState` for page-level; extend `PanelEmpty` with `tone`/`icon`/`onAction` for in-panel | Three sibling components duplicating one tone enum is debt; `PanelEmpty` already ships and is referenced by the design language §4.2 |
| D-8 | `MbCopyField` fallback: `document.execCommand` (public-share) vs select-on-focus, drop execCommand (tools) | Chain all three: `navigator.clipboard` → `execCommand` → select-on-focus + explicit hint, and **always** surface failure | Both briefs' real requirement is "failure must be visible"; the chain satisfies iOS, insecure origins and WebViews without choosing between them |
| D-9 | `team.color` — tint the crest / pick the crest / retire it (create-flows open question) | **Contained accent only**: a 3px bar beside the crest and a name underline. Never tints or selects the crest, never fills a panel | Rubric §1 ref #2 (The Athletic) and D3's explicit rule: arbitrary team colour enters a fixed system only inside contained marks. `MbSwatchPicker` therefore still has a job |
| D-10 | Crest collisions (8 crests, up to 48 teams) | Accept for v1; identity is carried by crest + name + colour bar | Design language §5.4 forbids inventing person-level imagery, and a ninth crest is an asset-pack change, not a code change. Logged as follow-up |
| D-11 | `MbQrCode` (public-share N5) | **Cut.** No QR in v1 | A correct encoder is ~200 lines or a 30kB dependency; the brief itself calls it additive; and the admin token must never enter a QR anyway |
| D-12 | Firestore visibility locally: Java emulator / dev fixture hatch / chunk patching | `NEXT_PUBLIC_DEV_PREVIEW_SESSION=1` in `src/lib/sessions.ts`, production-dead | Java is not installed and `npm run emulators` starts auth only; chunk-patching cannot be maintained across a redesign. The pattern already exists at `AuthContext.tsx:53-59` |
| D-13 | OG metadata: `firebase-admin` vs unauthenticated REST | REST `runQuery`, with a static card as the fallback | Avoids a new dependency and a service-account secret in deploy config; `firestore.rules` already permits public read |
| D-14 | `userScalable:false` — remove now (shell) vs raise it, don't flip (live-scoring) | **Remove**, in W2's single layout commit, with `touch-action: manipulation` on all scoring controls | Locked zoom blocks users from rescuing 0.6rem display text, which design language §8 itself flags as dangerous; the double-tap risk is fully mitigated by `touch-action` |
| D-15 | Dark mode (GAP-15.1) | Dropped for Matchbook; `ThemeToggle` deleted, `<html className="light">` | Design language §1.4 is explicit and the toggle currently mis-states reality on 7 of 13 routes |
| D-16 | Mobile nav: keep `MatchbookMobileBar` (design language §3.1) vs replace with bottom bar (GAP-3) | Bottom bar wins | GAP-3 is a listed gap, so it is one of the three places a brief may overrule the body text; and the top strip fails rubric D6 and hard fail #2 today |
| D-17 | `useMbReducedMotion` wrapping framer's `useReducedMotion` (tools) | `matchMedia` implementation, zero framer dependency | Design language §9 bans framer-motion on converted screens; importing it for a media query would reintroduce it everywhere |
| D-18 | `MbTeamIdentity` (live) vs extending `TeamMark` | Extend `TeamMark` | It is documented in design language §4.2 and used across every shipped screen; a parallel component would fork team rendering |
| D-19 | Who owns `ShareSession` / `auth/*` (create-flows §1.2 vs public-share §1.1) | W6 owns both; W3 owns `CreateSessionDialog` and consumes `auth/SessionAuthPanel` | They are public-surface components; W3's only interest in them is `MbCopyField`, which is a W1 primitive |
| D-20 | Coral button contrast (GAP-14: darken the fill vs restrict to `mb-btn-lg`) | Darken: `--mb-coral-deep` for `.mb-btn-coral` fill only | Restricting to `lg` would forbid the coral CTA in the masthead action row, which every shipped screen uses; darkening fixes contrast without touching layout |

---

## Appendix B — retired names

Do not let these appear in code or review comments.

`MbChip` → `MbBadge` · `MbSegment` → `MbSegmented` · `MbStepper` → `MbNumberStepper` ·
`MbStatePanel`, `PanelError`, `PanelOffline`, `PanelDenied` → `MbEmptyState` / `PanelEmpty` ·
`MbTeamIdentity` → `TeamMark` · `MbProgressRule` → `MbMeter` · `MbConsoleShell` → `MatchbookShell variant="focus"` ·
`EventMasthead`, `MbMasthead` → `MatchbookMasthead` / `MbEventBar` · `MbStatusStat` → `MbStat` ·
`MbStickyActionBar`, `MbActionRail` → `MbActionBar` · `MbLoading` → `MbPageLoading` ·
`MbEmpty` → extended `PanelEmpty` · `MbConfirm` is the only confirmation dialog (no `window.confirm`) ·
`MbQrCode` → cut.
