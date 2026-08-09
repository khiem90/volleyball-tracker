import { MbIcon } from "./MbIcon";

/**
 * Tone drives the icon disc (border + glyph) — never the value or the label,
 * because display/stat text sits under 18.66px and global invariant 12 keeps
 * small text navy or ink-muted. Gold resolves to `--mb-gold-ink`: raw gold is
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

const DISC = { sm: 36, md: 44 } as const;
const GLYPH = { sm: 16, md: 20 } as const;
/** display/stat-sm and display/stat-md — both named steps, never in between. */
const VALUE = { sm: "text-[1.2rem]", md: "text-[1.5rem]" } as const;

export const MbStat = ({
  icon,
  label,
  value,
  sub,
  tone = "navy",
  size = "md",
  className = "",
}: {
  /** Sprite icon id. Without one the tone is carried by a 3px rail instead. */
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
      {icon && (
        <span
          className="mb-icon-disc"
          style={{ width: DISC[size], height: DISC[size], borderColor: ink, color: ink }}
        >
          <MbIcon id={icon} size={GLYPH[size]} />
        </span>
      )}
      <div className="min-w-0">
        <p className="mb-kicker truncate">{label}</p>
        <p
          className={`matchbook-display mt-1 font-bold leading-none tabular-nums ${VALUE[size]}`}
        >
          {value}
          {sub && (
            <span className="ml-2 text-[0.7rem] font-semibold text-mb-ink-muted">
              {sub}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
