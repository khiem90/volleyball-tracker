"use client";

import { Card, Icon } from "@/components/shared";
import { NOT_OPEN_YET, type RsvpStanding } from "@/lib/rsvp";
import { listTakesRsvps } from "@/lib/rsvpList";
import type { RsvpList } from "@/types/game";
import type { ListRsvpView } from "./useListRsvpView";

/** A standing on the list: in, or waiting. */
type OnTheListKind = Exclude<RsvpStanding["kind"], "none">;

/** The band's ground and text. Green is for in and nothing else. */
const STANDING_TONE: Record<OnTheListKind, string> = {
  confirmed: "bg-action-tint text-action",
  waitlisted: "bg-fill text-ink",
};

/** The glyph before the band's words. */
const STANDING_ICONS: Record<OnTheListKind, string> = {
  confirmed: "check",
  waitlisted: "clock",
};

/**
 * Where the viewer stands, as the band the card opens with and the largest
 * type under the page's title: in on green, or waiting with the position
 * on grey.
 */
const StandingBand = ({ kind, text }: { kind: OnTheListKind; text: string }) => (
  <p
    className={`flex items-center gap-2.5 px-4 py-4 text-page-title font-extrabold ${STANDING_TONE[kind]}`}
  >
    <Icon id={STANDING_ICONS[kind]} size={28} className="shrink-0" />
    <span className="min-w-0 wrap-anywhere">{text}</span>
  </p>
);

/**
 * The card a person RSVPs from, for themselves or on a by-team list for
 * their team. For someone on the list it opens with where they stand, then
 * says it in a sentence with the name they gave. Someone with no RSVP gets
 * no band. Before the open time the card counts down over a disabled
 * button. From then the green button opens the RSVP dialog, and
 * once every spot is taken it joins the waitlist. Someone on the list gets
 * a button to change their RSVP or withdraw, until the scheduled time. A
 * list that takes no RSVPs says why in place of the button.
 */
export const ListRsvpPanel = ({ list, view }: { list: RsvpList; view: ListRsvpView }) => {
  const { state, split, standing, wording } = view;
  const showsButton = state !== null && listTakesRsvps(state);
  const isFull = state?.kind === "full";

  return (
    <Card>
      {view.mine && standing.kind !== "none" && (
        <StandingBand kind={standing.kind} text={wording.homeStanding(standing)} />
      )}

      <div className="flex flex-col gap-3 p-4">
        {view.mine && standing.kind !== "none" && (
          <p className="text-body wrap-anywhere">
            {wording.standing(standing, view.mine.name, list.capacity, !view.isOver)}
          </p>
        )}

        {view.countdown !== null && (
          <div className="flex flex-col gap-0.5" role="timer" aria-live="off">
            <span className="text-caption font-medium text-ink-soft">RSVPs open in</span>
            <span className="text-page-title font-extrabold tabular-nums">{view.countdown}</span>
          </div>
        )}

        {view.mine
          ? view.canChange && (
              <button
                type="button"
                className="btn btn-ink w-full sm:w-auto sm:self-start"
                onClick={view.dialog.open}
              >
                <Icon id="pencil" size={14} />
                Your RSVP
              </button>
            )
          : showsButton && (
              <>
                {isFull && (
                  <p className="text-body">
                    {wording.full(split ? split.waitlisted.length + 1 : null)}
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-action w-full sm:w-auto sm:self-start"
                  disabled={!view.canRsvp}
                  onClick={view.dialog.open}
                >
                  <Icon id="calendar" size={18} />
                  {isFull ? "Join the waitlist" : "RSVP"}
                </button>
              </>
            )}

        {view.refusal && !view.mine && (
          <div role="alert" className="flex flex-col gap-0.5">
            <p className="text-label font-semibold text-danger">{view.refusal}</p>
            {view.refusal === NOT_OPEN_YET && (
              <p className="text-caption text-ink-soft">
                This phone&apos;s clock may be running ahead. Try again in a moment.
              </p>
            )}
          </div>
        )}

        {view.shut && <p className="text-label text-ink-soft">{view.shut}</p>}
      </div>
    </Card>
  );
};
