import { fallbackColor, letterColor } from "@/lib/teamColors";
import { cn } from "@/lib/utils";

/** The first letter of a name, in capitals. A name with no letter to show gets "?". */
const initialOf = (name: string): string =>
  Array.from(name.trim())[0]?.toUpperCase() ?? "?";

/**
 * A team's mark: a small shield with the team's initial on the team's own
 * color. A team with no color gets one picked by its name, so no mark is
 * blank. The letter is ink or white, whichever reads better on the color.
 * The mark is hidden from screen readers, because the team's name always
 * sits beside it.
 */
export const TeamMark = ({
  name,
  color,
  size = 22,
  className,
}: {
  name: string;
  /** The team's own color. Leave it out for a team that has none. */
  color?: string;
  /** Width and height in px. */
  size?: number;
  className?: string;
}) => {
  const background = color || fallbackColor(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "team-mark",
        letterColor(background) === "ink" ? "text-ink" : "text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.5, background }}
    >
      {initialOf(name)}
    </span>
  );
};
