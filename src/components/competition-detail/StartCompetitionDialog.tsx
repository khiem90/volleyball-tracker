"use client";

import { useMemo, useState } from "react";
import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbNotice } from "@/components/matchbook/Notice";
import { Crest } from "@/components/matchbook/Panel";
import { crestForTeam } from "@/components/matchbook/types";
import { pluralise } from "@/lib/text";
import type { CompetitionType, PersistentTeam } from "@/types/game";

/* ===========================================================================
   START COMPETITION

   The dialog is now a confirmation plus the one decision that genuinely cannot
   be pre-computed: which teams play in.

   The shipped version carried the whole play-in explanation, a 6-row scroller
   and an amber validation line, and still never showed the bracket it was
   about to build. The bracket preview moved to the draft console's "What Will
   Be Generated" panel, where there is room for it; what is left here is the
   picker, rebuilt at 44px rows with a real checked mark rather than a
   colour-only "selected" tint (invariant 13).
   =========================================================================== */

interface StartCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeLabel: string;
  teamCount: number;
  teams?: PersistentTeam[];
  competitionType?: CompetitionType;
  playInMatchCount?: number;
  matchWord?: string;
  onStart: (byeTeamIds?: string[]) => void;
}

export const StartCompetitionDialog = ({
  open,
  onOpenChange,
  typeLabel,
  teamCount,
  teams = [],
  competitionType,
  playInMatchCount = 0,
  matchWord = "match",
  onStart,
}: StartCompetitionDialogProps) => {
  const isElimination =
    competitionType === "single_elimination" ||
    competitionType === "double_elimination";

  const playInTeamCount = playInMatchCount * 2;
  const showPicker = isElimination && playInMatchCount > 0;

  const [selected, setSelected] = useState<string[]>([]);

  // Lowest seeds play in by default — the entrant order is the seeding.
  const defaults = useMemo(() => {
    if (!showPicker || teams.length === 0) return [];
    return teams.slice(-playInTeamCount).map((t) => t.id);
  }, [showPicker, teams, playInTeamCount]);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSelected(defaults);
  }

  const toggle = (teamId: string) => {
    setSelected((prev) => {
      if (prev.includes(teamId)) return prev.filter((id) => id !== teamId);
      if (prev.length < playInTeamCount) return [...prev, teamId];
      return prev;
    });
  };

  const ready = !showPicker || selected.length === playInTeamCount;

  const start = () => {
    if (showPicker && ready) {
      onStart(teams.filter((t) => !selected.includes(t.id)).map((t) => t.id));
    } else {
      onStart();
    }
  };

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Start this competition?"
      icon="quick"
      kicker={typeLabel}
      size={showPicker ? "md" : "sm"}
      description={`This generates the ${typeLabel.toLowerCase()} schedule for ${teamCount} teams and locks the entrant list.`}
    >
      {showPicker ? (
        <MbDialogBody flush className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-mb-rule px-4 py-3">
            <p className="mb-kicker">
              Choose {playInTeamCount} {pluralise("team", playInTeamCount)} for the
              play-in {pluralise(matchWord, playInMatchCount)}
            </p>
            <span className="matchbook-display shrink-0 text-[0.78rem] font-bold tabular-nums">
              {selected.length}/{playInTeamCount}
            </span>
          </div>

          <div className="flex flex-col divide-y divide-mb-rule">
            {teams.map((team) => {
              const on = selected.includes(team.id);
              const full = !on && selected.length >= playInTeamCount;
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggle(team.id)}
                  disabled={full}
                  aria-pressed={on}
                  className="mb-row-hover mb-btn-touch flex items-center gap-3 px-4 py-2 text-left disabled:opacity-45"
                  style={on ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" } : undefined}
                >
                  <Crest
                    team={{ name: team.name, crest: crestForTeam(team.id, team.name) }}
                    size={22}
                  />
                  <span className="matchbook-display min-w-0 flex-1 truncate text-[0.85rem] font-semibold">
                    {team.name}
                  </span>
                  <span className="mb-kicker whitespace-nowrap">
                    {on ? "Play-in" : "Bye"}
                  </span>
                  {/* The mark, not the tint, is what says "chosen" — the state
                      survives greyscale and does not rely on the coral rail. */}
                  <span
                    aria-hidden="true"
                    className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] border border-mb-navy"
                    style={on ? { background: "var(--mb-navy)" } : undefined}
                  >
                    {on && (
                      <MbIcon id="check" size={12} className="text-mb-paper-bright" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {!ready && (
            <div className="px-4 py-3">
              <MbNotice tone="warn">
                Choose exactly {playInTeamCount} {pluralise("team", playInTeamCount)}.
                The rest receive a first-round bye.
              </MbNotice>
            </div>
          )}
        </MbDialogBody>
      ) : (
        <MbDialogBody>
          <p className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
            Teams cannot be added or removed once the schedule exists.
          </p>
        </MbDialogBody>
      )}

      <MbDialogFooter>
        <MbButton variant="outline-navy" size="lg" onClick={() => onOpenChange(false)}>
          Cancel
        </MbButton>
        <MbButton variant="coral" size="lg" icon="quick" disabled={!ready} onClick={start}>
          Start competition
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
};
