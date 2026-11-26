import { useCallback, type ReactNode } from "react";
import Link from "next/link";
import {
  CARD_ROW,
  Card,
  CardEmpty,
  Chip,
  FormDots,
  FormLetters,
  Icon,
  ScoreLine,
  TeamMark,
  TeamName,
} from "@/components/shared";
import { readinessColor } from "@/lib/teamStats";
import type {
  FormRow,
  NextMatch,
  ReadinessRow,
  ReadinessStatus,
  ScheduleItem,
  StatTotal,
  TeamRow,
  TeamStatus,
} from "@/lib/teamShapes";
import { cn } from "@/lib/utils";

const SNAPSHOT_ICONS: Record<string, string> = {
  Wins: "compete",
  Teams: "teams",
  Matches: "volleyball",
};

/* The words a status reads as. The data keeps its capitals and the screen does not shout. */
const STATUS_LABEL: Record<TeamStatus, string> = {
  ACTIVE: "Active",
  IDLE: "Idle",
};

const READINESS_LABEL: Record<ReadinessStatus, string> = {
  READY: "Ready",
  GOOD: "Good",
  "NEEDS ATTN": "Needs attention",
};

/* The small label over a fact. */
const LABEL = "text-caption font-medium text-ink-soft";

/* The link at a card's foot, green and bold as on Home. */
const FOOT_LINK = `card-link mt-auto justify-center border-t border-line text-body font-bold text-action ${CARD_ROW}`;

/* ----------------------------- Team directory ----------------------------- */

/** Select mode: rows carry checkboxes and a tap checks a row instead of opening its profile. */
export interface TeamSelection {
  checked: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

/*
 * One team's row. On a phone the name sits beside the status, with the record
 * and the next match on lines of their own under it. From md up every fact
 * has a column, and the fixed widths keep the columns in line from row to row.
 */
const DIRECTORY_ROW = cn(
  CARD_ROW,
  "grid w-full grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-left",
  "md:grid-cols-[1.5rem_auto_minmax(0,1.2fr)_10.5rem_minmax(0,1fr)_4.5rem]",
);

/** Won, lost, and points for and against, each with the word the old column heads gave it. */
const RecordFacts = ({ row }: { row: TeamRow }) => (
  <span className="col-span-2 col-start-3 row-start-2 flex flex-wrap gap-x-3 text-caption tabular-nums text-ink-soft md:col-span-1 md:col-start-4 md:row-start-1">
    <span>
      <span className="font-semibold text-ink">{row.won}</span> W
    </span>
    <span>
      <span className="font-semibold text-ink">{row.lost}</span> L
    </span>
    <span>
      Pts{" "}
      <span className="font-semibold text-ink">
        {row.played === 0 ? "—" : `${row.pointsFor}–${row.pointsAgainst}`}
      </span>
    </span>
  </span>
);

/** When a team plays next, against whom, and in what. */
const NextMatchFacts = ({ next, className }: { next: NextMatch | null; className?: string }) =>
  next ? (
    <span className={cn("flex min-w-0 flex-col text-caption", className)}>
      <span className="font-semibold wrap-anywhere">
        {next.date}{" "}
        <span className="font-normal text-ink-soft">{next.isHome ? "vs" : "@"}</span>{" "}
        {next.opponent.name}
      </span>
      <span className="text-ink-soft wrap-anywhere">
        {next.time} • {next.competition}
      </span>
    </span>
  ) : (
    <span className={cn("text-caption text-ink-soft", className)}>Not scheduled</span>
  );

/** What a directory row shows after its first cell, which is the rank or the checkbox. */
const DirectoryFacts = ({ row, selected }: { row: TeamRow; selected: boolean }) => (
  <>
    <TeamMark name={row.team.name} color={row.team.color} size={32} />
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-title font-semibold leading-snug wrap-anywhere">{row.team.name}</span>
      <span className="text-caption text-ink-soft wrap-anywhere">
        {row.competitions.length === 0
          ? "No competition"
          : `${row.competitions[0]}${
              row.competitions.length > 1 ? ` +${row.competitions.length - 1}` : ""
            }`}
      </span>
    </span>
    <RecordFacts row={row} />
    <NextMatchFacts
      next={row.nextMatch}
      className="col-span-2 col-start-3 row-start-3 md:col-span-1 md:col-start-5 md:row-start-1"
    />
    <span className="col-start-4 row-start-1 flex flex-col items-end gap-1.5 md:col-start-6">
      {/* On the selected row's tint a chip needs white under it to keep its edge. */}
      <Chip
        tone={row.status === "ACTIVE" ? "action" : "fill"}
        className={selected ? "bg-surface" : ""}
      >
        {STATUS_LABEL[row.status]}
      </Chip>
      <FormDots form={row.form} slots={5} />
    </span>
  </>
);

export const TeamDirectoryPanel = ({
  rows,
  totalTeams,
  selectedId,
  revealId,
  onSelect,
  search,
  onSearchChange,
  headerAction,
  strip,
  selection,
}: {
  rows: TeamRow[];
  totalTeams: number;
  selectedId: string | null;
  /** A row to scroll into view when it appears, such as a team just added. */
  revealId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** A control shown in the header beside the filter. */
  headerAction?: ReactNode;
  /** The strip shown above the rows: the add form, or the selection bar. */
  strip: ReactNode;
  /** Present while in select mode. */
  selection?: TeamSelection;
}) => {
  // Runs when the row for revealId mounts, or when revealId moves to it. The
  // list is its own scroll area, so this moves the rows, not the page, and
  // the add strip above stays put for the next name.
  const reveal = useCallback((row: HTMLLIElement | null) => {
    row?.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    <Card
      title="Team Directory"
      meta={
        totalTeams > 0 ? (
          <span className="flex flex-wrap items-center justify-end gap-2">
            <label className="field-search">
              <Icon id="search" size={16} className="shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Filter teams"
                aria-label="Filter teams by name"
              />
            </label>
            {headerAction}
          </span>
        ) : undefined
      }
    >
      {strip}
      {totalTeams === 0 ? (
        <CardEmpty message="No teams yet. Type a name above and press Enter, or paste a list." />
      ) : rows.length === 0 ? (
        <CardEmpty message={`No teams match “${search}”.`} />
      ) : (
        /*
         * The list scrolls inside the card. Up to xl the card sits in a row of
         * its own, so the list stops at 60% of the window. From xl the card is
         * stretched to the two cards beside it, and the list fills what the
         * card has: it grows from a basis of nothing, so the row's height comes
         * from those two cards and not from the length of the roster.
         */
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto xl:max-h-none xl:min-h-36 xl:grow xl:basis-0">
          {rows.map((row, i) => {
            const selected = !selection && row.id === selectedId;
            return (
              <li key={row.id} ref={row.id === revealId ? reveal : undefined}>
                {selection ? (
                  // The label is the row, so a tap anywhere on it checks the box once.
                  <label className={cn(DIRECTORY_ROW, "cursor-pointer")}>
                    <input
                      type="checkbox"
                      className="field-check"
                      checked={selection.checked.has(row.id)}
                      onChange={() => selection.onToggle(row.id)}
                      aria-label={`Select ${row.team.name}`}
                    />
                    <DirectoryFacts row={row} selected={false} />
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    aria-current={selected}
                    className={cn(
                      DIRECTORY_ROW,
                      "cursor-pointer",
                      selected && "bg-action-tint hover:bg-action-tint",
                    )}
                  >
                    <span className="text-center text-label font-bold tabular-nums text-ink-soft">
                      {i + 1}
                    </span>
                    <DirectoryFacts row={row} selected={selected} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

/**
 * The strip shown above the rows in select mode: how many are checked, a
 * select-all for the rows shown, and the delete that covers them all.
 */
export const TeamSelectionBar = ({
  count,
  shown,
  allChecked,
  onSetAll,
  onDelete,
}: {
  /** Checked teams, wherever they are in the list. */
  count: number;
  /** Rows on screen after the filter, which is what select all covers. */
  shown: number;
  allChecked: boolean;
  onSetAll: (checked: boolean) => void;
  onDelete: () => void;
}) => (
  <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
    <span role="status" className="text-label font-semibold tabular-nums">
      {count} selected
    </span>
    <button
      type="button"
      onClick={() => onSetAll(!allChecked)}
      className="btn btn-fill"
      disabled={shown === 0}
    >
      {allChecked ? "Clear all" : shown === 1 ? "Select the one shown" : `Select all ${shown} shown`}
    </button>
    <button
      type="button"
      onClick={onDelete}
      className="btn btn-danger-quiet ml-auto"
      disabled={count === 0}
    >
      <Icon id="trash" size={14} />
      Delete selected
    </button>
  </div>
);

/* ------------------------------ Club snapshot ----------------------------- */

export const ClubSnapshotPanel = ({ stats }: { stats: StatTotal[] }) => (
  <Card title="Club Snapshot" icon="chart">
    <div className="grid flex-1 grid-cols-3 divide-x divide-line py-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center justify-center gap-1 px-2 text-center"
        >
          <Icon
            id={SNAPSHOT_ICONS[stat.label] ?? "chart"}
            size={22}
            className="text-ink-soft"
          />
          <span className="text-page-title font-extrabold leading-none tabular-nums">
            {stat.value}
          </span>
          <span className={LABEL}>{stat.label}</span>
        </div>
      ))}
    </div>
  </Card>
);

/* ----------------------------- Team readiness ----------------------------- */

export const TeamReadinessPanel = ({ rows }: { rows: ReadinessRow[] }) => (
  <Card title="Team Readiness" icon="chart">
    {rows.length === 0 ? (
      <CardEmpty message="No readiness data exists yet — add teams and play matches." />
    ) : (
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.team.name} className="flex items-center gap-3 px-4 py-3">
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-label font-semibold">{row.team.name}</span>
                <span className="shrink-0 text-caption font-semibold tabular-nums">
                  {row.percent}%
                </span>
              </span>
              <span
                aria-hidden="true"
                className="block h-1.5 overflow-hidden rounded-pill bg-ink-soft/20"
              >
                <span
                  className="block h-full rounded-pill"
                  style={{
                    width: `${row.percent}%`,
                    background: readinessColor(row.percent),
                  }}
                />
              </span>
            </span>
            {/* One width for every status, so the bars end in line. */}
            <span className="flex w-[7.5rem] shrink-0 justify-end">
              <Chip tone={row.status === "READY" ? "action" : "fill"}>
                {READINESS_LABEL[row.status]}
              </Chip>
            </span>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

/* ------------------------------- Team profile ----------------------------- */

const ProfileStat = ({
  label,
  value,
  lead = false,
}: {
  label: string;
  value: string;
  /** The record that heads the tiles, at twice the width and the largest figure. */
  lead?: boolean;
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-0.5 rounded-tile bg-fill px-2 py-2.5 text-center",
      lead && "col-span-2",
    )}
  >
    <span className={LABEL}>{label}</span>
    <span
      className={cn(
        "tabular-nums",
        lead ? "text-page-title font-extrabold leading-none" : "text-title font-bold",
      )}
    >
      {value}
    </span>
  </div>
);

export const TeamProfilePanel = ({
  row,
  onEdit,
  onDelete,
}: {
  row: TeamRow | null;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <Card title={row ? `Team Profile: ${row.team.name}` : "Team Profile"}>
    {!row ? (
      <CardEmpty message="No team selected yet — add a team, then pick a row in the directory to see its profile." />
    ) : (
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Identity. The name has the card's full width, so a long one wraps at its words. */}
        <div className="flex items-center gap-3">
          <TeamMark name={row.team.name} color={row.team.color} size={48} />
          <span className="min-w-0 text-page-title font-extrabold leading-tight wrap-anywhere">
            {row.team.name}
          </span>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          {/* Facts */}
          <div className="flex min-w-[150px] flex-1 flex-col gap-3">
            {row.color && (
              <div>
                <p className={LABEL}>Colour</p>
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded-full" style={{ background: row.color }} />
                  <span className="text-label font-medium tabular-nums">{row.color}</span>
                </span>
              </div>
            )}
            <div>
              <p className={LABEL}>Entered In</p>
              <p className="text-label font-medium wrap-anywhere">
                {row.competitions.length === 0 ? (
                  <span className="text-ink-soft">No competition yet</span>
                ) : (
                  row.competitions.join(", ")
                )}
              </p>
            </div>
          </div>

          {/* Record */}
          <div className="grid min-w-[210px] flex-1 grid-cols-2 gap-2">
            <ProfileStat lead label="Overall Record" value={`${row.won} - ${row.lost}`} />
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
        <div className="flex flex-wrap items-start justify-between gap-4 border-t border-line pt-4">
          <div className="min-w-0">
            <p className={LABEL}>Next Match</p>
            <NextMatchFacts next={row.nextMatch} />
          </div>
          <div>
            <p className={LABEL}>Recent Form</p>
            {row.form.length === 0 ? (
              <p className="text-caption text-ink-soft">No matches played yet</p>
            ) : (
              <FormDots form={row.form} slots={row.form.length} />
            )}
          </div>
        </div>

        {/* Actions. Each grows to share the row, and one that does not fit drops to the next. */}
        <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
          <button type="button" onClick={onEdit} className="btn btn-ink flex-1">
            <Icon id="pencil" size={14} />
            Edit Team
          </button>
          <Link href="/quick-match" className="btn btn-fill flex-1">
            <Icon id="quick" size={14} />
            Quick Match
          </Link>
          <button type="button" onClick={onDelete} className="btn btn-danger-quiet flex-1">
            <Icon id="trash" size={14} />
            Delete
          </button>
        </div>
      </div>
    )}
  </Card>
);

/* ---------------------------- Upcoming fixtures --------------------------- */

export const UpcomingFixturesPanel = ({ items }: { items: ScheduleItem[] }) => (
  <Card title="Upcoming Fixtures" action="View Full Schedule" href="/competitions">
    {items.length === 0 ? (
      <CardEmpty
        message="No fixtures exist yet — start a competition to schedule matches."
        actionLabel="New competition"
        href="/competitions/new"
      />
    ) : (
      <ul className="divide-y divide-line">
        {items.map((item, i) => (
          // A centered label over the score line, as the other screens draw a match.
          <li key={i} className="flex flex-col gap-1.5 px-4 pt-2.5 pb-3">
            <span className="text-center text-caption text-ink-soft wrap-anywhere">
              {[`${item.day} ${item.date}`.trim(), item.time, item.venue].join(" • ")}
            </span>
            <ScoreLine home={item.home} away={item.away} />
          </li>
        ))}
      </ul>
    )}
    <Link href="/competitions" className={FOOT_LINK}>
      View Full Fixture List
      <Icon id="chevron-right" size={14} />
    </Link>
  </Card>
);

/* ------------------------------- Recent form ------------------------------ */

export const RecentFormPanel = ({ rows }: { rows: FormRow[] }) => (
  <Card title="Recent Form" meta="Last 5 Matches">
    {rows.length === 0 ? (
      <CardEmpty
        message="No form exists yet — completed matches build each team's form."
        actionLabel="Play a match"
        href="/quick-match"
      />
    ) : (
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.team.name} className="flex items-center justify-between gap-3 px-4 py-3">
            <TeamName team={row.team} size={22} className="min-w-0 flex-1" />
            <FormLetters form={row.form} />
            <span className="w-10 text-right text-caption font-bold tabular-nums">
              {row.record}
            </span>
          </li>
        ))}
      </ul>
    )}
    <Link href="/summaries" className={FOOT_LINK}>
      View Full Match History
      <Icon id="chevron-right" size={14} />
    </Link>
  </Card>
);
