import { MbIcon } from "./MbIcon";

/**
 * Tone drives the icon disc (border + glyph) — never the value or the label,
 * because display/stat text sits under 18.66px and
 * small text stays navy or ink-muted. Gold resolves to `--mb-gold-ink`: raw gold is
 * 2.15:1 on paper and would fail the 3:1 floor even as a hairline border.
 */
export type MbStatTone = "navy" | "coral" | "teal" | "green" | "gold" | "red";

const TONE_INK: Record<MbStatTone, string> = {
  navy: "var(--mb-navy)",
  coral: "var(--mb-coral)",
  teal: "var(--mb-teal)",
  green: "var(--mb-green)",
  gold: "var(--mb-gold-ink)",
  red: "var(--mb-red)",
};

/**
 * The disc's geometry, so the six tones are six readings rather than six hues.
 *
 * Six tone names that differ only in hue are six identical discs in a
 * desaturated capture — worse here than
 * on a badge because a stat's tone has no word beside it to fall back on. So
 * the tones are bound to a two-axis system and the geometry says which:
 *
 *   shape   the family.   circle = a steady measure, square = wants attention
 *   weight  the pitch.    1.5px hairline < 3px rule < solid fill
 *
 *   navy   circle, hairline   a plain count, the default
 *   teal   circle, 3px        a measure worth reading (capacity, in progress)
 *   green  circle, solid      the steady family's terminal state: complete
 *   gold   square, hairline   pending — something is waiting on someone
 *   coral  square, 3px        the accent: the thing to act on. No shipped
 *                             call site — a live count is `red` (§1.2 fixes
 *                             live to --mb-red), and coral's three declared
 *                             jobs do not include a stat disc; the treatment
 *                             stays defined so the ladder's geometry is
 *                             complete in /dev/kit.
 *   red    square, solid      the attention family's terminal states:
 *                             live now / blocked — urgent, look here
 *
 * Solid is restricted to green and red because the glyph then sits in
 * paper-bright on the tone: 3.93:1 and 4.20:1, both over the 3:1 floor a UI
 * graphic needs. Gold at 1.97:1 and coral at 3.26:1 stay outlines — coral would
 * technically pass, but keeping solid to the two terminal states is what makes
 * the ladder legible.
 */
interface Treatment {
  shape: "circle" | "square";
  /** Border width in px. Ignored when `solid`. */
  weight: 1.5 | 3;
  solid: boolean;
}

const TONE_MARK: Record<MbStatTone, Treatment> = {
  navy: { shape: "circle", weight: 1.5, solid: false },
  teal: { shape: "circle", weight: 3, solid: false },
  green: { shape: "circle", weight: 1.5, solid: true },
  gold: { shape: "square", weight: 1.5, solid: false },
  coral: { shape: "square", weight: 3, solid: false },
  red: { shape: "square", weight: 1.5, solid: true },
};

const DISC = { sm: 36, md: 44 } as const;
const GLYPH = { sm: 16, md: 20 } as const;
/** The iconless mark: the same geometry, small enough to sit beside the rail. */
const CHIP = { sm: 12, md: 14 } as const;
/** display/stat-sm and display/stat-md — both named steps, never in between. */
const VALUE = { sm: "text-[1.2rem]", md: "text-[1.5rem]" } as const;

const markStyle = (tone: MbStatTone, px: number): React.CSSProperties => {
  const { shape, weight, solid } = TONE_MARK[tone];
  const ink = TONE_INK[tone];
  return {
    width: px,
    height: px,
    borderRadius: shape === "circle" ? 999 : 3,
    borderWidth: solid ? 0 : weight,
    borderStyle: "solid",
    borderColor: ink,
    background: solid ? ink : undefined,
    color: solid ? "var(--mb-paper-bright)" : ink,
  };
};

export const MbStat = ({
  icon,
  label,
  value,
  sub,
  tone = "navy",
  size = "md",
  className = "",
}: {
  /**
   * Sprite icon id. Without one the tone still keeps both channels: the 3px
   * rail carries the hue and a chip carries the same shape-and-weight reading
   * the disc would have given it.
   */
  icon?: string;
  label: string;
  value: React.ReactNode;
  /** Secondary measure printed after the value (a percentage, a delta). */
  sub?: string;
  tone?: MbStatTone;
  size?: "sm" | "md";
  className?: string;
}) => {
  const ink = TONE_INK[tone];
  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${icon ? "" : "mb-rail pl-3"} ${className}`}
      style={icon ? undefined : ({ "--mb-rail-color": ink } as React.CSSProperties)}
    >
      {icon ? (
        <span className="mb-icon-disc" style={markStyle(tone, DISC[size])}>
          <MbIcon id={icon} size={GLYPH[size]} />
        </span>
      ) : (
        <span aria-hidden="true" className="shrink-0" style={markStyle(tone, CHIP[size])} />
      )}
      <div className="min-w-0">
        <p className="mb-kicker truncate">{label}</p>
        <p
          className={`matchbook-display mt-1 mb-track-display font-bold leading-none tabular-nums ${VALUE[size]}`}
        >
          {value}
          {sub && (
            <span className="ml-2 text-[0.72rem] mb-track-link font-semibold text-mb-ink-muted">
              {sub}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
