"use client";

import { Panel, PanelEmpty } from "@/components/matchbook/Panel";
import { TeamMark } from "@/components/matchbook/Panel";
import { courtLabel, type StandingsView } from "@/lib/console";
import type { Tournament } from "@/types/game";
import type { TeamLookup } from "./teamRefs";

const leader = { boxShadow: "inset 3px 0 0 var(--mb-teal)" } as const;

const TeamCell = ({
  teamId,
  team,
  withdrawn,
}: {
  teamId: string;
  team: TeamLookup;
  withdrawn: boolean;
}) => (
  <td className={withdrawn ? "opacity-60" : undefined}>
    <span className="flex items-center gap-2">
      <TeamMark team={team(teamId)} size={20} />
      {withdrawn && <span className="mb-kicker">Withdrawn</span>}
    </span>
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
 * The Standings tab. Round Robin gets the points table; Win 2 & Out ranks
 * by times champion; Two Match Rotation ranks by wins. Withdrawn teams stay
 * in the table, marked.
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
  return (
    <Panel title="Standings">
      {empty ? (
        <PanelEmpty message="Standings fill in once the tournament starts." />
      ) : (
        <div className="overflow-x-auto">
          <table className="mb-table mb-table-compact w-full border-collapse">
            {view.kind === "round_robin" && (
              <>
                <thead>
                  <tr>
                    <th className="w-8 pl-3! text-center">#</th>
                    <th>Team</th>
                    <th className="text-center">P</th>
                    <th className="text-center">W</th>
                    <th className="text-center">L</th>
                    <th className="text-center">PF</th>
                    <th className="text-center">PA</th>
                    <th className="text-center">PD</th>
                    <th className="pr-3! text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row, i) => (
                    <tr key={row.teamId}>
                      <td
                        className="matchbook-display pl-3! text-center font-bold"
                        style={i === 0 ? leader : undefined}
                      >
                        {i + 1}
                      </td>
                      <TeamCell teamId={row.teamId} team={team} withdrawn={withdrawn.has(row.teamId)} />
                      <td className="text-center tabular-nums">{row.played}</td>
                      <td className="text-center tabular-nums">{row.won}</td>
                      <td className="text-center tabular-nums">{row.lost}</td>
                      <td className="text-center tabular-nums">{row.pointsFor}</td>
                      <td className="text-center tabular-nums">{row.pointsAgainst}</td>
                      <td className="text-center tabular-nums">
                        {row.pointsDiff > 0 ? "+" : ""}
                        {row.pointsDiff}
                      </td>
                      <td className="matchbook-display pr-3! text-center font-bold tabular-nums">
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
                    <th className="w-8 pl-3! text-center">#</th>
                    <th>Team</th>
                    <th className="text-center">Champion</th>
                    <th className="text-center">Played</th>
                    <th className="pr-3! text-right">Where</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row, i) => (
                    <tr key={row.teamId}>
                      <td
                        className="matchbook-display pl-3! text-center font-bold"
                        style={i === 0 ? leader : undefined}
                      >
                        {i + 1}
                      </td>
                      <TeamCell teamId={row.teamId} team={team} withdrawn={withdrawn.has(row.teamId)} />
                      <td className="matchbook-display text-center font-bold tabular-nums">
                        {row.championCount > 0 ? `×${row.championCount}` : "–"}
                      </td>
                      <td className="text-center tabular-nums">{row.matchesPlayed}</td>
                      <td className="pr-3! text-right text-[0.72rem] text-mb-ink-muted">
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
                    <th className="w-8 pl-3! text-center">#</th>
                    <th>Team</th>
                    <th className="text-center">P</th>
                    <th className="text-center">W</th>
                    <th className="text-center">L</th>
                    <th className="pr-3! text-right">Where</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row, i) => (
                    <tr key={row.teamId}>
                      <td
                        className="matchbook-display pl-3! text-center font-bold"
                        style={i === 0 ? leader : undefined}
                      >
                        {i + 1}
                      </td>
                      <TeamCell teamId={row.teamId} team={team} withdrawn={withdrawn.has(row.teamId)} />
                      <td className="text-center tabular-nums">{row.played}</td>
                      <td className="matchbook-display text-center font-bold tabular-nums">
                        {row.won}
                      </td>
                      <td className="text-center tabular-nums">{row.lost}</td>
                      <td className="pr-3! text-right text-[0.72rem] text-mb-ink-muted">
                        {where(tournament, row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
    </Panel>
  );
};
