"use client";

import { Panel, PanelEmpty } from "@/components/matchbook/Panel";
import type { ConsoleAccess, ScheduleRow } from "@/lib/console";
import type { Tournament } from "@/types/game";
import { MatchRow, scoringLink } from "./MatchRow";
import type { TeamLookup } from "./teamRefs";

/**
 * The Schedule tab: every match in play order with its result. A pending or
 * live match opens scoring for an owner or scorer. Correcting a completed
 * result is reached from here once tickets 10 and 11 land.
 */
export const SchedulePanel = ({
  tournament,
  rows,
  team,
  access,
}: {
  tournament: Tournament;
  rows: ScheduleRow[];
  team: TeamLookup;
  access: ConsoleAccess;
}) => {
  const played = rows.filter((row) => row.match.status === "completed").length;
  return (
    <Panel
      title="Schedule"
      meta={
        rows.length > 0 ? (
          <span className="mb-kicker">
            {played}/{rows.length} played
          </span>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <PanelEmpty
          message={
            tournament.status === "draft"
              ? "The schedule is made when the tournament starts."
              : "No matches yet."
          }
        />
      ) : (
        <div className="flex max-h-[70vh] flex-col divide-y divide-mb-rule overflow-y-auto">
          {rows.map(({ match, label }) => (
            <MatchRow
              key={match.id}
              match={match}
              team={team}
              label={label}
              href={scoringLink(match, access)}
            />
          ))}
        </div>
      )}
    </Panel>
  );
};
