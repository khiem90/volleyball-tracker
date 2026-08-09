/**
 * The rotated hairline stamp that closes out a finished match.
 *
 * Ink and frame are `--mb-coral-deep`, not `--mb-coral`: `.mb-stamp-final` sets
 * 0.74rem/700, which is not "large text", and coral on paper-bright measures
 * 3.55:1 — under the 4.5:1 floor. Deep coral measures 5.03:1 and reads as the
 * same colour at this size. Rubric §3.6 outranks the charter's "button fill
 * only" note on `--mb-coral-deep` (authority order: hard fails beat the charter).
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
    style={
      {
        "--mb-stamp-rotate": `${rotate}deg`,
        color: "var(--mb-coral-deep)",
        borderColor: "var(--mb-coral-deep)",
      } as React.CSSProperties
    }
  >
    {label}
  </span>
);
