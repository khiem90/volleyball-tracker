import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

/* A small navy-framed label on paper, in the shape of the matchbook score box. */
const badgeClass =
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[4px] border-[1.5px] border-mb-navy bg-mb-paper-bright px-2 py-0.5 text-xs font-medium whitespace-nowrap text-mb-navy [&>svg]:pointer-events-none [&>svg]:size-3"

function Badge({
  className,
  variant = "secondary",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & {
  /** The one look there is. The volleyball rotation controls still pass it. */
  variant?: "secondary"
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeClass, className)}
      {...props}
    />
  )
}

export { Badge }
