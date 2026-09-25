"use client";

import { useCallback } from "react";
import { AddTeamsForm } from "@/components/matchbook/AddTeamsForm";
import { Panel, PanelEmpty } from "@/components/matchbook/Panel";
import type { AddedTeams } from "@/lib/roster";
import type { PersistentTeam } from "@/types/game";

/**
 * The roster as a checklist, with the add strip from the Teams page above
 * it so a team can be added, and ticked, without leaving the page. Tick
 * order is the seed order.
 */
export const TeamChecklist = ({
  roster,
  ticked,
  tickedCount,
  onToggle,
  onSetAll,
  onAdd,
  revealId,
  problem,
}: {
  roster: PersistentTeam[];
  ticked: ReadonlySet<string>;
  tickedCount: number;
  onToggle: (teamId: string) => void;
  onSetAll: (on: boolean) => void;
  /** Adds one team per line of the text and says what happened. */
  onAdd: (text: string) => AddedTeams;
  /** A row to scroll into view when it appears, such as a team just added. */
  revealId: string | null;
  problem?: string;
}) => {
  // Runs when the row for revealId mounts. The list is its own scroll area,
  // so this moves the rows and leaves the add strip in place.
  const reveal = useCallback((row: HTMLLabelElement | null) => {
    row?.scrollIntoView({ block: "nearest" });
  }, []);

  const allTicked = roster.length > 0 && roster.every((team) => ticked.has(team.id));

  return (
    <Panel
      title="Teams"
      meta={
        <span className="flex items-center gap-3">
          <span className="mb-kicker">{tickedCount} ticked</span>
          {roster.length > 0 && (
            <button
              type="button"
              onClick={() => onSetAll(!allTicked)}
              className="mb-btn mb-btn-outline-navy"
              aria-pressed={allTicked}
            >
              {allTicked ? "Untick all" : "Tick all"}
            </button>
          )}
        </span>
      }
    >
      <AddTeamsForm onAdd={onAdd} />
      {roster.length === 0 ? (
        <PanelEmpty message="No teams yet. Type a name above and press Enter, or paste a list." />
      ) : (
        <div
          className="max-h-[50vh] overflow-auto"
          role="group"
          aria-label="Roster"
          aria-describedby={problem ? "teams-problem" : undefined}
        >
          {roster.map((team) => {
            const checked = ticked.has(team.id);
            return (
              <label
                key={team.id}
                ref={team.id === revealId ? reveal : undefined}
                className={`flex min-h-11 cursor-pointer items-center gap-3 border-b border-mb-rule px-3 py-2 last:border-b-0 ${
                  checked ? "bg-[rgba(238,75,52,0.06)]" : "hover:bg-[rgba(7,50,77,0.04)]"
                }`}
              >
                <input
                  type="checkbox"
                  className="mb-checkbox"
                  checked={checked}
                  onChange={() => onToggle(team.id)}
                  aria-label={`Tick ${team.name}`}
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-mb-navy"
                  style={{ background: team.color ?? "transparent" }}
                  aria-hidden="true"
                />
                <span className="matchbook-display min-w-0 flex-1 truncate text-[0.85rem] font-semibold">
                  {team.name}
                </span>
              </label>
            );
          })}
        </div>
      )}
      {problem && (
        <p
          id="teams-problem"
          role="alert"
          className="border-t border-mb-rule px-3 py-2 text-[0.78rem] font-medium text-mb-red"
        >
          {problem}
        </p>
      )}
    </Panel>
  );
};
