"use client";

import { useCallback, useState } from "react";
import type { UserFormation } from "@/lib/volleyball/types";
import { getFormationShareUrl } from "@/lib/volleyball/userFormations";
import { MbButton } from "@/components/matchbook/Button";
import { MbCopyField } from "@/components/matchbook/CopyField";
import { MbDialog, MbDialogBody, MbDialogFooter } from "@/components/matchbook/Dialog";
import { MbNotice } from "@/components/matchbook/Notice";

/* ===========================================================================
   SHARE A FORMATION

   The old dialog had no `role="dialog"`, no `aria-modal`, no focus trap, no
   initial focus and no Escape handler; the share URL sat in a `readOnly` input
   with `focus:outline-none`; and the "copied" confirmation was a `bg-green-500`
   swap with no announcement. It also hand-rolled a `document.execCommand`
   fallback that never surfaced its own failure.

   `MbDialog` supplies every one of those, and `MbCopyField` supplies the
   clipboard chain the charter settled in Appendix A D-8 — `navigator.clipboard`
   then `execCommand` then select-on-focus with an explicit hint — and always
   surfaces failure.

   Revoking is the destructive half and it stays in this dialog rather than in a
   row menu, because "make private" is only comprehensible next to the link it
   invalidates.
   =========================================================================== */

export interface ShareFormationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formation: UserFormation | null;
  onEnableSharing: (formationId: string) => Promise<string>;
  onDisableSharing: (formationId: string) => Promise<void>;
}

export const ShareFormationDialog = ({
  open,
  onOpenChange,
  formation,
  onEnableSharing,
  onDisableSharing,
}: ShareFormationDialogProps) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local echo of the id, so the panel flips the instant the write resolves
  // rather than waiting for the Firestore subscription to come back round.
  const [localShareId, setLocalShareId] = useState<string | null>(null);

  const shareId = localShareId ?? formation?.shareId ?? null;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setLocalShareId(null);
        setError(null);
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );

  const enable = useCallback(async () => {
    if (!formation) return;
    setBusy(true);
    setError(null);
    try {
      setLocalShareId(await onEnableSharing(formation.id));
    } catch {
      setError("The share link could not be created. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [formation, onEnableSharing]);

  const disable = useCallback(async () => {
    if (!formation) return;
    setBusy(true);
    setError(null);
    try {
      await onDisableSharing(formation.id);
      setLocalShareId(null);
    } catch {
      setError("Sharing could not be turned off. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [formation, onDisableSharing]);

  if (!formation) return null;

  return (
    <MbDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Share Formation"
      icon="share"
      kicker={formation.name}
      size="sm"
      dismissible={!busy}
    >
      <MbDialogBody className="flex flex-col gap-4">
        {error && <MbNotice tone="danger">{error}</MbNotice>}

        {shareId ? (
          <>
            <MbCopyField
              label="Share link"
              value={getFormationShareUrl(shareId)}
              help="Anyone with the link can view this formation. It never appears in search."
            />
            <div className="flex flex-col gap-1.5 border-t border-mb-rule pt-3">
              <p className="mb-kicker">Stop sharing</p>
              <p className="text-[0.78rem] leading-snug text-mb-ink-muted">
                Making it private breaks the existing link. Sharing again creates
                a new one.
              </p>
            </div>
          </>
        ) : (
          <p className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
            This formation is private. Creating a link lets anyone who has it
            view the formation and copy it into their own archive — it does not
            let them change yours.
          </p>
        )}
      </MbDialogBody>

      <MbDialogFooter>
        <MbButton variant="outline-navy" onClick={() => handleOpenChange(false)} disabled={busy}>
          Close
        </MbButton>
        {shareId ? (
          <MbButton variant="outline" icon="lock" onClick={disable} loading={busy}>
            Make Private
          </MbButton>
        ) : (
          <MbButton variant="coral" icon="link" onClick={enable} loading={busy}>
            Create Link
          </MbButton>
        )}
      </MbDialogFooter>
    </MbDialog>
  );
};
