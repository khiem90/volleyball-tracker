/**
 * A status chip: a small pill beside the thing it describes. Grey with ink
 * text by default, green for what is live or confirmed. `live` makes it green
 * and puts the live dot before its words.
 */
export const Chip = ({
  tone = "fill",
  live = false,
  children,
  className = "",
}: {
  tone?: "fill" | "action";
  live?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <span className={`chip ${tone === "action" || live ? "chip-action" : ""} ${className}`}>
    {live && <span className="live-dot" aria-hidden="true" />}
    {children}
  </span>
);
