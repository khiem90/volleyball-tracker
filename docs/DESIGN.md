# Matchbook Design System

Tournament Tracker's visual system: a vintage sports-almanac / matchbook print
aesthetic — cream paper, navy ink, one coral accent, condensed uppercase display
type, hairline rules, boxed panels. Flat, printed, rectangular. No glass, no
gradients, no pills, no drop shadows on text, no emoji.

Where things live:

- **Tokens + utility classes:** the Matchbook block at the top of `src/app/globals.css`.
- **Components:** `src/components/matchbook/` (no barrel — import from the file).
- **Assets:** `public/assets/matchbook/` (sprite icons, crests, textures).

---

## 1. Palette

Declared in the first `:root` of `globals.css`, exposed to Tailwind via
`@theme inline` (`bg-mb-*`, `text-mb-*`, `border-mb-*`, …).

| Token | Hex | Job | Never for |
| --- | --- | --- | --- |
| `--mb-paper` | `#f7f0e4` | Page stock (`.matchbook-surface` only). | Panel interiors. |
| `--mb-paper-bright` | `#fffaf1` | Everything *on* the stock: panel bodies, inputs, score boxes; ink on navy. | The page background. |
| `--mb-navy` | `#07324d` | The ink: default text, structural borders, primary-button fill. | Secondary body copy (`--mb-ink-muted`). |
| `--mb-coral` | `#ee4b34` | The accent — rules, frames, rails, the masthead word. | Small text on paper (3.26:1); status semantics. |
| `--mb-coral-deep` | `#c9351f` | Coral as **fill or small ink** (button fill, coral letterforms <18.66px). 5.23:1 with white. | Ink on navy (2.55:1). |
| `--mb-teal` | `#148f89` | Rank-#1 rail, "Shared" markers. | Success (that's green). |
| `--mb-gold` | `#e6a01f` | Icons on navy, Draft fills, mid readiness. | **Text on paper — fails at any size (1.97:1).** |
| `--mb-gold-ink` | `#8a5c00` | Gold that is legible on paper (Draft/warn badge ink and rule). | — |
| `--mb-plum` | `#5a347d` | Fourth accent in the results rail cycle; guest badge. | Interactive elements. |
| `--mb-green` | `#16885f` | Win / Final / ACTIVE / high readiness. | Buttons (there is no green button). |
| `--mb-green-ink` | `#137a54` | Green as small ink (e.g. `.mb-stamp-final`). | — |
| `--mb-red` | `#cf3f32` | Loss / LIVE / error / destructive / low readiness. | Primary CTAs; never adjacent to coral. |
| `--mb-ink-muted` | `#5d6c70` | Secondary copy, kickers, placeholders, table heads. | Text on navy (2.44:1). |
| `--mb-rule` | `rgba(7,50,77,0.28)` | Hairline dividers. | Panel outer borders (those are solid navy). |

Supporting tokens (use the token, never the literal): tints `--mb-tint-1/2/3`,
`--mb-tint-coral`, `--mb-band`; on-navy `--mb-rule-on-navy`, `--mb-tint-on-navy`;
`--mb-panel-shadow` (the only shadow); rule weights `--mb-rule-hairline/-edge`
(both 1px — hierarchy is carried by *colour*, translucent vs solid) /
`-accent` (3px) / `-anchor` (4px); `--mb-focus` (navy — the focus ring is never
coral); motion `--mb-dur-fast/base/slow` (120/180/280ms), `--mb-ease-out`,
`--mb-ease-in-out`, `--mb-stagger` (40ms); safe-area `--mb-safe-top/bottom`;
court `--mb-court-*`; `--mb-display-font`.

**Fixed semantics** (never invent a new mapping): Live → red (+ dot + the word);
Draft → gold (on navy or border only); Final/Win/ACTIVE → green; Loss → red;
readiness ≥85 green / ≥65 gold / <65 red; rank-#1 rail → teal;
selected/current → coral.

**Coral does exactly three jobs** (closed list; `--mb-coral` + `--mb-coral-deep`
count as one hue):

1. **The primary action** — `.mb-btn-coral` fill (`--mb-coral-deep`), one per screen.
2. **The selection mark** — active nav rail, tab underline, selected-row rail,
   current-step ring (one meaning, several orientations). The scoring console's
   `.mb-notch-coral` lead edge is the one scoped extension.
3. **The masthead lockup** — the emphasised title word (≥36px, `--mb-coral`) and
   the wordmark's "Tracker" line (`--mb-coral-deep`).

Deliberately NOT coral: the masthead count badge (navy, 2px frame), live rails
(red), schedule/timeline spines (solid navy), check/radio/switch ON (navy),
format and bracket colour keys.

**Contrast rules:** body text on paper is `text-mb-navy` (AAA) or
`text-mb-ink-muted` (AA). Text on navy is `text-mb-paper-bright` or white; icons
on navy `text-mb-gold`. Coral/teal/green/red as text on paper only at
≥18.66px/700 or ≥24px — new status text below that is navy/ink-muted with colour
on an adjacent mark. Never plum/ink-muted/red text on navy. Colour is never the
only signal.

**Light-only.** No `dark:` variants, no theme toggle. `@media print` re-points
the palette tokens to black-on-white — give every surface a token background and
printing is free.

## 2. Typography

Two families, loaded in `src/app/layout.tsx`: **Oswald** (display — always
uppercase, always letterspaced, reached via `.matchbook-display` or a class that
includes it; 700 is the heaviest weight that exists) and **Outfit** (body,
sentence case). Uppercase is a style — write `Live` in JSX, let CSS uppercase it.

**Display steps** (Oswald, all 700 unless noted; never invent a size between steps):

| Step | Size | Ships as |
| --- | --- | --- |
| `display/masthead` | `text-4xl sm:text-5xl`, `mb-track-masthead`, `leading-none` | the one `<h1>` per screen |
| `display/score-fit` | `min(100cqh, 58cqw, 16rem)` on a `container-type: size` box | scoring console (`ScoreSide.tsx`) |
| `display/score-xl` / `-lg` | `text-6xl` / `text-5xl` `tabular-nums` | scoreboard preview / hero scores |
| `display/stat-xl` / `-lg` / `-md` / `-sm` | `text-4xl` / `text-3xl` / `text-2xl` / `text-[1.2rem]`, `leading-none`, `tabular-nums` | stat values, badge counts |
| `display/panel-title` | `0.95rem`, `mb-track-title` | `<Panel>` headers (baked) |
| `display/row-title` | `0.78–0.9rem` | list row primary label |
| `display/team-mark` | `0.82rem`/600 | baked into `TeamMark` |
| `display/button` / `nav` / `link` | `0.8` / `0.85` / `0.72rem`, 600 | baked into `.mb-btn` / `.mb-nav-item` / `.mb-panel-link` |
| `display/meta` / `table-head` / `status` | `0.74` / `0.66` / `0.66rem` | dateline, `.mb-table th`, status words |
| `display/kicker` / `badge-label` | `0.62rem`/600 / `0.6rem`/700 | `.mb-kicker`, badge caption |

**Body steps** (Outfit): `body/md` 0.9rem (inputs) · `body/sm` 0.85rem (cells,
paragraphs) · `body/xs` 0.78rem · `body/2xs` 0.72rem · `body/3xs` 0.66rem ·
`body/input-floor` — every text input is `1rem` below `md` (`text-base!
md:text-[0.9rem]!`), the iOS anti-zoom floor, on the four input classes only.

**The ramp is width-invariant below the masthead — on purpose.** Do not add
`sm:`/`lg:` size variants to body or data steps; a screen that needs room at 390
changes its layout, never its type ramp. Every truncation floor is measured
against today's sizes.

**The 12 tracking roles** — one token (`--mb-track-*`) + one utility
(`.mb-track-*`) each. Write the class, never a `tracking-[…]` literal. A (size,
weight) pair gets exactly one rung; a role keeps its tracking across its cuts.

| Role | em | Intent |
| --- | --- | --- |
| `masthead` | 0.01 | The title lockup — the biggest voice is the tightest. |
| `display` | 0.02 | Base display voice (`.matchbook-display` default): row titles, team marks, stats. |
| `link` | 0.04 | The quiet verb — a 0.72rem label that stays a word. |
| `title` | 0.05 | The label that names a container. |
| `button` | 0.06 | The imperative, at every cut. |
| `nav` | 0.08 | Wayfinding — labels a reader scans for. |
| `status` | 0.1 | The state word and the meta line, read at a glance. |
| `head` | 0.12 | The columnar head ruling the strip under it. |
| `kicker` | 0.16 | The eyebrow — labels, never read as prose. |
| `code` | 0.18 | The share code — glyphs transcribed one at a time. |
| `badge` | 0.22 | The stamp — single caption words as engraving. |
| `numeral` | normal | Figures and marks — tracking pads after the last glyph and pushes a centred figure off centre; a number is not a word. |

**`tabular-nums` is mandatory** on any number that changes over time, sits in a
column, or is compared to another number: scores, standings, stats, records,
percentages, times. The score separator is an en dash `–` with spaces.

## 3. Controls, radii, borders, spacing

**Control ladder `{44, 48, 56}`** — `MB_CONTROL_HEIGHT` in `Button.tsx`.
Composites' interior cells measure the rung itself: the frame's block edges are
paint, not layout (negative-block-margin idiom / inset outline — see G21 in
`globals.css`). Two rules keep rows on it:

- **The divider charge:** `min-height` is a border-box floor, so a row whose
  content + padding sums to exactly its rung is tipped off it by `divide-y`'s
  1px. Fix: drop block padding a step (`py-1.5`) so `min-height` absorbs the rule.
- **The floor is unlayered:** `.mb-btn-touch { min-height: 44px }` beats any
  Tailwind `min-h-*`. A rung above the floor is stated inline
  (`style={{ minHeight: 48 }}`).

**Named exemptions** (not control heights): invisible hit-extension geometry
(`MbPlayerToken`'s ≥52px transparent hit disc, `.mb-panel-link`'s 44×44
`::after` pad); letterform links (`.mb-panel-link`'s visible box is its ink);
content rows and tiles that meet the 44px floor and grow with their data
(`textarea` is the one control honestly off the ladder); the sidebar wordmark
lockup.

**Radii:** `4px` (panels, buttons, inputs, dialogs) · `3px` (score/seed boxes,
code chips) · `2px` (form squares, checks, radios, switches, skeletons, stamps) ·
`999px` reserved for the live dot, the account disc, icon discs, and colour
swatches only. `.mb-radio` is a squared ballot box, not a circle. Anything
≥ `rounded-lg` is an anti-pattern.

**Borders:** hairline = 1px translucent `--mb-rule`; real edge = the
`border-[1.5px] border-mb-navy` idiom (renders 1px — Chrome floors 1.5px; keep
writing the idiom, the hierarchy is carried by colour); accent rail 3px; anchor
edge (panel/dialog top, banner/toast left) 4px; the masthead count badge's
`border-[2px]` is the system's only 2px border and the only place weight carries
meaning.

**Spacing (the complete set):** grid gap `gap-4`; masthead → grid `mb-5`; main
padding `px-4 py-5 sm:px-6 lg:px-8`; panel body `p-4`/`p-5` or list rows
`px-3 py-2`(±); inline icon↔text `gap-1.5`–`gap-3`; a line and its caption
`gap-1`; form squares `gap-[3px]`; `.mb-segmented`'s 1px gap is a drawn rule,
not a spacing step.

## 4. Layout

**Shell:** every route renders `MatchbookShell` (`AppShell.tsx`). Three variants,
derived from the pathname by `mbShellVariantFor`:

- `console` — sidebar (`lg`+) / bottom bar (below `lg`) / landscape rail
  (below `lg`, height ≤500px): exactly one nav visible at any size. All
  authenticated screens.
- `focus` — no chrome except one 44px exit control in `MbEventBar`
  (`/match/*`, rotation editor).
- `public` — brand lockup linking home, no private nav, centred `max-w-[1100px]`
  (the one sanctioned `max-w` container) — `/session/*`, `/summary/*`, shared
  rotations.

`matchbook-surface` appears exactly once, on the outermost element. The content
column needs `min-w-0` or every `truncate` inside stops working.

**Grid:** `grid grid-cols-1 gap-4 xl:grid-cols-12` (add `md:grid-cols-2` only
with ≥6 panels). Allowed spans: **7/5**, **4/4/4**, **12**, 7 + 5-stacked.
Order grid children by mobile priority — below `xl` they stack in DOM order.

**Panel anatomy** (`<Panel>` / `.mb-panel`): 4px navy top border, 1px solid navy
edge, radius 4px, the one shadow, paper-bright body, `flex-col h-100%`. Head is
paper tone (hairline underline) for data panels or `tone="navy"` for summary/hero
panels (max 1–2 per screen; head icon goes gold). Head right slot: action link
*or* meta, never both. Empty panels render `<PanelEmpty>`; bottom-anchored
content takes `mt-auto`.

**The 46px lattice:** the Overview dashboard's bands align cross-panel on shared
row pitches — e.g. the readiness table's `<tr>`s are pinned to `h-[46px]` and
Recent Results rows to two units (92px) from a shared origin, so rules in
neighbouring panels tick on the same y. `<tr>` height is a CSS minimum, so a
taller future cell degrades the lattice instead of clipping. If you change row
padding in one of a paired band's panels, re-check its partner.

## 5. Non-negotiables

- `tabular-nums` on every score, stat, percentage, record, time, table measure.
- Every interactive target measures 44/48/56 (or meets the 44px floor, §3).
- No hardcoded colours — every colour is a `--mb-*` token or Tailwind `mb-*` utility.
- Skeletons (`MbSkeleton`) are sized to the final geometry they replace — no
  shimmer, no spinner; boot gates render the real layout's skeleton, not a blank.
- **0-reflow scores:** a score box never changes size between values —
  `MbScoreNumeral` reserves its digit width and cross-fades; 99→100 moves nothing.
- **8-char painted-name floor:** at 320/375 every painted team name shows ≥8
  characters and two long names stay distinguishable; `MbTeamName` pins the last
  token. Never let a flex/grid track's implicit min-content floor break this —
  see §6.
- Empty-state budget: at most one equal-weight state headline per screen; empty
  states use `PanelEmpty`/`MbEmptyState` with a tone from `MB_STATE_TONES`,
  copy shaped "No <things> exist yet — <what makes them appear>."; filtered-to-
  nothing gets no action.
- Status survives greyscale: `MbBadge`'s nine tones each draw a different mark
  shape; letterforms stay navy; colour is never the only signal; the live dot
  always ships with the word "Live".
- Reduced motion: the global clamp handles CSS; any JS-driven motion also checks
  `useMbReducedMotion()` and renders the end state. No springs, no bounce; the
  keyframe set is `mb-pulse`, `mb-enter`, `mb-fade`, `mb-sheet-up`.
- One `<h1>` per screen, two-tone with exactly one coral element.
- Icons come from the sprite via `MbIcon` only — no lucide/heroicons, no emoji.
- Horizontal scroll only on a `.mb-table` wrapper (`overflow-x-auto`), bracket
  rails, and the mobile nav strip; the page body never scrolls horizontally.
- Client-rendered `new Date()` strings carry `suppressHydrationWarning`.
- Before writing a new control, check `src/components/matchbook/` — nothing in
  the kit gets re-invented, and new tokens/classes go in `globals.css` + this
  document.

## 6. Engineering traps

- **Unlayered CSS beats Tailwind utilities.** The `mb-*` classes declare
  `font-size`, `letter-spacing`, and `min-height` outside every cascade layer,
  so a `text-[…]`/`tracking-*`/`min-h-*` utility beside one is silently dead —
  delete it, don't "fix" it. Only an inline `style` (or `!`) outranks them.
- **`sr-only` needs an inset.** Tailwind's `.sr-only` is `position: absolute`
  with no inset, so the box keeps its static position — inside a wide table that
  can be past the viewport edge, silently widening the document.
  `globals.css` pins `[class*="sr-only"]` boxes with `inset-inline-start: 0`
  (unlayered, by attribute so variant forms like `max-sm:sr-only` are covered).
  Don't remove that rule; don't hand-roll a new sr-only.
- **`1fr` means `minmax(auto, 1fr)`.** A grid track's implicit `auto` minimum
  lets content set a floor and defeats `truncate`; write `minmax(0, 1fr)` so the
  pair is sized by the track, not the track by the pair. Same for flex: every
  text-bearing flex/grid child needs `min-w-0`.
- **Keep a tab in view with `scrollLeft`, never `scrollIntoView`** —
  `scrollIntoView` walks every scrollable ancestor including the document
  scroller and opens the page mid-scroll (`MbTabs` has the fix).
- **Framed fields use the negative-block-margin idiom** (G21 in `globals.css`):
  the frame carries the rung, the stretched `<input>` gets `-1px` block margins
  so its hit box is the frame edge-to-edge — never re-derive interior heights.
