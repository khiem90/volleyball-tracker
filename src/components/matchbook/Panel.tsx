import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import {
  MbButton,
  MbButtonLink,
  type MbButtonSize,
  type MbButtonVariant,
} from "./Button";
import { MbIcon } from "./MbIcon";
import { MbTeamName } from "./TeamName";
import type { MbFormResult, MbTeam } from "./types";

export const Panel = ({
  title,
  action,
  href,
  icon,
  meta,
  tone = "paper",
  children,
  className = "",
}: {
  title: string;
  action?: string;
  href?: string;
  /** Sprite icon id shown before the title. */
  icon?: string;
  /** Right-aligned header content used when there is no link action. */
  meta?: React.ReactNode;
  tone?: "paper" | "navy";
  children: React.ReactNode;
  className?: string;
}) => {
  const navy = tone === "navy";
  return (
    <section className={`mb-panel ${className}`}>
      <header
        className={
          navy
            ? "flex items-center justify-between gap-3 bg-mb-navy px-4 py-2.5 text-mb-paper-bright"
            : "mb-panel-head"
        }
      >
        <h2 className="matchbook-display flex items-center gap-2 text-[0.95rem] mb-track-title font-bold">
          {icon && <MbIcon id={icon} size={16} className={navy ? "text-mb-gold" : ""} />}
          {title}
        </h2>
        {href && action ? (
          <Link href={href} className="mb-panel-link">
            {action}
            <MbIcon id="chevron-right" size={11} />
          </Link>
        ) : (
          meta
        )}
      </header>
      {children}
    </section>
  );
};

export const Crest = ({ team, size = 26 }: { team: MbTeam; size?: number }) => (
  <Image
    src={team.crest}
    alt=""
    width={size}
    height={Math.round(size * (112 / 96))}
    className="shrink-0"
  />
);

/** Named crest steps. Numeric sizes stay supported — `md` is the historic default. */
export type TeamMarkSize = "sm" | "md" | "lg";

/* Each step carries its TRACKING as well as its size, and that is the single
   highest-count fix in the type sweep. `TeamMark` composes
   `matchbook-display font-semibold ${nameClass}` — the size arrives from here
   while the class string is written there, so no call site ever declared the
   rung and every team name in the app fell through to `.matchbook-display`'s
   0.02em default. Measured at 1440 that was 358 rendered nodes reading 0.02em
   at 0.72rem/600 against `.mb-panel-link`'s 0.04em at the same step — the
   largest single (size, weight) tracking collision on the screen, from one
   two-line map. `sm` is 0.72rem, whose rung `.mb-panel-link` pins to 0.04em;
   `md` and `lg` are 0.82/0.9rem, whose rung is the 0.02em base. */
const TEAM_MARK_STEPS: Record<TeamMarkSize, { crest: number; name: string }> = {
  sm: { crest: 18, name: "text-[0.72rem] mb-track-link" },
  md: { crest: 24, name: "text-[0.82rem] mb-track-display" },
  lg: { crest: 34, name: "text-[0.9rem] mb-track-display" },
};

/**
 * How the name behaves when the column is narrower than the name.
 *
 * The single-line default is `MbTeamName`, not `truncate`. Both paint one line
 * with one ellipsis; `MbTeamName` puts the ellipsis in the MIDDLE so the last
 * token survives. That is the F15 fix and it belongs here rather than at three
 * call sites: measured at 1440 on `/competitions/s-se-13`, end-truncation
 * rendered "Wolverhampton Wanderers Athletic Club B" and "…Club C" as the same
 * string in the bracket (93px box), the schedule row (188px) and the standings
 * cell (162px) — three surfaces on which two different teams were one team.
 *
 * `wrap` stays for the places that are *about* the identity — the scoreboard —
 * where a taller block beats any ellipsis at all: "Northwest Kalamazoo
 * Thunderhawks Academy" and "Northside Community Volleyball Association" share
 * no trailing token, so no elision saves them and only the full name does.
 *
 * `anywhere`, not `break-word`: only `anywhere` also shrinks min-content, and
 * these names sit in `1fr` grid cells that are sized by their longest word.
 */
const WRAP_NAME = "[overflow-wrap:anywhere]";

/* ---------------------------------------------------------------------------
   THE MARK'S OWN CEILING (R2)

   `min-w-0` says "I may shrink". It does not say "I may not be wider than my
   box", and those are different promises — `min-width` sets a FLOOR, and the
   thing that was breaking pages is a CEILING that nobody had written.

   A `truncate` box's min-content size is its whole string: `white-space:
   nowrap` is unbreakable and no `overflow` value lowers a block's intrinsic
   size. So `MbTeamName`'s min-content is the full name, and a mark that is
   `justify-self: start` / `end` in a grid area is sized `fit-content` =
   `min(max-content, max(MIN-CONTENT, area))` — which for a long name is
   min-content, i.e. the whole name, whatever the area says. Measured on
   `/quick-match` at 320 with a 39-character roster:

     Recent Quick Matches row  grid area 59.6px, TeamMark 280.9px
                               (min-content 280.9, so fit-content never bit)
     row                       286px wide, 361px of content
     document                  documentElement.scrollWidth 378 vs 320
     bottom nav                stretched to 378: 0px of the 57px bar visible,
                               all five cells failing `elementFromPoint`

   `max-w-full` is the ceiling. Percentages resolve against the containing
   block, which is the grid area or the flex line the mark was handed, so the
   used width is clamped to the box even when the intrinsic floor is not — and
   the elision inside then has a reason to fire. Measured after, same viewport
   and roster: 320 vs 320, bar 57px, five of five cells hittable.

   It belongs HERE and not at the call sites, because "a team mark is never
   wider than the box it is given" is a property of the mark. The three call
   sites that hit this — `/quick-match`'s results row, `/`'s scoreline, the
   directory — had each been patched separately and a fourth was one long name
   away.

   It is inert wherever the mark already fits, which is every width above a
   phone: `max-width` only ever removes pixels a box was not entitled to.
   --------------------------------------------------------------------------- */
const MARK_CEILING = "max-w-full";

export const TeamMark = ({
  team,
  size = 24,
  reverse = false,
  orientation = "horizontal",
  accent,
  wrap = false,
  className = "",
}: {
  team: MbTeam;
  /** Crest height in px, or a named step: `sm` 18 / `md` 24 / `lg` 34. */
  size?: number | TeamMarkSize;
  /** Mirrors the mark for the away side of a scoreline. */
  reverse?: boolean;
  orientation?: "horizontal" | "vertical";
  /**
   * The team colour, rendered as a 3px bar only — beside the crest when
   * horizontal, under the name when vertical. Never a fill, never a tint on
   * the crest, never a panel background (charter D-9).
   */
  accent?: string;
  /** Wrap the name over as many lines as it needs instead of truncating it. */
  wrap?: boolean;
  className?: string;
}) => {
  // Narrow on `size` itself, not on a derived variable — TypeScript only carries
  // the narrowing through the expression that tested it.
  const crestSize = typeof size === "number" ? size : TEAM_MARK_STEPS[size].crest;
  const nameClass =
    typeof size === "number"
      ? "text-[0.82rem] mb-track-display"
      : TEAM_MARK_STEPS[size].name;

  if (orientation === "vertical") {
    return (
      <span
        className={`inline-flex flex-col items-center gap-1.5 min-w-0 ${MARK_CEILING} ${
          reverse ? "flex-col-reverse" : ""
        } ${className}`}
      >
        <Crest team={team} size={crestSize} />
        <span className="flex flex-col items-center gap-1 min-w-0 max-w-full">
          {wrap ? (
            <span
              className={`matchbook-display font-semibold ${nameClass} ${WRAP_NAME} w-full max-w-full text-center`}
            >
              {team.name}
            </span>
          ) : (
            <MbTeamName
              name={team.name}
              className={`matchbook-display font-semibold ${nameClass} max-w-full`}
            />
          )}
          {accent && (
            <span
              className="block h-[3px] w-full"
              style={{ background: accent }}
            />
          )}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 min-w-0 ${MARK_CEILING} ${
        reverse ? "flex-row-reverse" : ""
      } ${className}`}
    >
      {accent ? (
        <span
          className={`inline-flex items-center gap-1.5 shrink-0 ${
            reverse ? "flex-row-reverse" : ""
          }`}
        >
          <span
            className="block w-[3px] self-stretch"
            style={{ background: accent }}
          />
          <Crest team={team} size={crestSize} />
        </span>
      ) : (
        <Crest team={team} size={crestSize} />
      )}
      {wrap ? (
        <span className={`matchbook-display font-semibold ${nameClass} ${WRAP_NAME}`}>
          {team.name}
        </span>
      ) : (
        <MbTeamName
          name={team.name}
          className={`matchbook-display font-semibold ${nameClass}`}
        />
      )}
    </span>
  );
};

/* ---------------------------------------------------------------------------
   THE FORM GUIDE

   ONE device, because there was never a second thing to say. The app used to
   draw a W/L run two ways: `FormSquares`, an 11x11 block with no letterform,
   and `FormLetters`. Measured on the running app:

     FormSquares  W `--mb-green`      relative luminance 0.186
                  L `--mb-red`                           0.171   → 1.07:1
     FormLetters  W `--mb-green-ink`                     0.147
                  L `--mb-red`                           0.171   → 1.12:1

   1.07:1 is one flat grey. The square carried no letter, no border difference
   and no `title`, so on a desaturated capture of `/teams` the whole Status
   column read as an identical run of blocks — invariant 13, and the most
   repeated status device in the app. The letters cut was barely better: the
   two grounds are 1.12:1 apart, so a 9.28px letterform was the entire second
   channel.

   A result now differs THREE ways at once, none of them hue:

     FILL vs VOID   W is a solid cell, L a ruled outline on bright paper. The
                    two grounds are 0.147 vs 0.960 — 5.13:1 — so the run reads
                    as a rhythm of dark and light blocks in greyscale, scanned
                    rather than read. That is the property `FormSquares`
                    claimed and never had, and it is the same filled/hollow
                    vocabulary `ResultMark` on `/quick-match` already ships.
     LETTERFORM     W and L, at the 9.28px/700 the letters cut already set.
     WORDS          an `sr-only` sentence naming the run in order, because a
                    strip of one-letter spans is not a sentence to a screen
                    reader — it is read out "W L L W W".

   Ink is measured against the ground it is actually on, not the page behind
   it: `--mb-paper-bright` on `--mb-green-ink` is 5.13:1, `--mb-red` on
   `--mb-paper-bright` is 4.58:1. Both clear the 4.5:1 floor this size demands,
   and the L cell states its own ground rather than inheriting it, because on
   `--mb-paper` the same red would measure 4.20:1 and fail.

   Both cells carry a 1px border — the W's is its own fill — so the two states
   are the same 14x14 box and a W→L swap moves nothing.
   --------------------------------------------------------------------------- */

/* `display/badge-label`'s SIZE (0.6rem — it was 0.58rem, which is not a step)
   but not its tracking, and that is the numeral rule one level down.
   `globals.css` declares `letter-spacing: normal` on `.mb-score-box`,
   `.mb-stepper-value` and `.mb-numeral` because tracking is added after the
   LAST glyph as well as between glyphs, so a single centred character in a
   fixed reserve is pushed off its own centre by the whole letter-space. A W in
   a 14px cell at the badge rung's 0.22em carries 2.11px of trailing air and
   sits 1.05px left of centre — 7% of the mark, five times across a form run.
   This is a MARK, not a word, and the ladder tracks words. */
const FORM_CELL =
  "matchbook-display inline-flex h-[14px] w-[14px] items-center justify-center rounded-[2px] border text-[0.6rem] mb-track-numeral font-bold";

const FORM_STYLE: Record<MbFormResult, CSSProperties> = {
  W: {
    background: "var(--mb-green-ink)",
    borderColor: "var(--mb-green-ink)",
    color: "var(--mb-paper-bright)",
  },
  L: {
    background: "var(--mb-paper-bright)",
    borderColor: "var(--mb-red)",
    color: "var(--mb-red)",
  },
};

const FORM_WORD: Record<MbFormResult, string> = { W: "won", L: "lost" };

/** 14px cells, `gap-[3px]` apart: the width a run of `slots` results occupies. */
const formRunWidth = (slots: number) => slots * 14 + (slots - 1) * 3;

export const FormLetters = ({
  form,
  slots,
}: {
  form: MbFormResult[];
  /**
   * Reserve the width of `slots` results so a table column keeps one width
   * whatever the run length. A *reservation*, not padding: an unplayed match
   * draws nothing at all. `FormSquares` used to paint `slots` blank cells, and
   * its default was eight against a `recentForm()` that returns at most five —
   * three permanently dead cells in every row of every form column in the app.
   * Runs are right-ranged inside the reservation, which is what
   * `MbStandingsTable` already does with its own 78px box (= `slots={5}`).
   */
  slots?: number;
}) => (
  <span
    className="inline-flex items-center justify-end"
    style={slots ? { minWidth: formRunWidth(slots) } : undefined}
  >
    <span className="sr-only">
      {form.length === 0
        ? "No matches played yet"
        : `Recent form, oldest first: ${form.map((r) => FORM_WORD[r]).join(", ")}.`}
    </span>
    <span aria-hidden="true" className="inline-flex items-center gap-[3px]">
      {form.length === 0 ? (
        <span className="text-[0.72rem] text-mb-ink-muted">—</span>
      ) : (
        form.map((r, i) => (
          <span key={i} className={FORM_CELL} style={FORM_STYLE[r]}>
            {r}
          </span>
        ))
      )}
    </span>
  </span>
);

/**
 * @deprecated There is no separate square cut any more — this IS `FormLetters`,
 * and every call site in `panels.tsx` / `teamPanels.tsx` now says so. The alias
 * survives for one caller outside this slice,
 * `components/competitions/new/TeamsStep.tsx`, which passes `slots={5}` and
 * gets the identical render. Fold it in when that file is next opened.
 */
export const FormSquares = FormLetters;

/**
 * In-panel state tones. `MbEmptyState` covers the page-level equivalent;
 * `PanelError` / `PanelOffline` / `PanelDenied` are retired in favour of these
 * (charter D-7, Appendix B).
 */
export type PanelEmptyTone =
  | "empty"
  | "notfound"
  | "error"
  | "offline"
  | "denied"
  | "unconfigured";

export interface MbStateToneMeta {
  /** Sprite id, or `null` when the state carries no mark. */
  icon: string | null;
  /** Eyebrow word, or `null` when the state stays unlabelled. */
  word: string | null;
  /**
   * Ink for the **glyph only**. The word itself stays `.mb-kicker` muted, so a
   * tone is never carried by small coloured letterforms (invariant 12).
   */
  ink: string;
}

/**
 * One tone table for both scales. `MbEmptyState` imports this table rather than
 * restating it, so the page-level and in-panel cuts of a state cannot drift into
 * two different glyphs or two different words for one concept.
 *
 * `empty` stays iconless and unlabelled — design language §5.7 keeps ordinary
 * empty states plain. The five failure tones name themselves in words and mark
 * themselves with a glyph, so the state never rests on colour alone.
 */
export const MB_STATE_TONES: Record<PanelEmptyTone, MbStateToneMeta> = {
  empty: { icon: null, word: null, ink: "text-mb-navy" },
  notfound: { icon: "search", word: "Not found", ink: "text-mb-navy" },
  error: { icon: "warning", word: "Error", ink: "text-mb-red" },
  offline: { icon: "wifi-off", word: "Offline", ink: "text-mb-gold-ink" },
  denied: { icon: "lock", word: "No access", ink: "text-mb-navy" },
  unconfigured: { icon: "settings", word: "Not set up", ink: "text-mb-ink-muted" },
};

/**
 * The shipped copy rule is `No <things> exist yet — <what makes them appear>.`
 * (design language §5.7), so the em dash is already an editorial break: the
 * clause before it names the state, the clause after it explains it. Splitting
 * there turns every one of the ~35 shipped messages into a display headline and
 * a deck **without one call site changing**.
 *
 * Past `HEADLINE_MAX_CHARS` the lead is prose, not a headline, and keeps the
 * whole string as copy. 60 is measured, not guessed: the display step runs
 * ~22 characters per line in a `xl:col-span-4` panel body (419px of inner
 * width), so 60 is the last length that still sets in three lines. It clears
 * the longest shipped lead (`Saved formations could not be loaded right now`,
 * 45) and the filter miss (`No teams match “northside community volleyball”`,
 * 47) while still refusing a 156-character error sentence with no break in it.
 */
const HEADLINE_MAX_CHARS = 60;

/**
 * Opens the deck as a sentence.
 *
 * The split promotes a *subordinate clause* to a standalone paragraph, and the
 * shipped copy was written to follow an em dash, so every one of the ~35
 * messages arrives lower-case: the deck read "add your first team to start the
 * directory." under its own headline, six times on /teams and six on
 * /competitions. Once it is set as its own block it is its own sentence and
 * takes a capital.
 *
 * It walks to the first *cased* character rather than touching index 0, so a
 * deck that opens on a quote (`No teams match “northside…” — try a different
 * search.`) or a bracket still capitalises the word and not the punctuation,
 * and a deck that already opens on a capital — a product name — is returned
 * untouched.
 */
const openSentence = (deck: string): string => {
  for (let i = 0; i < deck.length; i += 1) {
    const char = deck[i];
    const upper = char.toUpperCase();
    if (upper !== char) return deck.slice(0, i) + upper + deck.slice(i + 1);
    if (char.toLowerCase() !== char) return deck;
  }
  return deck;
};

export const splitStateMessage = (
  message: string
): { headline: string | null; copy: string | null } => {
  const dash = message.indexOf("—");
  const lead = (dash === -1 ? message : message.slice(0, dash)).trim();
  const tail = dash === -1 ? "" : message.slice(dash + 1).trim();
  const deck = tail ? openSentence(tail) : null;
  if (!lead || lead.length > HEADLINE_MAX_CHARS) {
    return { headline: null, copy: message };
  }
  // A display line never carries a full stop; the deck below it keeps its own.
  return { headline: lead.replace(/\.$/, ""), copy: deck };
};

/**
 * The two sizes the one state language is drawn at: `panel` for a panel with
 * nothing in it, `route` for a whole route with nothing in it.
 */
export type MbStateScale = "panel" | "route";

interface MbStateScaleSpec {
  /** Padding and row gap of the block itself. */
  block: string;
  /** Display-line step and measure. */
  display: string;
  /** Hung-rule width. */
  rule: string;
  /** Deck step and measure. */
  deck: string;
  /**
   * Eyebrow glyph, in px. The same number at both scales **on purpose** —
   * design language §5.7 gives the two cuts two numbers on the display line,
   * the rule and the action, and on nothing else, so the eyebrow is one object
   * drawn once.
   */
  glyph: number;
  /** Step of the single action. */
  button: MbButtonSize;
}

/**
 * §5.7's size table, as code. This is the *entire* difference between a
 * route-level state and a panel-level one — everything else is `MbStateBlock`
 * below, rendered from the same JSX for both. If the two cuts are ever to drift
 * again, they have to drift here, in eight lines, in view of each other.
 */
export const MB_STATE_SCALE: Record<MbStateScale, MbStateScaleSpec> = {
  panel: {
    block: "gap-2.5 px-4 py-5",
    display: "max-w-[26ch] text-[1.2rem]",
    rule: "w-10",
    deck: "max-w-[42ch] text-[0.85rem] leading-[1.5]",
    glyph: 13,
    button: "sm",
  },
  route: {
    block: "gap-3 px-5 py-7 sm:px-7 sm:py-9",
    display: "max-w-[22ch] text-[1.875rem]",
    rule: "w-16",
    deck: "max-w-[46ch] text-[0.9rem] leading-[1.55]",
    glyph: 13,
    button: "lg",
  },
};

/**
 * The one state language, drawn once. `PanelEmpty` and `MbEmptyState` are both
 * thin wrappers over this: they differ in the props they accept (a message
 * string and one action vs a title, a deck and an action list) and in which row
 * of `MB_STATE_SCALE` they pass, and in nothing that is visible.
 *
 * Anatomy, top to bottom, every part ranged **left**:
 * eyebrow (glyph + word) · display line · hung rule · deck · action.
 *
 * It is deliberately *not* a centred glyph-in-a-circle over centred text: that
 * is the layout the rubric's §3 hard-fail 5 names outright ("would look
 * identical for a CRM"), and it is what `PanelEmpty` drew before P1.
 */
export const MbStateBlock = ({
  scale,
  tone,
  icon,
  headline,
  deck,
  action,
}: {
  scale: MbStateScale;
  tone: PanelEmptyTone;
  /** Sprite id overriding the tone's default mark. */
  icon?: string;
  headline?: ReactNode;
  deck?: ReactNode;
  /** The action row, built by the caller at `MB_STATE_SCALE[scale].button`. */
  action?: ReactNode;
}) => {
  const step = MB_STATE_SCALE[scale];
  const state = MB_STATE_TONES[tone];
  const mark = icon ?? state.icon;
  /* The rule *hangs* — it closes a naming zone rather than opening the block, so
     it only draws when there is something above it to close. The one input that
     produces neither is a plain `empty` whose message is a single unbreakable
     sentence over 60 characters. */
  const named = Boolean(mark || state.word || headline);

  /* `overflow-wrap: anywhere`, inherited by the headline and the deck.
     `globals.css` already grants exactly this through `.mb-panel[data-tone] p`,
     but that selector needs the `data-tone` to sit on the `.mb-panel` itself,
     which only happens at route scale — `MbEmptyState` owns its sheet, whereas
     `PanelEmpty` is nested inside somebody else's plain `Panel`. Measured at
     390px with one 52-character unbroken token in both cuts: the route block
     stayed at its 340px container, the panel block scrolled to 391px. Declaring
     it here fixes the panel cut and makes the two behave identically, which is
     the point of there being one block. `anywhere` rather than `break-word`
     because only `anywhere` also shrinks min-content, and this block is a flex
     item that is sized by its longest word. */
  return (
    <div
      className={`flex flex-1 flex-col items-start justify-center text-left [overflow-wrap:anywhere] ${step.block}`}
    >
      {(mark || state.word) && (
        <span className="mb-kicker flex min-w-0 items-center gap-1.5">
          {mark && <MbIcon id={mark} size={step.glyph} className={`shrink-0 ${state.ink}`} />}
          {state.word && <span className="truncate">{state.word}</span>}
        </span>
      )}
      {/* `text-balance`, because the hung rule below is what makes an orphan
          expensive here: the rule closes the naming zone, so when the display
          line drops its last word alone the 40px rule sits under a single word
          instead of under a block. Measured at 1440: "No upcoming matches exist
          yet" set 4 words + 1 and "No match of the day exists yet" set 6 + 1.
          Balance is the right tool rather than a `<wbr>` or a nbsp because the
          copy is passed in by ~35 call sites and none of them can be edited
          from here. */}
      {headline && (
        <p
          className={`matchbook-display text-balance mb-track-display font-bold leading-tight ${step.display}`}
        >
          {headline}
        </p>
      )}
      {named && <span className={`block h-px bg-mb-navy ${step.rule}`} />}
      {/* A `<p>`, not a `<div>`, even though `deck` is a `ReactNode`: it is the
          element `globals.css` targets for the same wrap defence, and callers
          pass phrasing content (a sentence, sometimes with a `<span>` around a
          count). Block-level children would be invalid nesting here. */}
      {deck && <p className={`text-mb-ink-muted ${step.deck}`}>{deck}</p>}
      {action}
    </div>
  );
};

/**
 * The in-panel cut. Everything visible comes from `MbStateBlock`; this wrapper
 * only turns the shipped one-sentence message into a headline and a deck, and
 * builds the single action.
 */
export const PanelEmpty = ({
  message,
  actionLabel,
  href,
  tone = "empty",
  icon,
  variant = "outline-navy",
  onAction,
}: {
  message: string;
  actionLabel?: string;
  href?: string;
  /** Defaults to `empty`: no glyph, no eyebrow — just the editorial block. */
  tone?: PanelEmptyTone;
  /** Sprite id overriding the tone's default mark. */
  icon?: string;
  /**
   * The single action's `.mb-btn` variant. Defaults to the quiet neutral
   * outline, because a panel-level state is never the screen's primary job —
   * invariant 15 gives coral one appearance per screen, and three empty panels
   * used to spend it three times over. Coral is opt-in: `variant="coral"`.
   */
  variant?: MbButtonVariant;
  /** Renders a real `<button>` instead of a link. Takes precedence over `href`. */
  onAction?: () => void;
}) => {
  const { headline, copy } = splitStateMessage(message);
  const size = MB_STATE_SCALE.panel.button;

  return (
    <MbStateBlock
      scale="panel"
      tone={tone}
      icon={icon}
      headline={headline}
      deck={copy}
      action={
        actionLabel &&
        (onAction ? (
          <MbButton variant={variant} size={size} onClick={onAction}>
            {actionLabel}
          </MbButton>
        ) : href ? (
          /* A destination is a real anchor — it keeps middle-click, "open in new
             tab" and the status bar — and `MbButtonLink` draws it from the same
             three tables as the button above, so the two branches are one box. */
          <MbButtonLink variant={variant} size={size} href={href}>
            {actionLabel}
          </MbButtonLink>
        ) : null)
      }
    />
  );
};
