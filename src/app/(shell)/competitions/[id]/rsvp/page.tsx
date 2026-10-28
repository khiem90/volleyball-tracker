"use client";

import { useParams } from "next/navigation";
import { PageLoadingSpinner } from "@/components/shared";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelEmpty, PanelError } from "@/components/matchbook/Panel";
import { NotFound } from "@/components/console/NotFound";
import { NoticeList } from "@/components/rsvp/NoticeList";
import { RsvpDialog } from "@/components/rsvp/RsvpDialog";
import { useRsvpPage } from "@/components/rsvp/useRsvpPage";
import { NOT_OPEN_YET, refusedRsvpMessage } from "@/lib/rsvp";
import type { Rsvp } from "@/types/game";

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="mb-kicker">{label}</span>
    <span className="text-[0.95rem] font-semibold">{value}</span>
  </div>
);

/** The list in arrival order, by name, with the viewer's own row marked. */
const RsvpList = ({ rsvps, uid }: { rsvps: Rsvp[]; uid: string | null }) => (
  <ol className="flex flex-col">
    {rsvps.map((rsvp, index) => (
      <li
        key={rsvp.id}
        className="grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-2 border-b border-mb-rule px-4 py-3 last:border-b-0"
      >
        <span className="matchbook-display text-[0.85rem] font-bold text-mb-ink-muted tabular-nums">
          {index + 1}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 text-[0.95rem] font-semibold [overflow-wrap:anywhere]">
              {rsvp.name}
            </span>
            {rsvp.uid === uid && (
              <span className="matchbook-display shrink-0 border-[1.5px] border-mb-navy px-1.5 py-0.5 text-[0.58rem] font-bold tracking-[0.12em]">
                You
              </span>
            )}
          </span>
          {rsvp.note && (
            <span className="text-[0.78rem] text-mb-ink-muted [overflow-wrap:anywhere]">
              {rsvp.note}
            </span>
          )}
        </span>
      </li>
    ))}
  </ol>
);

/**
 * The RSVP link. A signed-in person sees the night: its name, when it is,
 * the capacity and how many have RSVP'd, and everyone on the list by name
 * in arrival order, under the owner's notices, newest first, when there
 * are any. Before the open time it counts down over a disabled
 * button; from then the button opens the RSVP dialog. With the link off it
 * shows the same not found as the console.
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
  const showsButton = state.kind === "not_open" || state.kind === "open";
  // Once RSVPs are not taken, the page says why in place of the button.
  const shut = showsButton ? null : refusedRsvpMessage(state);

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
          <div className="grid grid-cols-2 gap-3 border-b border-mb-rule p-4">
            <Fact label="Capacity" value={`${capacity} ${capacity === 1 ? "spot" : "spots"}`} />
            <Fact label="RSVP'd" value={page.rsvps ? String(count) : "..."} />
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
              <p className="flex items-center gap-2 text-[0.9rem] font-semibold text-mb-green">
                <MbIcon id="check" size={16} className="shrink-0" />
                You are on the list as {page.mine.name}.
              </p>
            ) : (
              showsButton && (
                <button
                  type="button"
                  className="mb-btn mb-btn-coral w-full sm:w-auto sm:self-start"
                  disabled={!page.canRsvp}
                  onClick={page.dialog.open}
                >
                  <MbIcon id="calendar" size={14} />
                  RSVP
                </button>
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
          ) : page.rsvps === null ? (
            <PanelEmpty message="Loading the list..." />
          ) : page.rsvps.length === 0 ? (
            <PanelEmpty message="Nobody has RSVP'd yet." />
          ) : (
            <RsvpList rsvps={page.rsvps} uid={page.mine?.uid ?? null} />
          )}
        </Panel>
      </div>

      <RsvpDialog
        open={page.dialog.isOpen}
        nightName={tournament.name}
        entry={page.dialog.entry}
        isSending={page.dialog.isSending}
        error={page.dialog.error}
        onChange={page.dialog.change}
        onSend={page.dialog.send}
        onClose={page.dialog.close}
      />
    </>
  );
}
