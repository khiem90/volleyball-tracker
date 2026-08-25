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

/* Each step carries its TRACKING as well as its size, so every team name in
   the app lands on the rung for its size instead of falling through to
   `.matchbook-display`'s default. */
const TEAM_MARK_STEPS: Record<TeamMarkSize, { crest: number; name: string }> = {
  sm: { crest: 18, name: "text-[0.72rem] mb-track-link" },
  md: { crest: 24, name: "text-[0.82rem] mb-track-display" },
  lg: { crest: 34, name: "text-[0.9rem] mb-track-display" },
};

/**
 * The single-line default is `MbTeamName`, not `truncate`: it puts the
 * ellipsis in the MIDDLE so the last token survives — end-truncation renders
 * "…Club B" and "…Club C" as the same string. `wrap` stays for surfaces that
 * are ABOUT the identity (the scoreboard), where only the full name works.
 * `anywhere`, not `break-word`: only `anywhere` also shrinks min-content, and
 * these names sit in `1fr` grid cells sized by their longest word.
 */
const WRAP_NAME = "[overflow-wrap:anywhere]";

/* The mark's own ceiling. `min-w-0` only sets a floor; a `truncate` box's
   min-content is its whole string (`nowrap` is unbreakable), so a
   `justify-self` mark in a grid area sizes to the full name whatever the area
   says — wide enough to stretch the document and push the bottom nav off
   screen. `max-w-full` clamps the used width to the containing block, giving
   the elision a reason to fire; inert wherever the mark already fits. */
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
   THE FORM GUIDE — one device. A result differs three ways at once, none hue:
   FILL vs VOID (W solid, L ruled outline — survives greyscale), the W/L
   letterform, and an sr-only sentence naming the run in order (a strip of
   one-letter spans reads out "W L L W W"). The L cell states its own ground
   rather than inheriting it: the same red fails 4.5:1 on `--mb-paper`. Both
   cells carry a 1px border — the W's is its own fill — so the two states are
   the same 14x14 box and a W→L swap moves nothing.
   --------------------------------------------------------------------------- */

/* Badge size but numeral (normal) tracking: tracking is added after the LAST
   glyph too, so a single centred character in a fixed reserve is pushed off
   its own centre by the whole letter-space. This is a mark, not a word. */
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
   * draws nothing at all, and runs are right-ranged inside it.
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
 * @deprecated This IS `FormLetters`. The alias survives for one caller,
 * `components/competitions/new/TeamsStep.tsx`; fold it in when that file is
 * next opened.
 */
export const FormSquares = FormLetters;

/** In-panel state tones. `MbEmptyState` covers the page-level equivalent. */
export type PanelEmptyTone =
  | "empty"
  | "notfound"
  | "error"
  | "offline"
  | "denied"
  | "unconfigured"
  | "stale";

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
 * One tone table for both scales — `MbEmptyState` imports it rather than
 * restating it, so the two cuts of a state cannot drift. `empty` stays
 * iconless and unlabelled; the failure tones name themselves in words and a
 * glyph, so a state never rests on colour alone.
 */
export const MB_STATE_TONES: Record<PanelEmptyTone, MbStateToneMeta> = {
  empty: { icon: null, word: null, ink: "text-mb-navy" },
  notfound: { icon: "search", word: "Not found", ink: "text-mb-navy" },
  error: { icon: "warning", word: "Error", ink: "text-mb-red" },
  offline: { icon: "wifi-off", word: "Offline", ink: "text-mb-gold-ink" },
  denied: { icon: "lock", word: "No access", ink: "text-mb-navy" },
  unconfigured: { icon: "settings", word: "Not set up", ink: "text-mb-ink-muted" },
  /* `stale` is `offline`'s sibling, not a fifth failure: the data EXISTS and
     is merely not fresh. Gold "degraded, not broken" ink, and the same refresh
     glyph `MbLiveStatus` gives `reconnecting`. */
  stale: { icon: "refresh", word: "Couldn't refresh", ink: "text-mb-gold-ink" },
};

/**
 * The shipped copy rule is `No <things> exist yet — <what makes them appear>.`
 * so the em dash is already an editorial break: splitting there turns every
 * shipped message into a display headline and a deck without one call site
 * changing. Past `HEADLINE_MAX_CHARS` the lead is prose, not a headline, and
 * keeps the whole string as copy; 60 is the last length that still sets in
 * three display lines in a 4-col panel body.
 */
const HEADLINE_MAX_CHARS = 60;

/**
 * Opens the deck as a sentence: the split promotes a subordinate clause to a
 * standalone paragraph, so it arrives lower-case and takes a capital. Walks to
 * the first *cased* character rather than touching index 0, so a deck opening
 * on a quote or bracket capitalises the word, and one already opening on a
 * capital is returned untouched.
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
  /** Eyebrow glyph, in px. The same number at both scales on purpose — the
   *  eyebrow is one object drawn once. */
  glyph: number;
  /** Step of the single action. */
  button: MbButtonSize;
}

/**
 * The *entire* difference between a route-level state and a panel-level one —
 * everything else is `MbStateBlock` below, rendered from the same JSX for
 * both. If the two cuts drift, they drift here, in view of each other.
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
 * The one state language, drawn once — `PanelEmpty` and `MbEmptyState` are
 * both thin wrappers over this. Anatomy, top to bottom, every part ranged
 * left: eyebrow (glyph + word) · display line · hung rule · deck · action.
 * Deliberately not a centred glyph-in-a-circle over centred text.
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

  /* `overflow-wrap: anywhere`, declared here rather than relying on
     `.mb-panel[data-tone] p`: that selector needs `data-tone` on the panel
     itself, which only happens at route scale — declaring it here makes both
     cuts behave identically. `anywhere` rather than `break-word` because only
     `anywhere` also shrinks min-content, and this block is a flex item sized
     by its longest word. */
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
      {/* `text-balance`: the hung rule closes the naming zone, so an orphaned
          last word leaves the rule sitting under a single word. Balance rather
          than a `<wbr>`/nbsp because the copy comes from ~35 call sites none
          of which can be edited from here. */}
      {headline && (
        <p
          className={`matchbook-display text-balance mb-track-display font-bold leading-tight ${step.display}`}
        >
          {headline}
        </p>
      )}
      {named && <span className={`block h-px bg-mb-navy ${step.rule}`} />}
      {/* A `<p>`, not a `<div>`: it is the element `globals.css` targets for
          the wrap defence, and callers pass phrasing content — block-level
          children would be invalid nesting here. */}
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
   * outline — coral gets one appearance per screen and a panel-level state is
   * never the screen's primary job. Coral is opt-in: `variant="coral"`.
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
          /* A destination is a real anchor — middle-click, "open in new tab",
             the status bar — drawn from the same tables as the button above. */
          <MbButtonLink variant={variant} size={size} href={href}>
            {actionLabel}
          </MbButtonLink>
        ) : null)
      }
    />
  );
};

/* ---------------------------------------------------------------------------
   THE STALE PANEL — a refresh failed, the last data did not. A ruled band
   names the state and the clock time, then the last known rows sit on the
   duller paper with hue removed. The state is DRAWN, not dimmed: an opacity
   wash pushes muted ink under the 4.5:1 floor, so `--mb-paper` + `grayscale`
   degrade without touching luminance. The band's noun set is
   `MB_STATE_TONES.stale`, so the with-cache and without-cache renderings of
   one failure are one vocabulary. No animation: a band that appears with
   fresh render output is a state, not an event.
   --------------------------------------------------------------------------- */

/** "2:14 PM" — the same clock cut `shortTime` prints on every schedule row. */
export const mbStaleClock = (at: number): string =>
  new Date(at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export const PanelStale = ({
  asOf,
  offline = false,
  onRetry,
  children,
}: {
  /** Epoch millis the data below was last fetched. Null prints no clock. */
  asOf: number | null;
  /** True when the cause is "no network" rather than "the fetch faulted". */
  offline?: boolean;
  onRetry?: () => void;
  children: ReactNode;
}) => {
  const state = MB_STATE_TONES.stale;
  return (
    <div className="flex flex-1 flex-col">
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-mb-rule px-4 py-2"
      >
        <span className="sr-only">
          {offline
            ? "You are offline — showing the reports this device last received"
            : "Shared data could not be refreshed — showing what was last received"}
          {asOf ? ` at ${mbStaleClock(asOf)}.` : "."}
        </span>
        <span aria-hidden="true" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="flex items-center gap-1.5">
            <MbIcon
              id={offline ? "wifi-off" : state.icon ?? "refresh"}
              size={13}
              className={`shrink-0 ${state.ink}`}
            />
            <span className="mb-kicker">{offline ? "Offline" : state.word}</span>
          </span>
          {asOf && (
            <span className="text-[0.72rem] text-mb-ink-muted tabular-nums">
              Showing {mbStaleClock(asOf)}
            </span>
          )}
        </span>
        {onRetry && (
          <MbButton variant="outline-navy" size="sm" icon="refresh" onClick={onRetry}>
            Retry
          </MbButton>
        )}
      </div>
      {/* The last known data, under glass: duller ground, no hue, full ink. */}
      <div className="flex flex-1 flex-col bg-mb-paper grayscale">{children}</div>
    </div>
  );
};
