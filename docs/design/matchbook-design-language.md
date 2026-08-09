# Matchbook Design Language

**Status:** authoritative spec for the Tournament Tracker redesign.
**Audience:** any engineer converting a screen to Matchbook.
**Rule:** if this document and a redesigned page disagree, the page wins and this
document is a bug — file it. If this document and an *un*converted page disagree,
this document wins.

Matchbook is a **vintage sports-almanac / matchbook print** aesthetic: cream paper
stock, navy ink, one coral accent, condensed uppercase display type, hairline
rules, boxed panels with a heavy top border, tabular numerics, editorial mastheads.
It is deliberately **flat, printed, and rectangular**. No glass, no gradients, no
pill buttons, no drop shadows on text, no emoji.

Reference implementations — read these before writing a new screen:

| Screen | File |
| --- | --- |
| Overview (home) | `src/app/page.tsx` |
| Teams | `src/app/teams/page.tsx` + `src/components/matchbook/teamPanels.tsx` |
| Login | `src/app/login/page.tsx` |
| Quick Match | `src/app/quick-match/page.tsx` |
| Compete console | `src/app/competitions/page.tsx` |
| History archive | `src/app/summaries/page.tsx` |
| Tools hub | `src/app/tools/page.tsx` |

Shared kit: `src/components/matchbook/`.
Tokens + utility classes: the **Matchbook block at the top of `src/app/globals.css`**
(lines 54–367). Assets: `public/assets/matchbook/`.

---

## 0. Two traps before you start

**Trap 1 — `public/assets/matchbook/tokens.css` is NOT loaded by the app.**
It is a standalone copy used only by `public/assets/matchbook/preview.html`. The
runtime source of truth is `globals.css`, always. As of W1/P0 the two agree:
the five properties that used to exist only in the preview copy
(`--mb-rule-strong`, `--mb-shadow`, `--mb-radius`, `--mb-body`, `--mb-display`)
are gone — strong rules are `--mb-navy`, the shadow is `--mb-panel-shadow`, radii
are the literals in §3.3, and the display stack is `--mb-display-font`. The
runtime-only utility tokens added in P0 (tints, motion, safe-area, court) are
deliberately **not** duplicated into the preview copy.

**Trap 2 — the old "playful warm" theme still lives in the same stylesheet.**
`globals.css` lines 451–1511 are the legacy system (`--primary` red, `.soft-card`,
`.playful-card`, `.btn-playful`, `.glass-*`, `.dark` block). Matchbook screens must
not touch any of it. The two systems share one file only because the migration is
in flight.

---

## 1. Palette

### 1.1 Tokens

Declared in `globals.css` `:root` (lines 70–83) and exposed to Tailwind through
`@theme inline` (lines 54–65), which generates `bg-mb-*`, `text-mb-*`,
`border-mb-*`, `divide-mb-*`, `fill-mb-*` utilities.

| Token | Hex | Tailwind | Role | Never use it for |
| --- | --- | --- | --- | --- |
| `--mb-paper` | `#f7f0e4` | `bg-mb-paper` | The page stock. Applied once, by `.matchbook-surface`, on the outermost `<div>`. | Panel interiors, buttons, any element inside a panel. |
| `--mb-paper-bright` | `#fffaf1` | `bg-mb-paper-bright` | Everything that sits *on* the stock: panel bodies, score boxes, seed boxes, inputs, selects, avatar discs. Also the ink colour on navy fills. | The page background (the two-tone paper/bright separation is what makes panels read as printed cards). |
| `--mb-navy` | `#07324d` | `text-mb-navy` `bg-mb-navy` `border-mb-navy` | **The ink.** Default text colour, all structural borders, panel top rule, navy header bars, primary button fill. | Long body copy that should read as secondary — that's `--mb-ink-muted`. |
| `--mb-coral` | `#ee4b34` | `text-mb-coral` `bg-mb-coral` `border-mb-coral` | **The one accent.** Active nav, masthead second word, masthead badge frame, primary CTA fill, selection rail, schedule spine, hover colour for links. | Body text at small sizes on paper (3.26:1 — large text only). Status semantics; it means "this is the app's accent", not "danger". |
| `--mb-teal` | `#148f89` | `text-mb-teal` | Rank-leader rail (row 1 of a table), "Shared" markers, first entry in the recent-results accent cycle. | Success — that's `--mb-green`. |
| `--mb-gold` | `#e6a01f` | `text-mb-gold` | Icons **on navy** (`Panel tone="navy"` sets `text-mb-gold` on the head icon), Draft status, mid-tier readiness bars. | Text on paper. 1.97:1 — it **fails at any size**. See §1.3. |
| `--mb-plum` | `#5a347d` | `text-mb-plum` | Fourth accent in the recent-results rail cycle. | Interactive elements. It has no interaction meaning. |
| `--mb-green` | `#16885f` | `text-mb-green` | Win / complete / Final / ACTIVE / high readiness / success notice border. | Buttons. There is no green button. |
| `--mb-red` | `#cf3f32` | `text-mb-red` | Loss / LIVE / error / destructive hover / low readiness. | Primary CTAs (that's coral). Coral and red are 1.2 apart in hue and must never sit adjacent. |
| `--mb-ink-muted` | `#5d6c70` | `text-mb-ink-muted` | Secondary body copy, kickers, placeholders, disabled seeds, table head labels, idle status. | Anything that must pass AA on navy (2.44:1 — fails). |
| `--mb-rule` | `rgba(7,50,77,0.28)` | `border-mb-rule` `divide-mb-rule` | Hairline dividers: panel head underline, table row rules, list `divide-y`, section separators. | Panel outer border and heavy section separators — those are solid `--mb-navy`. |
| `--mb-display-font` | `var(--font-oswald), "Arial Narrow", "Roboto Condensed", Impact, sans-serif` | — | Display stack. Only ever consumed via `.matchbook-display` or an existing `mb-*` class. | Direct `font-family` declarations in components. |

Fixed values that appear inline and are effectively tokens (see §11 GAP-13 —
they should be promoted):

| Literal | Meaning |
| --- | --- |
| `rgba(7,50,77,0.04)` | Row hover tint (6 call sites) |
| `rgba(7,50,77,0.05)` | Table day-group header band (History) |
| `rgba(7,50,77,0.06)` | Nav-item / outline-navy button hover |
| `rgba(7,50,77,0.12)` | Empty form square, progress-bar track |
| `rgba(255,250,241,0.25)` | Hairline rule **on navy** (Login promo half) |
| `rgba(255,250,241,0.06)` | Panel-bright tint on navy |
| `0 8px 22px rgba(57,41,23,0.08)` | The only shadow in the system (`.mb-panel`) |

### 1.2 Fixed colour semantics

Never invent a new mapping. These are the ones already shipped:

```
Live / in progress   → --mb-red    (+ .mb-live-dot)
Draft / pending      → --mb-gold   (on-navy or as a border only)
Final / complete     → --mb-green
Win                  → --mb-green
Loss                 → --mb-red
ACTIVE team          → --mb-green
IDLE team            → --mb-ink-muted
Readiness ≥85 READY  → --mb-green
Readiness ≥65 GOOD   → --mb-gold
Readiness <65 ATTN   → --mb-red
Rank #1 rail         → --mb-teal
Selected row rail    → --mb-coral
```

Canonical implementations: `STATUS_STYLES` in `src/app/competitions/page.tsx:19`,
`readinessColor()` in `src/components/matchbook/teamStats.ts:91`, `FORM_COLORS` in
`src/components/matchbook/Panel.tsx:88`.

### 1.3 Contrast — measured, WCAG 2.1

Computed from the real hex values. **AA** = ≥4.5:1 (any size). **AA-large** =
≥3:1, valid only for ≥24px, or ≥18.66px at weight ≥700.

| Foreground | on `#f7f0e4` paper | on `#fffaf1` bright | on `#07324d` navy |
| --- | --- | --- | --- |
| `mb-navy` | **11.79 AAA** | **12.84 AAA** | — |
| `mb-plum` | **8.34 AAA** | **9.09 AAA** | 1.41 FAIL |
| `mb-ink-muted` | **4.82 AA** | **5.25 AA** | 2.44 FAIL |
| `mb-red` | 4.20 AA-large | **4.58 AA** | 2.80 FAIL |
| `mb-green` | 3.93 AA-large | 4.28 AA-large | 3.00 AA-large |
| `mb-teal` | 3.48 AA-large | 3.80 AA-large | 3.38 AA-large |
| `mb-coral` | 3.26 AA-large | 3.55 AA-large | 3.62 AA-large |
| `mb-gold` | 1.97 **FAIL** | 2.15 **FAIL** | **5.99 AA** |
| `mb-paper-bright` | 1.09 FAIL | — | **12.84 AAA** |
| `#ffffff` | 1.13 FAIL | 1.04 FAIL | **13.36 AAA** |

**The safe pairs (use these by default):**

- Body / any small text on paper or bright → `text-mb-navy` (AAA).
- Secondary small text on paper or bright → `text-mb-ink-muted` (AA).
- Any text on `bg-mb-navy` → `text-mb-paper-bright` (AAA) or `text-white` (AAA).
- Icons on `bg-mb-navy` → `text-mb-gold` (5.99 AA) or `text-mb-paper-bright`.
- `.mb-btn-coral` sets `color:#fff` on coral → **3.62:1**. It is AA-large only, and
  `.mb-btn` is `0.8rem/600` — **below** the large-text threshold. This is a known
  shipped debt; do not copy it into new dense UI. Prefer `.mb-btn-navy`
  (paper-bright on navy, 12.84 AAA) when the text is under 18.66px and the button
  is not the hero CTA. See GAP-14.

**Hard rules:**

1. `mb-coral`, `mb-teal`, `mb-green`, `mb-red` as *text on paper* are only allowed
   at ≥18.66px/700 or ≥24px. Every shipped use satisfies this because they appear
   in `.matchbook-display` bold micro-labels — **except** those micro-labels are
   ~0.62–0.66rem. Treat existing small coloured status labels as legacy: they carry
   redundant non-colour signal (a dot, a word, a shape), so they are not the sole
   carrier of meaning. **New** status text under 18.66px must be `text-mb-navy` or
   `text-mb-ink-muted`, with colour carried by an adjacent swatch/dot/border.
2. `mb-gold` is **never** text on paper. It is an on-navy colour, a border colour,
   or a fill (progress bar, square).
3. Never put `mb-plum`, `mb-ink-muted`, or `mb-red` text on `bg-mb-navy`.
4. Colour is never the only signal. Form squares pair colour with position; live
   pairs colour with the pulsing dot and the word "Live"; readiness pairs colour
   with a percentage and a status word.

### 1.4 Dark mode

**Matchbook is light-only.** `.matchbook-surface` hard-codes the paper background
and navy ink; the `.dark` block in `globals.css` (lines 537–613) belongs to the old
theme and has no `--mb-*` overrides. Do not add `dark:` variants to Matchbook
screens, and do not render `ThemeToggle` on a converted screen. (See GAP-15 if a
dark almanac variant is ever wanted.)

---

## 2. Typography

Two families, loaded in `src/app/layout.tsx`:

```tsx
const outfit = Outfit({ variable: "--font-outfit", weight: ["400","500","600","700","800","900"] });
const oswald = Oswald({ variable: "--font-oswald", weight: ["400","500","600","700"] });
```

- **Display = Oswald** (condensed), always uppercase, always letterspaced. Reached
  only through `.matchbook-display` or a class that already includes it
  (`.mb-btn`, `.mb-kicker`, `.mb-nav-item`, `.mb-panel-link`, `.mb-score-box`,
  `.mb-select-native`, `.mb-table th`).
- **Body = Outfit**, sentence case, set by `.matchbook-surface`
  (`font-family: var(--font-sans)`) and `body`.

```css
.matchbook-display {
  font-family: var(--mb-display-font);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
```

Note `.matchbook-display` sets `letter-spacing: 0.02em`; every named step below
**overrides** it with an explicit `tracking-[…]`. If you use `.matchbook-display`
without a tracking class you get 0.02em, which is only correct for the masthead.
Oswald has only 400/500/600/700 — `font-bold` (700) is the ceiling; never write
`font-extrabold`/`font-black` on display text.

### 2.1 The named scale

Every value below is taken from shipped code. Use the name in code review; use the
snippet in code. Never introduce a size between two steps.

**Display steps (Oswald, uppercase)**

| Name | Size | Weight | Tracking | Leading | Tailwind snippet | Where it ships |
| --- | --- | --- | --- | --- | --- | --- |
| `display/masthead` | `2.25rem` → `sm:3rem` | 700 | `0.01em` | `none` | `matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl` | The one `<h1>` per screen (6 identical call sites) |
| `display/score-2xl` | `clamp(4rem, 18vw, 9rem)` | 700 | inherit | `0.9` | `.mb-numeral.mb-numeral--court` (baked) | Court View only, via `MbScoreNumeral size="court"` |
| `display/score-xl` | `3.75rem` | 700 | inherit | — | `matchbook-display text-6xl font-bold tabular-nums` | Quick-Match scoreboard preview |
| `display/score-lg` | `3rem` | 700 | inherit | — | `matchbook-display text-5xl font-bold tabular-nums` | Match of the Day, Match Report final score |
| `display/stat-xl` | `2.25rem` | 700 | inherit | `none` | `matchbook-display text-4xl font-bold leading-none tabular-nums` | Leaders value, Club Snapshot value |
| `display/stat-lg` | `1.875rem` | 700 | inherit | `none` | `matchbook-display text-3xl font-bold leading-none tabular-nums` | Overall Record W-L |
| `display/stat-md` | `1.5rem` | 700 | inherit | `none` | `matchbook-display text-2xl font-bold leading-none tabular-nums` | Masthead badge count, profile team name |
| `display/stat-sm` | `1.2rem` | 700 | inherit | `tight` | `matchbook-display text-[1.2rem] font-bold leading-tight tabular-nums` | `StatusStat` / `SummaryStat` values |
| `display/panel-title` | `0.95rem` | 700 | `0.05em` | — | `matchbook-display text-[0.95rem] font-bold tracking-[0.05em]` | Every `<Panel>` header (baked into `Panel.tsx`) |
| `display/row-title` | `0.9rem`–`0.78rem` | 700 | — | — | `matchbook-display text-[0.78rem] font-bold truncate` | List row primary label |
| `display/team-mark` | `0.82rem` | 600 | — | — | baked into `TeamMark` | Team name beside a crest |
| `display/button` | `0.8rem` | 600 | `0.06em` | — | baked into `.mb-btn` | All buttons |
| `display/nav` | `0.85rem` | 600 | `0.08em` | — | baked into `.mb-nav-item` | Sidebar navigation |
| `display/link` | `0.72rem` | 600 | `0.04em` | — | baked into `.mb-panel-link` | Panel actions, footer links |
| `display/meta` | `0.74rem` | 700 | `0.1em` | — | `matchbook-display text-[0.74rem] font-bold tracking-[0.1em]` | Masthead date line |
| `display/table-head` | `0.66rem` | 600 | `0.12em` | — | baked into `.mb-table th` | Table column labels |
| `display/status` | `0.66rem` | 700 | `0.1em` | — | `matchbook-display text-[0.66rem] font-bold tracking-[0.1em]` | Status words (Live/Draft/Final/ACTIVE) |
| `display/kicker` | `0.62rem` | 600 | `0.16em` | — | baked into `.mb-kicker` | Every eyebrow label |
| `display/badge-label` | `0.6rem` | 700 | `0.22em`–`0.28em` | — | `matchbook-display text-[0.6rem] font-bold tracking-[0.22em]` | Masthead badge caption word |

**Body steps (Outfit, sentence case)**

| Name | Size | Weight | Tailwind snippet | Where it ships |
| --- | --- | --- | --- | --- |
| `body/md` | `0.9rem` | 400 | baked into `.mb-input input` | Form fields |
| `body/sm` | `0.85rem` | 400 | baked into `.mb-table td`; `text-[0.85rem]` | Table cells, `PanelEmpty` message, paragraph copy |
| `body/xs` | `0.78rem` | 600 | `text-[0.78rem] font-semibold` | Detail values (Match Report meta) |
| `body/2xs` | `0.72rem` | 400/600 | `text-[0.72rem] text-mb-ink-muted` | Helper text, secondary row lines |
| `body/3xs` | `0.66rem` | 400 | `text-[0.66rem] text-mb-ink-muted` | Sub-labels inside dense rows |

### 2.2 When to use what

- **`.matchbook-display`** — headings, buttons, nav, table headers, statuses,
  labels, team names, and **all numerics that are being *displayed* rather than
  read as prose** (scores, stat values, records, seeds, standings points). If a
  string is short, uppercase, and structural, it is display.
- **Body (default)** — sentences, descriptions, empty-state messages, helper text,
  free-text user input, venue/competition names inside dense rows, table data cells
  that are not the headline number.
- **`.mb-kicker`** — the eyebrow above a value or a field. Always a *label for the
  thing below or beside it*, never a heading. Its colour is baked
  (`--mb-ink-muted`) and it already includes `.matchbook-display`; don't add it.
- **`tabular-nums`** — **mandatory** on any number that (a) changes over time,
  (b) sits in a column, or (c) appears alongside another number to be compared.
  That is: all scores, all standings columns, all stat values, all percentages, all
  records, all times. This is the single most-repeated typographic rule in the
  codebase (~40 call sites) and the one most often missed.
- Uppercase is a *style*, not content: write `Live`, not `LIVE`, in JSX and let CSS
  uppercase it — except where the data itself is an enum
  (`MbTeamStatus = "ACTIVE" | "IDLE"`, `MbReadinessStatus`).

### 2.3 Masthead title colour split

The masthead is two-tone: neutral first word in navy, emphasised word in coral.

```tsx
<h1 className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
  Match <span className="text-mb-coral">Archive</span>
</h1>
```

Shipped variants: `Team **Directory**`, `Quick **Match**`, `Match **Archive**`,
`Tournament **Toolkit**`, `Welcome **Back**` / `Join **the Club**`,
`Compete**.**` (coral full stop). `Tournament Overview` is all-navy because the
Overview screen already carries a coral LIVE NOW badge. **One** coral element in
the masthead title, maximum.

---

## 3. Layout

### 3.1 App shell

Every authenticated Matchbook screen is exactly this skeleton. Copy it verbatim.

```tsx
<div className="matchbook-surface min-h-screen">
  <div className="flex">
    <MatchbookSidebar />

    <div className="min-w-0 flex-1">
      <MatchbookMobileBar active="/summaries" cta={{ href: "/quick-match", label: "Quick Match" }} />

      <main className="px-4 py-5 sm:px-6 lg:px-8">
        {/* masthead */}
        {/* panel grid */}
      </main>
    </div>
  </div>
</div>
```

- `matchbook-surface` goes on the **outermost** element and nowhere else. It sets
  ink colour, paper background + grain texture, and the body font.
- `min-w-0` on the content column is **required** — without it the flex child
  refuses to shrink and every `truncate` in the page stops working.
- Sidebar: `hidden lg:flex w-[218px] shrink-0 … sticky top-0 max-h-screen
  overflow-y-auto` — fixed 218px, sticky, its own scroll.
- Mobile bar: `lg:hidden`, so exactly one of the two is visible at any width.
- Main padding is the fixed triple `px-4 py-5 sm:px-6 lg:px-8`. Do not add a
  `max-w-*` container — Matchbook screens are full-bleed consoles.

Public / unauthenticated screens (Login) drop the sidebar and mobile bar and use a
two-column split instead: `min-h-screen lg:grid lg:grid-cols-2`, paper half left,
`bg-mb-navy` promo half right (`hidden … lg:flex`).

### 3.2 Masthead anatomy

One per screen, `mb-5` below it. Five slots, left to right:

```tsx
<header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
  <div className="flex items-center gap-4">
    {/* 1. TITLE — display/masthead, two-tone */}
    <h1 className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
      Match <span className="text-mb-coral">Archive</span>
    </h1>

    {/* 2. BADGE — coral 2px frame; either a stacked word pair or count+caption */}
    <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-coral">
      <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">{count}</span>
      <span className="matchbook-display text-[0.6rem] font-bold tracking-[0.22em]">Results</span>
    </div>

    {/* 3. DATELINE — hidden on mobile */}
    <div className="hidden sm:block">
      <p className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em]" suppressHydrationWarning>
        {dateLine}
      </p>
      <p className="mb-kicker">{n} matches completed</p>
    </div>
  </div>

  {/* 4. ACTIONS — 1–2 buttons, right-aligned */}
  <div className="ml-auto flex items-center gap-3">
    <button className="mb-btn mb-btn-navy"><MbIcon id="export" size={14} />Export CSV</button>
    <Link href="/quick-match" className="mb-btn mb-btn-coral"><MbIcon id="quick" size={14} />Quick Match</Link>

    {/* 5. ACCOUNT CHIP — hidden below md */}
    <Link href="/login" className="hidden items-center gap-2.5 md:flex" title={user?.email ?? "Account"}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-mb-navy bg-mb-paper-bright">
        <Image src="/assets/matchbook/brand/crest.svg" alt="" width={24} height={28} />
      </span>
      <span className="matchbook-display text-[0.72rem] font-bold leading-tight tracking-[0.08em]">My<br />Account</span>
      <MbIcon id="chevron-down" size={13} className="text-mb-ink-muted" />
    </Link>
  </div>
</header>
```

Rules:
- Badge frame is `border-[2px] border-mb-coral` — the **only** 2px border in the
  system, and the only place coral is used as a frame.
- Any date/time string rendered from `new Date()` on the client must carry
  `suppressHydrationWarning` (see `src/app/page.tsx:60`, `teams/page.tsx:97`).
- The account chip's disc is `h-10 w-10 rounded-full` — the **only** circle in the
  system besides `.mb-live-dot`, icon discs in stat blocks, and colour swatches.
- At most 2 action buttons: at most one coral, at most one navy.
- A screen with a filter bar puts it **between** masthead and grid, as a full-width
  strip framed top and bottom by the heavy rule:
  `mb-4 flex flex-wrap items-end gap-3 border-y-[1.5px] border-mb-navy py-3`
  (`src/app/summaries/page.tsx:118`).

### 3.3 The panel grid

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
  <div className="md:col-span-2 xl:col-span-7"><StandingsPanel … /></div>
  <div className="md:col-span-2 xl:col-span-5"><MatchOfTheDayPanel … /></div>
  <div className="xl:col-span-4">…</div>
</div>
```

- **12 columns at `xl` only.** Below `xl` the grid is 1-col (or 2-col at `md`, used
  on Overview and Teams). Compete, Quick Match, History and Tools use the simpler
  `grid-cols-1 gap-4 xl:grid-cols-12`.
- **`gap-4` (1rem) everywhere.** There is no other grid gap in Matchbook.
- Allowed spans: **7/5**, **4/4/4**, **12**, **7 + 5-stacked**. Do not invent
  8/4, 6/6, 9/3.
- A cell that must stack multiple panels wraps them:
  `<div className="md:col-span-2 xl:col-span-5 flex flex-col gap-4">`.
- Panels stretch to equal height automatically because `.mb-panel` is
  `height: 100%; display:flex; flex-direction:column`. Anything that should sit at
  the bottom of a panel gets `mt-auto`.

**Spacing vocabulary** (the complete set — do not add values):

| Context | Value |
| --- | --- |
| Grid gap, panel-to-panel | `gap-4` (1rem) |
| Masthead → grid | `mb-5` (1.25rem) |
| Masthead internal | `gap-x-6 gap-y-4`, inner cluster `gap-4`, actions `gap-3` |
| Main padding | `px-4 py-5` / `sm:px-6` / `lg:px-8` |
| Panel head padding | `0.65rem 1rem 0.55rem` (baked) |
| Panel body, roomy | `p-4` or `p-5` |
| Panel body, list row | `px-3 py-2` / `px-3 py-2.5` / `px-4 py-2` |
| Panel footer strip | `px-4 py-2` |
| Inline icon↔text | `gap-1.5` / `gap-2` / `gap-2.5` / `gap-3` |
| Form squares | `gap-[3px]` |

**Radius vocabulary:** `4px` (`.mb-panel`, `.mb-btn`, `.mb-input`, `.mb-search`,
`.mb-select-native`), `3px` (`.mb-score-box`, `.mb-seed-box`), `2px`
(`.mb-form-square`, `FormLetters`), `999px` (`.mb-live-dot` and the account disc
only). **Anything ≥ `rounded-lg` is an anti-pattern.**

**Border vocabulary:** `1px solid var(--mb-rule)` = hairline divider.
`1.5px solid var(--mb-navy)` = a real edge (panel body, boxes, inputs, tiles).
`4px` top border = `.mb-panel` only. `2px` = the masthead badge only.
`3px` inset box-shadow = the selection/rank rail.

### 3.4 Panel anatomy

```
┌──── 4px navy top border ───────────────────────────┐
│ HEAD  [icon] TITLE ………………………… action → | meta       │  ← paper: hairline underline
│                                                    │     navy tone: solid navy bar
├────────────────────────────────────────────────────┤
│ BODY  table / list / grid / prose / PanelEmpty      │  flex-1
├────────────────────────────────────────────────────┤
│ FOOT  centred .mb-panel-link, mt-auto (optional)    │
└──── 1.5px navy border, radius 4px, one soft shadow ─┘
```

```css
.mb-panel {
  background: var(--mb-paper-bright);
  border: 1.5px solid var(--mb-navy);
  border-top-width: 4px;
  border-radius: 4px;
  box-shadow: 0 8px 22px rgba(57, 41, 23, 0.08);
  display: flex; flex-direction: column; height: 100%;
}
```

Two head tones, both provided by `<Panel>`:

- `tone="paper"` (default) — `.mb-panel-head`: transparent, hairline bottom rule,
  navy title. Use for **data** panels (tables, ledgers, lists).
- `tone="navy"` — `bg-mb-navy px-4 py-2.5 text-mb-paper-bright`, head icon forced
  to `text-mb-gold`. Use for **summary / hero** panels (Club Snapshot, Tournament
  Status, Archive Summary, Scoreboard Preview, Court Reference). Max **one or two**
  navy panels per screen; they are the visual anchor.

Head right slot is either an action link (`action` + `href` → `.mb-panel-link` with
a `chevron-right`) **or** `meta` (a `.mb-kicker` count, a `.mb-search` field). Never
both — the component picks `href && action` first.

Panel-height escape hatch: `.mb-panel` forces `height:100%`. On a page where the
panel is not a grid child (Login), override with the Tailwind v4 important
modifier: `className="mb-panel h-auto!"` (`src/app/login/page.tsx:107`).

### 3.5 Rules and dividers

| Rule | Class | Use |
| --- | --- | --- |
| Hairline | `border-mb-rule` (1px) | Between rows, under panel head, between form sections |
| List divider | `divide-y divide-mb-rule` | Any vertical list of rows (the standard) |
| Column divider | `divide-x divide-mb-rule` | Stat triptychs (Leaders, Club Snapshot) |
| Heavy | `border-t-[1.5px] border-mb-navy` | Panel footer summary strips, section splits inside a panel |
| Heavy frame | `border-y-[1.5px] border-mb-navy` | The filter bar |
| Coral spine | `ml-3 border-l-2 border-mb-coral` | Schedule/timeline lists only |
| Accent rail | `style={{ boxShadow: "inset 3px 0 0 <color>" }}` | Rank #1 (`--mb-teal`), selected row (`--mb-coral`), result category (cycle) |
| On-navy hairline | `border-[rgba(255,250,241,0.25)]` | Dividers inside a navy surface |
| Inline separator | `<span className="h-px flex-1 bg-mb-rule" />` | "Or continue with email" style splitters |

---

## 4. Component inventory

### 4.1 CSS classes in `globals.css` (complete)

| Class | Use this when | Snippet |
| --- | --- | --- |
| `.matchbook-surface` | Outermost wrapper of any Matchbook page. Once per page. | `<div className="matchbook-surface min-h-screen">` |
| `.matchbook-display` | Any Oswald uppercase text not already covered by another `mb-*` class. Always pair with an explicit size + tracking. | `<span className="matchbook-display text-[0.78rem] font-bold">` |
| `.mb-panel` | The boxed content card. Every content region on a Matchbook screen lives in one. | `<section className="mb-panel">` (prefer `<Panel>`) |
| `.mb-panel-head` | Paper-tone panel header. Provided by `<Panel>`; hand-write only for a bespoke header. | `<header className="mb-panel-head">` |
| `.mb-panel-link` | Small uppercase forward link: panel actions, footer links, "Open" affordances. Turns coral on hover. | `<Link className="mb-panel-link">Open <MbIcon id="chevron-right" size={11} /></Link>` |
| `.mb-btn` | Base for every button/link-button. Never used alone — always + a variant. | `<button className="mb-btn mb-btn-navy">` |
| `.mb-btn-navy` | Secondary/structural action ("Manage Event", "Export CSV", "Add Team"). Highest contrast. | `<button className="mb-btn mb-btn-navy"><MbIcon id="plus" size={14} />Add Team</button>` |
| `.mb-btn-coral` | The single primary CTA of a screen or panel. | `<Link className="mb-btn mb-btn-coral"><MbIcon id="quick" size={14} />Quick Match</Link>` |
| `.mb-btn-outline` | Tertiary / destructive-adjacent on paper; coral text on transparent. | `<button className="mb-btn mb-btn-outline"><MbIcon id="warning" size={14} />Delete</button>` |
| `.mb-btn-outline-navy` | Neutral outline on bright fill: auth providers, "Continue as Guest", "Random Teams". | `<button className="mb-btn mb-btn-outline-navy w-full">Continue with Google</button>` |
| `.mb-nav-item` | Sidebar navigation row. Active state via `data-active="true"` (coral text + coral 3px left border + coral tint). | `<Link className="mb-nav-item" data-active={active}><MbIcon id="teams" size={18} />Teams</Link>` |
| `.mb-kicker` | Eyebrow label above/beside a value or field. Already display+muted. | `<p className="mb-kicker">Next Match</p>` |
| `.mb-form-square` | 11×11 W/L square in a form strip. Colour set inline. Use `FormSquares`. | `<span className="mb-form-square" style={{background:"var(--mb-green)"}} />` |
| `.mb-live-dot` | 7px pulsing red dot. Always immediately followed by the word "Live". | `<span className="mb-live-dot" /><span className="matchbook-display text-[0.62rem] font-bold text-mb-red">Live</span>` |
| `.mb-score-box` | Boxed single score in a dense row, or the literal "VS" pip. min-width 26px. | `<span className="mb-score-box">{homeScore}</span>` · `<span className="mb-score-box px-2 text-[0.7rem] tracking-[0.1em]">VS</span>` |
| `.mb-seed-box` | Bracket seed slot: seed number + crest + name. | `<div className="mb-seed-box">…</div>` |
| `.mb-table` | Any tabular data. Head = display micro-caps on a 1.5px navy underline; rows = hairline. | `<table className="mb-table w-full border-collapse">` |
| `.mb-table-compact` | `.mb-table` in a narrow panel: tighter x-padding + `white-space: nowrap`. | `<table className="mb-table mb-table-compact w-full border-collapse">` |
| `.mb-search` | Inline filter field inside a panel header (`meta` slot). Fixed 9rem input. | `<label className="mb-search"><MbIcon id="search" size={13} className="shrink-0 text-mb-ink-muted" /><input type="search" … /></label>` |
| `.mb-input` | Full-size text field. Wrapper + `<input>` + trailing icon. Focus ring = navy border. | `<div className="mb-input"><input … /><MbIcon id="mail" size={16} className="shrink-0 text-mb-navy" /></div>` |
| `.mb-select-native` | Native `<select>`, appearance-stripped, display type, coral focus outline. Needs a manual chevron. | see snippet below |
| `@keyframes mb-pulse` | The one Matchbook animation (opacity 1 → 0.35 → 1, 1.4s). | consumed by `.mb-live-dot` |

Select pattern (the chevron is not automatic):

```tsx
<div className="relative">
  <select className="mb-select-native" value={v} onChange={…} aria-label="Filter by team">…</select>
  <MbIcon id="chevron-down" size={13}
    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mb-ink-muted" />
</div>
```

### 4.2 React exports in `src/components/matchbook/`

**`MbIcon.tsx`**

| Export | Use this when |
| --- | --- |
| `MbIcon({ id, size, className })` | Any icon, anywhere. `currentColor`; `aria-hidden` is baked in. |

```tsx
<MbIcon id="chevron-right" size={11} />
```

**`Panel.tsx`**

| Export | Use this when | Snippet |
| --- | --- | --- |
| `Panel` | Standard boxed region. Handles head, tone, action link, meta slot. | `<Panel title="Live Courts" action="View All" href="/competitions">…</Panel>` |
| `Panel` (navy) | Summary/hero region. | `<Panel title="Archive Summary" tone="navy" icon="chart">…</Panel>` |
| `Crest` | A team crest image at a given size (aspect 96:112 preserved). | `<Crest team={row.team} size={20} />` |
| `TeamMark` | Crest + team name as one inline unit. `reverse` flips it for the away side. | `<TeamMark team={m.away} size={18} reverse className="justify-self-end" />` |
| `FormSquares` | Compact W/L strip padded to `slots` (default 8). `warnTint` recolours a poor run gold/red. | `<FormSquares form={row.form} slots={5} warnTint />` |
| `FormLetters` | W/L strip with letters, for when the result must be readable, not just scanned. | `<FormLetters form={summary.form} />` |
| `PanelEmpty` | The empty state inside any panel. Optional single outline CTA. | `<PanelEmpty message="No results exist yet — finished matches will be recorded here." actionLabel="Play a match" href="/quick-match" />` |

**`Sidebar.tsx` / `MobileBar.tsx`**

| Export | Use this when |
| --- | --- |
| `MatchbookSidebar` | Every authenticated screen. Owns `NAV_ITEMS`; adding a top-level route means editing this array **and** `MOBILE_NAV`. |
| `MatchbookMobileBar` | Every authenticated screen, directly under the sidebar in the tree. `active` is the pathname string; `cta` is the single mobile action. |

**`types.ts`**

`MbTeam`, `MbFormResult`, `MbStandingRow`, `MbSetScore`, `MbFeaturedMatch`,
`MbLiveCourt`, `MbScheduleItem`, `MbBracketSeed`, `MbBracket`, `MbRecentResult`,
`MbReadinessStatus`, `MbReadinessRow`, `MbLeader`, `MbStatTotal`,
`MbDashboardData`, `MbTeamStatus`, `MbNextMatch`, `MbTeamRow`, `MbFormRow`,
`MbTeamsData`, plus:

- `crestPath(slug)` → `/assets/matchbook/teams/{slug}.svg`
- `crestForTeam(teamId, teamName)` → deterministic crest for a real team. **Every**
  team rendered on a Matchbook screen goes through this. Never hard-code a crest
  path for user data.

**`teamStats.ts`** — `buildTeamTallies`, `emptyTally`, `recentForm` (last 5,
oldest→newest), `readinessPercent`, `readinessStatus`, `readinessColor`. Use these
so two screens never disagree about a team's record.

**Data hooks** — `useMatchbookDashboard`, `useMatchbookTeams`,
`useMatchbookCompete`, `useMatchbookHistory`, `useMatchbookQuickMatch`. Pattern to
copy for a new screen: a pure `build<Screen>(state)` function + a
`useMemo(() => build(state), [state])` hook, so the page component contains **no**
data shaping.

**Panel libraries** — `panels.tsx` (Overview: `StandingsPanel`,
`MatchOfTheDayPanel`, `LiveCourtsPanel`, `SchedulePanel`, `BracketPanel`,
`RecentResultsPanel`, `ReadinessPanel`, `LeadersPanel`) and `teamPanels.tsx`
(Teams: `TeamDirectoryPanel`, `ClubSnapshotPanel`, `TeamReadinessPanel`,
`TeamProfilePanel`, `UpcomingFixturesPanel`, `RecentFormPanel`). Screen-specific;
read them for idiom, import only if the panel is genuinely the same panel.

### 4.3 Recurring inline recipes (no class yet — copy exactly)

| Recipe | Code | Sites |
| --- | --- | --- |
| Row hover | `className="transition-colors hover:bg-[rgba(7,50,77,0.04)]"` | 6 |
| Selection / rank rail | `style={{ boxShadow: "inset 3px 0 0 var(--mb-coral)" }}` | 7 |
| Boxed tile | `className="border-[1.5px] border-mb-navy bg-mb-paper-bright p-4"` | 14 |
| Icon disc | `className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-mb-navy text-mb-navy"` | 4 |
| Panel footer link | `<div className="border-t border-mb-rule px-4 py-2 text-center mt-auto"><Link className="mb-panel-link justify-center">…<MbIcon id="chevron-right" size={11} /></Link></div>` | 5 |
| Progress bar | `<span className="h-[7px] w-24 overflow-hidden rounded-sm bg-[rgba(7,50,77,0.12)]"><span className="block h-full" style={{width:`${p}%`, background: readinessColor(p)}} /></span>` | 2 |
| Inline error | `<p className="border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red" role="alert">` | 2 |
| Inline success | `<p className="border-[1.5px] border-mb-green px-3 py-2 text-[0.8rem] font-medium text-mb-green" role="status">` | 1 |
| Disabled button | `className="mb-btn mb-btn-coral disabled:cursor-not-allowed disabled:opacity-40"` | 3 |

---

## 5. Data display

### 5.1 Tables

```tsx
<div className="overflow-x-auto">
  <table className="mb-table w-full border-collapse">
    <thead>
      <tr>
        <th className="w-8 text-center">#</th>
        <th>Team</th>
        <th className="text-center">W</th>
        <th className="text-center">Pts</th>
        <th>Form</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={row.team.name + i}>
          <td className="matchbook-display text-center font-bold"
              style={i === 0 ? { boxShadow: "inset 3px 0 0 var(--mb-teal)" } : undefined}>{i + 1}</td>
          <td><TeamMark team={row.team} /></td>
          <td className="text-center tabular-nums">{row.won}</td>
          <td className="matchbook-display text-center font-bold tabular-nums">{row.points}</td>
          <td><FormSquares form={row.form} warnTint /></td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

Rules:
- The table is **always** wrapped in `overflow-x-auto`. This is the only sanctioned
  horizontal scroll on a Matchbook page, and it must be on the wrapper, never the
  page.
- Column headers are short caps (`#`, `P`, `W`, `L`, `Pts`, `PF`, `PA`, `PD`,
  `Pct`, `Sets`). Rank column is `w-8 text-center`.
- Rank/identity columns are `matchbook-display font-bold`; measures are
  `text-center tabular-nums`; the headline measure (Pts, PD) is *both*.
- Row 1 gets the teal rail; the selected row gets the coral rail — coral wins.
- In a narrow (`xl:col-span-5` or less) panel, add `mb-table-compact` and reclaim
  edge padding with `pl-3!` / `pr-3!` on the first/last cells.
- Clickable rows: `cursor-pointer transition-colors hover:bg-[rgba(7,50,77,0.04)]`
  plus `aria-current`. If the row is a *control* (History ledger), render a
  `<button type="button" className="grid w-full … text-left">` instead of a `<tr>`.
- Empty tables never render — swap the whole `<table>` for `<PanelEmpty>`.

### 5.2 Scores

Three registers. Pick by importance, never mix within one panel.

| Register | Markup | Where |
| --- | --- | --- |
| Hero | `matchbook-display text-5xl font-bold tabular-nums` (or `text-6xl`) with a `.mb-score-box` "VS" pip between | Match of the Day, Scoreboard Preview, Match Report |
| Row | `matchbook-display whitespace-nowrap text-[0.95rem] font-bold tabular-nums` rendering `{home} – {away}` | Recent Results, ledger rows, live courts |
| Boxed | two `.mb-score-box` separated by `<span className="text-mb-ink-muted text-xs">–</span>` | Live Courts (per-court score) |

The separator is an **en dash** `–` (U+2013) with spaces, everywhere. Not a hyphen,
not an em dash. Set scores use the `1fr auto 1fr` three-column grid with a
`.mb-kicker` label in the middle, winner side in `font-bold`, loser side in
`text-mb-ink-muted` (`panels.tsx:148`).

### 5.3 Form strips

`FormSquares` for scanning (default 8 slots, padded with
`rgba(7,50,77,0.12)` blanks so the strip has constant width); `FormLetters` for
reading. `warnTint` recolours the whole strip gold (≤50% wins) or red (0 wins) — it
is a *summary* signal, so never combine it with per-result colour reading.
`recentForm()` returns oldest→newest, i.e. left-to-right chronological.

### 5.4 Crests

`Crest` is the identity primitive. **The asset pack contains no person-level
imagery — no avatars, portraits, players, coaches, or officials.** Never introduce
one. Sizes in use: 16, 18, 20, 22, 24 (`TeamMark` default), 26 (`Crest` default),
36, 40, 54, 56, 58, 62, 64, 86. Aspect is 96:112 and `Crest` preserves it — do not
pass a raw `<Image>` with a square box.

### 5.5 Live indicator

```tsx
<span className="flex items-center gap-1">
  <span className="mb-live-dot" />
  <span className="matchbook-display text-[0.62rem] font-bold text-mb-red">Live</span>
</span>
```

Dot and word always ship together. The masthead variant is the coral 2px badge
reading `Live / Now` stacked.

### 5.6 Status badges

There is no badge class yet (GAP-4). The shipped pattern is display micro-caps with
the colour applied inline from a lookup:

```tsx
const STATUS_STYLES = {
  in_progress: { label: "Live",  color: "var(--mb-red)" },
  draft:       { label: "Draft", color: "var(--mb-gold)" },
  completed:   { label: "Final", color: "var(--mb-green)" },
} as const;

<span className="matchbook-display text-[0.66rem] font-bold tracking-[0.1em]"
      style={{ color: STATUS_STYLES[status].color }}>
  {STATUS_STYLES[status].label}
</span>
```

The framed variant (masthead) uses `border-[2px]` with `borderColor` and `color`
both set from the same token.

### 5.7 Empty states

Every panel that can be empty renders `<PanelEmpty>`. Copy rules, from the shipped
strings:

- Format: **"No <things> exist yet — <what makes them appear>."** Em dash, lower
  case after it, full stop. Examples: `"No standings exist yet — create teams and
  play matches to build the table."`, `"No live matches exist yet — matches in
  progress will appear here."`
- Optional single CTA, sentence case, `.mb-btn .mb-btn-outline` at reduced size
  (baked into `PanelEmpty`). One CTA maximum.
- Filtered-to-nothing is a different message and gets **no** CTA:
  `` `No teams match “${search}”.` `` (curly quotes).
- Loading is plain text, not a spinner:
  `<p className="p-4 text-center text-[0.8rem] text-mb-ink-muted">Loading saved formations…</p>`
  (real ellipsis character).
- No illustrations, no icons, no emoji in empty states.

---

## 6. Iconography

One sprite: `public/assets/matchbook/icons/sprite.svg`, consumed only via `MbIcon`.
Every symbol inherits `currentColor`.

**The complete id list (62) — verified against the sprite and `manifest.json`:**

```
Navigation:  overview  teams  quick  compete  history  tools
Chrome:      settings  help  bell  menu  more  close  grid
             chevron-right  chevron-down  chevron-left
Actions:     plus  minus  export  import  share  link  copy  print  save
             search  filter  edit  trash  drag  undo  refresh
             expand  collapse  arrow-move  queue
Domain:      volleyball  bracket  chart  swap  court  clipboard  star
             crown  trophy  streak  shield
State:       check  warning  live  clock  calendar  location  wifi-off
Auth:        mail  lock  key  eye  eye-off  login  logout  cloud
```

`qr` does not exist and is not coming — `MbQrCode` is cut (charter Appendix A,
D-11).

Anything not on that list does not exist. Do not import `lucide-react` or
`@heroicons` into a Matchbook screen — both are still present in the codebase for
legacy screens, and both look wrong here (rounded, thin, non-condensed).

**Size ladder** (only these): `10`, `11` (chevron in `.mb-panel-link`), `12`, `13`
(masthead chevron / select chevron), `14` (button icons), `15`, `16` (panel-head
icon, `.mb-input` trailing icon), `18` (sidebar nav, detail rows), `20` (feature
lists, tile icons), `22`, `30` (Club Snapshot).

**Colour rules:**

- Default: inherit. An icon inside navy text is navy; inside a `.mb-btn-coral` it
  is white. Don't set a colour unless you're deviating.
- On `bg-mb-navy`: `text-mb-gold` for the panel-head icon (this is what `<Panel
  tone="navy">` does automatically), `text-mb-paper-bright` for list icons.
- Decorative/secondary: `text-mb-ink-muted` (select chevrons, account chevron).
- Semantic overrides only where the meaning is the colour: `text-mb-green` on
  `check`, `text-mb-red` on hover for a destructive `warning` icon,
  `text-mb-coral` on `location`.

**Pairing:** icons pair with display-cased labels at `gap-1.5`–`gap-3`. A button
icon is always **14px** and always **before** the label. A forward link's
`chevron-right` is always **11px** and always **after**. Standalone icon buttons
must carry `title` (and ideally `aria-label`); `MbIcon` is `aria-hidden`, so an
icon-only control with no label is invisible to screen readers.

**Other assets:** `brand/crest.svg` (64×72 sidebar, 34×40 mobile, 52×60 login,
24×28 account disc), `brand/lockup.svg`, `auth/google-g.svg` (16×16),
`teams/*.svg` (8 crests), `diagrams/volleyball-court.svg`,
`textures/paper-grain.svg` (referenced only by `.matchbook-surface`).

---

## 7. Motion

### 7.1 What actually exists today (IMPLEMENTED)

| Motion | Where | Spec |
| --- | --- | --- |
| Live-dot pulse | `.mb-live-dot` | `mb-pulse` 1.4s ease-in-out infinite, opacity 1 → 0.35 |
| Button hover | `.mb-btn` | `transition: filter .15s ease, background-color .15s ease, color .15s ease`; `filter: brightness(1.08)` |
| Outline button hover | `.mb-btn-outline` / `-outline-navy` | background tint only, `filter: none` |
| Nav hover / active | `.mb-nav-item` | `transition: background-color .15s ease, color .15s ease` |
| Row hover | inline | `transition-colors` (Tailwind, 150ms) |
| Input focus | `.mb-input` | `transition: border-color .15s ease` |
| Global press | `globals.css:1128` | `button:active:not(:disabled) { transform: scale(.98) }` — applies to Matchbook buttons too |
| Reduced motion | `globals.css:1240` | Global `@media (prefers-reduced-motion: reduce)` clamps all animation/transition to 0.01ms |

**That is the entire Matchbook motion system.** There are no framer-motion
animations, no entrance animations, no stagger, and no page transitions on any
converted screen. `framer-motion` appears in 21 files, all of them **unconverted**
(match consoles, volleyball editor, old toasts, `PageLoadingSpinner`).

### 7.2 Intended system (ASPIRATIONAL — not implemented, do not assume it exists)

Proposed so six engineers converge instead of each inventing. **Ship nothing from
this section without adding the tokens to `globals.css` first** (GAP-11).

- **Durations:** `--mb-dur-fast: 120ms` (press, tint), `--mb-dur-base: 180ms`
  (hover, focus, colour), `--mb-dur-slow: 280ms` (panel/entry, dialog).
- **Easings:** `--mb-ease-out: cubic-bezier(.2,.8,.3,1)` for anything entering;
  `--mb-ease-in-out: cubic-bezier(.4,0,.2,1)` for anything that moves both ways.
  **No springs, no bounce, no overshoot** — printed matter does not wobble.
- **Entrance:** opacity 0→1 plus `translateY(6px)→0` at `--mb-dur-slow`. 6px, not
  the legacy 10–15px. Never scale a panel in.
- **Stagger:** 40ms per panel, capped at 6 panels (240ms). Grid order only.
- **Press:** keep the existing `scale(.98)`; do not add lift/translate.
- **Page transitions:** cross-fade only, `--mb-dur-base`. No slide, no shared
  layout, no `layoutId`.
- **Score changes:** the one place a value may animate. Opacity + 4px rise at
  `--mb-dur-fast`, no scale, no flip. (The legacy `numberFlip` spring in
  `src/components/motion/index.tsx` is explicitly **not** Matchbook.)
- **Reduced motion:** the global clamp already handles transitions. Any new
  JS-driven motion must additionally check `useReducedMotion()` and render the end
  state; `.mb-live-dot` must fall back to a static dot (already handled by the
  global rule setting `animation-iteration-count: 1`).

---

## 8. Mobile rules

`lg` (1024px) is the shell breakpoint: sidebar above, `MatchbookMobileBar` below.
`xl` (1280px) is the grid breakpoint: 12 columns above, 1–2 below. `md` (768px)
gates the account chip; `sm` (640px) gates the masthead dateline.

**Reflow:**
- Panels go full width and stack in DOM order — so **order your grid children by
  mobile priority**, not by desktop position.
- `.mb-panel` keeps `height:100%`, which is harmless once each panel is its own row.
- Everything with `hidden sm:block` / `hidden xl:block` (dateline, venue columns,
  competition column) simply disappears. Never hide *primary* data this way — only
  redundant context.

**Horizontal scroll:**
- The page body must never scroll horizontally. `html, body { overflow-x: hidden }`
  is set globally, which *hides* the symptom — so verify with the layout, not the
  scrollbar.
- Only two elements may scroll horizontally: a `.mb-table` wrapper
  (`overflow-x-auto`) and the mobile nav strip (`overflow-x-auto scrollbar-thin`).
  Bracket rails also use `overflow-x-auto` on their own container.
- Every flex/grid child that contains text needs `min-w-0`, and long strings need
  `truncate`. This is the #1 cause of mobile overflow in this codebase.

**Touch targets (current state is non-compliant — read GAP-14):**
- `.mb-btn` computes to ~37px tall. Below the 44×44 CSS-px minimum.
- Mobile nav links are `px-3 py-1.5 text-[0.74rem]` ≈ 28px tall.
- Icon-only buttons (delete, copy-link) are 14px icons with no padding box.

Until the gap is closed, **new** touch controls must pad to 44px:
`className="mb-btn mb-btn-coral min-h-[44px] px-4"` and icon-only controls get
`className="flex h-11 w-11 items-center justify-center"`.

**Thumb reach:** the primary action currently lives in the masthead at the *top* of
the page, and the mobile bar is also top-anchored — everything important is out of
thumb reach on a tall phone. Until GAP-3 lands, a screen whose main job is a single
repeated action (scoring) must place that action in a bottom-anchored region of its
own.

**Safe areas:** there is **no** `env(safe-area-inset-*)` handling anywhere in the
codebase, and `viewport-fit` is not set. Any new bottom-anchored element must add
`padding-bottom: env(safe-area-inset-bottom)` itself. See GAP-3.

**Viewport is locked:** `layout.tsx` sets `maximumScale: 1, userScalable: false`.
That means users cannot pinch to rescue small text, so the 0.6–0.66rem display
steps must never carry information that isn't repeated at a larger size.

**Landscape:** `globals.css:371` provides `@media (max-height: 500px)` helpers
(`.hide-landscape`, `.show-landscape`, `.landscape-row`) built for the scoring
console. They are legacy-named but system-neutral; reuse rather than reinvent.

---

## 9. Anti-patterns — what must be deleted when converting a screen

The old "playful warm" system. If any of these survive in a converted file, the
conversion is not done.

**Classes to remove (all defined in `globals.css` lines 451–1511):**

```
.soft-card  .soft-card-hover  .glass-card  .glass-card-hover  .glass-nav
.glass-input  .flat-nav  .playful-card  .playful-card-{mint,lavender,sky,peach,sage}
.btn-playful  .btn-playful-primary  .btn-soft  .btn-red-gradient  .btn-teal-gradient
.shadow-soft  .shadow-soft-{sm,md,lg}  .glow-{red,primary,amber,success,live}
.card-lift  .shine-hover  .animated-gradient  .animated-gradient-subtle
.bg-tournament  .bg-waves  .decorative-circle  .decorative-blob
.text-highlight  .text-highlight-{mint,lavender,sky}
.status-{draft,active,complete,live}  .live-dot  .vs-divider
.score-text  .score-glow  .rank-{gold,silver,bronze}  .icon-container
.team-{blue,orange,red}-gradient  .animate-fade-in{,-delay-1,-2,-3}  .stagger-{1..6}
```

**Token references to remove:** `bg-background`, `text-foreground`, `bg-card`,
`text-muted-foreground`, `border-border`, `bg-primary`, `text-primary`,
`bg-destructive`, `bg-accent`, `bg-secondary`, `var(--radius*)`, `var(--card-*)`,
`var(--status-*)`, `var(--chart-*)`, `oklch(...)` literals, `.dark` variants,
`dark:` prefixes.

**Shapes and effects to remove:**
- `rounded-xl` / `rounded-2xl` / `rounded-3xl` / `rounded-full` on anything that is
  not the account disc, `.mb-live-dot`, an icon disc, or a colour swatch.
- Gradients of every kind (`linear-gradient`, `bg-gradient-to-*`).
- All `box-shadow` other than the one baked into `.mb-panel`. No glows.
- Hover lift (`translateY(-2px)`, `scale(1.01)`), shine sweeps, blurs.
- Emoji, in JSX **and** in strings. The system uses sprite icons only.
- `lucide-react` and `@heroicons/react` imports.
- `<Navigation />` / `<Header />` — replaced by `MatchbookSidebar` +
  `MatchbookMobileBar`.
- `<ThemeToggle />` and any `.dark` handling (Matchbook is light-only).
- `max-w-6xl mx-auto` page containers — Matchbook is full-bleed.
- shadcn `<Button>`, `<Card>`, `<Badge>`, `<Input>` — replaced by `.mb-btn`,
  `<Panel>`, status spans, `.mb-input`.
- framer-motion entrance/stagger/spring wrappers (`PageTransition`,
  `StaggerContainer`, `StaggerItem`, `slideUp`, `springSmooth`, `MotionDiv`).
- The word "Card" in component names for anything that is now a Panel.

**Copy to fix:** exclamation marks, "Oops", "Let's", cheerleading. Matchbook copy is
almanac-dry: `"No results exist yet — finished matches will be recorded here."`

---

## 10. Screen conversion checklist

A screen is **done** when every box is ticked.

**Shell**
- [ ] Outermost element is `<div className="matchbook-surface min-h-screen">`, once.
- [ ] `<div className="flex">` → `<MatchbookSidebar />` + `<div className="min-w-0 flex-1">`.
- [ ] `<MatchbookMobileBar active="<pathname>" cta={…} />` present with the right `active`.
- [ ] `<main className="px-4 py-5 sm:px-6 lg:px-8">`, no `max-w-*` container.
- [ ] No `<Navigation />`, `<Header />`, or `<ThemeToggle />`.

**Masthead**
- [ ] Exactly one `<h1>` at `display/masthead`, two-tone with **one** coral span.
- [ ] Coral `border-[2px]` badge with a count or a stacked word pair (optional but standard).
- [ ] `hidden sm:block` dateline + `.mb-kicker` sub-line; client dates have `suppressHydrationWarning`.
- [ ] `ml-auto` action cluster: ≤2 buttons, ≤1 coral, ≤1 navy.
- [ ] Account chip (`hidden md:flex`) matching the shipped markup.
- [ ] `mb-5` gap to the grid.

**Grid & panels**
- [ ] `grid grid-cols-1 gap-4 xl:grid-cols-12` (add `md:grid-cols-2` only if the screen has ≥6 panels).
- [ ] Spans are only 7/5, 4/4/4, or 12.
- [ ] Every region is a `<Panel>` (or `.mb-panel`); nothing floats loose on the paper.
- [ ] 1–2 `tone="navy"` panels max, used for summary not data.
- [ ] Every panel that can be empty renders `<PanelEmpty>` with an "exist yet —" message.
- [ ] Bottom-anchored panel content uses `mt-auto`.

**Type & colour**
- [ ] Every font size maps to a named step in §2.1. No off-scale values.
- [ ] All display text uses `.matchbook-display` (or a class that includes it) **plus** an explicit tracking.
- [ ] `tabular-nums` on every score, stat, percentage, record, time, and table measure.
- [ ] No `--mb-gold` text on paper; no `--mb-ink-muted`/`--mb-red`/`--mb-plum` text on navy.
- [ ] New status text under 18.66px is navy or ink-muted, with colour carried by a dot/square/border.
- [ ] Colour is never the only signal.

**Components**
- [ ] All icons are `<MbIcon>` with ids from the §6 list; no lucide/heroicons.
- [ ] All buttons are `.mb-btn` + exactly one variant.
- [ ] All team identities go through `crestForTeam()` / `Crest` / `TeamMark`.
- [ ] All records/form/readiness numbers come from `teamStats.ts`, not local math.
- [ ] Data shaping lives in a `useMatchbook*`-style hook, not in the component.

**Responsive**
- [ ] Grid children ordered by **mobile** priority.
- [ ] Every text-bearing flex/grid child has `min-w-0`; long strings `truncate`.
- [ ] Tables wrapped in `overflow-x-auto`; no other horizontal scroll.
- [ ] Nothing important is hidden behind `hidden sm:*` / `hidden xl:*`.
- [ ] New touch controls are ≥44px (`min-h-[44px]`, or `h-11 w-11` for icon-only).
- [ ] Checked at 375px, 768px, 1024px, 1280px, 1440px.

**Hygiene**
- [ ] Zero matches for the §9 anti-pattern list in the changed files.
- [ ] Zero emoji.
- [ ] Icon-only controls have `title` and `aria-label`; selects and search inputs have `aria-label`.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npx eslint <changed paths>` clean.
- [ ] `npx vitest run` green.
- [ ] Visually diffed against `src/app/page.tsx` and `src/app/summaries/page.tsx`.

---

## 11. GAPS TO BUILD

Real holes. Do **not** invent a token or class to fill one — build it here, in
`globals.css` / `src/components/matchbook/`, and update this document.

### GAP-1 — Dialogs and modals have no Matchbook skin (**highest priority**)
`src/components/ui/dialog.tsx` is stock shadcn (`bg-background`, `rounded-lg`,
`shadow-lg`, `zoom-in-95`, lucide `XIcon`), and `DeleteConfirmDialog` renders
shadcn `<Button>` with `rounded-xl` and a heroicon. Converted screens (Teams,
Compete, History) already open these — the modal is currently the loudest visual
regression in the app.

```tsx
// src/components/matchbook/Dialog.tsx
<MbDialog open onOpenChange={setOpen}
          title="Delete Team?" icon="warning" tone="paper" | "navy"
          size="sm" | "md" | "lg">
  <MbDialogBody>…</MbDialogBody>
  <MbDialogFooter>
    <button className="mb-btn mb-btn-outline-navy">Cancel</button>
    <button className="mb-btn mb-btn-coral">Delete</button>
  </MbDialogFooter>
</MbDialog>
```
Backing CSS: `.mb-dialog` (paper-bright, `border:1.5px solid navy`,
`border-top-width:4px`, radius 4px, the one panel shadow),
`.mb-dialog-overlay` (`rgba(7,50,77,0.55)` — navy wash, not black),
`.mb-dialog-head` (mirrors `.mb-panel-head`), `.mb-dialog-foot`
(`border-top:1.5px solid navy`, right-aligned, `gap-2`). Close affordance is an
`MbIcon` (needs a `close`/`x` id added to the sprite — currently missing).
`ui/sheet.tsx` needs the same treatment for mobile drawers.

### GAP-2 — No toast / transient notification
`UndoToast.tsx` and `GlobalUndoToast.tsx` are old-theme + framer-motion.

```tsx
<MbToast tone="info" | "success" | "warning" | "danger"
         icon="check" message="Point undone."
         action={{ label: "Redo", onClick }} duration={5000} />
```
`.mb-toast`: paper-bright, `1.5px` navy border, 4px **left** border in the tone
colour (mirrors the accent rail), radius 4px, panel shadow, display-cased label +
body message. Bottom-centre, `bottom: calc(1rem + env(safe-area-inset-bottom))`,
`role="status"` (`role="alert"` for danger).

### GAP-3 — No mobile bottom navigation, no safe-area handling
`MatchbookMobileBar` is a top brand bar plus a horizontally scrolling nav strip:
out of thumb reach, sub-44px targets, and it consumes vertical space on every
screen. Nothing in the repo reads `env(safe-area-inset-*)`.

```tsx
<MatchbookBottomBar active="/teams" />   // 5 primary routes + "More"
```
`.mb-bottom-bar`: fixed bottom, paper-bright, `border-top: 1.5px solid navy`,
`padding-bottom: env(safe-area-inset-bottom)`, items `min-h-[44px]`, icon 20 +
`display/badge-label` caption, active = coral icon + coral 2px **top** border.
Also add `viewport-fit: cover` to the viewport in `layout.tsx` and a
`.mb-safe-bottom` utility.

### GAP-4 — No badge / chip / pill primitive
Status is hand-rolled with inline `style={{ color }}` at 6+ sites.

```tsx
<MbBadge tone="live" | "draft" | "final" | "win" | "loss" | "neutral" | "teal"
         variant="text" | "framed" | "solid" size="sm" | "md">Live</MbBadge>
```
`.mb-badge` + `[data-tone]` + `[data-variant]`. **Shipped in `globals.css`; the
original proposal above is corrected by measurement.** The letterforms are always
`--mb-navy`, because tone-coloured text at `0.66rem/700` is exactly the §1.3
rule-1 debt this class exists to retire — on paper `--mb-green` is 3.93:1,
`--mb-red` 4.20:1, `--mb-coral` 3.26:1, `--mb-gold` 1.97:1. The tone rides a
second channel:

| Variant | Tone carried by | Contrast |
| --- | --- | --- |
| `text` | the paired mark — `.mb-live-dot`, or a `.mb-form-square` that inherits `--mb-badge-fill` | navy ink, 11.79:1 |
| `framed` | a 1.5px rule in `--mb-badge-ink` (`draft`/`warn` use `--mb-gold-ink`) | every tone ≥3:1, the UI-component floor |
| `solid` | a tone fill with `#fff` ink | **`live` only** — 4.76:1. `final` is 4.45:1 with white and 4.28:1 with paper-bright, so solid green is not permitted |

### GAP-5 — No tabs / segmented control
Competition detail, match consoles, and the rotation designer all need one and will
each invent a different thing.

```tsx
<MbTabs value={tab} onValueChange={setTab}
        items={[{ value: "bracket", label: "Bracket", icon: "bracket" }, …]} />
```
`.mb-tabs` (flex row, `border-bottom: 1.5px solid navy`), `.mb-tab`
(`display/nav` type, `padding: .5rem 1rem`, `min-height: 44px`),
`.mb-tab[data-active="true"]` (coral text + coral 3px **bottom** border — the
horizontal mirror of `.mb-nav-item`).

### GAP-6 — Form controls stop at text input and native select
Existing: `.mb-input`, `.mb-search`, `.mb-select-native`. Missing entirely:
textarea, checkbox, radio, switch/toggle, number stepper, slider, colour picker,
date/time input, and a label/hint/error triad. The create-competition wizard and
team form need all of them.

```
.mb-field            wrapper: .mb-kicker label + control + .mb-field-hint / .mb-field-error
.mb-textarea         .mb-input geometry, min-height 5rem, resize-y
.mb-check            14×14, 1.5px navy, radius 2px, coral fill + paper-bright check when on
.mb-radio            14×14 circle, navy ring, coral dot
.mb-switch           28×16 track, square-ish (radius 2px), navy off / coral on
.mb-stepper          [−] [display/stat-md tabular-nums] [+], each button 44×44
.mb-swatch           24×24, 1.5px navy border, radius 2px  (replaces the inline swatch in TeamProfilePanel)
```
All controls `min-height: 44px` on coarse pointers. Error state = `border-color:
var(--mb-red)` plus `.mb-field-error` text using the existing inline-error recipe.

### GAP-7 — No live-scoring primitives
`/match/[id]`, `/match/guest`, `/session/[shareCode]` are the highest-traffic
screens and the system has nothing for them: no full-bleed team-side tap target, no
giant score numeral, no set-score strip, no serve indicator, no undo affordance.

```tsx
<MbScoreSide team={team} score={n} side="home" | "away"
             serving onScore={…} onUndo={…} />
<MbSetStrip sets={[{home,away}, …]} current={2} />
```
`.mb-score-side`: paper-bright, 1.5px navy divider between sides, score in a new
`display/score-2xl` step (`clamp(4rem, 18vw, 9rem)`, 700, `tabular-nums`), crest +
`display/stat-md` name above. Full height, `select-none`, press feedback = tint not
scale. Landscape uses the existing `@media (max-height:500px)` helpers.

### GAP-8 — Loading and skeleton states are still old-theme
`PageLoadingSpinner` renders the **old** `<Navigation />` on a `bg-background` page
with a `border-primary` spinner — it flashes the legacy design on every gated
Matchbook route before content mounts. This is a visible bug on 4 shipped screens.

```tsx
<MbPageLoading />                    // matchbook-surface + sidebar + mobile bar + skeleton grid
<MbSkeleton lines={3} />             // panel-body placeholder
```
`.mb-skeleton`: `rgba(7,50,77,0.08)` block, radius 2px, no shimmer (a shimmer is a
gradient — banned). Inline panel loading stays the plain "Loading …" paragraph.

### GAP-9 — No masthead / stat-tile / footer-link / account-chip components
The masthead is copy-pasted across 6 files, the account chip across 5, the panel
footer link across 5, and three near-identical stat tiles exist under three names
(`StatusStat`, `SummaryStat`, `ProfileStat`).

```tsx
<MatchbookMasthead
  title={<>Match <span className="text-mb-coral">Archive</span></>}
  badge={{ value: total, label: "Results" }}          // or {lines:["Live","Now"]}
  dateLine={data.dateLine} subLine={`${n} matches completed`}
  actions={[{ label:"Export CSV", icon:"export", tone:"navy", onClick }]} />

<MbStat icon="check" label="Matches Completed" value="12 / 20" sub="60%" size="sm" | "md" />
<MbPanelFoot href="/summaries" label="View Full Match History" />
<MbAccountChip />
```

### GAP-10 — No utility classes for the four most-copied inline recipes
Promote the §4.3 literals so they stop drifting:
```css
.mb-row-hover  { transition: background-color .15s ease; }
.mb-row-hover:hover { background: rgba(7,50,77,0.04); }
.mb-rail       { box-shadow: inset 3px 0 0 var(--mb-rail-color, var(--mb-coral)); }
.mb-tile       { border: 1.5px solid var(--mb-navy); background: var(--mb-paper-bright); }
.mb-icon-disc  { display:flex; align-items:center; justify-content:center;
                 border-radius:999px; border:1.5px solid var(--mb-navy); }
.mb-meter      { /* the readiness progress bar, track + fill */ }
```

### GAP-11 — No motion tokens
§7.2 is unenforceable until these exist:
```css
--mb-dur-fast: 120ms; --mb-dur-base: 180ms; --mb-dur-slow: 280ms;
--mb-ease-out: cubic-bezier(.2,.8,.3,1); --mb-ease-in-out: cubic-bezier(.4,0,.2,1);
--mb-stagger: 40ms;
```
Plus `.mb-enter` (opacity + 6px rise at `--mb-dur-slow --mb-ease-out`) and
`.mb-stagger-{1..6}` replacing the legacy `.stagger-*`.

### GAP-12 — Focus-visible is still the legacy red
`globals.css:1120` sets a global `outline: 2px solid oklch(0.55 0.22 25)` — the old
primary red, which reads as an off-brand near-coral on paper. Only
`.mb-select-native` opts into a Matchbook focus ring (`outline: 2px solid
var(--mb-coral); outline-offset: 1px`).
Proposal: `--mb-focus: var(--mb-coral)` and a Matchbook-scoped
`.matchbook-surface :focus-visible { outline: 2px solid var(--mb-focus); outline-offset: 2px; }`
so the legacy rule stays scoped to legacy screens.

### GAP-13 — Raw rgba/hex literals with no token
`rgba(7,50,77,0.04|0.05|0.06|0.12)`, `rgba(255,250,241,0.25|0.06)`,
`rgba(57,41,23,0.08)` and the bare `#fff` inside `.mb-btn-coral` all appear as
literals. Propose:
```css
--mb-tint-1: rgba(7,50,77,0.04);   /* row hover              */
--mb-tint-2: rgba(7,50,77,0.06);   /* nav / outline hover    */
--mb-tint-3: rgba(7,50,77,0.12);   /* empty square, track    */
--mb-band:   rgba(7,50,77,0.05);   /* group header band      */
--mb-rule-on-navy: rgba(255,250,241,0.25);
--mb-tint-on-navy: rgba(255,250,241,0.06);
--mb-panel-shadow: 0 8px 22px rgba(57,41,23,0.08);
```
Also add a darkened `--mb-gold-ink` (target ≥4.5:1 on paper, roughly `#8a5c00`) so
"Draft" can be readable text on paper instead of border-only.

### GAP-14 — Touch targets and coral-button contrast
`.mb-btn` ≈ 37px tall; mobile nav links ≈ 28px; icon-only buttons have no hit box.
`.mb-btn-coral` white-on-coral is 3.62:1 at 0.8rem — fails AA.
Proposal: add `.mb-btn-lg` (`padding: .75rem 1.25rem; font-size: .9rem`, ≈44px) and
```css
@media (pointer: coarse) { .mb-btn, .mb-nav-item, .mb-tab { min-height: 44px; } }
```
plus either darken the coral used as a *button fill* to a `--mb-coral-deep`
(≈`#c9351f`, ~4.9:1 with white) while keeping `--mb-coral` for accents/borders, or
restrict `.mb-btn-coral` to `.mb-btn-lg` sizes only. Decide once, apply everywhere.

### GAP-15 — Undecided: dark mode, print, and shared/public surfaces
Three open questions that will otherwise be answered inconsistently by whoever hits
them first:
1. **Dark mode** — currently light-only. If a night almanac is wanted, it needs a
   `--mb-*` dark set (ink→paper inversion, not the legacy `.dark` block).
2. **Print** — the aesthetic is print, but there is no `@media print`. The History
   archive and summary pages are the obvious candidates; the `print` sprite icon
   already exists with nothing behind it.
3. **Public surfaces** (`/session/[shareCode]`, `/summary/[shareCode]`) have no
   sidebar and no auth. They need a documented chrome-less shell variant — likely
   `matchbook-surface` + a centred `max-w-[1100px]` column + the brand lockup, which
   is the one sanctioned exception to the "no `max-w` container" rule.
