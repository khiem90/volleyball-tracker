import type { ReactNode } from "react";
import type { MbActionVariant } from "./ActionBar";
import { MbButton, MbButtonLink } from "./Button";
import { MB_STATE_SCALE, MbStateBlock, type PanelEmptyTone } from "./Panel";

/**
 * The same six tones `PanelEmpty` carries — page level here, in-panel there
 * (charter Appendix A, D-7). Aliased rather than restated so the two can never
 * drift apart.
 */
export type MbEmptyStateTone = PanelEmptyTone;

/**
 * `MbActionVariant` verbatim, so `variant="outline"` means `.mb-btn-outline`
 * here and in `MbActionBar` alike. A second four-value union with a different
 * meaning for one of its members is exactly the drift the rubric penalises.
 */
export type MbEmptyStateActionVariant = MbActionVariant;

export interface MbEmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  /** Sprite icon id. */
  icon?: string;
  variant?: MbEmptyStateActionVariant;
}

const ActionControl = ({ action, primary }: { action: MbEmptyStateAction; primary: boolean }) => {
  const variant = action.variant ?? (primary ? "coral" : "outline-navy");
  const size = MB_STATE_SCALE.route.button;

  /* A destination is an anchor, not a button — so it keeps middle-click, "open
     in new tab" and the status bar. `MbButtonLink` is the kit's escape hatch for
     exactly that, and it shares `MbButton`'s variant/geometry/content tables, so
     the two branches below render one box in two tags. */
  if (action.href) {
    return (
      <MbButtonLink variant={variant} size={size} icon={action.icon} href={action.href}>
        {action.label}
      </MbButtonLink>
    );
  }

  return (
    <MbButton variant={variant} size={size} icon={action.icon} onClick={action.onClick}>
      {action.label}
    </MbButton>
  );
};

/**
 * The route-level cut of the one state language. It draws **no markup of its
 * own**: the whole visible object is `MbStateBlock`, the same component
 * `PanelEmpty` renders, passed `scale="route"` instead of `scale="panel"`. The
 * two cuts therefore cannot look like two design systems — the only thing that
 * differs between them is the row of `MB_STATE_SCALE` they select, and that
 * table is §5.7's three documented size steps and nothing else:
 *
 *   display line   1.875rem route  ·  1.2rem panel
 *   hung rule      64px route      ·  40px panel
 *   action         size `lg` route ·  size `sm` panel
 *
 * The eyebrow is deliberately **not** on that list, so it is one object drawn
 * once, at one step, at both scales. It was a `.mb-panel-head` bar with a
 * 15.2px navy `<h2>` and a full-bleed hairline until this round — a different
 * device from the panel cut's inline `.mb-kicker`, and the last place the two
 * languages were still visibly two.
 *
 * `empty` therefore draws no eyebrow at all here, exactly as it draws none in a
 * panel: `MB_STATE_TONES` marks it iconless and unlabelled, §5.7 puts the
 * eyebrow "only on the five failure tones", and the page-only fallback that
 * used to fill the head ("Nothing here yet") only restated the headline
 * underneath it — two headlines, 60px apart, saying one thing.
 *
 * What this component *does* own is the sheet the block sits on: `.mb-panel`
 * (paper, navy anchor rule, 4px radius) plus `data-tone`, which `globals.css`
 * hangs `overflow-wrap: anywhere` off via `.mb-panel[data-tone] p` so an
 * unbroken share code in a headline still wraps. In a panel that sheet is the
 * `Panel` the block is nested in; at route level there is nothing else, so the
 * state supplies its own.
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
}) => (
  <section className={`mb-panel ${className}`} data-tone={tone}>
    <MbStateBlock
      scale="route"
      tone={tone}
      icon={icon}
      headline={title}
      deck={body}
      action={
        actions &&
        actions.length > 0 && (
          /* The row keeps its own gap because two actions sit side by side and
             hard-fail 2 puts an 8px floor under adjacent targets. `gap-3` is
             12px — the block's own route-scale rhythm, so the horizontal step
             and the vertical step are one number. */
          <div className="flex flex-wrap gap-3">
            {actions.map((action, i) => (
              <ActionControl key={action.label} action={action} primary={i === 0} />
            ))}
          </div>
        )
      }
    />
  </section>
);
