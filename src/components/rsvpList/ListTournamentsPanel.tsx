"use client";

import Link from "next/link";
import { LiveTag } from "@/components/console/MatchRow";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PANEL_ROW } from "@/components/matchbook/Panel";
import { useAuth } from "@/context/AuthContext";
import { useListTournaments } from "@/context/useListTournaments";
import type { RsvpList } from "@/types/game";

/**
 * The tournaments imported from a list that have started, on the list's
 * page. Each row opens the tournament's console: Watch for a live one,
 * See results for a completed one. Anyone who can open the page gets the
 * rows, and lands in the console as a spectator unless they own the
 * tournament.
 *
 * A draft gets no row, and neither does a tournament that was deleted.
 * The panel is left out until there is a row to show.
 */
export const ListTournamentsPanel = ({
  list,
  className = "",
}: {
  list: Pick<RsvpList, "tournamentIds">;
  className?: string;
}) => {
  const { user } = useAuth();
  const rows = useListTournaments(list.tournamentIds ?? [], user?.uid ?? null);

  if (rows.length === 0) return null;

  return (
    <Panel title="Tournaments" icon="compete" className={className}>
      <div className="flex flex-col divide-y divide-mb-rule">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 ${PANEL_ROW}`}
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="matchbook-display text-[0.95rem] font-bold leading-tight [overflow-wrap:anywhere]">
                {row.name}
              </p>
              {row.isLive ? <LiveTag /> : <span className="mb-kicker">Completed</span>}
            </div>
            <span
              className={`mb-btn px-3 text-[0.72rem] ${
                row.isLive ? "mb-btn-navy" : "mb-btn-outline-navy"
              }`}
            >
              {row.action}
              <MbIcon id="chevron-right" size={11} />
            </span>
          </Link>
        ))}
      </div>
    </Panel>
  );
};
