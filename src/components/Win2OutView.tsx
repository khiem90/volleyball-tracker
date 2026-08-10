"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import { useRotationInstantWin } from "@/hooks/useRotationInstantWin";
import { processMatchResult } from "@/lib/win2out";
import { EditMatchDialog } from "@/components/dialogs/edit-match";
import { EditQueueDialog } from "@/components/dialogs/edit-queue";
import { RotationConsole } from "@/components/rotation-views";
import { MatchActionDialog } from "@/components/competition-detail/MatchActionDialog";
import { useMatchbookCompetitionDetail } from "@/components/matchbook/useMatchbookCompetitionDetail";
import type {
  Competition,
  Match,
  PersistentTeam,
  Win2OutState,
} from "@/types/game";

/**
 * Win 2 & Out.
 *
 * Everything visible comes from `RotationConsole`; what stays here is the
 * format's own three facts — crowns are the headline measure, the sub-line is
 * a streak, and `processMatchResult` is win2out's — plus the dialogs.
 *
 * `useRotationInstantWin` is untouched. Adding the always-available
 * Play/Continue button back (BUG-6) means two paths can now complete one
 * match, and the processor is idempotent under that: `handleInstantWin` writes
 * the score, completes the match and advances the rotation in a single
 * `completeMatchWithNextMatch` call, while the console route completes the same
 * match through the same reducer — a second completion of an already-completed
 * match finds no active court for it and generates no further rotation.
 */
export const Win2OutView = ({
  state,
  matches,
  teams,
  competition,
  onMatchClick,
}: {
  state: Win2OutState;
  matches: Match[];
  teams: PersistentTeam[];
  competition?: Competition | null;
  onMatchClick?: (match: Match) => void;
}) => {
  const { canEdit } = useApp();
  const router = useRouter();
  const { getTeamName } = useTeamsMap(teams);

  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [reviewMatch, setReviewMatch] = useState<Match | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const data = useMatchbookCompetitionDetail({
    competition: competition ?? undefined,
    matches,
    teams,
  });

  const { handleInstantWin } = useRotationInstantWin({
    competition,
    state,
    stateKey: "win2outState",
    processMatchResult,
    getTeamName,
  });

  const play = useCallback(
    (match: Match) => {
      if (onMatchClick) onMatchClick(match);
      else router.push(`/match/${match.id}`);
    },
    [onMatchClick, router]
  );

  return (
    <>
      <RotationConsole
        data={data}
        competitionName={competition?.name ?? "Win 2 & Out"}
        status={competition?.status ?? "in_progress"}
        primaryLabel="Crowns"
        canEdit={canEdit}
        canPlay={canEdit}
        instantWin={Boolean(competition?.instantWinEnabled)}
        onPlay={play}
        onEditMatch={setEditingMatch}
        onInstantWin={(match, winnerId) => handleInstantWin(winnerId, match)}
        onReorderQueue={() => setShowQueue(true)}
        onSelectResult={setReviewMatch}
      />

      <MatchActionDialog
        open={!!reviewMatch}
        onOpenChange={(open) => !open && setReviewMatch(null)}
        match={reviewMatch}
        teams={teams}
        canEdit={canEdit}
        onPlayMatch={
          canEdit
            ? () => {
                if (reviewMatch) play(reviewMatch);
                setReviewMatch(null);
              }
            : undefined
        }
      />

      <EditMatchDialog
        open={!!editingMatch}
        onOpenChange={(open) => !open && setEditingMatch(null)}
        match={editingMatch}
        matches={matches}
        teams={teams}
        competition={competition}
        label={
          editingMatch ? `${data.venue.One} ${editingMatch.position}` : undefined
        }
      />

      <EditQueueDialog
        open={showQueue}
        onOpenChange={setShowQueue}
        competition={competition || null}
        teams={teams}
        venue={data.venue.many}
      />
    </>
  );
};
