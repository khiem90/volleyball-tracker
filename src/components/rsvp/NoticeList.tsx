"use client";

import { useState } from "react";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { deviceZone, millisOf, timeLabel } from "@/lib/rsvp";
import type { Notice } from "@/types/game";

/**
 * A tournament's notices, newest first, each with the time it was posted
 * on this phone's clock. The owner's console passes `onDelete` to put a
 * Delete on each one; the RSVP page shows them read-only.
 */
export const NoticeList = ({
  notices,
  onDelete,
}: {
  notices: Notice[];
  onDelete?: (notice: Notice) => void;
}) => {
  const [zone] = useState(deviceZone);
  return (
    <ol className="flex flex-col">
      {notices.map((notice) => (
        <li
          key={notice.id}
          className="flex flex-col gap-1.5 border-b border-mb-rule px-4 py-3 last:border-b-0"
        >
          <span className="mb-kicker">
            {timeLabel(millisOf(notice.createdAt), undefined, zone).viewer}
          </span>
          <p className="whitespace-pre-wrap text-[0.9rem] [overflow-wrap:anywhere]">{notice.body}</p>
          {onDelete && (
            <button
              type="button"
              className="mb-btn mb-btn-outline-red self-start"
              onClick={() => onDelete(notice)}
            >
              <MbIcon id="trash" size={14} />
              Delete
            </button>
          )}
        </li>
      ))}
    </ol>
  );
};
