"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"
import { Icon } from "@/components/shared/Icon"

/*
 * The one dialog. A white card in the middle of the screen, over the page
 * dimmed with ink. It has a 16px title in ink, a description in soft ink, a
 * close control with a 44px target, and a footer of pill buttons that stack
 * on a phone and share a row from sm up. Radix keeps the focus trap, Escape,
 * the return of focus to the opener, and the labelling. tw-animate-css keeps
 * the fade and zoom.
 *
 * Recipe for a dialog:
 *   <DialogContent className="sm:max-w-md">
 *     <DialogHeader>
 *       <DialogTitle><Icon id="..." size={18} className="shrink-0" />Title</DialogTitle>
 *       <DialogDescription>Body text.</DialogDescription>
 *     </DialogHeader>
 *     <DialogFooter>
 *       <Button variant="outline" className="sm:flex-1">Cancel</Button>
 *       <Button className="sm:flex-1">Main action</Button>   (variant="destructive" on a destructive confirm)
 *     </DialogFooter>
 *   </DialogContent>
 *
 * The main action is the black pill, never the green one. The footer's
 * buttons are one height, and green stays the screen's own next step.
 */

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/* Ink at a little over half, so the page behind is dimmed and still there. */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-ink/55",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "dialog data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[calc(100dvh-2rem)] w-full grid-cols-1 max-w-[calc(100%-2rem)] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 p-6 duration-200 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          data-slot="dialog-close"
          className="absolute top-2 right-2 flex size-11 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-fill hover:text-ink disabled:pointer-events-none"
        >
          <Icon id="close" size={20} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/* The right padding keeps a long title clear of the close control. */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 pr-8 text-left", className)}
      {...props}
    />
  )
}

/* Buttons fill the width on a phone, main action on top, and share a row from sm up. */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

/* Ink on every dialog, a destructive one included. The heading is the question, and the red button is the warning. */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "flex items-center gap-2 text-title leading-tight font-bold text-ink",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-body leading-relaxed text-ink-soft", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}
