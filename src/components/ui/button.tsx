import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * The matchbook buttons. Each variant is a pair of the matchbook classes in
 * globals.css, so <Button> and <button className="mb-btn mb-btn-navy"> are the
 * same control. Hover, disabled, the 4px radius, and the 44px minimum come
 * from .mb-btn; focus is the base layer's coral outline.
 */
const buttonVariants = cva(
  "shrink-0 cursor-pointer disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* The main action: filled navy. */
        default: "mb-btn mb-btn-navy",
        /* The confirm of a destructive dialog: filled red. */
        destructive: "mb-btn mb-btn-red",
        /* Cancel and secondary actions: navy outline. */
        outline: "mb-btn mb-btn-outline-navy",
      },
      size: {
        // The 44px minimum comes from .mb-btn; the default size adds nothing.
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
