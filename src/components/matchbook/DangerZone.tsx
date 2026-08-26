"use client";

import { MbIcon } from "./MbIcon";
import { MbButton, type MbButtonSize } from "./Button";

export interface MbDangerAction {
  label: string;
  onClick: () => void;
  /** Optional in practice: most call sites have nothing to await. */
  loading?: boolean;
}

/**
 * THE destructive commit control — import it, never re-derive it, anywhere a
 * control destroys, resets, ends or permanently removes something. `MbConfirm`
 * and `MbDangerZone` both render this, so every destructive verb in the app is
 * the same object.
 *
 * The treatment: red OUTLINE at rest (a destructive commit is an outline, a
 * benign primary is a fill — the channel that survives greyscale, and red
 * fills never sit beside the coral CTA), `warning` glyph on the control
 * itself, label is the verb and WRAPS rather than truncating. The hover FILLS
 * (`--mb-red` ground, paper ink) instead of washing: red ink barely clears
 * 4.5:1 on paper-bright, so any wash under it fails.
 *
 * The `!` utilities are load-bearing: `.mb-btn-outline-navy` and its `:hover`
 * are unlayered CSS, which only an important utility outranks — an inline
 * style cannot express `:hover` at all. The hover pair is `[&:hover]:`, not
 * `hover:`: Tailwind v4 emits `hover:` inside `@media (hover: hover)`, so on
 * touch the utility never matches while the sticky `:hover` a tap leaves
 * behind still applies; the arbitrary variant compiles to a bare `:hover`.
 *
 * `data-mb-destructive` is the audit hook: every destructive commit should
 * answer `querySelectorAll("[data-mb-destructive]")`.
 */
export const MbDestructiveButton = ({
  label,
  onClick,
  loading = false,
  size = "md",
  fullWidth = false,
  className = "",
}: MbDangerAction & {
  size?: MbButtonSize;
  fullWidth?: boolean;
  className?: string;
}) => (
  <MbButton
    variant="outline-navy"
    size={size}
    icon="warning"
    loading={loading}
    fullWidth={fullWidth}
    /* `MbButton` truncates its label span — right for a benign button, wrong
       for a destructive one, which must never clip its verb. The `[&>span]`
       variants (0,1,1) outrank `.truncate` (0,1,0) so the label wraps; `<span>`
       only ever matches the label — `MbIcon` renders an `<svg>`. */
    className={`text-mb-red! border-mb-red! [&:hover]:bg-mb-red! [&:hover]:text-mb-paper-bright! [&>span]:overflow-visible [&>span]:text-center [&>span]:whitespace-normal ${className}`}
    onClick={onClick}
    data-mb-destructive=""
  >
    {label}
  </MbButton>
);

/**
 * The block that closes a page whose last option is destructive — its own
 * framed region, always rendered last, never a row next to a frequent
 * control. Frame: `--mb-red` at the 1px edge tier with a 4px anchor top edge,
 * the same geometry `.mb-panel` uses and the same red top edge
 * `MbDialog tone="danger"` puts on a confirm.
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
       unlayered rule, which outranks every Tailwind border utility. The width
       names the `anchor` tier rather than a literal 4. */
    style={{ borderColor: "var(--mb-red)", borderTopWidth: "var(--mb-rule-anchor)" }}
  >
    <div className="min-w-0">
      <p className="mb-kicker flex items-center gap-1.5">
        <MbIcon id="warning" size={12} className="shrink-0" />
        Danger zone
      </p>
      <h3 className="matchbook-display mt-1.5 text-[0.9rem] mb-track-display font-bold">
        {title}
      </h3>
      <p className="mt-1 text-[0.85rem] text-mb-ink-muted">{description}</p>
    </div>

    <div className="shrink-0">
      <MbDestructiveButton
        label={action.label}
        loading={action.loading}
        onClick={action.onClick}
      />
    </div>
  </section>
);
