"use client";

import { MbIcon } from "@/components/matchbook/MbIcon";
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

/** One button per format; the chosen one is outlined in coral. */
export const FormatPicker = ({
  value,
  onChange,
  problem,
}: {
  value: TournamentFormat | null;
  onChange: (format: TournamentFormat) => void;
  problem?: string;
}) => (
  <div className="flex flex-col gap-2 p-3">
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
            className={`flex min-h-11 items-start gap-3 rounded-[4px] border-[1.5px] px-3 py-2.5 text-left transition-colors ${
              selected
                ? "border-mb-coral bg-[rgba(238,75,52,0.08)]"
                : "border-mb-rule bg-mb-paper-bright hover:border-mb-navy"
            }`}
          >
            <MbIcon
              id={icon}
              size={18}
              className={`mt-0.5 shrink-0 ${selected ? "text-mb-coral" : "text-mb-navy"}`}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span
                className={`matchbook-display text-[0.85rem] font-bold ${selected ? "text-mb-coral" : ""}`}
              >
                {FORMATS[format].label}
              </span>
              <span className="text-[0.76rem] leading-snug text-mb-ink-muted">{how}</span>
              <span className="mb-kicker">At least {FORMATS[format].minTeams} teams</span>
            </span>
          </button>
        );
      })}
    </div>
    {problem && (
      <p id="format-problem" role="alert" className="text-[0.78rem] font-medium text-mb-red">
        {problem}
      </p>
    )}
  </div>
);
