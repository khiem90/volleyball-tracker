import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

/*
 * A small grey pill with ink text, drawn by the chip class. It marks a row
 * with a word, such as "Held" or "You". For a status, use Chip from
 * components/shared, which also has the green tone and the live dot.
 */
const badgeClass =
  "chip w-fit justify-center overflow-hidden [&>svg]:pointer-events-none [&>svg]:size-3"

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
