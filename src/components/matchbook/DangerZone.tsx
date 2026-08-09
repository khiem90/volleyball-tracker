"use client";

import { MbIcon } from "./MbIcon";
import { MbButton } from "./Button";

export interface MbDangerAction {
  label: string;
  onClick: () => void;
  /** Optional in practice: most call sites have nothing to await. */
  loading?: boolean;
}

/**
 * The block that closes a page whose last option is destructive. It is a
 * deliberate full stop, not a row in the flow: global invariant 35 forbids
 * putting a destructive control next to a frequent one, so this ships as its own
 * framed region and is always rendered last.
 *
 * The frame is `--mb-red` at 1.5px with a 4px top edge — the same geometry as
 * `.mb-panel`, re-inked. The button is `.mb-btn-outline-navy` (which carries its
 * own paper-bright fill) with red ink and rule: red measures 4.58:1 on
 * paper-bright and clears the 4.5:1 floor at `.mb-btn`'s 0.8rem/600, but only
 * 4.20:1 on `--mb-paper`, which is why the fill is not optional. It is never a
 * red *fill* — a solid red button next to a coral CTA would put two loud fills
 * on one screen and blow invariant 15.
 */
export const MbDangerZone = ({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description: string;
  action: MbDangerAction;
  className?: string;
}) => (
  <section
    className={`mb-tile flex flex-col gap-3 rounded-[4px] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${className}`}
    /* Inline, not `border-t-4`: `.mb-tile` sets the `border` shorthand from an
       unlayered rule, which outranks every Tailwind border utility. */
    style={{ borderColor: "var(--mb-red)", borderTopWidth: 4 }}
  >
    <div className="min-w-0">
      <p className="mb-kicker flex items-center gap-1.5">
        <MbIcon id="warning" size={12} className="shrink-0" />
        Danger zone
      </p>
      <h3 className="matchbook-display mt-1.5 text-[0.9rem] font-bold tracking-[0.05em]">
        {title}
      </h3>
      <p className="mt-1 text-[0.8rem] text-mb-ink-muted">{description}</p>
    </div>

    <div className="shrink-0">
      <MbButton
        variant="outline-navy"
        onClick={action.onClick}
        loading={action.loading}
        /* Same reason as the frame: `.mb-btn-outline-navy` sets `color` and
           `border-color` unlayered, so only an inline style re-inks it. */
        style={{ color: "var(--mb-red)", borderColor: "var(--mb-red)" }}
      >
        {action.label}
      </MbButton>
    </div>
  </section>
);
