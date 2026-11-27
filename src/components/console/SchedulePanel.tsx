"use client";

import { Card, CardEmpty } from "@/components/shared/Card";
import {
  isCorrectable,
  takesInstantWin,
  type ConsoleAccess,
  type ScheduleRow,
} from "@/lib/console";
import type { Match, Tournament } from "@/types/game";
import { MatchRow, scoringLink } from "./MatchRow";
import type { TeamLookup } from "./teamRefs";

/**
 * The Schedule tab: every match in play order with its result. A pending or
 * live match opens scoring for an owner or scorer. With `onCorrect`, a
 * completed match opens the correction of its result. With `onInstantWin`,
 * a match still to be played carries a button per team that records that
 * team as the winner.
 */
export const SchedulePanel = ({
  tournament,
  rows,
  team,
  access,
  onCorrect,
  onInstantWin,
}: {
  tournament: Tournament;
  rows: ScheduleRow[];
  team: TeamLookup;
  access: ConsoleAccess;
  /** Offered when completed results can be corrected: the owner of a live round robin or bracket. */
  onCorrect?: (match: Match) => void;
  /** Offered when a Round Robin with Instant win on is live and the role may score. */
  onInstantWin?: (match: Match, winnerId: string) => void;
}) => {
  const played = rows.filter((row) => row.match.status === "completed").length;
  return (
    // With no matches the card is as tall as its one line. Stretched to the
    // row, it floated that line in the middle of a tall white card.
    <Card
      title="Schedule"
      meta={rows.length > 0 ? `${played}/${rows.length} played` : undefined}
      className={rows.length === 0 ? "h-auto" : ""}
    >
      {rows.length === 0 ? (
        <CardEmpty
          message={
            tournament.status === "draft"
              ? "The schedule is made when the tournament starts."
              : "No matches yet."
          }
        />
      ) : (
        <div className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {rows.map(({ match, label }) => (
            <MatchRow
              key={match.id}
              match={match}
              team={team}
              label={label}
              href={scoringLink(match, access)}
              onCorrect={
                onCorrect && isCorrectable(tournament, match) ? () => onCorrect(match) : undefined
              }
              onInstantWin={
                onInstantWin && takesInstantWin(match)
                  ? (winnerId) => onInstantWin(match, winnerId)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </Card>
  );
};
