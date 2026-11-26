"use client";

import { LinkField } from "@/components/shared";
import { Card } from "@/components/shared/Card";
import { Chip } from "@/components/shared/Chip";
import { Icon } from "@/components/shared/Icon";
import { NOTE } from "./parts";
import type { ShareLinksView } from "./useConsole";

/**
 * The share links in the owner's Settings tab, as a card of their own. The
 * spectator link is the tournament's page, turned on or off here. The
 * scorer link carries the key; regenerating it locks out every phone on
 * the old one, and a tournament from before scorer keys gets one made here.
 */
export const ShareLinks = ({
  links,
  courts,
  onToggleSpectator,
  onRegenerate,
  onCreateScorerLink,
}: {
  links: ShareLinksView;
  /** The tournament's word for its courts. */
  courts: string;
  onToggleSpectator: () => void;
  /** Asks before replacing a scorer link phones may be on. */
  onRegenerate: () => void;
  /** Makes the first scorer link, which locks nobody out. */
  onCreateScorerLink: () => void;
}) => (
  <Card className="h-auto divide-y divide-line">
    <div className="flex flex-col gap-2.5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-title font-bold">Spectator link</h3>
          <Chip tone={links.spectatorEnabled ? "action" : "fill"}>
            {links.spectatorEnabled ? "On" : "Off"}
          </Chip>
        </div>
        <button
          type="button"
          onClick={onToggleSpectator}
          aria-pressed={links.spectatorEnabled}
          className={`btn ${links.spectatorEnabled ? "btn-fill" : "btn-ink"}`}
        >
          <Icon id="share" size={16} />
          {links.spectatorEnabled ? "Turn off" : "Turn on"}
        </button>
      </div>
      {links.spectatorEnabled && (
        <LinkField id="spectator-link" value={links.spectatorLink} label="spectator link" />
      )}
      <p className={NOTE}>
        {links.spectatorEnabled
          ? "Anyone with the link can follow the tournament live without signing in. Turning it off makes the link show not found."
          : "Only you can see this tournament. Turn it on for a link people in the stands can follow live."}
      </p>
    </div>

    {links.showsScorerLink && (
      <div className="flex flex-col gap-2.5 p-4">
        <h3 className="text-title font-bold">Scorer link</h3>
        {links.scorerLink ? (
          <LinkField id="scorer-link" value={links.scorerLink} label="scorer link" />
        ) : (
          <span className="text-label text-ink-soft">
            {links.scorerKeyKnown ? "This tournament has no scorer link yet." : "Loading..."}
          </span>
        )}
        {links.scorerKeyKnown && (
          <button
            type="button"
            onClick={links.scorerLink ? onRegenerate : onCreateScorerLink}
            className="btn btn-fill self-start"
          >
            <Icon id="swap" size={16} />
            {links.scorerLink ? "Regenerate" : "Create scorer link"}
          </button>
        )}
        <p className={NOTE}>
          Anyone with the link can score, reorder the queue, and swap {courts} without signing
          in, and cannot change anything else. Regenerating it locks out every phone on the old
          link.
        </p>
      </div>
    )}
  </Card>
);
