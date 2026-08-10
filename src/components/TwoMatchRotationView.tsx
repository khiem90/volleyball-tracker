"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useTeamsMap } from "@/hooks/useTeamsMap";
import { useRotationInstantWin } from "@/hooks/useRotationInstantWin";
import { processMatchResult } from "@/lib/twoMatchRotation";
import { EditMatchDialog } from "@/components/dialogs/edit-match";
import { EditQueueDialog } from "@/components/dialogs/edit-queue";
import { RotationConsole } from "@/components/rotation-views";
import { MatchActionDialog } from "@/components/competition-detail/MatchActionDialog";
import { useMatchbookCompetitionDetail } from "@/components/matchbook/useMatchbookCompetitionDetail";
import type {
  Competition,
  Match,
  PersistentTeam,
  TwoMatchRotationState,
} from "@/types/game";

/**
 * Two-match rotation. The sibling of `Win2OutView`: same console, different
 * headline measure (wins, not crowns), different sub-line ("1/2 matches"), and
 * `twoMatchRotation`'s own `processMatchResult`.
 */
export const TwoMatchRotationView = ({
  state,
  matches,
  teams,
  competition,
  onMatchClick,
}: {
  state: TwoMatchRotationState;
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
    stateKey: "twoMatchRotationState",
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
        competitionName={competition?.name ?? "Rotation"}
        status={competition?.status ?? "in_progress"}
        primaryLabel="W"
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
