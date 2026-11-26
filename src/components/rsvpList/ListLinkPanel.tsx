"use client";

import { Card, Chip, LinkField } from "@/components/shared";

/**
 * The owner's card for the RSVP link: whether it is on, as a chip in the
 * head, and while it is on the link itself with Copy. The link is turned
 * on and off in the settings. `link` is null while it is off.
 */
export const ListLinkPanel = ({ link }: { link: string | null }) => (
  <Card
    title="RSVP link"
    icon="share"
    meta={<Chip tone={link ? "action" : "fill"}>{link ? "On" : "Off"}</Chip>}
  >
    <div className="flex flex-col gap-2 p-4">
      {link && <LinkField id="rsvp-list-link" value={link} label="RSVP link" />}
      <p className="text-caption text-ink-soft">
        {link
          ? "Anyone with the link can sign in and see this page. Turn it off in the settings and the link shows not found."
          : "Only you can open this page. Set both times in the settings, then turn the link on."}
      </p>
    </div>
  </Card>
);
