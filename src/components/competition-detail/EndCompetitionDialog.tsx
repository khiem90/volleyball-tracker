"use client";

import { MbConfirm } from "@/components/matchbook/Confirm";

/**
 * Ending a shared competition completes it, closes the live session, removes
 * the local copy and redirects to the generated summary. That is four
 * irreversible things behind one word, so it goes through the one confirmation
 * dialog in the system rather than a bespoke modal (Appendix B: `MbConfirm` is
 * the only confirmation dialog).
 */
export const EndCompetitionDialog = ({
  open,
  onOpenChange,
  isEnding,
  competitionName,
  onEndCompetition,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnding: boolean;
  competitionName?: string;
  onEndCompetition: () => void;
}) => (
  <MbConfirm
    open={open}
    onOpenChange={onOpenChange}
    title="End this competition?"
    verb="End"
    subject={competitionName}
    confirmLabel="End competition"
    loading={isEnding}
    onConfirm={onEndCompetition}
    body="The live session closes for everyone watching, a permanent summary is generated, and this device stops tracking the event. Unplayed matches are left unplayed."
  />
);
