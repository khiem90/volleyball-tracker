"use client";

import { useMemo, useState } from "react";
import { MbButton } from "@/components/matchbook/Button";
import { MbNotice } from "@/components/matchbook/Notice";
import {
  FormSquares,
  MbStateBlock,
  Panel,
  PanelEmpty,
  TeamMark,
} from "@/components/matchbook/Panel";
import { MbScoreNumeral } from "@/components/matchbook/ScoreNumeral";
import {
  MbSelectList,
  type MbSelectColumn,
} from "@/components/matchbook/SelectList";
import type { MbEntryRow } from "@/components/matchbook/useMatchbookNewCompetition";
import type { EntryValidation } from "@/hooks/useNewCompetitionPage";

/* ===========================================================================
   STEP 2 — TEAMS

   A hairline multi-select against a live entry list, not a grid of coloured
   initial squares.

   ------------------------------------------------------- reading order

   The DIRECTORY is first in the DOM and the entry list follows it, at every
   width. It was the other way round, on the reasoning that a phone should see
   the count without scrolling — and the measurement said otherwise: at 390x844
   that put ~1000px of summary, validation and four buttons above the first
   tickable row, so the step whose entire job is "tick some teams" showed
   **zero** of them on the first screen. The count is not lost by the swap: the
   sticky commit bar carries the live gate ("Select at least 3 teams",
   "8 teams selected") in the one place that is on screen at every scroll
   position, which is what a commit bar is for.
   =========================================================================== */

/**
 * Module scope: `MbSelectRow` is memoised and re-renders on any new identity.
 *
 * Below `sm` the two data columns are hidden — 9rem of competition name and a
 * W-L measure will not share a 390px row with a crest and a name — so the row
 * would otherwise be eight identical crest+name lines with nothing to choose
 * between. The same two facts are set as a second line instead, at the columns'
 * own `0.72rem` muted step, and disappear the moment the columns appear.
 */
const renderPrimary = (row: MbEntryRow) => (
  <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
    <TeamMark team={row.team} accent={row.accent} size="sm" className="min-w-0" />
    <span className="truncate text-[0.72rem] leading-tight text-mb-ink-muted tabular-nums sm:hidden">
      {row.record} · {row.enteredIn}
    </span>
  </span>
);

const COLUMNS: MbSelectColumn<MbEntryRow>[] = [
  {
    key: "enteredIn",
    header: "Entered in",
    render: (row) => row.enteredIn,
    hide: "sm",
    width: "9rem",
  },
  {
    key: "record",
    header: "W-L",
    render: (row) => row.record,
    hide: "sm",
    align: "right",
    width: "3rem",
  },
];

/** The entry roster is a summary, not a second directory. */
const ROSTER_LIMIT = 12;

export interface TeamsStepProps {
  rows: MbEntryRow[];
  selectedIds: Set<string>;
  entryIds: string[];
  entryRowsById: Map<string, MbEntryRow>;
  validation: EntryValidation;
  formatLabel: string;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
  onCreateTeam: () => void;
  onQuickAdd: () => void;
  readOnly: boolean;
}

export const TeamsStep = ({
  rows,
  selectedIds,
  entryIds,
  entryRowsById,
  validation,
  formatLabel,
  onToggle,
  onSelectAll,
  onClear,
  onCreateTeam,
  onQuickAdd,
  readOnly,
}: TeamsStepProps) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.team.name.toLowerCase().includes(needle));
  }, [rows, search]);

  const filteredIds = useMemo(() => filtered.map((row) => row.id), [filtered]);
  const filtering = search.trim().length > 0;
  const roster = entryIds.slice(0, ROSTER_LIMIT);
  const overflow = entryIds.length - roster.length;

  /**
   * An empty library is ONE state, drawn once.
   *
   * Both panels used to render on it, and the result was two display-step
   * headlines in one viewport ("NO TEAMS ENTERED YET" and "NO TEAMS EXIST
   * YET"), a notice title ("NOT ENOUGH TEAMS"), a "TEAMS ENTERED 0 / OF 0 IN
   * LIBRARY" stat, a "0 SHOWN" meta and the bar's status line — six instruments
   * on an empty screen, one of which gave impossible advice ("Tick a team in
   * the directory" when the directory is empty). There is nothing to enter and
   * nothing to summarise, so the summary does not render at all and the one
   * remaining block says the one true thing plus the two ways out of it.
   */
  if (rows.length === 0) {
    return (
      <div className="xl:col-span-12">
        <Panel title="Team Directory" icon="teams">
          <MbStateBlock
            scale="panel"
            tone="empty"
            headline="No teams exist yet"
            deck="A competition needs entrants before it can be scheduled. Create one by hand, or add a batch and rename them later."
            action={
              <div className="mt-1 flex flex-wrap gap-2">
                <MbButton
                  variant="navy"
                  size="sm"
                  icon="plus"
                  onClick={onCreateTeam}
                  disabled={readOnly}
                >
                  Create a team
                </MbButton>
                <MbButton
                  variant="outline-navy"
                  size="sm"
                  icon="import"
                  onClick={onQuickAdd}
                  disabled={readOnly}
                >
                  Quick add teams
                </MbButton>
              </div>
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <>
      <div className="xl:col-span-7">
        {/* No `meta`.
            It carried "{n} shown", and `MbSelectList`'s own header row already
            reads "8 OF 8 SELECTED" over the same filtered set — so the panel
            head, the list head and the commit bar's "8 teams selected" stated
            one number three times in one 390px viewport. The list head is the
            one that also carries the selection, so it keeps the job. */}
        <Panel title="Team Directory" icon="teams">
          <MbSelectList
            items={filtered}
            getKey={(row) => row.id}
            selected={selectedIds}
            onToggle={onToggle}
            search={search}
            onSearchChange={setSearch}
            columns={COLUMNS}
            renderPrimary={renderPrimary}
            label="Team directory"
            emptyMessage={`No teams match “${search.trim()}” — try a different search.`}
          />
        </Panel>
      </div>

      <div className="xl:col-span-5">
        <Panel
          title="Entry List"
          tone="navy"
          icon="teams"
          meta={
            <span className="matchbook-display text-[0.66rem] font-bold tracking-[0.16em] text-mb-paper-bright">
              {formatLabel}
            </span>
          }
        >
          <div className="flex items-end justify-between gap-3 border-b border-mb-rule px-4 py-3">
            <div className="min-w-0">
              <span className="mb-kicker block">Teams entered</span>
              {/* `MbScoreNumeral`, not a hand-rolled `matchbook-display
                  text-4xl`: it boxes every figure to 1ch so 9 → 10 repaints one
                  glyph and reflows nothing, and it cross-fades the change over
                  `--mb-dur-fast`. That cross-fade is the authored response to
                  ticking a team — the one interaction this step exists for. */}
              <MbScoreNumeral
                value={entryIds.length}
                size="compact"
                digits={2}
                align="start"
                className="mt-0.5"
              />
            </div>
            <span className="mb-kicker shrink-0 tabular-nums">
              of {rows.length} in library
            </span>
          </div>

          <div className="flex flex-col gap-3 border-b border-mb-rule px-4 py-3">
            {validation.valid ? (
              validation.byes > 0 ? (
                <MbNotice tone="warn" icon="bracket" title="Bracket padding">
                  {entryIds.length} teams entered, so the bracket of{" "}
                  {validation.bracketSize} carries {validation.byes}{" "}
                  {validation.byes === 1 ? "bye" : "byes"} in the first round.
                </MbNotice>
              ) : (
                <MbNotice tone="success" title="Ready">
                  {validation.message}.
                </MbNotice>
              )
            ) : (
              <MbNotice tone="info" title="Not enough teams">
                {validation.message || "Choose a format first"}.
              </MbNotice>
            )}

            <div className="flex flex-wrap gap-2">
              {/* The ONLY select-all on the step.
                  `MbSelectList` ships one in its own header row, and that
                  button abuts the first ruled row at 1px — a measured
                  invariant-33 separation failure on a kit file this workstream
                  does not own. Omitting `onSelectAll` there turns that header
                  into a plain count, and this control takes the job. It also
                  respects the filter, which the list's own never could. */}
              <MbButton
                variant="outline-navy"
                size="sm"
                icon="check"
                onClick={() => onSelectAll(filteredIds)}
                disabled={filteredIds.length === 0}
                className="flex-auto"
              >
                {filtering ? `Select ${filtered.length} shown` : "Select all"}
              </MbButton>
              <MbButton
                variant="outline-navy"
                size="sm"
                icon="close"
                onClick={onClear}
                disabled={entryIds.length === 0}
                className="flex-auto"
              >
                Clear
              </MbButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <MbButton
                variant="navy"
                size="sm"
                icon="plus"
                onClick={onCreateTeam}
                disabled={readOnly}
                className="flex-auto"
              >
                Add team
              </MbButton>
              <MbButton
                variant="outline-navy"
                size="sm"
                icon="import"
                onClick={onQuickAdd}
                disabled={readOnly}
                className="flex-auto"
              >
                Quick add
              </MbButton>
            </div>
          </div>

          {entryIds.length === 0 ? (
            <PanelEmpty message="No teams entered yet — tick a team in the directory to add it to this competition." />
          ) : (
            <>
              <ul className="divide-y divide-mb-rule">
                {roster.map((id) => {
                  const row = entryRowsById.get(id);
                  if (!row) return null;
                  return (
                    <li
                      key={id}
                      className="flex min-h-[44px] items-center gap-3 px-4 py-3"
                    >
                      <TeamMark
                        team={row.team}
                        accent={row.accent}
                        size="sm"
                        wrap
                        className="min-w-0 flex-1"
                      />
                      <span className="mb-kicker shrink-0 tabular-nums">
                        {row.record}
                      </span>
                      <FormSquares form={row.form} slots={5} />
                    </li>
                  );
                })}
              </ul>
              {overflow > 0 && (
                <p className="border-t border-mb-rule px-4 py-3 text-[0.78rem] text-mb-ink-muted tabular-nums">
                  + {overflow} more entered
                </p>
              )}
            </>
          )}
        </Panel>
      </div>
    </>
  );
};
