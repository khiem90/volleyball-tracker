/**
 * A 4px rule track with a fill — the hairline sibling of the panel rules, not a
 * rounded progress bar. `color` takes a token expression (`var(--mb-green)`),
 * which is what `readinessColor()` already returns.
 */
export const MbMeter = ({
  value,
  label,
  color,
  className = "",
}: {
  /** 0–100. Values outside the range are clamped, not trusted. */
  value: number;
  label?: string;
  color?: string;
  className?: string;
}) => {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="mb-kicker truncate">{label}</span>
          {/* Fixed box: 7% and 100% occupy the same width, so nothing shifts. */}
          <span className="w-10 shrink-0 text-right text-[0.72rem] font-semibold tabular-nums">
            {percent}%
          </span>
        </div>
      )}
      {/* G22 — the fill is a full-width bar SCALED on X, never a `width`.
          `width` is a layout property, so animating it re-ran layout for the
          bar's whole subtree on every frame; charter invariant 40 allows only
          `transform` and `opacity`, which the compositor can run without
          touching layout. `--mb-meter-fill` is unitless because `scaleX()`
          takes a number, and `.mb-meter` owns the geometry — see the block in
          `globals.css`. Nothing about the painted result changes. */}
      <span
        className="mb-meter"
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        style={
          {
            "--mb-meter-fill": percent / 100,
            ...(color ? { "--mb-meter-color": color } : {}),
          } as React.CSSProperties
        }
      >
        <span />
      </span>
    </div>
  );
};
