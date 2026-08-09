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
   * (#fff on --mb-red is 4.76:1; on --mb-green 4.45:1). Design language §11
   * GAP-4 permits solid for `live` alone, so every other tone degrades to
   * `framed` rather than shipping a contrast failure.
   */
  const resolved: MbBadgeVariant =
    variant === "solid" && tone !== "live" ? "framed" : variant;

  /**
   * The second channel, so status never rides on colour alone: `live` always
   * carries the pulsing dot, every other tone carries a form square in the
   * `text` variant, where there is no rule and no fill to carry it.
   */
  const mark =
    tone === "live" ? (
      <span className="mb-live-dot" />
    ) : resolved === "text" ? (
      <span className="mb-form-square" />
    ) : null;

  return (
    <span
      className={`mb-badge ${className}`}
      data-tone={tone}
      data-variant={resolved}
      data-size={size}
    >
      {mark}
      {children}
    </span>
  );
};
