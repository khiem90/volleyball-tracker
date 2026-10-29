"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageLoadingSpinner } from "@/components/shared";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelEmpty, PanelError } from "@/components/matchbook/Panel";
import { NotFound } from "@/components/console/NotFound";
import { NoticeList } from "@/components/rsvp/NoticeList";
import { RsvpDialog } from "@/components/rsvp/RsvpDialog";
import { RsvpRows, RsvpSectionHead } from "@/components/rsvp/RsvpRows";
import { useRsvpPage } from "@/components/rsvp/useRsvpPage";
import {
  NOT_OPEN_YET,
  refusedRsvpMessage,
  takesRsvps,
  watchView,
  type RsvpStanding,
} from "@/lib/rsvp";

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="mb-kicker">{label}</span>
    <span className="text-[0.95rem] font-semibold">{value}</span>
  </div>
);

/**
 * Where the viewer stands, in one line: in at a spot, or waiting at a
 * position. Once the tournament starts the list is final, so nobody moves up.
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
 * The RSVP link. A signed-in person sees the night: its name, when it is,
 * the capacity and how many have RSVP'd, and everyone on the list by name
 * in arrival order, split into who is in and who is waiting, under the
 * owner's notices, newest first, when there are any. Before the open time
 * it counts down over a disabled button; from then the button opens the
 * RSVP dialog, and once every spot is taken it joins the waitlist. Someone
 * on the list sees where they stand, and the same dialog changes their
 * name and note or withdraws them until the tournament starts. Once the
 * tournament is live or completed, a button into the console takes the
 * button's place and the list stays as it stood, read-only. With the link
 * off it shows the same not found as the console.
 */
export default function RsvpPage() {
  const params = useParams();
  const page = useRsvpPage(params.id as string);

  if (page.isLoading) return <PageLoadingSpinner />;

  const { tournament, state } = page;
  if (!tournament || !state || state.kind === "link_off") {
    return <NotFound reason="not_found" isGuest={false} />;
  }

  const capacity = tournament.rsvp?.capacity ?? 0;
  const count = page.rsvps?.length ?? 0;
  const showsButton = takesRsvps(state);
  const watch = watchView(state);
  // A closed list says why in place of the button.
  const shut = showsButton || watch ? null : refusedRsvpMessage(state);

  return (
    <>
      <header className="mb-4 flex flex-col gap-2">
        <span className="mb-kicker">RSVP</span>
        <h1 className="matchbook-display min-w-0 max-w-full text-3xl font-bold leading-none tracking-[0.01em] [overflow-wrap:anywhere] sm:text-5xl">
          {tournament.name}
        </h1>
        {page.when && (
          <p className="flex flex-wrap items-baseline gap-x-2 text-[0.95rem] font-semibold">
            <span>{page.when.viewer}</span>
            {page.when.owner && (
              <span className="text-[0.8rem] font-normal text-mb-ink-muted">
                {page.when.owner} where it was set
              </span>
            )}
          </p>
        )}
      </header>

      {page.notices && page.notices.length > 0 && (
        <Panel title="Notices" icon="bell" className="mb-4">
          <NoticeList notices={page.notices} />
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <Panel title="The night" icon="calendar" className="lg:col-span-5">
          <div className="grid grid-cols-3 gap-3 border-b border-mb-rule p-4">
            <Fact label="Capacity" value={`${capacity} ${capacity === 1 ? "spot" : "spots"}`} />
            <Fact label="In" value={page.list ? String(page.list.confirmed.length) : "..."} />
            <Fact label="Waiting" value={page.list ? String(page.list.waitlisted.length) : "..."} />
          </div>

          <div className="flex flex-col gap-3 p-4">
            {page.countdown !== null && (
              <div className="flex flex-col gap-0.5" role="timer" aria-live="off">
                <span className="mb-kicker">RSVPs open in</span>
                <span className="matchbook-display text-3xl font-bold leading-none tabular-nums">
                  {page.countdown}
                </span>
              </div>
            )}

            {page.mine ? (
              <>
                <StandingLine
                  standing={page.standing}
                  name={page.mine.name}
                  capacity={capacity}
                  canMoveUp={!watch && tournament.status === "draft"}
                />
                {page.canChange && (
                  <button
                    type="button"
                    className="mb-btn mb-btn-outline-navy w-full sm:w-auto sm:self-start"
                    onClick={page.dialog.open}
                  >
                    <MbIcon id="pencil" size={14} />
                    Your RSVP
                  </button>
                )}
              </>
            ) : (
              showsButton && (
                <>
                  {state.kind === "full" && (
                    <p className="text-[0.85rem]">
                      Every spot is taken. RSVP now and you join the waitlist
                      {page.list ? ` at number ${page.list.waitlisted.length + 1}` : ""}.
                    </p>
                  )}
                  <button
                    type="button"
                    className="mb-btn mb-btn-coral w-full sm:w-auto sm:self-start"
                    disabled={!page.canRsvp}
                    onClick={page.dialog.open}
                  >
                    <MbIcon id="calendar" size={14} />
                    {state.kind === "full" ? "Join the waitlist" : "RSVP"}
                  </button>
                </>
              )
            )}

            {page.refusal && !page.mine && (
              <div role="alert" className="flex flex-col gap-0.5">
                <p className="text-[0.85rem] font-semibold text-mb-red">{page.refusal}</p>
                {page.refusal === NOT_OPEN_YET && (
                  <p className="text-[0.75rem] text-mb-ink-muted">
                    This phone&apos;s clock may be running ahead. Try again in a moment.
                  </p>
                )}
              </div>
            )}

            {shut && <p className="text-[0.85rem] text-mb-ink-muted">{shut}</p>}

            {watch && (
              <div className="flex flex-col gap-3">
                <p className="flex items-center gap-2">
                  {watch.kind === "live" && <span className="mb-live-dot" />}
                  <span className="matchbook-display text-[0.95rem] font-bold tracking-[0.06em]">
                    {watch.status}
                  </span>
                </p>
                <Link
                  href={`/competitions/${tournament.id}`}
                  className={`mb-btn ${watch.kind === "live" ? "mb-btn-coral" : "mb-btn-navy"} w-full sm:w-auto sm:self-start`}
                >
                  <MbIcon id={watch.kind === "live" ? "eye" : "trophy"} size={14} />
                  {watch.action}
                </Link>
                <p className="text-[0.85rem] text-mb-ink-muted">{watch.note}</p>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Who's coming"
          icon="teams"
          meta={
            page.rsvps && (
              <span className="matchbook-display text-[0.72rem] font-bold tracking-[0.1em]">
                {count}
              </span>
            )
          }
          className="lg:col-span-7"
        >
          {page.listError ? (
            <PanelError message="The list could not be loaded. Check your connection and reload." />
          ) : page.list === null ? (
            <PanelEmpty message="Loading the list..." />
          ) : page.list.confirmed.length === 0 ? (
            <PanelEmpty message="Nobody has RSVP'd yet." />
          ) : (
            <>
              <RsvpSectionHead label="In" count={page.list.confirmed.length} />
              <RsvpRows rsvps={page.list.confirmed} viewerUid={page.mine?.uid ?? null} />
              {page.list.waitlisted.length > 0 && (
                <>
                  <RsvpSectionHead label="Waitlist" count={page.list.waitlisted.length} />
                  <RsvpRows rsvps={page.list.waitlisted} viewerUid={page.mine?.uid ?? null} />
                </>
              )}
            </>
          )}
        </Panel>
      </div>

      <RsvpDialog
        open={page.dialog.isOpen}
        nightName={tournament.name}
        entry={page.dialog.entry}
        isEditing={page.dialog.isEditing}
        isSending={page.dialog.isSending}
        isWithdrawing={page.dialog.isWithdrawing}
        error={page.dialog.error}
        onChange={page.dialog.change}
        onSend={page.dialog.send}
        onWithdraw={page.dialog.withdraw}
        onClose={page.dialog.close}
      />
    </>
  );
}
