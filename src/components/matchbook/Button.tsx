"use client";

import Link from "next/link";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { MbIcon } from "./MbIcon";

export type MbButtonVariant = "coral" | "navy" | "outline" | "outline-navy";

/* ===========================================================================
   THE CONTROL SIZE LADDER — one ladder, three rungs, for the whole kit.

   Before this, four ladders shipped side by side and disagreed about what
   `size="md"` meant. Measured on `/dev/kit`:

     .mb-btn        44 / 48 / 56
     MbIconButton   44 /      56     `md` was 44 — a different number to
                                     `MbButton size="md"`, documented as a
                                     trap and left in place
     .mb-segmented  44 / 48          cells, so the *group* was 46 / 50
     .mb-stepper    46 /      58     shell, neither value on any ladder
     .mb-input      48               no size axis at all

   So a wizard row holding a text field and a number stepper was permanently
   48 against 46 with no prop that could fix it.

   ---------------------------------------------------------------- the rule

   A rung is the **outer box of the control** — the border box a neighbour has
   to line up with. Not the label, not an interior cell. Every control in the
   kit reports its rung as `data-size`, so the ladder is measurable rather
   than asserted.

   | rung | box  | purpose                                                    |
   | ---- | ---- | ---------------------------------------------------------- |
   | `sm` | 44px | THE FLOOR. A target that sits *inside* something else and  |
   |      |      | must not dominate it: a tag's remove key, a colour swatch, |
   |      |      | a filter chip in a toolbar, the retry inside              |
   |      |      | `MbLiveStatus`. Invariant 33 / rubric HF-2 forbid less.    |
   | `md` | 48px | THE DEFAULT. Every standalone control: buttons, icon       |
   |      |      | buttons, text fields, selects, segmented groups, steppers, |
   |      |      | toggles. One number, so any two of them on one row align.  |
   | `lg` | 56px | THE COMMIT RUNG. `MbActionBar`, dialog footers, full-width |
   |      |      | phone primaries, the scoring console — one-handed,         |
   |      |      | thumb-reach targets that end a task.                       |

   ------------------------------------------------- the composite corollary

   A control drawn as a *frame around cells* — `.mb-segmented`, `.mb-stepper` —
   spends its own edge rule twice, once top and once bottom. VERTICALLY the
   frame no longer charges its interior for that: the cells resolve to the rung
   itself and the frame's block edges are paint (an inset outline, a negative
   block margin — see `MB_CONTROL_CELL` below and G21 in globals.css), so a
   sweep that enumerates the cells reads 48/56, not 46/54. HORIZONTALLY the
   frame still spends real columns, and `MB_CONTROL_CELL` states the interior
   width once so no component re-derives it.

   The floor argument survives the correction: a composite still starts at
   `md`, not `sm`, because at `sm` the interior WIDTH would be 42px and the
   cells — the ± keys, the segments — are the real targets. `MbCompositeSize`
   makes that unrepresentable rather than a comment nobody reads.
   =========================================================================== */

export type MbControlSize = "sm" | "md" | "lg";

/** Outer border box of a control at each rung, in CSS px. */
export const MB_CONTROL_HEIGHT: Record<MbControlSize, number> = {
  sm: 44,
  md: 48,
  lg: 56,
};

/** The rungs a framed composite may offer. `sm` is absent by construction. */
export type MbCompositeSize = Exclude<MbControlSize, "sm">;

/**
 * Interior cell WIDTH for a framed composite: the rung less the frame's own
 * two edge rules (`--mb-rule-edge`, which renders 1px — design language §3.3).
 * Both values clear the 44px floor; 42px, which `sm` would give, does not.
 *
 * WIDTH only, since the G21 correction ("the framed field's own height",
 * globals.css) reached the composites: an interior cell's HEIGHT is now the
 * full rung. The frame used to charge its interior for its own two edge rules,
 * which put every segmented cell and stepper key at 46/54 — numbers on no
 * ladder, and the numbers the D2 sweep sees, because an audit enumerates the
 * `button`/`input`, not the frame around it. The interior now resolves to the
 * rung itself (`MB_CONTROL_HEIGHT`) and the frame's edge is paint, not layout:
 * `MbNumberStepper` gives its keys a negative block margin of exactly one edge
 * (the `.mb-input > input` idiom), and `MbSegmented` draws its frame as an
 * inset outline. Horizontally nothing is measured against the ladder and the
 * frame still spends real columns, so the width keeps the honest derivation.
 */
export const MB_CONTROL_CELL: Record<MbCompositeSize, number> = {
  md: MB_CONTROL_HEIGHT.md - 2,
  lg: MB_CONTROL_HEIGHT.lg - 2,
};

/**
 * `MbButton` takes the full ladder: its box *is* its target, so the floor rung
 * is available to it.
 *
 * Each rung still moves four things at once — height, inline padding, type
 * step and glyph — so two sizes never render the same box.
 *
 * The previous `touch` member is gone. It resolved to a byte-identical class
 * list to `md` and measured the same 102.5 x 44 box, and the gallery said so
 * out loud ("same as md"). Charter §2.3 names it, but §4.33 — a hard fail —
 * already forces every size over 44px, which leaves `touch` nothing to mean.
 */
export type MbButtonSize = MbControlSize;

const VARIANT_CLASS: Record<MbButtonVariant, string> = {
  coral: "mb-btn-coral",
  navy: "mb-btn-navy",
  outline: "mb-btn-outline",
  "outline-navy": "mb-btn-outline-navy",
};

interface SizeSpec {
  /** `padding-inline`. Set inline: `.mb-btn`'s `padding` shorthand is unlayered. */
  padding: string;
  /** Extra unlayered class, where one exists, purely for the type step. */
  shell: string;
  /**
   * The type step lands on the label, not on the button. `.mb-btn` sets
   * `font-size` and is *unlayered* CSS, while Tailwind utilities live in
   * `@layer utilities` — an unlayered declaration wins over any layer
   * regardless of specificity, so `text-[…]` on the button element is silently
   * inert. The label span has no competing rule, so the step applies there
   * cleanly and without an `!important`.
   */
  label: string;
  /** Sprite glyph size, in px. */
  glyph: number;
}

const SIZE: Record<MbButtonSize, SizeSpec> = {
  sm: {
    padding: "0.75rem",
    shell: "",
    label: "text-[0.72rem] mb-track-link",
    glyph: 12,
  },
  md: { padding: "1.1rem", shell: "", label: "", glyph: 14 },
  /* `.mb-btn-lg` is kept for its 0.9rem `font-size` only — it is unlayered, so
     it is the one way to move the step without an `!important`. Its padding and
     `min-height` are both superseded by the inline geometry below. */
  lg: { padding: "1.5rem", shell: "mb-btn-lg", label: "", glyph: 16 },
};

/**
 * Inline, not a class, for two reasons: `.mb-btn`'s `padding` and
 * `.mb-btn-touch`'s `min-height` are unlayered and would outrank any Tailwind
 * utility, and the caller's own `style` still wins because it is spread last.
 *
 * `minWidth` carries the other half of invariant 33: a two-letter label at
 * `sm` measures ~42px without it.
 */
const geometry = (size: MbButtonSize, style?: CSSProperties): CSSProperties => ({
  minHeight: MB_CONTROL_HEIGHT[size],
  minWidth: MB_CONTROL_HEIGHT.sm,
  paddingInline: SIZE[size].padding,
  ...style,
});

const shell = (
  variant: MbButtonVariant,
  size: MbButtonSize,
  fullWidth: boolean
): string =>
  `mb-btn ${VARIANT_CLASS[variant]} ${SIZE[size].shell} ${fullWidth ? "w-full" : ""}`;

/** Icon · label · icon, identical in the button and the link. */
const Content = ({
  size,
  icon,
  iconRight,
  children,
}: {
  size: MbButtonSize;
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
}) => (
  <>
    {icon && <MbIcon id={icon} size={SIZE[size].glyph} className="shrink-0" />}
    {children !== undefined && children !== null && children !== false && (
      <span className={`min-w-0 truncate tabular-nums ${SIZE[size].label}`}>{children}</span>
    )}
    {iconRight && <MbIcon id={iconRight} size={SIZE[size].glyph} className="shrink-0" />}
  </>
);

interface MbButtonShared {
  variant: MbButtonVariant;
  size?: MbButtonSize;
  /** Sprite icon id rendered before the label. */
  icon?: string;
  /** Sprite icon id rendered after the label. */
  iconRight?: string;
  fullWidth?: boolean;
}

export type MbButtonProps = MbButtonShared & {
  /**
   * Busy state. Keeps the button focusable and keeps its label, blocks
   * activation (including a `type="submit"` form post) and never animates —
   * invariant 45 allows exactly one infinite loop in the system and it is the
   * live dot. The present-participle label is what carries "in progress".
   */
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * The one button. `ref` is forwarded so Radix `asChild` (`MbMenu`'s trigger),
 * `MbDialog`'s `initialFocus` and any manual focus restoration reach the real
 * element instead of a `null` that fails silently.
 *
 * A control that *navigates* is `MbButtonLink`, below — never this with an
 * `onClick` that pushes a route.
 */
export const MbButton = forwardRef<HTMLButtonElement, MbButtonProps>(
  (
    {
      variant,
      size = "md",
      icon,
      iconRight,
      loading = false,
      fullWidth = false,
      className = "",
      children,
      type = "button",
      onClick,
      style,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      className={`${shell(variant, size, fullWidth)} ${
        loading ? "cursor-progress" : ""
      } disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={geometry(size, style)}
      /* The ladder's audit hook. Every control in the kit publishes the rung it
         thinks it is on, so a sweep can prove `md` is one number rather than
         infer it from a class name. No CSS reads it. */
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={
        loading
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
            }
          : onClick
      }
      {...rest}
    >
      <Content size={size} icon={loading ? "refresh" : icon} iconRight={iconRight}>
        {children}
      </Content>
    </button>
  )
);
MbButton.displayName = "MbButton";

export type MbButtonLinkProps = MbButtonShared &
  Omit<ComponentPropsWithoutRef<typeof Link>, "children"> & { children?: ReactNode };

/**
 * The same button, rendered as a destination.
 *
 * A sibling component rather than an `as`/`href` prop on `MbButton`: the two
 * differ in more than their tag. `loading`, `disabled` and `type` are
 * meaningless on an anchor and a discriminated-union prop type that says so
 * costs more than the second component does, while a permissive union would
 * let `<MbButton href="…" loading />` typecheck and then silently drop the
 * busy contract. Splitting also makes the call site state its intent —
 * destination or action — which is the distinction that decides whether
 * middle-click, "open in new tab" and the status bar work at all.
 *
 * Geometry, variants and the icon/label slots come from the same three tables
 * above, so the two can never drift.
 */
export const MbButtonLink = forwardRef<HTMLAnchorElement, MbButtonLinkProps>(
  (
    {
      variant,
      size = "md",
      icon,
      iconRight,
      fullWidth = false,
      className = "",
      children,
      style,
      ...rest
    },
    ref
  ) => (
    <Link
      ref={ref}
      className={`${shell(variant, size, fullWidth)} ${className}`}
      style={geometry(size, style)}
      data-size={size}
      {...rest}
    >
      <Content size={size} icon={icon} iconRight={iconRight}>
        {children}
      </Content>
    </Link>
  )
);
MbButtonLink.displayName = "MbButtonLink";
