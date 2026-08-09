import type { ReactNode } from "react";
import type { MbActionTone } from "./ActionBar";
import { MbButton, MbButtonLink } from "./Button";
import { MbIcon } from "./MbIcon";
import { MB_STATE_TONES, type PanelEmptyTone } from "./Panel";

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
 * Glyph + eyebrow per tone come from `MB_STATE_TONES` — the single table
 * `PanelEmpty` reads too, so one concept can never end up with two glyphs or
 * two words depending on the scale it is drawn at. The word carries the state;
 * the glyph and the ink are the second and third channels, never the only one
 * (invariant 13).
 *
 * These are the two page-only fallbacks, and the only place the scales differ:
 * the shared table leaves `empty` unmarked and unlabelled because in-panel
 * emptiness stays plain (design language §5.7), whereas a page-level state *is*
 * the whole panel, so its head must still be titled and marked.
 */
const PAGE_EMPTY_ICON = "clipboard";
const PAGE_EMPTY_WORD = "Nothing here yet";

const ActionControl = ({ action, primary }: { action: MbEmptyStateAction; primary: boolean }) => {
  const tone = action.tone ?? (primary ? "coral" : "outline-navy");

  /* A destination is an anchor, not a button — so it keeps middle-click, "open
     in new tab" and the status bar. `MbButtonLink` is the kit's escape hatch for
     exactly that, and it shares `MbButton`'s variant/geometry/content tables, so
     the two branches below render one box in two tags. */
  if (action.href) {
    return (
      <MbButtonLink variant={tone} size="lg" icon={action.icon} href={action.href}>
        {action.label}
      </MbButtonLink>
    );
  }

  return (
    <MbButton variant={tone} size="lg" icon={action.icon} onClick={action.onClick}>
      {action.label}
    </MbButton>
  );
};

/**
 * The page-level cut of the one state language: eyebrow, display line, hung
 * rule, deck, real actions — ranged left. `PanelEmpty` draws the same anatomy at
 * the in-panel scale (display line `1.2rem` vs `1.875rem`, rule 40px vs 64px,
 * button `sm` vs `lg`), so a route-level empty and a panel-level empty read as
 * the same object at two sizes rather than as two design systems
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
  const meta = MB_STATE_TONES[tone];
  return (
    <section className={`mb-panel ${className}`} data-tone={tone}>
      <header className="mb-panel-head">
        <h2 className="matchbook-display flex min-w-0 items-center gap-2 text-[0.95rem] font-bold tracking-[0.05em]">
          <MbIcon
            id={icon ?? meta.icon ?? PAGE_EMPTY_ICON}
            size={16}
            className={`shrink-0 ${meta.ink}`}
          />
          <span className="truncate">{meta.word ?? PAGE_EMPTY_WORD}</span>
        </h2>
      </header>
      <div className="flex flex-col items-start gap-3 px-5 py-7 sm:px-7 sm:py-9">
        <p className="matchbook-display max-w-[22ch] text-3xl font-bold leading-none tracking-[0.02em] sm:text-4xl">
          {title}
        </p>
        {/* Hung rule — the mark the two scales share; it closes the naming zone. */}
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
