"use client";

import { Panel, PanelEmpty, PanelError } from "@/components/matchbook/Panel";
import { RsvpRows, RsvpSectionHead } from "@/components/rsvp/RsvpRows";
import type { ListRsvpView } from "./useListRsvpView";

/**
 * Everyone on the list by name, in arrival order, in two sections: who is
 * in, and who is on the waitlist. The viewer's own row is marked.
 */
export const ListPeoplePanel = ({ view }: { view: ListRsvpView }) => {
  const { split } = view;
  const viewerUid = view.mine?.uid ?? null;

  return (
    <Panel
      title="Who's coming"
      icon="teams"
      meta={
        view.rsvps && (
          <span className="matchbook-display text-[0.72rem] font-bold tracking-[0.1em]">
            {view.rsvps.length}
          </span>
        )
      }
    >
      {view.hasError ? (
        <PanelError message="The RSVPs could not be loaded. Check your connection and reload." />
      ) : split === null ? (
        <PanelEmpty message="Loading the RSVPs..." />
      ) : split.confirmed.length === 0 ? (
        <PanelEmpty message="Nobody has RSVP'd yet." />
      ) : (
        <>
          <RsvpSectionHead label="In" count={split.confirmed.length} />
          <RsvpRows rsvps={split.confirmed} viewerUid={viewerUid} />
          {split.waitlisted.length > 0 && (
            <>
              <RsvpSectionHead label="Waitlist" count={split.waitlisted.length} />
              <RsvpRows rsvps={split.waitlisted} viewerUid={viewerUid} />
            </>
          )}
        </>
      )}
    </Panel>
  );
};
