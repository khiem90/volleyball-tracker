"use client";

import { memo } from "react";
import Link from "next/link";
import type { UserFormation } from "@/lib/volleyball/types";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbMenu } from "@/components/matchbook/Menu";

/* ===========================================================================
   ONE ARCHIVE ROW

   `FormationCard` put five controls — Select, Edit, Duplicate, Share, Delete —
   in a 187px row at 24px each, with Delete immediately beside Share. Invariant
   35 forbids a destructive action adjacent to a frequent one, and the phone
   measurement made the point for it.

   The row is now one link (open it in the editor) plus one overflow menu, and
   the menu keeps Delete last with a `danger` tone. The confirm is `MbConfirm` —
   never `window.confirm`, never the three-second silent auto-disarm that the
   archive used, which re-armed a Delete key into a Cancel key while the reader
   was still deciding.

   Visibility is a WORD plus a mark, never a hue alone: `SHARED` with a filled
   square, `PRIVATE` with a hollow one.

   NOTHING HERE LIVES IN A `title` ATTRIBUTE ANY MORE. The description was
   truncated with the full string in a tooltip and the tags past the third were
   replaced by "+N more" with the rest in a second tooltip — on a touch screen
   both are simply gone, which is hard fail 12. The description wraps and every
   tag renders. Tags are one to three words each; a formation with nine of them
   costs one extra line, and a row that is one line taller is a better failure
   than a row whose content is unreachable.
   =========================================================================== */

const VisibilityMark = ({ shared }: { shared: boolean }) => (
  <span className="mb-kicker flex shrink-0 items-center gap-1.5">
    <span
      aria-hidden="true"
      className="inline-block h-[9px] w-[9px] rounded-[2px] border border-mb-navy"
      style={{ background: shared ? "var(--mb-teal)" : "transparent" }}
    />
    {shared ? "Shared" : "Private"}
  </span>
);

export interface FormationRowProps {
  formation: UserFormation;
  href: string;
  formatDate: (timestamp: number) => string;
  onEdit: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onDelete: () => void;
  /** Optimistic states, so a write is visible before Firestore answers. */
  pending?: "saving" | "deleting" | null;
}

export const FormationRow = memo(
  ({
    formation,
    href,
    formatDate,
    onEdit,
    onDuplicate,
    onShare,
    onDelete,
    pending = null,
  }: FormationRowProps) => {
    const tags = formation.tags ?? [];

    return (
      <div
        className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-mb-rule px-4 py-2 sm:grid-cols-[1fr_auto_auto_auto]"
        style={pending ? { opacity: 0.6 } : undefined}
      >
        <Link
          href={href}
          className="mb-btn-touch mb-row-hover -mx-2 flex min-w-0 flex-col justify-center gap-1 px-2 py-1"
        >
          <span className="matchbook-display text-[0.85rem] mb-track-display font-bold break-words">
            {formation.name}
          </span>
          {formation.description && (
            <span className="text-[0.72rem] leading-snug text-mb-ink-muted break-words">
              {formation.description}
            </span>
          )}
          {tags.length > 0 && (
            <span className="mt-0.5 flex flex-wrap items-center gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="mb-kicker rounded-[2px] border border-mb-rule px-1.5 py-[1px]"
                >
                  {tag}
                </span>
              ))}
            </span>
          )}
        </Link>

        <span className="hidden sm:block">
          <VisibilityMark shared={Boolean(formation.shareId)} />
        </span>

        <span className="mb-kicker hidden shrink-0 tabular-nums sm:block">
          {formatDate(formation.updatedAt)}
        </span>

        <span className="flex shrink-0 items-center gap-1">
          {pending && (
            <span className="mb-kicker tabular-nums">
              {pending === "deleting" ? "Deleting…" : "Saving…"}
            </span>
          )}
          <MbMenu
            label={`Actions for ${formation.name}`}
            align="end"
            items={[
              { label: "Edit", icon: "edit", onSelect: onEdit },
              { label: "Duplicate", icon: "copy", onSelect: onDuplicate },
              {
                label: formation.shareId ? "Manage link" : "Share",
                icon: "share",
                onSelect: onShare,
              },
              { label: "Delete", icon: "trash", tone: "danger", onSelect: onDelete },
            ]}
          />
        </span>

        {/* Below `sm` the two facts above are hidden from their own columns, so
            they return here on one line rather than being dropped: a share
            state and a date are not redundant context (invariant 38). */}
        <span className="col-span-2 flex items-center gap-3 sm:hidden">
          <VisibilityMark shared={Boolean(formation.shareId)} />
          <span className="mb-kicker tabular-nums">
            <MbIcon id="clock" size={11} className="mr-1 inline-block align-[-1px]" />
            {formatDate(formation.updatedAt)}
          </span>
        </span>
      </div>
    );
  }
);
FormationRow.displayName = "FormationRow";
