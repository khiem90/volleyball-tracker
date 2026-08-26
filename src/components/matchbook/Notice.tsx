import type { ReactNode } from "react";
import { MbIcon } from "./MbIcon";

export type MbNoticeTone = "info" | "warn" | "danger" | "success";

/* One mark per tone, no two shared (F7). `warn` keeps the exclamation
   triangle — the caution glyph everywhere. `danger` takes `close`, the X:
   the error convention, and the only mark in the 62-id sprite that reads
   "this failed" rather than "mind this". They were both `warning` once,
   which made the tone rule the ONLY difference between "heads up" and
   role="alert" — a distinction the left rule alone cannot carry for a
   colour-blind reader or a grayscale print. */
const DEFAULT_ICON: Record<MbNoticeTone, string> = {
  info: "help",
  warn: "warning",
  danger: "close",
  success: "check",
};

/**
 * Inline hairline notice — the replacement for every stray `text-destructive`
 * line and amber tint block. The tone rides the 4px left rule of `.mb-banner`,
 * never the letterforms (small type never carries tone — it stays navy).
 */
export const MbNotice = ({
  tone,
  icon,
  title,
  children,
}: {
  tone: MbNoticeTone;
  /** Sprite icon id. Defaults to the tone's own mark. */
  icon?: string;
  title?: string;
  children: ReactNode;
}) => (
  <div
    className="mb-banner text-mb-navy"
    data-tone={tone}
    role={tone === "danger" ? "alert" : undefined}
  >
    <MbIcon
      id={icon ?? DEFAULT_ICON[tone]}
      size={16}
      /* self-start beats the class's align-items without competing with it. */
      className="mt-[2px] shrink-0 self-start"
    />
    <div className="flex min-w-0 flex-col gap-[3px]">
      {title && (
        <span className="matchbook-display text-[0.78rem] mb-track-display font-bold">
          {title}
        </span>
      )}
      <div className="min-w-0 leading-[1.5]">{children}</div>
    </div>
  </div>
);
