"use client";

import { useState } from "react";
import { Icon } from "@/components/shared";
import { deviceZone, millisOf, timeLabel } from "@/lib/rsvp";
import type { Notice } from "@/types/game";

/**
 * A list's notices, newest first, each with the time it was posted on
 * this phone's clock. For the owner the list's page passes `onDelete`,
 * which puts a Delete on each one. Everyone else reads them.
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
    <ol className="flex flex-col divide-y divide-line">
      {notices.map((notice) => (
        <li key={notice.id} className="flex flex-col gap-1.5 px-4 py-3.5">
          <span className="text-caption font-medium text-ink-soft">
            {timeLabel(millisOf(notice.createdAt), undefined, zone).viewer}
          </span>
          <p className="whitespace-pre-wrap text-body wrap-anywhere">{notice.body}</p>
          {onDelete && (
            <button
              type="button"
              className="btn btn-danger-quiet mt-1 self-start"
              onClick={() => onDelete(notice)}
            >
              <Icon id="trash" size={14} />
              Delete
            </button>
          )}
        </li>
      ))}
    </ol>
  );
};
