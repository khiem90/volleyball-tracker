"use client";

import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { SessionAuthPanel } from "./SessionAuthPanel";
import type { SessionAuthMode } from "./useSessionAuth";

/**
 * The dialog cut of `SessionAuthPanel`, and nothing else — every field, every
 * validation message and every provider call lives in the panel, so the
 * viewer route and `CreateSessionDialog` cannot drift into two sign-in forms.
 *
 * `Keep watching` is the dialog's dismiss, worded for the gate that opened
 * it, and sits in the footer where a dismiss belongs.
 */
export const SessionAuth = ({
  open,
  onOpenChange,
  onSuccess,
  modes,
  dismissLabel = "Keep watching",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  modes?: SessionAuthMode[];
  dismissLabel?: string;
}) => (
  <MbDialog
    open={open}
    onOpenChange={onOpenChange}
    title="Sign in"
    icon="login"
    kicker="This event"
    size="sm"
    description="Signing in or entering an admin token lets you change scores. Watching needs neither."
  >
    <MbDialogBody>
      <SessionAuthPanel
        modes={modes}
        onDone={() => {
          onOpenChange(false);
          onSuccess?.();
        }}
      />
    </MbDialogBody>
    <MbDialogFooter>
      <MbButton variant="outline-navy" size="lg" onClick={() => onOpenChange(false)}>
        {dismissLabel}
      </MbButton>
    </MbDialogFooter>
  </MbDialog>
);
