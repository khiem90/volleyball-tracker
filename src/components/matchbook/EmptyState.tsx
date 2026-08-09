import Link from "next/link";
import type { ReactNode } from "react";
import { MbIcon } from "./MbIcon";

export type MbEmptyStateTone =
  | "empty"
  | "notfound"
  | "error"
  | "offline"
  | "denied"
  | "unconfigured";

export interface MbEmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  /** Sprite icon id. */
  icon?: string;
  tone?: "coral" | "navy" | "outline";
}

/** Icon + eyebrow per tone (shell brief §3.6). `icon` overrides the mark only. */
const TONE_META: Record<MbEmptyStateTone, { icon: string; kicker: string }> = {
  empty: { icon: "clipboard", kicker: "Nothing here yet" },
  notfound: { icon: "search", kicker: "Not found" },
  error: { icon: "warning", kicker: "Something went wrong" },
  offline: { icon: "wifi-off", kicker: "Offline" },
  denied: { icon: "lock", kicker: "No access" },
  unconfigured: { icon: "cloud", kicker: "Not configured" },
};

const ACTION_CLASS: Record<"coral" | "navy" | "outline", string> = {
  coral: "mb-btn-coral",
  navy: "mb-btn-navy",
  outline: "mb-btn-outline-navy",
};

const ActionButton = ({ action, primary }: { action: MbEmptyStateAction; primary: boolean }) => {
  const className = `mb-btn mb-btn-lg ${
    ACTION_CLASS[action.tone ?? (primary ? "coral" : "outline")]
  }`;
  const inner = (
    <>
      {action.icon && <MbIcon id={action.icon} size={14} className="shrink-0" />}
      {action.label}
    </>
  );
  return action.href ? (
    <Link href={action.href} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={className} onClick={action.onClick}>
      {inner}
    </button>
  );
};

/**
 * Page-level state object: eyebrow, display title, hung rule, one paragraph and
 * at most a couple of actions. In-panel emptiness stays `PanelEmpty`
 * (charter Appendix A, D-7).
 */
export const MbEmptyState = ({
  tone,
  icon,
  title,
  body,
  actions,
  className = "",
}: {
  tone: MbEmptyStateTone;
  /** Sprite icon id. Defaults to the tone's own mark. */
  icon?: string;
  title: string;
  body?: ReactNode;
  actions?: MbEmptyStateAction[];
  className?: string;
}) => {
  const meta = TONE_META[tone];
  return (
    <section className={`mb-panel ${className}`} data-tone={tone}>
      <header className="mb-panel-head">
        <h2 className="matchbook-display flex min-w-0 items-center gap-2 text-[0.95rem] font-bold tracking-[0.05em]">
          <MbIcon
            id={icon ?? meta.icon}
            size={16}
            className={`shrink-0 ${tone === "error" ? "text-mb-red" : ""}`}
          />
          <span className="truncate">{meta.kicker}</span>
        </h2>
      </header>
      <div className="flex flex-col items-start gap-3 px-5 py-7 sm:px-7 sm:py-9">
        <p className="matchbook-display max-w-[22ch] text-[1.6rem] font-bold leading-[1.02] sm:text-[2rem]">
          {title}
        </p>
        {/* Hung rule — the editorial break between the display line and the copy. */}
        <span className="block h-px w-16 bg-mb-navy" />
        {body && (
          <div className="max-w-[46ch] text-[0.9rem] leading-[1.55] text-mb-ink-muted">{body}</div>
        )}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {actions.map((action, i) => (
              <ActionButton key={action.label} action={action} primary={i === 0} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
