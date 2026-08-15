"use client";

import { MbIcon } from "./MbIcon";
import { MbButton } from "./Button";

export type MbLiveStatusValue = "live" | "reconnecting" | "offline" | "ended" | "idle";

/**
 * `tone` names the **ink**, exactly as `MbScoreNumeral` does: `navy` is the
 * default paper reading, `paper` is the paper-bright reading used inside
 * `MbEventBar` and any other navy strip. Nothing here picks a background — the
 * strip it sits in owns that.
 */
type MbLiveStatusTone = "navy" | "paper";

/**
 * Five states, five words, five marks. `word` is the second channel required by
 * global invariant 13 and `icon` is the third, so the state survives greyscale
 * and a screenshot with the dot cropped off. Only `live` gets a colour, and it
 * rides `.mb-live-dot` rather than the letterforms — status text here is
 * 0.66rem, well under the 18.66px large-text threshold, so invariant 12 keeps
 * the word navy (or paper-bright on navy).
 *
 * `reconnecting` deliberately uses a **static** refresh glyph: invariant 45
 * allows exactly one infinite loop in the system and `.mb-live-dot` has it.
 */
const STATES: Record<
  MbLiveStatusValue,
  { word: string; icon: string | null; dot: boolean; stale: boolean }
> = {
  live: { word: "Live", icon: null, dot: true, stale: false },
  reconnecting: { word: "Reconnecting", icon: "refresh", dot: false, stale: true },
  offline: { word: "Offline", icon: "wifi-off", dot: false, stale: true },
  ended: { word: "Ended", icon: "check", dot: false, stale: false },
  idle: { word: "Not started", icon: "clock", dot: false, stale: false },
};

/**
 * Rounded to the unit a human would say out loud. Seconds below 5 read as
 * "just now" so a healthy feed does not flicker a new number every tick.
 */
const relative = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export const MbLiveStatus = ({
  status,
  secondsAgo,
  tone = "navy",
  onRetry,
  className = "",
}: {
  status: MbLiveStatusValue;
  /** Age of the last snapshot. Omit when there has never been one. */
  secondsAgo?: number;
  tone?: MbLiveStatusTone;
  /** Renders a retry control. Presentational only — the caller owns the retry. */
  onRetry?: () => void;
  className?: string;
}) => {
  const state = STATES[status];
  const onNavy = tone === "paper";
  const ink = onNavy ? "text-mb-paper-bright" : "text-mb-navy";
  /**
   * `--mb-ink-muted` is never text on navy (invariant 11), so the age line
   * keeps full paper-bright there and separates itself by weight instead.
   */
  const subInk = onNavy ? "text-mb-paper-bright" : "text-mb-ink-muted";

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      <span className={`inline-flex min-w-0 items-center gap-1.5 ${ink}`}>
        {state.dot && <span className="mb-live-dot shrink-0" />}
        {state.icon && <MbIcon id={state.icon} size={13} className="shrink-0" />}
        <span className="matchbook-display truncate text-[0.66rem] mb-track-status font-bold">
          {state.word}
        </span>
      </span>

      {secondsAgo !== undefined && (
        <span className={`truncate text-[0.72rem] tabular-nums ${subInk}`}>
          {state.stale ? "Last update" : "Updated"} {relative(secondsAgo)}
        </span>
      )}

      {onRetry && (
        <MbButton variant="outline-navy" size="sm" icon="refresh" onClick={onRetry}>
          Retry
        </MbButton>
      )}
    </div>
  );
};
