/*
 * The court from above, as a picture for the Tools page: both sides of the
 * net, the two attack lines, and which row plays where. It is drawn in the
 * rotation tool's own court colors. Each label is centered over its row, so
 * none of them reaches the net.
 */

/** The middle of each row, left to right, between the side lines at 30 and 610. */
const ROWS = [
  { x: 102.5, label: "Back row" },
  { x: 247.5, label: "Front row" },
  { x: 392.5, label: "Front row" },
  { x: 537.5, label: "Back row" },
];

export const CourtReference = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 640 360"
    role="img"
    aria-label="Top-down volleyball court diagram with position zones"
    className={className}
  >
    <rect width="640" height="360" rx="10" className="fill-fill" />

    {/* The boundary, then the center line and the two attack lines. */}
    <g fill="none" strokeWidth="4" className="stroke-ink-soft">
      <rect x="30" y="34" width="580" height="296" />
      <path d="M320 34v296M175 34v296M465 34v296" strokeDasharray="14 10" />
    </g>

    {/* The net, and a post at each end of it. */}
    <path d="M315 22h10v320h-10z" className="fill-ink" />
    <path d="M308 18h24v8h-24zm0 320h24v8h-24z" className="fill-ink" />

    <g textAnchor="middle" fontSize="22" fontWeight="600" className="fill-ink-soft">
      {ROWS.map((row) => (
        <text key={row.x} x={row.x} y="24">
          {row.label}
        </text>
      ))}
    </g>
  </svg>
);
