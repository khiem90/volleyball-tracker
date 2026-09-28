"use client";

import { useEffect, useRef, useState } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import type { ShareLinksView } from "./useConsole";

/** Copies a link to the clipboard and says so for a moment. */
const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy the link:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className="mb-btn mb-btn-outline-navy shrink-0"
    >
      <MbIcon id={copied ? "check" : "clipboard"} size={14} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

/**
 * A link in a read-only field with a Copy button. Tapping the field
 * selects the whole link, for a phone whose clipboard needs a long press.
 */
const LinkField = ({ id, value, label }: { id: string; value: string; label: string }) => (
  <div className="flex gap-2">
    <span className="mb-input min-w-0 flex-1">
      <input
        id={id}
        type="text"
        readOnly
        value={value}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        className="truncate"
      />
    </span>
    <CopyButton value={value} label={`Copy the ${label}`} />
  </div>
);

/**
 * The share links in the owner's Settings tab. The spectator link is the
 * tournament's page, turned on or off here. The scorer link carries the
 * key; regenerating it locks out every phone on the old one, and a
 * tournament from before scorer keys gets one made here.
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
  </div>
);
