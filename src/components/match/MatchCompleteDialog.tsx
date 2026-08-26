"use client";

import { memo } from "react";
import { MbButton } from "@/components/matchbook/Button";
import {
  MbDialog,
  MbDialogBody,
  MbDialogFooter,
} from "@/components/matchbook/Dialog";
import { MbScoreNumeral } from "@/components/matchbook/ScoreNumeral";
import { Crest } from "@/components/matchbook/Panel";
import type { MbTeam } from "@/components/matchbook/types";

/* ===========================================================================
   CONFIRM THE RESULT

   Was a `glass-card` with two shadowed 48px colour swatches, a `text-3xl`
   proportional score and the winner set in `text-emerald-400` — which on cream
   paper made the winner's name the LEAST legible string in the dialog, and
   emerald is not in the palette at all.

   Now: `MbDialog`, crests, the two scores in the shared numeral (tabular,
   hugging the rule between them), and the winner on a green-ruled band with
   navy letterforms. Green because a result maps to `--mb-green`; navy
   letterforms because tone stays off small type — the tone rides the 4px
   rule beside it.
   =========================================================================== */

type MatchCompleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeTeam: MbTeam;
  awayTeam: MbTeam;
  homeScore: number;
  awayScore: number;
  homeAccent?: string;
  awayAccent?: string;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
  onConfirm: () => void;
};

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

export const MatchCompleteDialog = memo(function MatchCompleteDialog({
  open,
  onOpenChange,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homeAccent,
  awayAccent,
  dialogTitle,
  dialogDescription,
  confirmLabel,
  onConfirm,
}: MatchCompleteDialogProps) {
  const winner = homeScore > awayScore ? homeTeam : awayTeam;

  return (
    <MbDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      icon="check"
      description={dialogDescription}
      size="sm"
    >
      <MbDialogBody>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-b border-mb-navy pb-4">
          <Side team={homeTeam} score={homeScore} accent={homeAccent} align="end" />
          <span className="mb-kicker pb-2">vs</span>
          <Side team={awayTeam} score={awayScore} accent={awayAccent} align="start" />
        </div>

        <div
          className="mt-4 flex min-w-0 items-center gap-3 border-l-[3px] pl-3"
          style={{ borderColor: "var(--mb-green)" }}
        >
          <span className="mb-kicker shrink-0">Winner</span>
          <span className="matchbook-display min-w-0 truncate text-[1.2rem] mb-track-display font-bold text-mb-navy">
            {winner.name}
          </span>
        </div>
      </MbDialogBody>

      <MbDialogFooter>
        <MbButton variant="outline-navy" onClick={() => onOpenChange(false)}>
          Continue Playing
        </MbButton>
        <MbButton variant="coral" icon="check" onClick={onConfirm}>
          {confirmLabel}
        </MbButton>
      </MbDialogFooter>
    </MbDialog>
  );
});
