import Link from "next/link";
import { MbIcon } from "./MbIcon";
import { Crest, FormLetters, FormSquares, Panel, PanelEmpty, TeamMark } from "./Panel";
import { readinessColor } from "./teamStats";
import type {
  MbFormRow,
  MbReadinessRow,
  MbScheduleItem,
  MbStatTotal,
  MbTeamRow,
} from "./types";

const SNAPSHOT_ICONS: Record<string, string> = {
  Wins: "compete",
  Teams: "teams",
  Matches: "volleyball",
};

const statusColor = (status: MbTeamRow["status"]) =>
  status === "ACTIVE" ? "var(--mb-green)" : "var(--mb-ink-muted)";

/* ----------------------------- Team directory ----------------------------- */

export const TeamDirectoryPanel = ({
  rows,
  totalTeams,
  selectedId,
  onSelect,
  search,
  onSearchChange,
}: {
  rows: MbTeamRow[];
  totalTeams: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) => (
  <Panel
    title="Team Directory"
    meta={
      totalTeams > 0 ? (
        <label className="mb-search">
          <MbIcon id="search" size={13} className="shrink-0 text-mb-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter teams"
            aria-label="Filter teams by name"
          />
        </label>
      ) : undefined
    }
  >
    {totalTeams === 0 ? (
      <PanelEmpty message="No teams exist yet — add your first team to start the directory." />
    ) : rows.length === 0 ? (
      <PanelEmpty message={`No teams match “${search}”.`} />
    ) : (
      <div className="overflow-x-auto">
        <table className="mb-table w-full border-collapse">
          <thead>
            <tr>
              <th className="w-8 text-center">#</th>
              <th>Team</th>
              <th>Entered In</th>
              <th className="text-center">W</th>
              <th className="text-center">L</th>
              <th className="text-center">Pts</th>
              <th>Next Match</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const selected = row.id === selectedId;
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.id)}
                  className="cursor-pointer transition-colors hover:bg-[rgba(7,50,77,0.04)]"
                  aria-current={selected}
                >
                  <td
                    className="matchbook-display text-center font-bold"
                    style={
                      selected
                        ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
                        : i === 0
                          ? { boxShadow: "inset 3px 0 0 var(--mb-teal)" }
                          : undefined
                    }
                  >
                    {i + 1}
                  </td>
                  <td>
                    <TeamMark team={row.team} />
                  </td>
                  <td className="text-[0.76rem] text-mb-ink-muted">
                    {row.competitions.length === 0 ? (
                      <span className="text-mb-ink-muted/70">No competition</span>
                    ) : (
                      <span className="whitespace-nowrap">
                        {row.competitions[0]}
                        {row.competitions.length > 1 && ` +${row.competitions.length - 1}`}
                      </span>
                    )}
                  </td>
                  <td className="text-center tabular-nums">{row.won}</td>
                  <td className="text-center tabular-nums">{row.lost}</td>
                  <td className="text-center tabular-nums whitespace-nowrap">
                    {row.played === 0 ? "—" : `${row.pointsFor}–${row.pointsAgainst}`}
                  </td>
                  <td className="text-[0.72rem] whitespace-nowrap">
                    {row.nextMatch ? (
                      <>
                        <span className="matchbook-display font-bold tracking-[0.04em]">
                          {row.nextMatch.date}
                        </span>{" "}
                        <span className="text-mb-ink-muted">
                          {row.nextMatch.isHome ? "vs" : "@"}
                        </span>{" "}
                        <span className="matchbook-display font-semibold">
                          {row.nextMatch.opponent.name}
                        </span>
                        <span className="block text-[0.66rem] text-mb-ink-muted">
                          {row.nextMatch.time} • {row.nextMatch.competition}
                        </span>
                      </>
                    ) : (
                      <span className="text-mb-ink-muted">Not scheduled</span>
                    )}
                  </td>
                  <td className="text-right">
                    <span
                      className="matchbook-display text-[0.66rem] font-bold whitespace-nowrap"
                      style={{ color: statusColor(row.status) }}
                    >
                      {row.status}
                    </span>
                    <span className="mt-1 block">
                      <FormSquares form={row.form} slots={5} warnTint />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);

/* ------------------------------ Club snapshot ----------------------------- */

export const ClubSnapshotPanel = ({ stats }: { stats: MbStatTotal[] }) => (
  <Panel title="Club Snapshot" icon="chart" tone="navy">
    <div className="grid flex-1 grid-cols-3 divide-x divide-mb-rule px-2 py-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center justify-center gap-1 px-2 text-center"
        >
          <MbIcon
            id={SNAPSHOT_ICONS[stat.label] ?? "chart"}
            size={30}
            className="text-mb-navy"
          />
          <span className="matchbook-display text-4xl font-bold leading-none tabular-nums">
            {stat.value}
          </span>
          <span className="mb-kicker">{stat.label}</span>
        </div>
      ))}
    </div>
  </Panel>
);

/* ----------------------------- Team readiness ----------------------------- */

export const TeamReadinessPanel = ({ rows }: { rows: MbReadinessRow[] }) => (
  <Panel title="Team Readiness" icon="chart" tone="navy">
    {rows.length === 0 ? (
      <PanelEmpty message="No readiness data exists yet — add teams and play matches." />
    ) : (
      <div className="overflow-x-auto">
        <table className="mb-table mb-table-compact w-full border-collapse">
          <thead>
            <tr>
              <th className="pl-3!">Team</th>
              <th>Ready %</th>
              <th className="pr-3! text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team.name}>
                <td className="pl-3! matchbook-display text-[0.8rem] font-semibold">
                  {row.team.name}
                </td>
                <td>
                  <span className="flex items-center gap-2">
                    <span className="w-8 text-[0.76rem] font-semibold tabular-nums">
                      {row.percent}%
                    </span>
                    <span className="h-[7px] w-24 overflow-hidden rounded-sm bg-[rgba(7,50,77,0.12)]">
                      <span
                        className="block h-full"
                        style={{
                          width: `${row.percent}%`,
                          background: readinessColor(row.percent),
                        }}
                      />
                    </span>
                  </span>
                </td>
                <td
                  className="matchbook-display pr-3! text-right text-[0.66rem] font-bold"
                  style={{ color: readinessColor(row.percent) }}
                >
                  {row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);

/* ------------------------------- Team profile ----------------------------- */

const ProfileStat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center justify-center gap-0.5 border border-mb-rule px-2 py-2 text-center">
    <span className="mb-kicker">{label}</span>
    <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">
      {value}
    </span>
  </div>
);

export const TeamProfilePanel = ({
  row,
  onEdit,
  onDelete,
}: {
  row: MbTeamRow | null;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <Panel title={row ? `Team Profile: ${row.team.name}` : "Team Profile"}>
    {!row ? (
      <PanelEmpty message="No team selected yet — add a team, then pick a row in the directory to see its profile." />
    ) : (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start gap-4">
          {/* Identity */}
          <div className="flex min-w-[150px] flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <Crest team={row.team} size={62} />
              <span className="matchbook-display text-2xl font-bold leading-tight">
                {row.team.name}
              </span>
            </div>
            {row.color && (
              <div>
                <p className="mb-kicker">Colour</p>
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border border-mb-navy"
                    style={{ background: row.color }}
                  />
                  <span className="text-[0.76rem] font-medium uppercase tabular-nums">
                    {row.color}
                  </span>
                </span>
              </div>
            )}
            <div>
              <p className="mb-kicker">Entered In</p>
              <p className="text-[0.8rem] font-medium">
                {row.competitions.length === 0 ? (
                  <span className="text-mb-ink-muted">No competition yet</span>
                ) : (
                  row.competitions.join(", ")
                )}
              </p>
            </div>
          </div>

          {/* Record */}
          <div className="grid min-w-[210px] flex-1 grid-cols-2 gap-2">
            <div className="col-span-2 flex flex-col items-center justify-center gap-0.5 border-[1.5px] border-mb-navy px-2 py-2">
              <span className="mb-kicker">Overall Record</span>
              <span className="matchbook-display text-3xl font-bold leading-none tabular-nums">
                {row.won} - {row.lost}
              </span>
            </div>
            <ProfileStat label="Matches" value={String(row.played)} />
            <ProfileStat
              label="Win Rate"
              value={row.played === 0 ? "—" : `${Math.round((row.won / row.played) * 100)}%`}
            />
            <ProfileStat
              label="Points For"
              value={row.played === 0 ? "—" : String(row.pointsFor)}
            />
            <ProfileStat
              label="Points Against"
              value={row.played === 0 ? "—" : String(row.pointsAgainst)}
            />
          </div>
        </div>

        {/* Next match + form */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-t border-mb-rule pt-3">
          <div>
            <p className="mb-kicker">Next Match</p>
            {row.nextMatch ? (
              <>
                <p className="matchbook-display text-[0.85rem] font-bold tracking-[0.04em]">
                  {row.nextMatch.date} {row.nextMatch.isHome ? "vs" : "@"}{" "}
                  {row.nextMatch.opponent.name}
                </p>
                <p className="text-[0.72rem] text-mb-ink-muted">
                  {row.nextMatch.time} • {row.nextMatch.competition}
                </p>
              </>
            ) : (
              <p className="text-[0.8rem] text-mb-ink-muted">Not scheduled</p>
            )}
          </div>
          <div>
            <p className="mb-kicker">Recent Form</p>
            {row.form.length === 0 ? (
              <p className="text-[0.8rem] text-mb-ink-muted">No matches played yet</p>
            ) : (
              <FormSquares form={row.form} slots={row.form.length} warnTint />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-2 border-t border-mb-rule pt-3">
          <button type="button" onClick={onEdit} className="mb-btn mb-btn-navy flex-1">
            <MbIcon id="settings" size={14} />
            Edit Team
          </button>
          <Link href="/quick-match" className="mb-btn mb-btn-coral flex-1">
            <MbIcon id="quick" size={14} />
            Quick Match
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="mb-btn mb-btn-outline flex-1"
          >
            <MbIcon id="warning" size={14} />
            Delete
          </button>
        </div>
      </div>
    )}
  </Panel>
);

/* ---------------------------- Upcoming fixtures --------------------------- */

export const UpcomingFixturesPanel = ({ items }: { items: MbScheduleItem[] }) => (
  <Panel title="Upcoming Fixtures" action="View Full Schedule" href="/competitions">
    {items.length === 0 ? (
      <PanelEmpty
        message="No fixtures exist yet — start a competition to schedule matches."
        actionLabel="New competition"
        href="/competitions/new"
      />
    ) : (
      <div className="flex flex-col divide-y divide-mb-rule">
        {items.map((item, i) => (
          <div
            key={i}
            className="grid grid-cols-[42px_56px_1fr] items-center gap-2 px-3 py-2"
          >
            <div>
              <p className="matchbook-display text-[0.64rem] font-bold leading-tight">
                {item.day}
              </p>
              <p className="matchbook-display text-[0.64rem] font-bold leading-tight text-mb-coral">
                {item.date}
              </p>
            </div>
            <p className="text-[0.72rem] font-semibold tabular-nums">{item.time}</p>
            <div className="min-w-0">
              <span className="flex items-center gap-1.5 min-w-0">
                <Crest team={item.home} size={18} />
                <span className="matchbook-display text-[0.72rem] font-semibold truncate">
                  {item.home.name}
                </span>
                <span className="px-0.5 text-[0.6rem] text-mb-ink-muted">vs</span>
                <Crest team={item.away} size={18} />
                <span className="matchbook-display text-[0.72rem] font-semibold truncate">
                  {item.away.name}
                </span>
              </span>
              <span className="block truncate text-[0.64rem] text-mb-ink-muted">
                {item.venue}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
    <div className="mt-auto border-t border-mb-rule px-4 py-2 text-center">
      <Link href="/competitions" className="mb-panel-link justify-center">
        View Full Fixture List
        <MbIcon id="chevron-right" size={11} />
      </Link>
    </div>
  </Panel>
);

/* ------------------------------- Recent form ------------------------------ */

export const RecentFormPanel = ({ rows }: { rows: MbFormRow[] }) => (
  <Panel
    title="Recent Form"
    meta={<span className="mb-kicker">Last 5 Matches</span>}
  >
    {rows.length === 0 ? (
      <PanelEmpty
        message="No form exists yet — completed matches build each team's form."
        actionLabel="Play a match"
        href="/quick-match"
      />
    ) : (
      <div className="flex flex-col divide-y divide-mb-rule">
        {rows.map((row) => (
          <div
            key={row.team.name}
            className="flex items-center justify-between gap-2 px-3 py-2.5"
          >
            <TeamMark team={row.team} size={22} className="min-w-0 flex-1" />
            <FormLetters form={row.form} />
            <span className="matchbook-display w-10 text-right text-[0.76rem] font-bold tabular-nums">
              {row.record}
            </span>
          </div>
        ))}
      </div>
    )}
    <div className="mt-auto border-t border-mb-rule px-4 py-2 text-center">
      <Link href="/summaries" className="mb-panel-link justify-center">
        View Full Match History
        <MbIcon id="chevron-right" size={11} />
      </Link>
    </div>
  </Panel>
);
