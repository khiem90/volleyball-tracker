"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DeleteConfirmDialog } from "@/components/shared";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbBadge, type MbBadgeTone } from "@/components/matchbook/Badge";
import { MbButtonLink } from "@/components/matchbook/Button";
import { MbMenu } from "@/components/matchbook/Menu";
import { Crest, Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import { MbPanelHeadLink } from "@/components/matchbook/panels";
import {
  useMatchbookCompete,
  type MbBracketCell,
  type MbCompeteSelected,
  type MbCompetitionRow,
} from "@/components/matchbook/useMatchbookCompete";

/* ===========================================================================
   COMPETE CONSOLE

   Three defects the critics measured here, all of them the same mistake:
   a status was being carried by a hue on a letterform.

     "Draft"  --mb-gold  10.56px/700  2.15:1   (floor 4.5)
     "Live"   --mb-red   14.4px/700   4.20:1
     "Final"  --mb-green 14.4px/700   3.93:1

   The fix is not three darker hexes — it is `MbBadge`, which already solved
   this: the letterforms are navy (11.79:1 on paper, 12.84:1 in a panel) and
   the tone rides a MARK instead, one shape per tone, so the status survives a
   greyscale capture as well as the contrast floor. The local STATUS_STYLES
   table is gone; a status is a badge tone now, in one place.
   =========================================================================== */

/** in_progress / draft / completed as the badge system already names them. */
const STATUS_TONE: Record<MbCompetitionRow["status"], MbBadgeTone> = {
  in_progress: "live",
  draft: "draft",
  completed: "final",
};

const STATUS_LABEL: Record<MbCompetitionRow["status"], string> = {
  in_progress: "Live",
  draft: "Draft",
  completed: "Final",
};

const BracketBox = ({ cell }: { cell: MbBracketCell }) => {
  const side = (
    team: MbBracketCell["home"],
    score: number,
    won: boolean,
    last = false
  ) => (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${last ? "" : "border-b border-mb-rule"}`}
    >
      {team ? (
        <>
          <Crest team={team} size={16} />
          <span
            className={`matchbook-display flex-1 truncate text-[0.7rem] ${won ? "font-bold" : "font-semibold text-mb-ink-muted"}`}
          >
            {team.name}
          </span>
        </>
      ) : (
        <span className="matchbook-display flex-1 text-[0.7rem] text-mb-ink-muted">
          TBD
        </span>
      )}
      {!cell.pending && (
        /* The winner was marked in coral at 12px/700 — 3.55:1, and a fifth
           coral job besides. Weight already says who won; the loser's score is
           muted, so the pair reads in greyscale too. */
        <span
          className={`matchbook-display text-[0.75rem] tabular-nums ${won ? "font-bold" : "font-semibold text-mb-ink-muted"}`}
        >
          {score}
        </span>
      )}
    </div>
  );

  return (
    <div className="w-[148px] shrink-0 border border-mb-navy bg-mb-paper-bright">
      {side(cell.home, cell.homeScore, cell.homeWon)}
      {side(cell.away, cell.awayScore, cell.awayWon, !cell.live)}
      {cell.live && (
        <div className="flex items-center justify-end gap-1 border-t border-mb-rule px-2 py-0.5">
          <MbBadge tone="live">Live</MbBadge>
        </div>
      )}
    </div>
  );
};

const StatusStat = ({
  icon,
  value,
  label,
  sub,
}: {
  icon: string;
  value: string;
  label: string;
  sub?: string;
}) => (
  <div className="flex items-center gap-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mb-navy text-mb-navy">
      <MbIcon id={icon} size={18} />
    </span>
    <div>
      <p className="mb-kicker">{label}</p>
      <p className="matchbook-display text-[1.2rem] font-bold leading-tight tabular-nums">
        {value}
        {sub && (
          <span className="ml-2 text-[0.7rem] font-semibold text-mb-ink-muted">
            {sub}
          </span>
        )}
      </p>
    </div>
  </div>
);

const MainPanel = ({ selected }: { selected: MbCompeteSelected }) => {
  if (selected.isElimination) {
    return (
      <Panel
        title="Championship Bracket"
        meta={
          <MbPanelHeadLink
            href={`/competitions/${selected.competition.id}`}
            label="View Full Bracket"
          />
        }
      >
        {selected.bracket.length === 0 ? (
          <PanelEmpty message="No bracket exists yet — start the competition to generate it." />
        ) : (
          <div className="flex flex-1 items-stretch gap-5 overflow-x-auto p-4">
            {selected.bracket.map((round) => (
              <div key={round.label} className="flex flex-col gap-3">
                <p className="mb-kicker tabular-nums">{round.label}</p>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {round.cells.map((cell, i) => (
                    <BracketBox key={i} cell={cell} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  }

  return (
    <Panel
      title="Standings"
      meta={
        <MbPanelHeadLink
          href={`/competitions/${selected.competition.id}`}
          label="View Full Standings"
        />
      }
    >
      {selected.standings.length === 0 ? (
        <PanelEmpty message="No standings exist yet — play matches to build the table." />
      ) : (
        <div className="overflow-x-auto">
          <table className="mb-table mb-table-compact w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8 pl-3! text-center">#</th>
                <th>Team</th>
                <th className="text-center">W</th>
                <th className="text-center">L</th>
                <th className="text-center">Pct</th>
                <th className="text-center">PF</th>
                <th className="text-center">PA</th>
                <th className="pr-3! text-center">PD</th>
              </tr>
            </thead>
            <tbody>
              {selected.standings.map((line, i) => (
                <tr key={line.team.name + i}>
                  <td
                    className="matchbook-display pl-3! text-center font-bold tabular-nums"
                    style={
                      i === 0
                        ? { boxShadow: "inset 3px 0 0 var(--mb-teal)" }
                        : undefined
                    }
                  >
                    {i + 1}
                  </td>
                  <td>
                    <TeamMark team={line.team} size={20} />
                  </td>
                  <td className="text-center tabular-nums">{line.won}</td>
                  <td className="text-center tabular-nums">{line.lost}</td>
                  <td className="text-center tabular-nums">{line.pct}</td>
                  <td className="text-center tabular-nums">{line.pointsFor}</td>
                  <td className="text-center tabular-nums">{line.pointsAgainst}</td>
                  <td className="matchbook-display pr-3! text-center font-bold tabular-nums">
                    {line.diff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

/**
 * One event in the list. Rebuilt around three findings on the shipped row:
 *
 *   - the row was a `<div onClick>`, so selecting an event was impossible from
 *     a keyboard (HF-15). It is a `<button>` now, and the whole name block is
 *     its label.
 *   - `Open` measured 40.5 x 44 and the delete key 14 x 14 — two of the twelve
 *     sub-44 targets `audit.mjs` counted on this route (HF-2).
 *   - the delete key sat 12px from `Open`, the highest-frequency control in the
 *     row (HF-14).
 *
 * All three answer to the same move: the row's own actions collapse into one
 * 48px `MbMenu` disc, where Open and Delete are menu items with room between
 * them and the destructive one is toned and named in full.
 */
const EventRow = ({
  row,
  selected,
  onSelect,
  onOpen,
  onDelete,
}: {
  row: MbCompetitionRow;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) => (
  /* `py-1` is measured, not decorative. Without it the row is 55.4px, the 48px
     menu disc fills all but 7.4px of it, and consecutive discs land under the
     8px separation floor — six stacked 48px targets with 7px between them is
     the mis-tap the floor exists to prevent. */
  <div
    className="mb-row-hover grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1 pr-2"
    style={selected ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" } : undefined}
  >
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="mb-btn-touch flex min-w-0 flex-col justify-center px-4 py-2 text-left"
    >
      <span className="matchbook-display truncate text-[0.9rem] font-bold">
        {row.name}
      </span>
      <span className="truncate text-[0.7rem] tabular-nums text-mb-ink-muted">
        {row.typeLabel} • {row.teamCount} teams • {row.completed}/{row.total} matches
      </span>
    </button>

    <MbBadge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</MbBadge>

    <MbMenu
      label={`Actions for ${row.name}`}
      items={[
        { label: "Open event", icon: "chevron-right", onSelect: onOpen },
        {
          label: "Delete competition",
          icon: "warning",
          tone: "danger",
          onSelect: onDelete,
        },
      ]}
    />
  </div>
);

export default function CompetitionsPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const data = useMatchbookCompete();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (isLoading || !isAuthenticated) {
    return <MbPageLoading active="/competitions" />;
  }

  const selected = data.selected;
  const deleteTarget = data.rows.find((r) => r.id === deleteId);

  return (
    <MatchbookShell
      active="/competitions"
      /* The rail key IS this screen's primary action, so it keeps the coral and
         the masthead's "Manage Event" takes navy — one coral fill. */
      cta={{ href: "/competitions/new", label: "New Competition", icon: "plus" }}
      masthead={{
        title: selected ? (
          selected.competition.name
        ) : (
          <>
            Compete<span className="text-mb-coral">.</span>
          </>
        ),
        shortTitle: selected?.competition.name ?? "Compete",
        status: selected ? (
          <MbBadge
            tone={STATUS_TONE[selected.competition.status]}
            variant="framed"
            size="md"
          >
            {STATUS_LABEL[selected.competition.status]}
          </MbBadge>
        ) : undefined,
        subLine: selected
          ? `${selected.teamCount} Teams • ${selected.matchTotal} Matches${
              selected.courtCount ? ` • ${selected.courtCount} Courts` : ""
            }`
          : undefined,
        actions: selected
          ? [
              {
                label: "Manage Event",
                href: `/competitions/${selected.competition.id}`,
                icon: "settings",
                tone: "navy",
              },
            ]
          : [],
      }}
    >
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* All events */}
        <div className="xl:col-span-7">
          <Panel
            title="All Events"
            meta={
              <span className="mb-kicker tabular-nums">{data.rows.length} Total</span>
            }
          >
            {data.rows.length === 0 ? (
              <PanelEmpty
                message="No competitions exist yet — create a tournament, round robin, or league to get started."
                actionLabel="New competition"
                href="/competitions/new"
              />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {data.rows.map((row) => (
                  <EventRow
                    key={row.id}
                    row={row}
                    selected={row.id === data.selectedId}
                    onSelect={() => data.setSelectedId(row.id)}
                    onOpen={() => router.push(`/competitions/${row.id}`)}
                    onDelete={() => setDeleteId(row.id)}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Tournament status */}
        <div className="xl:col-span-5">
          <Panel title="Tournament Status" tone="navy" icon="compete">
            {!selected ? (
              <PanelEmpty message="No competition exists yet — its status will appear here." />
            ) : (
              <div className="grid flex-1 grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <StatusStat
                  icon="check"
                  label="Matches Completed"
                  value={`${selected.matchesCompleted} / ${selected.matchTotal}`}
                  sub={
                    selected.matchTotal > 0 ? `${selected.completionPct}%` : undefined
                  }
                />
                <StatusStat
                  icon="teams"
                  label="Teams Entered"
                  value={String(selected.teamCount)}
                />
                <StatusStat icon="clipboard" label="Format" value={selected.typeLabel} />
                {selected.winner ? (
                  <div className="flex items-center gap-3">
                    <Crest team={selected.winner} size={36} />
                    <div>
                      <p className="mb-kicker">Champion</p>
                      <p className="matchbook-display text-[1.2rem] font-bold leading-tight">
                        {selected.winner.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <StatusStat
                    icon="live"
                    label="Live Now"
                    value={String(selected.liveCourts.length)}
                  />
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* Bracket / standings */}
        <div className="xl:col-span-7">
          {selected ? (
            <MainPanel selected={selected} />
          ) : (
            <Panel title="Championship Bracket">
              <PanelEmpty
                message="No bracket exists yet — create a competition to see it here."
                actionLabel="New competition"
                href="/competitions/new"
              />
            </Panel>
          )}
        </div>

        {/* Live courts */}
        <div className="xl:col-span-5">
          <Panel
            title="Live Courts"
            meta={
              selected ? (
                <MbPanelHeadLink
                  href={`/competitions/${selected.competition.id}`}
                  label="View All"
                />
              ) : undefined
            }
          >
            {!selected || selected.liveCourts.length === 0 ? (
              <PanelEmpty message="No live matches exist yet — matches in progress will appear here." />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {selected.liveCourts.map((line, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[52px_1fr_auto_1fr_auto] items-center gap-2 px-3 py-2.5"
                  >
                    <p className="matchbook-display border-r border-mb-rule pr-2 text-[0.7rem] font-bold tabular-nums">
                      {line.court}
                    </p>
                    <TeamMark team={line.home} className="justify-self-start" />
                    {/* Navy. A live score in coral measured 3.55:1 at
                        15.2px/700 — and it is the one number on the row a
                        reader must not have to work for. */}
                    <span className="matchbook-display whitespace-nowrap text-[0.95rem] font-bold tabular-nums">
                      {line.homeScore} – {line.awayScore}
                    </span>
                    <TeamMark team={line.away} reverse className="justify-self-end" />
                    <MbBadge tone="live">Live</MbBadge>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Upcoming schedule */}
        <div className="xl:col-span-4">
          <Panel title="Upcoming Schedule">
            {!selected || selected.schedule.length === 0 ? (
              <PanelEmpty message="No upcoming matches exist yet." />
            ) : (
              /* The coral on this list is the 2px spine (job 4). The round
                 label beside it was a second coral as a LETTERFORM — "Round 4"
                 at 10.56px/700, 3.55:1 — so it takes navy. */
              <div className="ml-3 flex flex-col divide-y divide-mb-rule border-l-2 border-mb-coral">
                {selected.schedule.map((line, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[58px_1fr] items-center gap-2 py-2 pl-3 pr-3"
                  >
                    <p className="matchbook-display text-[0.66rem] font-bold tabular-nums">
                      {line.label}
                    </p>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Crest team={line.home} size={18} />
                      <span className="matchbook-display truncate text-[0.72rem] font-semibold">
                        {line.home.name}
                      </span>
                      <span className="text-[0.6rem] text-mb-ink-muted">vs</span>
                      <Crest team={line.away} size={18} />
                      <span className="matchbook-display truncate text-[0.72rem] font-semibold">
                        {line.away.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Recent results */}
        <div className="xl:col-span-4">
          <Panel title="Recent Results">
            {!selected || selected.recent.length === 0 ? (
              <PanelEmpty message="No results exist yet — finished matches will land here." />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {selected.recent.map((line, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[44px_1fr_auto_1fr] items-center gap-1.5 px-3 py-2"
                  >
                    <p className="matchbook-display text-[0.64rem] font-bold tabular-nums text-mb-ink-muted">
                      {line.label}
                    </p>
                    <TeamMark team={line.home} size={18} className="justify-self-start" />
                    <span className="matchbook-display whitespace-nowrap text-[0.85rem] font-bold tabular-nums">
                      {line.homeScore} – {line.awayScore}
                    </span>
                    <TeamMark
                      team={line.away}
                      size={18}
                      reverse
                      className="justify-self-end"
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Event details */}
        <div className="xl:col-span-4">
          <Panel title="Event Details">
            {!selected ? (
              <PanelEmpty message="No competition exists yet — its details will appear here." />
            ) : (
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <MbIcon id="calendar" size={18} className="shrink-0 text-mb-navy" />
                  <div>
                    <p className="mb-kicker">Created</p>
                    <p className="text-[0.82rem] font-semibold tabular-nums">
                      {selected.createdDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MbIcon id="bracket" size={18} className="shrink-0 text-mb-navy" />
                  <div>
                    <p className="mb-kicker">Format</p>
                    <p className="text-[0.82rem] font-semibold tabular-nums">
                      {selected.teamCount} teams • {selected.typeLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MbIcon id="volleyball" size={18} className="shrink-0 text-mb-navy" />
                  <div>
                    <p className="mb-kicker">Match Format</p>
                    <p className="text-[0.82rem] font-semibold tabular-nums">
                      {selected.seriesLabel}
                    </p>
                  </div>
                </div>
                {/* Navy: this is the masthead's "Manage Event" a second time,
                    and the screen's one coral is already spent on the rail. */}
                <MbButtonLink
                  href={`/competitions/${selected.competition.id}`}
                  variant="navy"
                  icon="compete"
                  fullWidth
                  className="mt-auto"
                >
                  Manage Event
                </MbButtonLink>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Competition?"
        description={`This will permanently delete "${deleteTarget?.name ?? ""}" and all of its matches.`}
        onConfirm={() => {
          if (deleteId) data.deleteCompetition(deleteId);
          setDeleteId(null);
        }}
      />
    </MatchbookShell>
  );
}
