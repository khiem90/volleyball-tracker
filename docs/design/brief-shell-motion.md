# Redesign brief — App shell, navigation, motion & feedback layer

**Screen group:** the chrome that wraps every route, plus the app-wide loading /
empty / error / offline / permission states and the motion system.
**Status:** audit complete, not started.
**Companion spec:** `docs/design/matchbook-design-language.md` (authoritative).
This brief resolves GAP-2, GAP-3, GAP-8, GAP-11, GAP-12, the nav half of GAP-14,
GAP-15.3, and the `MatchbookMasthead` / `MbAccountChip` half of GAP-9. It does
**not** own GAP-1 (dialogs) or GAP-7 (scoring) — those belong to sibling briefs,
but this brief defines the tokens they consume.

Evidence: screenshots at 1440×900 and 390×844 in
`…/scratchpad/shots/audit-shell-motion/`; measurements from
`…/scratchpad/pw/metrics.mjs`.

---

## 0. The one-sentence problem

**The app currently ships two complete, mutually exclusive app shells**, and the
route you are on decides which visual system, which navigation model, which
colour palette, and which theme behaviour you get — with no transition between
them. Seven routes are Matchbook; six are the legacy playful-warm shell; four
have no chrome at all; and the *loading state of the Matchbook routes renders
the legacy shell*, so even a converted screen flashes the old design on every
visit.

---

## 1. Inventory

### 1.1 Shell variants in production today

| # | Variant | Routes | Entry file |
| --- | --- | --- | --- |
| A | **Matchbook console** — `matchbook-surface` + `MatchbookSidebar` + `MatchbookMobileBar` + hand-rolled masthead | `/`, `/teams`, `/quick-match`, `/competitions`, `/summaries`, `/tools` | each `page.tsx`, copy-pasted 6× |
| B | **Matchbook split** — no sidebar, 2-col paper/navy | `/login` | `src/app/login/page.tsx:59` |
| C | **Legacy top nav** — `bg-background` + `<Navigation />` | `/competitions/new`, `/competitions/[id]`, `/tools/volleyball-rotations`, `/tools/volleyball-rotations/my-formations`, `/tools/volleyball-rotations/shared/[shareId]` | `src/components/Navigation.tsx` |
| D | **Legacy loading** — `<Navigation />` + framer spinner | injected into A, B **and** C via `PageLoadingSpinner` | `src/components/shared/PageLoadingSpinner.tsx` |
| E | **Chrome-less** — page owns everything | `/match/[id]`, `/match/guest`, `/session/[shareCode]`, `/summary/[shareCode]` | `Navigation.tsx:31–36` suppresses nav for `/session/*` and `/summary/*`; match routes simply never render it |

There is **no** `src/app/layout.tsx` shell — `layout.tsx:43–55` renders only
`<Providers>{children}</Providers>`. Every page re-declares its own chrome.

### 1.2 Components in scope

| Component | File | Status |
| --- | --- | --- |
| `MatchbookSidebar` | `src/components/matchbook/Sidebar.tsx` | live, 6 routes |
| `MatchbookMobileBar` | `src/components/matchbook/MobileBar.tsx` | live, 6 routes |
| `Navigation` | `src/components/Navigation.tsx` | live, 5 routes + 2 helpers |
| `DesktopNav` | `src/components/nav-parts/DesktopNav.tsx` | live (inside `Navigation`) |
| `MobileNav` | `src/components/nav-parts/MobileNav.tsx` | live (inside `Navigation`) |
| `UserMenu` | `src/components/nav-parts/UserMenu.tsx` | live (inside `Navigation`) |
| `AppLogo` | `src/components/nav-parts/AppLogo.tsx` | **dead — 0 consumers** |
| `Header` | `src/components/Header.tsx` | **dead — 0 consumers** |
| `Background` | `src/components/Background.tsx` | **dead — 0 consumers** |
| `DecorativeBackground` | `src/components/shared/DecorativeBackground.tsx` | **dead — 0 consumers** |
| `EmptyState` | `src/components/shared/EmptyState.tsx` | **dead — 0 consumers** |
| `PageHeader` | `src/components/shared/PageHeader.tsx` | **dead — 0 consumers** |
| `illustrations/*` (4 SVGs + index) | `src/components/illustrations/` | **dead — 0 consumers** |
| `PageLoadingSpinner` | `src/components/shared/PageLoadingSpinner.tsx` | live, 7 files |
| `DeleteConfirmDialog` | `src/components/shared/DeleteConfirmDialog.tsx` | live, 5 files (GAP-1 owns the skin) |
| `GlobalUndoToast` + `UndoToast` | `src/components/GlobalUndoToast.tsx`, `UndoToast.tsx` | live, app-wide via `Providers` |
| `ThemeToggle` | `src/components/ui/theme-toggle.tsx` | live, only inside `Navigation` |
| motion kit | `src/components/motion/index.tsx` | 3 of 8 exports used; `fadeIn`, `numberFlip`, `PageTransition`, `StaggerContainer`, `StaggerItem`, `springSmooth` all dead |
| `Providers` | `src/components/Providers.tsx` | live |
| root layout / metadata / viewport | `src/app/layout.tsx` | live |
| tokens + 1060 lines of legacy CSS | `src/app/globals.css` | live |

### 1.3 States the shell must handle

| State | Today | File |
| --- | --- | --- |
| **Auth-gate loading** (every gated route) | `PageLoadingSpinner` → legacy nav + red framer spinner on `bg-background` | `shared/PageLoadingSpinner.tsx:15–27` |
| **Data-hydrating** (localStorage read) | *nothing* — the page renders a fully-populated **empty** state, then pops to real data. Verified: `loading-teams-d.png` shows "0 TEAMS" + every panel's empty copy at t≈350 ms | AppContext |
| **Empty (no data at all)** | per-panel `PanelEmpty` copy + a CTA. Good, already Matchbook. `empty-home-d.png` | `matchbook/Panel.tsx:146` |
| **Route not found (entity)** | `CompetitionNotFound` → legacy shell, grey trophy | `competition-detail/CompetitionNotFound.tsx` |
| **Route not found (404)** | **no `not-found.tsx` anywhere** | — |
| **Render error** | **no `error.tsx` / `global-error.tsx` anywhere** — a thrown error blanks the app | — |
| **Route-level suspense** | **no `loading.tsx` anywhere** | — |
| **Offline** | **nothing.** No `navigator.onLine`, no `online`/`offline` listener, no banner. `next-pwa` is configured with `reloadOnOnline: true` but nothing tells the user | `next.config.ts` |
| **Permission denied / Firestore rules** | **nothing.** Only `/session/*` and `/summary/*` surface a generic `error` string | `session/SessionErrorState.tsx`, `summary/[shareCode]/page.tsx:52` |
| **Firebase not configured** | handled only on `/session/*` (`SessionNotConfigured`). `/summary/[shareCode]` spins forever — see `summary-public-d.png` | `session/SessionNotConfigured.tsx` |
| **Success / undo feedback** | `UndoToast`, legacy card, framer spring, bottom-centre `max-w-sm` | `UndoToast.tsx:43–98` |
| **Any other toast** | **does not exist.** No success, error, copied-to-clipboard, or save confirmation surface | — |
| **Too much data — nav** | mobile nav strip overflows at 390 px (458 px content in a 390 px box); "Tools" is off-screen with no affordance | measured |
| **Too much data — masthead** | title wraps, badge + 2 CTAs wrap to a 3rd row; on `/` the bar + masthead consume 288 px = 34 % of a 390×844 viewport before the first panel | `home-m.png` |
| **Landscape / short viewport** | `@media (max-height:500px)` helpers exist but the shell itself does not respond; the 98 px mobile bar stays | `globals.css:371–387` |

---

## 2. What's wrong today

### 2.1 Blocking — the shell contradicts itself

**W1. Two shells, no bridge.** `/competitions` (Matchbook, cream paper, left rail)
links straight to `/competitions/new` (legacy, warm-red, top nav). Compare
`competitions-d.png` with `comp-new-d.png`: different background, different nav
position, different type, different button language. Same for
`/tools` → `/tools/volleyball-rotations`.

**W2. The Matchbook loading state renders the legacy shell.** This is the
highest-frequency visual bug in the app — it fires on *every* visit to 4 shipped
Matchbook routes.

```tsx
// src/components/shared/PageLoadingSpinner.tsx:14–27
<div className="min-h-screen bg-background">
  <Navigation />                                  // ← legacy top nav
  <main className={`${maxWidth} mx-auto px-4 pb-12`}>
      <motion.div animate={{ rotate: 360 }} … className="… border-primary …" />
```

Consumers: `teams/page.tsx:65`, `competitions/page.tsx:196`,
`summaries/page.tsx:48`, `quick-match/page.tsx:136`, `login/page.tsx:47` and
`:317`, `competitions/new/page.tsx:50`.

**W3. Dark mode is a lie on 7 routes.** `.matchbook-surface` hardcodes light
values and has no `.dark` counterpart:

```css
/* globals.css:85–89 */
.matchbook-surface { color: var(--mb-navy);
  background: var(--mb-paper) url("/assets/matchbook/textures/paper-grain.svg"); }
```

`dark-home-d.png` and `dark-teams-d.png` are pixel-identical to their light
versions, while `dark-compnew-d.png` is fully dark. The `ThemeToggle`
(`nav-parts/UserMenu.tsx:30`, `nav-parts/MobileNav.tsx:200`) still writes
`.dark` to `<html>` and persists it — so a user who turns dark mode on gets a
strobe: dark → cream → dark as they navigate. Worse, `.dark` *does* apply to the
shadcn dialogs/inputs that Matchbook pages open, so a dark `Create Team` dialog
can appear on a cream page.

**W4. Sign-out is unreachable from every Matchbook route.** `signOut` is called
in exactly two places, both inside `Navigation` (`Navigation.tsx:62`, `:70`).
The Matchbook replacements point at `/login`:

```tsx
// Sidebar.tsx:67–73        <Link href="/login"> … Account
// page.tsx:79-108 (×6)     <Link href="/login" …> My<br/>Account
```

…and `useLoginPage.ts:22–26` immediately `router.push("/")` for a signed-in
user. Confirmed: `login-d.png` is the dashboard. **"Account" is a no-op loop.**
No sign-out, no profile, no settings, no email display.

**W5. Sidebar "Create Team" does not create a team.**

```tsx
// Sidebar.tsx:59–62
<Link href="/teams" className="mb-btn mb-btn-outline w-full">
  <MbIcon id="plus" size={14} /> Create Team
```

It navigates to `/teams` and stops. From `/teams` itself it is a self-link.

### 2.2 Mobile ergonomics — measured failures

**W6. Nav targets are 30 px tall.** Measured at 390×844, all six links:
`{w:85,h:30}, {63,30}, {61,30}, {79,30}, {73,30}, {61,30}`.

```tsx
// MobileBar.tsx:48
className="matchbook-display shrink-0 px-3 py-1.5 text-[0.74rem] font-semibold …"
```

44 × 44 is the minimum. The design-language doc already flags this (GAP-14) but
estimated 28 px; the measured value is 30 px.

**W7. The sixth nav item is off-screen with no affordance.** `nav.scrollWidth =
458`, `nav.clientWidth = 390`. "Tools" ends at x=450. No fade, no chevron, no
scroll-snap. Tools is a first-class destination that is invisible on a phone.

**W8. The nav is not sticky and scrolls away completely.** `MobileBar.tsx:24`
is `lg:hidden border-b` with no `sticky`/`fixed`. `mobilebar-scrolled-m.png`:
after one 900 px scroll there is **zero** navigation, zero brand, zero back
affordance on screen.

**W9. Everything is top-anchored, out of thumb reach.** The bar is 98 px tall at
the top; the primary CTA sits in the masthead below it. Both are in the hardest
third of a 844 px screen to reach.

**W10. Duplicate primary CTA.** On `/` the mobile bar renders `Quick Match`
(131×39) and the masthead renders `Quick Match` (152×39) ~120 px apart. Same on
`/teams`, `/summaries`. `home-m.png`.

**W11. Colour is the only active-state signal, and it fails contrast.**

```tsx
// MobileBar.tsx:49–51
style={{ color: item.href === active ? "var(--mb-coral)" : "var(--mb-navy)" }}
```

Coral `#ee4b34` on paper `#f7f0e4` = **3.27:1** at 11.8 px → fails WCAG 1.4.3
(needs 4.5:1) *and* WCAG 1.4.1 (colour alone). No `aria-current`, no underline,
no rail. `Sidebar.tsx:41–55` has the coral left-rail + tint so it passes 1.4.1,
but also omits `aria-current`.

**W12. No safe-area handling anywhere.** `grep -rn "env(safe" src` → 0 hits.
`viewport-fit` is not set in `layout.tsx:35–41`. Any bottom-anchored element
will sit under the home indicator.

**W13. Pinch-zoom is disabled.**

```ts
// layout.tsx:35–41
export const viewport: Viewport = { …, maximumScale: 1, userScalable: false, … };
```

WCAG 1.4.4 failure, and it removes the user's only escape from the 0.6 rem
display steps.

**W14. Tap feedback is globally suppressed with nothing in its place.**

```css
/* globals.css:447–449 */ * { -webkit-tap-highlight-color: transparent; }
```

`.mb-btn` (`globals.css:134–149`) transitions `filter, background-color, color`
only — there is no `:active` rule, so the only press feedback is the *legacy*
global `button:active:not(:disabled){transform:scale(.98)}` at `globals.css:1128`
— which does not apply to `<Link>`-based nav items or CTAs at all.

### 2.3 Inconsistency with the redesigned pages

**W15. Active-route logic differs between the three navs.**
- `Sidebar.tsx:42–43` — `pathname.startsWith(item.href)`
- `MobileBar.tsx:50` — exact match against a **manually passed** `active` prop
- `DesktopNav.tsx:64` — `pathname === item.href`

Consequence: on `/competitions/new` the legacy desktop nav highlights **nothing**
(`comp-new-d.png` — no underline under COMPETE), while the sidebar would
highlight Compete. The `active` prop also means a new page can simply forget it.

**W16. Legacy nav has no `/tools` hub entry.** `Navigation.tsx:18–24` lists 5
items; `DesktopNav.tsx:69–95` renders a Tools *dropdown* that jumps straight to
`/tools/volleyball-rotations`, bypassing the redesigned `/tools` hub entirely.
`MobileNav.tsx:152–180` does the same.

**W17. The masthead + account chip are copy-pasted 6×.** `page.tsx:42–110`,
`teams/page.tsx:81–150`, `tools/page.tsx:85–…`, plus competitions, summaries,
quick-match. Already drifting: `tools/page.tsx:92` adds `whitespace-nowrap`;
badge tracking is `0.28em` on teams and `0.22em` on tools.

**W18. Focus rings are legacy red on Matchbook pages.**

```css
/* globals.css:1120–1123 */
:focus-visible { outline: 2px solid oklch(0.55 0.22 25); outline-offset: 2px; }
```

`oklch(0.55 0.22 25)` ≈ `#c1121f`, an off-brand near-coral. Only
`.mb-select-native:focus` (`globals.css:364–367`) opts into coral.

**W19. Every feedback surface is legacy.** `UndoToast.tsx:53` —
`bg-card/95 backdrop-blur-md border-border/50 rounded-xl shadow-lg` — glass +
blur + 12 px radius, all three explicitly banned by §9 of the design language,
rendered on top of Matchbook pages via `Providers.tsx:20`.

### 2.4 Motion

**W20. There is no motion system, only leftovers.** `motion/index.tsx` exports 8
things; `MotionDiv` and `slideUp` are used only by the 3 unconverted volleyball
pages plus the 2 dead `shared/` components. eslint confirms `fadeIn` (`:20`) and
`numberFlip` (`:38`) are unused; `PageTransition` (`:77`) is never exported;
`StaggerContainer` (`:96`) and `StaggerItem` (`:114`) are **no-op passthrough
`<div>`s** that render `{children}` and nothing else — a 26-line abstraction that
does nothing.

**W21. `prefers-reduced-motion` does not stop framer-motion.**
`globals.css:1240–1273` clamps CSS `animation-duration`/`transition-duration`.
framer-motion drives inline transforms from rAF and ignores CSS entirely. There
is **no `<MotionConfig reducedMotion="user">`** in `Providers.tsx` and **no
`useReducedMotion()` call anywhere** (`grep` → 0 hits). So the infinite-rotate
spinner (`PageLoadingSpinner.tsx:19–23`), the undo-toast spring
(`UndoToast.tsx:48`), the theme-toggle spring (`theme-toggle.tsx:7–11`) and
every score animation keep running at full amplitude for users who asked for
less.

**W22. Motion tokens do not exist.** No duration, easing, or stagger variable in
the Matchbook block (`globals.css:70–367`). Every converted screen currently
hardcodes `0.15s ease`. Any new animation will be invented locally.

**W23. Springs everywhere.** `theme-toggle.tsx:7–11` (stiffness 500),
`UndoToast.tsx:48` (400/30), `motion/index.tsx:44` (300/25), `:55` (300/30).
"Printed matter does not wobble" — §7.2.

### 2.5 Metadata / PWA

**W24.** `layout.tsx:40` `themeColor: "#0f172a"` and `public/manifest.json`
`theme_color`/`background_color` `#0f172a` are Tailwind slate-900 — neither the
Matchbook navy `#07324d` nor the paper `#f7f0e4`. The PWA splash and Android
status bar are off-brand.
**W25.** `manifest.json` `"orientation": "portrait"` conflicts with the scoring
console's landscape mode (`RotateDeviceDialog`, `globals.css:371`).
**W26.** `layout.tsx:6–16` loads Outfit at 6 weights **and** Oswald at 4 — 10
font files for a 2-family system; Matchbook body copy only needs 400/500/600.
**W27.** Theme is applied in a `useEffect` (`ThemeContext.tsx:68–71`) with no
blocking inline script, so legacy routes flash light-then-dark on load.

### 2.6 Dead code to delete

`Header.tsx`, `Background.tsx`, `nav-parts/AppLogo.tsx`,
`shared/DecorativeBackground.tsx`, `shared/EmptyState.tsx`,
`shared/PageHeader.tsx`, the whole `illustrations/` directory, and from
`globals.css` the zero-usage `.bg-waves`, `.soft-card*`, `.shine-hover`,
`.card-lift`, `.animated-gradient*`. `.glass-card` (4 files), `.playful-card`
(2), `.btn-playful` (1), `.decorative-blob` (1) go with their screens.

---

## 3. Target design

### 3.1 Principle: one shell, declared once

Replace six copy-pasted shells with a single component, and stop letting the
route decide the design system.

```tsx
// src/components/matchbook/AppShell.tsx
<MatchbookShell
  active="/competitions"                       // derived from usePathname() when omitted
  masthead={{ … }}                             // see 3.4
  cta={{ href: "/competitions/new", label: "New", icon: "plus" }}
  variant="console" | "public" | "focus"       // default "console"
>
  {children}
</MatchbookShell>
```

- `variant="console"` — sidebar + bottom bar + masthead. Every authenticated route.
- `variant="public"` — no sidebar, no bottom bar. Brand lockup header, centred
  `max-w-[1100px]` column. For `/session/[shareCode]`, `/summary/[shareCode]`,
  and shared formations. This is the sanctioned exception to "no `max-w`"
  (resolves GAP-15.3).
- `variant="focus"` — no chrome at all except a 44 px back/exit control. For
  `/match/[id]`, `/match/guest`, and fullscreen scoring.

`Navigation.tsx`, `nav-parts/*`, `Header.tsx`, `Background.tsx` are deleted once
the last legacy route converts. Until then `Navigation` stays, untouched, on its
5 routes — no half-converted nav.

### 3.2 Desktop (≥1024 px) — sidebar

Keep the shipped geometry (`w-[218px]`, `border-r border-mb-rule`, sticky,
own scroll) and fix its content.

```
┌─ 218 ──────────────┐
│  crest 64×72       │  px-6 pt-7 pb-5, links to /
│  TOURNAMENT        │  matchbook-display 1.05rem, navy
│  TRACKER           │  coral
├────────────────────┤  border-t border-mb-rule, mx-5
│ ▎OVERVIEW          │  .mb-nav-item, 44px min-height,
│  TEAMS             │  aria-current="page" on active
│  QUICK             │  active = coral text + coral 3px left rail
│  COMPETE           │            + rgba(7,50,77,.06) tint  (unchanged)
│  HISTORY           │
│  TOOLS             │
├────────────────────┤  NEW: hairline
│  ⚡ QUICK MATCH     │  .mb-btn .mb-btn-coral w-full  ← real primary action
├──── mt-auto ───────┤
│  ⬤  Preview User   │  NEW: MbAccountChip variant="rail"
│     preview@…      │  0.68rem ink-muted, truncate
│  ↪ SIGN OUT        │  NEW: real signOut()
│  ◐ THEME  [toggle] │  ONLY if 3.7 decides dark mode ships
└────────────────────┘
```

Changes from today: the CTA becomes the app's actual primary action (Quick
Match) instead of a dead "Create Team" link; the Account row becomes a real
account block with email + working sign-out; `aria-current` and a `min-h-[44px]`
land on every item; `<nav aria-label="Primary">`.

At 1024–1279 px nothing else changes (the grid is already `xl:` gated).

### 3.3 Mobile (<1024 px) — top identity strip + bottom nav

This is the biggest change and it resolves W6–W11 at once.

**Top strip — sticky, 52 px, identity + context only:**

```
┌────────────────── 390 ─────────────────┐
│ ⌂ crest  MATCH ARCHIVE      [⚡] [⬤]   │  sticky top-0 z-40
└────────────────────────────────────────┘
```

- `sticky top-0 z-40`, `bg-mb-paper`, `border-b border-mb-rule`,
  `padding-top: env(safe-area-inset-top)`.
- Left: 28 px crest → `/` on the dashboard; on any sub-page it becomes a
  **44 × 44 back control** (`chevron-left` + the parent's name). This is the
  first back affordance the mobile shell has ever had.
- Centre: the *current screen's* short title in `matchbook-display 0.8rem`,
  `truncate`. Replaces nothing — it's new context that the scrolled-away
  masthead used to carry.
- Right: at most one 44 × 44 icon action (screen-specific) + the account disc.
- **No nav links.** **No duplicate CTA.**

**Bottom bar — fixed, 5 destinations + More:**

```
┌────────────────────────────────────────┐
│  ▔▔▔▔                                  │  active: coral 2px TOP border
│   ⌂      ⛨      ⚡      🏆     ⋯       │  icon 20
│ OVERVIEW TEAMS  QUICK  COMPETE  MORE   │  display 0.58rem, .16em
└────────────────────────────────────────┘  + env(safe-area-inset-bottom)
```

- `fixed bottom-0 inset-x-0 z-40`, `bg-mb-paper-bright`,
  `border-top: 1.5px solid var(--mb-navy)`,
  `padding-bottom: env(safe-area-inset-bottom)`.
- 5 equal cells, each `min-h-[44px]` (56 px real height with the caption).
- Active = coral icon **+** coral label **+** a coral 2 px top border **+**
  `aria-current="page"`. Three signals, so W11 is fixed even for the 3.27:1
  coral.
- "More" opens `MbSheet` (bottom sheet, GAP-1 family) containing History, Tools,
  Account, Sign out, Theme. Nothing is ever off-screen again.
- Main content gets `pb-[calc(56px+env(safe-area-inset-bottom))]` so the last
  panel is never covered. Ship this as `.mb-safe-bottom`.
- Hidden when `variant="focus"`, and hidden under `@media (max-height:500px)`
  (landscape scoring) via the existing `.hide-landscape`.

Net effect on `/` at 390×844: chrome drops from **288 px of top real-estate** to
52 px top + 56 px bottom, and the first panel appears above the fold.

### 3.4 Masthead — one component, six callers

Extract the copy-pasted block verbatim (§3.2 of the design language) as
`MatchbookMasthead`, with **mobile-specific collapse rules**:

| Slot | ≥640 px | <640 px |
| --- | --- | --- |
| Title | `text-4xl sm:text-5xl`, two-tone | `text-3xl`, single line, `truncate` |
| Badge | coral 2 px frame, count + caption | inline after title, count only |
| Dateline | visible | hidden (`hidden sm:block`) — unchanged |
| Actions | up to 2 buttons | **1** button, `min-h-[44px] w-full` on its own row |
| Account chip | `hidden md:flex` | moves to the top strip / More sheet |

### 3.5 Loading — `MbPageLoading`, and kill the flash

Replace `PageLoadingSpinner` everywhere with a Matchbook skeleton that renders
**the real shell**, so the frame never moves:

```tsx
<MbPageLoading variant="console" panels={6} />
```

`matchbook-surface` + sidebar + bottom bar + a masthead skeleton + N
`.mb-panel`s whose bodies hold `.mb-skeleton` blocks
(`rgba(7,50,77,0.08)`, radius 2 px, **no shimmer** — a shimmer is a gradient).

Also fixes the *second* loading problem (W, §1.3 "Data-hydrating"): Matchbook
pages currently render a convincing **empty state** while localStorage is being
read. Add an `isHydrated` flag from `AppContext` and render `MbPageLoading`
until it flips, so "no teams yet" only ever means "no teams".

Add the App Router files that do not exist:
- `src/app/loading.tsx` → `<MbPageLoading />`
- `src/app/error.tsx` + `src/app/global-error.tsx` → `MbErrorState`
- `src/app/not-found.tsx` → `MbErrorState` variant

### 3.6 Empty / error / offline / permission

One primitive, four tones (`MbEmptyState`, §3.9). Content rules:

| State | Icon | Title | Body | Action |
| --- | --- | --- | --- | --- |
| Empty | domain icon | "No teams yet" | one sentence | primary CTA |
| Not found | `warning` | "Competition not found" | "It may have been deleted." | Back to Competitions |
| Error | `warning`, `--mb-red` | "Something went wrong" | error message, monospace, `mb-kicker` size | Try again / Go to Overview |
| Not configured | `cloud` | "Live sessions are off" | "This build has no Firebase project connected." | Back |
| Permission denied | `lock` | "You don't have access" | "Ask the organiser to share this session." | Sign in / Back |

**Offline** is a shell-level banner, not a page: `MbOfflineBanner` — a full-width
`--mb-gold`-framed strip under the top strip (mobile) or above the masthead
(desktop), `role="status"`, text "Offline — changes are saved on this device."
Driven by a new `useOnlineStatus()` hook (`navigator.onLine` +
`online`/`offline` listeners). It must never cover content or shift the nav.

### 3.7 Dark mode — decide now (GAP-15.1)

**Recommendation: drop dark mode for Matchbook routes.** The design language
already says light-only, `matchbook-surface` has no dark form, and the toggle
currently mis-states reality on 7 of 13 routes. Concretely:

1. Delete `ThemeToggle` from `UserMenu.tsx:30` and `MobileNav.tsx:200`.
2. Keep `ThemeContext` and the `.dark` block until the last legacy route
   converts, then delete both and the `theme-toggle-*` CSS
   (`globals.css:1427–1506`).
3. Set `<html lang="en" className="light">` in `layout.tsx:49` so the shadcn
   dialogs Matchbook pages open can never render dark on cream.

If a night almanac is genuinely wanted, it is a **separate** `--mb-*` dark set
(ink↔paper inversion, coral shifted for contrast on dark), not the legacy
`.dark` block — and it is out of scope for this brief.

### 3.8 Metadata / PWA

```ts
// layout.tsx
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  viewportFit: "cover",              // NEW — required for safe-area
  themeColor: "#07324d",             // was #0f172a
  // maximumScale / userScalable REMOVED — restores pinch-zoom (W13)
};
```
`manifest.json`: `theme_color: "#07324d"`, `background_color: "#f7f0e4"`,
`orientation: "any"`. Regenerate the icon set from
`public/assets/matchbook/brand/crest.svg`. Trim Outfit to `["400","500","600"]`.

---

## 4. Interaction & motion

### 4.1 Tokens first (GAP-11) — nothing animates until these land

```css
:root {
  --mb-dur-fast: 120ms;   --mb-dur-base: 180ms;   --mb-dur-slow: 280ms;
  --mb-ease-out: cubic-bezier(.2,.8,.3,1);
  --mb-ease-in-out: cubic-bezier(.4,0,.2,1);
  --mb-stagger: 40ms;
}
```

### 4.2 What animates

| Event | Spec |
| --- | --- |
| **Panel entrance** | `.mb-enter`: opacity 0→1 + `translateY(6px)→0`, `--mb-dur-slow --mb-ease-out`. Stagger `--mb-stagger` per grid child, **capped at 6** (`.mb-stagger-1..6`). Fires on mount only — never on re-render, never on filter change. |
| **Route change** | Cross-fade the `<main>` only, `--mb-dur-base`. The sidebar, top strip and bottom bar **never move or re-mount**. No slide, no `layoutId`. |
| **Press (button/nav/row)** | `--mb-dur-fast` background tint + the existing `scale(.98)`. Extend the global press rule to `.mb-btn` and `.mb-nav-item` explicitly so `<Link>`-based controls get it too (fixes W14). |
| **Hover** | unchanged: `filter/background-color/color` at `--mb-dur-base`. |
| **Focus** | instant. Never animate a focus ring. |
| **Bottom-nav active change** | the coral top border grows from centre, `--mb-dur-base --mb-ease-out`, `transform: scaleX()` only. |
| **Toast in/out** | opacity + `translateY(8px)`, `--mb-dur-base --mb-ease-out`. **No spring.** Out at `--mb-dur-fast`. |
| **Offline banner** | height/opacity, `--mb-dur-base`. Enters once; never re-animates while offline. |
| **Skeleton** | **static.** No shimmer, no pulse. |
| **Live dot** | existing `mb-pulse` 1.4 s. Unchanged. |
| **Score increment** | opacity + 4 px rise at `--mb-dur-fast`, `tabular-nums` so width never changes. No flip, no scale, no spring. (Owned by GAP-7; the token is defined here.) |
| **Bottom sheet ("More")** | translateY from 100 %, `--mb-dur-slow --mb-ease-out`. Backdrop `rgba(7,50,77,0.55)` fades at `--mb-dur-base`. |

### 4.3 What must NOT animate

- The sidebar, top strip, bottom bar — on any route change, ever.
- Panel **content updates** (a live score arriving, a standings row reordering, a
  filter narrowing a list). New data appears; it does not fly in. This is a
  scoreboard.
- Layout: no `layout` / `layoutId` / FLIP anywhere in the shell. A reordering
  standings table that animates is unreadable mid-match.
- Skeletons, empty states, error states.
- Height/width of anything containing a number.
- Nothing may animate on **scroll**. No parallax, no reveal-on-scroll.

### 4.4 Reduced motion — fix W21 properly

1. `<MotionConfig reducedMotion="user">` wrapping everything in
   `Providers.tsx`. One line; it fixes every framer animation in the app,
   including the unconverted screens.
2. Any hand-written rAF/JS motion additionally checks `useReducedMotion()` and
   renders the end state.
3. Extend the `@media (prefers-reduced-motion: reduce)` block
   (`globals.css:1240`) with the new `.mb-enter` / `.mb-stagger-*` classes set
   to `animation: none; opacity: 1; transform: none`.
4. `.mb-live-dot` falls back to a solid dot (already handled by
   `animation-iteration-count: 1`, but assert it in a test).

### 4.5 Focus & keyboard (GAP-12 + new)

```css
.matchbook-surface :focus-visible {
  outline: 2px solid var(--mb-focus, var(--mb-coral)); outline-offset: 2px;
}
```
Scoped, so the legacy rule at `globals.css:1120` stays on legacy screens.

Plus:
- A **skip link** as the first focusable node in `MatchbookShell`
  (`.mb-skip-link`, visually hidden until focused, jumps to `#mb-main`). Today a
  mobile user tabs through 8 controls before reaching content.
- `<nav aria-label="Primary">` on the sidebar, `aria-label="Sections"` on the
  bottom bar.
- `aria-current="page"` on the active item in **all** navs.
- Focus moves to `#mb-main` on route change (`tabIndex={-1}` + `.focus()`), and
  the route title is announced through a visually-hidden `aria-live="polite"`
  region in the shell.

---

## 5. New primitives required

Ordered by blocking-ness. **S** = shared with other screen groups.

| # | Primitive | File | API | Shared |
| --- | --- | --- | --- | --- |
| 1 | `MatchbookShell` | `matchbook/AppShell.tsx` | `{ variant?: "console"\|"public"\|"focus"; active?: string; masthead?: MastheadProps; cta?: {href,label,icon}; children }` | **S — every screen** |
| 2 | `MatchbookBottomBar` | `matchbook/BottomBar.tsx` | `{ active?: string }` — 5 routes + More; internal `MbSheet` | **S** |
| 3 | `MatchbookTopStrip` | `matchbook/TopStrip.tsx` | `{ title: string; back?: {href,label}; action?: {icon,label,onClick} }` | **S** |
| 4 | `MatchbookMasthead` | `matchbook/Masthead.tsx` | `{ title: ReactNode; badge?: {value,label}\|{lines:[string,string]}; dateLine?: string; subLine?: string; actions?: Action[] }` (max 2 actions, ≤1 coral) | **S — 6 callers today** |
| 5 | `MbAccountChip` | `matchbook/AccountChip.tsx` | `{ variant?: "masthead"\|"rail"\|"compact" }` — owns email, sign-out, sign-in | **S — 6 callers** |
| 6 | `MbPageLoading` + `MbSkeleton` | `matchbook/Loading.tsx` | `<MbPageLoading variant panels={n} />`, `<MbSkeleton lines={3} w="60%" />` | **S — GAP-8** |
| 7 | `MbEmptyState` | `matchbook/EmptyState.tsx` | `{ tone: "empty"\|"notfound"\|"error"\|"offline"\|"denied"\|"unconfigured"; icon?: string; title: string; body?: ReactNode; actions?: Action[] }` | **S** |
| 8 | `MbToast` + `useToast()` | `matchbook/Toast.tsx` | `toast({ tone, icon, message, action?, duration? })`; host renders bottom-centre above the bottom bar, `role="status"`/`"alert"` | **S — GAP-2** |
| 9 | `MbOfflineBanner` + `useOnlineStatus()` | `matchbook/Offline.tsx`, `hooks/useOnlineStatus.ts` | `() => boolean` | **S** |
| 10 | `MbSheet` | `matchbook/Sheet.tsx` | `{ open, onOpenChange, title, children }` — bottom sheet, navy wash backdrop | **S — GAP-1 family** |
| 11 | `MbIconButton` | `matchbook/IconButton.tsx` | `{ icon, label, size?: "md"\|"lg", tone? }` — guarantees a 44 × 44 hit box | **S — GAP-14** |
| 12 | Motion tokens + `.mb-enter` / `.mb-stagger-1..6` | `globals.css` | CSS only | **S — GAP-11** |
| 13 | Scoped focus ring `--mb-focus` | `globals.css` | CSS only | **S — GAP-12** |
| 14 | `.mb-safe-top` / `.mb-safe-bottom` | `globals.css` | CSS only | **S — GAP-3** |
| 15 | `@media (pointer: coarse) { .mb-btn, .mb-nav-item, .mb-tab { min-height: 44px } }` + `.mb-btn-lg` | `globals.css` | CSS only | **S — GAP-14** |
| 16 | `.mb-skip-link` | `globals.css` | CSS only | S |

Sprite additions needed (`public/assets/matchbook/icons/sprite.svg`):
`close`/`x`, `chevron-left`, `more`/`ellipsis`, `logout`, `wifi-off`, `undo`.
`close` is already flagged missing by GAP-1.

---

## 6. Risks

**R1 — Blast radius.** This brief touches every route. Sequence it so the app is
never half-broken: (1) tokens + CSS utilities, (2) `MbPageLoading` swap-in
(instant win, kills W2 on 7 files), (3) `MatchbookShell` + bottom bar behind the
6 already-converted routes, (4) masthead/account extraction, (5) toast +
offline, (6) legacy routes convert one at a time, (7) delete `Navigation` and
the dead files. Never merge (7) before (6) completes.

**R2 — `PageLoadingSpinner` is imported by unconverted pages too**
(`competitions/new/page.tsx:50`, `summary/[shareCode]/page.tsx`). Swapping it
Matchbook-wide will make those pages flash *cream* before rendering *warm-red*.
Keep both: `MbPageLoading` for converted routes, leave `PageLoadingSpinner` in
place for legacy until each converts.

**R3 — Removing `userScalable: false` changes scoring ergonomics.** The scoring
console has large full-bleed tap targets; enabling pinch-zoom means a
double-tap near a score button can zoom instead of score. Mitigation:
`touch-action: manipulation` on `.mb-score-side` and all 44 px controls.
Coordinate with the GAP-7 brief.

**R4 — Fullscreen + orientation.** `/match/[id]` uses `isFullscreen`
(`useMatchPage`), `FullscreenControls`, `RotateDeviceDialog`, and the
`@media (max-height:500px)` helpers. A `fixed` bottom bar inside the Fullscreen
API element will either disappear or float wrongly. `variant="focus"` must
render **no** bottom bar, and the shell must not wrap the fullscreen target.

**R5 — Safe-area + `viewport-fit: cover` regressions.** Turning on `cover`
extends content under the notch on *every* existing screen at once. Every
`fixed`/`sticky` edge element in the app must gain padding in the same commit,
or content slides under the status bar on iOS.

**R6 — Firestore-backed routes.** `/session/[shareCode]`, `/summary/[shareCode]`
and the shared-formation route depend on `SessionContext`/Firebase and are the
only places `error` strings surface. `variant="public"` must not assume
`AuthContext` has a user, must not render the account chip, and must keep
working when `isFirebaseConfigured()` is false. `Navigation.tsx:31–36` currently
hides nav on these routes by pathname string-match — that hack must not be
carried into the new shell; the route declares its variant instead.

**R7 — Perf: the bottom bar is `fixed` on top of scrolling brackets.** The
bracket and rotation views use `overflow-x-auto` rails and can be very wide. A
`fixed` element over a horizontally-scrolling container triggers repaints on
low-end Android. Keep the bar `contain: layout paint` and avoid `backdrop-filter`
(banned anyway).

**R8 — Entrance stagger vs. large lists.** `.mb-enter` must be applied to **grid
panels only**, never to table rows. A 40-row standings table with per-row
staggered entrance is both slow and unreadable. Cap enforced in CSS
(`.mb-stagger-1..6` only) rather than by convention.

**R9 — `MotionConfig reducedMotion="user"`** changes behaviour on the *unconverted*
screens too (volleyball formation editor drag, score panels). Verify the
formation editor still functions — `reducedMotion` disables transform
animations, and `DraggablePlayerNode` may rely on framer for positioning, not
just decoration.

**R10 — Deleting `ThemeContext`** removes `localStorage["tournament-tracker-theme"]`
handling. Users who previously chose dark will simply get light; that is the
intent, but confirm no other code reads `resolvedTheme` (currently only
`theme-toggle.tsx`).

**R11 — Hydration.** The masthead dateline uses `new Date()` client-side and
needs `suppressHydrationWarning` (design language §3.2). `MatchbookMasthead`
must carry it internally so the six callers cannot forget.

**R12 — `GlobalUndoToast` owns a Ctrl+Z keyboard listener**
(`GlobalUndoToast.tsx:94–107`) and an undo stack of 5. Replacing the toast
**visual** must not touch `pushUndo`/`performUndo`/`clearUndo`, the stack cap
(`MAX_UNDO_STACK_SIZE`), the 3-step restore order (delete new match → restore
match → restore competition), or the `useUndo()` contract consumed by the
scoring screens. Skin only.

---

## 7. Definition of done

**Structure**
1. `MatchbookShell` exists with 3 variants; the 6 converted routes render it and
   contain **zero** inline shell markup.
2. `MatchbookMasthead` and `MbAccountChip` exist; the 6 duplicated mastheads and
   6 duplicated account chips are gone.
3. `src/app/loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx` exist
   and render Matchbook.
4. No route renders both a Matchbook surface and `<Navigation />` at any point in
   its lifecycle, including during loading.

**Mobile**
5. Every nav/shell control measures **≥44 × 44 CSS px** at 390×844 (assert in a
   Playwright test that reads `getBoundingClientRect` for every `nav a`, `nav
   button`, `.mb-btn` in the shell).
6. All 6 destinations are reachable without horizontal scrolling; `nav.scrollWidth
   === nav.clientWidth` at 320 px.
7. Navigation is reachable at any scroll position (bottom bar is `fixed`).
8. `env(safe-area-inset-bottom)` and `-top` are honoured; `viewport-fit: cover`
   is set; no content sits under the home indicator on iPhone-class insets.
9. Exactly one primary CTA is visible per screen at 390 px.
10. `document.body.scrollWidth === window.innerWidth` at 320 / 360 / 390 / 414 px
    on all 13 routes.

**Accessibility**
11. `aria-current="page"` on the active item in every nav; active state carries
    ≥2 non-colour signals.
12. Skip link is the first focusable element and lands on `#mb-main`.
13. Focus rings inside `.matchbook-surface` are coral, 2 px, offset 2 px.
14. Pinch-zoom works (`maximumScale`/`userScalable` removed).
15. `prefers-reduced-motion: reduce` produces **zero** movement anywhere in the
    app — verified by sampling inline `style` on animated nodes across two
    frames and asserting no change, including framer-driven ones.
16. Every shell nav landmark has an `aria-label`; route changes are announced.

**Motion**
17. Motion tokens exist in `globals.css`; **no** duration, easing, or delay
    literal appears in any converted `.tsx`.
18. No spring, no bounce, no overshoot, no `layoutId`, no scroll-triggered
    animation anywhere in the shell.
19. Panel entrance staggers at most 6 children; table rows never animate.

**Feedback**
20. `MbToast` replaces `UndoToast` visually with the undo logic byte-identical;
    Ctrl+Z, the 5-deep stack and the restore order still pass existing tests.
21. Offline is detected and surfaced; the banner does not shift layout.
22. Empty / not-found / error / permission-denied / not-configured all render
    `MbEmptyState`; `/summary/[shareCode]` no longer spins forever without
    Firebase.
23. No Matchbook route renders an empty state while data is still hydrating.

**Theme & metadata**
24. Dark mode decision from §3.7 is implemented; no control claims to change a
    theme it cannot change.
25. `themeColor` / `manifest.json` use `#07324d` / `#f7f0e4`; orientation is
    `any`.

**Cleanup**
26. Deleted: `Header.tsx`, `Background.tsx`, `nav-parts/AppLogo.tsx`,
    `shared/DecorativeBackground.tsx`, `shared/EmptyState.tsx`,
    `shared/PageHeader.tsx`, `illustrations/*`, and the dead exports in
    `motion/index.tsx` (`fadeIn`, `numberFlip`, `PageTransition`,
    `StaggerContainer`, `StaggerItem`, `springSmooth`).
27. `npx eslint src` reports **0 warnings** for unused vars in these paths.
28. `npx tsc --noEmit` clean; `npx vitest run` green.

**Visual**
29. Screenshots of all 13 routes at 1440×900 and 390×844 show one continuous
    design system — same paper, same rail, same type, same nav position — with no
    route-to-route jump.
30. `docs/design/matchbook-design-language.md` is updated: §3.1 app shell, §7
    motion, §8 mobile rules rewritten, and GAP-2, GAP-3, GAP-8, GAP-11, GAP-12,
    GAP-15.1/15.3 marked resolved.
