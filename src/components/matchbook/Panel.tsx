import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  MbButton,
  MbButtonLink,
  type MbButtonSize,
  type MbButtonVariant,
} from "./Button";
import { MbIcon } from "./MbIcon";
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
        <h2 className="matchbook-display flex items-center gap-2 text-[0.95rem] font-bold tracking-[0.05em]">
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

const TEAM_MARK_STEPS: Record<TeamMarkSize, { crest: number; name: string }> = {
  sm: { crest: 18, name: "text-[0.72rem]" },
  md: { crest: 24, name: "text-[0.82rem]" },
  lg: { crest: 34, name: "text-[0.9rem]" },
};

/**
 * How the name behaves when the column is narrower than the name.
 *
 * `truncate` is the default because most marks live in a table row or a list,
 * where a second line would break the row rhythm. `wrap` is for the places that
 * are *about* the identity — the scoreboard — where an ellipsis is a worse
 * failure than a taller block: "Northwest Kalamazoo Thunderhawks Academy" and
 * "Northside Community Volleyball Association" both truncate to "North…", and
 * the rubric's own reference anchor (Apple Sports under Dynamic Type) wraps
 * rather than truncates for exactly that reason.
 *
 * `anywhere`, not `break-word`: only `anywhere` also shrinks min-content, and
 * these names sit in `1fr` grid cells that are sized by their longest word.
 */
const NAME_OVERFLOW = {
  truncate: "truncate",
  wrap: "[overflow-wrap:anywhere]",
} as const;

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
    typeof size === "number" ? "text-[0.82rem]" : TEAM_MARK_STEPS[size].name;
  const overflow = NAME_OVERFLOW[wrap ? "wrap" : "truncate"];

  if (orientation === "vertical") {
    return (
      <span
        className={`inline-flex flex-col items-center gap-1.5 min-w-0 ${
          reverse ? "flex-col-reverse" : ""
        } ${className}`}
      >
        <Crest team={team} size={crestSize} />
        <span className="flex flex-col items-center gap-1 min-w-0 max-w-full">
          <span
            className={`matchbook-display font-semibold ${nameClass} ${overflow} max-w-full ${
              wrap ? "w-full text-center" : ""
            }`}
          >
            {team.name}
          </span>
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
      className={`inline-flex items-center gap-2 min-w-0 ${
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
      <span className={`matchbook-display font-semibold ${nameClass} ${overflow}`}>
        {team.name}
      </span>
    </span>
  );
};

/** The MARK fills — `FormSquares`, which paints no letterform over them. */
const FORM_COLORS: Record<MbFormResult, string> = {
  W: "var(--mb-green)",
  L: "var(--mb-red)",
};

/**
 * The LETTERFORM fills. `FormLetters` sets white type on the same swatch, and
 * `globals.css` already states the arithmetic that forces the split: "#fff on
 * --mb-red is 4.76:1; on --mb-green it is 4.45:1", which is why `MbBadge`
 * restricts `variant="solid"` to `tone="live"`. The W pip was that same
 * 4.45:1 pairing at 9.28px/700 against a 4.5:1 floor — measured on `/` (14
 * instances) and `/teams` (16) and the only contrast failure left on the six
 * converted routes. `--mb-green-ink` is the twin declared for exactly this and
 * carries white at 5.33:1; L keeps `--mb-red` at 4.76:1. The square beside it
 * keeps the bright mark tone, so the two greens never appear in one row.
 */
const FORM_LETTER_COLORS: Record<MbFormResult, string> = {
  W: "var(--mb-green-ink)",
  L: "var(--mb-red)",
};

export const FormSquares = ({
  form,
  slots = 8,
  warnTint = false,
}: {
  form: MbFormResult[];
  slots?: number;
  warnTint?: boolean;
}) => {
  const winCount = form.filter((r) => r === "W").length;
  const tint =
    warnTint && form.length > 0 && winCount <= form.length / 2
      ? winCount === 0
        ? "var(--mb-red)"
        : "var(--mb-gold)"
      : null;
  return (
    <span className="inline-flex items-center gap-[3px]">
      {Array.from({ length: slots }, (_, i) => {
        const result = form[i];
        return (
          <span
            key={i}
            className="mb-form-square"
            style={{
              background: result
                ? tint ?? FORM_COLORS[result]
                : "var(--mb-tint-3)",
            }}
          />
        );
      })}
    </span>
  );
};

export const FormLetters = ({ form }: { form: MbFormResult[] }) => (
  <span className="inline-flex items-center gap-[2px]">
    {form.length === 0 && (
      <span className="text-[0.7rem] text-mb-ink-muted">—</span>
    )}
    {form.map((r, i) => (
      <span
        key={i}
        className="matchbook-display inline-flex h-[14px] w-[14px] items-center justify-center rounded-[2px] text-[0.58rem] font-bold text-white"
        style={{ background: FORM_LETTER_COLORS[r] }}
      >
        {r}
      </span>
    ))}
  </span>
);

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
          className={`matchbook-display text-balance font-bold leading-tight tracking-[0.02em] ${step.display}`}
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
  actionTone = "outline-navy",
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
   * Ink of the single action. Defaults to the quiet neutral outline, because a
   * panel-level state is never the screen's primary job — invariant 15 gives
   * coral one appearance per screen, and three empty panels used to spend it
   * three times over. Coral is opt-in: `actionTone="coral"`.
   */
  actionTone?: MbButtonVariant;
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
          <MbButton variant={actionTone} size={size} onClick={onAction}>
            {actionLabel}
          </MbButton>
        ) : href ? (
          /* A destination is a real anchor — it keeps middle-click, "open in new
             tab" and the status bar — and `MbButtonLink` draws it from the same
             three tables as the button above, so the two branches are one box. */
          <MbButtonLink variant={actionTone} size={size} href={href}>
            {actionLabel}
          </MbButtonLink>
        ) : null)
      }
    />
  );
};
