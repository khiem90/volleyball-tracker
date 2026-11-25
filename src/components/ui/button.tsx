import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * The four buttons. Each variant is a pair of the button classes in
 * globals.css, so <Button variant="action"> and
 * <button className="btn btn-action"> are the same control. The pill, the
 * 44px minimum, hover, pressed, focus, and disabled all come from those
 * classes.
 */
const buttonVariants = cva(
  "shrink-0 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* The black pill: a row's own action, and a dialog's main action. */
        default: "btn btn-ink",
        /* The green main button, 52px tall: the one thing to tap next on a screen. */
        action: "btn btn-action",
        /* The grey button: Cancel and secondary actions. */
        outline: "btn btn-fill",
        /* The red button: a destructive action and its confirm. */
        destructive: "btn btn-danger",
      },
      size: {
        // The 44px minimum comes from the btn class; the default size adds nothing.
        default: "",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
