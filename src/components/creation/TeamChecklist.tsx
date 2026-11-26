"use client";

import { useCallback } from "react";
import { AddTeamsForm, Card, CardEmpty, TeamMark } from "@/components/shared";
import { emptyRosterMessage } from "@/lib/creation";
import type { AddedTeams } from "@/lib/roster";
import type { PersistentTeam } from "@/types/game";
import { ListImportSection } from "./ListImportSection";
import type { ListImportView } from "./useListImport";

/**
 * The teams section: the add strip from the Teams page, so a team can be
 * added, and ticked, without leaving the page, then the import from an
 * RSVP list, then the roster as a checklist. Tick order is the seed order,
 * and imported teams are seeded after the ticked ones. A roster team the
 * import enters shows ticked and cannot be unticked, since the import is
 * what enters it.
 */
export const TeamChecklist = ({
  roster,
  ticked,
  enteredCount,
  onToggle,
  onSetAll,
  onAdd,
  revealId,
  problem,
  listImport,
  importProblem,
}: {
  roster: PersistentTeam[];
  ticked: ReadonlySet<string>;
  /** How many teams will enter: the ticked ones and the imported ones. */
  enteredCount: number;
  onToggle: (teamId: string) => void;
  onSetAll: (on: boolean) => void;
  /** Adds one team per line of the text and says what happened. */
  onAdd: (text: string) => AddedTeams;
  /** A row to scroll into view when it appears, such as a team just added. */
  revealId: string | null;
  problem?: string;
  listImport: ListImportView;
  /** What stops the imported teams being saved. */
  importProblem?: string;
}) => {
  // Runs when the row for revealId mounts. The list is its own scroll area,
  // so this moves the rows and leaves the add strip in place.
  const reveal = useCallback((row: HTMLLabelElement | null) => {
    row?.scrollIntoView({ block: "nearest" });
  }, []);

  const imported = listImport.imported;
  const isImported = (teamId: string) => imported?.rosterIds.has(teamId) ?? false;
  const allTicked =
    roster.length > 0 && roster.every((team) => ticked.has(team.id) || isImported(team.id));
  const emptyMessage = emptyRosterMessage(imported?.rows.length ?? 0);

  return (
    <Card
      title="Teams"
      meta={
        <span className="flex items-center gap-3">
          <span className="text-caption font-medium tabular-nums text-ink-soft">
            {enteredCount} {imported ? "entering" : "ticked"}
          </span>
          {roster.length > 0 && (
            <button
              type="button"
              onClick={() => onSetAll(!allTicked)}
              className="btn btn-fill"
              aria-pressed={allTicked}
            >
              {allTicked ? "Untick all" : "Tick all"}
            </button>
          )}
        </span>
      }
    >
      <AddTeamsForm onAdd={onAdd} />
      <ListImportSection view={listImport} problem={importProblem} />
      {roster.length === 0 ? (
        emptyMessage && <CardEmpty message={emptyMessage} />
      ) : (
        <div
          className="max-h-[50vh] divide-y divide-line overflow-auto"
          role="group"
          aria-label="Roster"
          aria-describedby={problem ? "teams-problem" : undefined}
        >
          {roster.map((team) => {
            const fromImport = isImported(team.id);
            const checked = fromImport || ticked.has(team.id);
            return (
              <label
                key={team.id}
                ref={team.id === revealId ? reveal : undefined}
                className={`flex min-h-12 items-center gap-3 px-4 py-2 transition-colors ${
                  fromImport ? "cursor-default" : "cursor-pointer"
                } ${checked ? "bg-action-tint/40" : "hover:bg-ink/4"}`}
              >
                <input
                  type="checkbox"
                  className="field-check"
                  checked={checked}
                  disabled={fromImport}
                  onChange={() => onToggle(team.id)}
                  aria-label={`Tick ${team.name}`}
                />
                <TeamMark name={team.name} color={team.color} />
                <span className="min-w-0 flex-1 truncate text-body font-medium">{team.name}</span>
                {fromImport && (
                  <span className="shrink-0 text-caption font-medium text-ink-soft">
                    From the list
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
      {problem && (
        <p
          id="teams-problem"
          role="alert"
          className="border-t border-line px-4 py-2.5 text-caption font-medium text-danger"
        >
          {problem}
        </p>
      )}
    </Card>
  );
};
