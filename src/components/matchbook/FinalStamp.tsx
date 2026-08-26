/**
 * The rotated hairline stamp that closes out a finished match.
 *
 * Ink and frame come from `.mb-stamp-final` — `--mb-green-ink`, because §1.2
 * fixes Final/complete to green and the ink twin clears 4.5:1 at this
 * 0.74rem/700 size (raw `--mb-green` is 4.28:1 on bright and fails). This
 * component used to override the class back to `--mb-coral-deep` inline,
 * silently undoing the stylesheet's "Final is green" decision from the markup
 * side and making one status two colours; the override is gone, the class is
 * the single source of the stamp's ink.
 */
export const MbFinalStamp = ({
  label = "Final",
  rotate = -6,
  className = "",
}: {
  label?: string;
  /** Degrees. 0 gives an un-rotated stamp for tight rows. */
  rotate?: number;
  className?: string;
}) => (
  <span
    className={`mb-stamp-final ${className}`}
    style={{ "--mb-stamp-rotate": `${rotate}deg` } as React.CSSProperties}
  >
    {label}
  </span>
);
