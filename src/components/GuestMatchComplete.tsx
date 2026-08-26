"use client";

import { MbButton, MbButtonLink } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbScoreNumeral } from "@/components/matchbook/ScoreNumeral";
import { Crest } from "@/components/matchbook/Panel";
import type { MbTeam } from "@/components/matchbook/types";

/* ===========================================================================
   GUEST RESULT

   Was a `glass-card` opening with a 80px amber gradient trophy tile that sprang
   in from `scale: 0, rotate: -180`, an emerald winner line at 3.4:1 on cream,
   and four heroicons. None of amber, emerald or the gradient is in the palette.

   Now it is the same object as `MatchCompleteDialog` — one dialog frame, one
   scoreline, one winner rule — followed by the four things signing in unlocks,
   set as a ruled 2x2 list rather than as a tinted card. The unlock list is the
   only reason this dialog exists rather than reusing the confirm one.
   =========================================================================== */

interface GuestMatchCompleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  winner: MbTeam | null;
  homeTeam: MbTeam;
  awayTeam: MbTeam;
  homeScore: number;
  awayScore: number;
  homeAccent?: string;
  awayAccent?: string;
  onPlayAgain: () => void;
}

const UNLOCKS: { icon: string; label: string }[] = [
  { icon: "teams", label: "Your own teams" },
  { icon: "compete", label: "Tournaments" },
  { icon: "history", label: "Match history" },
  { icon: "chart", label: "Statistics" },
];

const Side = ({
  team,
  score,
  accent,
  align,
}: {
  team: MbTeam;
  score: number;
  accent?: string;
  align: "start" | "end";
}) => (
  <div
    className={`flex min-w-0 flex-col gap-1.5 ${
      align === "end" ? "items-end text-right" : "items-start text-left"
    }`}
  >
    <Crest team={team} size={40} />
    <span className="matchbook-display w-full truncate text-[0.85rem] mb-track-display font-bold">
      {team.name}
    </span>
    {accent && (
      <span
        aria-hidden="true"
        className="block h-[3px] w-10"
        style={{ background: accent }}
      />
    )}
    <MbScoreNumeral value={score} size="compact" align={align} />
  </div>
);

export const GuestMatchComplete = ({
  open,
  onOpenChange,
  winner,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homeAccent,
  awayAccent,
  onPlayAgain,
}: GuestMatchCompleteProps) => (
  <MbDialog
    open={open}
    onOpenChange={onOpenChange}
    title="Match complete"
    icon="check"
    kicker="Guest match"
    description="Nothing from this match was saved. Sign in to keep the next one."
    size="sm"
  >
    <MbDialogBody>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-b border-mb-navy pb-4">
        <Side team={homeTeam} score={homeScore} accent={homeAccent} align="end" />
        <span className="mb-kicker pb-2">vs</span>
        <Side team={awayTeam} score={awayScore} accent={awayAccent} align="start" />
      </div>

      {winner && (
        <div
          className="mt-4 flex min-w-0 items-center gap-3 border-l-[3px] pl-3"
          style={{ borderColor: "var(--mb-green)" }}
        >
          <span className="mb-kicker shrink-0">Winner</span>
          <span className="matchbook-display min-w-0 truncate text-[1.2rem] mb-track-display font-bold text-mb-navy">
            {winner.name}
          </span>
        </div>
      )}

      <p className="mb-kicker mt-5">Signing in adds</p>
      <ul className="mt-2 grid grid-cols-1 border-t border-mb-rule sm:grid-cols-2">
        {UNLOCKS.map((item) => (
          <li
            key={item.label}
            className="flex min-w-0 items-center gap-2 border-b border-mb-rule py-2 text-[0.85rem]"
          >
            <MbIcon id={item.icon} size={15} className="shrink-0 text-mb-navy" />
            <span className="min-w-0 truncate">{item.label}</span>
          </li>
        ))}
      </ul>
    </MbDialogBody>

    <MbDialogFooter>
      <MbButtonLink
        href="/login?redirect=/quick-match"
        variant="outline-navy"
        icon="login"
      >
        Sign In
      </MbButtonLink>
      <MbButton variant="coral" icon="refresh" onClick={onPlayAgain}>
        Play Again
      </MbButton>
    </MbDialogFooter>
  </MbDialog>
);
