import { Card, CardEmpty } from "@/components/shared";

/**
 * Why an RSVP list's page shows nothing. The words are the same whether
 * the list was deleted, never existed, or has its RSVP link off.
 */
export const ListNotFound = () => (
  <Card title="List not found">
    <CardEmpty
      message="This RSVP list does not exist or is not being shared."
      actionLabel="Back to RSVP"
      href="/rsvp"
    />
  </Card>
);
