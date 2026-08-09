"use client";

import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { MbIcon } from "./MbIcon";

export type MbMenuItemTone = "default" | "danger";

export interface MbMenuItem {
  label: string;
  /** Sprite icon id. */
  icon?: string;
  tone?: MbMenuItemTone;
  onSelect: () => void;
  disabled?: boolean;
}

/**
 * The overflow menu for a row or masthead carrying more than two actions
 * (charter §2.3). Wraps `@radix-ui/react-dropdown-menu` — the same dependency
 * `MbDialog` already uses — for roving focus, Home/End, typeahead, Escape,
 * outside-click and focus restoration. `MbTabs` is hand-rolled because
 * `@radix-ui/react-tabs` is deleted in P4; dropdown-menu is not on that list.
 *
 * Rows are full-bleed and ruled rather than padded and floating: a menu is a
 * short ledger, not a card stack.
 */
export const MbMenu = ({
  trigger,
  label = "More actions",
  items,
  align = "end",
  className = "",
}: {
  /**
   * Content of the menu's own `<button>` — never a button itself, so the
   * trigger can never nest interactive elements. Defaults to the `more` glyph.
   */
  trigger?: ReactNode;
  /** Becomes `title` + `aria-label`. Must contain the trigger's visible words. */
  label?: string;
  items: MbMenuItem[];
  align?: "start" | "end";
  className?: string;
}) => {
  // A trigger that opens onto nothing is worse than no trigger. Callers render
  // the empty case themselves; there is no such thing as an empty menu.
  if (items.length === 0) return null;

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          className={`mb-btn mb-btn-touch border-transparent bg-transparent text-mb-navy transition-colors hover:bg-[var(--mb-tint-2)] hover:text-mb-coral data-[state=open]:bg-[var(--mb-tint-2)] data-[state=open]:text-mb-coral ${
            trigger ? "" : "h-11 w-11 p-0"
          } ${className}`}
        >
          {trigger ?? <MbIcon id="more" size={18} className="shrink-0" />}
        </button>
      </MenuPrimitive.Trigger>

      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          loop
          /* The menu portals to <body>, outside `.matchbook-surface`, where the
             legacy unlayered `:focus-visible` rule would paint a red ring that
             no Tailwind utility can outrank. Carrying the surface class here
             restores the coral ring, the navy ink and the sans stack in one
             move; the fill is overridden inline because that rule is unlayered
             too and `bg-*` would lose to it. */
          className="matchbook-surface min-w-[13rem] max-w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-[4px] border-[1.5px] border-t-[4px] border-mb-navy shadow-[var(--mb-panel-shadow)]"
          /* Radix reads `zIndex` off this style to lift its own positioner, so
             it has to be here rather than in a `z-*` utility. */
          style={{ background: "var(--mb-paper-bright)", zIndex: 50 }}
        >
          {items.map((item, index) => {
            const danger = item.tone === "danger";
            const previous = items[index - 1];
            // A destructive row never sits on the same hairline as a frequent
            // one (§4.35): the group break above it is a full navy rule.
            const rule =
              index === 0
                ? ""
                : danger && previous?.tone !== "danger"
                  ? "border-t-[1.5px] border-mb-navy"
                  : "border-t border-mb-rule";

            return (
              <MenuPrimitive.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={item.onSelect}
                style={{
                  // Beats every class, so the danger rail survives the
                  // highlighted state instead of being swapped for coral.
                  boxShadow:
                    danger && !item.disabled ? "inset 3px 0 0 var(--mb-red)" : undefined,
                  // The ring is drawn inside the row; `overflow-hidden` on the
                  // panel would clip the surface rule's outward 2px offset.
                  outlineOffset: "-2px",
                  // `.matchbook-display` pins letter-spacing to 0.02em from an
                  // unlayered rule, so the `tracking-*` class below cannot lift
                  // it. A menu row is a horizontal `.mb-nav-item`; it gets that
                  // rule's 0.08em the only way that outranks the class.
                  letterSpacing: "0.08em",
                }}
                className={`matchbook-display flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 px-3.5 text-[0.78rem] font-semibold tracking-[0.08em] text-mb-navy transition-colors duration-[var(--mb-dur-fast)] select-none data-[highlighted]:bg-[var(--mb-tint-2)] data-[highlighted]:shadow-[inset_3px_0_0_var(--mb-coral)] data-[disabled]:cursor-not-allowed data-[disabled]:bg-transparent data-[disabled]:text-mb-ink-muted ${rule}`}
              >
                {item.icon && (
                  <MbIcon
                    id={item.icon}
                    size={15}
                    className={`shrink-0 ${
                      danger && !item.disabled ? "text-mb-red" : "text-mb-ink-muted"
                    }`}
                  />
                )}
                <span className="min-w-0 truncate">{item.label}</span>
              </MenuPrimitive.Item>
            );
          })}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
};
