"use client";

import { Card, CardEmpty } from "@/components/shared/Card";
import { courtLabel, type StandingsView } from "@/lib/console";
import type { Tournament } from "@/types/game";
import { NOTE, TEAM_CELL, TeamLabel } from "./parts";
import type { TeamLookup } from "./teamRefs";

/** A team's place in the table. The leader's number is green. */
const Place = ({ index }: { index: number }) => (
  <td className={`pl-4 text-center font-bold ${index === 0 ? "text-action" : ""}`}>{index + 1}</td>
);

/**
 * A column of figures in the round robin table. Nine columns have to fit a
 * phone, so these give up a little of the table's padding between them.
 */
const FIGURE = "px-1 text-center tabular-nums";

const TeamCell = ({
  teamId,
  team,
  withdrawn,
}: {
  teamId: string;
  team: TeamLookup;
  withdrawn: boolean;
}) => (
  <td className={`${TEAM_CELL} ${withdrawn ? "opacity-60" : ""}`}>
    <TeamLabel team={team(teamId)}>
      {withdrawn && <span className={`${NOTE} font-medium`}>Withdrawn</span>}
    </TeamLabel>
  </td>
);

/**
 * A win or loss count with, when some of it came by forfeit, how many did.
 * The legend above the standings says what the mark means.
 */
const Tally = ({ count, byForfeit }: { count: number; byForfeit: number }) => (
  <td className={FIGURE}>
    {count}
    {byForfeit > 0 && (
      <sup
        className="ml-0.5 text-tab font-bold text-ink-soft"
        title={`${byForfeit} by forfeit`}
      >
        {byForfeit}F
      </sup>
    )}
  </td>
);

/** Where a rotation team is: its court, its place in the queue, or nothing. */
const where = (
  tournament: Tournament,
  row: { court?: number; queuePosition?: number },
): string =>
  row.court !== undefined
    ? courtLabel(tournament, row.court)
    : row.queuePosition !== undefined
      ? `Queue ${row.queuePosition}`
      : "";

/**
 * The Standings tab. Round Robin gets the points table, with wins and
 * losses by forfeit marked; Win 2 & Out ranks by times champion; Two Match
 * Rotation ranks by wins. Withdrawn teams stay in the table, marked.
 */
export const StandingsPanel = ({
  tournament,
  view,
  team,
  withdrawn,
}: {
  tournament: Tournament;
  view: StandingsView;
  team: TeamLookup;
  withdrawn: ReadonlySet<string>;
}) => {
  const empty =
    tournament.status === "draft" || view.kind === "bracket" || view.rows.length === 0;
  const hasForfeits =
    view.kind === "round_robin" && view.rows.some((row) => row.forfeitWins + row.forfeitLosses > 0);
  return (
    <Card title="Standings">
      {empty ? (
        <CardEmpty message="Standings fill in once the tournament starts." />
      ) : (
        <>
          {hasForfeits && (
            <p className={`border-b border-line px-4 py-2.5 ${NOTE}`}>
              <span className="font-bold">F</span> marks wins and losses by forfeit. They count in
              the record and the points column, and leave points for, against, and difference
              untouched.
            </p>
          )}
          {/* A table too wide for its card scrolls here. */}
          <div className="overflow-x-auto">
            <table className="data-table data-table-compact w-full border-collapse">
              {view.kind === "round_robin" && (
                <>
                  <thead>
                    <tr>
                      <th className="pl-4 text-center">#</th>
                      <th>Team</th>
                      <th className={FIGURE}>P</th>
                      <th className={FIGURE}>W</th>
                      <th className={FIGURE}>L</th>
                      <th className={FIGURE}>PF</th>
                      <th className={FIGURE}>PA</th>
                      <th className={FIGURE}>PD</th>
                      <th className="pl-1 pr-4 text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map((row, i) => (
                      <tr key={row.teamId}>
                        <Place index={i} />
                        <TeamCell teamId={row.teamId} team={team} withdrawn={withdrawn.has(row.teamId)} />
                        <td className={FIGURE}>{row.played}</td>
                        <Tally count={row.won} byForfeit={row.forfeitWins} />
                        <Tally count={row.lost} byForfeit={row.forfeitLosses} />
                        <td className={FIGURE}>{row.pointsFor}</td>
                        <td className={FIGURE}>{row.pointsAgainst}</td>
                        <td className={FIGURE}>
                          {row.pointsDiff > 0 ? "+" : ""}
                          {row.pointsDiff}
                        </td>
                        <td className="pl-1 pr-4 text-center font-bold tabular-nums">
                          {row.competitionPoints}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {view.kind === "win2out" && (
                <>
                  <thead>
                    <tr>
                      <th className="pl-4 text-center">#</th>
                      <th>Team</th>
                      <th className="text-center">Champion</th>
                      <th className="text-center">Played</th>
                      <th className="pr-4 text-right">Where</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map((row, i) => (
                      <tr key={row.teamId}>
                        <Place index={i} />
                        <TeamCell teamId={row.teamId} team={team} withdrawn={withdrawn.has(row.teamId)} />
                        <td className="text-center font-bold tabular-nums">
                          {row.championCount > 0 ? `×${row.championCount}` : "–"}
                        </td>
                        <td className="text-center tabular-nums">{row.matchesPlayed}</td>
                        <td className="pr-4 text-right text-caption text-ink-soft">
                          {where(tournament, row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {view.kind === "two_match" && (
                <>
                  <thead>
                    <tr>
                      <th className="pl-4 text-center">#</th>
                      <th>Team</th>
                      <th className="text-center">P</th>
                      <th className="text-center">W</th>
                      <th className="text-center">L</th>
                      <th className="pr-4 text-right">Where</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map((row, i) => (
                      <tr key={row.teamId}>
                        <Place index={i} />
                        <TeamCell teamId={row.teamId} team={team} withdrawn={withdrawn.has(row.teamId)} />
                        <td className="text-center tabular-nums">{row.played}</td>
                        <td className="text-center font-bold tabular-nums">
                          {row.won}
                        </td>
                        <td className="text-center tabular-nums">{row.lost}</td>
                        <td className="pr-4 text-right text-caption text-ink-soft">
                          {where(tournament, row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        </>
      )}
    </Card>
  );
};
