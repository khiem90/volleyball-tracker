import { Panel, PanelEmpty } from "@/components/matchbook/Panel";

/**
 * Why an RSVP list's page shows nothing. The words are the same whether
 * the list was deleted, never existed, or has its RSVP link off.
 */
export const ListNotFound = () => (
  <Panel title="List not found">
    <PanelEmpty
      message="This RSVP list does not exist or is not being shared."
      actionLabel="Back to RSVP"
      href="/rsvp"
    />
  </Panel>
);
