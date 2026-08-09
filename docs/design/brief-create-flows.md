# Redesign brief — Create & configure flows

**Scope:** `/competitions/new` (3-step wizard) plus every create/configure/confirm dialog reachable from
`/teams` and `/competitions`.
**Status:** audit only — no application source was modified.
**Audited against:** dev server `http://127.0.0.1:3100`, seeded `tournament-tracker-state` (12 teams / 3
competitions / 21 matches, plus empty and 48-team variants), captured at 1440×900 and 390×844.
**Screenshots:** `C:/Users/khiem/AppData/Local/Temp/claude/C--Dev-Tournament-Tracker--claude-worktrees-app-redesign-features-cf1ebd/bbc48bd4-cabe-4606-b848-eecddebf3c28/scratchpad/shots/audit-create-flows/`
(`d-*` desktop, `m-*` mobile; repro scripts `pw/seed-create-flows.mjs`, `pw/shoot-create-flows.mjs`,
`pw/diag-create-flows.mjs`).

This group is the **last un-redesigned surface that every other redesigned page already links into**.
`/teams` (matchbook) opens `TeamForm`, `QuickAddTeams` and `DeleteConfirmDialog`; `/competitions`
(matchbook) opens `DeleteConfirmDialog` and links to `/competitions/new`. The clash is visible in one
screenshot: `d-20-teamform-create.png` — a navy/cream almanac page with a rounded, sans-serif, red-gradient
dialog floating on top of it.

---

## 1. Inventory

### 1.1 Route: `/competitions/new`

| # | Screen / state | File | Notes |
|---|---|---|---|
| 1 | Page shell | `src/app/competitions/new/page.tsx` | Old `<Navigation/>`, `bg-background`, `max-w-4xl` centred column |
| 2 | Auth loading / redirecting | `page.tsx:49-51` → `src/components/shared/PageLoadingSpinner.tsx` | Renders old `<Navigation/>` + framer spinner |
| 3 | Step rail | `src/components/competitions/new/StepIndicator.tsx` | 3 circles, emerald "done", no aria |
| 4 | Step 1 — Format | `src/components/competitions/new/FormatStep.tsx` | 5 gradient cards, min-team badge, Next |
| 5 | Step 2 — Teams | `src/components/competitions/new/TeamsStep.tsx` | Multi-select grid, validation badge, Select All, Quick Add |
| 6 | Step 2 — empty (0 teams) | `TeamsStep.tsx:50-67` | Illustration + "Quick Create Team" |
| 7 | Step 2 — "too much data" (48+ teams) | `TeamsStep.tsx:96-145` | Unbounded 4-col grid, no search, no virtualisation |
| 8 | Step 3 — Name & config | `src/components/competitions/new/NameStep.tsx` | Format summary, name field, format-conditional config |
| 9 | Step 3 — courts sub-panel | `NameStep.tsx:102-135` | `two_match_rotation` \| `win2out`, only when `maxCourts > 1` |
| 10 | Step 3 — scoring-mode sub-panel | `NameStep.tsx:137-179` | `two_match_rotation` \| `win2out` |
| 11 | Step 3 — series-length sub-panel | `NameStep.tsx:181-209` | `round_robin` \| `single_elimination` \| `double_elimination` |
| 12 | Step 3 — name error | `NameStep.tsx:99` | Only reachable via <kbd>Enter</kbd>; the button is disabled |
| 13 | Advanced settings (collapsed / expanded) | `src/components/competitions/new/AdvancedSettingsPanel.tsx` | Hidden entirely for elimination formats |
| 14 | Advanced — standings points | `AdvancedSettingsPanel.tsx:56-99` | `round_robin` only; Tie input disabled when ties off |
| 15 | Advanced — allow ties switch | `AdvancedSettingsPanel.tsx:102-127` | 44×24 px custom switch |
| 16 | Advanced — venue terminology | `AdvancedSettingsPanel.tsx:132-143` | Free-text, feeds naive pluralisation |
| 17 | State machine + submit | `src/hooks/useNewCompetitionPage.tsx` | `step` is component state, never in the URL |
| 18 | Permission-denied submit | `src/context/AppContext.tsx:252` | `createCompetition` returns `""` and no-ops in shared viewer mode — **no UI for it** |

Bye-count messaging (`useNewCompetitionPage.tsx:133-146`) is a real, easily-lost capability: for elimination
formats with a non-power-of-2 entry count the validation line becomes `"7 teams selected (1 bye)"`.

### 1.2 Global dialogs in scope

| # | Component | File | Opened from | States |
|---|---|---|---|---|
| 19 | Team create / edit | `src/components/dialogs/team-form/TeamForm.tsx` + `useTeamForm.ts` | `/teams` masthead "Add Team", `TeamProfilePanel` "Edit Team" | create, edit, name error (empty / <2 chars), live preview |
| 20 | Bulk team add | `src/components/QuickAddTeams.tsx` | `/teams` masthead "Quick Add" | count 2–16, 5 naming styles, 8 colour presets, scrolling preview |
| 21 | Delete confirmation | `src/components/shared/DeleteConfirmDialog.tsx` | `/teams` (delete team), `/competitions` (delete competition) | idle, `isDeleting` |
| 22 | Create shared session | `src/components/CreateSessionDialog.tsx` | competition detail / header | `!isConfigured`, `step="name"`, `isLoading`, `error`, `step="created"`, copy-confirm ×2, nested `SessionAuth` |
| 23 | Share existing session | `src/components/ShareSession.tsx` (+ `ShareButton`) | session-mode header | returns `null` when not shared; viewer vs creator/admin; `navigator.share` vs clipboard fallback |
| 24 | Dialog primitive | `src/components/ui/dialog.tsx` | 15 call sites (see §5 risk) | overlay, content, header/footer/title/description, close |
| 25 | Sheet primitive | `src/components/ui/sheet.tsx` | only `src/components/nav-parts/MobileNav.tsx` | 4 sides |
| 26 | Text input primitive | `src/components/ui/input.tsx` | wizard, team form, session dialogs, auth forms | default, invalid, disabled, readonly |
| 27 | Colour picker primitive | `src/components/ui/color-picker.tsx` | `TeamForm` only | 10 fixed hexes, 3 sizes |

### 1.3 States the current build does **not** have (and the redesign must add)

- **Offline** — no detection anywhere. `CreateSessionDialog` spins indefinitely; the wizard writes to
  localStorage regardless.
- **Permission denied** — `AppContext.tsx:252` / `:187` silently return. A viewer in a shared session
  presses "Create Competition", gets routed to `/competitions`, and nothing was created.
- **Submit in flight** — `handleCreateCompetition` is synchronous with no pending state; the button never
  disables between click and route change.
- **Duplicate-name** — no uniqueness check on teams or competitions.
- **Save / recover draft** — refreshing `/competitions/new` throws away format + team selection + config.
- **Copy failure** — `navigator.clipboard` on an insecure origin only `console.error`s
  (`CreateSessionDialog.tsx:68`, `ShareSession.tsx:50`).

---

## 2. What's wrong today

### 2.1 Old design system that must go

**Page shell is on the pre-matchbook theme.**
`src/app/competitions/new/page.tsx:3` `import { Navigation } from "@/components/Navigation";` and
`:54` `<div className="min-h-screen bg-background">`, `:57` `<main className="max-w-4xl mx-auto px-4 py-8">`.
Every other redesigned route uses `matchbook-surface` + `MatchbookSidebar` + `MatchbookMobileBar`
(see `src/app/teams/page.tsx:69-79`). Navigating `/competitions` → `/competitions/new` swaps the entire
chrome: sidebar disappears, a top nav bar appears, the nav item set changes, the paper texture vanishes.

**The loading state renders the old nav on every matchbook route.**
`src/components/shared/PageLoadingSpinner.tsx:5,16` imports and renders `<Navigation/>`. It is used by
`/teams`, `/competitions`, `/summaries` and `/competitions/new` — so all four flash the old header before
the matchbook page paints.

**Gradients, rings and glow shadows — banned by the matchbook language.**
- `useNewCompetitionPage.tsx:46,54,62,70,78` — `gradient: "from-emerald-500 to-green-600"`,
  `"from-violet-500 to-purple-600"`, `"from-blue-500 to-indigo-600"`, `"from-primary to-red-400"`,
  `"from-rose-500 to-pink-600"`. Five arbitrary hues with no relationship to navy/coral/teal/gold/plum.
- `FormatStep.tsx:42` `"ring-2 ring-primary shadow-lg shadow-primary/20"`,
  `:60-66` `w-16 h-16 mx-auto rounded-2xl … bg-linear-to-br ${option.gradient} … opacity-60`.
- `NameStep.tsx:63` `h-1 w-full bg-linear-to-r ${currentFormat?.gradient}`,
  `:67` `w-14 h-14 rounded-2xl bg-linear-to-br ${currentFormat?.gradient} … shadow-lg`,
  `:120,151,165,199` `"bg-primary text-primary-foreground shadow-lg shadow-primary/20"`,
  `:227` `className="gap-2 shadow-lg shadow-primary/20"`.
- `TeamsStep.tsx:108` `"ring-2 ring-primary shadow-md"`,
  `:126-129` `w-10 h-10 rounded-lg … background: linear-gradient(135deg, ${teamColor}, ${teamColor}99)`.
- `TeamForm.tsx:94-100` gradient preview chip `linear-gradient(135deg, ${color}, ${color}cc)` + `bg-white/5`,
  `:113` `shadow-lg shadow-primary/20`.
- `QuickAddTeams.tsx:206,268,272-275,293` — `shadow-md`, gradient row tints, gradient avatar, glow button.

**Hard-coded semantic colours that bypass the token set.**
- `StepIndicator.tsx:28` `bg-emerald-500 text-white`, `:45` `isPast ? "bg-emerald-500" : "bg-border"`.
- `TeamsStep.tsx:74` `className={teamValidation.valid ? "bg-emerald-500" : ""}`.
- `TeamsStep.tsx:99` `const teamColor = team.color || "#3b82f6";` — a Tailwind blue literal as a fallback.
- `CreateSessionDialog.tsx:188` `text-emerald-500`, `:227` `text-amber-500`, `:253` `text-amber-500/80 … bg-amber-500/10`.
- `ShareSession.tsx:95-97` `"bg-amber-500/20 text-amber-500 border-amber-500/30"` / `"bg-blue-500/20 …"`.
- `QuickAddTeams.tsx:17-66` — 64 hard-coded hex values across 8 presets.
- `color-picker.tsx:6-17` `DEFAULT_TEAM_COLORS` — 10 saturated hues (`#ef4444` … `#ec4899`) that fight the
  cream/navy paper stock.
Matchbook has `--mb-green`, `--mb-gold`, `--mb-red`, `--mb-teal`, `--mb-plum` for exactly these roles.

**Wrong typography everywhere.** Measured from the live DOM
(`diag-create-flows.mjs` → `DIALOG-STYLES`): dialog title computed
`font-family: ui-sans-serif, system-ui…`, `text-transform: none`. Matchbook headings are
`matchbook-display` (Oswald, uppercase, `letter-spacing: .02em`) — see `Panel.tsx:37`. Not one heading,
label, button or numeral in this whole file group uses the display face or `tabular-nums` (except
`QuickAddTeams.tsx:177`, which uses `tabular-nums` with the wrong font).

**Wrong geometry.** Measured: dialog `border-radius: 12px`, `border: 1px solid`. Matchbook panels are
`border-radius: 4px`, `border: 1.5px solid var(--mb-navy)` with `border-top-width: 4px`
(`globals.css:97-106`). Wizard controls use `rounded-xl` (`NameStep.tsx:117,148,196`), `rounded-2xl`
(`:67`), `rounded-3xl` (`TeamsStep.tsx:52`), `rounded-full` (`StepIndicator.tsx:25`) — a rounded-soft
vocabulary the redesign has abandoned.

**Icon set is inconsistent within a single file.** `page.tsx:5` imports `ArrowLeftIcon` from heroicons
while `NameStep.tsx:3` imports `ArrowLeft, Trophy` from lucide and `useNewCompetitionPage.tsx:4-5` mixes
heroicons with local `@/lib/icons`. Matchbook uses one SVG sprite via `MbIcon`
(`public/assets/matchbook/icons/sprite.svg`, 37 ids in `manifest.json`).

**The format's own identity is thrown away on step 3.** `NameStep.tsx:69` renders a generic
`<Trophy className="w-7 h-7 text-white" />` instead of `currentFormat.icon`. The user picks "Win 2 & Out"
with a crown and is shown a trophy (see `d-08-name-step-win2out.png`).

### 2.2 Mobile ergonomics failures

Measured tap targets at 390×844 (`diag-create-flows.mjs`). WCAG 2.1 AA target minimum is 44×44.

| Control | File | Measured | Verdict |
|---|---|---|---|
| "Select All" | `TeamsStep.tsx:77-84` | **84 × 32** | fail |
| "Quick Add Team" | `TeamsStep.tsx:85-93` | **148 × 32** | fail |
| "Back" (steps 2 & 3) | `TeamsStep.tsx:150`, `NameStep.tsx:220` | **80 × 36** | fail |
| "Back to Competitions" | `page.tsx:59-66` | **184 × 36** | fail |
| Text input (name, venue) | `ui/input.tsx:11` (`h-9`) | **× 36** | fail |
| Standings-points number inputs | `AdvancedSettingsPanel.tsx:66,79,89` | **130 × 36** | fail |
| Allow-ties switch | `AdvancedSettingsPanel.tsx:116` (`h-6 w-11`) | **44 × 24** | fail |
| Advanced-settings disclosure | `AdvancedSettingsPanel.tsx:35` | **448 × 36** | fail (height) |
| Colour swatch | `color-picker.tsx:36` (`w-10 h-10`) | **40 × 40** | fail |
| Dialog close ✕ | `ui/dialog.tsx:72` (`size-4` + `p-0`) | ~**16 × 16** | severe fail |
| Format card | `FormatStep.tsx:36` | 358 × 272 | pass, but wastes a screen per option |

Beyond targets:

- **The primary action is never sticky.** `Create Competition` sits at the end of the document
  (`NameStep.tsx:224-232`). With Advanced Settings expanded on mobile the user must scroll past the whole
  form to reach it (`m-04-name-advanced-open.png`, `d-30-name-advanced-scrolled.png`).
- **Four segmented options squeezed into one row at 390 px.** `NameStep.tsx:189-207` renders
  `Single Game / Best of 3 / Best of 5 / Best of 7` as `flex gap-2` with `flex-1`; `:109-129` does the same
  for courts. It fits `court` (`m-05-name-step-win2out.png`) but the venue label is **user-supplied free
  text** (`AdvancedSettingsPanel.tsx:137-142`) — "field", "table", "lane", "pitch"… `1 swimming lanes`
  overflows immediately.
- **Team names truncate to uselessness.** `TeamsStep.tsx:139` `<span className="font-medium truncate">` in a
  2-column grid gives `Coastal Co…`, `Northgate …`, `Westside …` (`m-02-teams-step.png`). Two teams whose
  names share a prefix become indistinguishable.
- **The action row on step 2 wraps badly.** `TeamsStep.tsx:70` `flex items-center justify-center gap-3`
  puts the count badge, Select All and Quick Add on one centred line; at 390 px they collide with the
  screen edges (buttons start at x=148 and x=245 of 390).
- **The bulk-add dialog does not fit a phone.** Measured `QuickAddTeams` content box at 390×844:
  **top 42 px, height 760 px** — 42 px of breathing room top and bottom. The colour-preset grid is
  `grid-cols-2` (`QuickAddTeams.tsx:220`) so "Monochrome" clips to "Monochrom", and the entire Preview
  section (`:256-286`) — the thing the dialog exists to show — is pushed below the fold behind the footer
  (`m-21-quickaddteams.png`). Worse, the preview has its own `max-h-40 overflow-y-auto` (`:261`), i.e. a
  scroller nested inside a scroller inside a modal.
- **No bottom-sheet behaviour.** `ui/dialog.tsx:63` centres with `top-[50%] left-[50%] translate-…` at every
  breakpoint. On a phone a modal should dock to the bottom edge (thumb reach) with safe-area padding.
- **`DialogContent` has no default height cap or scroll containment.** Only `QuickAddTeams` sets
  `max-h-[90vh]` (`:151`). `TeamForm` (`:47 sm:max-w-md`) has none — a long name plus the preview chip can
  push the footer off-screen with no way to scroll.
- **Android hardware Back exits the wizard.** `step` lives in `useState`
  (`useNewCompetitionPage.tsx:85`) and never touches the URL. Back from step 3 leaves `/competitions/new`
  entirely and destroys the format choice, the team selection and every advanced setting. This is the
  single worst mobile behaviour in the flow.

### 2.3 Inconsistency with the already-redesigned pages

| Redesigned pattern | Where it is established | What the create flow does instead |
|---|---|---|
| `matchbook-surface` + sidebar + mobile bar | `teams/page.tsx:69-79` | old `<Navigation/>` (`new/page.tsx:55`) |
| Editorial masthead: display H1 + coral count box + date line + account chip | `teams/page.tsx:81-145`, `competitions/page.tsx:216-273` | centred `text-2xl font-bold` H2 (`FormatStep.tsx:25`) |
| `mb-panel` boxed sections with heavy top border and ruled head | `globals.css:97-115`, `Panel.tsx:29-49` | shadcn `Card` / bare `div`s |
| `mb-btn mb-btn-navy` / `mb-btn-coral` / `mb-btn-outline` | `globals.css:134-185` | shadcn `Button` with glow shadows |
| Hairline `divide-y divide-mb-rule` lists with crest + name + numbers | `competitions/page.tsx:290-342` | a card grid of coloured initial-letter squares |
| `Crest` / `TeamMark` from the crest pack | `Panel.tsx:55-86`, `types.ts:170-178` | `team.name.charAt(0)` on a gradient square (`TeamsStep.tsx:126-137`) |
| `PanelEmpty` empty-state voice: "No X exists yet — …" | `Panel.tsx:146-163`, used 12× | "No teams available / Create some teams first…" (`TeamsStep.tsx:55-58`) |
| `mb-select-native`, `mb-search`, `mb-input` form shells | `globals.css:296-367` | shadcn `Input` |
| `mb-kicker` micro-labels | `globals.css:212-219` | `text-sm font-medium` / `text-xs text-muted-foreground` |
| `tabular-nums` on all figures | used throughout the matchbook pages | only `QuickAddTeams.tsx:177` |

Note that `/teams` **already imports these dialogs** (`teams/page.tsx:184-213`) — so the inconsistency is
not merely between routes, it is inside a single viewport (`d-20`, `d-21`, `d-22`).

### 2.4 Product logic defects found while reading (must not be carried over)

1. **`pointsForTie` is silently dropped.** `useNewCompetitionPage.tsx:217-221` computes `isCustomized` from
   `pointsForWin`, `pointsForLoss`, `allowTies`, `venueName` — **not** `pointsForTie`. A user who enables
   ties, sets Tie = 1, and leaves everything else default gets `config === undefined` and loses the setting.
2. **`useState` used as an effect.** `QuickAddTeams.tsx:95-97`:
   ```tsx
   useState(() => {
     setStartNumber(existingTeamCount + 1);
   });
   ```
   The initialiser runs once, on mount; the returned state is discarded. Because the dialog is mounted
   permanently by `/teams` (`teams/page.tsx:192`), `startNumber` never refreshes — bulk-add twice and the
   second batch restarts the numbering, producing duplicate team names.
3. **Bulk-add avatar shows the wrong character.** `QuickAddTeams.tsx:278`
   `{team.name.charAt(team.name.length - 1)}` — the *last* character. "Team 12" previews as "2".
4. **Naive pluralisation.** `useNewCompetitionPage.tsx:231` `venuePlural: venueName + "s"` → "boxs",
   "pitchs". `NameStep.tsx:105,125` does the same inline.
5. **Number inputs are unvalidated.** `AdvancedSettingsPanel.tsx:71,82,93` `Number(e.target.value)` —
   clearing the field yields `0`, and `min`/`max` on a non-form input are decorative.
6. **Advanced settings are unreachable for elimination formats.** `AdvancedSettingsPanel.tsx:21-26` gates on
   `round_robin | two_match_rotation | win2out`, so a bracket competition can never rename its venue even
   though `CompetitionConfig.terminology` applies to it.
7. **"Quick Create Team" creates a colourless team and does not select it.**
   `useNewCompetitionPage.tsx:265-268` calls `addTeam("Team N")` with no colour; the new team is not added
   to `selectedTeamIds`, so from the empty state the user creates a team and the Next button stays disabled.
8. **The created competition's id is thrown away.** `useNewCompetitionPage.tsx:238-248` — `createCompetition`
   returns the new id and the wizard discards it, then `router.push("/competitions")` lands on a list where
   the new draft may not even be the selected row.
9. **Silent permission failure.** `AppContext.tsx:252` `if (isSharedMode && !canEdit) return "";`.
10. **Courts silently cap at 4.** `NameStep.tsx:110` `Math.min(maxCourts, 4)` with no "more courts" affordance.
11. **`nameError` is nearly dead.** `NameStep.tsx:226` disables the button when the name is blank, so
    `setNameError` only fires via the <kbd>Enter</kbd> handler (`:93-97`).
12. **No accessible error wiring on the wizard's only text field.** `TeamForm.tsx:75-76` correctly sets
    `aria-describedby` / `aria-invalid`; `NameStep.tsx:85-99` sets neither.
13. **`role="checkbox"` / `role="button"` on `Card` with no visible focus ring.** `TeamsStep.tsx:102-121`,
    `FormatStep.tsx:36-55` — keyboard focus is invisible; there is no `focus-visible` style on `Card`.
14. **Step changes are not announced.** No `aria-live`, no `aria-current="step"` (`StepIndicator.tsx`), no
    focus move to the new step's heading.
15. **`ColorPicker` is a `role="radiogroup"` without roving tabindex** (`color-picker.tsx:47-51`) — ten tab
    stops, and arrow keys do nothing.
16. **Copy failures are invisible.** `CreateSessionDialog.tsx:67-69`, `ShareSession.tsx:49-51`.
17. **Secrets are hidden in `type="password"` fields with no reveal.** `CreateSessionDialog.tsx:236`,
    `ShareSession.tsx:180` — the admin *URL* is masked, so a user cannot verify what they are about to send.
18. **Dialog reset is coupled to the animation duration.** `CreateSessionDialog.tsx:86-90`
    `setTimeout(…, 200)`.
19. **Developer-facing copy in a user-facing modal.** `CreateSessionDialog.tsx:98-101` "Firebase Not
    Configured … Add your Firebase configuration to the environment variables."

---

## 3. Target design

### 3.0 Shared shell (applies to the wizard route)

Adopt the exact shell from `teams/page.tsx:68-79`:

```
<div class="matchbook-surface min-h-screen">
  <div class="flex">
    <MatchbookSidebar/>                     {/* ≥lg, 218px, sticky */}
    <div class="min-w-0 flex-1">
      <MatchbookMobileBar active="/competitions" cta={{href:"/competitions", label:"Cancel"}}/>
      <main class="px-4 py-5 sm:px-6 lg:px-8"> … </main>
```

**Masthead** (replaces `page.tsx:59-69` and the three centred `<h2>` blocks):

```
NEW COMPETITION.            ┌──────┐   STEP 2 OF 3 — SELECT TEAMS
   ^display 4xl/5xl,        │  2   │   ROUND ROBIN • 12 TEAMS AVAILABLE
    "COMPETITION" in coral  │ STEP │
                            └──────┘
                                        [ CANCEL ]  [ BACK ]  [ NEXT → ]
```
- `h1.matchbook-display text-4xl sm:text-5xl` — `New <span class="text-mb-coral">Competition</span>`.
- Coral-bordered count box (`border-[2px] border-mb-coral`, `matchbook-display`) showing the step number
  over the word `STEP` — identical construction to `teams/page.tsx:86-93`.
- Right block: `mb-kicker` line + `matchbook-display text-[0.74rem]` summary line, exactly like
  `competitions/page.tsx:236-240`.
- Actions pinned right with `ml-auto`: `Cancel` (`mb-btn mb-btn-outline-navy`), `Back`
  (`mb-btn mb-btn-outline-navy`, hidden on step 1), primary (`mb-btn mb-btn-coral`).
  The primary lives **in the masthead at ≥lg and in a sticky bottom bar below lg** (see §3.5).
- Account chip: reuse the `teams/page.tsx:124-143` block verbatim.

**Loading**: replace `PageLoadingSpinner` with an `MbLoading` that renders the matchbook surface + sidebar
skeleton and three ruled placeholder panels. Never the old `<Navigation/>`.

**Step rail** replaces `StepIndicator.tsx` entirely:
- ≥lg: a **vertical rail inside a left panel** (`xl:col-span-3`) — three ruled rows, each
  `[ 01 ] FORMAT / Round Robin`, `[ 02 ] TEAMS / 12 selected`, `[ 03 ] DETAILS / —`. Completed rows carry a
  `MbIcon id="check"` in `--mb-green` and an inset `box-shadow: inset 3px 0 0 var(--mb-teal)` (the
  standings-leader treatment from `competitions/page.tsx:162`). The current row uses
  `inset 3px 0 0 var(--mb-coral)` (the selected-row treatment from `:300`). Completed rows are buttons.
- <lg: a horizontal strip directly under `MatchbookMobileBar`, `01 ─ 02 ─ 03` with `matchbook-display`
  labels, hairline connectors, coral for current, green for done. 48 px tall.
- `<ol>` with `aria-current="step"` on the active `<li>`.

### 3.1 Step 1 — Format

Desktop (≥xl), 12-col grid:
- `xl:col-span-3` — step rail panel (above).
- `xl:col-span-9` — `<Panel title="Choose a Format" meta={<span class="mb-kicker">5 Formats</span>}>`
  containing a `grid gap-4 sm:grid-cols-2 2xl:grid-cols-3` of **format cards** built exactly like the
  toolkit tiles in `tools/page.tsx:141-159`:

```
┌─ 1.5px navy ───────────────┐   selected: + 4px navy top border,
│ ( ◎ )  ROUND ROBIN         │   inset 4px coral left rule, paper-bright fill,
│        Every team plays…   │   and a small coral ▸ SELECTED kicker.
│  MIN 3 TEAMS   •  LEAGUE   │   hover: bg rgba(7,50,77,0.04)
└────────────────────────────┘   focus-visible: 2px coral outline, offset 1px
```
  - Icon: `MbIcon` in a `h-11 w-11 rounded-full border-[1.5px] border-mb-navy` circle
    (`tools/page.tsx:146-148`). Map: `round_robin → "chart"`, `single_elimination → "bracket"`,
    `double_elimination → "clipboard"`, `win2out → "star"`, `two_match_rotation → "swap"`.
  - Accent per format, replacing the five gradients:
    `round_robin → --mb-teal`, `single_elimination → --mb-navy`, `double_elimination → --mb-plum`,
    `win2out → --mb-coral`, `two_match_rotation → --mb-gold`. The accent tints only the icon glyph and the
    kicker — never a fill or a gradient.
  - Title `matchbook-display text-[0.95rem] font-bold tracking-[0.06em]`; description
    `text-[0.76rem] leading-snug text-mb-ink-muted`; min-teams as an `mb-kicker`, not a `Badge`.
  - Cards below the selectable minimum for the current library size (e.g. `min 4` when only 3 teams exist)
    render at `opacity-50` with a `NEEDS 4 TEAMS` kicker in `--mb-gold` — but stay selectable, because the
    Teams step can create teams.
- A right rail (`xl:col-span-4` on a second row, or stacked under the grid) shows a
  `<Panel title="Format Preview" tone="navy" icon="bracket">` — a 3-line plain-English explanation of what
  the chosen format generates ("10 teams → 45 matches, one round"). This uses information the app already
  computes and gives the panel grid a second column so the page reads like the other matchbook screens
  instead of a lone card grid.

Mobile: single column. Format cards become full-width ruled rows (`divide-y divide-mb-rule` inside one
panel) — icon circle 40 px, title, one-line description, min-teams kicker, and a right-hand radio box
(`mb-score-box`-style 22 px square that fills navy with a check when chosen). Five rows fit one screen;
today five cards take five screens.

### 3.2 Step 2 — Teams

Desktop, 12-col:
- `xl:col-span-3` step rail.
- `xl:col-span-6` — `<Panel title="Team Directory">` with the `mb-search` filter in the header
  (`teamPanels.tsx:43`) and a hairline-divided **selectable list**, not a card grid:

```
 ☐ | crest | SURGE                    | Spring League 2026 | 5-0 | ▓▓▓▓▓
 ☑ | crest | COASTAL COMETS V. CLUB   | Harbour Cup        | 1-0 | ▓
```
  - Row height 44 px, `px-4 py-2.5`, `hover:bg-[rgba(7,50,77,0.04)]`, selected row carries
    `inset 3px 0 0 var(--mb-coral)`.
  - Checkbox is a 20 px navy-bordered square that fills navy with a white `MbIcon id="check"`.
  - `Crest` from `Panel.tsx:55` — drop the coloured initial square entirely.
  - Name uses `matchbook-display font-bold text-[0.9rem]` and is allowed **two lines** before truncating.
  - Columns collapse progressively: record and form hide below `sm`.
  - Header row (`mb-table th` styling) with a "select-all" checkbox, `TEAM`, `ENTERED IN`, `W-L`, `FORM`.
- `xl:col-span-3` — `<Panel title="Entry List" tone="navy" icon="teams">` — a **live roster of the current
  selection** with the count as a big `matchbook-display tabular-nums` figure, a validation line, and the
  bye notice for elimination formats rendered as an `MbNotice tone="warn"`:
  `“12 teams entered · bracket of 16 · 4 byes”`. This turns today's tiny green `Badge`
  (`TeamsStep.tsx:71-76`) into the panel that justifies the step. It also hosts
  `Select All / Clear` (`mb-btn mb-btn-outline-navy`, full width, 44 px) and
  `+ Add Team` / `⚡ Quick Add` which open the **redesigned dialogs** (§3.4) rather than silently
  inserting `Team N`.

Mobile: the two panels stack — Entry List **first** (so the count and validation are visible without
scrolling), then the directory list. Search is sticky under the mobile bar. Selected rows float to the top
of the list on mobile only (a `SELECTED (5)` / `AVAILABLE (43)` two-section list) so a 48-team library
stays navigable.

"Too much data": the list is windowed above ~60 rows, search is always present, and the Entry List panel
caps its visible roster at 12 with a `+ 36 more` line. No horizontal scroll at any width.

Empty state: `PanelEmpty`-styled — *"No teams exist yet — a competition needs at least 3 entrants."* with
two `mb-btn` actions (`Create a team`, `Quick add 4 teams`) that open the real dialogs. This requires
`PanelEmpty` to accept an `onAction` callback (it only takes `href` today, `Panel.tsx:146-163`).

### 3.3 Step 3 — Details & configuration

Desktop, 12-col — this step becomes a **two-column setup sheet**, not a 448 px centred stack:
- `xl:col-span-3` step rail.
- `xl:col-span-5` — `<Panel title="Event Details">`
  1. **Name** — `MbField` + `MbTextInput`, 44 px, `mb-input` shell, error as an `MbNotice tone="danger"`
     wired with `aria-invalid` + `aria-describedby`.
  2. **Format summary** — a ruled row: format icon in the navy-bordered circle, format name in display
     type, `12 TEAMS ENTERED` kicker, and a `Change` link back to step 1. Uses the **format's own icon**,
     not a trophy.
  3. Format-conditional config, each as an `MbSegmented`:
     - Courts (`two_match_rotation | win2out`, `maxCourts > 1`) — `1–4` with the venue word, wrapping to
       2×2 below `sm`; the derived line "`4 teams play at once · 8 in queue`" as an `mb-kicker` under it.
     - Scoring mode (`two_match_rotation | win2out`) — `Score Points | Instant Win`, with the explanatory
       line as an `mb-kicker`.
     - Series length (`round_robin | single_elimination | double_elimination`) —
       `Single | Bo3 | Bo5 | Bo7`, 4-up at ≥sm, 2×2 below.
- `xl:col-span-4` — `<Panel title="Advanced Settings">`, **expanded by default on desktop, collapsed on
  mobile** (the disclosure becomes a 48 px ruled header button with a `chevron-down`/`chevron-up`
  `MbIcon`). Contents:
  - Standings points (`round_robin`) — three `MbNumberStepper`s in a `grid-cols-3` with `−`/`+` 44 px
    buttons and display-face numerals. Tie stepper is visibly disabled *and* labelled
    `REQUIRES TIES` when `allowTies` is false.
  - Allow ties — `MbToggle` (44 px row, square knob).
  - Venue terminology — `MbTextInput` **plus a plural field** (auto-filled from a small pluralise helper,
    user-overridable) so `venuePlural` stops being `venueName + "s"`. Available for **all five formats**.
  - A "Reset to defaults" `mb-panel-link`.
- `xl:col-span-12` (or the masthead at ≥lg) — the commit bar. See §3.5.

Mobile ordering: name → format summary → format-conditional segments → advanced (collapsed) → sticky
action bar. Advanced never pushes the primary action out of reach because the action bar is fixed.

**Post-create**: route to `/competitions/{id}` using the id `createCompetition` already returns
(`useNewCompetitionPage.tsx:238`), not to the list.

### 3.4 Dialogs — one matchbook modal language

Every dialog in scope becomes an `MbDialog` (§4.1). Shape:

```
┌─ 4px navy top border ───────────────────────────┐
│ ⌗ CREATE TEAM                              [✕]  │  ← ruled header, matchbook-display,
├─────────────────────────────────────────────────┤    44px close target
│  (scrolling body, paper-bright, hairline rules) │
├─────────────────────────────────────────────────┤
│                 [ CANCEL ]     [ CREATE TEAM ]  │  ← ruled footer, mb-btn
└─────────────────────────────────────────────────┘
```
- Overlay: `rgba(7, 50, 77, 0.45)` (navy ink wash) instead of `bg-black/50` (`ui/dialog.tsx:41`).
- ≥sm: centred, `max-w` per size, `max-h-[min(88dvh, 720px)]`, body is the only scroller.
- <sm: **docked bottom sheet** — full width, `rounded-t-[4px]`, 4 px navy **top** border doubles as the
  grab rail, `padding-bottom: env(safe-area-inset-bottom)`, footer pinned.

**TeamForm** — header `CREATE TEAM` / `EDIT TEAM` with `MbIcon id="teams"`.
Body: name `MbField`; `MbSwatchPicker` on the matchbook palette (44 px squares, not circles, navy
selection ring, roving tabindex); **preview becomes a real matchbook team row** — `Crest` + display-type
name + colour chip + `mb-kicker` reading the hex — replacing the gradient banner (`TeamForm.tsx:94-105`).
Footer: `Cancel` (`mb-btn-outline-navy`) / `Create Team` (`mb-btn-coral`). Add a duplicate-name warning
(`MbNotice tone="warn"`, non-blocking).

**QuickAddTeams** — header `QUICK ADD TEAMS`, `MbIcon id="import"`.
Body is a two-column grid at ≥sm and stacked below:
- Count: `MbNumberStepper` — 56 px `−`/`+`, `matchbook-display text-5xl tabular-nums` figure, `TEAMS`
  kicker. Keep the 2–16 clamp.
- Naming style: `MbSegmented` (5 options, wraps).
- Colour style: the 8 presets as ruled rows with a 4-swatch strip, name in display type, description in
  `text-mb-ink-muted` — **one column on mobile**, so nothing truncates. Re-key the presets to matchbook-safe
  palettes and keep "Custom" pointing at `MbSwatchPicker`.
- Preview: a hairline-divided list of the exact rows that will be created (crest + name + colour chip),
  **not** a nested scroller — it lives in the dialog's own scroll region.
Footer: `Cancel` / `Create 8 Teams`. Fix `startNumber` (derive it, don't store it) and the
last-character initial.

**DeleteConfirmDialog** — `tone="danger"`: 4 px `--mb-red` top border, header
`DELETE TEAM?` with `MbIcon id="warning"` in red. Body states the blast radius explicitly
("This permanently removes **Surge** and its 5 match records."). Footer: `Cancel` is the **wide, primary-
weight** button; `Delete` is `mb-btn` with a red border and red text, right-aligned but not thumb-default.
For competition deletion (which destroys every child match) require a typed confirmation of the
competition name.

**CreateSessionDialog** — two panels inside one dialog, step 1 `NAME YOUR SESSION`, step 2
`SESSION CREATED`. Share code renders in an `mb-score-box`-derived **code block**: display face,
`tracking-[0.35em]`, `tabular-nums`, navy border. Admin token uses `MbCopyField` with a **reveal toggle**
and an `MbNotice tone="warn"` (hairline gold box, `MbIcon id="lock"`) instead of the emoji warning
(`:253-255`). `!isConfigured` becomes a user-facing `MbNotice`: *"Live sharing is unavailable — this
installation has no cloud backend configured."* Add explicit `isLoading` (button shows
`CREATING…`, disabled), `error` (`MbNotice tone="danger"`), and offline (`navigator.onLine === false`)
states.

**ShareSession** — header `SHARE SESSION` with the role as a bordered `matchbook-display` chip
(`CREATOR` gold / `ADMIN` navy / `VIEWER` muted — replacing `:95-97`). Session info becomes a ruled row
with the crest. Viewer link and admin link both use `MbCopyField`; admin link gets the reveal toggle and a
gold `MbNotice`. Native share stays as the primary on touch, copy on desktop, and **both** now emit a
"Copied" confirmation.

### 3.5 Where the primary action lives

- **≥lg**: in the masthead, right-aligned, alongside `Back` / `Cancel`. Never scrolls away because the
  masthead is above a grid that fits.
- **<lg**: `MbStickyActionBar` — `fixed inset-x-0 bottom-0`, paper-bright, 1.5 px navy top border,
  `padding-bottom: env(safe-area-inset-bottom)`, containing `Back` (outline, 30 %) and the primary
  (coral, 70 %, 48 px tall). Main gets `pb-24` so nothing hides behind it. The bar also carries the
  step's live status line (`12 TEAMS ENTERED` / `SELECT AT LEAST 3 TEAMS`) as an `mb-kicker` above the
  buttons, replacing the centred badge.
- Inside dialogs the footer is always pinned and never scrolls.

### 3.6 Wizard navigation & URL

Put the step in the URL: `/competitions/new?step=teams`. Keep all wizard state in the hook, but
`router.push` on advance and `router.back()` on retreat, so:
- Android/browser Back moves *between steps*, not out of the flow.
- The step is shareable and survives a reload of the tab (state does not, so pair it with a
  `sessionStorage` draft keyed `tt:new-competition-draft` that restores format/teams/config and is cleared
  on submit or explicit cancel).
- Guard the browser Back at step 1 with the standard "Discard this competition?" `MbDialog` only if
  anything has been chosen.

---

## 4. Interaction & motion

The matchbook language is print. Motion is **paper-like**: things slide and settle, they do not bounce,
scale or glow. Everything below must be wrapped by `@media (prefers-reduced-motion: reduce)`
(already global at `globals.css:1240`, but the new components must not rely on `!important` alone —
disable transforms explicitly).

**Should animate**

| Element | Motion | Spec |
|---|---|---|
| Step change | Horizontal slide + fade of the step panel column only | 180 ms `cubic-bezier(.2,.7,.3,1)`; forward = enter from +16 px, back = enter from −16 px; masthead, rail and action bar stay put |
| Step rail progress | The connector rule fills from left | 220 ms width transition, `--mb-rule` → `--mb-green` |
| Panel entrance on route load | Staggered fade-up | reuse `animate-fade-in` + `stagger-1..6` (`globals.css:1300-1330`), 40 ms apart, first paint only |
| Format card select | Border-top thickens 1.5→4 px, coral left rule wipes in | 140 ms; **no scale, no ring, no shadow** |
| Team row toggle | Checkbox square fills navy; row's coral inset rule wipes in from the left | 120 ms |
| Entry-list count | Digit change cross-fades in place | 120 ms opacity only — **not** a spring flip |
| Segmented control | The navy active cell slides between segments | 160 ms `transform` on a single absolutely-positioned indicator |
| Advanced disclosure | Height auto-animate + chevron rotate | 200 ms; chevron 180° |
| Dialog open (≥sm) | Fade + 8 px rise | 160 ms in / 120 ms out. Replaces `zoom-in-95` (`ui/dialog.tsx:63`) |
| Dialog open (<sm) | Slide up from the bottom edge | 220 ms in / 160 ms out, `cubic-bezier(.2,.7,.3,1)` |
| Overlay | Fade | 160 ms |
| Copy confirmation | `Copy` icon cross-fades to `Check` in `--mb-green`, label swaps to `COPIED` | 120 ms, reverts after 2 s (behaviour already exists — give it the matchbook look) |
| Button press | `filter: brightness(1.08)` on hover, 1 px downward nudge on `:active` | matches `globals.css:167-169`; no scale |
| Sticky action bar | Slides up on first mount only | 200 ms |
| Validation notice | Fade + 4 px rise | 140 ms |

**Must NOT animate**

- Numbers in standings/points steppers must not spring or flip (`motion/index.tsx` `numberFlip` is for the
  live scoreboard only).
- No `hover:scale-*` anywhere — remove `color-picker.tsx:59-61`.
- No glow/`shadow-primary/20` transitions.
- No layout-shifting hover on rows or cards (background tint only).
- No entrance animation on individual team rows — a 48-row stagger is jank; animate the containing panel.
- No animation on the sticky bar's contents when the step changes (label swaps are instant).
- No cross-route page transition — the sidebar and masthead must feel like a fixed printed frame.
- No skeleton shimmer; use static ruled placeholders.
- Dialog **content** never animates internally (no per-field stagger) — the sheet moves, the content is
  already composed.
- `mb-live-dot` pulse (`globals.css:228-240`) belongs to live matches and must not leak into this flow.

---

## 5. New primitives required

Ordered by leverage. ⭐ = certainly shared with the remaining un-redesigned screens
(match console, competition detail, session viewer, summary, rotations tool).

### 5.1 ⭐⭐⭐ `MbDialog` — the single highest-value primitive in the redesign
`src/components/matchbook/MbDialog.tsx`
```tsx
type MbDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: string;                      // sprite id
  kicker?: string;                    // e.g. "TEAM DIRECTORY"
  description?: string;
  tone?: "paper" | "navy" | "danger"; // drives the 4px top border colour
  size?: "sm" | "md" | "lg";          // 26rem / 32rem / 42rem
  mobile?: "sheet" | "center";        // default "sheet"
  dismissible?: boolean;              // default true
  footer?: React.ReactNode;           // rendered in the pinned ruled footer
  children: React.ReactNode;          // the scrolling body
};
```
Wraps `@radix-ui/react-dialog` (keeps focus trap, Escape, `aria-labelledby`). Guarantees: 44 px close
target, `max-h` + `overscroll-contain` body, safe-area padding, `matchbook-display` title,
navy-ink overlay, correct enter/exit motion per breakpoint.
**Shared with 15 existing call sites**: `auth/SessionAuth`, `competition-detail/{EndCompetition,
MatchAction,StartCompetition}Dialog`, `CreateSessionDialog`, `dialogs/edit-match/EditMatchDialog`,
`dialogs/edit-queue/EditQueueDialog`, `dialogs/team-form/TeamForm`, `GuestMatchComplete`, `Header`,
`match/MatchCompleteDialog`, `match/RotateDeviceDialog`, `QuickAddTeams`, `shared/DeleteConfirmDialog`,
`ShareSession`. Build it here; every later brief consumes it.

### 5.2 ⭐⭐ `MbField` + `MbTextInput` + `MbTextArea`
`src/components/matchbook/form.tsx`
```tsx
<MbField label="Competition Name" hint="Shown on every scoreboard" error={nameError} required htmlFor="x">
  <MbTextInput id="x" value={v} onChange={setV} placeholder="e.g. Summer Tournament 2026"
               invalid={!!nameError} maxLength={60} icon="clipboard" />
</MbField>
```
`MbField` owns the `mb-kicker` label, the hint line, the error `MbNotice`, and wires `aria-describedby` /
`aria-invalid` automatically. `MbTextInput` renders the existing `.mb-input` shell at **48 px** with
`font-size: 16px` on mobile (prevents iOS zoom — the current `ui/input.tsx:11` already does this via
`text-base md:text-sm`; preserve it). Shared with: every remaining screen that accepts typed input.

### 5.3 ⭐⭐ `MbSegmented`
```tsx
<MbSegmented
  value={matchSeriesLength}
  onChange={setMatchSeriesLength}
  name="series-length"
  options={[{value:1,label:"Single"},{value:3,label:"Best of 3"},…]}
  columns={{ base: 2, sm: 4 }}
  size="md"        // 48px rows
/>
```
One hairline-ruled box, navy active cell, `role="radiogroup"` with arrow-key roving tabindex, wraps
instead of squeezing. Replaces **four** ad-hoc pill rows in `NameStep`/`QuickAddTeams`.
Shared with: competition detail (view switcher), match console (set/scoring mode), rotations tool
(5-1 / 6-2 system picker).

### 5.4 ⭐⭐ `MbNumberStepper`
```tsx
<MbNumberStepper value={pointsForWin} onChange={setPointsForWin}
                 min={0} max={10} step={1} label="Win" suffix="pts"
                 disabled={false} size="sm|lg" />
```
44/56 px `−`/`+` buttons, display-face `tabular-nums` figure, clamps on change and on blur, keyboard
arrows, `aria-valuenow/min/max`. Fixes `Number("") → 0`. Shared with: quick-add count, match target score,
rotation counts.

### 5.5 ⭐ `MbToggle`
```tsx
<MbToggle checked={allowTies} onChange={setAllowTies}
          label="Allow ties" hint="Enable if matches can end in a draw" />
```
Full 44 px row is the hit target; the switch itself is a squared navy track with a paper knob.

### 5.6 ⭐ `MbSwatchPicker`
```tsx
<MbSwatchPicker value={color} onChange={setColor}
                palette="matchbook" | "vibrant" | string[]
                size={44} allowCustom />
```
Roving-tabindex radiogroup, 44 px squares (4 px radius, not circles), selected = 2 px navy ring + inset
check, hex readout, optional native `<input type="color">` escape hatch. Retires `ui/color-picker.tsx`.

### 5.7 ⭐ `MbCopyField`
```tsx
<MbCopyField label="Viewer Link" value={shareUrl} secret={false}
             mono display={false} onCopied={() => …} />
```
Read-only value, copy button with `Copy → Check/COPIED` transition, optional reveal toggle for secrets,
**and a visible failure state** when `navigator.clipboard` is unavailable. Used ×4 in
`CreateSessionDialog` + `ShareSession`; shared with the session viewer and summary pages.

### 5.8 ⭐ `MbNotice`
```tsx
<MbNotice tone="info|warn|danger|success" icon="lock" title="Keep this secret">
  Anyone with this link can edit scores.
</MbNotice>
```
Hairline-bordered box in the tone colour, `matchbook-display` title, no emoji, no tinted fills beyond
`rgba(tone, .06)`. Replaces `⚠️` paragraphs, `text-destructive` lines and amber tint blocks everywhere.

### 5.9 `MbStepRail`
```tsx
<MbStepRail
  steps={[{id:"format",label:"Format",value:"Round Robin"},…]}
  current="teams" onNavigate={(id)=>…}
  orientation="vertical|horizontal" />
```
Semantic `<ol>`, `aria-current="step"`, completed steps clickable. Shared with `CreateSessionDialog`
(already 2-step) and any future setup wizard.

### 5.10 `MbSelectList` / `MbSelectRow`
```tsx
<MbSelectList
  items={rows} getKey={r=>r.id}
  selected={selectedIds} onToggle={id=>…} onSelectAll={…}
  search={q} onSearchChange={setQ}
  columns={[{key:"comp",header:"Entered in",hide:"sm"},…]}
  renderPrimary={r => <TeamMark team={r.team}/>}
  emptyMessage="No teams exist yet — …"
  windowed
/>
```
The hairline multi-select list. Shared with `dialogs/edit-queue/EditQueueDialog` and competition-detail
roster management.

### 5.11 `MbChoiceCard`
```tsx
<MbChoiceCard icon="bracket" accent="var(--mb-plum)" title="Double Elimination"
              description="…" kicker="MIN 4 TEAMS" selected onSelect={…} disabledReason?="…" />
```
The format tile; also the tools-hub tile (`tools/page.tsx:141-159` is this component, inlined) and any
future "pick a thing" grid.

### 5.12 `MbStickyActionBar`
```tsx
<MbStickyActionBar status="12 teams entered" secondary={{label:"Back",onClick}}
                   primary={{label:"Create Competition", onClick, disabled, loading}} />
```
Below `lg` only; safe-area aware; the page adds its own bottom padding via a returned constant.
Shared with match console and competition detail.

### 5.13 `MbPageShell` + `MbMasthead`
```tsx
<MbPageShell active="/competitions" mobileCta={{href,label}}>
  <MbMasthead title={<>New <em>Competition</em></>} badge={{value:"2",label:"Step"}}
              lines={["Step 2 of 3 — Select teams","Round Robin • 12 teams available"]}
              actions={<>…</>} />
  …panels…
</MbPageShell>
```
The masthead block is currently copy-pasted ~60 lines into `teams`, `competitions`, `quick-match`,
`tools` and `summaries`. **Extract it before seven more pages copy it again.** This is the
highest-leverage refactor in the whole redesign programme even though it is not strictly required by this
screen group.

### 5.14 `MbLoading`
Replaces `PageLoadingSpinner`. Renders `matchbook-surface` + sidebar + ruled placeholder panels, no old
`<Navigation/>`. Touches every gated route.

### 5.15 Data/token additions (not components)
- `FORMAT_META: Record<CompetitionType, { label, blurb, icon, accent, minTeams }>` in
  `src/components/matchbook/` — removes the JSX-in-hook smell at `useNewCompetitionPage.tsx:39-80` and lets
  the compete console, the detail page and the wizard label formats identically
  (`useMatchbookCompete.ts:7-13` already has a partial duplicate — merge them).
- `pluralise(word: string)` helper in `src/lib/` to kill `venueName + "s"`.
- `MbEmpty`: extend `PanelEmpty` (`Panel.tsx:146-163`) with `onAction?: () => void` and `icon?: string`.

---

## 6. Risks

**Blast radius**
- `ui/dialog.tsx` has **15 call sites**, `ui/input.tsx` has 7, `ui/sheet.tsx` is used only by
  `nav-parts/MobileNav.tsx`. Do **not** restyle `ui/dialog.tsx` in place — introduce `MbDialog` and migrate
  call sites screen-by-screen, otherwise the still-old screens (match console, competition detail) get a
  half-matchbook look mid-programme.
- `PageLoadingSpinner` change touches every gated route in one commit; verify `/teams`, `/competitions`,
  `/summaries`, `/quick-match`, `/tools`, `/competitions/new` all still render.

**Correctness hazards during conversion**
- The format-conditional rendering in `NameStep` is three separate predicates over five format values
  (`:102`, `:137`, `:181`) plus a fourth in `AdvancedSettingsPanel:21-26`. Moving these into `FORMAT_META`
  is desirable but is the easiest place to silently drop a capability. Write a table test that, for each of
  the five `CompetitionType` values, asserts which config controls render.
- `maxCourts = Math.floor(selectedTeamIds.length / 2)` (`useNewCompetitionPage.tsx:189-191`) is recomputed
  from the selection; changing team selection after choosing 4 courts can invalidate `numberOfCourts` — the
  current code does not re-clamp it. Preserve/close this in the redesign, don't inherit the bug quietly.
- `isCustomized` (`:217-221`) must gain `pointsForTie`; changing it changes when `config` is persisted, so
  competitions created before/after behave differently in `calculateStandings`. Verify against
  `src/lib/roundRobin.ts`.
- Bye messaging (`:133-146`) is the only place the app explains bracket padding. Keep it.

**Firestore / shared-session dependencies**
- `CreateSessionDialog` depends on `useSession().createNewSession` (async, throws), `isLoading`, `error`,
  `isConfigured`, and mounts `SessionAuth` as a **second, nested dialog** (`:268-272`). Nested Radix dialogs
  and a bottom-sheet mobile treatment interact badly — decide now whether `SessionAuth` becomes a step
  inside `MbDialog` rather than a sibling modal.
- `ShareSession` returns `null` when `!session || !isSharedMode` (`:84-86`) — a "dialog" that renders
  nothing. `MbDialog` must tolerate this (render nothing, don't mount a portal).
- **Bulk add is broken in shared mode.** `useTeamsPage.handleQuickAddTeams` (`useTeamsPage.ts:44-50`) loops
  `addTeam`, and `AppContext.addTeam` in shared mode does
  `syncAllData({ teams: [...(session.teams || []), newTeam] })` (`AppContext.tsx:196-199`) against a
  **stale** `session` for every iteration — so 8 teams become 1, and it fires 8 Firestore writes. Fix as
  part of this work or the redesigned Quick Add will look like it fails.
- `createCompetition` returning `""` on permission denial (`AppContext.tsx:252`) needs a real return
  contract (`{ ok: false, reason: "permission" }`) so the wizard can show an `MbNotice` instead of routing
  away.

**Performance**
- `TeamsStep` recomputes `selectedTeamIds.includes(team.id)` inside the map and re-renders every card on
  every toggle. At 48 teams (`d-11`, `m-11`) that is 48 gradient-backed cards per keystroke-equivalent.
  The new list must memoise rows and pass a `Set`.
- Each `addTeam` dispatch serialises the whole `AppState` to localStorage (`appReducer.ts` `STORAGE_KEY`).
  A 16-team quick-add = 16 full serialisations. Batch it (`addTeams`) while converting.
- No virtualisation anywhere; a 200-team library is plausible for a club. `MbSelectList` should window
  above ~60 rows.

**Layout traps**
- `globals.css:393-399` sets `html, body { height: 100%; overflow-x: hidden }`. Measured on the name step:
  `documentElement.scrollHeight = 900` while `body.scrollHeight = 1257` — the document element cannot grow.
  A `position: fixed` sticky action bar is fine, but any `position: sticky` inside the main column and any
  `100vh`/`100dvh` panel must be anchored to the `.matchbook-surface` wrapper, not to `body`. This also
  makes full-page screenshots clip, which will confuse future visual regression work.
- `MatchbookSidebar` is `sticky top-0 max-h-screen` (`Sidebar.tsx:21`); the sticky action bar must not sit
  above it in z-order on the tablet breakpoint where both are visible.
- iOS keyboard + bottom sheet: the pinned dialog footer must use `dvh`, not `vh`, or the primary action
  hides behind the keyboard when the name field is focused.

**Behaviour changes users will notice (call them out in the PR)**
- Wizard step now lives in the URL and browser Back moves between steps.
- After creating, the user lands on the competition, not the list.
- "Quick Create Team" no longer silently inserts `Team N`; it opens the team dialog.
- Advanced settings are available for elimination formats.

**Content/product open questions**
- `team.color` is captured by `TeamForm`/`QuickAddTeams` but the matchbook pages render deterministic
  crests via `crestForTeam` (`types.ts:170-178`); only `TeamProfilePanel` shows the hex. Decide whether
  colour tints the crest, picks the crest, or is retired — otherwise the redesigned colour picker is asking
  for data nothing displays.
- The eight crest slugs are name-matched (`types.ts:158-171`), so "Storm 1" and "Storm 2" share a crest.
  With 48 teams, collisions are guaranteed. Either accept it or add a variant/tint dimension.

---

## 7. Definition of done

**Visual system**
- [ ] `/competitions/new` renders inside `matchbook-surface` with `MatchbookSidebar` + `MatchbookMobileBar`;
      no import of `@/components/Navigation` remains in the scope files.
- [ ] Zero `bg-linear-to-*` / `bg-gradient-*`, zero `ring-primary`, zero `shadow-*-primary/*`,
      zero `rounded-2xl|3xl|full` (except the deliberate icon circles) in the scope files.
- [ ] Zero literal colour values (`#…`, `emerald-500`, `amber-500`, `blue-500`) outside a documented
      palette map; all semantic colour flows from `--mb-*` tokens.
- [ ] Every heading, button label, kicker and numeric uses `matchbook-display`; every figure uses
      `tabular-nums`.
- [ ] All icons come from `MbIcon` / the sprite; no heroicons or lucide imports remain in the scope files.
- [ ] A screenshot of `/teams` with `TeamForm`, `QuickAddTeams` and `DeleteConfirmDialog` open is
      indistinguishable in system from the page behind it.

**Layout & responsive**
- [ ] Verified at 390×844, 768×1024, 1280×800, 1440×900 and 1920×1080; no horizontal scroll at any width
      (`document.scrollWidth === window.innerWidth`).
- [ ] Verified at 390×844 with the venue word set to a 12-character string; no segmented control overflows.
- [ ] Verified with 0, 1, 3, 12 and 48 teams; and with a 60-character team name.
- [ ] Verified at 844×390 (landscape phone) — the wizard remains usable and the action bar does not eat
      the viewport.
- [ ] The primary action is reachable without scrolling at every step, at every tested size.

**Accessibility**
- [ ] Every interactive target ≥ 44×44 CSS px (re-run `diag-create-flows.mjs`; the failing-target list must
      be empty).
- [ ] Keyboard: full traversal of all three steps and all five dialogs; visible `focus-visible` on every
      control; roving tabindex on the swatch picker and both segmented/radio groups.
- [ ] `aria-current="step"` on the rail; step transitions announced via a polite live region; the step
      heading receives focus on advance.
- [ ] Name/venue/points fields wired with `aria-invalid` + `aria-describedby`; validation messages in a
      polite live region.
- [ ] Contrast ≥ 4.5:1 for text and ≥ 3:1 for control borders against `--mb-paper-bright`, including the
      disabled and error states.
- [ ] `prefers-reduced-motion: reduce` removes every transform/slide listed in §4.

**Functional parity (no capability lost)**
- [ ] All five formats selectable, with their min-team rules and the bye message for non-power-of-2
      elimination entries.
- [ ] Select all / deselect all; per-team toggle; live validation count.
- [ ] Courts 1–4 for `two_match_rotation`/`win2out` gated on `maxCourts > 1`, with the "plays at once / in
      queue" derivation.
- [ ] Scoring mode (Score Points / Instant Win) for `two_match_rotation`/`win2out`.
- [ ] Series length 1/3/5/7 for `round_robin`/`single_elimination`/`double_elimination`.
- [ ] Standings points W/T/L, allow-ties, venue terminology — **and `pointsForTie` now persists**.
- [ ] `<kbd>Enter</kbd>` in the name field still submits.
- [ ] Team create/edit with name + colour; bulk add with count/naming/colour preset and correct numbering
      on repeat opens; delete confirmation with `isDeleting`; session create (both steps + not-configured);
      session share (viewer link always, admin link for creator/admin only, native share with copy
      fallback).

**New behaviour**
- [ ] Step is reflected in the URL; browser/Android Back steps backwards through the wizard.
- [ ] Draft survives reload via `sessionStorage`; cleared on submit and on explicit cancel.
- [ ] Successful create routes to `/competitions/{id}`.
- [ ] Permission-denied, offline, in-flight and copy-failure states all render a visible `MbNotice`.
- [ ] Quick Add in shared mode creates every team (single batched write).

**Engineering**
- [ ] `npx tsc --noEmit` clean.
- [ ] `npx eslint src/app/competitions/new src/components/competitions/new src/components/matchbook src/components/dialogs src/components/QuickAddTeams.tsx src/components/CreateSessionDialog.tsx src/components/ShareSession.tsx src/components/shared/DeleteConfirmDialog.tsx` clean.
- [ ] `npx vitest run` green, with new tests for: the format→controls matrix, `isCustomized` including
      `pointsForTie`, number-stepper clamping, and quick-add numbering across repeat opens.
- [ ] New primitives live in `src/components/matchbook/` and are consumed by at least this screen group;
      `ui/color-picker.tsx` is either deleted or reduced to a re-export.
- [ ] `useNewCompetitionPage.tsx` no longer contains JSX (renamed to `.ts` once `FORMAT_META` owns the
      icons).
