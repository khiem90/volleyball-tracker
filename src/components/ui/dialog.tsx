"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"
import { MbIcon } from "@/components/matchbook/MbIcon"

/*
 * The matchbook dialog. A centered paper panel in the .mb-dialog frame under a
 * navy overlay, with a navy uppercase title, muted description, a navy close
 * glyph with a 44px hit area, and a footer of 44px matchbook buttons that
 * stack on a phone and sit side by side from sm up. Radix keeps the focus
 * trap, Escape, and the labelling; tw-animate-css keeps the fade and zoom.
 *
 * Recipe for a dialog:
 *   <DialogContent className="sm:max-w-md">
 *     <DialogHeader>
 *       <DialogTitle><MbIcon id="..." size={18} className="shrink-0" />Title</DialogTitle>
 *       <DialogDescription>Body text.</DialogDescription>
 *     </DialogHeader>
 *     <DialogFooter>
 *       <Button variant="outline" className="sm:flex-1">Cancel</Button>
 *       <Button className="sm:flex-1">Main action</Button>   (variant="destructive" on a destructive confirm)
 *     </DialogFooter>
 *   </DialogContent>
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

/* Navy, not black, so the paper behind it stays warm. */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-mb-navy/55",
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
          "mb-dialog data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 p-6 duration-200 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          data-slot="dialog-close"
          className="absolute top-1 right-1 flex size-11 cursor-pointer items-center justify-center rounded-[4px] text-mb-navy transition-colors hover:bg-mb-navy/6 disabled:pointer-events-none"
        >
          <MbIcon id="close" size={20} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 pr-8 text-left", className)}
      {...props}
    />
  )
}

/* Buttons fill the width on a phone and share a row from sm up. */
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

/* Navy on every dialog, a destructive one included: the heading is the question, the red button is the warning. */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "matchbook-display flex items-center gap-2 text-[1.05rem] font-bold leading-tight text-mb-navy",
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
      className={cn("text-sm leading-relaxed text-mb-ink-muted", className)}
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
