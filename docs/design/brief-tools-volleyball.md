# Redesign brief — Volleyball rotation tools

**Screen group:** `/tools/volleyball-rotations`, `/tools/volleyball-rotations/my-formations`,
`/tools/volleyball-rotations/shared/[shareId]`
**Status today:** pre-Matchbook. Runs on the legacy "playful warm cream/red" theme, the legacy
`<Navigation />` top bar, shadcn `Button`/`Badge`, Heroicons, hand-rolled modals, and a seven-hue player
palette. Nothing in this group has been touched by the Matchbook conversion.
**Audited against:** `docs/design/benchmark-rubric.md` (D1–D10 + hard fails).
**Evidence:** screenshots and DOM measurements at 1440×900 and 390×844, captured 2026‑08‑09 against the running
dev server; measurement scripts in the session scratchpad (`pw/measure.mjs`, `pw/diag-editor.mjs`,
`pw/diag-template.mjs`, `pw/diag-order.mjs`).

---

## 1. Inventory

### 1.1 Routes

| Route | File | Auth | Data source |
| --- | --- | --- | --- |
| `/tools/volleyball-rotations` | `src/app/tools/volleyball-rotations/page.tsx` | public; extra features when signed in | static libs + Firestore (`formations` collection, live subscription) |
| `/tools/volleyball-rotations/my-formations` | `src/app/tools/volleyball-rotations/my-formations/page.tsx` | **required** (`useRequireAuth`, redirects to `/login?redirect=…`) | Firestore live subscription |
| `/tools/volleyball-rotations/shared/[shareId]` | `src/app/tools/volleyball-rotations/shared/[shareId]/page.tsx` | public (read), sign-in required to copy | Firestore one-shot query on `shareId` + `visibility == "unlisted"` |

Entry points into the group: `src/app/tools/page.tsx` (already Matchbook — its `TOOLS` array links to both
the designer and My Formations), plus the legacy `Tools` dropdown in `src/components/nav-parts/DesktopNav.tsx:87`
and `MobileNav.tsx:154`.

### 1.2 Components in scope

| Component | File | Role |
| --- | --- | --- |
| `VolleyballCourt` | `components/volleyball/VolleyballCourt.tsx` | read-only SVG half-court: gradient court, net, 3 m attack line, centre line, zone numerals 1–6, overlap lines, movement arrows, player nodes, mode caption |
| `PlayerNode` | `components/volleyball/PlayerNode.tsx` | one player token; spring-animated position, selection ring w/ glow filter, dashed back-row ring, `Z{zone}` caption |
| `OverlapLine` | `components/volleyball/OverlapLine.tsx` | dashed constraint line between two zones; blue = front/back, orange = left/right; thickens when either endpoint is selected |
| `MovementArrow` | `components/volleyball/MovementArrow.tsx` | contact→base transition arrow, shortened at both ends to clear node radii |
| `RotationControls` | `components/volleyball/RotationControls.tsx` | prev/next + 1–6 stepper, setter/attacker status badges, serving↔receiving segmented toggle, Libero ON/OFF, Overlaps and Arrows visibility toggles |
| `LegendPanel` | `components/volleyball/LegendPanel.tsx` | rotation summary + one selectable row per role on court (colour dot, full name, description, back-row tag, zone), plus a mini key |
| `HelpAccordion` | `components/volleyball/HelpAccordion.tsx` | five collapsible explainers (rotations, overlap lines, arrows, libero, formation differences) |
| `FormationSelector` | `components/volleyball/FormationSelector.tsx` | dual-mode. Simple = 5 built-ins. Enhanced = category tabs + grids + create/sign-in affordance + trade-off strip |
| `FormationCategoryTabs` | `components/volleyball/FormationCategoryTabs.tsx` | Built-in / Templates / My Formations / Shared pills with counts; last two conditionally visible |
| `FormationCard` | `components/volleyball/FormationCard.tsx` | saved-formation row: name, visibility badge, description, ≤3 tags + overflow, updated date, Select/Edit/Duplicate/Share/Delete |
| `FormationEditorModal` | `components/volleyball/FormationEditorModal.tsx` | full create/edit/duplicate editor shell (overlay, header, draft prompt, two-column body, footer) |
| `FormationEditorCourt` | `components/volleyball/FormationEditorCourt.tsx` | editable court: drag nodes, arrow-draw mode with live cursor preview, Escape to cancel |
| `DraggablePlayerNode` | `components/volleyball/DraggablePlayerNode.tsx` | pointer-capture drag with RAF-throttled commit, keyboard nudge (0.005 / Shift 0.02 / Ctrl 0.05), live x,y readout, drag/selection/arrow-source rings |
| `ArrowControls` | `components/volleyball/formation-editor/ArrowControls.tsx` | Draw Arrow / Done / Cancel, live instruction chip, per-role arrow chips with remove |
| `RotationNavigator` | `components/volleyball/formation-editor/RotationNavigator.tsx` | R1–R6, serving/receiving, Show Libero checkbox |
| `QuickActions` | `components/volleyball/formation-editor/QuickActions.tsx` | Copy Frame / Paste Frame / Reset Rotation |
| `FormationDetails` | `components/volleyball/formation-editor/FormationDetails.tsx` | collapsible name / description / tags / visibility |
| `ValidationPanel` | `components/volleyball/formation-editor/ValidationPanel.tsx` | blocking errors (≤3 shown) + overlap warnings (≤5 shown) |
| `CourtGrid`, `CourtSvgDefs`, `ArrowLayer` | `components/volleyball/formation-editor/*` | editor court chrome, gradients/markers/grid pattern, arrow rendering + preview |
| `ShareFormationDialog` | `components/volleyball/ShareFormationDialog.tsx` | enable sharing → share URL + copy, disable sharing (Make Private) |

### 1.3 State & logic that must survive the redesign

Domain logic (`src/lib/volleyball/*`) is sound and stays as-is:

- `rotations.ts` — `ROTATION_CHART` (6 rotations × 6 zones), `SERVE_RECEIVE_ADJUSTMENTS` for 5 built-in
  formations, `TARGET_POSITIONS`, `isSetterFrontRow`, `getFrontRowAttackerCount`, `getRoleZone`,
  `getBackRowMiddle`, `buildPlayerPositions`, `buildMovementArrows`.
- `overlap.ts` — 6+ `OVERLAP_CONSTRAINTS` (FIVB 7.4), `ADJACENCY_PAIRS`, `getRelatedZones`.
- `formationValidation.ts` — `validateFormation`, `getBlockingErrors` (missing / out-of-bounds positions for the
  six core roles across 12 frames), `getOverlapWarnings`, `isFormationValid`.
- `templateFormations.ts` — 2 templates (`neutral`, `standard-5-1`), `cloneFormationData`.
- `userFormations.ts` — Firestore CRUD, `enableSharing`/`disableSharing` (nanoid(10) share id),
  `getFormationByShareId`, `subscribeToUserFormations`, `getFormationShareUrl`, undefined-stripping sanitizer.
- `constants.ts` — `PLAYER_COLORS`, `PLAYER_INFO`, `ZONE_POSITIONS`, `BACK_ROW_ZONES`, `COURT_SVG`
  (400×300 + 40 padding, node radius 24, attack line at y = 0.55).
- `coordinateUtils.ts` — `toSvgCoords` / `fromSvgCoords` (normalised 0..1, y flipped, 0 = end line).

Hooks: `useVolleyballRotation` (rotation/mode/formation/libero + derived players/arrows/overlaps, with a
custom-formation-data branch), `useUserFormations` (live list, CRUD, share, `getById`), `useFormationEditor`
(12-frame working copy, dirty tracking, per-frame copy/paste, reset rotation / reset all, arrow CRUD,
validation, localStorage draft under `volleyball-formation-editor-draft` with a 30 s autosave), `useRequireAuth`.

**Capabilities that must not be lost:** 6 rotations × 2 modes; libero substitution of the back-row middle;
5 built-in receive formations with trade-off copy; 2 starter templates; overlap-line and arrow visibility
toggles; player selection cross-highlighting court ⇄ legend ⇄ overlap lines; setter-position / attacker-count
readout; per-role movement arrows drawn on the court; drag + keyboard-nudge positioning at three step sizes;
copy/paste a frame between rotations/modes; reset one rotation; validation split into blocking vs warning;
draft recovery; create / edit / duplicate; private ↔ unlisted with share link, copy-to-clipboard and revoke;
public read-only viewer with "copy to my formations"; provenance (`baseSource`) tracking.

### 1.4 State matrix (what exists today)

| State | Where | Today |
| --- | --- | --- |
| Auth loading | my-formations `page.tsx:120-131` | bare `animate-spin` circle, no chrome |
| Not authenticated | my-formations | `useRequireAuth` redirects to `/login?redirect=…`; renders the same spinner meanwhile |
| Guest on designer | rotations `page.tsx:190`, `FormationSelector.tsx:186-194, 268-282` | "Manage My Formations" link hidden; "Sign in to create" pill; custom tab hidden entirely (`FormationCategoryTabs.tsx:40`) |
| Formations loading | my-formations `page.tsx:206-209` | spinner only |
| Formations empty | my-formations `page.tsx:210-222` | grey sentence + red button, inside a dashed/soft box |
| Formations error | my-formations `page.tsx:200-204` | red tint strip, raw `error.message`, no retry |
| **Offline / Firestore unreachable** | — | **verified: renders the empty state as if the account had zero formations.** No offline label, no retry, no error. `useUserFormations` never surfaces the cache-miss |
| Custom tab, signed in, zero formations | `FormationSelector.tsx:283-297` | duplicate empty state, different copy from my-formations |
| Shared formation loading | shared `page.tsx:165-176` | spinner only, no timeout |
| Shared formation missing / unshared | shared `page.tsx:179-199` | centered `Formation Not Found` + one button; also the fallback for any thrown error, including "missing Firestore index" |
| Shared: signed out | shared `page.tsx:272-287` | "Sign in to copy" card |
| Shared: copying / copied | shared `page.tsx:259-270` | button text swaps, turns `bg-green-500`, then auto-navigates after 1.5 s |
| Editor: draft found | `FormationEditorModal.tsx:219-239` | inline banner, Load Draft / Start Fresh |
| Editor: unsaved changes | `FormationEditorModal.tsx:202-204` | grey "Unsaved changes" text in header |
| Editor: saving | `:336-340` | button label → "Saving…" |
| Editor: save error | `:321-323` | red text in the footer |
| Editor: validation | `ValidationPanel.tsx` | shown only when non-empty; **caps at 3 errors / 5 warnings with "…and N more" and no way to see the rest** |
| Editor: no frame | `:292` | court silently not rendered |
| Delete confirm (designer) | rotations `page.tsx:120` | **native `window.confirm`** |
| Delete confirm (my-formations) | `page.tsx:105-117, 238-260` | click-to-arm with a **3 s silent timeout**, plus a blurred overlay drawn over the card |
| "Too much data" | — | **absent.** No search, filter, sort, pagination or virtualisation on the formations list; no tag filtering; card shows only the first 3 tags |

---

## 2. What's wrong today

### 2.1 Hard fails against the rubric

1. **Two design systems on one screen — the entire group is pre-Matchbook** (rubric hard fail 4).
   `page.tsx:171` `<div className="min-h-screen bg-background">` + `page.tsx:172` `<Navigation />`;
   every card is `"rounded-2xl border border-border bg-card p-4 md:p-6 shadow-soft"`
   (`page.tsx:234`, `:252`, `:266`, `:292`; shared `page.tsx:295`, `:313`, `:330`, `:341`).
   Headings are `"text-3xl md:text-4xl font-black tracking-tight mb-2 uppercase"` (`page.tsx:182`) instead of
   `matchbook-display`. Accent is `--primary` red, not `--mb-coral`. No `matchbook-surface`, no paper grain,
   no `mb-panel`, no `MatchbookSidebar` / `MatchbookMobileBar`, no crest.

2. **A second icon library** (hard fail 7). `RotationControls.tsx:6-12` imports
   `ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon` from `@heroicons/react/24/outline`;
   `HelpAccordion.tsx:4` imports `ChevronDownIcon`. Elsewhere the group hand-rolls inline `<svg>` paths
   (`FormationEditorModal.tsx:211-213`, `ShareFormationDialog.tsx:119-132`, `ArrowControls.tsx:69-83`,
   `FormationDetails.tsx:44-51`). `MbIcon` is used nowhere.

3. **Touch targets under 44 px, everywhere** (hard fail 2). Measured at 390×844 on `/tools/volleyball-rotations`,
   25 interactive elements are under 44 px in at least one axis:
   - rotation stepper digits and prev/next: **40×40** (`RotationControls.tsx:70`, `:56`, `:89`)
   - Serving **80×36** / Receiving **93×36** (`:117`, `:133`)
   - Overlaps **94×30**, Arrows **84×30** (`:173`, `:197`)
   - category tabs Built-in **94×32**, Templates **113×32**, My Formations **119×32** (`FormationCategoryTabs.tsx:58`)
   - `+ Create` **71×24** (`FormationSelector.tsx:181`)
   - **player nodes on the court: 31×42 to 35×44** — the primary interaction object of the whole tool
   - editor: arrow-remove buttons are `p-0.5` around a `w-3 h-3` glyph (`ArrowControls.tsx:96-99`);
     Show Libero is a native `w-4 h-4` checkbox (`RotationNavigator.tsx:88`).

4. **Spinner-only loading for content** (hard fail 8). Three occurrences of the identical
   `"animate-spin rounded-full h-8 w-8 border-b-2 border-primary"`: my-formations `page.tsx:126` and `:208`,
   shared `page.tsx:171`. Two of them are full-page blocking spinners.

5. **Numbers that reflow** (hard fail 13). No `tabular-nums` anywhere in the group. The worst case is
   `DraggablePlayerNode.tsx:360` — `{position.x.toFixed(2)}, {position.y.toFixed(2)}` re-typesets on every
   drag frame under the node being dragged. Rotation digits, zone captions (`PlayerNode.tsx:114`), counts
   (`page.tsx:196` `Your Formations ({formations.length})`), and tab counts are all proportional figures.

6. **Broken keyboard access in both dialogs** (hard fail 15). Neither `FormationEditorModal` nor
   `ShareFormationDialog` has `role="dialog"`, `aria-modal`, a focus trap, an initial-focus target, or an
   Escape handler. `FormationEditorModal.tsx:186` closes only on a click that lands exactly on the overlay.
   Escape is handled only *inside* the court SVG (`FormationEditorCourt.tsx:140-151`). Focus can tab straight
   out of the modal into the page behind it, which is still mounted and still has `body { overflow: hidden }`
   applied (`FormationEditorModal.tsx:165-174`).

7. **Information conveyed by colour alone** (hard fail 10). Overlap constraint type is *only* hue+dash:
   `OverlapLine.tsx:39-46` `oklch(0.6 0.15 250 / 0.4)` vs `oklch(0.6 0.15 45 / 0.4)` — the legend
   (`HelpAccordion.tsx:81-92`) calls them "Blue dashed lines" and "Orange dotted lines", so a colour-blind or
   greyscale reader cannot map legend to court. Player identity is carried by seven hues
   (`constants.ts:6-14`) with the label repeated but the hue doing the grouping work.

8. **Console errors present on the screen** (hard fail 17). With Firestore unreachable the pages emit repeated
   `@firebase/firestore … Could not reach Cloud Firestore backend` plus `ERR_CONNECTION_REFUSED`, and nothing in
   the UI reacts. `npx tsc --noEmit` is clean; `npx eslint` on the scope reports **10 warnings**, all dead code:
   `constants.ts:94` `FRONT_ROW_ZONES`, `formationValidation.ts:274,289`, `templateFormations.ts:183`,
   `userFormations.ts:147,226,236,349,394,415`.

9. **Native browser dialog as a destructive confirm.** `page.tsx:120`
   `if (window.confirm("Are you sure you want to delete this formation?"))`. On my-formations the alternative is
   worse: `page.tsx:113` `setTimeout(() => setDeletingId(null), 3000)` silently disarms the confirm after three
   seconds, and Delete sits immediately beside Share with no separation (`FormationCard.tsx:147-167`) —
   destructive adjacent to frequent (hard fail 14).

### 2.2 Functional defects found while auditing

10. **The Templates tab does nothing.** Verified: selecting a template sets `aria-pressed="true"` on the card,
    swaps the description strip, and **leaves the court unchanged**. Cause: `page.tsx:38-43` treats any
    non-built-in id as a custom formation and resolves it with `getById` (`useUserFormations`), which only
    searches the user's Firestore documents; template ids resolve to `undefined`, so
    `customFormationData` stays `null` and `useVolleyballRotation` keeps rendering the previously selected
    *built-in*. The UI asserts a state the render does not honour.

11. **The Shared category is dead code on every route.** `FormationSelector` supports `sharedFormation`
    (`:31`, `:319-338`) but no caller ever passes it, so `showShared` is always false
    (`FormationCategoryTabs.tsx:42`). The shared route doesn't render a `FormationSelector` at all.

12. **The formation editor is unusable on a phone.** Measured at 390×844: the editor court's bounding box is
    at **top = 1060 px** inside an `overflow-hidden` modal capped at `max-h-[90vh]` (`FormationEditorModal.tsx:192`).
    The left column is `lg:w-80 … overflow-y-auto min-h-0` (`:244`) but its `scrollHeight === clientHeight`, so it
    does not scroll, and the wrapper at `:242` (`flex-1 min-h-0 flex flex-col lg:flex-row`) has no scroller of its
    own. **The court is clipped and unreachable — you cannot position a single player from a phone.** The footer
    also overdraws the Description field (see `shots/audit-tools-volleyball/D-editor-mob.png`,
    `F-editor-mob-sidebar-bottom.png`).

13. **Even at 1440×900 the editor's metadata form is cut off.** Description, Tags and Visibility sit below the
    modal's visible area with no scroll affordance (`H-editor-longname-desk.png`); the only clue that they exist
    is that Name is the last thing rendered.

14. **Mobile hierarchy is inverted.** Measured section tops on a 844 px viewport (page is 2915 px tall):
    controls 293, court 558 (only **243 px tall**), formation picker 842–1530, help accordion 1554–2072,
    **Players legend 2096–2843**. The legend cross-highlights the court, and it lives 2.5 screens below it.
    The help accordion — pure reference prose — is promoted above the legend by `page.tsx:283-286` vs `:302-305`.

15. **Offline masquerades as empty.** With Firestore down, my-formations renders "Your Formations (0)" and
    "You haven't created any formations yet." A user with saved formations is told they have none, and the
    primary action offered is to create another.

16. **No timeout or index-failure handling on the public share route.** `getFormationByShareId` issues a
    two-`where` query (`userFormations.ts:169-174`) that requires a composite index in production; if the index
    is missing, the thrown error lands in the same generic "Formation Not Found" page (`shared page.tsx:179-199`),
    which tells the visitor the owner un-shared it. Wrong and unrecoverable.

### 2.3 Old-system artefacts that must go (complete list)

- `<Navigation />` and the legacy Tools dropdown, on all three routes.
- `bg-background`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-accent*`, `--primary`,
  `shadow-soft`, `rounded-2xl` / `rounded-xl` / `rounded-lg` / `rounded-full` card and button chrome.
- Raw Tailwind palette classes: `bg-red-50 dark:bg-red-900/20 text-red-700` (my-formations `:201`,
  `ValidationPanel.tsx:29`), `bg-blue-100 text-blue-700 dark:bg-blue-900/30` (shared `:220`,
  `FormationCard.tsx:64`), `bg-green-500` (shared `:265`, `ShareFormationDialog.tsx:152`, `:171`),
  `bg-purple-500/20 border-purple-500/50 text-purple-700` (`RotationControls.tsx:156`),
  `bg-amber-500/20 … text-amber-700` (`:178`), `bg-blue-500/20 … text-blue-700` (`:202`, `LegendPanel.tsx:89`),
  `text-amber-600 / text-blue-600` (`LegendPanel.tsx:40`), `text-orange-600 hover:bg-orange-50`
  (`QuickActions.tsx:42`), `stroke-blue-400/60 dark:stroke-blue-300/60` (`PlayerNode.tsx:85`,
  `DraggablePlayerNode.tsx:328`), `text-red-500` (`FormationCard.tsx:162`, `FormationDetails.tsx:67`,
  `ShareFormationDialog.tsx:212`, `FormationEditorModal.tsx:322`).
- Hard-coded court greens: `oklch(0.55 0.12 145 / 0.25)`→`0.10` gradient and `oklch(0.55 0.12 145 / 0.5)`
  stroke (`VolleyballCourt.tsx:85-86, 121`; `CourtGrid.tsx:40-41`; `CourtSvgDefs.tsx`).
- The seven-hue `PLAYER_COLORS` map (`constants.ts:6-14`) as the *primary* identity channel.
- shadcn `Button` and `Badge` (`RotationControls.tsx:4-5, 53, 86, 99, 103`).
- `drop-shadow-md` / `shadow-md` / `shadow-lg` / `shadow-2xl` / `backdrop-blur-sm` on nodes, cards and overlays.
- `MotionDiv` + `slideUp` page-entrance wrappers (`page.tsx:176`, `:202`; my-formations `:139`, `:162`, `:189`;
  shared `:207`, `:245`) — replaced by the Matchbook entrance vocabulary (§4).
- `filter="url(#glow)"` Gaussian glow on selection rings (`PlayerNode.tsx:76`, `DraggablePlayerNode.tsx:306`).
- Dashed "add" affordances (`my-formations page.tsx:175` `border-2 border-dashed`).

### 2.4 Accessibility & semantics

- `VolleyballCourt.tsx:67-75`: `<svg role="img" … onClick … onKeyDown … tabIndex={0}>` — an `img` that is
  focusable and clickable. Should be a `group`/`application` region with a proper label, or the interaction
  should live on the nodes only.
- `PlayerNode` / `DraggablePlayerNode` use `role="button"` + `aria-pressed` on `<g>` elements with no accessible
  focus ring (SVG `:focus` is unstyled) — focus is invisible.
- Tab counts render as decoration inside the label (`FormationCategoryTabs.tsx:70-80`) with no
  `aria-label` conveying "3 formations".
- `HelpAccordion` uses `aria-expanded` but no `aria-controls`/region association.
- The share URL field is `readOnly` with `focus:outline-none` (`ShareFormationDialog.tsx:164`).
- The libero substitution is announced nowhere; the court simply swaps MB for L.

### 2.5 Performance hazards

- `useFormationEditor.ts:185` — `useRef<FormationData>(getInitialData())`. The argument is evaluated on **every
  render**, so a full 12-frame deep clone (`JSON.parse(JSON.stringify(...))`) runs on every drag frame,
  every keystroke in the name field, and every rotation switch. The result is discarded after the first render.
- `updatePlayerPosition` (`:202-215`) deep-clones the whole `FormationData` (12 frames × 7 roles + arrows) per
  committed drag frame, i.e. up to 60×/s.
- `validationErrors`, `blockingErrors`, `overlapWarnings`, `isValid` (`:316-319`) are four separate full-corpus
  passes recomputed on every `formationData` identity change — which the clone above guarantees on every frame.
- `FormationEditorCourt` recomputes `getBackRowMiddle`, `getRoleZone` and `getPlayersToRender` on every render
  without memoisation (`:67-138`).
- `VolleyballCourt` renders all overlap lines inside `AnimatePresence` siblings and re-creates `toSvgCoords`
  identity per render, defeating the `memo` on `OverlapLine`/`MovementArrow` children.
- `DraggablePlayerNode.tsx:286-292` runs an **infinite** framer-motion pulse for the arrow-source ring, and
  `ArrowControls.tsx:36` runs `animate-pulse`; neither is gated on `prefers-reduced-motion`. The global
  reduced-motion block (`globals.css:1240`) only neutralises CSS animation/transition, not framer springs — and
  no component in this group calls `useReducedMotion`.

---

## 3. Target design

### 3.1 Shell (all three routes)

Adopt the shipped shell verbatim from `src/app/tools/page.tsx`, `competitions/page.tsx`, `summaries/page.tsx`:

```
<div className="matchbook-surface min-h-screen">
  <div className="flex">
    <MatchbookSidebar />                       // lg+ only, 218px
    <div className="min-w-0 flex-1">
      <MatchbookMobileBar active="/tools" cta={…} />   // below lg
      <main className="px-4 py-5 sm:px-6 lg:px-8"> … </main>
```

`<Navigation />` is removed from all three files. `MatchbookSidebar` already marks `/tools` active for
`/tools/volleyball-rotations` because it matches by prefix.

The public share route is the exception: it is a link a coach sends to a parent, so it keeps the mobile bar but
uses a **guest shell** — crest + wordmark + a single "Open the designer" action, no app nav — matching how
`/summary/[shareCode]` will be treated.

### 3.2 `/tools/volleyball-rotations` — "Rotation Designer"

**Masthead** (mirrors `tools/page.tsx:86-132`):

- `matchbook-display` H1, `text-4xl sm:text-5xl`, "Rotation **Designer**" with `Designer` in `text-mb-coral`.
  Drop the "5-1 Volleyball Rotations" phrasing into a kicker beneath: `mb-kicker` → `5-1 SYSTEM · 6 ROTATIONS · FIVB 7.4`.
- Beside the title, a coral-bordered **issue box** (the `tools/page.tsx:91-98` pattern) showing the live
  rotation: numeral `R1` over the label `ROTATION`. This is the single authored typographic moment and it
  doubles as the state readout.
- Right-aligned actions: primary `mb-btn mb-btn-coral` = **Save as Formation** (signed in) or **Sign in to save**
  (guest). Secondary `mb-btn mb-btn-outline-navy` = **My Formations**. Coral appears exactly once.

**Desktop grid** (`xl:grid-cols-12`, `gap-4`, matching every other Matchbook page):

| Panel | Span | Contents |
| --- | --- | --- |
| **Court** | `xl:col-span-8` | `Panel` titled `Rotation R{n} · {Serving\|Receiving}`, `meta` = the overlap/arrow visibility chips. Body = the court at `max-w-[640px]`, centred, with the control rail *above* it inside the same panel (see below). |
| **On Court** | `xl:col-span-4` | the legend, as an `mb-table`-derived list, sticky at `xl:sticky xl:top-5` |
| **Formation** | `xl:col-span-8` | category tabs + formation grid + trade-off strip |
| **Reading the Diagram** | `xl:col-span-4` | the help accordion, restyled |

The current `lg:grid-cols-[1fr_320px]` is replaced so the group matches the 12-column rhythm of Overview /
Teams / Compete / History.

**Control rail** (inside the Court panel head area, above the diagram, full width):

- Row 1 — **rotation stepper**: `‹` + six numerals + `›` as a single hairline-ruled strip
  (`border-[1.5px] border-mb-navy`, cells divided by `border-mb-rule`, no radii beyond 3 px, no pills).
  Each cell is min **48×48**, `matchbook-display`, `tabular-nums`. Active cell = navy fill / paper text
  (not coral — coral is spent on the primary action). Arrow keys ←/→ move between rotations when the strip has
  focus; `1`–`6` jump directly.
- Row 2 — **serving ⇄ receiving** as a two-cell segmented control in the same hairline idiom, min 48 px tall,
  plus the **Libero** toggle rendered as a labelled switch reading `LIBERO ON` / `LIBERO OFF` with a filled/hollow
  square marker so the state is not colour-only. Libero uses `--mb-plum` (its one categorical job).
- Row 3 — **status line**, not badges: `SETTER · BACK ROW` and `FRONT-ROW ATTACKERS · 3` set as two
  `mb-kicker` labels over `matchbook-display tabular-nums` values, separated by a vertical hairline.
  These are read-only facts and must stop looking like buttons.
- Visibility chips (`Overlaps`, `Arrows`) move to the panel header `meta` slot as `aria-pressed` toggle chips
  with `MbIcon` `check` / a new `eye` glyph, min 44 px tall.

**Court redraw** (the centrepiece — this is what makes the screen Matchbook rather than a generic diagram):

- Court fill: `--mb-paper-bright` over the page's paper grain, not green. Court boundary and centre line:
  navy hairlines (1.5 px outer, 1 px inner). Attack line: **coral** dashed — coral's second job here is
  "the 3 m line", stated once and never reused.
- Zone numerals 1–6: `matchbook-display`, `fill: var(--mb-navy)` at 10 % alpha, large, hung in the corner of
  each zone — they become the almanac texture of the diagram.
- `NET` and `END LINE` become `mb-kicker`-styled SVG text with a rule drawn through, not floating captions.
- **Player tokens** replace the seven-hue circles:
  - front row = solid navy disc, paper letterform; back row = paper disc, navy hairline ring, navy letterform.
    Row is therefore legible in greyscale, which is the current failure.
  - the Setter carries a `--mb-gold` ring (the "leader mark", consistent with the rest of the system);
    the Libero carries a `--mb-plum` disc.
  - label is `matchbook-display` (`S`, `OPP`, `OH1`, `MB2`…), zone caption below in `mb-kicker` + `tabular-nums`.
  - selected = coral 2.5 px ring + the token grows to 1.06×. No Gaussian glow.
  - hit area is a transparent circle of **r ≥ 26** (52 px) regardless of the drawn radius.
- **Overlap lines** gain a non-colour channel: front/back constraints are drawn as long-dash lines with a
  small `⊥` tick at the midpoint; left/right constraints as short-dot lines with a `↔` tick. Colours become
  `--mb-navy` at 35 % and `--mb-teal` at 45 % respectively. The help copy and legend key must name the
  *shape*, not the colour.
- **Movement arrows** stay coral-free: navy at 55 %, 2 px, with a solid navy arrowhead; the selected player's
  arrow goes to full navy at 3 px. (Coral on the court is reserved for selection + the 3 m line.)

**Legend panel ("On Court")**: an `mb-table`-style list, one row per role, uniform row height, columns
`token | role name | row | zone`. Zone right-aligned and `tabular-nums`. Selected row gets a coral left rule
(3 px) and navy fill at 4 % — the same active idiom as `mb-nav-item`. Row is a real button ≥ 48 px tall.
The mini-key at the bottom is kept but re-drawn against the new shape vocabulary.

**Formation panel**: category tabs become a hairline tab bar (bottom-rule active indicator in coral, 2 px),
not filled pills; counts render as `tabular-nums` inside the label with an `aria-label` that spells them out.
Built-in formations become a 3-up (desktop) grid of bordered cards — `border-[1.5px] border-mb-navy
bg-mb-paper-bright`, name in `matchbook-display`, description in 0.76 rem body — with the selected card
inverted to navy. The trade-off strip becomes a `mb-kicker` label + body line under a hairline rule.
**Templates must either be made functional (route template ids through `getTemplateById` into
`customFormationData`) or removed from the tabs entirely.** Recommendation: make it functional — it is one
lookup — and re-label the tab `Starters`.

**Mobile (390 px) — the ordering is inverted from today.** Single column, in this order:

1. Masthead (compressed: H1 at `text-3xl`, kicker, issue box inline).
2. **Sticky control rail** — the rotation strip + mode segment, `position: sticky; top: 0`, on
   `--mb-paper-bright` with a bottom hairline and `padding-bottom: env(safe-area-inset-…)` where relevant.
   Height budget ≤ 104 px so the court is never pushed off-screen.
3. **Court**, full-bleed to the page gutters, `min-height: 46vh`, with a **Full screen** affordance
   (rotate-to-landscape hint + `useFullscreen`) since 243 px of court on a phone is not a coaching tool.
4. **On Court legend** — moved directly under the court. Collapsed to a 3-column token grid by default
   with a "Details" disclosure that expands to the full rows; tapping a token still cross-highlights, and
   because the legend now sits within one scroll of the court, that highlight is visible.
5. Status line (setter / attackers) as a two-cell hairline strip.
6. Formation panel.
7. Reading the Diagram (help) — last. It is reference prose and belongs at the bottom.

Primary action (**Save as Formation** / **Sign in to save**) becomes a bottom-anchored bar on mobile,
inside the thumb zone, respecting `env(safe-area-inset-bottom)`.

### 3.3 `/tools/volleyball-rotations/my-formations` — "Formation Archive"

Model it on `/summaries` (the History archive), which is the closest shipped analogue.

**Masthead:** `matchbook-display` H1 `Formation **Archive**`; issue box shows the count
(`{n}` over `SAVED`); actions `mb-btn mb-btn-coral` **New Formation** and `mb-btn-outline-navy` **Open Designer**.
Breadcrumb `← Rotation Designer` becomes an `mb-panel-link` above the H1.

**Desktop grid:**

| Panel | Span | Contents |
| --- | --- | --- |
| **Saved Formations** | `xl:col-span-8` | search field (`mb-search`) + tag filter + sort (`mb-select-native`: Updated / Name / Shared first) in the panel head `meta` slot; body = `mb-table`-derived rows |
| **Start From** | `xl:col-span-4` | the two templates + "Blank court", as bordered cards with a court thumbnail |
| **Sharing** | `xl:col-span-4` | count of shared formations, list of active share links with revoke — surfaces state that is currently buried one dialog deep |

**Row design** (replaces `FormationCard`): a single `mb-table` row —
`name (matchbook-display) + description (0.7 rem muted, truncated) | tags as hairline chips | visibility |
updated (tabular-nums) | actions`. Visibility is a `mb-kicker` word (`SHARED` in `--mb-teal` / `PRIVATE` in
`--mb-ink-muted`) **plus** a filled/hollow square, never colour alone. Actions collapse into an overflow
menu at `< xl`; **Delete is separated from the rest by a hairline and sits last**, and opens the shared
`MbConfirm` dialog — never `window.confirm`, never a 3-second auto-disarm.

**Mobile:** rows become stacked cards with a 44 px-tall action row (`Open`, `Edit`, `⋯`). Search sticks
under the mobile bar. `New Formation` is a bottom-anchored coral button.

**"Too much data":** search + tag filter + sort are mandatory (they don't exist today). Above 40 rows,
paginate at 25 with an `mb-panel-link` "Show all". Long names truncate at one line with a `title`; tags show
3 + `+N` where `+N` is a real disclosure, not dead text.

### 3.4 `/tools/volleyball-rotations/shared/[shareId]` — public viewer

Guest shell (§3.1). Masthead: `mb-kicker` `SHARED FORMATION`, H1 = formation name in `matchbook-display`,
description below, tags as hairline chips. `created` / `updated` move into an `mb-table`-style two-row
"Record" block in the sidebar (`tabular-nums`).

The copy CTA becomes a `Panel` titled **Use This Formation**, with the primary `mb-btn mb-btn-coral`
("Copy to My Formations" / "Sign in to copy"). Copy success does **not** silently redirect after 1.5 s;
it swaps to a confirmed state (`SAVED TO ARCHIVE` + check icon) and offers "Open in Archive" as an explicit
link. Same court + legend as §3.2, read-only, with the control rail identical so the two screens are
recognisably the same instrument.

Error state becomes a designed editorial object rather than a centred sentence, and it **distinguishes causes**:
not-found / un-shared / network-failed each get their own copy and their own action (retry for the network case).

### 3.5 Formation editor — promote it out of the modal

The single largest structural change. The editor is a two-pane workspace with 12 frames of state, a drag
surface, validation and a draft; it does not fit a dialog, and on mobile it is currently non-functional (§2.2 #12).

**Make it a route: `/tools/volleyball-rotations/editor` (`?id=` to edit, `?from=` to duplicate, `?template=`
to start from a starter).** This is also what makes drafts, browser back, and deep links coherent.

- **Desktop:** the Matchbook shell with a masthead reading `Editing **{name}**` (or `New Formation`), an
  `UNSAVED` kicker chip when dirty, and the primary `Save` / `Update` in the masthead's right slot.
  Grid: court panel `xl:col-span-8`, tool rail `xl:col-span-4` containing, in order —
  **Frame** (R1–R6 strip + serving/receiving + Show Libero), **Arrows**, **Frame Actions**
  (Copy / Paste / Reset / Apply to all), **Details** (name, description, tags, visibility),
  **Validation**. The rail is sticky and independently scrollable with a visible scroll edge; Details is
  expanded by default in create mode (current behaviour, keep).
- **Mobile:** court fixed in the upper region (`min-height: 44vh`), a sticky frame strip under the mobile bar,
  and the rest of the tools in a **bottom sheet** with three segments (`Frame` / `Arrows` / `Details`) that
  the user drags up over the court. Save lives in a bottom bar. This is the only layout in which a phone can
  actually reposition a player.
- Validation gets a real "N errors / M warnings" summary that opens a full, scrollable list — the current
  hard caps at 3 and 5 with "…and N more" leave the user unable to fix what they can't see.
- Court chrome matches §3.2 exactly, plus: a faint navy grid at 10 % (already present via `editorGrid`),
  an `EDIT` kicker in the top-left, and a live `x, y` readout that renders in a **fixed-width box with
  `tabular-nums`** so it stops reflowing under the dragged token.
- Keep every editor capability listed in §1.3 verbatim, including the three keyboard step sizes and the
  30 s draft autosave; surface the draft prompt as a Matchbook banner inside the masthead area, and add a
  visible "Draft saved · 14:32" timestamp (`tabular-nums`) so the autosave is legible.

If keeping the modal is required for scope reasons, then at minimum: `MbDialog` (§5) with focus trap +
Escape, the *whole* body scrollable on mobile with the court first, and a footer that does not overlap.

### 3.6 Every state, designed

| State | Target |
| --- | --- |
| Loading (formations list) | `MbSkeleton` rows at the exact final row height inside the real `Panel`, panel head and filters already interactive. Never a page-blocking spinner. |
| Loading (shared formation) | Panel + court skeleton at final geometry; a spinner is allowed only inside the Copy button. |
| Empty (archive) | `PanelEmpty` editorial object: kicker + line + one coral action ("Open the designer"). Wording matches `tools/page.tsx:184-189` so the two screens agree. |
| Empty (custom tab on designer) | same component, shorter copy, same action. Remove the second divergent wording. |
| Guest | `PanelEmpty` with `Sign in` → `/login?redirect=…`; the designer itself stays fully usable. |
| Error | new `PanelError`: what failed, in one sentence, plus **Retry**. Never a raw `error.message`. |
| **Offline / stale** | new `PanelOffline` + a masthead `mb-kicker` reading `OFFLINE · SHOWING LAST KNOWN`. Detect via `navigator.onLine` and Firestore `snapshot.metadata.fromCache`, which `useUserFormations` must start exposing. Never render an empty list as if authoritative. |
| Permission denied | Firestore `permission-denied` maps to its own copy ("This formation belongs to another account") with a link to the archive — not to "Not Found". |
| Not found / un-shared | distinct copy and no retry. |
| Saving | button → `SAVING…`, form disabled, optimistic row inserted in the archive with a `PENDING` kicker that rolls back visibly on failure. |
| Destructive confirm | `MbConfirm` — names the formation, requires an explicit second action, Escape cancels. |
| Too much data | §3.3; plus the validation list (§3.5) and the tag overflow. |

---

## 4. Interaction & motion

Vocabulary, matching the rubric's D5 bands. Only `transform` and `opacity` animate.

**Entrance (page).** Chrome settles first, then content, then accent: masthead 0 ms, panels stagger at
40 ms intervals, duration 220 ms, `cubic-bezier(0.2, 0, 0.1, 1)`, `opacity 0→1` + `translateY(8px→0)`.
Cap the stagger at 6 panels. Replaces the current blanket `slideUp` (`y: 15`, 400 ms) on every block.

**Press.** Every control gets a ≤100 ms pressed state: `scale(0.97)` + a 6 % navy wash. Applies to rotation
cells, mode segments, toggle chips, legend rows, formation cards, table rows.

**Rotation change — the signature motion.** Player tokens spring to their new coordinates
(`stiffness 260, damping 26`), staggered by zone in rotation order (Z1→Z6) at 18 ms, so the eye can follow
the clockwise rotation. Overlap lines re-draw with the tokens; movement arrows fade in *after* the tokens
land (60 ms delay, 160 ms fade). The rotation numeral in the masthead issue box cross-fades with no size
change. **Nothing else on the page moves.**

**Mode change (serving ⇄ receiving).** Same token spring, no stagger (it is a simultaneous re-set, not a
rotation), 200 ms. The mode caption cross-fades.

**Libero toggle.** The MB token scales to 0.8 and cross-fades into the L token in place, 160 ms. Do not
translate — the position is the point.

**Selection.** Coral ring scales 0.9→1 in 140 ms; the linked legend row's left rule wipes in over 120 ms.
The connected overlap lines thicken via `stroke-width` transition — acceptable because it is a 2-element
change, not a layout change.

**Drag (editor).** No entrance/exit animation while dragging. The token follows the pointer through motion
values with **zero** spring (already correct in `DraggablePlayerNode`), scales to 1.08, and a hairline
drop-guide extends to the court edges so the user can read x/y against the zone numerals. On release, no
settle animation — the position is exactly where the finger left it.

**Arrow drawing.** The preview line is a 6/4 dash that does **not** animate its dash offset (marching ants
are a reduced-motion hazard and a repaint cost). The arrow-source ring pulses **once** on selection instead
of the current `repeat: Infinity`.

**Route transitions.** Designer → editor uses a shared-element transition on the court: the court panel is the
element that grows into the editor's court. Archive row → editor uses the row as the shared element.

**Must NOT animate.** Score-like numerals and counts (no flip/count-up). Table and list rows on filter/sort
— re-order instantly. Panel heights on accordion open (animate opacity + transform of the content, not
`height`, so `FormationDetails.tsx:57-59`'s `height: 0 → auto` is replaced). Skeleton→content swap (cross-fade
only, zero geometry change). The paper texture. The sticky control rail. Anything during a Firestore
subscription tick.

**Reduced motion.** A `useMbReducedMotion()` hook (§5) must gate every framer spring in this group: tokens
jump to position, rings appear instantly, the `mb-live-dot`-class pulses stop. The current global CSS block
does not reach framer-motion at all.

---

## 5. New primitives required

Ordered by how widely they're shared. Everything here belongs in `src/components/matchbook/*` or as an
`mb-*` utility in `globals.css`.

**Shared with many other screens (build these first):**

1. `MbDialog` — the Matchbook modal shell. *Needed by: every dialog in the app (global target #8), the editor
   fallback, `MbConfirm`, `ShareFormationDialog`.*
   ```tsx
   <MbDialog open onClose title="Share Formation" size="sm|md|lg|full"
             footer={<…/>} initialFocus={ref} mobile="sheet|dialog" />
   ```
   Contract: `role="dialog" aria-modal`, focus trap + restore, Escape, overlay = navy at 55 % (no blur),
   panel = `mb-panel` chrome (4 px navy top border, hairline sides, 4 px radius), body scrolls independently,
   header/footer pinned, `env(safe-area-inset-*)` respected, and **on mobile ≤ `md` it renders as a full-height
   sheet** so tall workspaces stop clipping.

2. `MbSheet` — bottom sheet with drag-to-expand snap points. *Needed by: the mobile editor tool rail; also
   the match console and competition detail filters.*
   `<MbSheet snapPoints={[0.25, 0.6, 0.92]} initial={0} header={…} />`

3. `MbConfirm` — destructive confirmation. *Replaces `window.confirm` here and
   `shared/DeleteConfirmDialog` app-wide.*
   `<MbConfirm open title verb="Delete" subject={formation.name} onConfirm onCancel destructive />`

4. `MbSkeleton` + `PanelSkeleton` — geometry-matched loading. *Needed by every panel in the app.*
   `<PanelSkeleton rows={6} rowHeight={44} />`, `<MbSkeleton w h radius />`

5. `PanelError`, `PanelOffline`, `PanelDenied` — siblings to the existing `PanelEmpty` in
   `components/matchbook/Panel.tsx`. *Needed by every data panel.*
   `<PanelError message onRetry />` · `<PanelOffline lastUpdated />` · `<PanelDenied />`

6. `MbSegment` — hairline segmented control. *Here: serving/receiving, sheet segments. Elsewhere: match
   console set switching, history date ranges.*
   `<MbSegment options={[{value,label,icon?}]} value onChange size="sm|md" fullWidth />` — 48 px min height,
   `aria-pressed`, arrow-key roving tabindex.

7. `MbStepper` — bounded numeric strip with prev/next. *Here: R1–R6. Elsewhere: set number, round number in
   competition detail.*
   `<MbStepper min={1} max={6} value onChange wrap prefix="R" label="Rotation" />`

8. `MbToggleChip` — `aria-pressed` chip with icon + non-colour on/off marker. *Here: Overlaps, Arrows, Libero.
   Elsewhere: history filters, bracket display options.*
   `<MbToggleChip icon="eye" pressed onPressedChange>Overlaps</MbToggleChip>`

9. `MbField` / `mb-field` — label + control + hint + error, built on the existing `mb-input`.
   *Shared with the whole `/competitions/new` wizard.*
   `<MbField label="Name" required hint error htmlFor>…</MbField>`

10. `MbTagInput` — comma/enter tag entry rendering hairline chips with remove. *Shared with competition
    creation and team metadata.*

11. `MbCopyField` — readonly value + Copy button + copied confirmation. *Shared with `ShareSession` and the
    summary share links.* Must drop the `document.execCommand` fallback
    (`ShareFormationDialog.tsx:78-86`) in favour of a select-on-focus fallback.

12. `useMbReducedMotion()` — wraps framer's `useReducedMotion` and exposes
    `{ reduce, spring, duration }` presets so every animated component in the system opts in the same way.

13. `mb-tabs` utility — hairline tab bar with a 2 px coral bottom-rule active indicator and counts.
    *Shared with competition detail (bracket / standings / schedule).*

**Specific to this group (but design them as a court kit, since `/competitions/[id]` rotation views will
want them):**

14. `MbCourt` — the Matchbook court chrome as a standalone renderer.
    ```tsx
    <MbCourt viewBox mode="serving|receiving" rotation={1..6}
             showZoneNumerals showAttackLine variant="view|edit"
             overlay={<…/>} onBackgroundClick />
    ```
    Owns the paper fill, navy hairlines, coral 3 m line, Oswald zone numerals, NET / END LINE rules, and the
    `edit` grid. Both `VolleyballCourt` and `FormationEditorCourt` compose it, ending the current duplication
    between `VolleyballCourt.tsx:76-205` and `CourtGrid.tsx`/`CourtSvgDefs.tsx`.

15. `MbPlayerToken` — the role token described in §3.2.
    `<MbPlayerToken role zone row="front|back" state="idle|selected|dragging|arrow-source" size />`
    Enforces the ≥52 px transparent hit circle and the greyscale-legible fill rule. `MbRoleChip` is the
    inline (non-SVG) variant used in the legend and arrow list.

16. `MbConstraintLine` — overlap line with the shape channel (`⊥` / `↔` midpoint tick) plus
    `MbCourtArrow`. Both consume tokens only.

17. **Token additions to `globals.css`:** `--mb-court-fill`, `--mb-court-line`, `--mb-court-line-strong`,
    `--mb-court-accent` (the 3 m line), and a documented three-tier ink set
    (`--mb-ink`, `--mb-ink-muted`, `--mb-rule`) referenced by the SVG layers so nothing hardcodes `oklch(...)`.
    Retire `PLAYER_COLORS` as a rendering source; keep it only if some legacy consumer needs it, and map
    roles → tokens in a new `roleTokens.ts`.

18. **Icon sprite additions** to `public/assets/matchbook/icons/sprite.svg` + `manifest.json`:
    `eye`, `eye-off`, `arrow-move`, `undo`, `trash`, `edit`, `copy`, `drag`. The manifest currently has none
    of these, and this group needs all eight. Same hairline weight and geometry as the existing set.

---

## 6. Risks

- **Editor state churn.** The clone-per-frame plus eager `useRef` initialiser (§2.5) means any layout change
  that adds re-renders will make dragging visibly worse. Fix the `useRef(getInitialData())` to
  `useRef<FormationData | null>(null)` + lazy init, and move to a structural update (mutate only the target
  frame via a shallow-copy path) *before* restyling, or the redesign will be blamed for the jank.
- **Court coordinate system is load-bearing.** `COURT_SVG` (400×300, padding 40, `NODE_RADIUS 24`,
  `ATTACK_LINE_Y 0.55`) is baked into `toSvgCoords`/`fromSvgCoords`, both courts, arrow shortening constants
  (28/32 in `MovementArrow.tsx:24-25`, 28/12 in `ArrowLayer.tsx:37-38`) and the drag maths. Changing the
  viewBox to make the court taller on mobile changes every stored formation's apparent geometry unless the
  normalised 0..1 space is preserved exactly. **Keep the normalised space; change only the rendered viewBox
  and node radius, and re-derive the shorten constants from `NODE_RADIUS`.**
- **Libero position fallback.** `frame.roleSpots.L || frame.roleSpots[backRowMB]` appears in three places
  (`useVolleyballRotation.ts:81-83`, `shared page.tsx:99-101`, `FormationEditorCourt.tsx:113`). Editing the
  libero writes to `roleSpots.L`, which then diverges from the MB spot; and
  `FormationEditorCourt.tsx:223` early-returns before the fallback, so a formation with no `L` spot can't
  take an arrow from the libero. Redesigning the token swap must not paper over this — it needs a decision
  (recommend: always materialise `L` on save).
- **Firestore coupling.** All three routes depend on it and two of them are on the public path.
  `getFormationByShareId` needs a composite index (`shareId` + `visibility`); a missing index in production
  today reads as "Formation Not Found". The redesign adds `snapshot.metadata.fromCache` handling, which
  requires touching `subscribeToUserFormations` and `useUserFormations` — a behavioural change, not just a
  visual one. Firestore is also the source of the false-empty offline state, and it will remain unreachable in
  local preview (emulator at 127.0.0.1:8080), so **every new state must be manually forceable** for review.
- **Fullscreen / orientation.** `useFullscreen` exists (`src/hooks/useFullscreen.ts`) and takes a wake lock,
  but nothing in this group uses it. Adding a fullscreen court means handling the
  `@media (max-height: 500px)` landscape contract in `globals.css:363-380` (the rubric requires it be honoured,
  not bypassed), plus iOS Safari's lack of true element fullscreen — plan a CSS-fixed fallback.
- **Modal → route migration** for the editor changes the draft semantics (a draft can now be resumed after a
  full navigation) and needs an unsaved-changes guard on route change. It also touches both call sites
  (`page.tsx:311-318`, `my-formations page.tsx:269-276`).
- **Templates fix vs removal** is a product decision, not a styling one; don't ship the tab in its current
  lying state either way.
- **Perf on long lists.** No virtualisation today; the archive redesign adds search/sort, which re-filters on
  every keystroke over the full list. Debounce and memoise, or a coach with 200 formations gets a janky field.
- **`body` is the scroll container** (`globals.css`: `html, body { height: 100% }` with `overflow-x: hidden`
  resolving to `hidden auto`). `document.documentElement.scrollHeight === clientHeight`, so `window.scrollTo`,
  anchor links and any future scroll-linked effect silently no-op. Sticky headers must be verified against the
  body scroller, not assumed.
- **`document.body.style.overflow = "hidden"`** in `FormationEditorModal.tsx:165-174` interacts with the above
  and loses scroll position on iOS; `MbDialog` must own scroll-locking centrally.

---

## 7. Definition of done

**Structural**

- [ ] All three routes render inside `matchbook-surface` + `MatchbookSidebar` / `MatchbookMobileBar`
      (share route uses the guest shell). `<Navigation />` is gone from every file in scope.
- [ ] Zero occurrences in the scope of: `bg-card`, `bg-background`, `border-border`, `text-muted-foreground`,
      `bg-accent`, `--primary`, `shadow-soft`, `rounded-xl`/`rounded-2xl` card chrome, `@heroicons/*`,
      shadcn `Button`/`Badge`, and any raw Tailwind colour class (`red-*`, `blue-*`, `green-*`, `amber-*`,
      `orange-*`, `purple-*`). Verified by grep.
- [ ] Every colour resolves to a `--mb-*` token, including inside SVG. No literal `oklch(...)` or `#hex`
      in the scope.
- [ ] Coral appears exactly once per screen as the primary action, plus its one declared court job (3 m line
      / selection ring) — documented in the component.
- [ ] Every new pattern lives in `src/components/matchbook/*` or as an `mb-*` utility, named per §5, and is
      used by at least the screen that motivated it.

**Interaction & ergonomics**

- [ ] Every interactive target ≥ 44×44 px of real hit area with ≥ 8 px separation, at 390 px. Re-run the
      measurement script: the count of sub-44 targets must be **0** (from 25 / 4 today).
- [ ] Player tokens have a ≥ 52 px transparent hit circle.
- [ ] Primary action is in the bottom third on mobile, with `env(safe-area-inset-bottom)` honoured.
- [ ] **The formation editor is fully operable on a 390×844 phone**: the court is visible and every player can
      be repositioned by touch, and all metadata fields are reachable. (Today the court is at y = 1060 inside a
      clipped modal.)
- [ ] No horizontal page scroll at 390 px on any of the three routes, in any state, including with the editor
      open. Wide content scrolls inside its own container with a visible edge.
- [ ] Both dialogs (or the editor route) trap focus, restore it on close, close on Escape, and expose
      `role="dialog" aria-modal`. Focus is visible on every control, including SVG tokens.
- [ ] Destructive actions: no `window.confirm`, no timed auto-disarm, separated from frequent actions,
      routed through `MbConfirm`.

**Data & states**

- [ ] `tabular-nums` on every numeral: rotation digits, zone captions, counts, dates, the editor's x/y readout.
      The x/y readout occupies a fixed-width box and causes zero reflow during a drag.
- [ ] Front row vs back row, win/shared/private, and overlap-constraint type are each legible in greyscale
      (verified by a desaturated screenshot).
- [ ] All eight states designed and reachable: loading (skeleton at final geometry), empty, error + retry,
      offline/stale (labelled, not silently empty), permission-denied, not-found, saving/optimistic, and
      "too much data" (search + sort + pagination on the archive; full validation list in the editor).
- [ ] Offline no longer renders as "0 formations": `useUserFormations` exposes `fromCache` / `isOffline`
      and the UI labels it.
- [ ] The Templates tab either changes the court when selected or does not exist.
- [ ] No capability from §1.3 is lost. Specifically verified by hand: 6×2 frames, libero swap, 5 built-ins,
      2 starters, both visibility toggles, cross-highlighting, drag + all three keyboard step sizes,
      copy/paste frame, reset rotation, draft save/load/discard, create/edit/duplicate, share/revoke + copy
      link, public view + copy-to-archive.

**Motion & performance**

- [ ] Motion follows §4, only `transform`/`opacity`, entrance ≤ 220 ms, feedback ≤ 100 ms.
- [ ] `useMbReducedMotion` gates every framer animation in the group; with reduced motion on, tokens jump,
      nothing pulses, and all state changes remain legible.
- [ ] No infinite animations remain (`DraggablePlayerNode.tsx:286-292`, `ArrowControls.tsx:36`).
- [ ] Dragging a player holds 60 fps on a mid-tier phone profile; the per-render deep clone in
      `useFormationEditor` is gone.
- [ ] CLS ≤ 0.1 on all three routes (skeletons match final geometry; the court has reserved aspect).
      INP ≤ 200 ms for rotation change and for a drag commit.

**Hygiene**

- [ ] `npx tsc --noEmit` clean; `npx eslint` on the scope reports **0 problems** (10 dead-code warnings
      cleared); `npx vitest run` green.
- [ ] Zero console errors on all three routes in the happy path, and Firestore failures surface in the UI
      rather than only in the console.
- [ ] Placed beside the shipped Overview / Teams / Compete / History / Tools pages, the three screens are
      indistinguishable in authorship: same rule weights, radii, tracking, icon stroke, panel padding and
      grid gutters.
