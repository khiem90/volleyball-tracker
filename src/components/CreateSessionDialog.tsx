"use client";

import { useCallback, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useAuth } from "@/context/AuthContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { MbButton } from "@/components/matchbook/Button";
import { SessionAuthPanel } from "@/components/auth";
import { MbCopyField } from "@/components/matchbook/CopyField";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbNotice } from "@/components/matchbook/Notice";
import { MbStepRail } from "@/components/matchbook/StepRail";
import { MbField, MbTextInput } from "@/components/matchbook/form";

/* ===========================================================================
   CREATE A SHARED SESSION

   The nested-dialog problem is gone (charter H11): sign-in is a STEP inside
   this dialog, not a second Radix dialog mounted as a sibling. Two Radix
   overlays stacked on a bottom sheet fight over the focus trap, the scroll
   lock and the escape key, and on a phone the inner one opened behind the
   outer one's backdrop.

   ---------------------------------------------------------------- W6 HOOK-UP

   Landed. `auth/SessionAuthPanel.tsx` is the sign-in FORM with no dialog of
   its own, and it renders as this dialog's `auth` step. Rendering the old
   `<SessionAuth>` here instead would have re-introduced the exact nested
   overlay this rewrite removed.
   =========================================================================== */

type SessionStep = "name" | "auth" | "created";

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  competitionData?: {
    competition: import("@/types/game").Competition | null;
    teams: import("@/types/game").PersistentTeam[];
    matches: import("@/types/game").Match[];
  };
  onCreated?: (shareCode: string, adminToken: string) => void;
}

export const CreateSessionDialog = ({
  open,
  onOpenChange,
  defaultName = "",
  competitionData,
  onCreated,
}: CreateSessionDialogProps) => {
  const { createNewSession, isLoading, error } = useSession();
  const { user, isConfigured } = useAuth();
  const online = useOnlineStatus();

  const [sessionName, setSessionName] = useState(defaultName);
  const [step, setStep] = useState<SessionStep>("name");
  const [created, setCreated] = useState<{
    shareCode: string;
    adminToken: string;
  } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  /* Reset on OPEN, as a render-time state adjustment — the same pattern
     `useTeamForm` uses.

     It replaces a `setTimeout(…, 200)` tuned to the exit animation, so any
     change to that animation silently changed when the form cleared, and a
     fast reopen showed the previous session's admin token. Adjusting on open
     rather than on close also means the token is never cleared out from under
     a dialog that is still on screen. */
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep("name");
      setSessionName(defaultName);
      setCreated(null);
      setFailure(null);
    }
  }

  const handleCreate = useCallback(async () => {
    const name = sessionName.trim();
    if (!name || isLoading) return;
    setFailure(null);
    try {
      const result = await createNewSession(name, competitionData);
      setCreated(result);
      setStep("created");
      onCreated?.(result.shareCode, result.adminToken);
    } catch {
      /* Never the provider's own message: it names the backend and the
         collection path, neither of which helps anybody (invariant 28). */
      setFailure(
        "The session could not be created. Check your connection and try again."
      );
    }
  }, [sessionName, isLoading, createNewSession, competitionData, onCreated]);

  /* ------------------------------------------------------- not configured */

  if (!isConfigured) {
    return (
      <MbDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Live Sharing Unavailable"
        icon="cloud"
        kicker="Shared session"
        size="sm"
      >
        <MbDialogBody>
          <MbNotice tone="info" icon="settings" title="No cloud backend">
            This installation has no cloud backend configured, so sessions
            cannot be shared live. Everything you score is still saved on this
            device and can be exported from the history screen.
          </MbNotice>
        </MbDialogBody>
        <MbDialogFooter>
          <MbButton variant="navy" size="lg" onClick={() => onOpenChange(false)}>
            Close
          </MbButton>
        </MbDialogFooter>
      </MbDialog>
    );
  }

  const shareUrl =
    created && typeof window !== "undefined"
      ? `${window.location.origin}/session/${created.shareCode}`
      : "";

  /* ------------------------------------------------------------------ UI */

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        step === "created"
          ? "Session Created"
          : step === "auth"
            ? "Sign In"
            : "Create Shared Session"
      }
      icon={step === "created" ? "check" : step === "auth" ? "login" : "share"}
      kicker="Shared session"
      size="md"
      dismissible={!isLoading}
    >
      <MbDialogBody className="flex flex-col gap-5">
        <MbStepRail
          steps={[
            { id: "name", label: "Name", value: sessionName.trim() || undefined },
            {
              id: "created",
              label: "Share",
              value: created?.shareCode ?? undefined,
            },
          ]}
          current={step === "created" ? "created" : "name"}
          onNavigate={() => setStep("name")}
          label="Session setup"
        />

        {step === "name" && (
          <>
            <MbField
              label="Session name"
              htmlFor="session-name"
              hint="Viewers see this at the top of the live scoreboard."
              required
            >
              <MbTextInput
                id="session-name"
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreate();
                  }
                }}
                placeholder="e.g. Friday Night Open Gym"
                maxLength={60}
                autoComplete="off"
                icon="compete"
              />
            </MbField>

            {!online && (
              <MbNotice tone="warn" icon="wifi-off" title="You are offline">
                A shared session needs a connection. Reconnect and try again —
                nothing you have scored is lost.
              </MbNotice>
            )}

            {!user && (
              <MbNotice tone="info" icon="login" title="Not signed in">
                <span className="flex flex-col items-start gap-2">
                  <span>
                    The session will still work. Signing in links it to your
                    account so you can find and end it later.
                  </span>
                  <MbButton
                    variant="outline-navy"
                    size="sm"
                    icon="login"
                    onClick={() => setStep("auth")}
                  >
                    Sign in first
                  </MbButton>
                </span>
              </MbNotice>
            )}

            {(failure || error) && (
              <MbNotice tone="danger" title="Could not create the session">
                {failure ?? "Something went wrong. Try again."}
              </MbNotice>
            )}
          </>
        )}

        {step === "auth" && (
          /* W6's panel, landed. It is the sign-in FORM with no dialog of its
             own, so the nested-overlay problem charter H11 forbids never
             arises — this is a step of THIS dialog, not a second one. The
             admin-token mode is withheld: `applyAdminToken` validates against
             the session you are watching, and there is no session here yet. */
          <SessionAuthPanel
            modes={["signin", "signup"]}
            onDone={() => setStep("name")}
          />
        )}

        {step === "created" && created && (
          <>
            <div className="flex flex-col gap-2">
              <span className="mb-kicker">Share code</span>
              <p
                className="matchbook-display border-[1.5px] border-mb-navy bg-mb-paper-bright px-4 py-3 text-center text-2xl font-bold tabular-nums"
                style={{ letterSpacing: "0.35em" }}
              >
                {created.shareCode}
              </p>
              <p className="text-[0.78rem] text-mb-ink-muted">
                Anyone with this code can watch the scores live.
              </p>
            </div>

            <MbCopyField
              label="Viewer link"
              value={shareUrl}
              help="Safe to post anywhere — it cannot change a score."
            />

            <MbCopyField
              label="Admin token"
              value={created.adminToken}
              secret
              help="Give this only to people who should be able to edit scores."
            />

            <MbNotice tone="warn" icon="key" title="Save the admin token">
              It is shown once. Without it you cannot regain admin access to
              this session.
            </MbNotice>
          </>
        )}
      </MbDialogBody>

      <MbDialogFooter>
        {step === "created" ? (
          <MbButton variant="coral" size="lg" onClick={() => onOpenChange(false)}>
            Done
          </MbButton>
        ) : step === "auth" ? (
          <MbButton
            variant="outline-navy"
            size="lg"
            icon="chevron-left"
            onClick={() => setStep("name")}
          >
            Back
          </MbButton>
        ) : (
          <>
            <MbButton
              variant="outline-navy"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </MbButton>
            <MbButton
              variant="coral"
              size="lg"
              icon="share"
              loading={isLoading}
              disabled={!sessionName.trim() || !online}
              onClick={() => void handleCreate()}
            >
              {isLoading ? "Creating…" : "Create session"}
            </MbButton>
          </>
        )}
      </MbDialogFooter>
    </MbDialog>
  );
};
