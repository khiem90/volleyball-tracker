import type { ReactNode } from "react";
import { MbIcon } from "./MbIcon";

export type MbNoticeTone = "info" | "warn" | "danger" | "success";

const DEFAULT_ICON: Record<MbNoticeTone, string> = {
  info: "help",
  warn: "warning",
  danger: "warning",
  success: "check",
};

/**
 * Inline hairline notice — the replacement for every stray `text-destructive`
 * line and amber tint block. The tone rides the 4px left rule of `.mb-banner`,
 * never the letterforms (they stay navy, as GAP-4 requires of small type).
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
    <div className="flex min-w-0 flex-col gap-1">
      {title && (
        <span className="matchbook-display text-[0.78rem] font-bold tracking-[0.02em]">
          {title}
        </span>
      )}
      <div className="min-w-0 leading-[1.5]">{children}</div>
    </div>
  </div>
);
