import type { CSSProperties } from "react";

/** Number → px, string → used verbatim (so `"12ch"` and `"100%"` both work). */
const len = (value: string | number) => (typeof value === "number" ? `${value}px` : value);

/**
 * Static placeholder block — no shimmer, because a shimmer is a gradient and
 * gradients are banned (GAP-8). Size it to the geometry it stands in for: the
 * skeleton exists to stop layout shift, not to look busy.
 */
export const MbSkeleton = ({
  w = "100%",
  h = 12,
  lines = 1,
  radius = 2,
  className = "",
}: {
  w?: string | number;
  h?: string | number;
  /** >1 stacks that many bars, the last one short, like a paragraph. */
  lines?: number;
  /** 2 / 3 / 4px — the only radii the system allows for a block. */
  radius?: 2 | 3 | 4;
  className?: string;
}) => {
  const bar: CSSProperties = { height: len(h), borderRadius: `${radius}px` };

  if (lines <= 1) {
    return (
      <span
        aria-hidden="true"
        className={`mb-skeleton ${className}`}
        style={{ ...bar, width: len(w) }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex flex-col gap-2 ${className}`}
      style={{ width: len(w) }}
    >
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className="mb-skeleton"
          style={{ ...bar, width: i === lines - 1 ? "62%" : "100%" }}
        />
      ))}
    </span>
  );
};
