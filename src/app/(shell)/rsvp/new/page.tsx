"use client";

import { ListSetupFields } from "@/components/rsvpList/ListSetupFields";
import { useNewListPage } from "@/components/rsvpList/useNewListPage";
import { Card, CardError, Icon, InlineSpinner, PageLoadingSpinner } from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";

/**
 * Creating an RSVP list on one page: its name, by person or by team, the
 * capacity, the scheduled time and the open time on this phone's clock,
 * and whether the RSVP link starts on. Saving opens the list's page.
 */
export default function NewRsvpListPage() {
  const page = useNewListPage();

  if (page.isLoading) return <PageLoadingSpinner />;

  return (
    <>
      <PageHeader
        back={{ href: "/rsvp", label: "RSVP lists" }}
        title="New List"
        line="No tournament needed yet. Set the times now, or leave the link off and come back."
      />

      <div className="flex max-w-3xl flex-col gap-4">
        <Card title="The list" icon="calendar">
          <ListSetupFields
            setup={page.setup}
            problems={page.problems}
            zone={page.zone}
            onChange={page.change}
          />
        </Card>

        {page.alert && <CardError message={page.alert} className="" />}
        <button
          type="button"
          onClick={page.create}
          disabled={page.isCreating}
          className="btn btn-action sm:self-start"
        >
          {page.isCreating ? <InlineSpinner /> : <Icon id="save" size={18} />}
          Create list
        </button>
      </div>
    </>
  );
}
