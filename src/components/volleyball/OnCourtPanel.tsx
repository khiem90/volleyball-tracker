"use client";

import { memo } from "react";
import type { PlayerPosition } from "@/lib/volleyball/types";
import { PLAYER_INFO } from "@/lib/volleyball/constants";
import { MbRoleChip } from "@/components/matchbook/court/MbPlayerToken";
import { MbConstraintKey } from "@/components/matchbook/court/MbConstraintLine";
import { PanelEmpty } from "@/components/matchbook/Panel";

/* ===========================================================================
   ON COURT

   The legend, as a ledger. It cross-highlights the court, and on a phone it
   used to live at y = 2096 on a 2915px page — two and a half screens below the
   thing it highlights, so the highlight was never visible when it fired. It now
   sits directly under the court in DOM order, which is also its mobile order.

   Rows are ruled and uniform, the zone is right-ranged and `tabular-nums`, and
   the selected row takes a 3px coral left rule — the same active idiom as
   `.mb-nav-item`, and one of the three structural jobs invariant 15 reserves
   for coral.

   THE SECOND LINE IS THE ROW, NOT A PARAGRAPH. It used to be
   `"Back row · Secondary left-side attacker"`, set on one truncating line: at
   390 five of the six rows lost 12-69px of that sentence and at 320 six of them
   lost up to 139px, which is a description nobody can read placed where nobody
   can act on it. It also made the row 53px tall — off the {44,48,56} control
   ladder — and it would have gone to two ragged heights if it were allowed to
   wrap. The row now carries only what is true of THIS rotation (which row the
   player is in, which zone they occupy) at a fixed 56px; the seven role
   descriptions moved to "Reading the Diagram", where they are reference prose
   set at full width and never clipped.

   THE KEY at the bottom names every mark by its SHAPE. "Blue dashed lines" and
   "orange dotted lines" — the old wording — cannot be followed by a reader who
   cannot see blue, and could not be followed by anyone on the greyscale print
   the rubric asks for. The setter and the libero are told apart by SOLID vs
   DASHED ring for the same reason: gold and navy are one hue apart and nothing
   else.
   =========================================================================== */

export interface OnCourtPanelProps {
  players: PlayerPosition[];
  selectedPlayer: string | null;
  onPlayerSelect: (role: string | null) => void;
}

export const OnCourtPanel = memo(
  ({ players, selectedPlayer, onPlayerSelect }: OnCourtPanelProps) => {
    if (players.length === 0) {
      return (
        <PanelEmpty message="No players exist yet — pick a formation to place the six court positions." />
      );
    }

    return (
      <div className="flex flex-1 flex-col">
        <ul className="flex flex-col">
          {players.map((player) => {
            const info = PLAYER_INFO[player.role];
            const selected = selectedPlayer === player.role;
            return (
              <li key={player.role}>
                <button
                  type="button"
                  onClick={() => onPlayerSelect(selected ? null : player.role)}
                  aria-pressed={selected}
                  className="mb-row-hover grid h-14 w-full grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-mb-rule px-4 text-left"
                  style={
                    selected
                      ? {
                          boxShadow: "inset 3px 0 0 var(--mb-coral)",
                          background: "var(--mb-tint-1)",
                        }
                      : undefined
                  }
                >
                  <MbRoleChip
                    role={player.role}
                    label={player.label}
                    row={player.isBackRow ? "back" : "front"}
                  />
                  <span className="min-w-0">
                    <span className="matchbook-display block truncate text-[0.82rem] font-bold tracking-[0.03em]">
                      {info?.fullName ?? player.label}
                    </span>
                    <span className="block text-[0.66rem] text-mb-ink-muted">
                      {player.isBackRow ? "Back row" : "Front row"}
                    </span>
                  </span>
                  <span className="mb-kicker shrink-0 tabular-nums">
                    Zone {player.zone}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2.5 px-4 py-3">
          <p className="mb-kicker">Reading the marks</p>
          <ul className="flex flex-col gap-2 text-[0.72rem] leading-snug text-mb-ink-muted">
            <li className="flex items-center gap-3">
              <MbRoleChip role="OH1" label="F" row="front" size={22} />
              <span>Filled disc — front row</span>
            </li>
            <li className="flex items-center gap-3">
              <MbRoleChip role="OH1" label="B" row="back" size={22} />
              <span>Hollow disc — back row</span>
            </li>
            <li className="flex items-center gap-3">
              <MbRoleChip role="S" label="S" row="back" size={22} />
              <span>Solid outer ring — the setter</span>
            </li>
            <li className="flex items-center gap-3">
              <MbRoleChip role="L" label="L" row="back" size={22} />
              <span>Dashed outer ring — libero, in for the back-row middle</span>
            </li>
            <li className="flex items-center gap-3">
              <MbConstraintKey type="front-back" />
              <span>One crossbar — front / back constraint</span>
            </li>
            <li className="flex items-center gap-3">
              <MbConstraintKey type="left-right" />
              <span>Two crossbars — left / right constraint</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }
);
OnCourtPanel.displayName = "OnCourtPanel";
