"use client";

import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import { NOT_OPEN_YET } from "@/lib/rsvp";
import { listTakesRsvps } from "@/lib/rsvpList";
import type { RsvpList } from "@/types/game";
import type { ListRsvpView } from "./useListRsvpView";

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="mb-kicker">{label}</span>
    <span className="text-[0.95rem] font-semibold">{value}</span>
  </div>
);

/**
 * Where the viewer stands, in one line: in at a spot, or waiting at a
 * position. `text` says it for a person or for a team.
 */
const StandingLine = ({ isIn, text }: { isIn: boolean; text: string }) => (
  <p
    className={`flex items-start gap-2 text-[0.9rem] font-semibold ${isIn ? "text-mb-green" : ""}`}
  >
    <MbIcon id={isIn ? "check" : "clock"} size={16} className="mt-0.5 shrink-0" />
    <span className="min-w-0 [overflow-wrap:anywhere]">{text}</span>
  </p>
);

/**
 * The panel a person RSVPs from, for themselves or on a by-team list for
 * their team. It shows the capacity in people or in teams and how many
 * are in and waiting. Before the open time it counts down over a disabled
 * button. From then the button opens the RSVP dialog, and once every spot
 * is taken it joins the waitlist. Someone on the list sees where they
 * stand and a button to change their RSVP, until the scheduled time. A
 * list that takes no RSVPs says why in place of the button.
 */
export const ListRsvpPanel = ({ list, view }: { list: RsvpList; view: ListRsvpView }) => {
  const { state, split, standing, wording } = view;
  const showsButton = state !== null && listTakesRsvps(state);
  const isFull = state?.kind === "full";

  return (
    <Panel title="The list" icon="calendar">
      <div className="grid grid-cols-3 gap-3 border-b border-mb-rule p-4">
        <Fact label="Capacity" value={wording.count(list.capacity)} />
        <Fact label="In" value={split ? String(split.confirmed.length) : "..."} />
        <Fact label="Waiting" value={split ? String(split.waitlisted.length) : "..."} />
      </div>

      <div className="flex flex-col gap-3 p-4">
        {view.countdown !== null && (
          <div className="flex flex-col gap-0.5" role="timer" aria-live="off">
            <span className="mb-kicker">RSVPs open in</span>
            <span className="matchbook-display text-3xl font-bold leading-none tabular-nums">
              {view.countdown}
            </span>
          </div>
        )}

        {view.mine ? (
          <>
            {standing.kind !== "none" && (
              <StandingLine
                isIn={standing.kind === "confirmed"}
                text={wording.standing(standing, view.mine.name, list.capacity, !view.isOver)}
              />
            )}
            {view.canChange && (
              <button
                type="button"
                className="mb-btn mb-btn-outline-navy w-full sm:w-auto sm:self-start"
                onClick={view.dialog.open}
              >
                <MbIcon id="pencil" size={14} />
                Your RSVP
              </button>
            )}
          </>
        ) : (
          showsButton && (
            <>
              {isFull && (
                <p className="text-[0.85rem]">
                  {wording.full(split ? split.waitlisted.length + 1 : null)}
                </p>
              )}
              <button
                type="button"
                className="mb-btn mb-btn-coral w-full sm:w-auto sm:self-start"
                disabled={!view.canRsvp}
                onClick={view.dialog.open}
              >
                <MbIcon id="calendar" size={14} />
                {isFull ? "Join the waitlist" : "RSVP"}
              </button>
            </>
          )
        )}

        {view.refusal && !view.mine && (
          <div role="alert" className="flex flex-col gap-0.5">
            <p className="text-[0.85rem] font-semibold text-mb-red">{view.refusal}</p>
            {view.refusal === NOT_OPEN_YET && (
              <p className="text-[0.75rem] text-mb-ink-muted">
                This phone&apos;s clock may be running ahead. Try again in a moment.
              </p>
            )}
          </div>
        )}

        {view.shut && <p className="text-[0.85rem] text-mb-ink-muted">{view.shut}</p>}
      </div>
    </Panel>
  );
};
