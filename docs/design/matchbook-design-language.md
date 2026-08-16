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
| **Primitive gallery** | **`src/app/dev/kit/page.tsx` → `/dev/kit`** — every component in §4.2, live, in every state |

Shared kit: `src/components/matchbook/` (§4.2 is the real inventory).
Tokens + utility classes: the **Matchbook block at the top of `src/app/globals.css`** —
it runs from the opening `@theme inline` down to the last `.mb-*` rule, and the
legacy "playful warm" system starts immediately below it at the second `:root`.
Assets: `public/assets/matchbook/`.

> **Line numbers in this document are deliberately absent.** Seven agents edit
> `globals.css` and `src/components/matchbook/` in parallel; a line number is
> wrong within the hour. Anchors here are grep targets — a selector, a token
> name, an export name — which survive an edit above them.

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

**Trap 2 — the old "playful warm" theme still lives in the same stylesheet, and
there are THREE zones in it, not two.** Measured, top to bottom:

| Zone | Runs from | Contains |
| --- | --- | --- |
| **A — Matchbook** | the opening `@theme inline` and the **first** `:root` | every `--mb-*` token and every `.mb-*` / `.matchbook-*` rule, ending at the last of them |
| **B — shared middle** | the `@media (max-height: 500px)` landscape block | `.hide-landscape`, `.hide-landscape-divider`, `.show-landscape`, `.landscape-row`, then the base reset: `* { box-sizing }`, `html, body { height/margin/padding/overflow-x: hidden }`, `body { font-family }`, `.scrollbar-thin`. **Not `.mb-*`, not legacy-themed, owned by nobody.** |
| **C — legacy** | the **second** `:root` — the one commented "warm, playful, inviting", setting `--primary: oklch(0.55 0.22 25)` | `.soft-card`, `.playful-card`, `.btn-playful`, `.glass-*`, the `.dark` block, the global `button:active` press, the global `prefers-reduced-motion` clamp |

Matchbook screens must not use anything from **C**. But **B is not safe to delete
either** — it is where the box-sizing reset and the horizontal-overflow guard
live, and both zones B and C contain things converted screens silently depend on.
See §7.3. W2 deletes zone C in P4 and must consciously decide what to do with
zone B rather than sweeping it along.

---

## 1. Palette

### 1.1 Tokens

Declared in the **first** `:root` in `globals.css` and exposed to Tailwind through
the `@theme inline` block above it, which generates `bg-mb-*`, `text-mb-*`,
`border-mb-*`, `divide-mb-*`, `fill-mb-*` utilities.

| Token | Hex | Tailwind | Role | Never use it for |
| --- | --- | --- | --- | --- |
| `--mb-paper` | `#f7f0e4` | `bg-mb-paper` | The page stock. Applied once, by `.matchbook-surface`, on the outermost `<div>`. | Panel interiors, buttons, any element inside a panel. |
| `--mb-paper-bright` | `#fffaf1` | `bg-mb-paper-bright` | Everything that sits *on* the stock: panel bodies, score boxes, seed boxes, inputs, selects, avatar discs. Also the ink colour on navy fills. | The page background (the two-tone paper/bright separation is what makes panels read as printed cards). |
| `--mb-navy` | `#07324d` | `text-mb-navy` `bg-mb-navy` `border-mb-navy` | **The ink.** Default text colour, all structural borders, panel top rule, navy header bars, primary button fill. | Long body copy that should read as secondary — that's `--mb-ink-muted`. |
| `--mb-coral` | `#ee4b34` | `text-mb-coral` `bg-mb-coral` `border-mb-coral` | **The one accent — three declared jobs, closed list (§1.2):** the primary action (filled as `--mb-coral-deep`), the selection/current mark (active nav rail, tab underline, selected-row rail, current-step ring), and the masthead lockup (the emphasised title word; the wordmark's "Tracker" line in `--mb-coral-deep`). Plus transient hover accents on icon controls (never a resting state). | Body text at small sizes on paper (3.26:1 — large text only). Status semantics; it means "this is the app's accent", not "danger". A fourth job: the count badge is navy, the schedule spine is a navy edge, live rails are `--mb-red`, and no categorical key (formats, bracket sections) may use it. |
| `--mb-teal` | `#148f89` | `text-mb-teal` | Rank-leader rail (row 1 of a table), "Shared" markers, first entry in the recent-results accent cycle. | Success — that's `--mb-green`. |
| `--mb-gold` | `#e6a01f` | `text-mb-gold` | Icons **on navy** (`Panel tone="navy"` sets `text-mb-gold` on the head icon), Draft status, mid-tier readiness bars. | Text on paper. 1.97:1 — it **fails at any size**. See §1.3. |
| `--mb-plum` | `#5a347d` | `text-mb-plum` | Fourth accent in the recent-results rail cycle. | Interactive elements. It has no interaction meaning. |
| `--mb-green` | `#16885f` | `text-mb-green` | Win / complete / Final / ACTIVE / high readiness / success notice border. | Buttons. There is no green button. |
| `--mb-red` | `#cf3f32` | `text-mb-red` | Loss / LIVE / error / destructive hover / low readiness. | Primary CTAs (that's coral). Coral and red are 1.2 apart in hue and must never sit adjacent. |
| `--mb-ink-muted` | `#5d6c70` | `text-mb-ink-muted` | Secondary body copy, kickers, placeholders, disabled seeds, table head labels, idle status. | Anything that must pass AA on navy (2.44:1 — fails). |
| `--mb-rule` | `rgba(7,50,77,0.28)` | `border-mb-rule` `divide-mb-rule` | Hairline dividers: panel head underline, table row rules, list `divide-y`, section separators. | Panel outer border and heavy section separators — those are solid `--mb-navy`. |
| `--mb-display-font` | `var(--font-oswald), "Arial Narrow", "Roboto Condensed", Impact, sans-serif` | — | Display stack. Only ever consumed via `.matchbook-display` or an existing `mb-*` class. | Direct `font-family` declarations in components. |

**The literals above are now tokens** (GAP-13, closed in P0). Use the token, not
the value — a bare `rgba(...)` in new code is a review failure.

| Token | Value | Meaning |
| --- | --- | --- |
| `--mb-coral-deep` | `#c9351f` | Coral as a **fill or as small ink**: 5.23:1 with white, 5.03:1 on paper-bright. `--mb-coral` stays the accent/rule colour. |
| `--mb-gold-ink` | `#8a5c00` | Gold that is legible on paper (Draft/warn badge ink and rule). `--mb-gold` remains fill-and-on-navy only. |
| `--mb-tint-1` | `rgba(7,50,77,0.04)` | Row hover |
| `--mb-tint-2` | `rgba(7,50,77,0.06)` | Nav / outline-navy hover |
| `--mb-tint-3` | `rgba(7,50,77,0.12)` | Empty form square, meter track |
| `--mb-tint-coral` | `rgba(201,53,31,0.08)` | Coral wash: outline hover, active nav row |
| `--mb-band` | `rgba(7,50,77,0.05)` | Table day-group header band |
| `--mb-rule-on-navy` | `rgba(255,250,241,0.25)` | Hairline **on navy** |
| `--mb-tint-on-navy` | `rgba(255,250,241,0.06)` | Panel-bright tint on navy |
| `--mb-panel-shadow` | `0 8px 22px rgba(57,41,23,0.08)` | The only shadow in the system |
| `--mb-rule-hairline` / `-edge` / `-accent` / `-anchor` | `1px` / `1px` / `3px` / `4px` | The rule weights of §3.3, named. `-hairline` and `-edge` are **both 1px on purpose** — see §3.3, the 1 vs 1.5 step does not exist at render time. What separates a hairline from an edge is the *colour*: `--mb-rule` (translucent) against `--mb-navy` (solid). |
| `--mb-focus` | `var(--mb-navy)` | The Matchbook focus ring (GAP-12). Navy, not coral — the coral ring collided with the selection rail; navy surfaces re-point it to `--mb-paper-bright` (the token is inherited). |
| `--mb-dur-fast` / `-base` / `-slow` | `120ms` / `180ms` / `280ms` | Motion durations (GAP-11) |
| `--mb-ease-out` / `--mb-ease-in-out` | `cubic-bezier(.2,.8,.3,1)` / `(.4,0,.2,1)` | Motion easings |
| `--mb-stagger` | `40ms` | Per-panel entrance delay |
| `--mb-safe-top` / `--mb-safe-bottom` | `env(safe-area-inset-*, 0px)` | Notch and home-indicator padding (GAP-3, CSS half) |
| `--mb-court-fill` / `-line` / `-line-strong` / `-accent` | token refs | The volleyball court diagram's palette |

### 1.2 Fixed colour semantics

Never invent a new mapping. These are the ones already shipped:

```
Live / in progress   → --mb-red    (+ .mb-live-dot; includes the LIVE ROW RAIL —
                                    a live row/cell rail is red, never coral,
                                    and never the sole carrier: the dot and the
                                    word ship with it)
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
Selected / current   → --mb-coral  (one meaning, several orientations: row
                                    rail, nav left rail, tab underline,
                                    current-step ring, court-token ring,
                                    reorder insertion rule)
```

Canonical implementations (grep the name, not a line): `STATUS_STYLES` in
`src/app/competitions/page.tsx`, `readinessColor()` in
`src/components/matchbook/teamStats.ts`, `FORM_COLORS` in
`src/components/matchbook/Panel.tsx`.

#### 1.2a The coral job census — three jobs, closed list

Coral (`--mb-coral` and its ink twin `--mb-coral-deep` count as ONE hue) does
exactly three jobs, and a job is a **meaning**, not a call site:

```
1. THE PRIMARY ACTION    .mb-btn-coral fill (--mb-coral-deep), one per screen.
2. THE SELECTION MARK    "this is the current one" — the rail/ring family
                         listed under Selected/current above. One meaning in
                         several orientations is one job.
3. THE MASTHEAD LOCKUP   the emphasised title word (§2.3, ≥36px, --mb-coral)
                         and the wordmark's "Tracker" line (--mb-coral-deep).
                         The brand voice, once per screen, letterforms only.
```

The scoring console is the one scoped extension: there the current-mark takes
the form of the `.mb-notch-coral` lead edge ("the score that just moved / the
side ahead" — the console's only selection), and the console's census is jobs
1 + 2 and nothing else.

**What is deliberately NOT coral, and where each went** (this list is the
reason the census holds — do not quietly re-book one):

```
masthead count badge      → navy frame + navy numeral (its mark is the 2px
                            WEIGHT, the only 2px border — §3.3)
live row/cell rails       → --mb-red (the live semantic; also, coral and red
                            were sitting adjacent on live rows, which §1.1
                            forbids)
schedule/timeline spine   → solid-navy edge (structure is ruled in ink)
scoreboard lead rule      → navy, live or final (the dot says "live", the
                            rule says "ahead")
check / radio / switch ON → navy ("inked, not highlighted")
format colour key         → none (icon + label; see formatMeta.ts)
bracket section key       → teal / gold / plum only (Grand Finals is plum)
```

Hover accents on icon controls are transient states of jobs 1–2, not a fourth
job; they never appear in a static capture. The focus ring is navy
(`--mb-focus`), not coral.

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
- `.mb-btn-coral` no longer fills with `--mb-coral`. **P0 moved the fill to
  `--mb-coral-deep` (`#c9351f`), which is 5.23:1 with white** — AA at
  `.mb-btn`'s `0.8rem/600`. `.mb-btn-outline` and `.mb-panel-link:hover` took
  the same ink (5.03:1 on paper-bright, 4.62:1 on paper), as did
  `.mb-stamp-final`. GAP-14's contrast half is closed.
- The split to remember: **`--mb-coral` is the accent** (rules, frames, rails,
  the masthead word, the active-tab border); **`--mb-coral-deep` is ink and
  fill** (button backgrounds, coral letterforms under 18.66px). Never coral
  letterforms at a small size.

| Deep-coral pairs | ratio | verdict |
| --- | --- | --- |
| `#fff` on `--mb-coral-deep` | **5.23** | AA |
| `--mb-coral-deep` on `#fffaf1` bright | **5.03** | AA |
| `--mb-coral-deep` on `#f7f0e4` paper | **4.62** | AA |
| `--mb-gold-ink` on `#f7f0e4` paper | **5.13** | AA |
| `--mb-gold-ink` on `#fffaf1` bright | **5.59** | AA |
| `--mb-coral-deep` on `#07324d` navy | 2.55 | **FAIL** — deep coral is a paper ink only |

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
and navy ink; the `.dark` block in `globals.css` belongs to the old theme and has
no `--mb-*` overrides. Do not add `dark:` variants to Matchbook screens, and do
not render `ThemeToggle` on a converted screen. This is a **settled decision**,
not an open question (charter Appendix A): `ThemeToggle` and `ThemeContext` are
deleted in P4. Do not build a `--mb-*` dark set.

**Print exists** (GAP-15.2, shipped in P1). `@media print` re-points the palette
tokens — paper and bright to `#ffffff`, navy to `#000000`, tints off, shadow
none — so the whole system turns black-on-white without a single component
restating a colour. If you add a surface, give it a token background, not a
literal, and it prints correctly for free.

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
  letter-spacing: var(--mb-track-display); /* 0.02em — the display role */
}
```

Note `.matchbook-display` defaults to the `display` role (0.02em); every named
step below **overrides** it with its own role's `.mb-track-*` utility (§2.1a —
never a `tracking-[…]` literal). If you use `.matchbook-display` without a
tracking class you get 0.02em, which is only correct for the base display voice.
Oswald has only 400/500/600/700 — `font-bold` (700) is the ceiling; never write
`font-extrabold`/`font-black` on display text.

### 2.1 The named scale

Every value below is taken from shipped code. Use the name in code review; use the
snippet in code. Never introduce a size between two steps.

**Display steps (Oswald, uppercase)**

| Name | Size | Weight | Tracking | Leading | Tailwind snippet | Where it ships |
| --- | --- | --- | --- | --- | --- | --- |
| `display/masthead` | `2.25rem` → `sm:3rem` | 700 | `0.01em` | `none` | `matchbook-display text-4xl mb-track-masthead font-bold leading-none sm:text-5xl` | The one `<h1>` per screen (6 identical call sites) |
| `display/score-2xl` | `clamp(4rem, 18vw, 9rem)` | 700 | inherit | `0.9` | `.mb-numeral.mb-numeral--court` (baked) | The `size="court"` default. Overridden by `display/score-fit` wherever the numeral has a sized container — today that is every console call site |
| `display/score-fit` | `min(100cqh, 58cqw, 16rem)` | 700 | `normal` | `0.9` | `[&_.mb-numeral--court]:text-[min(100cqh,58cqw,16rem)]!` on a `container-type: size` box holding only the numeral | The live scoring console (`ScoreSide.tsx`) |
| `display/score-xl` | `3.75rem` | 700 | inherit | — | `matchbook-display text-6xl font-bold tabular-nums` | Quick-Match scoreboard preview |
| `display/score-lg` | `3rem` | 700 | inherit | — | `matchbook-display text-5xl font-bold tabular-nums` | Match of the Day, Match Report final score |
| `display/stat-xl` | `2.25rem` | 700 | inherit | `none` | `matchbook-display text-4xl font-bold leading-none tabular-nums` | Leaders value, Club Snapshot value |
| `display/stat-lg` | `1.875rem` | 700 | inherit | `none` | `matchbook-display text-3xl font-bold leading-none tabular-nums` | Overall Record W-L |
| `display/stat-md` | `1.5rem` | 700 | inherit | `none` | `matchbook-display text-2xl font-bold leading-none tabular-nums` | Masthead badge count, profile team name |
| `display/stat-sm` | `1.2rem` | 700 | inherit | `tight` | `matchbook-display text-[1.2rem] font-bold leading-tight tabular-nums` | `StatusStat` / `SummaryStat` values |
| `display/panel-title` | `0.95rem` | 700 | `0.05em` | — | `matchbook-display text-[0.95rem] mb-track-title font-bold` | Every `<Panel>` header (baked into `Panel.tsx`) |
| `display/row-title` | `0.9rem`–`0.78rem` | 700 | — | — | `matchbook-display text-[0.78rem] font-bold truncate` | List row primary label |
| `display/team-mark` | `0.82rem` | 600 | — | — | baked into `TeamMark` | Team name beside a crest |
| `display/button` | `0.8rem` | 600 | `0.06em` | — | baked into `.mb-btn` | All buttons |
| `display/nav` | `0.85rem` | 600 | `0.08em` | — | baked into `.mb-nav-item` | Sidebar navigation |
| `display/link` | `0.72rem` | 600 | `0.04em` | — | baked into `.mb-panel-link` | Panel actions, footer links |
| `display/meta` | `0.74rem` | 700 | `0.1em` | — | `matchbook-display text-[0.74rem] mb-track-status font-bold` | Masthead date line |
| `display/table-head` | `0.66rem` | 600 | `0.12em` | — | baked into `.mb-table th` | Table column labels |
| `display/status` | `0.66rem` | 700 | `0.1em` | — | `matchbook-display text-[0.66rem] mb-track-status font-bold` | Status words (Live/Draft/Final/ACTIVE) |
| `display/kicker` | `0.62rem` | 600 | `0.16em` | — | baked into `.mb-kicker` | Every eyebrow label |
| `display/court-label` | `13.6` **SVG units** | 600 | `0.16em` | — | `EDGE_LABEL` in `MbCourt.tsx` | The court diagram's reference labels (NET, END LINE, 3 M, SERVING/RECEIVING, R#) |
| `display/badge-label` | `0.6rem` | 700 | `0.22em` | — | `matchbook-display text-[0.6rem] mb-track-badge font-bold` | Masthead badge caption word |

`display/score-fit` is the one step on this table measured in **container**
units rather than viewport units or rems, and that is the whole reason it
exists. A console numeral does not live in the viewport: it lives in a score row
whose height is `column − head − foot` and whose width is
`column − padding − the inline key`. Sized off `vh`/`vw` the two quantities
diverge, and they diverged badly — at 320x568 the viewport was 568px tall while
the row it had to fit was **0px**, and the live score was clipped out of
existence on an iPhone SE. Three `!` overrides with six hand-fitted viewport
coefficients had accumulated trying to close that gap, each correct at the
viewports in its own table and wrong at the next one.

Both coefficients are measured against the face, not chosen. Oswald 700, per
100px of font-size (canvas `TextMetrics`): `fontBoundingBox` ascent 119 /
descent 29, digit ink ascent 82 / descent 2, advance of "0" = 55.

- **`100cqh`** — at `line-height: 0.9` the ink runs `0.08F..0.92F` down a `0.9F`
  box, so centred in a row of height `R` it clears the row while `F ≤ 1.064R`.
  100% of the container height takes 94% of that and leaves the rest to
  subpixel rounding.
- **`58cqw`** — the reserve is three figures at `1ch` = `1.65F`, *whatever the
  value*: the width term must use the reserve and never the rendered digit
  count, or the numeral would resize on 9→10 and reflow the scoreline it exists
  to hold still. `F ≤ W/1.65 = 0.606W`; 58% takes 96% of that.
- **`16rem`** — a ceiling, not a floor. There is deliberately **no floor**: a
  floor larger than the container is precisely how the score became invisible,
  so the container is the floor.

The step therefore needs no breakpoints and has none. It is correct in
portrait, in landscape, in Court View, and at whatever height the chrome around
it grows to next.

`display/court-label` is the one step measured in **drawing units**. The court
SVG has a 464-unit viewBox and renders at 356–464px, so type authored inside it
scales with the drawing: 13.6 SVG units paint at 10.4–13.6px, landing on the
kicker's optical size at the phone widths where the court is smallest. The
voice is the kicker's — weight 600, `0.16em`, muted ink — because the labels
are eyebrows for the drawing (NET, END LINE, R3), not data on it. It was
authored 700, a weight the kicker step never carries; that was a drift and was
snapped. The size is NOT a rem step and must not be copied outside the SVG: a
computed-style census will read it as "13.6px" and it is not the same object as
`body/sm`'s 13.6px, any more than `display/score-fit`'s `cqh` is a viewport
size. The court's zone numerals are different — 36 units = `display/stat-xl`
at `display/masthead`'s 0.01em, already on the table above.

**The kicker hangs its side bearing — the one optical correction.** Oswald
caps carry a left side bearing of 0–0.06em depending on the glyph. Measured by
canvas `TextMetrics` (`actualBoundingBoxLeft`, per 100px em): H 6; B/D/E/F/K/
L/M/N/P/R/U 5; C/G/O/Q 4; S 3; W/Z 2; A/V 1; **T/X/Y 0** — median cap
0.04em. The bearing is em-proportional: re-measured at 24/36/48px it reads
0/1/2px for C-600 against the linear 0.96/1.44/1.92 (the rasterizer
quantizes canvas ink metrics to whole pixels; every reading sits within
0.5px of the em-linear value, and T/X/Y read 0 at all three sizes). Two
consequences, one per face size:

- At **display sizes** the bearing is ~2px (48px x 0.04em = 1.9px), so a
  masthead or stat line starts its ink up to 2.9px inside its box — by
  whichever glyph the data happens to start with. This is **deliberately not
  corrected**: a role-level `text-indent` would push the three T-initial
  shipped h1s (T = 0 bearing) up to 1.9px PAST the margin, a visible overhang
  bought for nothing. The big line's bearing is the face's own voice.
- At **kicker size** (9.92px) the whole per-glyph spread is 0–0.6px, so one
  constant fixes every kicker: `.mb-kicker` carries
  `text-indent: -0.04em` (−0.40px, the median bearing), which puts the
  eyebrow's ink on its box datum with a residual under 0.3px regardless of
  first glyph. Measured across 9 routes x {375, 1440}: kickers sized by
  their container hold their boxes at 0.00px delta; a shrink-to-fit kicker's
  box narrows by the indent (≤0.40px, spec: `text-indent` participates in
  intrinsic sizing), and the one place kicker cells stack inline — the
  standings legend strip — settles ≤3.12px cumulative at 1440, with no
  wrap change (max top delta 0.10px) and no collision. Flex-container
  kickers (the icon-led `Champion` line) ignore `text-indent` by spec,
  which is correct: their datum is the icon.

**Authored wraps — a display line never wraps by accident.** Two masthead-size
lines wrapped at 375 wherever the wrap algorithm chose. Both are authored now:

- **The masthead h1** (`Masthead.tsx`): `[&>span]:whitespace-nowrap` pins
  every break to the seam between the neutral segment and the emphasised
  `<span>` (§2.3) — the only wrap a masthead can perform is the two-line
  lockup at the joint the caller wrote. Measured at 375 (content 343px):
  "TOURNAMENT OVERVIEW" needs ~359px solid at `text-4xl`, so it wraps at the
  seam and balance sets 200.89/150.84 (75.1%) — a set block, identical from
  320 to 413. A title segment must therefore set solid at 320 (~14 glyphs);
  the longest shipped segment ("DIRECTORY") is ~180px.
- **The summary champion name** (`summary/[shareCode]/page.tsx`): the rule —
  nbsp-join the last two tokens so a club's terminal token (VC, FC) never
  sets alone, and measure the block's `basis` so the shipped champion sets
  **solid** at 375 instead of two-line ("MARLOW BLUES VC" is 240.67px solid
  at `display/stat-lg`; a `basis-60` = 240px drops the block below the crest
  at 375, where it gets the panel's full 309px, and keeps it beside the
  crest from 390 up, where its 244px hold the name solid — measured at
  320/375/390: one line at all three, against 110.64/121.75 two-line at 375
  before). The measurement lives at the call site with the edit.

**Body steps (Outfit, sentence case)**

| Name | Size | Weight | Tailwind snippet | Where it ships |
| --- | --- | --- | --- | --- |
| `body/md` | `0.9rem` | 400 | baked into `.mb-input input` | Form fields |
| `body/sm` | `0.85rem` | 400 | baked into `.mb-table td`; `text-[0.85rem]` | Table cells, `PanelEmpty` message, paragraph copy |
| `body/xs` | `0.78rem` | 400/600 | `text-[0.78rem] font-semibold` | 600: detail values (Match Report meta, "Entered In"). 400: the deck sentence under a row title (tools cards) — same split `body/2xs` already carries |
| `body/2xs` | `0.72rem` | 400/600 | `text-[0.72rem] text-mb-ink-muted` | Helper text, secondary row lines |
| `body/3xs` | `0.66rem` | 400 | `text-[0.66rem] text-mb-ink-muted` | Sub-labels inside dense rows |
| `body/input-floor` | `1rem` | 400 | `text-base! md:text-[0.9rem]!` | **Every text input, below `md` only** |

`body/input-floor` is the one step in this table that was not chosen. Mobile
Safari zooms the viewport when a focused field is under 16px, which is a layout
shift the reader did not ask for and cannot undo — so a field is `1rem` below
`md` and drops to `body/md` above it, where no such rule exists. It is a
**platform floor, not a size**: it may appear on `.mb-input input`,
`.mb-textarea`, `.mb-select-native` and `.mb-search input`, and nowhere else. The
`!` is load-bearing — those four rules set `font-size` unlayered, and an
unlayered declaration outranks every Tailwind utility (§2.1a).

**The ramp is width-invariant below the masthead — on purpose.** A census at
390 and a census at 1440 read the same sizes at the same counts (measured:
`display/team-mark` at 13.12px, 184 elements, both widths), and the only steps
that respond to the viewport are `display/masthead` (`text-4xl → sm:text-5xl`)
and the two floors above (`score-fit` to its container, `input-floor` to the
platform). This is a decision, not an omission, and it was taken twice:

- An almanac's body type does not resize with the sheet; only the masthead is
  display-scaled. Data lines — team names, scores, standings — are set once so
  that a row on a phone and the same row on a desk are the *same object*.
- Every truncation and painted-character floor in this programme (the 8-char
  name floor, `MbTeamName`'s pinned last token) is measured at 320/375 against
  today's sizes. A step that grew at 390 would spend those floors on air; one
  that shrank would re-open the 6.6 finding ("the most frequent size at 390
  carrying real data" — sub-10px body text on a phone, closed by snapping
  `0.62rem` Outfit strays up to `body/3xs`).

Do not add `sm:`/`lg:` size variants to body or data steps. A screen that needs
more room at 390 changes its layout (the schedule panel's venue caption line,
the champion block's `basis-48`), never its type ramp.

> The benchmark rubric's **D6.6 carve-out** cites this section: the invariance
> is conformant precisely because it is named intentional here AND the
> painted-character floors above are measured at every audited width. Lose
> either half and 6.6's original teeth apply again.

### 2.1a The tracking ladder — one rung per (size, weight)

`.matchbook-display` sets `letter-spacing: 0.02em`, and for most of this
programme that default WAS the tracking almost everywhere, because a call site
that writes a size rarely remembers to write the tracking with it. Measured at
1440 before this pass: **82 distinct (size, weight, tracking) tuples against a
named scale of 24**, and **22 (size, weight) pairs carrying two or more
letter-spacings** — `15.2px/700` carried four, `11.52px/600` carried five.

The rungs are **named ROLES now, not decimals**. Each role is one token in
`:root` (`--mb-track-*`), one utility class declared last in `@layer
components` (`.mb-track-*`), and one sentence of intent. Every
`letter-spacing` in `globals.css` writes `var(--mb-track-*)`; every call site
writes the utility; the census result is that the app paints **exactly twelve
letter-spacing values and all twelve have names** (measured: 9 routes x
{375, 1440}, all text-painting nodes — `{normal, 0.01, 0.02, 0.04, 0.05,
0.06, 0.08, 0.1, 0.12, 0.16, 0.18, 0.22}em`, nothing else).

| Role | em | Intent — one sentence | Consumers |
| --- | --- | --- | --- |
| `masthead` | `0.01` | The title lockup: em-tracking compounds at display sizes, so the biggest voice is the tightest one. | `display/masthead` h1s, `display/stat-xl`, the court zone numerals (SVG) |
| `display` | `0.02` | The base display voice — row titles, team marks, stat figures. | `.matchbook-display` default; bare display spans |
| `link` | `0.04` | The quiet verb: one step looser than base so a 0.72rem label stays a word. | `.mb-panel-link`, `display/link` |
| `title` | `0.05` | The label that names a container. | `Panel.tsx` titles, `.mb-select-native`, the VS pips |
| `button` | `0.06` | The imperative, at every cut. | `.mb-btn` (+ `-lg`), `.mb-segmented > *`, `.mb-skip-link` |
| `nav` | `0.08` | Wayfinding — labels a reader scans for. | `.mb-nav-item`, `.mb-tab`, `.mb-badge[data-size="md"]`, `MatchbookBottomBar`'s label |
| `status` | `0.1` | The state word and the meta line, read at a glance, not in a run. | `display/status`, `display/meta`, `.mb-badge` |
| `head` | `0.12` | The columnar head: a label that rules the strip under it. | `.mb-table th`, `.mb-day-head` |
| `kicker` | `0.16` | The eyebrow — it labels, it is never read as prose, so it carries the widest text spread. | `.mb-kicker`, `display/court-label` (SVG) |
| `code` | `0.18` | The share code: glyphs a reader transcribes one at a time, so they space one at a time. | `.mb-code-chip`, the share-dialog code |
| `badge` | `0.22` | The stamp: single caption words treated as engraving, maximum spread. | `display/badge-label`, `.mb-stamp-final` |
| `numeral` | `normal` | Figures and marks: tracking pads after the LAST glyph and pushes a centred figure off centre — a number is not a word. | `.mb-score-box`, `.mb-stepper-value`, `.mb-numeral`, `FormLetters`, `MbPlayerToken` discs |

A role may be carried by more than one class and painted at more than one
size — a large button is still a button, a day head is still a head. That is
the question the old "component voices" table left open, and the answer is
**yes, the role keeps its tracking across its cuts**; what a role may never do
is appear as a literal. Where a class rides a role that is not its namesake
(`.mb-badge` on `status`, `.mb-stamp-final` on `badge`, the md badge on
`nav`), the declaration in `globals.css` carries the one-line reason.

**A (size, weight) pair gets exactly one rung.** Write the class, never a bare
`tracking-[…]` — an arbitrary value is un-auditable, and nothing in review tells
you whether `[0.1em]` is `display/status` or a guess. The canon:

| Size | weight 600 | weight 700 | why that rung |
| --- | --- | --- | --- |
| `0.6rem` | — | `badge` | §2.1 |
| `0.62rem` | `kicker` | `nav` | `.mb-kicker` pins 600 |
| `0.66rem` | `head` | `status` | §2.1's own split (table-head vs status) |
| `0.72rem` | `link` | `link` | `.mb-panel-link` pins 600; 700 is the same step |
| `0.74rem` | — | `status` | §2.1 `display/meta` |
| `0.78rem` | `display` | `display` | already single-valued |
| `0.8rem` | `button` | `button` | `.mb-btn` pins it |
| `0.82rem` | `display` | `display` | `display/team-mark` |
| `0.85rem` | `nav` | `display` | `.mb-nav-item` / `.mb-tab` pin 600 |
| `0.9rem` | `display` | `display` | `display/row-title` |
| `0.95rem` | `title` | `title` | `.mb-select-native` pins it |
| `1.2 / 1.5 / 1.875rem` | `display` | `display` | the stat steps |
| `2.25 / 3rem` | `masthead` | `masthead` | §2.1 |

Where a size splits on weight it is because an **unlayered** class in
`globals.css` already owns one of the two and cannot be outranked from a call
site. Those are facts about the stylesheet, not preferences.

**The two former "exceptions" are roles now — nothing is outside the set:**

1. **Figures and marks, not words — the `numeral` role.** Tracking is added
   after the LAST glyph as well as between glyphs, so a numeral or a single
   letterform centred in a fixed reserve is pushed off its own centre by a
   whole letter-space. A W in a 14px cell at the badge rung carries 2.11px of
   trailing air and sits 1.05px left of centre — 7% of the mark, five times
   across a form run. The ladder tracks **words**, and a number is not a
   word. `globals.css` bakes the role into `.mb-score-box`,
   `.mb-stepper-value` and `.mb-numeral`; a call site that needs it
   (`FormLetters`' W/L cell, `MbPlayerToken`'s role disc, the Quick-Match
   preview zeros) writes `.mb-track-numeral`, not `tracking-normal` — the
   class names the reason, the utility only named the value.
2. **`MatchbookBottomBar`'s label rides the `nav` role.** Its cell is 53px at
   320 and "OVERVIEW" is 47px natural at `0.62rem/0.08em`; the kicker rung
   (0.16em) would add 6.35px and truncate the app's primary navigation at the
   narrowest supported width. That measurement used to sanction a
   `tracking-[0.08em]` literal. The census closed it: the bottom bar is not a
   kicker that happens to be short of room, it is **navigation**, and 0.08em
   IS the nav role — the label writes `.mb-track-nav` and the exception
   dissolves into the table above.

**Where a size is set by an unlayered class, a `text-[…]` utility beside it is
dead code.** `.mb-panel-link` (0.72), `.mb-btn` (0.8), `.mb-btn-lg` (0.9),
`.mb-nav-item` (0.85), `.mb-kicker` (0.62), `.mb-score-box` (0.95),
`.mb-table th` (0.66), `.mb-table td` (0.85), `.mb-badge` (0.66),
`.mb-badge[data-size="md"]` (0.74), `.mb-tab` (0.85), `.mb-code-chip` (0.85),
`.mb-day-head` (0.66), `.mb-stamp-final` (0.74), `.mb-skip-link` (0.8),
`.mb-segmented > *` (0.8), `.mb-banner` (0.85), `.mb-search input` (0.78),
`.mb-input input` / `.mb-textarea` (0.9), `.mb-select-native` (0.95),
`.mb-field-hint` / `.mb-field-error` (0.72) and the three `.mb-numeral--*` all
declare their own `font-size` outside every layer. Delete the utility; do not
"fix" it to a nearer step.

`letter-spacing` and `font-size` also **inherit**, so a bare
`<span className="matchbook-display font-bold">` inside a styled row takes
whatever the row happens to carry — which is how the same component rendered
0.02em in one panel and 0.08em in another. Every display element carries its own
rung (charter invariant 8), including the ones whose size comes from a parent.

**Where one (size, weight) pair hosts two roles — the census, closed.** After
this pass, 7 pairs at 1440 and 8 at 390 carry two letter-spacing values. That
is not residue any more: **every voice on both sides of every pair is a named
role**, and the pair exists because two roles legitimately meet at one size.
The old table sanctioned these as anonymous "component voices"; the question
it left open — may a role keep its tracking across two sizes? — is answered
**yes** (a large button is still a button; a code chip is still a code), and
each former voice now resolves:

| Pair | The roles that meet there |
| --- | --- |
| `0.74rem/700` | `status` (`display/meta`) · `nav` (the md badge) · `badge` (`.mb-stamp-final`) |
| `0.66rem/700` | `status` (`display/status`) · `head` (`.mb-day-head`) |
| `0.85rem/700` | `display` (base) · `code` (`.mb-code-chip`) |
| `0.9rem/600` | `display` (base) · `button` (`.mb-btn-lg` keeps the role at the lg cut) |
| `0.95rem/700` | `title` (`display/panel-title`) · `numeral` (`.mb-score-box`) |
| `1.875rem/700` | `display` (base) · `numeral` (`.mb-numeral-digit`) |
| `0.6rem/700` | `badge` (`display/badge-label`) · `numeral` (`FormLetters`' mark) |
| `0.62rem/600` *(mobile only)* | `kicker` (`.mb-kicker`) · `nav` (`MatchbookBottomBar`'s label) |
| `0.85rem/600` *(census artifact)* | `nav` (`.mb-nav-item`) · `kicker` (`display/court-label` — 13.6 **SVG units** in `MbCourt.tsx` that paint at 10.4–13.6px, not a rem step, §2.1) |

A sweep that finds a pair carrying a value **not** in the roles table has
found a defect; a sweep that finds one of these nine pairs has found the
design. Do not "fix" a pair by pushing one role's rung onto the other's
component from outside.

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
<h1 className="matchbook-display text-4xl mb-track-masthead font-bold leading-none sm:text-5xl">
  Match <span className="text-mb-coral">Archive</span>
</h1>
```

Shipped variants: `Team **Directory**`, `Quick **Match**`, `Match **Archive**`,
`Tournament **Toolkit**`, `Welcome **Back**` / `Join **the Club**`,
`Compete**.**` (coral full stop), `Tournament **Overview**`. **One** coral
element in the masthead title, maximum, and the title word is the ONLY coral in
the masthead: the count badge is navy (§3.2).

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
    <h1 className="matchbook-display text-4xl mb-track-masthead font-bold leading-none sm:text-5xl">
      Match <span className="text-mb-coral">Archive</span>
    </h1>

    {/* 2. BADGE — navy 2px frame; either a stacked word pair or count+caption.
        The 2px WEIGHT is the mark (the only 2px border in the system, §3.3);
        the badge came off coral when the job census closed at three (§1.2a). */}
    <div className="flex flex-col items-center border-[2px] border-mb-navy px-2.5 py-1 text-mb-navy">
      <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">{count}</span>
      <span className="matchbook-display text-[0.6rem] mb-track-badge font-bold">Results</span>
    </div>

    {/* 3. DATELINE — hidden on mobile */}
    <div className="hidden sm:block">
      <p className="matchbook-display text-[0.74rem] mb-track-status font-bold" suppressHydrationWarning>
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
      <span className="matchbook-display text-[0.72rem] mb-track-nav font-bold leading-tight">My<br />Account</span>
      <MbIcon id="chevron-down" size={13} className="text-mb-ink-muted" />
    </Link>
  </div>
</header>
```

Rules:
- Badge frame is `border-[2px] border-mb-navy` — the **only** 2px border in the
  system. The weight is the badge's identity, which is why it survived the move
  off coral unchanged in greyscale; coral is never used as a frame.
- Any date/time string rendered from `new Date()` on the client must carry
  `suppressHydrationWarning` (the `data.dateLine` paragraph in `src/app/page.tsx` and `src/app/teams/page.tsx`).
- The account chip's disc is `h-10 w-10 rounded-full` — the **only** circle in the
  system besides `.mb-live-dot`, icon discs in stat blocks, and colour swatches.
- At most 2 action buttons: at most one coral, at most one navy.
- A screen with a filter bar puts it **between** masthead and grid, as a full-width
  strip framed top and bottom by the heavy rule:
  `mb-4 flex flex-wrap items-end gap-3 border-y-[1.5px] border-mb-navy py-3`
  (the filter bar in `src/app/summaries/page.tsx`).

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
| Panel body, list row under a stated rung | `px-4 py-1.5` — see "the divider charge" below: block padding drops so the rung's `min-height`, not the type, sets the border box, and the rung absorbs `divide-y`'s 1px |
| Inline icon↔text | `gap-1.5` / `gap-2` / `gap-2.5` / `gap-3` |
| Stacked label — a line and its caption inside one row or stat tile | `gap-1` (4px). One value, and it is small on purpose: two text lines plus 4px is what still fits inside a 56px row beside a 36px disc; at `gap-1.5` the same stack sums past the rung. The same 4px is G23's compact icon↔text step, baked into `.mb-nav-item`, `.mb-badge` and `.mb-panel-link` in `globals.css` — one number, stated twice, and `gap-0.5` is not a member (its ten call sites were this relationship at a second value, now collapsed) |
| Panel footer strip | `px-4 py-2` |
| Form squares | `gap-[3px]` |
| `.mb-segmented` divider | `1px` — recorded here because the census sees it as a gap. It is a **rule**, not a spacing step: the grid `gap` is the width of the navy ground showing through between paper cells, i.e. `--mb-rule-edge` drawn by layout instead of border. It joins no relationship above and nothing else may use a 1px gap |

**Control heights — the ladder, the divider charge, and the named exemptions.**
The ladder is `{44, 48, 56}` and lives in `Button.tsx`
(`MB_CONTROL_HEIGHT`); a composite's interior cells now measure the rung
itself, because the frame's block edges are paint rather than layout
(`MbSegmented` draws its frame as an inset outline; `MbNumberStepper`'s keys
and every framed `<input>` use the G21 negative-block-margin idiom). Two rules
keep rows on it, and both are measured:

- **The divider charge.** `min-height` is a border-box floor, so a row whose
  content + padding sums to *exactly* its rung is tipped one pixel off it by
  its own `border-b` or by `divide-y` — that single pixel was 45 on the
  `/summaries` ledger (25 rows), 51.56 on its competition list, 57 in the
  format chooser and 57 in the formation library, four screens with the same
  disease. The fix is never a taller rung: drop the block padding one step
  (`py-1.5`, named above) so content sits *under* the rung and `min-height`
  absorbs the rule. A divider is part of the box, not on top of it.
- **The floor is unlayered.** `.mb-btn-touch { min-height: 44px }` is declared
  outside every cascade layer, so a Tailwind `min-h-12`/`min-h-14` beside it
  is silently inert. A row that states a rung above the floor states it
  **inline** (`style={{ minHeight: 48 }}`), which is the one thing that
  outranks an unlayered rule without `!important`.

Four **named exemptions** — boxes the D2 sweep reads that are not control
heights, each a considered decision rather than a stray:

1. **Invisible hit-extension geometry.** A transparent box that exists only to
   enlarge a target is target geometry, not a control: `MbPlayerToken`'s
   ≥52px hit disc (the charter's own floor for a court token — 52 is not a
   rung and must not become one, because the *drawn* disc is SVG and the
   overlay simply satisfies the charter's minimum), and `.mb-panel-link`'s
   44×44 `::after` hit pad. Nothing invisible answers to the ladder.
2. **Letterform links.** `.mb-panel-link`'s visible box is its ink
   (≈17.3px of 0.72rem capitals). It is a printed almanac's "see page 12" —
   a line of type, not a boxed control; its *control* geometry is the
   invisible pad above, probed by the harness at the 44×44 square.
3. **Content rows and tiles above the floor.** A ledger row, roster row,
   format tile, scoreboard card or console tap column is sized by its data:
   it meets the 44px floor (or a stated rung) and grows with a second line,
   a wrapped meta, or the column it fills. Fixing these to a rung would
   truncate data or pad an almanac with air. The floor is the contract; the
   height is the content. (`textarea` is recorded in `form.tsx` as the one
   *control* honestly off the ladder — it is measured in rows of text, not
   rungs of thumb.)
4. **The wordmark lockup.** The sidebar crest-and-wordmark anchor link is a
   masthead object that happens to navigate, not a control.

Everything interactive that is none of the above measures 44, 48 or 56 —
the sweep in `zz-h.mjs`/`audit.mjs` reads the border boxes, and `/dev/kit`
plus all thirty-one routes are the proof.

**Radius vocabulary:** `4px` (`.mb-panel`, `.mb-btn`, `.mb-input`, `.mb-search`,
`.mb-select-native`, `.mb-dialog`, `.mb-stepper`, `.mb-segmented`,
`.mb-swatch[data-size="touch"]`), `3px` (`.mb-score-box`, `.mb-seed-box`,
`.mb-code-chip`), `2px` (`.mb-form-square`, `FormLetters`, `.mb-check`,
`.mb-radio`, `.mb-switch`, `.mb-swatch`, `.mb-skeleton`, `.mb-stamp-final`).
**`999px` is reserved** for exactly four things: `.mb-live-dot`, the account
disc, an icon disc (`.mb-icon-disc`), and a colour swatch — plus the `live` and
`guest` badge marks, which are dots by the same rule. `.mb-radio` is **not** a
circle; it is a squared ballot box. **Anything ≥ `rounded-lg` is an
anti-pattern.**

One use stands outside that budget because it never paints: the **invisible
hit disc** behind a court player token (`MbPlayerToken`, the ≥52px transparent
target the charter requires). The four reservations ration *ink* — how many
round marks a page may show — and a box with no ink spends none; its round is
geometry, matching hit area to the round SVG disc under it so a corner tap
neither misses the token nor poaches its neighbour. It must stay invisible
(the moment it paints, it is a fifth round mark and a violation), and it takes
the literal `rounded-[999px]`, never `rounded-full` — that utility compiles to
`calc(infinity * 1px)` and would put a second spelling of the same round into
the D2 radius census.

**Border vocabulary** (tokenised — `--mb-rule-hairline` / `-edge` / `-accent` /
`-anchor`):

| Role | Write | Renders |
| --- | --- | --- |
| Hairline divider | `1px solid var(--mb-rule)` / `border-mb-rule` | 1px, translucent navy |
| Real edge — panel body, boxes, inputs, tiles | `var(--mb-rule-edge) solid var(--mb-navy)` / `border-[1.5px] border-mb-navy` | **1px**, solid navy |
| Accent rail — inset rail, active tab underline | `3px` | 3px |
| Anchor edge — `.mb-panel` top, `.mb-dialog` top, `.mb-banner` / `.mb-toast` left | `4px` | 4px |
| Masthead count badge — the one 2px border | `border-[2px] border-mb-navy` | 2px |

> **Measured, and it corrects this document's own long-standing claim: there is
> no 1.5px line in Matchbook, and there never was.** Chrome floors
> `border-width: 1.5px` to a used value of 1px — verified at devicePixelRatio 1,
> 2 and 3 (a 40px box with a 1.5px border lays out at 42px, not 43px). A sweep of
> `/dev/kit` found **2783 rendered borders: 2616 at 1px, 81 at 4px, 52 at 3px, 34
> at 2px, and zero at 1.5px** — including all 109 elements carrying
> `border-[1.5px]`, and `.mb-panel`, `.mb-tile` and `.mb-input` themselves.
>
> The rule *hierarchy* is real and reads correctly; it is carried by **colour**,
> not weight — translucent `--mb-rule` for a divider against solid `--mb-navy`
> for an edge — plus the genuine 3px and 4px steps. Only the 1 → 1.5 step is a
> fiction. Keep writing `border-[1.5px] border-mb-navy` in JSX: it is the
> established idiom, it is what every shipped screen uses, and it produces the
> correct 1px solid-navy line. Do not "fix" it to `border`, and do not chase a
> visible 1.5px by going to 2px — 2px is spoken for by the masthead badge, the
> one place in the system where a border *weight* carries meaning.

### 3.4 Panel anatomy

```
┌──── 4px navy top border ───────────────────────────┐
│ HEAD  [icon] TITLE ………………………… action → | meta       │  ← paper: hairline underline
│                                                    │     navy tone: solid navy bar
├────────────────────────────────────────────────────┤
│ BODY  table / list / grid / prose / PanelEmpty      │  flex-1
├────────────────────────────────────────────────────┤
│ FOOT  centred .mb-panel-link, mt-auto (optional)    │
└──── solid navy edge, radius 4px, one soft shadow ───┘
```

Throughout this document "1.5px navy" names the **solid-navy edge** — the idiom
you write, not the weight you get. It renders at 1px; §3.3 has the measurement.

```css
/* as shipped — every value is a token */
.mb-panel {
  background: var(--mb-paper-bright);
  border: var(--mb-rule-edge) solid var(--mb-navy);   /* renders 1px — see §3.3 */
  border-top-width: var(--mb-rule-anchor);            /* 4px */
  border-radius: 4px;
  box-shadow: var(--mb-panel-shadow);
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
modifier: `className="mb-panel h-auto!"` (the form panel in `src/app/login/page.tsx`).

### 3.5 Rules and dividers

| Rule | Class | Use |
| --- | --- | --- |
| Hairline | `border-mb-rule` (1px) | Between rows, under panel head, between form sections |
| List divider | `divide-y divide-mb-rule` | Any vertical list of rows (the standard) |
| Column divider | `divide-x divide-mb-rule` | Stat triptychs (Leaders, Club Snapshot) |
| Heavy | `border-t-[1.5px] border-mb-navy` | Panel footer summary strips, section splits inside a panel |
| Heavy frame | `border-y-[1.5px] border-mb-navy` | The filter bar |
| Timeline spine | `ml-3 border-l-[1.5px] border-mb-navy` | Schedule/timeline lists only — a solid-navy edge (was coral; a timeline axis is structure, not selection — §1.2a) |
| Accent rail | `style={{ boxShadow: "inset 3px 0 0 <color>" }}` | Rank #1 (`--mb-teal`), selected row (`--mb-coral`), live row (`--mb-red`), result category (cycle) |
| On-navy hairline | `border-[rgba(255,250,241,0.25)]` | Dividers inside a navy surface |
| Inline separator | `<span className="h-px flex-1 bg-mb-rule" />` | "Or continue with email" style splitters |

---

## 4. Component inventory

### 4.1a CSS classes in `globals.css` — the P0 set

| Class | Use this when | Snippet |
| --- | --- | --- |
| `.matchbook-surface` | Outermost wrapper of any Matchbook page. Once per page. | `<div className="matchbook-surface min-h-screen">` |
| `.matchbook-display` | Any Oswald uppercase text not already covered by another `mb-*` class. Always pair with an explicit size + tracking. | `<span className="matchbook-display text-[0.78rem] font-bold">` |
| `.mb-panel` | The boxed content card. Every content region on a Matchbook screen lives in one. | `<section className="mb-panel">` (prefer `<Panel>`) |
| `.mb-panel-head` | Paper-tone panel header. Provided by `<Panel>`; hand-write only for a bespoke header. | `<header className="mb-panel-head">` |
| `.mb-panel-link` | Small uppercase forward link: panel actions, footer links, "Open" affordances. Underlines on hover (navy ink — the coral hover ink was retired with the job census). | `<Link className="mb-panel-link">Open <MbIcon id="chevron-right" size={11} /></Link>` |
| `.mb-btn` | Base for every button/link-button. Never used alone — always + a variant. | `<button className="mb-btn mb-btn-navy">` |
| `.mb-btn-navy` | Secondary/structural action ("Manage Event", "Export CSV", "Add Team"). Highest contrast. | `<button className="mb-btn mb-btn-navy"><MbIcon id="plus" size={14} />Add Team</button>` |
| `.mb-btn-coral` | The single primary CTA of a screen or panel. | `<Link className="mb-btn mb-btn-coral"><MbIcon id="quick" size={14} />Quick Match</Link>` |
| `.mb-btn-outline` | Tertiary / destructive-adjacent on paper; coral text on transparent. | `<button className="mb-btn mb-btn-outline"><MbIcon id="warning" size={14} />Delete</button>` |
| `.mb-btn-outline-navy` | Neutral outline on bright fill: auth providers, "Continue as Guest", "Random Teams". | `<button className="mb-btn mb-btn-outline-navy w-full">Continue with Google</button>` |
| `.mb-nav-item` | Sidebar navigation row. Active state via `data-active="true"` (coral text + coral 3px left border + coral tint). | `<Link className="mb-nav-item" data-active={active}><MbIcon id="teams" size={18} />Teams</Link>` |
| `.mb-kicker` | Eyebrow label above/beside a value or field. Already display+muted. | `<p className="mb-kicker">Next Match</p>` |
| `.mb-form-square` | 11×11 W/L square in a form strip. Colour set inline. Use `FormSquares`. | `<span className="mb-form-square" style={{background:"var(--mb-green)"}} />` |
| `.mb-live-dot` | 7px pulsing red dot. Always immediately followed by the word "Live". | `<span className="mb-live-dot" /><span className="matchbook-display text-[0.62rem] font-bold text-mb-red">Live</span>` |
| `.mb-score-box` | Boxed single score in a dense row, or the literal "VS" pip. min-width 26px. | `<span className="mb-score-box">{homeScore}</span>` · `<span className="mb-score-box mb-track-title px-2">VS</span>` |
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

### 4.1b CSS classes added in P1 (GAP-1/2/4/5/6/7/8/10/11/12/14/15)

Almost all of these have a React component in front of them — **use the
component**. The class is documented so a bespoke surface can borrow the
geometry, and so nobody re-invents one under a new name.

| Class | Use this when | Component |
| --- | --- | --- |
| `.mb-row-hover` | Any hoverable row. Replaces the copy-pasted `hover:bg-[rgba(7,50,77,0.04)]`. | — |
| `.mb-rail` | The 3px inset accent rail. Colour via `--mb-rail-color` (default coral). | — |
| `.mb-tile` | The boxed tile: 1.5px navy on paper-bright. | — |
| `.mb-icon-disc` | The circular 1.5px navy icon disc in a stat block. | `MbStat` |
| `.mb-meter` + `.mb-meter > span` | Readiness / progress track and fill. | `MbMeter` |
| `.mb-btn-lg` | A hero CTA at ≈44px without touching the base button. | `MbButton size="lg"` |
| `.mb-btn-touch` | One button that must clear 44px on a fine pointer too. | `MbButton`, `MbIconButton` |
| `.mb-badge` + `[data-tone]` + `[data-variant]` + `[data-size]` | Any status word. Nine tones; the mark shape carries the tone, the letterforms stay navy. | `MbBadge` |
| `.mb-banner` + `[data-tone]` | Inline notice inside a page or panel. 4px left rule in the tone. | `MbNotice` |
| `.mb-toast` + `[data-tone]` | Transient notification. **CSS only — the component is not built.** | GAP-2 |
| `.mb-dialog`, `.mb-dialog-overlay`, `.mb-dialog-head`, `.mb-dialog-body`, `.mb-dialog-foot` | Modal chrome. `[data-tone="navy"\|"danger"]` re-inks head and top rule. | `MbDialog` |
| `.mb-sheet` | Bottom-sheet chrome (radius on the top corners only). | `MbSheet` |
| `.mb-tabs`, `.mb-tab`, `.mb-tab[data-active]` | View switcher. Coral 3px **bottom** border when active — the horizontal mirror of `.mb-nav-item`. | `MbTabs` |
| `.mb-segmented`, `.mb-segmented > *`, `[data-selected]` | Value picker. Grid with `gap: 1.5px` over a navy ground — the gaps **are** the rules. | `MbSegmented` |
| `.mb-field`, `.mb-field-hint`, `.mb-field-error`, `[data-invalid]` | The label/hint/error triad around any control. | `MbField` |
| `.mb-textarea` | Multi-line input at `.mb-input` geometry. | `MbTextArea` |
| `.mb-check`, `.mb-radio` | Squared ballot boxes. `.mb-radio` is **not** a circle — §3.3 reserves 999px. | form controls |
| `.mb-switch` | 28×16 track, radius 2px, navy when on ("inked, not highlighted" — §1.2a). | `MbToggle` |
| `.mb-stepper`, `.mb-stepper button`, `.mb-stepper-value`, `[data-size="lg"]` | Bounded integer. Buttons are 44×44 (56 at `lg`). | `MbNumberStepper` |
| `.mb-swatch`, `[data-size="touch"]`, `[data-selected]` | A colour chip. 24×24, or 44×44 as a real target. | `MbSwatchPicker` |
| `.mb-console`, `.mb-console-column`, `.mb-notch-coral` | The full-bleed scoring surface: tap columns, press = tint not scale. | GAP-7 (W5) |
| `.mb-numeral` + `--compact` / `--console` / `--court` | The four score size steps. | `MbScoreNumeral` |
| `.mb-scoreline` | Grid `1fr auto 1fr` with `min-width:0` cells. Never flex. | `MbScoreboardHero` |
| `.mb-action-bar` | The fixed bottom commit bar. | `MbActionBar` |
| `.mb-skeleton` | Static placeholder block. No shimmer. | `MbSkeleton` |
| `.mb-stamp-final` | The rotated "Final" stamp. Ink is `--mb-green-ink` — Final is green (§1.2); the coral-deep ink it once carried made one status two colours. | `MbFinalStamp` |
| `.mb-code-chip` | A share code / token rendered as a boxed monospaced-feel chip. | `MbCopyField`, `MbSwatchPicker` |
| `.mb-day-head` | The day-group band in a ledger table. | History |
| `.mb-rule-vertical` | A 1.5px navy vertical hairline — the overflow-edge marker on a scroller. | `MbTabs` |
| `.mb-skip-link` | The skip-to-content link. One per page, first in the DOM. | shell |
| `.mb-enter`, `.mb-stagger-1…6` | Entrance: opacity + 6px rise. Stagger caps at 6. Replaces the legacy `.stagger-*`. | — |
| `.mb-safe-top`, `.mb-safe-bottom` | Padding for the notch / home indicator. | — |
| `.mb-print-hide` | Marking a region that must not print. Defined **only inside `@media print`**, alongside the chrome the print rules already drop (`.mb-skip-link`, `.mb-action-bar`, `.mb-toast`, `.mb-dialog-overlay`, `.mb-btn`, `.mb-panel-link`, `.mb-tabs`) — so it costs nothing on screen. Use it for anything screen-only the print block cannot know about. | — |
| `@keyframes mb-enter`, `mb-fade`, `mb-sheet-up` | The three P1 animations, alongside `mb-pulse`. | — |

### 4.2 React exports in `src/components/matchbook/`

**Accurate as of commit `a4d6876` plus the Gate-1 fix round.** Every entry below
was read from the file, not from a plan. There is **no barrel** — import from the
file. All components are arrow functions with named exports; there are no default
exports. Live gallery of every one of them: **`/dev/kit`**
(`src/app/dev/kit/page.tsx`).

Canonical props live in `IMPLEMENTATION-CHARTER.md` §2, which outranks this
table when they disagree about a signature. This table is for *choosing*.

**One appearance vocabulary, two words (D-16).** `tone` names semantic colour —
what a mark *means*: `live`/`danger`/`success`/`warn` and their kin, the
`paper`/`navy` surface pair, the six state tones. `variant` names a structural
alternative — which *build* of a control renders: the `.mb-btn` faces
(`coral`/`navy`/`outline`/`outline-navy`, plus `plain` on `MbIconButton`), badge
`text`/`framed`/`solid`, shell `console`/`focus`/`public`. Button appearance is
therefore always `variant` — on `MbButton`, `MbIconButton`, `MbMenu`'s worded
trigger, every action descriptor (`MbAction`, `MbEmptyStateAction`, the sidebar
CTA) and `PanelEmpty`'s single action. The compound spellings `actionTone` and
`triggerVariant` are retired (charter Appendix B), and `MbShareAction` picks its
control with `as="button" | "icon"` so `variant` means one thing on both shapes.

**Chrome and layout**

| File | Export | Use this when |
| --- | --- | --- |
| `MbIcon.tsx` | `MbIcon` | Any icon, anywhere. `currentColor`, `aria-hidden` baked in — an icon-only control still needs its own name. |
| `Sidebar.tsx` | `MatchbookSidebar` | Every authenticated screen. Owns `NAV_ITEMS`; a new top-level route means editing this array **and** `MOBILE_NAV`. |
| `MobileBar.tsx` | `MatchbookMobileBar` | Every authenticated screen, directly under the sidebar. Interim — GAP-3 replaces it with `MatchbookTopStrip` + `MatchbookBottomBar`. |
| `Panel.tsx` | `Panel` | Any boxed content region. Handles head, tone, action link, meta slot. `tone="navy"` for a summary/hero panel, max 1–2 per screen. |
| `ActionBar.tsx` | `MbActionBar` | The bottom-anchored commit bar: one primary, ≤1 secondary, one short status line. The wizard footer and the scoring action rail are both this. |
| `ActionBar.tsx` | `MB_ACTION_BAR_H`, `MB_ACTION_BAR_H_STACKED` | Reserving scroll padding under a fixed action bar. Never re-measure it in the page. |

**Identity and data marks**

| File | Export | Use this when |
| --- | --- | --- |
| `Panel.tsx` | `Crest` | A team crest at a size (aspect 96:112 preserved). Never a raw `<Image>` in a square box. |
| `Panel.tsx` | `TeamMark` | Crest + team name as one inline unit. `reverse` flips it for the away side. |
| `Panel.tsx` | `FormSquares` | A W/L run to be **scanned**. Padded to `slots` (default 8) so the strip keeps constant width. |
| `Panel.tsx` | `FormLetters` | A W/L run to be **read** — when the individual result matters, not the shape. |
| `Badge.tsx` | `MbBadge` | Any status word (Live/Draft/Final/Win/Loss/Guest/…). Nine tones, each with its own **mark shape**, so status survives greyscale. Replaces every inline `style={{ color }}` status span. |
| `Stat.tsx` | `MbStat` | A labelled figure in a tile or triptych. Replaces `StatusStat` / `SummaryStat` / `ProfileStat`. |
| `Meter.tsx` | `MbMeter` | A proportion as a 4px rule track + fill (readiness, progress). Takes a token expression, which is what `readinessColor()` returns. |
| `FinalStamp.tsx` | `MbFinalStamp` | The rotated hairline "Final" stamp closing out a finished match. |
| `LiveStatus.tsx` | `MbLiveStatus` | "Updated 2 min ago"-style freshness, rounded to what a human would say. Sub-5s reads "just now" so a live feed does not flicker. |
| `ScoreNumeral.tsx` | `MbScoreNumeral` | Any score the reader is meant to look at. Reserves its own digit width so a change cannot reflow neighbours, and cross-fades instead of moving. |
| `ScoreboardHero.tsx` | `MbScoreboardHero` | The matchup block: two identities, one score, one status. Grid `1fr auto 1fr`, reflows to one row per team below `sm`. |

**Controls**

| File | Export | Use this when |
| --- | --- | --- |
| `Button.tsx` | `MbButton` | Every button that *does* something. One variant per call. |
| `Button.tsx` | `MbButtonLink` | Every control that *navigates*. Never `MbButton` with an `onClick` that pushes a route. |
| `IconButton.tsx` | `MbIconButton` | An icon-only control. Owns its ≥44px box; still needs `label`. |
| `Tabs.tsx` | `MbTabs` | Switching which **view** is shown. Hand-rolled tablist, roving tabindex, horizontal scroller with hairline overflow edges. |
| `Segmented.tsx` | `MbSegmented` | Picking a **value** from 2–6 options. `role="radiogroup"`; wraps to a second row rather than squeezing a cell under 44px. |
| `Menu.tsx` | `MbMenu` | A row or masthead with more than two actions. Full-bleed ruled rows — a menu is a short ledger, not a card stack. |
| `ChoiceCard.tsx` | `MbChoiceCard` | A "pick a thing" tile: format grid, tools hub, any chooser. Accent colour is a contained rail only. |
| `StepRail.tsx` | `MbStepRail` | Wizard progress. Semantic `<ol>`; completed steps are buttons, current and future steps are inert. |
| `SelectList.tsx` | `MbSelectList` | Multi-select over a list of rows, with optional search. Selection is a `Set` of keys; the caller owns filtering. |
| `SelectList.tsx` | `MbSelectRow` | One row of the above. Memoised — feed it primitives and stable callbacks. |
| `SelectList.tsx` | `MbSelectColumn<T>` | The column descriptor `MbSelectList` takes. A row's shape is declared once, here, not re-rendered per call site. |
| `SelectList.tsx` | `MbCheckMark` | The system tick, drawn as a border pair. The sprite's `check` is a *circled* tick and reads as a ring below ~16px. |
| `ReorderList.tsx` | `MbReorderList` | Re-ranking rows. Three equal input paths: pointer grip, visible 44px up/down buttons, `Alt+Arrow`. Nothing animates. |
| `ReorderList.tsx` | `mbReorder` | The move as a pure function. Callers never re-write the splice. |

**Forms** (`form.tsx` — one file, one context)

| Export | Use this when |
| --- | --- |
| `MbField` | The wrapper around **every** control. Publishes `id` / `aria-describedby` / `aria-invalid` / `required` through context so the control below never restates them. |
| `MB_FIELD_LABEL` | Labelling a control that cannot sit inside `MbField` (a bespoke composite, a fieldset legend). The one field-label type step — `display/nav`, navy, `letterSpacing` inline because `.matchbook-display` is unlayered and beats every Tailwind `tracking-*` utility. Spread it; never restate the classes. |
| `MbTextInput` | Single-line text. Optional leading `icon` and `trailing` slot. |
| `MbTextArea` | Multi-line free text. |
| `MbSelect` | A native `<select>` with the chevron already attached. |
| `MbNumberStepper` | A bounded integer (points to win, courts, rotation). `wrap` for cycles like R1–R6. Each button is 44×44. |
| `MbToggle` | A boolean setting with a label and optional hint. |
| `MbToggleChip` | A boolean *filter* in a row of filters — pressed state, not a switch. |
| `MbSwatchPicker` | Team / event colour. `allowCustom` yields a real hex; otherwise values are `var(--mb-*)` token references. |
| `MB_SWATCH_PALETTE` | The house palette. Import it rather than restating eight colours. |
| `MbTagInput` | A short list of free-text tokens (tags, player names, labels). |

**Overlays and state**

| File | Export | Use this when |
| --- | --- | --- |
| `Dialog.tsx` | `MbDialog` | Any modal. Owns focus restoration that Radix drops for a controlled (triggerless) dialog. |
| `Dialog.tsx` | `MbDialogBody`, `MbDialogFooter` | The scroll region and the action row inside a dialog or sheet. The footer stretches its buttons below `sm`. |
| `Dialog.tsx` | `useMbFocusRestore` | Any *other* controlled Radix overlay you build. Do not re-solve this. |
| `Sheet.tsx` | `MbSheet` | A bottom sheet on mobile. Discrete snap heights cycled by a real 44px button — no drag gesture. |
| `Confirm.tsx` | `MbConfirm` | **Every** confirmation. There is no `window.confirm` and no second dialog. `destructive={false}` for a plain "are you sure". |
| `DangerZone.tsx` | `MbDestructiveButton` | **Every** control that destroys, resets, purges or ends something — including the confirm button inside a dialog. Red ink + red rule on a paper-bright fill with the `warning` glyph; never a red fill (a red-filled button beside a coral CTA is two near-identical reds). Carries `data-mb-destructive` as the audit hook. |
| `DangerZone.tsx` | `MbDangerZone` | The framed block that closes a page whose last option is destructive. Always rendered last, never inline with frequent actions. |
| `Notice.tsx` | `MbNotice` | An inline message inside a page or panel. Tone rides the 4px left rule; letterforms stay navy. |
| `EmptyState.tsx` | `MbEmptyState` | A **route** with nothing in it. Ranged left: eyebrow, display line, hung rule, deck, actions. |
| `Panel.tsx` | `PanelEmpty` | A **panel** with nothing in it — the same anatomy one size down. |
| `Panel.tsx` | `MbStateBlock` | The state language drawn **once**. `PanelEmpty` and `MbEmptyState` are both thin wrappers over it and differ in nothing visible. Reach for it only if you need the anatomy at a scale neither wrapper offers; otherwise use a wrapper. |
| `Panel.tsx` | `MB_STATE_SCALE` | The size rows `MbStateBlock` selects (`panel` / `route`). Pass a row; never restate a size. |
| `Panel.tsx` | `MB_STATE_TONES` | Building a bespoke empty/error surface that must use the same tone marks as `PanelEmpty` and `MbEmptyState`. (The "headline — deck" splitter beside it, `splitStateMessage`, is **module-private** — it is not exported. Pass a pre-split message, or use one of the two components.) |
| `Skeleton.tsx` | `MbSkeleton` | A loading placeholder sized to the geometry it replaces. No shimmer — a shimmer is a gradient. |

**Sharing and clipboard**

| File | Export | Use this when |
| --- | --- | --- |
| `CopyField.tsx` | `MbCopyField` | Showing a value the user must copy (link, code, token). Handles reveal, confirmation, and the browser-refused manual fallback. |
| `CopyField.tsx` | `copyToClipboard` | Copying from anywhere else. The one implementation: async clipboard → `execCommand` → `"manual"`. Never throws. |
| `ShareAction.tsx` | `MbShareAction` | A share control — `as="button"` or `as="icon"` picks which kit control renders; `variant` is that control’s face. Native sheet → clipboard → fallback dialog, all handled. |
| `ShareAction.tsx` | `shareLink` | Sharing from your own control. Callers **must** handle `"manual"` visibly. |

**Logic, types and data**

| File | Export | Use this when |
| --- | --- | --- |
| `types.ts` | `Mb*` interfaces | Any Matchbook view model. Listed below. |
| `types.ts` | `crestPath`, `crestForTeam` | **Every** team rendered on a Matchbook screen. Never hard-code a crest path for user data. |
| `teamStats.ts` | `buildTeamTallies`, `emptyTally`, `recentForm`, `readinessPercent`, `readinessStatus`, `readinessColor` | Any record, form run or readiness figure — so two screens never disagree about a team. |
| `formatMeta.ts` | `FORMAT_META`, `FORMAT_ORDER`, `isEliminationFormat`, `hasAdvancedSettings` | Anything that branches on competition type: labels, blurbs, accents, capability flags. |
| `useMbReducedMotion.ts` | `useMbReducedMotion`, `REDUCED_MOTION_QUERY` | Any JS-driven motion. Render the end state when it returns true. |

**`types.ts` view models** — `MbTeam`, `MbFormResult`, `MbStandingRow`,
`MbSetScore`, `MbFeaturedMatch`, `MbLiveCourt`, `MbScheduleItem`,
`MbBracketSeed`, `MbBracket`, `MbRecentResult`, `MbReadinessStatus`,
`MbReadinessRow`, `MbLeader`, `MbStatTotal`, `MbDashboardData`, `MbTeamStatus`,
`MbNextMatch`, `MbTeamRow`, `MbFormRow`, `MbTeamsData`.
`crestPath(slug)` → `/assets/matchbook/teams/{slug}.svg`;
`crestForTeam(teamId, teamName)` → the deterministic crest for a real team.

**Data hooks** — `useMatchbookDashboard`, `useMatchbookTeams`,
`useMatchbookCompete`, `useMatchbookHistory`, `useMatchbookQuickMatch`. Where the
screen's view model is shared, it lives in `types.ts` and the hook file exports
the hook alone (`useMatchbookDashboard`, `useMatchbookTeams`); where it is
screen-local, the hook file also exports its own interfaces
(`useMatchbookCompete` → `MbCompetitionRow`, `MbBracketCell`, `MbBracketRound`,
`MbStandingLine`, `MbCourtLine`, `MbMatchLine`, `MbCompeteSelected`,
`MbCompeteData`, plus `COMPETITION_TYPE_LABELS`; `useMatchbookHistory` →
`MbLedgerEntry`, `MbLedgerDay`, `MbMatchReport`, `MbMatchup`,
`MbRecentCompetition`, `MbHistoryData`; `useMatchbookQuickMatch` →
`MbQuickMatchRow`, `MbTeamFormSummary`, `MbQuickMatchData`). Pattern to copy for
a new screen: a pure `build<Screen>(state)` function + a
`useMemo(() => build(state), [state])` hook, so the page component contains **no**
data shaping.

**Panel libraries** — `panels.tsx` (Overview: `StandingsPanel`,
`MatchOfTheDayPanel`, `LiveCourtsPanel`, `SchedulePanel`, `BracketPanel`,
`RecentResultsPanel`, `ReadinessPanel`, `LeadersPanel`) and `teamPanels.tsx`
(Teams: `TeamDirectoryPanel`, `ClubSnapshotPanel`, `TeamReadinessPanel`,
`TeamProfilePanel`, `UpcomingFixturesPanel`, `RecentFormPanel`). Screen-specific;
read them for idiom, import only if the panel is genuinely the same panel.

**Not built yet** — do not import these; see §11 for who owns them:
`MatchbookMasthead`, `MbEventBar`, `MatchbookTopStrip`, `MatchbookBottomBar`,
`MbAccountChip` (GAP-3/9, W2/P2a) · `MbToast` + `useToast` + `ToastHost`
(GAP-2, W2/P2b) · `MbPageLoading` (GAP-8, W2/P2b) · `MbOfflineBanner` (W2/P2b) ·
`MbScoreSide`, `MbSetStrip`, `useCourtView` (GAP-7, W5/P3a).

### 4.3 Legacy inline recipes — read these, don't write them

Every recipe in this table now has a class or a component (GAP-10, closed). The
literals are documented because they are still in the un-converted files you
will read. **In new code, use the right-hand column.**

| Recipe you will see | Write this instead |
| --- | --- |
| `className="transition-colors hover:bg-[rgba(7,50,77,0.04)]"` | `className="mb-row-hover"` |
| `style={{ boxShadow: "inset 3px 0 0 var(--mb-coral)" }}` | `className="mb-rail"` (`--mb-rail-color` to change the tone) |
| `className="border-[1.5px] border-mb-navy bg-mb-paper-bright p-4"` | `className="mb-tile p-4"` |
| `className="flex h-10 w-10 … rounded-full border-[1.5px] border-mb-navy"` | `className="mb-icon-disc h-10 w-10"`, or `MbStat` |
| the hand-rolled progress span with `rgba(7,50,77,0.12)` | `<MbMeter value={p} color={readinessColor(p)} />` |
| `<p className="border-[1.5px] border-mb-red …" role="alert">` | `<MbNotice tone="danger">` |
| `<p className="border-[1.5px] border-mb-green …" role="status">` | `<MbNotice tone="success">` |
| `style={{ color: STATUS_STYLES[s].color }}` on a display span | `<MbBadge tone="…">` |
| a bare `<button className="mb-btn mb-btn-coral disabled:…">` | `<MbButton variant="coral">` |
| the copy-pasted panel footer link `<div className="border-t …">` | still hand-written — `MbPanelFoot` is GAP-9, unbuilt |
| the copy-pasted masthead / account chip | still hand-written — GAP-9, unbuilt |

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
`text-mb-ink-muted` (the set-score grid inside `MatchOfTheDayPanel`,
`panels.tsx`).

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

Dot and word always ship together. The masthead variant is the navy 2px badge
reading `Live / Now` stacked.

### 5.6 Status badges

**Use `MbBadge`** (`Badge.tsx` + `.mb-badge`). GAP-4 is closed; the inline
`style={{ color }}` pattern below is **legacy** and is being migrated out of
`competitions/page.tsx` and friends as each screen is converted.

```tsx
<MbBadge tone="live" variant="text">Live</MbBadge>
<MbBadge tone="draft" variant="framed" size="md">Draft</MbBadge>
<MbBadge tone="live" variant="solid">Live</MbBadge>   {/* solid is live-only */}
```

Nine tones — `live draft final win loss neutral teal guest warn` — and each one
draws a **different mark shape** (round dot, circled tick, filled square, hollow
square, pencil, triangle, hollow disc, horizontal bar, vertical bar). That is
deliberate: nine badges in nine hues but one geometry is information carried by
colour alone, and a desaturated screenshot is the honest test. The letterforms
are always `--mb-navy`; the tone rides the mark and, for `framed`, the 1.5px
rule in `--mb-badge-ink` (`draft`/`warn` resolve to `--mb-gold-ink`). `solid` is
permitted for **`live` only** — 4.76:1 with white; solid green measures 4.45:1
and is refused.

The legacy pattern, for reading un-migrated screens:

```tsx
const STATUS_STYLES = {
  in_progress: { label: "Live",  color: "var(--mb-red)" },
  draft:       { label: "Draft", color: "var(--mb-gold)" },
  completed:   { label: "Final", color: "var(--mb-green)" },
} as const;
```

The masthead's framed count badge is a different object — `border-[2px]` navy
around a stacked value/caption pair — and stays hand-written until
`MatchbookMasthead` lands (GAP-9).

### 5.7 Empty states

One state language, two sizes. A **panel** with nothing in it renders
`<PanelEmpty>`; a **route** with nothing in it renders `<MbEmptyState>`. They are
both thin wrappers over one renderer, `MbStateBlock`, and differ only in the
props they accept and in which row of `MB_STATE_SCALE` they pass — in nothing
visible. Both draw the same anatomy, top to bottom, **ranged left**:

```
eyebrow   glyph + one word              only on the five failure tones
display   the headline, Oswald caps     1.2rem in a panel, 1.875rem on a route
rule      a hung hairline               40px in a panel, 64px on a route
deck      the sentence explaining it    body/sm, ink-muted
action    at most one, ranged left      button sm in a panel, lg on a route
```

Six tones, one table (`MB_STATE_TONES`, imported by both cuts so they cannot
drift): `empty` (no glyph, no word — an ordinary empty state stays plain),
`notfound` (`search` / "Not found"), `error` (`warning` / "Error", red glyph),
`offline` (`wifi-off` / "Offline", `--mb-gold-ink` glyph), `denied` (`lock` /
"No access"), `unconfigured` (`settings` / "Not set up"). The **glyph** carries
the ink; the word stays `.mb-kicker` muted, so a failure is never announced by
small coloured letterforms.

It is deliberately **not** a centred glyph-in-a-circle over centred text —
that is the layout the rubric's §3 hard-fail 5 names outright, and it is what
`PanelEmpty` drew before P1.

- Copy format: **"No <things> exist yet — <what makes them appear>."** Em dash,
  lower case after it, full stop. `splitStateMessage` splits that string into
  headline and deck, so pass the whole sentence and let the component set it.
- One action maximum, sentence case.
- Filtered-to-nothing is a different tone and gets **no** action:
  `` `No teams match “${search}”.` `` (curly quotes).
- Loading is `MbSkeleton` sized to the geometry it replaces, or plain text —
  never a spinner, never a shimmer.
- The eyebrow glyph comes from `MB_STATE_TONES` and nowhere else. No
  illustrations, no emoji, no glyph-in-a-circle.

---

## 6. Iconography

One sprite: `public/assets/matchbook/icons/sprite.svg`, consumed only via `MbIcon`.
Every symbol inherits `currentColor`.

**The complete id list (62) — counted from `sprite.svg` itself; there is no
`manifest.json` any more:**

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
| Global press | `globals.css` | `button:active:not(:disabled) { transform: scale(.98) }` — applies to Matchbook buttons too |
| Reduced motion | `globals.css` | Global `@media (prefers-reduced-motion: reduce)` clamps all animation/transition to 0.01ms |

### 7.2 The token system (SHIPPED — GAP-11 closed in P1)

The tokens below exist in `globals.css` `:root`. Every Matchbook transition
written from P1 onward consumes them; a hard-coded `150ms ease` in new code is a
review failure. (The P0 classes above still carry their original literal `.15s`
values — they are unchanged on purpose, because rewriting them would move pixels
on six shipped screens for no gain.)

- **Durations:** `--mb-dur-fast: 120ms` (press, tint), `--mb-dur-base: 180ms`
  (hover, focus, colour), `--mb-dur-slow: 280ms` (panel/entry, dialog).
- **Easings:** `--mb-ease-out: cubic-bezier(.2,.8,.3,1)` for anything entering;
  `--mb-ease-in-out: cubic-bezier(.4,0,.2,1)` for anything that moves both ways.
  **No springs, no bounce, no overshoot** — printed matter does not wobble.
- **Entrance:** `.mb-enter` = `@keyframes mb-enter` (opacity 0→1 plus
  `translateY(6px)→0`) at `--mb-dur-slow` / `--mb-ease-out`. 6px, not the legacy
  10–15px. Never scale a panel in.
- **Stagger:** `.mb-stagger-1` … `.mb-stagger-6`, each
  `calc(var(--mb-stagger) * n)` = 40ms steps, capped at 6 (240ms). **Grid panels
  only** — never table rows, never bracket cells.
- **Overlays:** `@keyframes mb-fade` (dialog overlay) and `mb-sheet-up` (bottom
  sheet). Those two plus `mb-enter` and `mb-pulse` are the complete keyframe set.
- **Press:** keep the existing `scale(.98)`; do not add lift/translate.
- **Page transitions:** cross-fade only, `--mb-dur-base`. No slide, no shared
  layout, no `layoutId`.
- **Score changes:** the one place a value may animate — and it is already
  built. `MbScoreNumeral` cross-fades two layers stacked in one grid cell: no
  translate, no scale, no flip, and the box never reflows its neighbours. `flash`
  adds a coral 3px edge on the side the score moved so direction survives
  greyscale. The legacy `numberFlip` spring in `src/components/motion/index.tsx`
  is explicitly **not** Matchbook.
- **Reduced motion:** the global clamp handles CSS. Any JS-driven motion must
  additionally call **`useMbReducedMotion()`** (`useMbReducedMotion.ts`) and
  render the end state. `.mb-live-dot` falls back to a static dot via the global
  `animation-iteration-count: 1`.

There is still **no framer-motion on any converted screen**. `framer-motion`
remains in the unconverted files (match consoles, volleyball editor, old toasts,
`PageLoadingSpinner`) and is deleted with them in P4.

### 7.3 Three system guarantees that are not in the Matchbook block

Measured against `globals.css` as it stands. Each is described elsewhere in this
document as something Matchbook screens get for free, and **none of them is
declared in zone A** (Trap 2). Two are in the legacy zone C, one in the shared
zone B. Deleting zone C as §9 describes removes the first two from every
converted screen.

| Guarantee | Zone | What breaks if it goes |
| --- | --- | --- |
| `button:active:not(:disabled) { transform: scale(0.98) }` (§7.1 "global press") | **C — legacy**, under `BUTTON STATES` | every Matchbook button loses its press feedback |
| `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { … } }` (§7.2 "the global clamp handles CSS") | **C — legacy** | `.mb-live-dot` pulses under reduced motion, and `.mb-enter` / `mb-fade` / `mb-sheet-up` all animate. There is **no** `prefers-reduced-motion` rule anywhere in zone A |
| `html, body { overflow-x: hidden }` (§8 "set globally") | **B — shared middle**, in the base reset | the horizontal-overflow symptom stops being hidden on every screen at once |

**W2 owns this in P4:** re-declare all three inside zone A *before* deleting zone
C, in the same commit, and treat zone B as a decision rather than collateral.
`audit.mjs` will not catch the reduced-motion one — its `MOTION` pass samples
inline styles and computed transform/opacity across two frames, which detects
JS-driven motion, not a CSS keyframe that was never clamped.

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

**Touch targets — half closed, and the half that is open is deliberate:**
- Every **P1 primitive** meets 44px on its own: `.mb-btn-lg` and `.mb-btn-touch`
  are unconditional, `MbIconButton` owns its box, and `.mb-tab`,
  `.mb-segmented > *`, `.mb-stepper button` and `MbSelectList` rows all set
  `min-height: 44px` (48px for `MbSegmented size="md"`, 56px for the `lg`
  stepper). Use the component and the floor is free.
- The **base `.mb-btn` is still ≈38.8px** and `.mb-panel-link` ≈17.3px at
  390×844. The blanket coarse-pointer floor exists —
  `@media (pointer: coarse) { [data-mb-touch="on"] .mb-btn, .mb-nav-item,
  .mb-tab, .mb-panel-link { min-height: 44px } }` — but is **not armed**. It
  waits on `data-mb-touch="on"` on `<html>`, which W2 sets in the one P2 commit
  that also drops `maximumScale`, sets `viewport-fit: cover` and pads every
  fixed element (charter H6 requires those together). Arming it in P0 would have
  reflowed all six shipped mobile routes.
- So for **new** hand-written controls, keep padding to 44px:
  `mb-btn mb-btn-lg`, or `MbIconButton`, or
  `className="flex h-11 w-11 items-center justify-center"`.

**Thumb reach:** `MbActionBar` is the answer and it is built — a bottom-anchored
commit bar with one primary, at most one secondary and a short status line. Any
screen whose main job is a single repeated action (scoring, wizard commit) puts
that action in an `MbActionBar`, not in the masthead. The mobile *nav* is still
top-anchored until `MatchbookBottomBar` lands (GAP-3).

**Safe areas:** `--mb-safe-top` / `--mb-safe-bottom`
(`env(safe-area-inset-*, 0px)`) and the `.mb-safe-top` / `.mb-safe-bottom`
utilities exist. Use them on anything fixed. **`viewport-fit: cover` is still
not set in `layout.tsx`**, so the insets resolve to 0 today — they arm together
with `data-mb-touch` in W2's P2 commit. See GAP-3.

**Viewport is locked:** `layout.tsx` sets `maximumScale: 1, userScalable: false`.
That means users cannot pinch to rescue small text, so the 0.6–0.66rem display
steps must never carry information that isn't repeated at a larger size.

**Landscape:** an `@media (max-height: 500px)` block provides `.hide-landscape`,
`.hide-landscape-divider`, `.show-landscape` and `.landscape-row`, built for the
scoring console. **Verified location: they sit outside the Matchbook block — the
first thing in zone B (Trap 2), after the last `.mb-*` rule and before the legacy
`:root`.** So they are neither Matchbook nor cleanly legacy: nobody owns them,
and nothing guarantees they survive P4. W5 owns the landscape console (GAP-7):
re-declare the four helpers as `.mb-*` inside zone A, or write the media query
locally. Do not build the scoring console on a class from zone B without moving
it first.

**Landscape navigation — the console contract, and the focused-surface
exemption (D6 ruling, measured 2026-08-16):**

- On **`variant="console"`** routes, exactly one of the three navs is displayed
  at any (width, height): the sidebar at `lg`+, `MatchbookBottomBar` under `lg`
  while height > 500px, `MatchbookLandscapeRail` under `lg` at height ≤ 500px —
  the gate table in `globals.css` under "THE LANDSCAPE NAVIGATION GATE". A
  rotated phone on a console route therefore always has full primary
  navigation, and an audit finding "no navigation element" there is a defect.
- **Focused surfaces are exempt, and the exemption is a design, not a waiver.**
  `variant="focus"` (`/match/*`, `/tools/volleyball-rotations/editor`) ships
  ONE exit control in `MbEventBar` as its entire chrome — shell brief R4, "no
  chrome except one 44px exit control". `variant="public"` (`/session/*`,
  `/summary/*`, `/tools/volleyball-rotations/shared/*`) ships the brand lockup
  linking home and no other navigation — these are the screens the product
  hands to strangers through a link, and the console's private nav must not
  appear on them (shell brief R6). Both shells offer Back only **in portrait**;
  rotating removes nothing, so the landscape band that strips the console's
  bar cannot strip anything here. Measured at 390x844 against 844x390 on all
  15 audited focused-surface runs: identical offering in both orientations —
  0 nav containers and the same 1–2 labelled destinations (`/match/[id]`: the
  event bar's **Back** to the competition or `/`; `/match/guest`: Back to
  `/quick-match`; public routes: **"Tournament Tracker"** → `/`; the completed
  console adds **Match History** → `/summaries`). Extending the rail here
  would ADD private navigation to public screens and spend the console's
  protected vertical/horizontal space on destinations the portrait design
  deliberately withholds.
- **The exemption is conditional.** A focused surface must still show at least
  one visible, **labelled** internal destination — the exit — in every
  orientation. Zero reachable exits in landscape, or an exit with no
  accessible name, is a violation on any shell; the audit keeps counting both.
- A route joins the exemption only by declaring `variant="focus"` or
  `variant="public"` in `MatchbookShell` (the roots in `mbShellVariantFor`).
  `audit.mjs` keys its `FOCUSED_SURFACE_ROOTS` on the same list; the two must
  move together.

---

## 9. Anti-patterns — what must be deleted when converting a screen

The old "playful warm" system. If any of these survive in a converted file, the
conversion is not done.

**Classes to remove (all defined in zone C of `globals.css` — see Trap 2):**

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
- shadcn `<Button>`, `<Card>`, `<Badge>`, `<Input>`, `<Dialog>`, `<Sheet>` —
  replaced by `MbButton`, `<Panel>`, `MbBadge`, `MbTextInput`, `MbDialog`,
  `MbSheet`. `window.confirm` is replaced by `MbConfirm`. Migrate **your own**
  call sites; `src/components/ui/*` itself is deleted by W2 in P4 (charter H7).
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
- [ ] Navy `border-[2px]` badge with a count or a stacked word pair (optional but standard) — the title span is the masthead's only coral.
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
- [ ] Nothing in §4.2 is re-invented. Before writing a control, open `/dev/kit`.
- [ ] Buttons are `MbButton` / `MbButtonLink` / `MbIconButton` (or `.mb-btn` +
      exactly one variant); status is `MbBadge`; inline messages are `MbNotice`;
      confirmations are `MbConfirm`; modals are `MbDialog` / `MbSheet`.
- [ ] Form controls are wrapped in `MbField` — no hand-wired `aria-describedby`.
- [ ] Empty and error states are `PanelEmpty` / `MbEmptyState` with a tone from
      `MB_STATE_TONES`; loading is `MbSkeleton`.
- [ ] All team identities go through `crestForTeam()` / `Crest` / `TeamMark`.
- [ ] All records/form/readiness numbers come from `teamStats.ts`, not local math.
- [ ] Anything branching on competition type reads `formatMeta.ts`.
- [ ] Data shaping lives in a `useMatchbook*`-style hook, not in the component.
- [ ] Durations/easings are `--mb-dur-*` / `--mb-ease-*`; JS motion checks
      `useMbReducedMotion()`.

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
- [ ] `node audit.mjs <route> --desktop` **and** `--mobile` report zero in
      `TOUCH`, `SPACING`, `OVERFLOW`, `NUMERALS`, `A11Y failures`, `CONSOLE` and
      `MOTION` (charter §5.3; the harness lives in the scratchpad `pw/`
      directory — read the docblock at the top of the file first).
- [ ] `GROUPED` read, not skipped. It is informational and does not fail the run,
      but a `tablist (no rule)` or `list-row (no rule)` line means those cells
      abut with nothing drawn between them, which is usually still a defect. What
      the grouping waives is the 8px *separation* floor, nothing else.
- [ ] `A11Y notes` read. `icon-only-no-title` is the §6 tooltip rule; the other
      two are naming smells, not failures.
- [ ] Visually diffed against `src/app/page.tsx` and `src/app/summaries/page.tsx`.

---

## 11. GAP REGISTER

**Ten of the fifteen gaps are now closed.** Each entry below opens with a status
line naming the file that closed it; the body underneath is the original
proposal, kept because it records *why* the thing looks the way it does — where
the built thing diverges from the proposal, the status line says so and the
built thing wins.

Status key: **CLOSED** · **PARTIAL** (some of it shipped, the rest has a named
owner) · **OPEN** (nothing built).

| GAP | Status | Closed by |
| --- | --- | --- |
| 1 dialogs / modals | **CLOSED** | `Dialog.tsx`, `Sheet.tsx`, `Confirm.tsx` + `.mb-dialog*` |
| 2 toast | **PARTIAL** | `.mb-toast` CSS only — component is W2/P2b |
| 3 bottom nav + safe area | **PARTIAL** | safe-area tokens + `.mb-safe-*` — bar is W2/P2a |
| 4 badge / chip | **CLOSED** | `Badge.tsx` + `.mb-badge` |
| 5 tabs / segmented | **CLOSED** | `Tabs.tsx`, `Segmented.tsx` + `.mb-tabs`, `.mb-segmented` |
| 6 form controls | **CLOSED** | `form.tsx`, `SelectList.tsx`, `ReorderList.tsx` + `.mb-field` family |
| 7 live-scoring primitives | **PARTIAL** | `ScoreNumeral.tsx`, `ScoreboardHero.tsx`, `ActionBar.tsx`, `.mb-console*` — tap columns are W5/P3a |
| 8 loading / skeleton | **PARTIAL** | `Skeleton.tsx` + `.mb-skeleton` — `MbPageLoading` is W2/P2b |
| 9 masthead / stat / chip | **PARTIAL** | `Stat.tsx` — masthead, account chip, panel foot are W2/P2a |
| 10 utility classes | **CLOSED** | `.mb-row-hover`, `.mb-rail`, `.mb-tile`, `.mb-icon-disc`, `.mb-meter` |
| 11 motion tokens | **CLOSED** | `--mb-dur-*`, `--mb-ease-*`, `--mb-stagger`, `.mb-enter`, `.mb-stagger-*` |
| 12 focus-visible | **CLOSED** | `--mb-focus` + `.matchbook-surface :focus-visible` |
| 13 raw literals → tokens | **CLOSED** | the `--mb-tint-*` / `--mb-band` / `--mb-panel-shadow` / `--mb-gold-ink` set |
| 14 touch + coral contrast | **PARTIAL** | contrast closed by `--mb-coral-deep`; the blanket touch floor is written but unarmed |
| 15 dark / print / public | **PARTIAL** | print closed by `@media print`; dark is dropped, public shell is W6/P3b |

Rules unchanged: do **not** invent a token or class to fill a remaining hole —
build it in `globals.css` / `src/components/matchbook/`, and update this
document in the same commit.

### GAP-1 — Dialogs and modals have no Matchbook skin
> **CLOSED — `src/components/matchbook/Dialog.tsx` (`MbDialog`, `MbDialogBody`,
> `MbDialogFooter`, `useMbFocusRestore`), `Sheet.tsx` (`MbSheet`), `Confirm.tsx`
> (`MbConfirm`), plus `.mb-dialog`, `.mb-dialog-overlay`, `.mb-dialog-head`,
> `.mb-dialog-body`, `.mb-dialog-foot`, `.mb-sheet` in `globals.css`. The
> `close` sprite id exists.**
>
> **Two claims in the body below are now false.**
> `DeleteConfirmDialog` no longer renders a shadcn `<Button>` with `rounded-xl`
> and a heroicon: `src/components/shared/DeleteConfirmDialog.tsx` is a ~20-line
> adapter over `MbConfirm` that keeps its five call sites' props unchanged. And
> the modal is no longer "the loudest visual regression in the app".
>
> Two things the proposal did not anticipate, both now load-bearing:
> `useMbFocusRestore` exists because Radix silently drops focus restoration for
> a *controlled* (triggerless) dialog and lands focus on `<body>` on every
> close; and `MbDialogFooter` stretches its buttons to full width below `sm`, so
> the primary action lands in the thumb zone.
>
> Still open: `src/components/ui/dialog.tsx` and `ui/sheet.tsx` themselves are
> untouched by design (charter H7 — nobody restyles them; each workstream
> migrates its own call sites, W2 deletes the originals in P4).

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
> **PARTIAL — the CSS shipped, the component did not.** `.mb-toast` and its four
> `[data-tone]` variants are in `globals.css` (and `.mb-toast :focus-visible`
> is covered by the GAP-12 rule, because a toast portals outside
> `.matchbook-surface`). There is **no `MbToast`, no `useToast`, no `ToastHost`**
> — do not import them. Owner: **W2 / P2b** (charter §2, `Toast.tsx`).
> `UndoToast.tsx` and `GlobalUndoToast.tsx` are still old-theme + framer-motion.
>
> For an inline, non-transient message today, use `MbNotice` (`.mb-banner`) —
> same 4px-left-rule vocabulary, no host required.

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
> **PARTIAL.** The safe-area half is closed: `--mb-safe-top` / `--mb-safe-bottom`
> (`env(safe-area-inset-*, 0px)`) and the `.mb-safe-top` / `.mb-safe-bottom`
> utilities are in `globals.css`, and `MbActionBar` and `.mb-action-bar` already
> consume them — so "nothing in the repo reads `env(safe-area-inset-*)`" is no
> longer true.
>
> Still open: **`MatchbookBottomBar` and `MatchbookTopStrip` do not exist**, and
> `layout.tsx` still omits `viewport-fit: cover`, so the insets resolve to 0 on
> a notched phone today. Those two land together with `data-mb-touch="on"` in
> W2's single P2a commit (charter H6). `MatchbookMobileBar` is still what ships.
> Owner: **W2 / P2a**.

`MatchbookMobileBar` is a top brand bar plus a horizontally scrolling nav strip:
out of thumb reach, sub-44px targets, and it consumes vertical space on every
screen. Nothing in the repo reads `env(safe-area-inset-*)`.

```tsx
<MatchbookBottomBar active="/teams" />   // 5 primary routes + "More"
```
`.mb-bottom-bar`: fixed bottom, paper-bright, `border-top: 1.5px solid navy`,
`padding-bottom: env(safe-area-inset-bottom)`, items `min-h-[44px]`, icon 20 +
`display/badge-label` caption, active = navy ink + coral 3px **top** rule (the
selection mark's tier — shipped ink is navy for HF-6, see `BottomBar.tsx`).
Also add `viewport-fit: cover` to the viewport in `layout.tsx` and a
`.mb-safe-bottom` utility.

### GAP-4 — No badge / chip / pill primitive
> **CLOSED — `src/components/matchbook/Badge.tsx` (`MbBadge`) + `.mb-badge` in
> `globals.css`.** Two corrections to the proposal below, both from measurement:
> the tone list grew to nine (`live draft final win loss neutral teal guest
> warn`), and **each tone draws a different mark shape**, not the same square in
> a different hue — nine identical squares is still information carried by
> colour alone, whatever the hex values are. The letterforms stay navy. See §5.6
> for the shipped API.

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
> **CLOSED — and it turned out to be two components, not one.**
> `Tabs.tsx` (`MbTabs`, `.mb-tabs` / `.mb-tab`) switches which **view** is
> shown; `Segmented.tsx` (`MbSegmented`, `.mb-segmented`) picks a **value**
> (charter Appendix A, D-3). Both are hand-rolled with roving tabindex —
> `@radix-ui/react-tabs` is deleted in P4.
>
> Two shipped details worth copying: `.mb-tabs` is a horizontal scroller whose
> overflowing edges grow a 1.5px navy hairline (`.mb-rule-vertical`) rather than
> a gradient fade, which invariant 24 forbids; and `MbTabs` keeps the active tab
> in view by writing `rail.scrollLeft` and never `scrollIntoView`, because
> `scrollIntoView` walks every scrollable ancestor and BODY is the document
> scroller here — the old call opened `/dev/kit` 709px down on desktop and
> 3300px down on mobile with no user action.

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
> **CLOSED — `src/components/matchbook/form.tsx`** (`MbField`, `MbTextInput`,
> `MbTextArea`, `MbSelect`, `MbNumberStepper`, `MbToggle`, `MbToggleChip`,
> `MbSwatchPicker`, `MB_SWATCH_PALETTE`, `MbTagInput`), plus `SelectList.tsx`
> and `ReorderList.tsx` for list-shaped input, backed by `.mb-field`,
> `.mb-field-hint`, `.mb-field-error`, `.mb-textarea`, `.mb-check`, `.mb-radio`,
> `.mb-switch`, `.mb-stepper`, `.mb-swatch`, `.mb-segmented`.
>
> **Correction to the sketch below: `.mb-radio` is not a circle.** It is a
> squared ballot box carrying an inset coral mark, because §3.3 reserves 999px
> for the live dot, the account disc, icon discs and colour swatches. Everything
> else landed as written; `MbField` additionally publishes `id` /
> `aria-describedby` / `aria-invalid` / `required` through context, so no call
> site restates them. Two items the sketch missed and that now exist:
> `MbToggleChip` (a pressed filter, not a switch) and `MbTagInput`.
>
> Date/time input and slider were **not** built and are not needed by any
> converted screen. If a screen needs one, it is a new gap — raise it here first.

Existing: `.mb-input`, `.mb-search`, `.mb-select-native`. Missing entirely:
textarea, checkbox, radio, switch/toggle, number stepper, slider, colour picker,
date/time input, and a label/hint/error triad. The create-competition wizard and
team form need all of them.

```
.mb-field            wrapper: .mb-kicker label + control + .mb-field-hint / .mb-field-error
.mb-textarea         .mb-input geometry, min-height 5rem, resize-y
.mb-check            14×14, 1.5px navy, radius 2px, navy fill + paper-bright check when on
.mb-radio            14×14 squared box, navy ring, navy mark (shipped inked, not coral)
.mb-switch           28×16 track, square-ish (radius 2px), navy off / navy on
.mb-stepper          [−] [display/stat-md tabular-nums] [+], each button 44×44
.mb-swatch           24×24, 1.5px navy border, radius 2px  (replaces the inline swatch in TeamProfilePanel)
```
All controls `min-height: 44px` on coarse pointers. Error state = `border-color:
var(--mb-red)` plus `.mb-field-error` text using the existing inline-error recipe.

### GAP-7 — No live-scoring primitives
> **PARTIAL — the pieces exist, the tap columns do not.** Shipped:
> `ScoreNumeral.tsx` (`MbScoreNumeral`, with the `display/score-2xl` step baked
> as `.mb-numeral--court` and a `--console` step besides), `ScoreboardHero.tsx`
> (`MbScoreboardHero` — the `1fr auto 1fr` grid), `ActionBar.tsx`
> (`MbActionBar` — the undo/commit rail), `FinalStamp.tsx`, `LiveStatus.tsx`,
> and the `.mb-console` / `.mb-console-column` / `.mb-notch-coral` CSS with
> press-as-tint already in it.
>
> Still open: **`MbScoreSide`, `MbSetStrip` and `useCourtView`** — the full-bleed
> team-side tap target and the set strip. Owner: **W5 / P3a** (`ScoreSide.tsx`).
> Serve indicator and undo affordance ride with them.

`/match/[id]`, `/match/guest`, `/session/[shareCode]` are the highest-traffic
screens and the system has nothing for them: no full-bleed team-side tap target, no
giant score numeral, no set-score strip, no serve indicator, no undo affordance.

```tsx
<MbScoreSide team={team} score={n} side="home" | "away"
             serving onScore={…} onUndo={…} />
<MbSetStrip sets={[{home,away}, …]} current={2} />
```
`.mb-score-side`: paper-bright, 1.5px navy divider between sides, score at
**`display/score-fit`** (`min(100cqh, 58cqw, 16rem)`, 700, `tabular-nums`) —
`display/score-2xl` remains the `size="court"` default but is overridden here,
because a viewport-sized numeral inside a column-sized box is what clipped the
score off the console at 320. Crest + `display/stat-md` name above, stepping to
`display/stat-sm` once the column itself is short. Full height, `select-none`,
press feedback = tint not scale. **Which way things lie down** is the viewport's
landscape query; **what the column can afford** (its foot, its crest step, its
name step) is a container query on the column's own box — the two are different
quantities and `ScoreSide.tsx` keeps them apart.

### GAP-8 — Loading and skeleton states are still old-theme
> **PARTIAL.** `Skeleton.tsx` (`MbSkeleton`) + `.mb-skeleton` shipped —
> `rgba(7,50,77,0.08)`, radius 2px, **no shimmer**, because a shimmer is a
> gradient. Use it sized to the geometry it stands in for.
>
> Still open: **`MbPageLoading` does not exist**, so `PageLoadingSpinner` still
> flashes the legacy `<Navigation />` on every gated Matchbook route before
> content mounts. That is the visible half of this bug and it is unfixed.
> Owner: **W2 / P2b** (`Loading.tsx`).

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
> **PARTIAL — one of the four is built.** `Stat.tsx` (`MbStat`) shipped and is
> the replacement for `StatusStat` / `SummaryStat` / `ProfileStat`.
>
> Still open and still copy-pasted: **`MatchbookMasthead`** (and its navy
> sibling `MbEventBar` — charter Appendix A D-5 splits the editorial masthead
> from the navy event strip rather than making one component with five
> variants), **`MbAccountChip`**, **`MbPanelFoot`**. Owner: **W2 / P2a**.

The masthead is copy-pasted across 6 files, the account chip across 5, the panel
footer link across 5, and three near-identical stat tiles exist under three names
(`StatusStat`, `SummaryStat`, `ProfileStat`).

```tsx
<MatchbookMasthead
  title={<>Match <span className="text-mb-coral">Archive</span></>}
  badge={{ value: total, label: "Results" }}          // or {lines:["Live","Now"]}
  dateLine={data.dateLine} subLine={`${n} matches completed`}
  actions={[{ label:"Export CSV", icon:"export", variant:"navy", onClick }]} />

<MbStat icon="check" label="Matches Completed" value="12 / 20" sub="60%" size="sm" | "md" />
<MbPanelFoot href="/summaries" label="View Full Match History" />
<MbAccountChip />
```

### GAP-10 — No utility classes for the four most-copied inline recipes
> **CLOSED — all five exist in `globals.css`**, exactly as sketched:
> `.mb-row-hover`, `.mb-rail` (`--mb-rail-color`, default coral), `.mb-tile`,
> `.mb-icon-disc`, `.mb-meter` (+ `.mb-meter > span` for the fill; `MbMeter`
> wraps it).
>
> The classes exist; **the old call sites have not all been migrated.** §4.3
> still documents the literal recipes because you will read them in
> un-converted files. In new code, write the class.

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
> **CLOSED — every token below is in `globals.css` `:root`**, plus `.mb-enter`
> (`@keyframes mb-enter`, opacity + 6px rise at `--mb-dur-slow` /
> `--mb-ease-out`) and `.mb-stagger-1` … `.mb-stagger-6`. §7.2 is now
> enforceable and has been rewritten as shipped fact. `useMbReducedMotion.ts`
> is the JS half.

§7.2 is unenforceable until these exist:
```css
--mb-dur-fast: 120ms; --mb-dur-base: 180ms; --mb-dur-slow: 280ms;
--mb-ease-out: cubic-bezier(.2,.8,.3,1); --mb-ease-in-out: cubic-bezier(.4,0,.2,1);
--mb-stagger: 40ms;
```
Plus `.mb-enter` (opacity + 6px rise at `--mb-dur-slow --mb-ease-out`) and
`.mb-stagger-{1..6}` replacing the legacy `.stagger-*`.

### GAP-12 — Focus-visible is still the legacy red
> **CLOSED — `--mb-focus` plus
> `.matchbook-surface :focus-visible { outline: 2px solid var(--mb-focus);
> outline-offset: 2px }`.** The token shipped as coral and was later re-inked
> **navy** (the coral ring collided with the selection rail — see the coral job
> list in `globals.css`); navy grounds re-point it to `--mb-paper-bright`.
> The proposal was extended: the same rule also covers
> `.mb-dialog`, `.mb-sheet` and `.mb-toast`, because those portal **outside**
> `.matchbook-surface` and would otherwise inherit the legacy red ring. The
> legacy global rule is untouched and stays scoped to legacy screens.

`globals.css` sets a global `outline: 2px solid oklch(0.55 0.22 25)` — the old
primary red, which reads as an off-brand near-coral on paper. Only
`.mb-select-native` opts into a Matchbook focus ring (`outline: 2px solid
var(--mb-coral); outline-offset: 1px`).
Proposal: `--mb-focus: var(--mb-coral)` and a Matchbook-scoped
`.matchbook-surface :focus-visible { outline: 2px solid var(--mb-focus); outline-offset: 2px; }`
so the legacy rule stays scoped to legacy screens.

### GAP-13 — Raw rgba/hex literals with no token
> **CLOSED — every token below shipped, and the set grew.** See the table in
> §1.1 for the complete list; the additions beyond this proposal are
> `--mb-tint-coral`, the four rule-weight tokens (`--mb-rule-hairline`/`-edge`/
> `-accent`/`-anchor`), `--mb-focus`, the motion set, the safe-area set and the
> court set. `--mb-gold-ink` landed at `#8a5c00` and **measures 5.13:1 on paper
> / 5.59:1 on paper-bright**, clearing the 4.5:1 target, so "Draft" is readable
> text on paper rather than border-only.
>
> Same caveat as GAP-10: the tokens exist, the un-converted call sites still
> carry literals. New code uses the token.

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
> **The contrast half is CLOSED; the touch half is PARTIAL.**
>
> Contrast: the decision was **darken the fill**, not restrict the size.
> `--mb-coral-deep: #c9351f` measures **5.23:1 with white** (it was 3.69:1, not
> the 3.62:1 written below) and is now the fill of `.mb-btn-coral`, the ink and
> frame of `.mb-btn-outline`, `.mb-panel-link:hover` and `.mb-stamp-final`.
> `--mb-coral` keeps every accent, rule and rail. Applied everywhere, once.
>
> Touch: `.mb-btn-lg` and `.mb-btn-touch` shipped unconditionally, and every P1
> primitive meets 44px on its own (tab, segment, stepper button, select row,
> `MbIconButton`). The blanket
> `@media (pointer: coarse) { [data-mb-touch="on"] … { min-height: 44px } }`
> rule is **written but not armed** — it waits on `data-mb-touch="on"` on
> `<html>`, which W2 sets in the same P2a commit that drops `maximumScale` and
> adds `viewport-fit: cover` (charter H6). Until then the base `.mb-btn` is
> 38.8px and `.mb-panel-link` 17.3px at 390×844. Owner: **W2 / P2a**.

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
> **Two of the three are decided; one is still open.**
>
> 1. **Dark mode — DECIDED: dropped.** Matchbook is light-only; `ThemeToggle`
>    and `ThemeContext` are deleted in P4 (charter Appendix A). Do not build a
>    `--mb-*` dark set. Not a gap any more, a standing decision.
> 2. **Print — CLOSED.** `@media print` in `globals.css` re-points the palette
>    tokens (paper and bright → `#ffffff`, navy → `#000000`, tints off, shadow
>    none), so the whole system prints black-on-white without any component
>    restating a colour. Give a new surface a token background and it prints
>    correctly for free.
> 3. **Public surfaces — STILL OPEN.** `/session/[shareCode]` and
>    `/summary/[shareCode]` still have no documented chrome-less shell. Owner:
>    **W6 / P3b**, gated on W4. The proposal below stands.

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
