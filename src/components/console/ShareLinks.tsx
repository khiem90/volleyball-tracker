"use client";

import { MbIcon } from "@/components/matchbook/MbIcon";
import { LinkField } from "@/components/shared";
import type { ShareLinksView } from "./useConsole";

/**
 * The share links in the owner's Settings tab. The spectator link is the
 * tournament's page, turned on or off here. The scorer link carries the
 * key; regenerating it locks out every phone on the old one, and a
 * tournament from before scorer keys gets one made here. The RSVP link is
 * shown here to copy; it is turned on and off in the RSVP tab.
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
  <div className="flex flex-col gap-5 border-b border-mb-rule p-4">
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="mb-kicker">Spectator link</span>
          <span className="text-[0.85rem] font-semibold">
            {links.spectatorEnabled ? "On" : "Off"}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleSpectator}
          aria-pressed={links.spectatorEnabled}
          className={`mb-btn min-h-11 ${links.spectatorEnabled ? "mb-btn-outline-navy" : "mb-btn-navy"}`}
        >
          <MbIcon id="share" size={14} />
          {links.spectatorEnabled ? "Turn off" : "Turn on"}
        </button>
      </div>
      {links.spectatorEnabled && (
        <LinkField id="spectator-link" value={links.spectatorLink} label="spectator link" />
      )}
      <p className="text-[0.72rem] text-mb-ink-muted">
        {links.spectatorEnabled
          ? "Anyone with the link can follow the tournament live without signing in. Turning it off makes the link show not found."
          : "Only you can see this tournament. Turn it on for a link people in the stands can follow live."}
      </p>
    </div>

    {links.showsScorerLink && (
      <div className="flex flex-col gap-1.5">
        <span className="mb-kicker">Scorer link</span>
        {links.scorerLink ? (
          <LinkField id="scorer-link" value={links.scorerLink} label="scorer link" />
        ) : (
          <span className="text-[0.8rem] text-mb-ink-muted">
            {links.scorerKeyKnown ? "This tournament has no scorer link yet." : "Loading..."}
          </span>
        )}
        {links.scorerKeyKnown && (
          <button
            type="button"
            onClick={links.scorerLink ? onRegenerate : onCreateScorerLink}
            className="mb-btn mb-btn-outline self-start"
          >
            <MbIcon id="swap" size={14} />
            {links.scorerLink ? "Regenerate" : "Create scorer link"}
          </button>
        )}
        <p className="text-[0.72rem] text-mb-ink-muted">
          Anyone with the link can score, reorder the queue, and swap {courts} without signing
          in, and cannot change anything else. Regenerating it locks out every phone on the old
          link.
        </p>
      </div>
    )}

    {(links.rsvpLink || links.rsvpSettable) && (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col gap-0.5">
          <span className="mb-kicker">RSVP link</span>
          <span className="text-[0.85rem] font-semibold">{links.rsvpLink ? "On" : "Off"}</span>
        </div>
        {links.rsvpLink && (
          <LinkField id="rsvp-link" value={links.rsvpLink} label="RSVP link" />
        )}
        <p className="text-[0.72rem] text-mb-ink-muted">
          {links.rsvpLink
            ? "Anyone with the link can sign in, see the tournament, and RSVP from the open time."
            : "Set the scheduled time and the open time in the RSVP tab, then turn the link on there."}
        </p>
      </div>
    )}
  </div>
);
