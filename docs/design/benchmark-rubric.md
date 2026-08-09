# Matchbook Benchmark Rubric

**Purpose.** This is the scoring instrument every redesigned screen in Tournament Tracker is judged against.
It exists because the stated bar is *"utterly perfect, visually stunning, senior-designer level, must feel like
an award-winning sports app."* That sentence is unfalsifiable, so this document converts it into anchored,
observable criteria that a critic can apply without negotiating.

**The critic's default posture is rejection.** A screen is assumed to fail until each dimension has been
individually argued to 8+. "Looks fine" is not a score. "Nothing obviously wrong" is a 6.

---

## 1. Reference products — and the one thing to steal from each

These are real, shipped products. Each entry names a single technique to lift, not a vibe to admire.

### 1. Apple Sports (Apple, iOS)
Steal: **score numerals rendered with the variable-font width and weight axes pushed simultaneously** —
bold weight, compressed width — so a two-digit and three-digit score occupy comparable optical mass and never
reflow the row. Lickability's teardown noted it as the first time Apple shipped a genuinely dense first-party
data grid, and that the grid survives Dynamic Type by *wrapping headers instead of truncating them*.
Our scoreboxes must do the same thing: the number is the loudest object in its row, and growing the text size
must never truncate a column label.

### 2. The Athletic (identity by Gretel, custom inline face by A2 Type)
Steal: **brand carried purely by type.** Gretel/A2 built a custom inline cut derived from the wordmark, so any
surface reads as The Athletic with zero logo present. Their palette is deliberately neutral warm grays *so that
team colors can be dropped in without clashing*. Matchbook has the same structural problem — arbitrary team
colors entering a fixed navy/coral system — and the same answer: the chrome stays neutral, type does the branding,
team color is a guest that only appears in small, contained marks.

### 3. FotMob (live match center)
Steal: **the live match center's speed-first information order.** Reviewers consistently rank it above SofaScore
and FlashScore not for having more data but for surfacing the *state-changing* data first — score, clock, last
event — with momentum graphs, xG and heatmaps strictly below the fold. Our `/match/[id]` and `/session/[shareCode]`
screens must be legible from arm's length in under one second, with analysis demoted, never interleaved.

### 4. WHOOP
Steal: **the three-tier progressive disclosure contract and the three-color semantic lock.** Tier 1 is glanceable
scores, tier 2 is trends, tier 3 is raw biometric graphs — and each tier lives on *its own screen behind a deliberate
tap*, never crammed into the one above. Colors are exactly three (green/yellow/red), each with a fixed meaning
reused everywhere, so users learn the vocabulary once. The hero recovery number renders at roughly 72pt equivalent
so it reads from arm's length. Our standings/bracket/live screens get the same discipline: one question per screen,
one hero number, a locked color vocabulary.

### 5. Formula 1 (rebrand by Wieden+Kennedy London under Richard Turley; display faces by Hingston)
Steal: **a display family cut into role-specific weights rather than one font scaled up and down.** Hingston
delivered Torque 100, Torque 50 and Torque Inline, each cut assigned a specific job in the system, with condensed
letterforms nodding to 1960s–70s motorsport print. Matchbook uses Oswald as its single display face — so the
equivalent discipline is *role-locked steps*: masthead, panel head, kicker, and score each get a fixed
size/weight/tracking combination, and those combinations are never improvised per screen.

### 6. Strava (2025 identity; Boathouse by Grilli Type)
Steal: **the explicit split between brand type and data type.** Strava uses custom Boathouse for wordmark,
campaigns and headlines but deliberately keeps the in-app UI in Inter *because it renders sports data better*.
Their icon system is rebuilt on the same grid and the same 78° angle as the wordmark. This is our exact
`--font-oswald` (display) vs `--font-outfit` (body/data) contract — and the corollary: our `MbIcon` sprite must
share the hairline weight and geometry of the rules and panel borders, not look like a third-party icon set.

### 7. Wimbledon / IBM (digital design system by Class agency)
Steal: **a tokenized system that spans templates and devices, not a set of pretty pages.** The system ships
color, grid, typography, iconography and image-use rules as style *and* code snippets across page templates
and breakpoints, explicitly so the dev team stops re-deciding style and spends time on experience. Test for us:
a new screen should be assemblable almost entirely from `globals.css` `mb-*` utilities and
`src/components/matchbook/*`. Every bespoke one-off class is a debt entry.

### 8. ESPN broadcast scorebugs ("blitz towers", MNF 2023 → CFP → SEC on ABC)
Steal: **the score is persistent and storytelling happens around it.** ESPN's stated intent is to keep the
scoreboard on screen as often as possible and use the left and right side panels for narrative, rather than
covering the score. On a live scoring console that means the score block is sticky/pinned and *never* scrolls
away, is never occluded by a sheet, and never yields its position to a stat panel or a toast.

### 9. Paris 2024 Olympics (identity: Royalties-Ecobranding + W Conran Design; type by jli Type Studio)
Steal: **a constrained icon grammar.** The 62 "blazon" pictograms contain no human figures; every one is built
from exactly three graphical elements — an axis of symmetry, a ground line, and a representation of the sport.
That constraint is why the set reads as a system at any size. Our sprite needs the same kind of written rule
(stroke width, terminal style, optical box, allowed primitives) so icons added later cannot drift.

### 10. Awwwards sports winners — Lacoste "Ace Breaker" (Merci Michel, SOTD 03 Aug 2026), "Podium" (San Rita, Developer Award + SOTD 27 Jun 2026), Cadillac F1 Team (Digitas UK), "WC 2026 — Data Portraits"
Steal: **motion as the reward for an interaction, never as decoration on arrival.** What separates these from
template work is that the transitions are *earned* — a tap, a scrub, a scroll — and each one is authored with
a specific easing and staggered order, not a blanket fade-in-up applied to every child. Also note OneFootball's
Red Dot–recognized rebrand: the win was cited for a coherent system with high recognition value, not for effects.

---

## 2. The rubric — 10 dimensions, 0–10 each, 100 total

Score each dimension independently. Anchors are written so that **8 is the pass line**, 10 is "this could be
published as a case study", and 5 is "competent, unremarkable, ships at most companies."
Anything below 5 needs no anchor — it is broken.

---

### D1. Typographic craft
*Type as the primary carrier of the brand.*

- **5** — Oswald is used for headings and Outfit for body. Sizes are picked ad hoc per screen. Tracking left at
  browser default on uppercase display type. Some headings are sentence case, some uppercase.
- **8** — A closed type scale is in force: masthead / panel head / kicker / body / caption / numeral, each with a
  fixed size, weight, tracking and line-height taken from the existing Matchbook pages. All uppercase display
  type carries deliberate positive tracking (`0.02em`–`0.16em` per role, matching `matchbook-display` / `mb-kicker`).
  Line length in prose blocks stays 45–75 characters. No orphaned single words on a heading's last line at 375px.
  Numerals use `tabular-nums` everywhere a number can change or be compared.
- **10** — Type alone establishes the whole hierarchy; remove all color and the screen still reads correctly.
  Optical corrections are present, not just mathematical ones: display headings get negative-adjusted leading,
  kickers are optically aligned to the rules they sit above, numerals in a column are visually centered on their
  own width rather than their box. At least one typographic moment on the screen is authored rather than
  defaulted — a stacked masthead, a rule-through-heading, a hung folio, a set of scores that align as a grid.

---

### D2. Spatial rhythm & density
*Sports products are dense. Density without rhythm is noise.*

- **5** — Spacing is Tailwind defaults chosen per element. Gaps between sibling panels vary (gap-3 here, gap-5
  there). Padding inside panels differs between panels of the same type. Lots of dead vertical space, or none at all.
- **8** — All spacing comes from one scale, and the same semantic relationship always gets the same value
  (panel padding, head-to-body gap, row height, grid gutter). Panels sit on a shared grid whose gutters are
  identical at every breakpoint step. Row heights inside tables and lists are uniform, so ten rows read as a
  block, not a stack. Density is *deliberately higher* than a generic SaaS dashboard — this is an almanac page,
  not a marketing site — while still keeping ≥4px optical breathing room around every hairline rule.
- **10** — There is a visible baseline/vertical rhythm across dissimilar panels: the third row of the standings
  panel lines up with the third row of the schedule panel beside it. Density modulates purposefully — the hero
  data block is airier than the reference tables below it, and that contrast is what creates the hierarchy.
  Whitespace is shaped (columns, margins, hung rules), not merely leftover.

---

### D3. Color discipline
*Fewest colors, each with a fixed job.*

- **5** — Uses the Matchbook variables but adds a hue or two for "variety". Semantic colors (green/red) appear
  both as status and as decoration. Some hardcoded hex values sit alongside `var(--mb-*)`.
- **8** — Zero hardcoded colors; everything resolves to `--mb-*` tokens. Coral is reserved for exactly one job
  per screen (the single primary action or the live state) and is not sprayed across secondary elements. Every
  semantic color has one meaning that holds across the whole app: `--mb-green` = win/positive, `--mb-red` =
  loss/live-urgent, `--mb-gold` = leader/first, `--mb-teal`/`--mb-plum` only as categorical team assignment.
  Team colors, if present, appear only inside contained marks (crest chip, form square, seed box) and never as
  panel backgrounds. Cream + navy + hairline rules carry ≥90% of the surface area.
- **10** — Color is load-bearing and could be removed without losing meaning (it is reinforcement, not the only
  channel — see WHOOP's three-color lock). Ink weights are modulated deliberately: full navy for primary data,
  `--mb-ink-muted` for labels, `--mb-rule` for structure, in a consistent three-tier ink hierarchy.
  Any tint/overlay is expressed as an alpha of an existing token, never a new hue.

---

### D4. Data legibility — scores, standings, brackets
*The hardest dimension. This is a scoring app; if the data is not instantly readable nothing else matters.*

- **5** — Scores are readable text at body size. Tables use `mb-table`. Brackets render and are correct but
  require thought to trace. Sorting/ranking is present but not visually emphasized.
- **8** — The score is the largest, heaviest object in its context and is set in tabular figures with a fixed-width
  box, so 7–5 and 21–19 occupy the same footprint and nothing shifts as a live score increments. Winner/loser
  is legible without reading the number (weight, ink, or a rule — not color alone). Standings columns are
  right-aligned for numerics, left for names, with a locked column order and abbreviated uppercase headers.
  Bracket lines are unambiguous: every advancing path is traceable with a fingertip, seeds and byes are explicit,
  and the current round is marked. Nothing important is conveyed only by color or only by position.
- **10** — The screen answers its primary question in under one second at arm's length (WHOOP/Apple Sports test).
  Numbers are aligned into a genuine grid across rows *and* panels. Comparative data is visually comparative —
  form squares, deltas, leader marks — so the user reads relationships, not just values. A dense bracket or
  standings table remains scannable at 375px without hiding data behind an accordion, and a live-updating value
  causes zero reflow of any neighboring element.

---

### D5. Motion & choreography
*Motion is earned feedback, never arrival decoration.*

- **5** — framer-motion fade/slide on mount, one blanket transition applied to everything. Durations left at
  library defaults. Modals appear instantly or with a generic scale.
- **8** — Motion has a written vocabulary: entrance vs. state-change vs. exit, each with a fixed duration band
  (roughly 120–200ms for feedback, 200–320ms for view changes) and a consistent easing. Only `transform` and
  `opacity` are animated so work stays on the compositor thread. Lists stagger in a deliberate order with a small
  offset rather than all at once. Every interactive element has a distinct pressed state that fires within ~100ms —
  the threshold at which humans start perceiving delay. `prefers-reduced-motion` is honored with a real
  alternative (instant state change), not just disabled animation.
- **10** — There is continuity between views: the element you tapped is the element that grows into the detail
  screen (View Transitions API, or a shared-layout equivalent), so list→detail reads as one continuous object
  rather than two screens. Choreography is sequenced — chrome settles first, then content, then the accent —
  and the live/urgent element has its own distinct rhythm (cf. `mb-live-dot`) that is unmistakable in peripheral
  vision. Scroll-linked effects, if any, run on `animation-timeline` / compositor-only properties and hold 60fps
  on a mid-tier phone.

---

### D6. Touch ergonomics & mobile flow
*Assume every user is one-handed on a 375px phone during a live match.*

- **5** — Layout is responsive and nothing overflows. Buttons are roughly finger-sized. Primary actions are
  wherever the desktop layout left them.
- **8** — Every interactive target is ≥44×44 CSS px of *actual hit area* (Apple HIG; WCAG 2.5.5 AAA), with ≥8px
  between adjacent targets. Primary actions live in the bottom third of the screen — roughly 75% of smartphone
  interaction is thumb-driven and bottom-third concentration reaches ~78% on 6.5"+ devices. `env(safe-area-inset-*)`
  is respected on every fixed/sticky element, top and bottom, so nothing sits under the notch or the home indicator.
  Destructive actions are not adjacent to frequent ones. No hover-only affordance exists anywhere.
- **10** — The screen is genuinely operable one-handed without a grip change: the entire critical path
  (score increment, undo, next match) is reachable in the green thumb zone, targets on the primary scoring
  control are oversized well beyond the minimum, and the sticky score header never occludes content or steals
  scroll. Gestures (swipe, pull-to-refresh) are additive with visible equivalents, and long-press/haptic-class
  feedback exists where it maps to a real action. Landscape at ≤500px height still shows the score
  (the existing `@media (max-height: 500px)` contract is honored, not bypassed).

---

### D7. State coverage — empty, loading, error, offline
*A screen that only exists in its happy state is a mockup, not a product.*

- **5** — Loading is a spinner. Empty state is a line of gray text. Errors surface as a generic message or a
  console log. Offline behavior is undefined.
- **8** — All four states are designed in the Matchbook language. Loading uses skeletons shaped and sized like the
  real content (spinners are permitted only for short discrete confirmations like save/auth, not for content) —
  skeletons measurably reduce perceived wait, with users rating a ~3s skeleton about the same as a ~1.5s spinner.
  Empty states state what is missing, why, and offer the single next action as a real button. Errors are specific,
  recoverable, and never dead-end. Offline/stale data is visibly labeled rather than silently shown as fresh.
- **10** — States are *composed*, not bolted on: the skeleton occupies the exact final geometry so there is zero
  layout shift on hydration, the empty state is a designed editorial object (masthead + rule + copy + action)
  that a first-time user would screenshot, partial/degraded states exist (some panels loaded, some not) and are
  handled per-panel rather than blocking the whole page, and optimistic updates roll back visibly and gracefully
  on failure.

---

### D8. Information hierarchy & scannability
*What does this screen answer, and can you tell in one second?*

- **5** — All panels have equal visual weight. The user can find things by reading labels. Titles are present
  and accurate.
- **8** — There is one unambiguous primary object per screen and everything else is visibly subordinate through
  size, weight, and position — not through color alone. Grouping is explicit (panel heads, hairline rules,
  kickers) and there are no more than ~3 levels of hierarchy visible at once. Scanning paths are honest: the
  first thing the eye lands on is the thing the screen is actually about. Secondary/tertiary data is demoted
  below the fold or behind a deliberate tap, following WHOOP's tier separation.
- **10** — The screen passes a five-second test with a stranger: they can state the primary answer and the next
  action without scrolling. Hierarchy is legible in a squint test and in grayscale. Progressive disclosure is
  structural — analysis genuinely lives on its own tier, not in a collapsed section on the same tier — and
  labels are editorial (short, uppercase, tabular) rather than form-field verbose.

---

### D9. Brand consistency with the Matchbook system
*One system, one voice, zero leakage from the old theme.*

- **5** — Uses `matchbook-surface` and some `mb-*` classes but mixes in leftover shadcn/`--primary`-era styling:
  rounded-xl cards, soft drop shadows, generic outline buttons, old red accents.
- **8** — Zero visual leakage from the pre-Matchbook theme on the screen. Panels use `mb-panel` (heavy top border,
  hairline sides, 4px radius) or a documented sibling. Buttons come from `mb-btn*`. Tables come from `mb-table*`.
  Icons come from `MbIcon`/the sprite — no emoji, no second icon library. The paper texture, crest, and lockup
  are used as specified in `public/assets/matchbook/README.md` and `manifest.json`. Any dialog/sheet on the screen
  is Matchbook-skinned, including its overlay, radius, and border weight.
- **10** — The screen extends the system correctly rather than merely conforming: any new pattern it introduces
  is generalized into `src/components/matchbook/*` or a `mb-*` utility in `globals.css`, is named consistently,
  and would be reusable by the next screen. Placed beside the already-shipped Overview, Teams and Compete pages,
  it is indistinguishable in authorship — same rule weights, same border radii, same tracking, same icon stroke.

---

### D10. Perceived performance
*How fast it feels, measured where possible.*

- **5** — Feels acceptable on desktop dev. No measurements taken. Some content pops in after load.
- **8** — INP ≤ 200ms for the primary interaction on the screen (the Core Web Vitals "good" threshold; ~43% of
  sites fail it). CLS ≤ 0.1 — images carry explicit width/height, fonts are loaded to avoid reflow, and every
  async region has reserved space. Interactive feedback is visible in <100ms even when the network call is
  pending (optimistic UI where the action is safely reversible). Transitions hold 60fps on a mid-tier phone.
  No blocking full-screen spinner for content that could stream.
- **10** — The screen feels instant regardless of network: primary mutations are optimistic with visible
  rollback, likely-next views are prefetched/prerendered so list→detail lands already-rendered, animation work
  is compositor-only, and no interaction on the critical scoring path ever waits on a round trip before showing
  feedback. Measured, not asserted — the critic should be able to see the numbers.

---

## 3. Hard fails — instant disqualification regardless of score

Any single item below fails the screen outright. Do not average it away. Do not grade on a curve.
Report every hard fail found, not just the first.

1. **Horizontal page scroll at 375px** (or any viewport). Overflow is permitted only inside an explicitly
   scrollable container with a visible affordance — never on `<body>`.
2. **Any interactive target under 44×44 CSS px of real hit area**, or adjacent targets with <8px separation.
3. **Visible layout shift on load or hydration** — content jumping, skeletons that don't match final geometry,
   images without reserved dimensions, font swap reflow.
4. **Two design systems on one screen** — any pre-Matchbook artifact surviving: `--primary` red, shadcn default
   card/button/dialog chrome, `rounded-xl`+soft-shadow cards, the old cream/red palette, or a stray Tailwind
   default gray.
5. **Generic AI-slop layout** — a single centered card floating in empty space; three equal feature tiles with
   an icon-title-paragraph each; a gradient hero with a centered headline and two buttons; symmetrical
   everything with no editorial structure. If the layout would look identical for a CRM, it fails.
6. **Contrast below WCAG AA** — body text under 4.5:1, large text/UI under 3:1. Coral-on-cream and
   `--mb-ink-muted`-on-paper must be checked, not assumed.
7. **Emoji used as iconography** anywhere in the UI (status, nav, buttons, empty states). Also fails: a second
   icon library appearing next to `MbIcon`.
8. **Spinner-only loading for content**, or an unstyled/absent loading state, or a full-page blocking spinner.
9. **Missing empty state** on any list, table, bracket, or panel that can legitimately be empty.
10. **Information conveyed by color alone** — win/loss, live status, or ranking distinguishable only by hue.
11. **Fixed or sticky element ignoring `env(safe-area-inset-*)`**, or a bottom bar that sits under the home indicator.
12. **Hover-dependent functionality** with no touch equivalent; or a tooltip that is the only source of some information.
13. **Numbers that reflow** — non-tabular figures in any score, timer, standings column, or live-updating value.
14. **Unlabeled or truncated destructive action**, or a destructive control adjacent to a high-frequency control.
15. **Broken keyboard access** — focus not visible, focus trapped in a dialog with no escape, or a control
    unreachable by tab.
16. **Text rendered over the paper texture at low contrast**, or the texture tiling visibly/seaming.
17. **Console errors, hydration mismatch warnings, or `npx tsc --noEmit` / `npx eslint` failures** on the screen's files.

---

## 4. Required verdict format

A critic reviewing a screen must emit **exactly** this structure. No prose preamble, no summary paragraph
before the table, no softening.

```
## VERDICT — <route> (<viewport(s) tested>)

| # | Dimension                              | Score | Evidence |
|---|----------------------------------------|-------|----------|
| 1 | Typographic craft                      | x/10  | <specific, observable, cite element/selector> |
| 2 | Spatial rhythm & density               | x/10  | ... |
| 3 | Color discipline                       | x/10  | ... |
| 4 | Data legibility (scores/standings/bracket) | x/10 | ... |
| 5 | Motion & choreography                  | x/10  | ... |
| 6 | Touch ergonomics & mobile flow         | x/10  | ... |
| 7 | State coverage (empty/loading/error/offline) | x/10 | ... |
| 8 | Information hierarchy & scannability   | x/10  | ... |
| 9 | Brand consistency with Matchbook       | x/10  | ... |
|10 | Perceived performance                  | x/10  | ... |

TOTAL: xx/100
LOWEST DIMENSION: D<n> (<name>) — <one line on why>

### HARD FAILS
- [HF-<n>] <name> — <where, exactly: file:line or selector, and what was observed>
(or: "None." — only if every item in section 3 was actually checked)

### RESULT: PASS | FAIL

### REQUIRED FIXES (ordered by severity)
1. <imperative, specific, actionable — names the file and the change>
2. ...
```

### Pass threshold

**PASS = every one of the 10 dimensions scores ≥ 8 AND zero hard fails.**

- A total of 79/100 with all dimensions at 8 **passes**.
- A total of 97/100 with one dimension at 7 **fails**. The total is diagnostic only; it never overrides the floor.
- A total of 100/100 with one hard fail **fails**.

### Scoring posture — read this before scoring anything

- **7 is a failing grade.** 7 means "good, with a known flaw." Award-winning work has no known flaws.
  Do not round 7.5 up. Do not award 8 for effort, for improvement over the previous version, or because
  the rest of the screen is strong.
- **The default score is the one you can defend with a screenshot.** Every score ≥8 requires a concrete
  observation in the Evidence column — an element, a selector, a measured value. "Feels polished" is not evidence
  and any dimension whose evidence is subjective is capped at 6.
- **Absence of a problem is not a strength.** A screen with no motion scores low on D5; it does not score 8
  for "not doing anything wrong."
- **Compare against the references in section 1, not against the previous version of this screen.**
  The question is never "is this better than before" — it is "would this be published as a case study."
- **Every hard fail must be actively checked**, not assumed absent. Reporting "None." without testing at 375px,
  without checking contrast, and without checking tab order is itself a review failure.
- **When genuinely torn between two scores, take the lower one.**

---

## Sources

- [Lickability — Our Apple Sports design critique](https://lickability.com/blog/apple-sports/)
- [Creative Boom — What Apple Sports teaches about designing data](https://www.creativeboom.com/inspiration/this-new-app-from-apple-has-something-important-to-teach-us-about-designing-data/)
- [Daring Fireball — Apple Sports](https://daringfireball.net/2024/02/apple_sports)
- [GDUSA — Gretel teams with The Athletic](https://gdusa.com/gretel-teams-with-the-athletic/)
- [STRV — The Athletic case study](https://www.strv.com/our-work/the-athletic)
- [925 Studios — WHOOP design breakdown: data-dense UI that feels simple](https://www.925studios.co/blog/whoop-design-breakdown)
- [It's Nice That — Wieden+Kennedy rebrands Formula 1](https://www.itsnicethat.com/news/wieden-and-kennedy-formula-1-graphic-design-271117)
- [Hingston Studio — Formula 1 brand identity (Torque 100 / 50 / Inline)](https://www.hingston.studio/work/formula-1/)
- [Sensatype — What font does Strava use (Boathouse by Grilli Type; Inter in-app)](https://sensatype.com/what-font-does-strava-use-in-2026)
- [Class Agency — Serving up a digital design system for Wimbledon](https://class.agency/work/wimbledon-digital-design-system/)
- [IBM Newsroom — Wimbledon 2026 modernized digital platforms](https://newsroom.ibm.com/2026-06-22-wimbledon-and-ibm-introduce-new-ai-powered-fan-experiences-and-modernized-digital-platforms-for-the-championships-2026)
- [NewscastStudio — Inside ESPN's overhaul of college football graphics (blitz towers)](https://www.newscaststudio.com/2025/09/19/espn-college-football-branding-design-graphics/)
- [PRINT Magazine — Olympic pictograms](https://www.printmag.com/branding-identity-design/olympics-pictograms/)
- [Creative Review — Paris 2024 visual identity](https://www.creativereview.co.uk/paris-2024-olympics-identity-branding/)
- [Awwwards — Sports category winners](https://www.awwwards.com/websites/sports/)
- [Red Dot — OneFootball](https://www.red-dot.org/project/onefootball-12472)
- [Perfectiongeeks — FotMob app review 2026](https://www.perfectiongeeks.com/blogs/fotmob-app-review)
- [DigitalApplied — Core Web Vitals 2026: INP, LCP, CLS](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide)
- [Calibre — Cumulative Layout Shift](https://calibreapp.com/blog/cumulative-layout-shift)
- [Onething Design — Skeleton screens vs loading spinners](https://www.onething.design/post/skeleton-screens-vs-loading-spinners)
- [LogRocket — All accessible touch target sizes](https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/)
- [TestParty — WCAG 2.5.8 target size](https://testparty.ai/blog/wcag-target-size-guide)
- [Parachute Design — Mastering the thumb zone](https://parachutedesign.ca/blog/thumb-zone-ux/)
- [Use Your Loaf — Supporting iPhone X safe areas](https://useyourloaf.com/blog/supporting-iphone-x/)
- [Simon Hearne — Optimistic UI patterns](https://simonhearne.com/2021/optimistic-ui-patterns/)
- [Chrome for Developers — View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions)
- [MDN — font-variant-numeric](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-variant-numeric)
- [CSSAWWWARDS — CSS scroll-driven animations guide 2026](https://cssawwwards.com/blog/css-scroll-driven-animations-guide-2026)
