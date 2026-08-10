"use client";

import { useMemo } from "react";
import type { MbTabItem } from "@/components/matchbook/Tabs";
import type { MbCompetitionDetail } from "@/components/matchbook/useMatchbookCompetitionDetail";
import {
  CourtsPanel,
  DetailsPanel,
  EventStatusPanel,
  LeaderboardPanel,
  QueuePanel,
  ResultsPanel,
} from "@/components/competition-detail/panels";
import { FormatTabs, useFormatTabs } from "@/components/competition-detail/tabs";
import type { Match } from "@/types/game";

/* ===========================================================================
   THE ROTATION CONSOLE

   `Win2OutView` and `TwoMatchRotationView` were 240 lines each and ~85%
   identical: two mode banners, two court cards, two queue panels, two
   leaderboards and one shared `MatchHistorySection` that maintained two
   hand-written layouts for the same data. They differ in exactly three things
   — the headline measure (crowns vs wins), the rule sentence, and what a team's
   sub-line says — so those are props and everything else is this file.

   The mode banner is gone. It was a full sentence that wrapped to two lines on
   a phone, carried no actionable information and ended in an exclamation mark;
   its content now sits in the navy Event Status panel as a stat and a rule
   line, which is where the rest of the event's facts already are.
   =========================================================================== */

export interface RotationConsoleProps {
  data: MbCompetitionDetail;
  competitionName: string;
  status: "draft" | "in_progress" | "completed";
  /** "Crowns" for win 2 & out, "W" for the two-match rotation. */
  primaryLabel: string;
  canEdit: boolean;
  canPlay: boolean;
  instantWin: boolean;
  onPlay: (match: Match) => void;
  onEditMatch: (match: Match) => void;
  onInstantWin: (match: Match, winnerId: string) => void;
  onReorderQueue: () => void;
  onSelectResult: (match: Match) => void;
}

export const RotationConsole = ({
  data,
  competitionName,
  status,
  primaryLabel,
  canEdit,
  canPlay,
  instantWin,
  onPlay,
  onEditMatch,
  onInstantWin,
  onReorderQueue,
  onSelectResult,
}: RotationConsoleProps) => {
  const items = useMemo<MbTabItem[]>(
    () => [
      { value: "courts", label: data.venue.Many, icon: "court", count: data.courts.length },
      { value: "queue", label: "Queue", icon: "queue", count: data.queue.length },
      { value: "leaderboard", label: "Leaders", icon: "chart" },
      { value: "results", label: "Results", icon: "history", count: data.resultLines.length },
    ],
    [data.venue.Many, data.courts.length, data.queue.length, data.resultLines.length]
  );

  const tabs = useFormatTabs(items);

  return (
    <>
      <FormatTabs
        items={items}
        value={tabs.value}
        onValueChange={tabs.setValue}
        label="Competition views"
      />

      {/* No `items-start` — see `bodies.tsx`. Every row packs 7+5 and the two
          short panels stack in one column rather than leaving it bare. */}
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className={`xl:col-span-7 ${tabs.groupClass("courts")}`}>
          <CourtsPanel
            data={data}
            canEdit={canEdit}
            canPlay={canPlay}
            instantWin={instantWin}
            onPlay={onPlay}
            onEdit={onEditMatch}
            onInstantWin={onInstantWin}
          />
        </div>

        <div className={`xl:col-span-5 ${tabs.groupClass("courts")}`}>
          <EventStatusPanel data={data} status={status} />
        </div>

        <div className={`xl:col-span-7 ${tabs.groupClass("leaderboard")}`}>
          <LeaderboardPanel
            data={data}
            primaryLabel={primaryLabel}
            caption={`${competitionName} leaderboard`}
          />
        </div>

        <div className={`xl:col-span-5 ${tabs.groupClass("queue")}`}>
          <QueuePanel data={data} canEdit={canEdit} onReorder={onReorderQueue} />
        </div>

        <div className={`xl:col-span-7 ${tabs.groupClass("results")}`}>
          <ResultsPanel lines={data.resultLines} onSelect={onSelectResult} />
        </div>

        <div className={`xl:col-span-5 ${tabs.groupClass("results")}`}>
          <DetailsPanel data={data} createdDate={data.createdDate} />
        </div>
      </div>
    </>
  );
};
