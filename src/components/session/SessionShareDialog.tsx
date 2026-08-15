"use client";

/* ===========================================================================
   SHARE THIS EVENT (public-share brief §3.7)

   Replaces `ShareSession.tsx`, which was the app's second clipboard
   implementation and disagreed with the first: it swallowed a failed
   `navigator.clipboard.writeText` into `console.error` and showed the reader
   nothing, and its admin link was a bare `type="password"` — 32 characters
   nobody could verify before handing them out.

   Everything here is the kit's one implementation. `MbCopyField` guards the
   clipboard, falls back to `execCommand`, and when both are refused it selects
   the value and says so. `MbShareAction` is the single native-share → copy →
   toast path, so the masthead and this dialog can no longer behave
   differently.

   THE ADMIN LINK. It stays masked by default and gains the reveal toggle
   `MbCopyField` supplies for exactly this case, and it is a separate,
   ruled-off block under a warning — because the two links in this dialog are
   not two flavours of one thing. One is safe to post in a group chat; the
   other hands over the ability to change the score.
   =========================================================================== */


import { MbButton } from "@/components/matchbook/Button";
import { MbCopyField } from "@/components/matchbook/CopyField";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbNotice } from "@/components/matchbook/Notice";
import { MbShareAction } from "@/components/matchbook/ShareAction";
import type { SessionRole } from "@/types/session";

const ROLE_WORD: Record<SessionRole, string> = {
  creator: "Organiser",
  admin: "Scorer",
  viewer: "Watching",
};

export const SessionShareDialog = ({
  open,
  onOpenChange,
  eventName,
  shareCode,
  shareUrl,
  adminShareUrl,
  role,
  storyLine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  shareCode: string;
  shareUrl: string;
  /** Null for a viewer, and for an admin whose token is not held locally. */
  adminShareUrl: string | null;
  role: SessionRole;
  /** The one-line state of play, used as the share sheet's body text. */
  storyLine: string;
}) => (
  <MbDialog
    open={open}
    onOpenChange={onOpenChange}
    title="Share this event"
    icon="share"
    kicker={ROLE_WORD[role]}
    size="md"
  >
    <MbDialogBody className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="mb-kicker">Share code</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mb-code-chip">{shareCode}</span>
          {/* Not `MbBadge`: `tone="neutral"`'s mark is a horizontal bar, and
              beside the event's own name it read as a stray em dash rather
              than as a status. A name is not a status. */}
          <span className="mb-kicker min-w-0 truncate">{eventName}</span>
        </div>
        <p className="text-[0.78rem] leading-[1.5] text-mb-ink-muted">
          Anyone with the code or the link below can watch the scores. They
          cannot change anything.
        </p>
      </div>

      <MbCopyField
        label="Watch link"
        value={shareUrl}
        help="Safe to post anywhere — it is read-only."
      />

      {(role === "creator" || role === "admin") && adminShareUrl && (
        <div className="flex flex-col gap-3 border-t-[1.5px] border-mb-navy pt-4">
          <MbNotice tone="warn" icon="key" title="This link can change the score">
            Give it only to the people scoring. Anyone who opens it can edit
            every match in this event.
          </MbNotice>
          <MbCopyField
            label="Scorer link"
            value={adminShareUrl}
            secret
            help="Hidden by default. Reveal it to check it before you send it."
          />
        </div>
      )}
    </MbDialogBody>

    <MbDialogFooter>
      <MbButton variant="outline-navy" size="lg" onClick={() => onOpenChange(false)}>
        Close
      </MbButton>
      <MbShareAction
        variant="button"
        tone="coral"
        size="lg"
        url={shareUrl}
        title={eventName}
        text={storyLine ? `${eventName} — ${storyLine}` : `Follow ${eventName} live`}
      />
    </MbDialogFooter>
  </MbDialog>
);
