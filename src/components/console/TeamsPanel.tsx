"use client";

import { useRef, useState, type FormEvent } from "react";
import { Card, CardEmpty } from "@/components/shared/Card";
import { Icon } from "@/components/shared/Icon";
import type { TeamRow } from "@/lib/console";
import { isMixedTeam } from "@/lib/entries";
import { NOTE, ROW_BUTTON, TEAM_CELL, TeamLabel } from "./parts";
import type { TeamLookup } from "./teamRefs";

const SUGGESTIONS_ID = "console-roster-names";

/**
 * The add strip: a name field that enters a team on Enter and keeps focus
 * for the next one, offering roster teams not yet entered as it is typed.
 * A name the tournament refuses stays in the field so it can be corrected.
 */
const AddTeamForm = ({
  suggestions,
  joinedNote,
  onAdd,
  busy,
}: {
  suggestions: string[];
  joinedNote: string;
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
      setNotice(`${added} ${joinedNote}.`);
    }
    nameInput.current?.focus();
  };

  return (
    <div className="border-b border-line">
      <form onSubmit={submit} className="flex items-center gap-2 px-4 py-3">
        <label className="field min-w-0 flex-1">
          <Icon id="plus" size={16} className="shrink-0 text-ink-soft" />
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
        <button type="submit" className="btn btn-ink" disabled={busy || name.trim().length === 0}>
          Add
        </button>
      </form>
      {notice && (
        <p role="status" className={`px-4 pb-3 font-medium ${NOTE}`}>
          {notice}
        </p>
      )}
    </div>
  );
};

/**
 * The Teams tab: every entry with its record in this tournament. A mixed
 * team shows its players under its name, to everyone who can open the tab,
 * and to the owner of a draft or live tournament an Edit button for its
 * name and players. A roster team has none: it is renamed on the roster.
 * The owner of a live tournament can withdraw a team here. In a rotation or round
 * robin tournament the owner can also add a team, which joins the back of
 * the queue or gets its matches, and bring a withdrawn one back; a bracket
 * takes nobody once it is drawn, and says so where the add strip would be.
 */
export const TeamsPanel = ({
  rows,
  team,
  canAdd,
  canWithdraw,
  canEditMixed,
  addRefusal,
  suggestions,
  joinedNote,
  onAdd,
  onWithdraw,
  onRejoin,
  onEdit,
  busy,
}: {
  rows: TeamRow[];
  team: TeamLookup;
  /** Whether a team can be added or brought back: the owner of a live rotation or round robin tournament. */
  canAdd: boolean;
  /** Whether a team can be withdrawn: the owner of any live tournament. */
  canWithdraw: boolean;
  /** Whether a mixed team can be renamed and its players changed: the owner of a draft or live tournament. */
  canEditMixed: boolean;
  /** Why a team cannot be added, shown in place of the add strip while teams can still be withdrawn. */
  addRefusal: string | null;
  /** Roster names to offer while typing: teams not yet entered. */
  suggestions: string[];
  /** What the notice says a team did once it is in: "joined the queue". */
  joinedNote: string;
  onAdd: (name: string) => Promise<string | null>;
  onWithdraw: (row: TeamRow) => void;
  onRejoin: (row: TeamRow) => void;
  /** Opens the edit of a mixed team. */
  onEdit: (row: TeamRow) => void;
  /** True while a team edit is being saved. */
  busy: boolean;
}) => {
  const editable = (row: TeamRow) => canEditMixed && isMixedTeam(row);
  // A draft has nobody to withdraw, so the column is there only for Edit.
  const hasActions = canWithdraw || rows.some(editable);
  return (
    <Card title="Teams" meta={`${rows.length} entered`}>
      {canAdd && (
        <AddTeamForm suggestions={suggestions} joinedNote={joinedNote} onAdd={onAdd} busy={busy} />
      )}
      {!canAdd && canWithdraw && addRefusal && (
        <p className={`border-b border-line px-4 py-3 font-medium ${NOTE}`}>{addRefusal}</p>
      )}
      {rows.length === 0 ? (
        <CardEmpty message="No teams are entered." />
      ) : (
        // Positioned, so the labels written for screen readers alone stay inside
        // the wrapper. Left to the page, they made a phone's page wider than its screen.
        <div className="relative overflow-x-auto">
          <table className="data-table data-table-compact w-full border-collapse">
            <thead>
              <tr>
                <th className="pl-4 text-center">#</th>
                <th>Team</th>
                <th className="text-center">W</th>
                <th className={hasActions ? "text-center" : "pr-4 text-center"}>L</th>
                {hasActions && (
                  <th className="pr-4">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                // A withdrawn team's record is dimmed. Its buttons are not, or Rejoin would read as switched off.
                const dim = row.withdrawn ? "opacity-60" : "";
                return (
                  <tr key={row.teamId}>
                    <td className={`pl-4 text-center font-bold ${dim}`}>{i + 1}</td>
                    <td className={`${TEAM_CELL} ${dim}`}>
                      <TeamLabel team={team(row.teamId)}>
                        {row.withdrawn && <span className={`font-medium ${NOTE}`}>Withdrawn</span>}
                        {row.players && row.players.length > 0 && (
                          <span className={`wrap-break-word ${NOTE}`}>
                            <span className="sr-only">Players: </span>
                            {row.players.join(", ")}
                          </span>
                        )}
                      </TeamLabel>
                    </td>
                    <td className={`text-center tabular-nums ${dim}`}>{row.won}</td>
                    <td className={`text-center tabular-nums ${hasActions ? "" : "pr-4"} ${dim}`}>
                      {row.lost}
                    </td>
                    {hasActions && (
                      <td className="pr-4">
                        {/* Two buttons stack, so the team's name keeps its width in a narrow card. */}
                        <span className="flex flex-wrap justify-end gap-1.5">
                          {editable(row) && (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className={`${ROW_BUTTON} btn-fill`}
                              aria-label={`Edit ${row.name}`}
                            >
                              <Icon id="pencil" size={14} />
                              Edit
                            </button>
                          )}
                          {canWithdraw &&
                            (row.withdrawn ? (
                              canAdd && (
                                <button
                                  type="button"
                                  onClick={() => onRejoin(row)}
                                  disabled={busy}
                                  className={`${ROW_BUTTON} btn-fill`}
                                >
                                  Rejoin
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => onWithdraw(row)}
                                disabled={busy}
                                className={`${ROW_BUTTON} btn-danger-quiet`}
                              >
                                Withdraw
                              </button>
                            ))}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
