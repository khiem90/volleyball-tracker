"use client";

import { Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import type { TeamRow } from "@/lib/console";
import type { TeamLookup } from "./teamRefs";

/**
 * The Teams tab: every entry with its record in this tournament. Adding and
 * withdrawing teams arrive with the format management tickets (09 to 11).
 */
export const TeamsPanel = ({ rows, team }: { rows: TeamRow[]; team: TeamLookup }) => (
  <Panel title="Teams" meta={<span className="mb-kicker">{rows.length} entered</span>}>
    {rows.length === 0 ? (
      <PanelEmpty message="No teams are entered." />
    ) : (
      <div className="overflow-x-auto">
        <table className="mb-table mb-table-compact w-full border-collapse">
          <thead>
            <tr>
              <th className="w-8 pl-3! text-center">#</th>
              <th>Team</th>
              <th className="text-center">W</th>
              <th className="pr-3! text-center">L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.teamId} className={row.withdrawn ? "opacity-60" : undefined}>
                <td className="matchbook-display pl-3! text-center font-bold">{i + 1}</td>
                <td>
                  <span className="flex items-center gap-2">
                    {row.color && (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-mb-navy"
                        style={{ background: row.color }}
                        aria-hidden="true"
                      />
                    )}
                    <TeamMark team={team(row.teamId)} size={20} />
                    {row.withdrawn && <span className="mb-kicker">Withdrawn</span>}
                  </span>
                </td>
                <td className="text-center tabular-nums">{row.won}</td>
                <td className="pr-3! text-center tabular-nums">{row.lost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);
