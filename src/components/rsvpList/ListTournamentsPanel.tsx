"use client";

import Link from "next/link";
import { LiveTag } from "@/components/console/MatchRow";
import { Card, CARD_ROW, Chip, Icon } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { useListTournaments } from "@/context/useListTournaments";
import type { RsvpList } from "@/types/game";

/**
 * The tournaments imported from a list that have started, on the list's
 * page. Each row is the tournament's name with its status beside it, and
 * opens the tournament's console: Watch for a live one, See results for a
 * completed one. Anyone who can open the page gets the rows, and lands in
 * the console as a spectator unless they own the tournament.
 *
 * A draft gets no row, and neither does a tournament that was deleted.
 * The card is left out until there is a row to show.
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
    <Card title="Tournaments" icon="compete" className={className}>
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={row.href} className={`flex items-center gap-3 ${CARD_ROW}`}>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="min-w-0 text-title font-bold leading-tight wrap-anywhere">
                  {row.name}
                </span>
                {row.isLive ? <LiveTag /> : <Chip>Completed</Chip>}
              </span>
              <span className={`btn shrink-0 ${row.isLive ? "btn-ink" : "btn-fill"}`}>
                {row.action}
                <Icon id="chevron-right" size={14} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
};
