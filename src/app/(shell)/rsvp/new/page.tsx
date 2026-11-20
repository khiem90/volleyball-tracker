"use client";

import Link from "next/link";
import { InlineSpinner, PageLoadingSpinner } from "@/components/shared";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel } from "@/components/matchbook/Panel";
import { ListSetupFields } from "@/components/rsvpList/ListSetupFields";
import { useNewListPage } from "@/components/rsvpList/useNewListPage";

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
      <header className="mb-4 flex flex-col gap-3">
        <Link href="/rsvp" className="mb-panel-link self-start">
          <MbIcon id="chevron-left" size={11} />
          RSVP lists
        </Link>
        <h1 className="matchbook-display text-3xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
          New <span className="text-mb-coral">List</span>
        </h1>
        <p className="text-[0.85rem] text-mb-ink-muted">
          No tournament needed yet. Set the times now, or leave the link off and come back.
        </p>
      </header>

      <div className="flex max-w-3xl flex-col gap-4">
        <Panel title="The list" icon="calendar">
          <ListSetupFields
            setup={page.setup}
            problems={page.problems}
            zone={page.zone}
            onChange={page.change}
          />
        </Panel>

        <div className="flex flex-col gap-3">
          {page.alert && (
            <p
              role="alert"
              className="border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red"
            >
              {page.alert}
            </p>
          )}
          <button
            type="button"
            onClick={page.create}
            disabled={page.isCreating}
            className="mb-btn mb-btn-coral w-full sm:w-auto sm:self-start"
          >
            {page.isCreating ? <InlineSpinner /> : <MbIcon id="save" size={14} />}
            Create list
          </button>
        </div>
      </div>
    </>
  );
}
