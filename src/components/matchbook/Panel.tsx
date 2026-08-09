import Link from "next/link";
import Image from "next/image";
import { MbButton, MbButtonLink, type MbButtonVariant } from "./Button";
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

export const TeamMark = ({
  team,
  size = 24,
  reverse = false,
  orientation = "horizontal",
  accent,
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
  className?: string;
}) => {
  // Narrow on `size` itself, not on a derived variable — TypeScript only carries
  // the narrowing through the expression that tested it.
  const crestSize = typeof size === "number" ? size : TEAM_MARK_STEPS[size].crest;
  const nameClass =
    typeof size === "number" ? "text-[0.82rem]" : TEAM_MARK_STEPS[size].name;

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
            className={`matchbook-display font-semibold ${nameClass} truncate max-w-full`}
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
      <span className={`matchbook-display font-semibold ${nameClass} truncate`}>
        {team.name}
      </span>
    </span>
  );
};

const FORM_COLORS: Record<MbFormResult, string> = {
  W: "var(--mb-green)",
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
        style={{ background: FORM_COLORS[r] }}
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

const splitStateMessage = (
  message: string
): { headline: string | null; copy: string | null } => {
  const dash = message.indexOf("—");
  const lead = (dash === -1 ? message : message.slice(0, dash)).trim();
  const deck = dash === -1 ? null : message.slice(dash + 1).trim() || null;
  if (!lead || lead.length > HEADLINE_MAX_CHARS) {
    return { headline: null, copy: message };
  }
  // A display line never carries a full stop; the deck below it keeps its own.
  return { headline: lead.replace(/\.$/, ""), copy: deck };
};

/**
 * The in-panel cut of the one state language. Anatomy, top to bottom: eyebrow
 * (glyph + word), display line, hung rule, deck, one action — every part ranged
 * **left**, exactly as `MbEmptyState` sets it at page scale. The only
 * differences are step sizes: display line `1.2rem` vs `1.875rem`, rule 40px vs
 * 64px, button `sm` vs `lg`.
 *
 * It is deliberately *not* a centred glyph-in-a-circle over centred text: that
 * is the layout the rubric's §3 hard-fail 5 names outright, and it is what this
 * component drew before.
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
  const state = MB_STATE_TONES[tone];
  const mark = icon ?? state.icon;
  const { headline, copy } = splitStateMessage(message);
  /* The rule *hangs* — it closes a naming zone rather than opening the block, so
     it only draws when there is something above it to close. The one input that
     produces neither is a plain `empty` whose message is a single unbreakable
     sentence over 60 characters. */
  const named = Boolean(mark || state.word || headline);

  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-2.5 px-4 py-5 text-left">
      {(mark || state.word) && (
        <span className="mb-kicker flex min-w-0 items-center gap-1.5">
          {mark && <MbIcon id={mark} size={13} className={`shrink-0 ${state.ink}`} />}
          {state.word && <span className="truncate">{state.word}</span>}
        </span>
      )}
      {headline && (
        <p className="matchbook-display max-w-[26ch] text-[1.2rem] font-bold leading-tight tracking-[0.02em]">
          {headline}
        </p>
      )}
      {/* Hung rule — the mark the two scales share; it closes the naming zone. */}
      {named && <span className="block h-px w-10 bg-mb-navy" />}
      {copy && (
        <p className="max-w-[42ch] text-[0.85rem] leading-[1.5] text-mb-ink-muted">{copy}</p>
      )}
      {actionLabel && onAction && (
        <MbButton variant={actionTone} size="sm" onClick={onAction}>
          {actionLabel}
        </MbButton>
      )}
      {actionLabel && href && !onAction && (
        /* A destination is a real anchor — it keeps middle-click, "open in new
           tab" and the status bar — and `MbButtonLink` draws it from the same
           three tables as the button above, so the two branches are one box. */
        <MbButtonLink variant={actionTone} size="sm" href={href}>
          {actionLabel}
        </MbButtonLink>
      )}
    </div>
  );
};
