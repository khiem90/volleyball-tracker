import Link from "next/link";
import { MbIcon } from "./MbIcon";
import { Crest, FormLetters, FormSquares, Panel, PanelEmpty, TeamMark } from "./Panel";
import type {
  MbBracket,
  MbFeaturedMatch,
  MbLeader,
  MbLiveCourt,
  MbReadinessRow,
  MbRecentResult,
  MbScheduleItem,
  MbStatTotal,
  MbStandingRow,
} from "./types";

const FooterLink = ({ href, label }: { href: string; label: string }) => (
  <div className="border-t border-mb-rule px-4 py-2 text-center mt-auto">
    <Link href={href} className="mb-panel-link justify-center">
      {label}
      <MbIcon id="chevron-right" size={11} />
    </Link>
  </div>
);

const statusColor = (percent: number) =>
  percent >= 85
    ? "var(--mb-green)"
    : percent >= 65
      ? "var(--mb-gold)"
      : "var(--mb-red)";

/* ------------------------------- Standings ------------------------------- */

export const StandingsPanel = ({
  title,
  rows,
}: {
  title: string;
  rows: MbStandingRow[];
}) => (
  <Panel title={title} action="View Full Table" href="/competitions">
    {rows.length === 0 ? (
      <PanelEmpty
        message="No standings exist yet — create teams and play matches to build the table."
        actionLabel="Create a team"
        href="/teams"
      />
    ) : (
      <div className="overflow-x-auto">
        <table className="mb-table w-full border-collapse">
          <thead>
            <tr>
              <th className="w-8 text-center">#</th>
              <th>Team</th>
              <th className="text-center">P</th>
              <th className="text-center">W</th>
              <th className="text-center">L</th>
              <th className="text-center">Sets</th>
              <th className="text-center">Pts</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.team.name + i}>
                <td
                  className="matchbook-display text-center font-bold"
                  style={
                    i === 0
                      ? { boxShadow: "inset 3px 0 0 var(--mb-teal)" }
                      : undefined
                  }
                >
                  {i + 1}
                </td>
                <td>
                  <TeamMark team={row.team} />
                </td>
                <td className="text-center tabular-nums">{row.played}</td>
                <td className="text-center tabular-nums">{row.won}</td>
                <td className="text-center tabular-nums">{row.lost}</td>
                <td className="text-center tabular-nums whitespace-nowrap">{row.sets}</td>
                <td className="matchbook-display text-center font-bold tabular-nums">
                  {row.points}
                </td>
                <td>
                  <FormSquares form={row.form} warnTint />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);

/* ---------------------------- Match of the day ---------------------------- */

export const MatchOfTheDayPanel = ({ match }: { match: MbFeaturedMatch | null }) => (
  <section className="mb-panel">
    <header className="flex items-center gap-2 bg-mb-navy px-4 py-2.5 text-mb-paper-bright">
      <MbIcon id="star" size={16} className="text-mb-gold" />
      <h2 className="matchbook-display text-[0.95rem] font-bold tracking-[0.05em]">
        Match of the Day
      </h2>
    </header>
    {!match ? (
      <PanelEmpty
        message="No match of the day exists yet — your latest completed match will be featured here."
        actionLabel="Start a match"
        href="/quick-match"
      />
    ) : (
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="matchbook-display text-[0.72rem] font-semibold tracking-[0.08em]">
            {match.division}
          </p>
          <p className="matchbook-display text-[0.8rem] font-bold text-mb-coral">
            {match.time}
          </p>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-3 px-5 py-4">
          <div className="flex flex-col items-center gap-1.5">
            <Crest team={match.home} size={58} />
            <span className="matchbook-display text-[0.8rem] font-bold">
              {match.home.name}
            </span>
          </div>
          <span className="matchbook-display text-5xl font-bold tabular-nums">
            {match.homeScore}
          </span>
          <span className="mb-score-box text-[0.7rem] tracking-[0.1em] px-2">VS</span>
          <span className="matchbook-display text-5xl font-bold tabular-nums">
            {match.awayScore}
          </span>
          <div className="flex flex-col items-center gap-1.5">
            <Crest team={match.away} size={58} />
            <span className="matchbook-display text-[0.8rem] font-bold">
              {match.away.name}
            </span>
          </div>
        </div>
        {match.sets.length > 0 && (
          <div className="mx-4 border-t border-mb-rule">
            {match.sets.map((set, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-mb-rule py-1 text-[0.85rem] tabular-nums last:border-b-0"
              >
                <span className={set.home > set.away ? "font-bold" : "text-mb-ink-muted"}>
                  {set.home}
                </span>
                <span className="mb-kicker">Set {i + 1}</span>
                <span
                  className={`text-right ${set.away > set.home ? "font-bold" : "text-mb-ink-muted"}`}
                >
                  {set.away}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t-[1.5px] border-mb-navy px-4 py-2">
          <span className="flex items-center gap-1.5 text-[0.72rem] font-medium">
            <MbIcon id="location" size={13} className="text-mb-coral" />
            <span className="matchbook-display tracking-[0.06em]">{match.venue}</span>
          </span>
          {match.attendance && (
            <span className="mb-kicker">Attendance: {match.attendance}</span>
          )}
        </div>
      </div>
    )}
  </section>
);

/* ------------------------------- Live courts ------------------------------ */

export const LiveCourtsPanel = ({ courts }: { courts: MbLiveCourt[] }) => (
  <Panel title="Live Courts" action="View All Courts" href="/competitions">
    {courts.length === 0 ? (
      <PanelEmpty
        message="No live matches exist yet — matches in progress will appear here."
        actionLabel="Start a quick match"
        href="/quick-match"
      />
    ) : (
      <div className="flex flex-col divide-y divide-mb-rule">
        {courts.map((court, i) => (
          <div key={i} className="grid grid-cols-[64px_1fr_auto_1fr_auto] items-center gap-2 px-3 py-3">
            <div className="border-r border-mb-rule pr-2">
              <p className="matchbook-display text-[0.72rem] font-bold leading-tight">
                {court.court}
              </p>
              <p className="text-[0.68rem] text-mb-ink-muted">{court.time}</p>
            </div>
            <TeamMark team={court.home} className="justify-self-start" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="flex items-center gap-1.5">
                <span className="mb-score-box">{court.homeScore}</span>
                <span className="text-mb-ink-muted text-xs">–</span>
                <span className="mb-score-box">{court.awayScore}</span>
              </span>
              <span className="mb-kicker">{court.setLabel}</span>
            </div>
            <TeamMark team={court.away} reverse className="justify-self-end" />
            <span className="flex items-center gap-1">
              <span className="mb-live-dot" />
              <span className="matchbook-display text-[0.62rem] font-bold text-mb-red">
                Live
              </span>
            </span>
          </div>
        ))}
      </div>
    )}
    <FooterLink href="/competitions" label="View All Live Courts" />
  </Panel>
);

/* -------------------------------- Schedule -------------------------------- */

export const SchedulePanel = ({ items }: { items: MbScheduleItem[] }) => (
  <Panel title="Upcoming Schedule" action="View Full Schedule" href="/competitions">
    {items.length === 0 ? (
      <PanelEmpty
        message="No upcoming matches exist yet — start a competition to fill the schedule."
        actionLabel="New competition"
        href="/competitions/new"
      />
    ) : (
      <div className="ml-3 flex flex-col divide-y divide-mb-rule border-l-2 border-mb-coral">
        {items.map((item, i) => (
          <div
            key={i}
            className="grid grid-cols-[42px_50px_1fr] items-center gap-1 py-2 pl-2.5 pr-2.5"
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
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <span className="flex items-center gap-1 min-w-0">
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
              <span className="hidden xl:flex max-w-[104px] items-center gap-1 text-[0.62rem] text-mb-ink-muted">
                <MbIcon id="location" size={10} className="shrink-0" />
                <span className="truncate">{item.venue}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
    <FooterLink href="/competitions" label="View Full Schedule" />
  </Panel>
);

/* --------------------------------- Bracket -------------------------------- */

export const BracketPanel = ({ bracket }: { bracket: MbBracket | null }) => (
  <Panel title="Championship Bracket" action="View Full Bracket" href="/competitions">
    {!bracket ? (
      <PanelEmpty
        message="No bracket exists yet — it appears once four or more teams are ranked."
        actionLabel="Create a bracket"
        href="/competitions/new"
      />
    ) : (
      <div className="flex items-center gap-0 px-4 py-4 flex-1">
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <p className="mb-kicker -mb-2">Semifinals</p>
          {bracket.semifinals.map((pair, i) => (
            <div key={i} className="flex items-stretch">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {pair.map((seed) => (
                  <div key={seed.seed} className="mb-seed-box">
                    <span className="matchbook-display w-4 text-center text-[0.72rem] font-bold text-mb-ink-muted">
                      {seed.seed}
                    </span>
                    <Crest team={seed.team} size={20} />
                    <span className="matchbook-display text-[0.76rem] font-semibold truncate">
                      {seed.team.name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-3 shrink-0 self-stretch my-3 border-y-[1.5px] border-r-[1.5px] border-mb-navy" />
            </div>
          ))}
        </div>
        <div className="w-4 shrink-0 border-t-[1.5px] border-mb-navy" />
        <div className="flex w-[118px] shrink-0 flex-col items-center gap-1.5">
          <p className="mb-kicker self-start">Final</p>
          <div className="flex w-full items-center gap-2 border-[1.5px] border-mb-navy bg-mb-paper-bright px-2.5 py-2">
            <MbIcon id="compete" size={20} className="text-mb-navy" />
            <span className="matchbook-display text-[0.76rem] font-semibold leading-tight text-mb-ink-muted">
              TBD
              <br />
              TBD
            </span>
          </div>
          <p className="text-center text-[0.62rem] leading-snug text-mb-ink-muted">
            {bracket.finalNote}
            <br />
            {bracket.finalVenue}
          </p>
        </div>
      </div>
    )}
    <FooterLink href="/competitions" label="View Full Bracket" />
  </Panel>
);

/* ----------------------------- Recent results ----------------------------- */

export const RecentResultsPanel = ({ results }: { results: MbRecentResult[] }) => (
  <Panel title="Recent Results" action="View All Results" href="/summaries">
    {results.length === 0 ? (
      <PanelEmpty
        message="No results exist yet — finished matches will land here."
        actionLabel="Play a match"
        href="/quick-match"
      />
    ) : (
      <div className="flex flex-col divide-y divide-mb-rule">
        {results.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[44px_1fr_auto_1fr] items-center gap-2 py-2.5 pl-3 pr-3 xl:grid-cols-[44px_1fr_auto_1fr_88px]"
            style={{ boxShadow: `inset 3px 0 0 ${r.accent}` }}
          >
            <p className="matchbook-display text-[0.66rem] font-bold leading-tight text-mb-ink-muted">
              {r.date}
            </p>
            <TeamMark team={r.home} className="justify-self-start" />
            <span className="matchbook-display whitespace-nowrap text-[0.95rem] font-bold tabular-nums">
              {r.homeScore} – {r.awayScore}
            </span>
            <TeamMark team={r.away} reverse className="justify-self-end" />
            <span className="hidden truncate text-right text-[0.64rem] text-mb-ink-muted xl:block">
              {r.venue}
            </span>
          </div>
        ))}
      </div>
    )}
    <FooterLink href="/summaries" label="View Full Match History" />
  </Panel>
);

/* ----------------------------- Team readiness ----------------------------- */

export const ReadinessPanel = ({ rows }: { rows: MbReadinessRow[] }) => (
  <Panel title="Team Readiness" action="View All Teams" href="/teams">
    {rows.length === 0 ? (
      <PanelEmpty
        message="No teams exist yet — add teams to track their form and readiness."
        actionLabel="Create a team"
        href="/teams"
      />
    ) : (
      <div className="overflow-x-auto">
        <table className="mb-table mb-table-compact w-full border-collapse">
          <thead>
            <tr>
              <th className="pl-3!">Team</th>
              <th>Ready %</th>
              <th>Form (Last 5)</th>
              <th className="pr-3! text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team.name}>
                <td className="pl-3!">
                  <TeamMark team={row.team} size={20} />
                </td>
                <td>
                  <span className="flex items-center gap-1.5">
                    <span className="w-7 text-[0.74rem] font-semibold tabular-nums">
                      {row.percent}%
                    </span>
                    <span className="h-[7px] w-12 overflow-hidden rounded-sm bg-[rgba(7,50,77,0.12)]">
                      <span
                        className="block h-full"
                        style={{
                          width: `${row.percent}%`,
                          background: statusColor(row.percent),
                        }}
                      />
                    </span>
                  </span>
                </td>
                <td>
                  <FormLetters form={row.form} />
                </td>
                <td
                  className="matchbook-display pr-3! text-right text-[0.64rem] font-bold"
                  style={{ color: statusColor(row.percent) }}
                >
                  {row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    <FooterLink href="/teams" label="View Team Directory" />
  </Panel>
);

/* ------------------------------ Team leaders ------------------------------ */

export const LeadersPanel = ({
  leaders,
  totals,
}: {
  leaders: MbLeader[];
  totals: MbStatTotal[];
}) => (
  <Panel title="Team Leaders">
    {leaders.length === 0 ? (
      <PanelEmpty
        message="No team leaders exist yet — leaders are crowned once matches are recorded."
        actionLabel="Play a match"
        href="/quick-match"
      />
    ) : (
      <div className="grid flex-1 grid-cols-3 divide-x divide-mb-rule px-2 py-4">
        {leaders.map((leader) => (
          <div key={leader.stat} className="flex flex-col items-center gap-1 px-2 text-center">
            <Crest team={leader.team} size={54} />
            <span className="matchbook-display mt-1 text-[0.8rem] font-bold">
              {leader.team.name}
            </span>
            <span className="mb-kicker">{leader.stat}</span>
            <span className="matchbook-display text-4xl font-bold tabular-nums">
              {leader.value}
            </span>
          </div>
        ))}
      </div>
    )}
    {totals.length > 0 && (
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t-[1.5px] border-mb-navy px-4 py-2">
        <span className="matchbook-display text-[0.68rem] font-bold tracking-[0.08em]">
          All-Time Totals
        </span>
        {totals.map((total) => (
          <span key={total.label} className="flex items-baseline gap-1.5">
            <span className="mb-kicker">{total.label}</span>
            <span className="matchbook-display text-[0.8rem] font-bold tabular-nums">
              {total.value}
            </span>
          </span>
        ))}
      </div>
    )}
  </Panel>
);
