import { MbIcon } from "./MbIcon";

export type MbBadgeTone =
  | "live"
  | "draft"
  | "final"
  | "win"
  | "loss"
  | "neutral"
  | "teal"
  | "guest"
  | "warn";
export type MbBadgeVariant = "text" | "framed" | "solid";
export type MbBadgeSize = "sm" | "md";

/** Block marks: 10px at `sm`, 12px at `md`. Glyph marks run 2px larger. */
const BLOCK = { sm: 10, md: 12 } as const;
const GLYPH = { sm: 12, md: 14 } as const;

/** Set by `.mb-badge[data-tone]`; inherited here, so no colour is written. */
const INK = "var(--mb-badge-ink, var(--mb-navy))";

/**
 * One mark per tone, and every one a different *shape* — because a desaturated
 * capture is the honest test that colour is never the only channel — before this the nine tones
 * were nine copies of the same 11px square in nine hues. Under greyscale that
 * is one badge repeated nine times, which is information carried by colour
 * alone whatever the hex values are.
 *
 *   live     round dot, pulsing   the only round-and-moving mark in the system
 *   final    circled tick         the result is in
 *   win      filled square        the form-strip win square, same vocabulary
 *   loss     hollow square        the form-strip square left unfilled
 *   draft    pencil               still being written
 *   warn     triangle             the system's warning glyph
 *   guest    hollow disc          the account disc, unfilled — not a member
 *   neutral  horizontal bar       a dash: there is no status here
 *   teal     vertical bar         a rule: this counts something
 *
 * The mark rides every variant, not just `text`. `framed` used to carry its
 * tone on the 1.5px rule and nothing else, which is the same defect one step
 * quieter: nine frames of identical weight and geometry.
 *
 * Contrast: a mark is a UI graphic, so the floor is 3:1, and every
 * `--mb-badge-ink` clears it on paper (`draft`/`warn` resolve to
 * `--mb-gold-ink` precisely for this). On the one permitted solid — `live` —
 * `globals.css` inverts the dot to paper-bright.
 */
const BadgeMark = ({ tone, size }: { tone: MbBadgeTone; size: MbBadgeSize }) => {
  const px = BLOCK[size];
  const glyph = (id: string) => (
    <span className="inline-flex shrink-0" style={{ color: INK }}>
      <MbIcon id={id} size={GLYPH[size]} />
    </span>
  );
  const block = (style: React.CSSProperties) => (
    <span aria-hidden="true" className="shrink-0" style={style} />
  );

  switch (tone) {
    case "live":
      return <span className="mb-live-dot shrink-0" />;
    case "final":
      return glyph("check");
    case "draft":
      return glyph("edit");
    case "warn":
      return glyph("warning");
    case "win":
      return block({ width: px, height: px, borderRadius: 2, background: INK });
    case "loss":
      return block({ width: px, height: px, borderRadius: 2, border: `1.5px solid ${INK}` });
    case "guest":
      return block({ width: px, height: px, borderRadius: 999, border: `1.5px solid ${INK}` });
    case "neutral":
      return block({ width: px, height: 3, background: INK });
    case "teal":
      return block({ width: 3, height: px, background: INK });
  }
};

export const MbBadge = ({
  tone,
  variant = "text",
  size = "sm",
  className = "",
  children,
}: {
  tone: MbBadgeTone;
  variant?: MbBadgeVariant;
  size?: MbBadgeSize;
  className?: string;
  children: React.ReactNode;
}) => {
  /**
   * `solid` is white ink on the tone fill, and only `live` clears 4.5:1 there
   * (#fff on --mb-red is 4.76:1; on --mb-green 4.45:1), so every other tone degrades to
   * `framed` rather than shipping a contrast failure.
   */
  const resolved: MbBadgeVariant =
    variant === "solid" && tone !== "live" ? "framed" : variant;

  return (
    <span
      className={`mb-badge ${className}`}
      data-tone={tone}
      data-variant={resolved}
      data-size={size}
    >
      <BadgeMark tone={tone} size={size} />
      {children}
    </span>
  );
};
