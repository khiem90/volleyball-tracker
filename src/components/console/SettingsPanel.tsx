"use client";

import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import { courtsWord, type ConsoleAccess } from "@/lib/console";
import { formatLabel } from "@/lib/formats";
import type { Tournament } from "@/types/game";

const longDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="mb-kicker">{label}</span>
    <span className="text-[0.85rem] font-semibold">{value}</span>
  </div>
);

/**
 * The Settings tab: the tournament as it was set up, and the owner's
 * actions on it. End is here now so an endless format can finish; rename,
 * courts, share links, Duplicate, and Delete arrive with tickets 07 and 13.
 */
export const SettingsPanel = ({
  tournament,
  access,
  onEnd,
}: {
  tournament: Tournament;
  access: ConsoleAccess;
  onEnd: () => void;
}) => {
  const { settings } = tournament;
  const facts: [string, string | null][] = [
    ["Format", formatLabel(tournament.format)],
    ["In play", `${settings.courts} ${courtsWord(tournament, settings.courts)}`],
    [
      "Matches",
      settings.seriesLength > 1 ? `Best of ${settings.seriesLength}` : "One game each",
    ],
    ["Instant win", settings.instantWin ? "On" : "Off"],
    [
      "Standings points",
      `${settings.pointsForWin} for a win, ${settings.pointsForLoss} for a loss`,
    ],
    ["Spectator link", tournament.spectatorEnabled ? "On" : "Off"],
    ["Created", longDate(tournament.createdAt)],
    ["Started", longDate(tournament.startedAt)],
    ["Completed", longDate(tournament.completedAt)],
  ];

  return (
    <Panel title="Settings">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
        {facts.map(([label, value]) =>
          value === null ? null : <Fact key={label} label={label} value={value} />,
        )}
      </div>
      {access.canManage && (
        <div className="mt-auto flex flex-col gap-2 border-t border-mb-rule p-4">
          <button type="button" onClick={onEnd} className="mb-btn mb-btn-outline min-h-11">
            <MbIcon id="warning" size={14} />
            End tournament
          </button>
          <p className="text-[0.72rem] text-mb-ink-muted">
            Ends it as it stands. Standings freeze and no more matches can be scored.
          </p>
        </div>
      )}
    </Panel>
  );
};
