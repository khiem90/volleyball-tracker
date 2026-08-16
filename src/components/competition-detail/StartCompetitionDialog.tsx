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

   ------------------------------------------------------ the undisclosed half

   Reproduced clean on a fresh profile: before Start, `localStorage` held
   `["tournament-tracker-state", "tournament-tracker-theme"]`. After Start it
   held those plus **`tournament_tracker_session`** and
   **`tournament-admin-tokens`** — and that is only the local half. Pressing
   Start also runs `createSession()` (via the auto-session effect in
   `useCompetitionDetailPage`), which mints a six-character share code and
   writes the whole event — competition, teams and matches — to the `sessions`
   collection, then saves an organiser token on the device so this browser can
   keep scoring it. The dialog warned about the entrant list and said nothing
   about any of that.

   Two ways to close it: stop doing it, or say it. Saying it is right, and not
   only because the effect is charter-locked (W4 acceptance 1) and lives outside
   this component.

     - It is the product. This app's loop is one person scoring on a phone while
       everyone else watches on theirs; the share link IS the feature, and
       `/session/[shareCode]` is a whole rendered surface built for it. Making
       the organiser hunt for "Share live" after every start would cost the
       common case to protect against a consequence that is desirable in it.
     - The organiser key is not a nicety either — it is what lets the creator
       score from a second device, and it can only be minted at creation.
     - What was actually wrong was the silence. An upload is a disclosable act
       whether or not it is wanted, and a confirm dialog that lists one
       consequence and hides the other two teaches the reader that its list is
       complete.

   So the consequences are enumerated, one per row, in the order they bite —
   and the publishing row only appears when publishing will really happen
   (`willPublish`), because a dialog that promises a link on a build with no
   Firebase configured is a new lie in place of the old omission.
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
  /**
   * True when starting will really create the shared session — i.e. exactly the
   * condition the auto-session effect tests: not already inside a shared
   * session, and Firebase configured. False on a local-only build, where no
   * link and no token are created and claiming otherwise would be its own
   * defect.
   */
  willPublish?: boolean;
  onStart: (byeTeamIds?: string[]) => void;
}

/** One consequence of pressing Start, as a ruled row. */
const Consequence = ({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) => (
  <li className="flex items-start gap-3 px-4 py-3">
    <MbIcon id={icon} size={16} className="mt-0.5 shrink-0 text-mb-navy" />
    <span className="min-w-0">
      <span className="mb-kicker block">{title}</span>
      <span className="mt-1 block text-[0.85rem] leading-[1.5]">{children}</span>
    </span>
  </li>
);

export const StartCompetitionDialog = ({
  open,
  onOpenChange,
  typeLabel,
  teamCount,
  teams = [],
  competitionType,
  playInMatchCount = 0,
  matchWord = "match",
  willPublish = false,
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

  /* The full list, in the order the consequences bite. It lives in the SAME
     scroller as the picker rather than in a pinned block between body and
     footer: `.mb-dialog-body` is the only `overflow-y: auto` in the dialog, and
     a fixed block under an 8-row picker on a 390x844 phone would take its
     height out of the scroller. */
  const consequences = (
    <ul className="flex flex-col divide-y divide-mb-rule border-t border-mb-rule">
      <Consequence icon="calendar" title="The schedule is written">
        Every fixture this format needs is generated now, and the competition
        goes live.
      </Consequence>
      <Consequence icon="lock" title="The entrant list locks">
        Teams cannot be added or removed once the schedule exists.
      </Consequence>
      {willPublish && (
        <Consequence icon="share" title="A live link is created">
          This event — its teams, schedule and scores — is published under a
          six-character code so anyone you send the link to can follow it. An
          organiser key is saved on this device so you can keep scoring from it.
        </Consequence>
      )}
    </ul>
  );

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Start this competition?"
      icon="quick"
      kicker={typeLabel}
      size={showPicker ? "md" : "sm"}
      description={`Starting a ${typeLabel.toLowerCase()} for ${teamCount} teams does ${
        willPublish ? "three" : "two"
      } things.`}
    >
      {showPicker ? (
        <MbDialogBody flush className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-mb-rule px-4 py-3">
            <p className="mb-kicker">
              Choose {playInTeamCount} {pluralise("team", playInTeamCount)} for the
              play-in {pluralise(matchWord, playInMatchCount)}
            </p>
            <span className="matchbook-display shrink-0 text-[0.78rem] mb-track-display font-bold tabular-nums">
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
                  <span className="matchbook-display min-w-0 flex-1 truncate text-[0.85rem] mb-track-nav font-semibold">
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

          {consequences}
        </MbDialogBody>
      ) : (
        <MbDialogBody flush>{consequences}</MbDialogBody>
      )}

      <MbDialogFooter>
        <MbButton variant="outline-navy" size="lg" onClick={() => onOpenChange(false)}>
          Cancel
        </MbButton>
        {/* "Start competition" measured **"START COMPE…"** in this footer at
            390px: `.mb-dialog-foot` gives its two controls `flex: 1` below
            `sm`, which is ~171px each, and the label plus its
            glyph does not fit. The dialog's own title is the question this
            button answers, so the verb alone is unambiguous — and it is the
            one control on the screen that must never be misread. */}
        <MbButton variant="coral" size="lg" icon="quick" disabled={!ready} onClick={start}>
          Start now
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
};
