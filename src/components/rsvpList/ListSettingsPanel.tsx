"use client";

import { ListSetupFields } from "@/components/rsvpList/ListSetupFields";
import { Card, CardError, Icon, InlineSpinner } from "@/components/shared";
import type { ListSettings } from "./useListPage";

/**
 * The owner's settings for a list, until its scheduled time: the setup
 * form with Save and Reset under it. Save is the black pill, since the
 * page's green button is the RSVP. Both wait for a change, and Save also
 * waits for the RSVPs to load, because the locks count them.
 */
export const ListSettingsPanel = ({ settings }: { settings: ListSettings }) => (
  <Card title="Settings" icon="settings">
    <ListSetupFields
      setup={settings.setup}
      problems={settings.problems}
      zone={settings.zone}
      scheduledZone={settings.scheduledZone}
      openTimeLocked={settings.openTimeLocked}
      takesLocked={settings.takesLocked}
      onChange={settings.change}
    />
    <div className="flex flex-col gap-3 border-t border-line p-4">
      {settings.alert && <CardError message={settings.alert} className="" />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={settings.save}
          disabled={!settings.isDirty || !settings.canSave || settings.isSaving}
          className="btn btn-ink sm:flex-1"
        >
          {settings.isSaving ? <InlineSpinner /> : <Icon id="save" size={14} />}
          Save settings
        </button>
        <button
          type="button"
          onClick={settings.reset}
          disabled={!settings.isDirty || settings.isSaving}
          className="btn btn-fill sm:flex-1"
        >
          Reset
        </button>
      </div>
    </div>
  </Card>
);
