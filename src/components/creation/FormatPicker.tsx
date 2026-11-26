"use client";

import { Icon } from "@/components/shared";
import { FORMATS } from "@/lib/formats";
import type { TournamentFormat } from "@/types/game";

/** The five formats in the order the page offers them, each with a line on how it plays. */
const OPTIONS: { format: TournamentFormat; icon: string; how: string }[] = [
  { format: "round_robin", icon: "chart", how: "Every team plays every other team once." },
  { format: "single_elimination", icon: "bracket", how: "Lose once and you are out." },
  { format: "double_elimination", icon: "bracket", how: "Out after a second loss." },
  {
    format: "win2out",
    icon: "star",
    how: "Winner stays on. Two wins in a row makes a champion, who goes back to the queue.",
  },
  {
    format: "two_match_rotation",
    icon: "swap",
    how: "Each team plays two matches on a court, then goes back to the queue.",
  },
];

/**
 * One grey tile per format. The chosen one turns to the green tint with a
 * green edge and a tick, so the choice does not rest on color alone.
 */
export const FormatPicker = ({
  value,
  onChange,
  problem,
}: {
  value: TournamentFormat | null;
  onChange: (format: TournamentFormat) => void;
  problem?: string;
}) => (
  <div className="flex flex-col gap-2 p-4">
    <div
      role="radiogroup"
      aria-label="Format"
      aria-describedby={problem ? "format-problem" : undefined}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {OPTIONS.map(({ format, icon, how }) => {
        const selected = format === value;
        return (
          <button
            key={format}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(format)}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-tile border px-3 py-3 text-left transition-colors ${
              selected
                ? "border-action bg-action-tint"
                : "border-transparent bg-fill hover:border-ink-soft/75"
            }`}
          >
            <Icon
              id={icon}
              size={20}
              className={`mt-0.5 shrink-0 ${selected ? "text-action" : "text-ink"}`}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-title font-semibold">{FORMATS[format].label}</span>
              <span className="text-label text-ink-soft">{how}</span>
              <span className="text-caption font-medium text-ink-soft">
                At least {FORMATS[format].minTeams} teams
              </span>
            </span>
            {selected && <Icon id="check" size={20} className="mt-0.5 shrink-0 text-action" />}
          </button>
        );
      })}
    </div>
    {problem && (
      <p id="format-problem" role="alert" className="text-caption font-medium text-danger">
        {problem}
      </p>
    )}
  </div>
);
