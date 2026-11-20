"use client";

import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import { NOT_OPEN_YET, type RsvpStanding } from "@/lib/rsvp";
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
 * position. Once the list is over nobody moves up.
 */
const StandingLine = ({
  standing,
  name,
  capacity,
  canMoveUp,
}: {
  standing: RsvpStanding;
  name: string;
  capacity: number;
  canMoveUp: boolean;
}) => {
  if (standing.kind === "confirmed") {
    return (
      <p className="flex items-start gap-2 text-[0.9rem] font-semibold text-mb-green">
        <MbIcon id="check" size={16} className="mt-0.5 shrink-0" />
        <span className="min-w-0 [overflow-wrap:anywhere]">
          You&apos;re in as {name}, spot {standing.position} of {capacity}.
        </span>
      </p>
    );
  }
  if (standing.kind === "waitlisted") {
    return (
      <p className="flex items-start gap-2 text-[0.9rem] font-semibold">
        <MbIcon id="clock" size={16} className="mt-0.5 shrink-0" />
        <span className="min-w-0 [overflow-wrap:anywhere]">
          You&apos;re waiting as {name}, number {standing.position} on the waitlist.
          {canMoveUp && " You move up on your own when a spot frees."}
        </span>
      </p>
    );
  }
  return null;
};

/**
 * The panel a person RSVPs from. It shows the capacity and how many are in
 * and waiting. Before the open time it counts down over a disabled button.
 * From then the button opens the RSVP dialog, and once every spot is taken
 * it joins the waitlist. Someone on the list sees where they stand and a
 * button to change their RSVP, until the scheduled time. A list that takes
 * no RSVPs says why in place of the button.
 */
export const ListRsvpPanel = ({ list, view }: { list: RsvpList; view: ListRsvpView }) => {
  const { state, split } = view;
  const showsButton = state !== null && listTakesRsvps(state);
  const isFull = state?.kind === "full";

  return (
    <Panel title="The list" icon="calendar">
      <div className="grid grid-cols-3 gap-3 border-b border-mb-rule p-4">
        <Fact label="Capacity" value={String(list.capacity)} />
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
            <StandingLine
              standing={view.standing}
              name={view.mine.name}
              capacity={list.capacity}
              canMoveUp={!view.isOver}
            />
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
                  Every spot is taken. RSVP now and you join the waitlist
                  {split ? ` at number ${split.waitlisted.length + 1}` : ""}.
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
