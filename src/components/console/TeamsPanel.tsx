"use client";

import { useRef, useState, type FormEvent } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import type { TeamRow } from "@/lib/console";
import type { TeamLookup } from "./teamRefs";

const SUGGESTIONS_ID = "console-roster-names";

/**
 * The add strip: a name field that enters a team on Enter and keeps focus
 * for the next one, offering roster teams not yet entered as it is typed.
 * A name the tournament refuses stays in the field so it can be corrected.
 */
const AddTeamForm = ({
  suggestions,
  onAdd,
  busy,
}: {
  suggestions: string[];
  /** Resolves with the team's name once it is in, or null when it was refused. */
  onAdd: (name: string) => Promise<string | null>;
  busy: boolean;
}) => {
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0 || busy) return;
    const added = await onAdd(name);
    if (added !== null) {
      setName("");
      setNotice(`${added} joined the queue.`);
    }
    nameInput.current?.focus();
  };

  return (
    <div className="border-b border-mb-rule">
      <form onSubmit={submit} className="flex items-center gap-2 px-3 py-2.5">
        <label className="mb-input min-w-0 flex-1 py-[0.45rem]">
          <MbIcon id="plus" size={14} className="shrink-0 text-mb-ink-muted" />
          <input
            ref={nameInput}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            list={SUGGESTIONS_ID}
            placeholder="Team name, then Enter"
            aria-label="Team to add"
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>
        <datalist id={SUGGESTIONS_ID}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <button
          type="submit"
          className="mb-btn mb-btn-navy min-h-11"
          disabled={busy || name.trim().length === 0}
        >
          Add
        </button>
      </form>
      {notice && (
        <p role="status" className="px-3 pb-2.5 text-[0.78rem] font-medium text-mb-ink-muted">
          {notice}
        </p>
      )}
    </div>
  );
};

/**
 * The Teams tab: every entry with its record in this tournament. The owner
 * of a live rotation tournament can add a team here, which joins the back
 * of the queue, withdraw one, and bring a withdrawn one back.
 */
export const TeamsPanel = ({
  rows,
  team,
  canEdit,
  suggestions,
  onAdd,
  onWithdraw,
  onRejoin,
  busy,
}: {
  rows: TeamRow[];
  team: TeamLookup;
  /** Whether teams can be added and withdrawn: the owner of a live rotation tournament. */
  canEdit: boolean;
  /** Roster names to offer while typing: teams not yet entered. */
  suggestions: string[];
  onAdd: (name: string) => Promise<string | null>;
  onWithdraw: (row: TeamRow) => void;
  onRejoin: (row: TeamRow) => void;
  /** True while a team edit is being saved. */
  busy: boolean;
}) => (
  <Panel title="Teams" meta={<span className="mb-kicker">{rows.length} entered</span>}>
    {canEdit && <AddTeamForm suggestions={suggestions} onAdd={onAdd} busy={busy} />}
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
              <th className={canEdit ? "text-center" : "pr-3! text-center"}>L</th>
              {canEdit && (
                <th className="pr-3!">
                  <span className="sr-only">Actions</span>
                </th>
              )}
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
                <td className={`text-center tabular-nums ${canEdit ? "" : "pr-3!"}`}>{row.lost}</td>
                {canEdit && (
                  <td className="pr-3! text-right">
                    <button
                      type="button"
                      onClick={() => (row.withdrawn ? onRejoin(row) : onWithdraw(row))}
                      disabled={busy}
                      className={`mb-btn min-h-11 px-3 text-[0.66rem] ${
                        row.withdrawn ? "mb-btn-outline-navy" : "mb-btn-outline"
                      }`}
                    >
                      {row.withdrawn ? "Rejoin" : "Withdraw"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);
