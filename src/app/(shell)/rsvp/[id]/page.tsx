"use client";

import { useParams } from "next/navigation";
import { NotFound } from "@/components/console/NotFound";
import { InlineSpinner, LinkField, PageLoadingSpinner } from "@/components/shared";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Panel, PanelError } from "@/components/matchbook/Panel";
import { ListSetupFields } from "@/components/rsvpList/ListSetupFields";
import { useListPage } from "@/components/rsvpList/useListPage";

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="mb-kicker">{label}</span>
    <span className="text-[0.95rem] font-semibold">{value}</span>
  </div>
);

/**
 * A list's page, which is also its RSVP link. A signed-in person holding
 * the link sees the list's name, its scheduled time, and its capacity. The
 * owner also sees the link to copy and the settings to change. With the
 * link off, anyone but the owner gets the shared not found, the same as for
 * a list that does not exist. A guest is sent to sign in and back here.
 */
export default function RsvpListPage() {
  const params = useParams();
  const page = useListPage(params.id as string);

  if (page.isLoading) return <PageLoadingSpinner />;

  const { list, settings } = page;
  if (page.hasLoadError) {
    return (
      <Panel title="RSVP list">
        <PanelError message="The list could not be loaded. Check your connection and reload." />
      </Panel>
    );
  }
  if (!list) return <NotFound reason="not_found" isGuest={false} subject="list" />;

  return (
    <>
      <header className="mb-4 flex flex-col gap-2">
        <span className="mb-kicker">RSVP</span>
        <h1 className="matchbook-display min-w-0 max-w-full text-3xl font-bold leading-none tracking-[0.01em] [overflow-wrap:anywhere] sm:text-5xl">
          {list.name}
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

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Panel title="The list" icon="calendar">
            <div className="grid grid-cols-2 gap-3 p-4">
              <Fact label="Scheduled time" value={page.when?.viewer ?? "Not set yet"} />
              <Fact label="Capacity" value={String(list.capacity)} />
            </div>
          </Panel>

          {page.isOwner && (
            <Panel title="RSVP link" icon="share">
              <div className="flex flex-col gap-1.5 p-4">
                <span className="text-[0.85rem] font-semibold">{page.link ? "On" : "Off"}</span>
                {page.link && <LinkField id="rsvp-list-link" value={page.link} label="RSVP link" />}
                <p className="text-[0.72rem] text-mb-ink-muted">
                  {page.link
                    ? "Anyone with the link can sign in and see this page. Turn it off in the settings and the link shows not found."
                    : "Only you can open this page. Set both times in the settings, then turn the link on."}
                </p>
              </div>
            </Panel>
          )}
        </div>

        {settings && (
          <Panel title="Settings" icon="settings" className="lg:col-span-7">
            <ListSetupFields
              setup={settings.setup}
              problems={settings.problems}
              zone={settings.zone}
              scheduledZone={settings.scheduledZone}
              onChange={settings.change}
            />
            <div className="flex flex-col gap-3 border-t border-mb-rule p-4">
              {settings.alert && (
                <p
                  role="alert"
                  className="border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red"
                >
                  {settings.alert}
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={settings.save}
                  disabled={!settings.isDirty || settings.isSaving}
                  className="mb-btn mb-btn-navy sm:flex-1"
                >
                  {settings.isSaving ? <InlineSpinner /> : <MbIcon id="save" size={14} />}
                  Save settings
                </button>
                <button
                  type="button"
                  onClick={settings.discard}
                  disabled={!settings.isDirty || settings.isSaving}
                  className="mb-btn mb-btn-outline-navy sm:flex-1"
                >
                  Discard changes
                </button>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
