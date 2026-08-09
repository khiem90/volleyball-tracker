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
 * The one destructive commit control in the system. Import this — do not
 * re-derive it — anywhere a control destroys, resets, purges or ends something
 * (charter Appendix B: one name per job).
 *
 * ### The rules it encodes
 *
 * 1. **A destructive commit is an outline; a benign primary is a fill.** That
 *    is the channel that survives a desaturated screenshot, which is how
 *    invariant 13 is checked. It also settles the earlier collision: measured,
 *    `.mb-btn-coral`'s `--mb-coral-deep` fill and `--mb-red` are ΔE76 7.45
 *    apart with relative luminances of 0.151 and 0.171. Two filled buttons
 *    that close together are the same object at a glance, which is how "Copy
 *    link" and "Delete team" came to be indistinguishable.
 * 2. **Red ink, red rule, paper-bright fill.** `.mb-btn-outline-navy` carries
 *    the paper-bright fill already; only `color` and `border-color` are
 *    re-inked, and both are set unlayered by that class, so an inline style is
 *    the only thing that outranks it. The fill is not optional: `--mb-red`
 *    measures 4.58:1 on `--mb-paper-bright` and only 4.20:1 on `--mb-paper`,
 *    and `.mb-btn` is 0.8rem/600 — below the large-text threshold, so the
 *    4.5:1 floor applies.
 * 3. **The `warning` glyph rides the control itself**, not just the frame
 *    around it. The frame says "this surface is destructive"; the glyph says
 *    "this button is the destructive one", which is the reading invariant 13
 *    needs when the alternative is red ink alone.
 * 4. **The label is the verb** — "Delete team", never "OK"/"Confirm". Rubric
 *    HF-14 fails an unlabelled destructive action.
 * 5. **Never a red fill.** Design language §2.2: `--mb-red` is not for primary
 *    CTAs, and coral and red "must never sit adjacent" — a red-filled button
 *    inside a red-ruled danger dialog is the same loud red twice, and beside a
 *    coral CTA it is two near-identical reds on one screen.
 *
 * `data-mb-destructive` is the audit hook: every destructive commit in a
 * rendered tree should answer `document.querySelectorAll("[data-mb-destructive]")`.
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
    /* `MbButton` puts `truncate` on its label span and `.mb-btn` is
       `white-space: nowrap`, which is right for a benign button and wrong
       here: rubric HF-14 fails a *truncated* destructive action, and
       `MbDialogFooter` gives each button half a 390px row — about two
       characters of headroom past "End session". The child variants resolve to
       `.class > span` (0,1,1) against `.truncate` (0,1,0), so they win on
       specificity wherever the utilities land in the sheet, and `<span>` only
       ever matches the label — `MbIcon` renders an `<svg>`. A wrapped label
       makes the control taller, which nothing forbids. */
    className={`[&>span]:overflow-visible [&>span]:text-center [&>span]:whitespace-normal ${className}`}
    onClick={onClick}
    data-mb-destructive=""
    style={{ color: "var(--mb-red)", borderColor: "var(--mb-red)" }}
  >
    {label}
  </MbButton>
);

/**
 * The block that closes a page whose last option is destructive. It is a
 * deliberate full stop, not a row in the flow: global invariant 35 forbids
 * putting a destructive control next to a frequent one, so this ships as its
 * own framed region and is always rendered last.
 *
 * The frame is `--mb-red` at 1.5px with a 4px top edge — the same geometry as
 * `.mb-panel`, re-inked, and the same 4px red top edge `MbDialog tone="danger"`
 * puts on a confirm. Frame and button together are the whole destructive
 * vocabulary; see `MbDestructiveButton` for why it is an outline.
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
      <MbDestructiveButton
        label={action.label}
        loading={action.loading}
        onClick={action.onClick}
      />
    </div>
  </section>
);
