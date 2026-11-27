"use client";

import {
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Icon } from "./Icon";
import type { AddedTeams } from "@/lib/roster";

/** The one line the form shows after an add. */
const noticeFor = ({ added, alreadyOnRoster }: AddedTeams): string => {
  if (added.length === 0 && alreadyOnRoster.length === 0) return "No team names found.";
  if (added.length === 0 && alreadyOnRoster.length === 1) {
    return `${alreadyOnRoster[0]} is already on the roster.`;
  }
  const skipped =
    alreadyOnRoster.length === 0 ? "" : ` Already on the roster: ${alreadyOnRoster.join(", ")}.`;
  if (added.length === 0) return `Nothing added.${skipped}`;
  const what = added.length === 1 ? added[0].name : `${added.length} teams`;
  return `Added ${what}.${skipped}`;
};

const hasSeveralLines = (text: string) => /\r?\n/.test(text.trim());

interface AddTeamsFormProps {
  /** Adds one team per line of the text and says what happened. */
  onAdd: (text: string) => AddedTeams;
}

/**
 * The roster's add strip: a name field that saves on Enter and keeps focus for
 * the next name, and a paste area that adds one team per line.
 */
export const AddTeamsForm = ({ onAdd }: AddTeamsFormProps) => {
  const [name, setName] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [notice, setNotice] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  const add = (text: string): boolean => {
    const outcome = onAdd(text);
    setNotice(noticeFor(outcome));
    return outcome.added.length > 0;
  };

  const submitName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim().length === 0) return;
    // A refused name stays in the field so it can be corrected.
    if (add(name)) setName("");
    nameInput.current?.focus();
  };

  // A single-line field would fold a pasted list into one name, so a paste
  // with several lines goes to the paste area instead, ready to review.
  const onNamePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!hasSeveralLines(text)) return;
    event.preventDefault();
    setPasted(text);
    setPasteOpen(true);
  };

  const submitPasted = () => {
    if (!add(pasted)) return;
    setPasted("");
    setPasteOpen(false);
    nameInput.current?.focus();
  };

  const closePaste = () => {
    setPasted("");
    setPasteOpen(false);
  };

  const onPastedKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submitPasted();
    }
  };

  return (
    <div className="border-b border-line">
      <form onSubmit={submitName} className="flex flex-wrap items-center gap-2 px-4 py-3">
        <label className="field min-w-[12rem] flex-1">
          <Icon id="plus" size={14} className="shrink-0 text-ink-soft" />
          <input
            ref={nameInput}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onPaste={onNamePaste}
            placeholder="New team name, then Enter"
            aria-label="New team name"
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>
        <button
          type="submit"
          className="btn btn-ink"
          disabled={name.trim().length === 0}
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => (pasteOpen ? closePaste() : setPasteOpen(true))}
          className="btn btn-fill"
          aria-expanded={pasteOpen}
          aria-controls="paste-team-names"
        >
          <Icon id="clipboard" size={14} />
          Paste a list
        </button>
      </form>

      {pasteOpen && (
        <div
          id="paste-team-names"
          className="flex flex-col gap-2 border-t border-line px-4 py-3"
        >
          <label htmlFor="pasted-team-names" className="text-caption font-medium text-ink-soft">
            One team per line
          </label>
          <textarea
            id="pasted-team-names"
            className="field-area"
            rows={6}
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            onKeyDown={onPastedKeyDown}
            placeholder={"Aces\nBlockers\nChasers"}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitPasted}
              className="btn btn-ink"
              disabled={pasted.trim().length === 0}
            >
              <Icon id="plus" size={14} />
              Add teams
            </button>
            <button type="button" onClick={closePaste} className="btn btn-fill">
              Cancel
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p role="status" className="px-4 pb-3 text-caption font-medium text-ink-soft">
          {notice}
        </p>
      )}
    </div>
  );
};
