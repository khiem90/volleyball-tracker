import Link from "next/link";
import Image from "next/image";
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
  const step = typeof size === "string" ? TEAM_MARK_STEPS[size] : null;
  const crestSize = step ? step.crest : size;
  const nameClass = step ? step.name : "text-[0.82rem]";

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
                : "rgba(7, 50, 77, 0.12)",
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

/**
 * `empty` stays iconless and unlabelled — design language §5.7 keeps ordinary
 * empty states plain. The five failure tones name themselves in words and mark
 * themselves with a glyph, so the state never rests on colour alone.
 */
const PANEL_EMPTY_TONES: Record<
  PanelEmptyTone,
  { icon: string | null; word: string | null; ink: string }
> = {
  empty: { icon: null, word: null, ink: "text-mb-navy" },
  notfound: { icon: "search", word: "Not found", ink: "text-mb-navy" },
  error: { icon: "warning", word: "Error", ink: "text-mb-red" },
  offline: { icon: "wifi-off", word: "Offline", ink: "text-mb-gold-ink" },
  denied: { icon: "lock", word: "No access", ink: "text-mb-navy" },
  unconfigured: { icon: "settings", word: "Not set up", ink: "text-mb-ink-muted" },
};

export const PanelEmpty = ({
  message,
  actionLabel,
  href,
  tone = "empty",
  icon,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  href?: string;
  /** Defaults to `empty`, which renders exactly as it always has. */
  tone?: PanelEmptyTone;
  /** Sprite id overriding the tone's default mark. */
  icon?: string;
  /** Renders a real `<button>` instead of a link. Takes precedence over `href`. */
  onAction?: () => void;
}) => {
  const state = PANEL_EMPTY_TONES[tone];
  const mark = icon ?? state.icon;
  const actionClass = "mb-btn mb-btn-outline mb-btn-touch text-[0.72rem] px-3 py-1.5";

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center flex-1">
      {mark && (
        <span className={`mb-icon-disc h-9 w-9 ${state.ink}`}>
          <MbIcon id={mark} size={16} className={state.ink} />
        </span>
      )}
      {state.word ? (
        <div className="flex flex-col items-center gap-1.5">
          <span className="mb-kicker">{state.word}</span>
          <p className="text-[0.85rem] text-mb-ink-muted">{message}</p>
        </div>
      ) : (
        <p className="text-[0.85rem] text-mb-ink-muted">{message}</p>
      )}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={actionClass}>
          {actionLabel}
        </button>
      )}
      {actionLabel && href && !onAction && (
        <Link href={href} className={actionClass}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
};
