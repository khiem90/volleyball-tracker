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

### 2.0 Scoring procedure — do this before writing a single number

Three critics scored the same `/dev/kit` build in the same hour and returned 57, 65 and 66. Typographic
craft came back 6, 8 and 6; data legibility 6, 5 and 7; touch ergonomics 3, 4 and a 6 whose own evidence
column said the hit-area sweep had not been run. Some of that spread is lens difference and is *intended* —
three critics looking from three angles is the point. The rest of it was the rubric's fault: the anchors
named qualities, not quantities, so two honest critics could read the same screen and defend different
numbers. §2.1–§2.4 exist to remove that second source of variance without lowering the bar.

#### 2.1 Run the measurement pass first

Every dimension below has a **Measure** block: the quantities that dimension is scored on, and the command
that produces them. Run them before scoring. `<SCRATCH>` is the scratchpad path in `PROGRESS.md` §1.

```bash
cd <SCRATCH>/pw
node audit.mjs --selftest                        # 22 cases; prove the tool before trusting it
node audit.mjs <routeId|/path> --desktop         # TOUCH SPACING GROUPED OVERFLOW SCROLLPORT
node audit.mjs <routeId|/path> --mobile          # NUMERALS FONTS A11Y CONSOLE MOTION
node shot.mjs <route> out.png --desktop --full
node shot.mjs <route> out.png --mobile --full
```

```bash
cd "C:/Dev/Tournament-Tracker/.claude/worktrees/app-redesign-features-cf1ebd"
npx tsc --noEmit && npx eslint src && npx vitest run
```

Several dimensions need a measurement `audit.mjs` does not take. Those are written as in-page expressions;
run them through this six-line wrapper, which seeds the same fixture and uses the same viewport presets as
`shot.mjs`, so a number here and a pixel in `shots/` describe the same render:

```js
// <SCRATCH>/pw/probe.mjs — node probe.mjs <route> <viewportWidth>
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const [route, w = "1440"] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: +w, height: +w < 768 ? 844 : 900 }, deviceScaleFactor: 2 });
await c.addInitScript((r) => localStorage.setItem("tournament-tracker-state", r), readFileSync("./fixture.json", "utf8"));
const p = await c.newPage();
await p.goto("http://127.0.0.1:3100" + route, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1800);
console.log(JSON.stringify(await p.evaluate(() => { /* PASTE THE EXPRESSION HERE */ }), null, 2));
await b.close();
```

#### 2.2 The phase rule — a screen is judged on what it is scheduled to contain

**A screen is scored against the components its current phase schedules it to have. A component that is
absent because a later workstream owns it is NOTED, never scored.**

The charter assigns every primitive to a workstream and a phase. Scoring a P1 kit down on D4 because
`MbStandingsTable` does not exist yet is scoring the schedule, not the work — it makes the number
un-actionable (nobody in this round can move it) and it makes two verdicts incomparable if one critic applied
the deduction and another did not. That is exactly what happened: one critic took D4 to 6 primarily because
"`MbStandingsTable`, `MbMatchRow`, `BracketRail`, `MbCourtCard`, `MbScoreSide`/`MbSetStrip` do not exist",
which is true, charter-scheduled for W4/W5 P3a, and not a defect in anything that shipped.

Procedure:

1. Before scoring, read the charter's phase table and `PROGRESS.md` §3, and write the screen's **in-scope
   inventory**: what this screen is supposed to contain *at this phase*.
2. Score each dimension over the in-scope inventory only.
3. List everything you found absent in a **SCHEDULED ABSENCES** block in the verdict, each with the
   workstream and phase that owns it. That block is mandatory even when empty ("None.").
4. If a scheduled absence means a dimension has too little in scope to judge — fewer than three in-scope
   specimens — score it `n/a` and say so. Do not split the difference with a 6.

The rule cuts one way only. **A component that exists and is wrong is always scored**, whoever owns it, and
an absence that no workstream owns is a defect, not an absence — say which and score it.

#### 2.3 An unmeasured dimension is capped at 5 and labelled

If the Measure block for a dimension was not run on the tree being judged, the dimension scores **at most 5**
and its Evidence column must begin with `UNMEASURED — `. Inheriting a sibling's number, or a number from an
earlier build, is the same as not measuring: the tree moves under you.

This replaces the previous convention of quietly awarding a middling score. One verdict scored touch
ergonomics 6 while stating "hit-area sweep not re-run independently (sibling-owned)"; the two critics who
did run it measured 3 and 4. A 6 and a 3 on the same tree is not a lens difference, it is an unrun command.

#### 2.4 Report the number, then the judgement

Every Evidence cell states the measured quantity first and the reading of it second — `54 distinct type
steps rendered against a named scale of 23` before `the scale is not in force`. A cell with no quantity in it
caps its dimension at 6 (existing rule, now operational: the quantity is defined per dimension below).

Where two critics measure the same quantity and disagree, the disagreement is about the tree, not the
rubric, and one of them is wrong — re-run rather than average.

---

### D1. Typographic craft
*Type as the primary carrier of the brand.*

**Measure**

| # | Quantity | How |
| --- | --- | --- |
| 1.1 | Distinct type steps: unique `(family, fontSize, fontWeight, letterSpacing, textTransform)` tuples over all text-painting nodes | expression below; compare against the named scale in the design language §2.1/§2.2 |
| 1.2 | Off-scale sizes: computed `fontSize` values not on the named scale | same expression, `sizes` key |
| 1.3 | Tracking collisions: `(size, weight)` pairs carrying two or more `letterSpacing` values at once | same expression, `collisions` key |
| 1.4 | Prose measure: characters-per-line for every text block over 40 characters | same expression, `cpl` key |
| 1.5 | Heading orphans at 375px: headings whose last line is one word | same expression at `375` |
| 1.6 | Numerals without `tabular-nums` | `node audit.mjs <route> --mobile` → `NUMERALS` |
| 1.7 | Font chain: elements resolving to the Tailwind preflight stack, plus the resolved first-family census | `node audit.mjs <route> --mobile` → `FONTS` |

```js
() => {
  const rows = [], sizes = {}, cpl = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("nextjs-portal")) continue;
    const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!direct) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (!r.width || !r.height || cs.visibility === "hidden") continue;
    const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const key = [fam, cs.fontSize, cs.fontWeight, cs.letterSpacing, cs.textTransform].join("|");
    if (!seen.has(key)) { seen.add(key); rows.push(key); }
    sizes[cs.fontSize] = (sizes[cs.fontSize] ?? 0) + 1;
    const t = el.textContent.replace(/\s+/g, " ").trim();
    if (t.length > 40) cpl.push({ chars: Math.round(t.length / Math.max(1, Math.round(r.height / parseFloat(cs.lineHeight || cs.fontSize)))), sel: el.tagName + "." + String(el.className).slice(0, 24) });
  }
  const byPair = {};
  for (const k of rows) { const [, s, w, ls] = k.split("|"); (byPair[`${s}/${w}`] ??= new Set()).add(ls); }
  return {
    steps: rows.length,
    sizes,
    collisions: Object.entries(byPair).filter(([, v]) => v.size > 1).map(([k, v]) => `${k}: ${[...v].join(" ")}`),
    cpl: cpl.filter((x) => x.chars < 45 || x.chars > 75),
  };
}
```

- **5** — Oswald is used for headings and Outfit for body. Sizes are picked ad hoc per screen. Tracking left at
  browser default on uppercase display type. Some headings are sentence case, some uppercase.
- **8** — Requires all of: **1.1 ≤ the named scale's step count**; **1.2 empty** — every rendered size is a
  named step, none between steps; **1.3 empty** — no size/weight pair carries two trackings; **1.4 empty** at
  1440 and 390; **1.5 empty** at 375; **1.6 = 0**; **1.7 = 0 failures**, with the family census showing only
  Oswald and Outfit. All uppercase display type carries deliberate positive tracking (`0.02em`–`0.16em` per
  role, matching `matchbook-display` / `mb-kicker`), and each role's value is declared at the call site rather
  than inherited from a default that is correct for nothing.
- **10** — Type alone establishes the whole hierarchy; remove all color and the screen still reads correctly.
  Optical corrections are present, not just mathematical ones, and are **measured**: display headings get
  negative-adjusted leading; kickers are optically aligned to the rules they sit above (compare the kicker's
  left ink edge with the cap's left sidebearing — a 0.00px offset between a 2.0px-LSB cap and a 0.0px-LSB
  kicker is *not* alignment); numerals in a column are visually centered on their own width rather than their
  box (a scoreline divider more than 1px off optical centre on any two-digit score fails this). At least one
  typographic moment on the screen is authored rather than defaulted — a stacked masthead, a rule-through
  heading, a hung folio, a set of scores that align as a grid.

---

### D2. Spatial rhythm & density
*Sports products are dense. Density without rhythm is noise.*

**Measure**

| # | Quantity | How |
| --- | --- | --- |
| 2.1 | Control height ladder: unique border-box heights of every interactive control | expression below, `heights` |
| 2.2 | Radius census: unique `border-radius` values | expression below, `radii` |
| 2.3 | Gap census: unique gap/padding values between sibling panels and inside panels of one type | expression below, `gaps` |
| 2.4 | Adjacent pairs under 8px, split into counted and composite-waived | `node audit.mjs <route> --mobile` → `SPACING` and `GROUPED` |
| 2.5 | Whether a control of one nominal size renders at two heights (a wrapping label taking one cell taller) | expression below, `sizeSplit` |

```js
() => {
  const heights = {}, radii = {}, gaps = {}, sizeSplit = {};
  const SEL = 'button, a[href], input, select, textarea, [role="tab"], [role="radio"], [role="switch"]';
  for (const el of document.querySelectorAll(SEL)) {
    const r = el.getBoundingClientRect(); if (!r.height) continue;
    const h = Math.round(r.height * 100) / 100;
    heights[h] = (heights[h] ?? 0) + 1;
    const size = el.getAttribute("data-size") || "";
    if (size) (sizeSplit[`${el.tagName}.${size}`] ??= new Set()).add(h);
  }
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    for (const v of new Set(cs.borderRadius.split(/[\s/]+/))) if (v && v !== "0px") radii[v] = (radii[v] ?? 0) + 1;
    if (cs.display.includes("flex") || cs.display.includes("grid")) {
      for (const v of [cs.rowGap, cs.columnGap]) if (v && v !== "normal" && v !== "0px") gaps[v] = (gaps[v] ?? 0) + 1;
    }
  }
  return { heights, radii, gaps, sizeSplit: Object.fromEntries(Object.entries(sizeSplit).map(([k, v]) => [k, [...v]])) };
}
```

- **5** — Spacing is Tailwind defaults chosen per element. Gaps between sibling panels vary (gap-3 here, gap-5
  there). Padding inside panels differs between panels of the same type. Lots of dead vertical space, or none at all.
- **8** — Requires all of: **2.1 is a subset of the control ladder {44, 48, 56}**, with no component offering a
  ladder the others do not (a `size="md"` that means 48px on one control and 44px on another fails this, and a
  46/58 pair fails it twice — neither number is on the ladder); **2.2 is a subset of {4px, 3px, 2px} plus the
  four sanctioned 999px uses**; **2.3 shows one gap value per semantic relationship**; **2.4 counted = 0**, and
  every waived pair's `(no rule)` marker is individually justified; **2.5 empty** — one nominal size never
  renders at two heights. Density is *deliberately higher* than a generic SaaS dashboard — this is an almanac
  page, not a marketing site — while still keeping ≥4px optical breathing room around every hairline rule.
- **10** — There is a visible baseline/vertical rhythm across dissimilar panels, and it is measurable: the third
  row of the standings panel and the third row of the schedule panel beside it share a `y` within 1px. Density
  modulates purposefully — the hero data block is airier than the reference tables below it, and that contrast
  is what creates the hierarchy. Whitespace is shaped (columns, margins, hung rules), not merely leftover, and
  no fixed reservation (a digit reserve, an icon slot) spends more layout than the ink it protects.

---

### D3. Color discipline
*Fewest colors, each with a fixed job.*

**Measure**

| # | Quantity | How |
| --- | --- | --- |
| 3.1 | Hardcoded colours in the screen's own files | `grep -rnE "#[0-9a-fA-F]{3,8}\b\|rgba?\(\|oklch\(\|hsl\(" <the screen's files>` |
| 3.2 | Text contrast: every rendered text node vs its effective ground, floor by size+weight (4.5:1 body, 3:1 ≥24px or ≥18.66px/700) | expression below, `text` |
| 3.3 | Non-text contrast: every enabled control boundary, rail, and status mark vs its ground, floor 3:1 | expression below, `ui` |
| 3.4 | Coral job census: the distinct semantic jobs `--mb-coral`/`--mb-coral-deep` performs on this screen | list them by hand from the shot; a job is a meaning, not a call site |
| 3.5 | Greyscale survival: every state still distinguishable with colour removed | `node shot.mjs <route> out.png --desktop --full`, then view under `filter: grayscale(1)` |

```js
() => {
  const lum = (c) => { const s = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
  const parse = (s) => { const m = s.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const ground = (el) => { for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); const c = parse(cs.backgroundColor); const a = cs.backgroundColor.match(/rgba\([^)]*,\s*([\d.]+)\)/); if (c && (!a || +a[1] > 0.5)) return c; } return [255, 250, 241]; };
  const ratio = (f, b) => { const x = lum(f) + 0.05, y = lum(b) + 0.05; return Math.round((Math.max(x, y) / Math.min(x, y)) * 100) / 100; };
  const text = [], ui = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = (n.nodeValue || "").trim(); if (!t) continue;
    const el = n.parentElement, cs = el && getComputedStyle(el); if (!cs || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const px = parseFloat(cs.fontSize), wt = +cs.fontWeight || 400;
    const floor = px >= 24 || (px >= 18.66 && wt >= 700) ? 3 : 4.5;
    const cr = ratio(parse(cs.color), ground(el));
    if (cr < floor && !el.closest("[disabled],[aria-disabled=true]")) text.push({ t: t.slice(0, 24), cr, floor, px, wt, sel: el.tagName + "." + String(el.className).slice(0, 24) });
  }
  for (const el of document.querySelectorAll('input, select, textarea, .mb-tile, [role="switch"], [data-tone]')) {
    if (el.closest("[disabled],[aria-disabled=true]")) continue;
    const cs = getComputedStyle(el), bc = parse(cs.borderTopColor);
    if (!bc || cs.borderTopWidth === "0px") continue;
    const cr = ratio(bc, ground(el.parentElement || el));
    if (cr < 3) ui.push({ cr, sel: el.tagName + "." + String(el.className).slice(0, 24), border: cs.borderTopColor });
  }
  return { text, ui };
}
```

- **5** — Uses the Matchbook variables but adds a hue or two for "variety". Semantic colors (green/red) appear
  both as status and as decoration. Some hardcoded hex values sit alongside `var(--mb-*)`.
- **8** — Requires all of: **3.1 = 0** (the only sanctioned literal is a user-chosen swatch value);
  **3.2 = 0** — no enabled text node under its floor, and coral-as-text is *checked*, not assumed, on every
  screen it appears on; **3.3 = 0** — no enabled control's only boundary under 3:1; **3.4 ≤ 2**, coral doing
  the primary action and/or the live state and nothing else; **3.5 passes**. Every semantic color has one
  meaning that holds across the whole app: `--mb-green` = win/positive, `--mb-red` = loss/live-urgent,
  `--mb-gold` = leader/first, `--mb-teal`/`--mb-plum` only as categorical team assignment — and a mark that
  means "leader" in one component and something else in another is a collision, counted in 3.4. Team colors,
  if present, appear only inside contained marks (crest chip, form square, seed box) and never as panel
  backgrounds. Cream + navy + hairline rules carry ≥90% of the surface area.
- **10** — Color is load-bearing and could be removed without losing meaning (it is reinforcement, not the only
  channel — see WHOOP's three-color lock). Ink weights are modulated deliberately: full navy for primary data,
  `--mb-ink-muted` for labels, `--mb-rule` for structure, in a consistent three-tier ink hierarchy.
  Any tint/overlay is expressed as an alpha of an existing token, never a new hue.

---

### D4. Data legibility — scores, standings, brackets
*The hardest dimension. This is a scoring app; if the data is not instantly readable nothing else matters.*

**Scope.** Judged over the data components this screen's phase schedules (§2.2). Components owned by a later
workstream go in SCHEDULED ABSENCES and do not move the score. If fewer than three in-scope data specimens
exist, score `n/a`.

**Measure**

| # | Quantity | How |
| --- | --- | --- |
| 4.1 | Score box width across 1-, 2- and 3-digit values — must be identical | expression below, `boxes`; drive the value through the component's own prop or fixture |
| 4.2 | Neighbour shift when a live value increments — must be 0px | record `getBoundingClientRect().x` of the adjacent name cell before and after |
| 4.3 | Optical mass: ink coverage of the reserved box at 1, 2 and 3 digits | expression below, `fill` |
| 4.4 | Truncation census: elements where `scrollWidth > clientWidth + 1`, at 1440 and at 375 | expression below, `clipped` |
| 4.5 | Name-column capacity at 320px: characters rendered before the ellipsis for the longest fixture name | read the 320px shot |
| 4.6 | Numerals without `tabular-nums` | `node audit.mjs <route> --mobile` → `NUMERALS` |

```js
() => {
  const clipped = [], fill = [], boxes = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "auto" && getComputedStyle(el).overflowX !== "scroll")
      clipped.push({ sel: el.tagName + "." + String(el.className).slice(0, 30), lost: el.scrollWidth - el.clientWidth, text: el.textContent.trim().slice(0, 40) });
  }
  for (const el of document.querySelectorAll(".mb-numeral, [data-mb-numeral]")) {
    const r = el.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(el);
    const ink = range.getBoundingClientRect();
    boxes.push(Math.round(r.width * 100) / 100);
    fill.push({ digits: el.textContent.trim().length, box: Math.round(r.width * 100) / 100, ink: Math.round(ink.width * 100) / 100, pct: Math.round((ink.width / r.width) * 1000) / 10 });
  }
  return { clipped, fill, boxes: [...new Set(boxes)] };
}
```

- **5** — Scores are readable text at body size. Tables use `mb-table`. Brackets render and are correct but
  require thought to trace. Sorting/ranking is present but not visually emphasized.
- **8** — Requires all of: **4.1 identical to 0.01px** across 1/2/3 digits; **4.2 = 0px**; **4.4 = 0 for any
  label, column header or status word** at both widths — a header wraps, it never truncates (reference §1.1);
  **4.5 ≥ 8 characters**, and two different long names must remain mutually distinguishable; **4.6 = 0**.
  Winner/loser is legible without reading the number (weight, ink, or a rule — not color alone). Standings
  columns are right-aligned for numerics, left for names, with a locked column order and abbreviated uppercase
  headers. Bracket lines are unambiguous: every advancing path is traceable with a fingertip, seeds and byes
  are explicit, and the current round is marked. Nothing important is conveyed only by color or only by position.
- **10** — The screen answers its primary question in under one second at arm's length (WHOOP/Apple Sports test).
  **4.3 varies by no more than 1.5× across the in-set score range** — the Apple Sports steal is that a 7 and a
  21 carry comparable optical mass, which a fixed box alone does not deliver. Numbers are aligned into a genuine
  grid across rows *and* panels. Comparative data is visually comparative — form squares, deltas, leader marks —
  so the user reads relationships, not just values. A dense bracket or standings table remains scannable at
  375px without hiding data behind an accordion.

---

### D5. Motion & choreography
*Motion is earned feedback, never arrival decoration.*

**Measure**

| # | Quantity | How |
| --- | --- | --- |
| 5.1 | Transition property census: how many transitioning elements animate `transform`/`opacity` vs paint vs layout properties | expression below, `props` |
| 5.2 | Duration census: every transition/animation duration, and how many resolve to a `--mb-dur-*` token | expression below, `durations` |
| 5.3 | Pressed-state coverage: interactive controls with a distinct `:active` recipe ÷ total interactive controls | expression below, `active`; cross-check `grep -c ":active" src/app/globals.css` |
| 5.4 | Entrance choreography: elements carrying an entrance/stagger class, and whether their order is authored | expression below, `entrance` |
| 5.5 | Reduced-motion drift across two frames | `node audit.mjs <route> --desktop` → `MOTION` |

```js
() => {
  const props = { transform: 0, opacity: 0, paint: 0, layout: 0 }, durations = {}, entrance = [];
  const LAYOUT = /^(width|height|margin|padding|top|left|right|bottom|inset|flex|grid)/;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.transitionDuration !== "0s" && cs.transitionDuration !== "") {
      for (const p of cs.transitionProperty.split(",").map((s) => s.trim())) {
        if (p === "transform") props.transform++;
        else if (p === "opacity") props.opacity++;
        else if (LAYOUT.test(p)) props.layout++;
        else props.paint++;
      }
      for (const d of cs.transitionDuration.split(",").map((s) => s.trim())) durations[d] = (durations[d] ?? 0) + 1;
    }
    if (cs.animationName !== "none") for (const d of cs.animationDuration.split(",")) durations[d.trim()] = (durations[d.trim()] ?? 0) + 1;
    if (/mb-(enter|stagger)/.test(String(el.className))) entrance.push(el.tagName + "." + String(el.className).slice(0, 30));
  }
  let active = 0, total = 0;
  for (const sheet of document.styleSheets) { try { for (const rule of sheet.cssRules) if (rule.selectorText && rule.selectorText.includes(":active")) active++; } catch {} }
  total = document.querySelectorAll('button, a[href], [role="tab"], [role="switch"], input, select').length;
  return { props, durations, entrance: { count: entrance.length, sample: entrance.slice(0, 10) }, active, total };
}
```

- **5** — framer-motion fade/slide on mount, one blanket transition applied to everything. Durations left at
  library defaults. Modals appear instantly or with a generic scale.
- **8** — Requires all of: **5.1 layout = 0** — nothing animates a layout property, work stays on the
  compositor; **5.2 shows every duration resolving to `--mb-dur-fast/base/slow`** (a dominant `150ms` that is
  not a token fails this, however tidy it looks); **5.3 covers every interactive family** — buttons, tabs,
  rows, nav items each have a distinct pressed state that fires within ~100ms, the threshold at which humans
  start perceiving delay, and a count of 5 `:active` rules against 60 controls is a fail regardless of how the
  rest of the dimension reads; **5.4 > 0 and ordered** — the documented entrance vocabulary is actually
  applied, in a deliberate order with a small offset, rather than existing in CSS and being used on nothing;
  **5.5 = 0 drifts**, with `prefers-reduced-motion` honoured by a real instant state change rather than by
  removing the feedback. Motion has a written vocabulary — entrance vs. state-change vs. exit, each with a
  fixed duration band (roughly 120–200ms for feedback, 200–320ms for view changes) and a consistent easing.
- **10** — There is continuity between views: the element you tapped is the element that grows into the detail
  screen (View Transitions API, or a shared-layout equivalent), so list→detail reads as one continuous object
  rather than two screens. Choreography is sequenced — chrome settles first, then content, then the accent —
  and the live/urgent element has its own distinct rhythm (cf. `mb-live-dot`) that is unmistakable in peripheral
  vision. Scroll-linked effects, if any, run on `animation-timeline` / compositor-only properties and hold 60fps
  on a mid-tier phone.

---

### D6. Touch ergonomics & mobile flow
*Assume every user is one-handed on a 375px phone during a live match.*

**Measure** — this dimension is the one most often asserted rather than measured. §2.3 applies hardest here.

| # | Quantity | How |
| --- | --- | --- |
| 6.1 | Targets under 44×44 of real hit area, probed at all four corners with `elementFromPoint` | `node audit.mjs <route> --mobile` → `TOUCH`. **Must be run on the tree being judged.** |
| 6.2 | Adjacent interactive pairs under 8px, minus composite cells | same run → `SPACING` / `GROUPED` |
| 6.3 | Horizontal page scroll, and any content clipped off-viewport by `overflow-x: hidden` | same run → `OVERFLOW`, plus D4's `clipped` expression at 320/375 |
| 6.4 | Safe-area: every fixed/sticky element's padding resolves through `env(safe-area-inset-*)` | read the source, not the computed `12px` — a correct computed value proves nothing on a device without a notch |
| 6.5 | Thumb zone: the primary action's centre `y` as a fraction of viewport height | `document.querySelector(".mb-btn-coral").getBoundingClientRect()` |
| 6.6 | Type escalation: dominant label and body sizes at 390px vs 1440px | D1's expression at both widths |
| 6.7 | Landscape ≤500px height still shows the score | `node shot.mjs <route> out.png --mobile` with a 844×390 viewport |

- **5** — Layout is responsive and nothing overflows. Buttons are roughly finger-sized. Primary actions are
  wherever the desktop layout left them.
- **8** — Requires all of: **6.1 = 0**; **6.2 = 0** counted, with every waived pair justified; **6.3 = 0** and
  nothing severed mid-word behind the horizontal guard; **6.4 verified in source**; **6.5 in the bottom
  third** — roughly 75% of smartphone interaction is thumb-driven and bottom-third concentration reaches ~78%
  on 6.5"+ devices; **6.6 shows the phone is not simply the desktop render** — a 9.92px label and 11.52px body
  unchanged from desktop is a fail on a screen premised as one-handed during a live match; **6.7 passes**.
  Destructive actions are not adjacent to frequent ones. No hover-only affordance exists anywhere.
  A floor that exists in CSS but is gated behind an attribute nothing sets is not a floor — 6.1 is what counts.
- **10** — The screen is genuinely operable one-handed without a grip change: the entire critical path
  (score increment, undo, next match) is reachable in the green thumb zone, targets on the primary scoring
  control are oversized well beyond the minimum, and the sticky score header never occludes content or steals
  scroll. Gestures (swipe, pull-to-refresh) are additive with visible equivalents, and long-press/haptic-class
  feedback exists where it maps to a real action.

---

### D7. State coverage — empty, loading, error, offline
*A screen that only exists in its happy state is a mockup, not a product.*

**Measure**

| # | Quantity | How |
| --- | --- | --- |
| 7.1 | Which of the four states exist for each panel that can legitimately reach them | drive them: `node audit.mjs <route> --empty`, kill the network, force an error path |
| 7.2 | Skeleton geometry delta: bounding box of each skeleton vs its loaded counterpart | shoot LOADING and LOADED at the same viewport and diff the boxes; target 0px |
| 7.3 | Equal-weight state headlines on one screen: count of empty/error headlines rendered at the top display step | read the full-page shot |
| 7.4 | Recovery: errors whose offered action is a retry rather than a navigation away | read each error state's action label |
| 7.5 | State copy measure: characters-per-line of deck and notice copy | D1's `cpl` expression restricted to state blocks |

- **5** — Loading is a spinner. Empty state is a line of gray text. Errors surface as a generic message or a
  console log. Offline behavior is undefined.
- **8** — Requires all of: **7.1 complete** — all four states designed in the Matchbook language, skeletons for
  content and spinners only for short discrete confirmations like save/auth (skeletons measurably reduce
  perceived wait; users rate a ~3s skeleton about the same as a ~1.5s spinner); **7.2 = 0px**; **7.3 ≤ 1** —
  a screen with seven equal-weight display headlines has no primary object and the state API must offer a
  quieter step; **7.4 = every error**; **7.5 inside 45–75**. Empty states state what is missing, why, and offer
  the single next action as a real button. Offline/stale data is visibly labeled rather than silently shown as fresh.
- **10** — States are *composed*, not bolted on: the empty state is a designed editorial object
  (masthead + rule + copy + action) that a first-time user would screenshot, partial/degraded states exist
  (some panels loaded, some not) and are handled per-panel rather than blocking the whole page, and optimistic
  updates roll back visibly and gracefully on failure.

---

### D8. Information hierarchy & scannability
*What does this screen answer, and can you tell in one second?*

**Measure**

| # | Quantity | How |
| --- | --- | --- |
| 8.1 | Primary-object count: elements rendered at the screen's top typographic rank, counting the device (face + weight + tracking + treatment), not just the size | D1's step census, grouped by device |
| 8.2 | Levels of hierarchy visible in one viewport | count distinct ranks in a single-viewport shot |
| 8.3 | Greyscale legibility of the ranking | full-page shot under `filter: grayscale(1)` |
| 8.4 | Truncated labels at desktop width | D4's `clipped` expression at 1440 |

- **5** — All panels have equal visual weight. The user can find things by reading labels. Titles are present
  and accurate.
- **8** — Requires all of: **8.1 = 1** — one unambiguous primary object; repeating the masthead device on nine
  headings means nine mastheads and no primary object, whatever the size difference between them;
  **8.2 ≤ 3**; **8.3 holds**; **8.4 = 0**. Everything below the primary is visibly subordinate through size,
  weight, and position — not through color alone. Grouping is explicit (panel heads, hairline rules, kickers).
  Scanning paths are honest: the first thing the eye lands on is the thing the screen is actually about.
  Secondary/tertiary data is demoted below the fold or behind a deliberate tap, following WHOOP's tier separation.
- **10** — The screen passes a five-second test with a stranger: they can state the primary answer and the next
  action without scrolling. Hierarchy is legible in a squint test and in grayscale. Progressive disclosure is
  structural — analysis genuinely lives on its own tier, not in a collapsed section on the same tier — and
  labels are editorial (short, uppercase, tabular) rather than form-field verbose.

---

### D9. Brand consistency with the Matchbook system
*One system, one voice, zero leakage from the old theme.*

**Measure**

| # | Quantity | How |
| --- | --- | --- |
| 9.1 | Pre-Matchbook classes rendering in the live DOM (`rounded-xl`, `bg-card`, `dark:`, `.glass-*`, `.soft-card`, `.playful-card`, `.scrollbar-thin`) | `[...document.querySelectorAll("*")].filter(e => /rounded-xl\|bg-card\|dark:\|glass-\|soft-card\|playful-card\|scrollbar-thin/.test(String(e.className))).map(e => e.tagName + "." + e.className)` |
| 9.2 | Icon sources: `MbIcon` count vs any other library vs emoji | `grep -rn "lucide\|heroicons\|react-icons" src/` and a Unicode-emoji scan of the rendered text |
| 9.3 | Font families resolving on the route | `node audit.mjs <route> --mobile` → `FONTS` census; a third family that is not in §2 of the design language is leakage |
| 9.4 | API surface: how many prop names express one concept across the kit's components | `grep -rn "variant\|tone\|actionTone\|triggerVariant" src/components/matchbook/` |
| 9.5 | New patterns introduced by this screen that were not generalized into `src/components/matchbook/*` or a `mb-*` utility | read the screen's own file for bespoke classes and hand-rolled controls |

- **5** — Uses `matchbook-surface` and some `mb-*` classes but mixes in leftover shadcn/`--primary`-era styling:
  rounded-xl cards, soft drop shadows, generic outline buttons, old red accents.
- **8** — Requires all of: **9.1 = 0**, including in components the screen composes — a Matchbook component
  applying a legacy class is leakage even when the class is scheduled for deletion elsewhere; **9.2**: icons
  come from `MbIcon`/the sprite only, zero emoji, zero second library; **9.3** shows only declared families;
  **9.4** shows one prop name per concept — four names for "how this button looks" is a system that does not
  yet enforce itself; **9.5 = 0** hand-rolled re-derivations of an existing primitive. Panels use `mb-panel`
  (heavy top border, hairline sides, 4px radius) or a documented sibling. Buttons come from `mb-btn*`. Tables
  come from `mb-table*`. The paper texture, crest, and lockup are used as specified in
  `public/assets/matchbook/README.md` and `manifest.json`. Any dialog/sheet is Matchbook-skinned, including
  its overlay, radius, and border weight.
- **10** — The screen extends the system correctly rather than merely conforming: any new pattern it introduces
  is generalized into `src/components/matchbook/*` or a `mb-*` utility in `globals.css`, is named consistently,
  and would be reusable by the next screen. Placed beside the already-shipped Overview, Teams and Compete pages,
  it is indistinguishable in authorship — same rule weights, same border radii, same tracking, same icon stroke.

---

### D10. Perceived performance
*How fast it feels, measured where possible.*

**Measure** — the 8 anchor here says "measured, not asserted"; §2.3 caps this dimension at 5 if the numbers
were not produced.

| # | Quantity | How |
| --- | --- | --- |
| 10.1 | INP for the primary interaction | `PerformanceObserver` on `event`/`first-input`, or `performance.now()` around the click→paint round trip; target ≤200ms |
| 10.2 | CLS | `new PerformanceObserver(l => …).observe({ type: "layout-shift", buffered: true })`; target ≤0.1 |
| 10.3 | Scrollport health: the document is the scroller, `window.scrollY` moves, the viewport is never blank after a scroll, and a real wheel does not bypass the window | `node audit.mjs <route> --desktop` → `SCROLLPORT` |
| 10.4 | Console and page errors | same run → `CONSOLE` |
| 10.5 | Layout-animating properties (the frame-rate proxy) | D5's `props.layout` |
| 10.6 | Build health | `npx tsc --noEmit && npx eslint src && npx vitest run` |

- **5** — Feels acceptable on desktop dev. No measurements taken. Some content pops in after load.
- **8** — Requires all of: **10.1 ≤ 200ms** (the Core Web Vitals "good" threshold; ~43% of sites fail it);
  **10.2 ≤ 0.1** — images carry explicit width/height, fonts are loaded to avoid reflow, and every async
  region has reserved space; **10.3 = 0 findings**; **10.4 = 0**; **10.5 = 0**; **10.6 clean**. Interactive
  feedback is visible in <100ms even when the network call is pending (optimistic UI where the action is safely
  reversible). No blocking full-screen spinner for content that could stream.
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
## VERDICT — <route> (<viewport(s) tested>) — phase <P#>, tree <git sha or "working tree at HH:MM">

### IN-SCOPE INVENTORY
<what this screen is scheduled to contain at this phase — §2.2 step 1>

| # | Dimension                              | Score | Evidence |
|---|----------------------------------------|-------|----------|
| 1 | Typographic craft                      | x/10  | <measured quantity first, then the reading. Prefix `UNMEASURED — ` if the Measure block was not run; that caps the score at 5> |
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

### SCHEDULED ABSENCES
- <component or behaviour> — owned by <workstream>/<phase>. Noted, not scored (§2.2).
(or: "None.")

### HARD FAILS
- [HF-<n>] <name> — <where, exactly: file:line or selector, and what was observed>
(or: "None." — only if every item in section 3 was actually checked)

### RESULT: PASS | FAIL

### REQUIRED FIXES (ordered by severity)
1. <imperative, specific, actionable — names the file and the change>
2. ...

### MEASUREMENTS NOT TAKEN
- <Measure row id> — <why>. The dimension it feeds is capped at 5 per §2.3.
(or: "None — every Measure block was run on this tree.")
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
- **Measure, then judge — never the reverse.** Each dimension's Measure block defines what "the number" is.
  A dimension you did not measure is `UNMEASURED`, capped at 5 (§2.3); it is never a 6 with a caveat.
- **Score the work, not the schedule.** A component a later workstream owns goes in SCHEDULED ABSENCES and
  does not move a score (§2.2). A component that exists and is wrong is always scored, whoever owns it.
- **Two critics who measure the same quantity and disagree have a tree problem, not a rubric problem.**
  Re-run on the same tree with the same command. Do not average, and do not adopt a sibling's number.

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
