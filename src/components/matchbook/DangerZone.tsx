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
 * # The destructive language — one treatment, whole system
 *
 * This is the only destructive commit control. Import it — do not re-derive it
 * — anywhere a control destroys, resets, purges, ends or permanently removes
 * something (charter Appendix B: one name per job). `MbConfirm` and
 * `MbDangerZone` both render *this*, so a "Delete team" in a dialog and a
 * "Reset the whole season" at the foot of a page are the same object.
 *
 * ### The spec, so W4/W6/W7 copy one thing
 *
 * | | resting | hover / pointer-down |
 * | --- | --- | --- |
 * | ground | `--mb-paper-bright` | `--mb-red` |
 * | ink + glyph | `--mb-red` (4.58:1) | `--mb-paper-bright` (4.58:1) |
 * | rule | 1px `--mb-red` (`edge` tier) | 1px `--mb-red` |
 * | glyph | `warning`, always | `warning` |
 * | label | the verb, wrapped never clipped | ditto |
 *
 * Surround, supplied by the container rather than the button: a 4px `--mb-red`
 * `anchor` top edge (`MbDialog tone="danger"`, and the `MbDangerZone` tile
 * below), a `warning` glyph in the header, and a 3px `--mb-red` `accent` rail
 * beside the named subject.
 *
 * ### Why, with the numbers
 *
 * 1. **A destructive commit is an outline; a benign primary is a fill.** That
 *    is the channel that survives a desaturated screenshot, which is how
 *    invariant 13 is checked — greyscale ground 0.960 (destructive) against
 *    0.151 (`.mb-btn-coral`) and 0.029 (`.mb-btn-navy`). It also settles the
 *    earlier collision: `--mb-coral-deep` and `--mb-red` are ΔE76 7.45 apart,
 *    so two *filled* buttons that close together are the same object at a
 *    glance, which is how "Copy link" and "Delete team" came to be
 *    indistinguishable.
 * 2. **Never a red fill at rest.** Design language §2.2 (the `--mb-red` row):
 *    red is not for primary CTAs — that is coral — and coral and red "must
 *    never sit adjacent". A red-filled button inside a red-ruled danger dialog
 *    is the same loud red twice, and beside a coral CTA it is two
 *    near-identical reds on one screen.
 * 3. **The hover fills in rather than washing, and that is a contrast fix, not
 *    a flourish.** `--mb-red` measures 4.58:1 on `--mb-paper-bright` — 0.08
 *    over the 4.5:1 floor that `.mb-btn`'s 0.8rem/600 is subject to — so *any*
 *    wash under it fails. Inheriting `.mb-btn-outline-navy:hover`'s
 *    `--mb-tint-2` measured **4.10:1**, a hard fail (rubric §3.6) that shipped
 *    unnoticed because nobody screenshotted the hover state. Filling makes the
 *    state ground-independent instead: `--mb-paper-bright` on `--mb-red` is
 *    4.58:1 wherever the button sits. `.mb-btn-outline:hover` already does
 *    exactly this for the same reason, so this is the system's existing idiom,
 *    not a new one — and it keeps red off the screen until the pointer is
 *    actually on the control.
 * 4. **The `warning` glyph rides the control itself**, not just the frame
 *    around it. The frame says "this surface is destructive"; the glyph says
 *    "this button is the destructive one", which is the reading invariant 13
 *    needs when the alternative is red ink alone. It is also what separates
 *    the commit from `Cancel`, which is the other outline in the footer.
 * 5. **The label is the verb** — "Delete team", never "OK"/"Confirm" — and it
 *    wraps rather than truncating. Rubric HF-14 fails an unlabelled *or*
 *    truncated destructive action.
 * 6. **The rule stays at the `edge` tier.** 1px is what globals.css reserves
 *    for "the BOUNDARY of a thing"; 3px `accent` and 4px `anchor` are marks,
 *    and the container already spends the anchor. Fortifying the button's own
 *    frame would invert the tier vocabulary to buy a hierarchy cue the glyph
 *    already provides.
 *
 * The four `!` utilities are load-bearing: `.mb-btn-outline-navy` and its
 * `:hover` are **unlayered** CSS, and CSS sorts origin-and-importance before
 * layers, so an important utility is the only thing short of an inline style
 * that outranks them — and an inline style cannot express `:hover` at all.
 *
 * The hover pair is written `[&:hover]:` and not `hover:` on purpose. Tailwind
 * v4 emits `hover:` inside `@media (hover: hover)`, so on a touch device the
 * utility never matches — while the browser still applies the sticky `:hover`
 * that a tap leaves behind. Measured on a 390px touch emulation, the `hover:`
 * form left the tapped button on `--mb-tint-2` at **4.10:1**; the arbitrary
 * variant compiles to a bare `:hover` rule and reads 4.58:1 on both.
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
    className={`text-mb-red! border-mb-red! [&:hover]:bg-mb-red! [&:hover]:text-mb-paper-bright! [&>span]:overflow-visible [&>span]:text-center [&>span]:whitespace-normal ${className}`}
    onClick={onClick}
    data-mb-destructive=""
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
 * The frame is `--mb-red` at the 1px `edge` tier with a 4px `anchor` top edge —
 * the same geometry `.mb-panel` uses, re-inked, and the same 4px red top edge
 * `MbDialog tone="danger"` puts on a confirm. (An earlier note here claimed
 * 1.5px; globals.css records that the 1.5px tier never rendered — Blink floors
 * a used border-width to whole pixels — and the tiers are now 1 / 3 / 4.)
 * Frame and button together are the whole destructive vocabulary; see
 * `MbDestructiveButton` for the spec and the measurements behind it.
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
       is the `anchor` token rather than a literal 4 — invariant 7 wants every
       value to name a tier. */
    style={{ borderColor: "var(--mb-red)", borderTopWidth: "var(--mb-rule-anchor)" }}
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
