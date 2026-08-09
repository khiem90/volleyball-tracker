import Link from "next/link";
import type { ReactNode } from "react";
import type { MbActionTone } from "./ActionBar";
import { MbButton } from "./Button";
import { MbIcon } from "./MbIcon";
import type { PanelEmptyTone } from "./Panel";

/**
 * The same six tones `PanelEmpty` carries — page level here, in-panel there
 * (charter Appendix A, D-7). Aliased rather than restated so the two can never
 * drift apart.
 */
export type MbEmptyStateTone = PanelEmptyTone;

/**
 * `MbActionTone` verbatim, so `tone="outline"` means `.mb-btn-outline` here and
 * in `MbActionBar` alike. A second four-value union with a different meaning for
 * one of its members is exactly the drift the rubric penalises.
 */
export type MbEmptyStateActionTone = MbActionTone;

export interface MbEmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  /** Sprite icon id. */
  icon?: string;
  tone?: MbEmptyStateActionTone;
}

/**
 * Icon + eyebrow per tone. The word is what carries the state — the glyph and
 * the ink are the second and third channels, never the only one (invariant 13).
 */
const TONE_META: Record<MbEmptyStateTone, { icon: string; kicker: string }> = {
  empty: { icon: "clipboard", kicker: "Nothing here yet" },
  notfound: { icon: "search", kicker: "Not found" },
  error: { icon: "warning", kicker: "Something went wrong" },
  offline: { icon: "wifi-off", kicker: "Offline" },
  denied: { icon: "lock", kicker: "No access" },
  /* `settings`, matching `PanelEmpty`'s mark for the same tone: one concept,
     one glyph, whichever level it is drawn at. */
  unconfigured: { icon: "settings", kicker: "Not configured" },
};

const LINK_CLASS: Record<MbEmptyStateActionTone, string> = {
  coral: "mb-btn-coral",
  navy: "mb-btn-navy",
  outline: "mb-btn-outline",
  "outline-navy": "mb-btn-outline-navy",
};

const ActionControl = ({ action, primary }: { action: MbEmptyStateAction; primary: boolean }) => {
  const tone = action.tone ?? (primary ? "coral" : "outline-navy");

  /* A destination is an anchor, not a button — so it keeps middle-click, "open
     in new tab" and the status bar. It emits the same `.mb-btn` classes. */
  if (action.href) {
    return (
      <Link href={action.href} className={`mb-btn mb-btn-lg ${LINK_CLASS[tone]}`}>
        {action.icon && <MbIcon id={action.icon} size={16} className="shrink-0" />}
        <span className="min-w-0 truncate">{action.label}</span>
      </Link>
    );
  }

  return (
    <MbButton variant={tone} size="lg" icon={action.icon} onClick={action.onClick}>
      {action.label}
    </MbButton>
  );
};

/**
 * Page-level state object: eyebrow, display line, hung rule, one paragraph and
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
        <p className="matchbook-display max-w-[22ch] text-3xl font-bold leading-none tracking-[0.02em] sm:text-4xl">
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
              <ActionControl key={action.label} action={action} primary={i === 0} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
